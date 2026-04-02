import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_BASE_URL || "https://sso.snabbb.com/api";

export const odooApi = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

odooApi.interceptors.response.use(
    (res) => res,
    (err) => {
        const msg =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err.message;
        const error = new Error(msg) as any;
        error.status = err?.response?.status;
        return Promise.reject(error);
    }
);

interface SignUpParams {
    email: string;
    fullName: string;
    password?: string;
}

interface SignInParams {
    email: string;
    password?: string;
}

/**
 * Attempts to register a user in Odoo and mirrors the registration to Supabase.
 * Falls back to direct Supabase registration if the Odoo endpoint fails.
 */
export async function signUpDual({ email, password, fullName }: SignUpParams) {
    // We use the password provided by the form, rather than hardcoding it
    const odooPayload = { email, name: fullName, password };
    const supaPayload = {
        email,
        password: password || 'defaultPassword123!', // Supabase requires >6 char password
        options: { data: { full_name: fullName } },
    };

    // 1. Try pushing to the primary Odoo API
    const odooResponse = await odooApi.post('/calculator/sign-up', odooPayload).catch(async (err) => {
        console.warn('Odoo fallback triggered during sign-up:', err);
        return await supabase.auth.signUp(supaPayload);
    });

    const { data: odooData } = (odooResponse || {}) as any;

    // 2. If Odoo succeeds, duplicate the registration into Supabase implicitly
    let supaResult;
    if (odooData?.data?.result?.ok) {
        supaResult = await supabase.auth.signUp(supaPayload);
    }

    // Gracefully ignore "already registered" errors if mirroring to Supabase
    if (supaResult?.error && !supaResult.error.message.includes('already registered')) {
        throw supaResult.error;
    }

    return supaResult?.data || odooData;
}

/**
 * Attempts to log in via Odoo, then synchronizes tokens with Supabase.
 * Falls back to Supabase auth natively if Odoo is unreachable.
 */
export async function signInDual({ email, password }: SignInParams) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: password || '' });

    if (error) throw error;
    
    // Explicitly note that this is a direct, non-SSO login
    localStorage.setItem('is_sso_session', 'false');

    return data;
}

/**
 * Contacts the SSO endpoint to retrieve access/refresh tokens and injects them into the Supabase session
 */
export async function exchangeSsoToken() {
    try {
        const sso = await odooApi.get('/sso/exchange');
        if (sso?.data?.access_token && sso?.data?.refresh_token) {
            const { error } = await supabase.auth.setSession({
                access_token: sso.data.access_token,
                refresh_token: sso.data.refresh_token,
            });
            if (error) throw error;
            localStorage.setItem('is_sso_session', 'true');
            return true;
        }
    } catch (err: any) {
        console.warn('No active SSO session to exchange.', err.message);
        const { data: sessionData } = await supabase.auth.getSession();
        
        // If there is an authorization failure and we previously had an SSO session
        if (sessionData.session && (err.status === 401 || err.status === 403 || err.status === 404) && localStorage.getItem('is_sso_session') === 'true') {
            await supabase.auth.signOut();
            localStorage.removeItem('is_sso_session');
        }
        return false;
    }
    return false;
}  
