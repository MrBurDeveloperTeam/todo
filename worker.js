/**
 * _worker.js — Cloudflare Pages Worker for todo.snabbb.com
 *
 * Adds Snabbb theme inheritance while preserving the existing auth proxy routes:
 * - Reads `snabbb-theme` from the shared .snabbb.com cookie.
 * - Falls back to Odoo `/api/user/theme` when a session exists.
 * - Injects `window.__SNABBB_THEME__` before React paints.
 * - Proxies `/api/user/theme` GET/POST so the app can sync cross-device theme.
 */

const ODOO_THEME_URL = 'https://mrbur.odoo.com/api/user/theme';
const COOKIE_NAME = 'snabbb-theme';
const COOKIE_DOMAIN = '.snabbb.com';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const VALID_THEMES = new Set(['light', 'dark', 'system']);
const DEFAULT_THEME = 'light';

function parseTheme(value) {
  if (!value) return null;
  const raw = String(value).trim().toLowerCase();
  return VALID_THEMES.has(raw) ? raw : null;
}

function readThemeCookie(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)snabbb-theme=([^;]+)/);
  return match ? parseTheme(decodeURIComponent(match[1])) : null;
}

async function fetchThemeFromOdoo(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  if (!cookieHeader.includes('session_id=')) return null;

  try {
    const res = await fetch(ODOO_THEME_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.ok && !data?.authenticated) return null;

    return parseTheme(data.theme);
  } catch {
    return null;
  }
}

function buildThemeCookie(theme) {
  return [
    `${COOKIE_NAME}=${encodeURIComponent(theme)}`,
    'Path=/',
    `Domain=${COOKIE_DOMAIN}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    'SameSite=Lax',
    'Secure',
  ].join('; ');
}

async function proxyThemeApi(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const init = {
    method: request.method,
    headers: {
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
      Cookie: cookieHeader,
    },
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = await request.text();
  }

  try {
    const odooResponse = await fetch(ODOO_THEME_URL, init);
    const headers = new Headers(odooResponse.headers);
    headers.set('Content-Type', headers.get('Content-Type') || 'application/json');

    if (request.method === 'POST' && odooResponse.ok) {
      try {
        const clone = odooResponse.clone();
        const data = await clone.json();
        const theme = parseTheme(data?.theme);
        if (theme) headers.append('Set-Cookie', buildThemeCookie(theme));
      } catch {
        // Keep the proxied Odoo response even if the body is not JSON.
      }
    }

    return new Response(odooResponse.body, {
      status: odooResponse.status,
      statusText: odooResponse.statusText,
      headers,
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'theme_sync_unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function isHtmlRequest(request) {
  if (request.method !== 'GET') return false;
  const accept = request.headers.get('Accept') || '';
  const url = new URL(request.url);

  if (url.pathname.includes('.') && !url.pathname.endsWith('.html')) return false;
  return accept.includes('text/html') || accept.includes('*/*');
}

class ThemeInjector {
  constructor(theme) {
    this.theme = theme;
  }

  element(element) {
    element.append(
      `<script>window.__SNABBB_THEME__=${JSON.stringify(this.theme)};</script>`,
      { html: true }
    );
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Headers': 'Content-Type, X-SSO-API-KEY, Accept, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/api/user/theme') {
      return proxyThemeApi(request);
    }

    /* ==============================
       AUTH SIGNUP
       ============================== */
    if (url.pathname === '/api/auth/sign-up') {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const payload = body?.data ?? body?.options?.data ?? body?.params ?? body ?? {};
      const email = body?.email ?? payload?.email ?? payload?.login;
      const name = payload?.name ?? body?.name;
      const password = payload?.password ?? body?.password;
      const phone = payload?.phone ?? body?.phone;
      const accountType = payload?.account_type ?? body?.account_type ?? 'individual';
      const companyName = payload?.company_name ?? body?.company_name;
      const position = payload?.position ?? body?.position;
      const dob = payload?.dob ?? body?.dob;
      const country = payload?.country ?? body?.country;

      if (!email || !name || !password) {
        return new Response(JSON.stringify({ ok: false, error: 'email, name, and password are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const requestData = {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          email,
          // Match the Inventory/Main-app convention: a company record uses the
          // company as its primary name and keeps the registrant as contact_name.
          name: accountType === 'company' && companyName ? companyName : name,
          password,
          company_id: 2,
          ...(phone ? { phone } : {}),
          ...(accountType === 'company' ? { company_type: 'company', contact_name: name } : { company_type: 'person' }),
          ...(companyName ? { company_name: companyName } : {}),
          ...(position ? { job_position: position } : {}),
          ...(dob ? { date_of_birth: dob } : {}),
          ...(country ? { country_id: Number(country) } : {}),
        },
        id: 1,
      };

      try {
        const upstreamUrl = 'https://sso.mrburstudio.com/api/v1/users';
        const upstreamRes = await fetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-SSO-API-KEY': env.ODOO_SSO_API_KEY,
          },
          body: JSON.stringify(requestData),
        });

        const text = await upstreamRes.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = { raw: text };
        }

        if (data?.error) {
          return new Response(
            JSON.stringify({ ok: false, error: data.error?.message || 'Odoo error', details: data.error }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        if (!upstreamRes.ok) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Upstream Odoo error', status: upstreamRes.status, data }),
            { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        return new Response(JSON.stringify({ ok: true, data }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err?.message || 'Odoo signup failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    /* ==============================
       AUTH LOGIN
       ============================== */
    if (url.pathname === '/api/auth/login') {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const payload = body?.data ?? body?.options?.data ?? body?.params ?? body ?? {};
      const email = body?.email ?? payload?.email ?? payload?.login;
      const password = payload?.password ?? body?.password;

      if (!email || !password) {
        return new Response(JSON.stringify({ ok: false, error: 'email and password are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const requestData = {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          login: email,
          password,
        },
        id: 2,
      };

      try {
        const upstreamUrl = 'https://sso.mrburstudio.com/api/v1/auth/token';
        const upstreamRes = await fetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-SSO-API-KEY': env.ODOO_SSO_API_KEY,
          },
          body: JSON.stringify(requestData),
        });

        const text = await upstreamRes.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = { raw: text };
        }

        if (data?.error) {
          return new Response(
            JSON.stringify({ ok: false, error: data.error?.message || 'Odoo error', details: data.error }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        if (!upstreamRes.ok) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Upstream Odoo error', status: upstreamRes.status, data }),
            { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        return new Response(JSON.stringify({ ok: true, data }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err?.message || 'Odoo login failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    if (!env?.ASSETS) {
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    }

    if (!isHtmlRequest(request)) {
      return env.ASSETS.fetch(request);
    }

    const cookieTheme = readThemeCookie(request);
    const hasSession = (request.headers.get('Cookie') || '').includes('session_id=');
    let odooTheme = null;

    if (!cookieTheme && hasSession) {
      odooTheme = await fetchThemeFromOdoo(request);
    } else if (cookieTheme && hasSession) {
      ctx.waitUntil(fetchThemeFromOdoo(request));
    }

    const theme = odooTheme || cookieTheme || DEFAULT_THEME;
    const pageResponse = await env.ASSETS.fetch(request);

    if (!pageResponse.ok || !pageResponse.headers.get('Content-Type')?.includes('text/html')) {
      return pageResponse;
    }

    const headers = new Headers(pageResponse.headers);
    headers.append('Set-Cookie', buildThemeCookie(theme));

    return new HTMLRewriter()
      .on('head', new ThemeInjector(theme))
      .transform(new Response(pageResponse.body, { status: pageResponse.status, headers }));
  },
};
