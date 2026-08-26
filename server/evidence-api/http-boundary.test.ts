import { describe, expect, it } from "vitest";
import { PersistenceBoundaryError } from "@/domain/persistence-boundary/contracts";
import type { CompletedEvidenceUpload, EvidenceDownloadGrant, PreparedEvidenceUpload } from "@/domain/storage-coordination/coordinator";
import {
  EvidenceHttpApi,
  MAX_API_JSON_BYTES,
  type ApiAuditLogPort,
  type ApiRateLimitDecision,
  type ApiRateLimitPort,
  type ApiRequestContextSource,
  type EvidenceApiApplication,
  type EvidenceApiOperation,
} from "./http-boundary";

const origin = "https://vivienda.example";
const baseUrl = `${origin}/api/v1/cases/case_demo/evidence`;

const prepared: PreparedEvidenceUpload = {
  intentId: "upl_demo",
  evidenceId: "evd_demo",
  intentExpiresAt: "2026-08-26T14:15:00.000Z",
  providerGrantExpiresAt: "2026-08-26T16:00:00.000Z",
  bucketId: "vivienda-evidence",
  objectPath: "quarantine/upl_demo/evd_demo/obj_abcdef",
  uploadToken: "secret-upload-token",
  upsert: false,
};

const completed = {
  kind: "appended",
  model: {
    caseId: "case_demo",
    projection: { version: 7, stage: "collecting_evidence" },
    evidence: [],
    timeline: [],
    dataAuthorizations: [],
  },
} as unknown as CompletedEvidenceUpload;

const downloaded: EvidenceDownloadGrant = {
  evidenceId: "evd_demo",
  url: "https://storage.example/signed?token=secret-download-token",
  expiresAt: "2026-08-26T14:01:00.000Z",
};

class FakeContextSource implements ApiRequestContextSource {
  calls = 0;
  async resolve() {
    this.calls += 1;
    return { requestId: "req_abcdef", rateLimitKey: "opaque-rate-key" };
  }
}

class FakeRateLimit implements ApiRateLimitPort {
  decision: ApiRateLimitDecision = { kind: "allowed" };
  calls: Array<{ operation: EvidenceApiOperation; key: string }> = [];
  async consume(input: { operation: EvidenceApiOperation; key: string }) {
    this.calls.push(input);
    return this.decision;
  }
}

class FakeAudit implements ApiAuditLogPort {
  events: Array<{ requestId: string; operation: EvidenceApiOperation; status: number; errorCode?: string }> = [];
  record(event: { requestId: string; operation: EvidenceApiOperation; status: number; errorCode?: string }) {
    this.events.push(event);
  }
}

class FakeApplication implements EvidenceApiApplication {
  prepareCalls: unknown[] = [];
  completeCalls: unknown[] = [];
  downloadCalls: unknown[] = [];
  error: unknown = null;

  async prepareUpload(caseId: string, command: Parameters<EvidenceApiApplication["prepareUpload"]>[1]) {
    this.prepareCalls.push({ caseId, command });
    if (this.error) throw this.error;
    return { ...prepared };
  }

  async completeUpload(input: Parameters<EvidenceApiApplication["completeUpload"]>[0]) {
    this.completeCalls.push(input);
    if (this.error) throw this.error;
    return completed;
  }

  async createDownloadGrant(input: Parameters<EvidenceApiApplication["createDownloadGrant"]>[0]) {
    this.downloadCalls.push(input);
    if (this.error) throw this.error;
    return { ...downloaded };
  }
}

function jsonRequest(
  url: string,
  body: unknown,
  options: { method?: string; origin?: string | null; headers?: Record<string, string>; rawBody?: string } = {},
) {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8", ...(options.headers ?? {}) });
  if (options.origin !== null) headers.set("origin", options.origin ?? origin);
  return new Request(url, {
    method: options.method ?? "POST",
    headers,
    body: options.rawBody ?? JSON.stringify(body),
  });
}

function setup() {
  const app = new FakeApplication();
  const contexts = new FakeContextSource();
  const rate = new FakeRateLimit();
  const audit = new FakeAudit();
  const api = new EvidenceHttpApi(app, contexts, rate, audit);
  return { app, contexts, rate, audit, api };
}

async function responseJson(response: Response) {
  return JSON.parse(await response.text()) as Record<string, unknown>;
}

const prepareBody = {
  kind: "statement",
  legalDataCategory: "financial_credit_semiprivate",
  securityTier: "restricted",
};

