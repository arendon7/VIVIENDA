import "server-only";

import { randomUUID } from "node:crypto";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function failClosedOriginPolicy(): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: "origin_policy_unavailable",
        message: "El servicio está temporalmente no disponible.",
      },
    }),
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "X-Request-Id": `req_${randomUUID().replaceAll("-", "")}`,
      },
    },
  );
}

export function canonicalTrustedOrigin(raw: string | undefined): string | null {
  if (!raw || raw.trim() === "") return null;
  try {
    const url = new URL(raw.trim());
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    if (url.protocol !== "https:" && !(url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname))) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Rebind request.url to a server-configured application origin before the inner HTTP boundary
 * performs its same-origin comparison. This makes the configured origin authoritative instead
 * of trusting a potentially spoofed Host/proxy-derived request URL.
 */
export function bindRequestToTrustedOrigin(
  request: Request,
  rawTrustedOrigin = process.env.VIVIENDA_TRUSTED_ORIGIN,
): Request | Response {
  const trustedOrigin = canonicalTrustedOrigin(rawTrustedOrigin);
  if (!trustedOrigin) return failClosedOriginPolicy();

  let incoming: URL;
  try {
    incoming = new URL(request.url);
  } catch {
    return failClosedOriginPolicy();
  }

  const trustedUrl = `${trustedOrigin}${incoming.pathname}${incoming.search}`;
  return new Request(trustedUrl, request);
}
