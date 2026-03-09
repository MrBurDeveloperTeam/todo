export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
            "Access-Control-Max-Age": "86400",
            "Access-Control-Allow-Headers": "Content-Type, X-SSO-API-KEY, Accept, Authorization",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        /* ==============================
           ✅ AUTH SIGNUP
           ============================== */
        if (url.pathname === "/api/auth/sign-up") {
            if (request.method !== "POST") {
                return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
            }

            let body;
            try {
                body = await request.json();
            } catch {
                return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }

            const payload = body?.data ?? body?.options?.data ?? body?.params ?? body ?? {};
            const email = body?.email ?? payload?.email ?? payload?.login;
            const name = payload?.name ?? body?.name;
            const password = payload?.password ?? body?.password;
            const phone = payload?.phone ?? body?.phone;

            if (!email || !name || !password) {
                return new Response(JSON.stringify({ ok: false, error: "email, name, and password are required" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }

            const requestData = {
                jsonrpc: "2.0",
                method: "call",
                params: {
                    email,
                    name,
                    password,
                    company_id: 2,
                    ...(phone ? { phone } : {}),
                },
                id: 1,
            };

            try {
                const upstreamUrl = "https://sso.mrburstudio.com/api/v1/users";
                const upstreamRes = await fetch(upstreamUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        "X-SSO-API-KEY": env.ODOO_SSO_API_KEY,
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
                        JSON.stringify({ ok: false, error: data.error?.message || "Odoo error", details: data.error }),
                        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
                    );
                }

                if (!upstreamRes.ok) {
                    return new Response(
                        JSON.stringify({ ok: false, error: "Upstream Odoo error", status: upstreamRes.status, data }),
                        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
                    );
                }

                return new Response(JSON.stringify({ ok: true, data }), {
                    status: 200,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            } catch (err) {
                return new Response(JSON.stringify({ ok: false, error: err?.message || "Odoo signup failed" }), {
                    status: 500,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }
        }

        /* ==============================
           ✅ AUTH LOGIN
           ============================== */
        if (url.pathname === "/api/auth/login") {
            if (request.method !== "POST") {
                return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
            }

            let body;
            try {
                body = await request.json();
            } catch {
                return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }

            const payload = body?.data ?? body?.options?.data ?? body?.params ?? body ?? {};
            const email = body?.email ?? payload?.email ?? payload?.login;
            const password = payload?.password ?? body?.password;

            if (!email || !password) {
                return new Response(JSON.stringify({ ok: false, error: "email and password are required" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }

            const requestData = {
                jsonrpc: "2.0",
                method: "call",
                params: {
                    login: email,
                    password
                },
                id: 2,
            };

            try {
                // Adjust endpoint based on real Odoo auth endpoint
                const upstreamUrl = "https://sso.mrburstudio.com/api/v1/auth/token";
                const upstreamRes = await fetch(upstreamUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        "X-SSO-API-KEY": env.ODOO_SSO_API_KEY,
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
                        JSON.stringify({ ok: false, error: data.error?.message || "Odoo error", details: data.error }),
                        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
                    );
                }

                if (!upstreamRes.ok) {
                    return new Response(
                        JSON.stringify({ ok: false, error: "Upstream Odoo error", status: upstreamRes.status, data }),
                        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
                    );
                }

                return new Response(JSON.stringify({ ok: true, data }), {
                    status: 200,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            } catch (err) {
                return new Response(JSON.stringify({ ok: false, error: err?.message || "Odoo login failed" }), {
                    status: 500,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }
        }

        return new Response("Not Found", { status: 404, headers: corsHeaders });
    },
};