describe("EvidenceHttpApi v0.9 request guards", () => {
  it("accepts same-origin JSON prepare and returns only the explicit upload DTO", async () => {
    const { api, app, rate, audit } = setup();
    const response = await api.prepare(jsonRequest(`${baseUrl}/uploads`, prepareBody), { caseId: "case_demo" });
    const payload = await responseJson(response);

    expect(response.status).toBe(200);
    expect(app.prepareCalls).toEqual([{ caseId: "case_demo", command: prepareBody }]);
    expect(rate.calls).toEqual([{ operation: "evidence.prepare", key: "opaque-rate-key" }]);
    expect(payload).toEqual({
      data: {
        intentId: "upl_demo",
        evidenceId: "evd_demo",
        intentExpiresAt: prepared.intentExpiresAt,
        providerGrantExpiresAt: prepared.providerGrantExpiresAt,
        upload: {
          bucketId: "vivienda-evidence",
          objectPath: prepared.objectPath,
          token: "secret-upload-token",
          upsert: false,
        },
      },
    });
    expect(JSON.stringify(payload)).not.toContain("storageLocator");
    expect(audit.events).toEqual([{ requestId: "req_abcdef", operation: "evidence.prepare", status: 200 }]);
  });

  it("rejects a missing Origin before application", async () => {
    const { api, app } = setup();
    const response = await api.prepare(jsonRequest(`${baseUrl}/uploads`, prepareBody, { origin: null }), { caseId: "case_demo" });
    expect(response.status).toBe(403);
    expect((await responseJson(response)).error).toMatchObject({ code: "origin_required" });
    expect(app.prepareCalls).toHaveLength(0);
  });

  it("rejects a cross-origin request before application", async () => {
    const { api, app } = setup();
    const response = await api.prepare(jsonRequest(`${baseUrl}/uploads`, prepareBody, { origin: "https://evil.example" }), { caseId: "case_demo" });
    expect(response.status).toBe(403);
    expect((await responseJson(response)).error).toMatchObject({ code: "cross_origin_forbidden" });
    expect(app.prepareCalls).toHaveLength(0);
  });

  it("rejects non-POST and advertises POST", async () => {
    const { api } = setup();
    const response = await api.prepare(jsonRequest(`${baseUrl}/uploads`, prepareBody, { method: "PUT" }), { caseId: "case_demo" });
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });

  it("rejects non-JSON content type with 415", async () => {
    const { api } = setup();
    const response = await api.prepare(
      jsonRequest(`${baseUrl}/uploads`, prepareBody, { headers: { "content-type": "text/plain" } }),
      { caseId: "case_demo" },
    );
    expect(response.status).toBe(415);
    expect((await responseJson(response)).error).toMatchObject({ code: "unsupported_media_type" });
  });

  it("rejects invalid JSON and primitive JSON bodies", async () => {
    const invalid = setup();
    const invalidResponse = await invalid.api.prepare(
      jsonRequest(`${baseUrl}/uploads`, null, { rawBody: "{" }),
      { caseId: "case_demo" },
    );
    expect(invalidResponse.status).toBe(400);
    expect((await responseJson(invalidResponse)).error).toMatchObject({ code: "invalid_json" });

    const primitive = setup();
    const primitiveResponse = await primitive.api.prepare(jsonRequest(`${baseUrl}/uploads`, "hello"), { caseId: "case_demo" });
    expect(primitiveResponse.status).toBe(400);
    expect((await responseJson(primitiveResponse)).error).toMatchObject({ code: "invalid_body" });
  });

  it("enforces actual UTF-8 body size even without Content-Length", async () => {
    const { api, app } = setup();
    const oversized = JSON.stringify({ value: "x".repeat(MAX_API_JSON_BYTES + 100) });
    const response = await api.prepare(
      jsonRequest(`${baseUrl}/uploads`, null, { rawBody: oversized }),
      { caseId: "case_demo" },
    );
    expect(response.status).toBe(413);
    expect((await responseJson(response)).error).toMatchObject({ code: "payload_too_large" });
    expect(app.prepareCalls).toHaveLength(0);
  });

  it("rejects extra top-level fields and recursively rejects privileged fields", async () => {
    const extra = setup();
    const extraResponse = await extra.api.prepare(
      jsonRequest(`${baseUrl}/uploads`, { ...prepareBody, note: "extra" }),
      { caseId: "case_demo" },
    );
    expect(extraResponse.status).toBe(400);
    expect((await responseJson(extraResponse)).error).toMatchObject({ code: "invalid_body" });

    const privileged = setup();
    const privilegedResponse = await privileged.api.prepare(
      jsonRequest(`${baseUrl}/uploads`, {
        kind: { nested: { subject_ref: "sub_attacker" } },
        legalDataCategory: "financial_credit_semiprivate",
        securityTier: "restricted",
      }),
      { caseId: "case_demo" },
    );
    expect(privilegedResponse.status).toBe(400);
    expect((await responseJson(privilegedResponse)).error).toMatchObject({ code: "forbidden_request_field" });
    expect(privileged.app.prepareCalls).toHaveLength(0);
  });

  it("rejects invalid path identifiers before application", async () => {
    const { api, app } = setup();
    const response = await api.prepare(jsonRequest(`${baseUrl}/uploads`, prepareBody), { caseId: "../../etc/passwd" });
    expect(response.status).toBe(400);
    expect((await responseJson(response)).error).toMatchObject({ code: "invalid_path_identifier" });
    expect(app.prepareCalls).toHaveLength(0);
  });

  it("runs rate limiting before reading/invoking application and returns Retry-After", async () => {
    const { api, rate, app } = setup();
    rate.decision = { kind: "limited", retryAfterSeconds: 7.2 };
    const response = await api.prepare(jsonRequest(`${baseUrl}/uploads`, prepareBody), { caseId: "case_demo" });
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("8");
    expect(app.prepareCalls).toHaveLength(0);
  });

  it("fails closed when the rate-limit provider is unavailable", async () => {
    const { api, rate, app } = setup();
    rate.decision = { kind: "unavailable" };
    const response = await api.prepare(jsonRequest(`${baseUrl}/uploads`, prepareBody), { caseId: "case_demo" });
    expect(response.status).toBe(503);
    expect((await responseJson(response)).error).toMatchObject({ code: "rate_limit_unavailable" });
    expect(app.prepareCalls).toHaveLength(0);
  });
});

