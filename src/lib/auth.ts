export function redirectToLogin() {
  if (typeof window === "undefined") return;
  window.location.href = "https://gallery.mrburstudio.com/";
}

function getCookie(name: string): string | null {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!cookie) return null;
  const value = cookie.substring(name.length + 1);
  return value ? decodeURIComponent(value) : null;
}

function getJwtExp(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "="));
    const parsed = JSON.parse(json);
    return typeof parsed?.exp === "number" ? parsed.exp : null;
  } catch {
    return null;
  }
}

function isJwtExpired(token: string): boolean {
  const exp = getJwtExp(token);
  if (!exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return now >= exp;
}

function clearSsoCookie() {
  const expires = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = `mrbur_sso=; path=/; ${expires}`;
  document.cookie = `mrbur_sso=; path=/; domain=.mrburstudio.com; ${expires}`;
}

export function initSsoCookieOnLoad() {
  if (typeof window === "undefined") return;

  const existingToken = getCookie("mrbur_sso");
  if (existingToken) {
    if (isJwtExpired(existingToken)) {
      console.log("[auth] existing mrbur_sso is expired, clearing cookie");
      clearSsoCookie();
    } else {
      console.log("[auth] mrbur_sso already exists");
      return;
    }
  }

  const devToken = ((import.meta as any).env?.VITE_DEV_TOKEN as string) || "";
  if (!devToken) {
    console.log("[auth] VITE_DEV_TOKEN not found, skipping cookie init");
    return;
  }
  if (isJwtExpired(devToken)) {
    console.log("[auth] VITE_DEV_TOKEN is expired, skipping cookie init");
    return;
  }

  const host = window.location.hostname;
  const isMrburDomain = host === "mrburstudio.com" || host.endsWith(".mrburstudio.com");
  const cookieParts = [
    `mrbur_sso=${encodeURIComponent(devToken)}`,
    "path=/",
    "SameSite=Lax",
  ];

  if (window.location.protocol === "https:") {
    cookieParts.push("Secure");
  }
  if (isMrburDomain) {
    cookieParts.push("domain=.mrburstudio.com");
  }

  document.cookie = cookieParts.join("; ");
  const saved = document.cookie.split("; ").some((row) => row.startsWith("mrbur_sso="));
  console.log("[auth] mrbur_sso cookie set on load:", saved);
}
