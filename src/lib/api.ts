import { redirectToLogin } from './auth';
import { AxiosHeaders } from "axios";
import axios from "axios";
import { supabase } from './supabaseClient';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  if (!cookie) return null;
  const value = cookie.substring(name.length + 1);
  return value ? decodeURIComponent(value) : null;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const envBase =
    ((import.meta as any).env?.VITE_API_BASE_URL as string) ||
    ((import.meta as any).env?.VITE_PUBLIC_BASE_URL as string) ||
    '';
  const apiBase = envBase.startsWith('/')
    ? `${window.location.origin}${envBase}`
    : envBase || window.location.origin;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  let { data: { session } } = await supabase.auth.getSession();

  // If no Supabase session yet, try to exchange SSO cookies for one.
  if (!session) {
    try {
      await checkSession();
      const refreshed = await supabase.auth.getSession();
      session = refreshed.data.session;
    } catch (err) {
      console.warn('[auth] checkSession failed inside apiFetch:', err);
    }
  }

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  } else {
    const sessionId = getCookie('session_id');
    const ssoToken = getCookie('mrbur_sso');
    console.log('[auth] session_id cookie found:', Boolean(sessionId));
    console.log('[auth] mrbur_sso cookie found:', Boolean(ssoToken));

    if (sessionId) {
      console.log('[auth] session_id preview:', `${sessionId.slice(0, 16)}...`);
      headers.Authorization = `Bearer ${sessionId}`;
    } else if (ssoToken) {
      console.log('[auth] mrbur_sso token preview:', `${ssoToken.slice(0, 16)}...`);
      headers.Authorization = `Bearer ${ssoToken}`;
    }
  }

  const method = (options.method || 'GET').toUpperCase();
  let data: any = undefined;
  if (options.body !== undefined) {
    if (typeof options.body === 'string') {
      try {
        data = JSON.parse(options.body);
      } catch {
        data = options.body;
      }
    } else {
      data = options.body;
    }
  }

  const doRequest = (baseURL: string) => {
    api.defaults.baseURL = baseURL;
    return api.request({
      url: path,
      method,
      headers,
      data,
      withCredentials: true,
    });
  };

  try {
    const res = await doRequest(apiBase);
    return res.data ?? null;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 401) {

      return null;
    }
    // Only try local proxy as a network fallback, not for HTTP status errors.
    if (!status && apiBase !== window.location.origin) {
      const proxyBase = `${window.location.origin}/api`;
      const res = await doRequest(proxyBase);
      return res.data ?? null;
    }
    throw err;
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  // Note: apiFetch already attaches the Supabase access token when available.
  // The interceptor is a fallback for direct api.* calls.
  const sessionId = getCookie("session_id");
  const ssoToken = getCookie("mrbur_sso");
  const token = sessionId || ssoToken;
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

export const checkSession = async () => {
  // If a Supabase session already exists, keep using it.
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session;

  // Otherwise, try to exchange the SSO cookie for a Supabase session via the API.
  try {
    const { data } = await api.get('/sso/exchange');
    console.log('data: ', data);
    const { data: setResult, error } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (error) throw error;
    return setResult.session ?? null;
  } catch (err) {
    await supabase.auth.signOut();
    console.error('SSO exchange failed:', err);
    return null;
  }
};