describe("EvidenceHttpApi v0.9 operation DTOs", () => {
  it("requires Idempotency-Key for complete and forwards only server-inspected finalization inputs", async () => {
    const missing = setup();
    const missingResponse = await missing.api.complete(
      jsonRequest(`${baseUrl}/uploads/upl_demo/complete`, { expectedVersion: 6 }),
      { caseId: "case_demo", intentId: "upl_demo" },
    );
    expect(missingResponse.status).toBe(400);
    expect((await responseJson(missingResponse)).error).toMatchObject({ code: "idempotency_key_required" });
    expect(missing.app.completeCalls).toHaveLength(0);

    const valid = setup();
    const validResponse = await valid.api.complete(
      jsonRequest(`${baseUrl}/uploads/upl_demo/complete`, { expectedVersion: 6 }, { headers: { "idempotency-key": "idem-browser-001" } }),
      { caseId: "case_demo", intentId: "upl_demo" },
    );
    expect(validResponse.status).toBe(200);
    expect(valid.app.completeCalls).toEqual([
      {
        caseId: "case_demo",
        intentId: "upl_demo",
        expectedVersion: 6,
        idempotencyKey: "idem-browser-001",
      },
    ]);
    expect(JSON.stringify(valid.app.completeCalls)).not.toContain("receipt");
    expect(JSON.stringify(valid.app.completeCalls)).not.toContain("storageLocator");
  });

  it("rejects receipt/provider metadata supplied by the browser on complete", async () => {
    const { api, app } = setup();
    const response = await api.complete(
      jsonRequest(
        `${baseUrl}/uploads/upl_demo/complete`,
        { expectedVersion: 6, receipt: { checksumSha256: "a".repeat(64), storageLocator: "obj_fake" } },
        { headers: { "idempotency-key": "idem-browser-002" } },
      ),
      { caseId: "case_demo", intentId: "upl_demo" },
    );
    expect(response.status).toBe(400);
    expect((await responseJson(response)).error).toMatchObject({ code: "forbidden_request_field" });
    expect(app.completeCalls).toHaveLength(0);
  });

  it("rejects invalid or control-character Idempotency-Key", async () => {
    const { api } = setup();
    const response = await api.complete(
      jsonRequest(`${baseUrl}/uploads/upl_demo/complete`, { expectedVersion: 6 }, { headers: { "idempotency-key": `bad\u0007key` } }),
      { caseId: "case_demo", intentId: "upl_demo" },
    );
    expect(response.status).toBe(400);
    expect((await responseJson(response)).error).toMatchObject({ code: "invalid_idempotency_key" });
  });

  it("returns a minimal complete DTO instead of the full case snapshot", async () => {
    const { api } = setup();
    const response = await api.complete(
      jsonRequest(`${baseUrl}/uploads/upl_demo/complete`, { expectedVersion: 6 }, { headers: { "idempotency-key": "idem-browser-003" } }),
      { caseId: "case_demo", intentId: "upl_demo" },
    );
    expect(await responseJson(response)).toEqual({
      data: { kind: "appended", caseId: "case_demo", version: 7, stage: "collecting_evidence" },
    });
  });

  it("returns only evidenceId/url/expiry for download and validates requested TTL", async () => {
    const valid = setup();
    const response = await valid.api.download(
      jsonRequest(`${baseUrl}/evd_demo/download`, { expiresInSeconds: 60 }),
      { caseId: "case_demo", evidenceId: "evd_demo" },
    );
    const payload = await responseJson(response);
    expect(response.status).toBe(200);
    expect(payload).toEqual({ data: downloaded });
    expect(JSON.stringify(payload)).not.toContain("objectPath");
    expect(JSON.stringify(payload)).not.toContain("storageLocator");
    expect(valid.app.downloadCalls).toEqual([{ caseId: "case_demo", evidenceId: "evd_demo", expiresInSeconds: 60 }]);

    const invalid = setup();
    const invalidResponse = await invalid.api.download(
      jsonRequest(`${baseUrl}/evd_demo/download`, { expiresInSeconds: 301 }),
      { caseId: "case_demo", evidenceId: "evd_demo" },
    );
    expect(invalidResponse.status).toBe(400);
    expect(invalid.app.downloadCalls).toHaveLength(0);
  });
});

