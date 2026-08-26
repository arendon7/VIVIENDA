const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

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
 * Returns a Request whose URL origin is server-authoritative while preserving method, headers,
 * body and signal from the incoming request. The browser Origin header is intentionally left
 * untouched so EvidenceHttpApi can compare it against this trusted URL origin.
 */
export function rebindRequestToConfiguredOrigin(request: Request, rawTrustedOrigin: string | undefined): Request | null {
  const trustedOrigin = canonicalTrustedOrigin(rawTrustedOrigin);
  if (!trustedOrigin) return null;

  let incoming: URL;
  try {
    incoming = new URL(request.url);
  } catch {
    return null;
  }

  const trustedUrl = `${trustedOrigin}${incoming.pathname}${incoming.search}`;
  return new Request(trustedUrl, request);
}
