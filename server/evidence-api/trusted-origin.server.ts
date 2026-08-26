import "server-only";

import { randomUUID } from "node:crypto";
import { rebindRequestToConfiguredOrigin } from "./trusted-origin-policy";

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

/**
 * Rebind request.url to a server-configured application origin before the inner HTTP boundary
 * performs its same-origin comparison. This makes the configured origin authoritative instead
 * of trusting a potentially spoofed Host/proxy-derived request URL.
 */
export function bindRequestToTrustedOrigin(
  request: Request,
  rawTrustedOrigin = process.env.VIVIENDA_TRUSTED_ORIGIN,
): Request | Response {
  return rebindRequestToConfiguredOrigin(request, rawTrustedOrigin) ?? failClosedOriginPolicy();
}
