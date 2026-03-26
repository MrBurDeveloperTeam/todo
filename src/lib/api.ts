import { AxiosHeaders } from "axios";
import axios from "axios";
import { supabase } from './supabase';

const apiBaseUrl = import.meta.env.DEV
  ? '/api'
  : import.meta.env.VITE_API_BASE_URL;

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  if (!cookie) return null;
  const value = cookie.substring(name.length + 1);
  return value ? decodeURIComponent(value) : null;
}

function getSsoCookieToken(): string | null {
  return getCookie('mrbur_sso') || getCookie('session_id');
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const envBase =
    (import.meta.env.DEV ? '/api' : (((import.meta as any).env?.VITE_API_BASE_URL as string) || '')) ||
    ((import.meta as any).env?.VITE_PUBLIC_BASE_URL as string) ||
    '';
  const apiBase = envBase.startsWith('/')
    ? `${window.location.origin}${envBase}`
    : envBase || window.location.origin;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
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
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  // If this is the SSO exchange, just let it through with cookies (withCredentials: true)
  if (config.url === '/sso/exchange' || config.url?.endsWith('/sso/exchange')) {
    return config;
  }

  // For everything else, use the Supabase session token
  if (!supabase) return config;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

export const checkSession = async () => {
  if (!supabase) return null;

  // 1. If a Supabase session already exists, we are already logged in
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session;

  // 2. Try to exchange cookies for a session.
  // We don't check document.cookie because HttpOnly cookies are invisible to JS.
  try {
    console.log('[auth] Attempting SSO auto-login...');
    const { data } = await api.get('/sso/exchange');
    
    if (!data.access_token) {
       console.info('[auth] No SSO session returned');
       return null;
    }

    const { data: setResult, error } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    if (error) throw error;
    console.log('[auth] SSO auto-login successful!');
    return setResult.session ?? null;
  } catch (err) {
    const status = (err as any)?.response?.status ?? (err as any)?.status;
    if (status !== 401) {
      console.error('[auth] SSO exchange encountered an error:', err);
    } else {
      console.info('[auth] No SSO session found (401)');
    }
    return null;
  }
};