describe("EvidenceHttpApi v0.9 safe errors and response policy", () => {
  it.each([
    ["authentication_required", 401],
    ["forbidden", 403],
    ["case_not_found", 404],
    ["version_conflict", 409],
    ["data_authorization_required", 409],
    ["provider_error", 503],
  ] as const)("maps %s to HTTP %s without exposing internal message", async (code, status) => {
    const { api, app } = setup();
    app.error = new PersistenceBoundaryError(code, "SQL secret path token provider-detail");
    const response = await api.prepare(jsonRequest(`${baseUrl}/uploads`, prepareBody), { caseId: "case_demo" });
    const payload = await responseJson(response);
    expect(response.status).toBe(status);
    expect(JSON.stringify(payload)).not.toContain("SQL secret");
    expect(JSON.stringify(payload)).not.toContain("provider-detail");
  });

  it("maps unknown exceptions to generic 500 and never returns stack/message", async () => {
    const { api, app } = setup();
    app.error = new Error("database password=super-secret");
    const response = await api.prepare(jsonRequest(`${baseUrl}/uploads`, prepareBody), { caseId: "case_demo" });
    const payload = await responseJson(response);
    expect(response.status).toBe(500);
    expect(payload).toEqual({ error: { code: "internal_error", message: "No fue posible procesar la solicitud." } });
    expect(JSON.stringify(payload)).not.toContain("super-secret");
  });

  it("sets no-store/nosniff/no-referrer and a server request id on success and errors", async () => {
    const { api } = setup();
    const success = await api.prepare(jsonRequest(`${baseUrl}/uploads`, prepareBody), { caseId: "case_demo" });
    expect(success.headers.get("cache-control")).toBe("no-store");
    expect(success.headers.get("x-content-type-options")).toBe("nosniff");
    expect(success.headers.get("referrer-policy")).toBe("no-referrer");
    expect(success.headers.get("x-request-id")).toBe("req_abcdef");

    const error = await api.prepare(jsonRequest(`${baseUrl}/uploads`, prepareBody, { origin: null }), { caseId: "case_demo" });
    expect(error.headers.get("cache-control")).toBe("no-store");
    expect(error.headers.get("x-request-id")).toBe("req_abcdef");
  });

  it("audit events contain no request body, signed URL, upload token, locator or idempotency value", async () => {
    const { api, audit } = setup();
    await api.prepare(jsonRequest(`${baseUrl}/uploads`, prepareBody), { caseId: "case_demo" });
    await api.complete(
      jsonRequest(`${baseUrl}/uploads/upl_demo/complete`, { expectedVersion: 6 }, { headers: { "idempotency-key": "idem-secret-value" } }),
      { caseId: "case_demo", intentId: "upl_demo" },
    );
    await api.download(jsonRequest(`${baseUrl}/evd_demo/download`, {}), { caseId: "case_demo", evidenceId: "evd_demo" });

    const serialized = JSON.stringify(audit.events);
    expect(serialized).not.toContain("secret-upload-token");
    expect(serialized).not.toContain("secret-download-token");
    expect(serialized).not.toContain("idem-secret-value");
    expect(serialized).not.toContain("objectPath");
    expect(serialized).not.toContain("storageLocator");
    expect(serialized).not.toContain("financial_credit_semiprivate");
  });
});
