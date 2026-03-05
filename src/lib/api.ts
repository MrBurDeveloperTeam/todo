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
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
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

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

export const checkSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    await supabase.auth.signOut();
  }
  return session;
};
