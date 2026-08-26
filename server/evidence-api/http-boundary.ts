import { PersistenceBoundaryError, type PrepareEvidenceUploadCommand } from "@/domain/persistence-boundary/contracts";
import type {
  CompletedEvidenceUpload,
  EvidenceDownloadGrant,
  PreparedEvidenceUpload,
} from "@/domain/storage-coordination/coordinator";

export const MAX_API_JSON_BYTES = 16 * 1024;

const CASE_ID = /^case_[A-Za-z0-9_-]{3,}$/;
const INTENT_ID = /^upl_[A-Za-z0-9_-]{3,}$/;
const EVIDENCE_ID = /^evd_[A-Za-z0-9_-]{3,}$/;
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;
const IDEMPOTENCY_KEY_MAX = 200;

const EVIDENCE_KINDS = new Set([
  "statement",
  "contract",
  "bank_response",
  "filing_proof",
  "authority",
  "court_document",
  "other",
]);
const LEGAL_DATA_CATEGORIES = new Set([
  "non_personal",
  "personal",
  "financial_credit_semiprivate",
  "private",
  "sensitive",
]);
const SECURITY_TIERS = new Set(["open", "controlled", "restricted", "highly_restricted"]);

const PRIVILEGED_KEYS = new Set([
  "subjectref",
  "createdbysubjectref",
  "authuserid",
  "role",
  "principal",
  "principalkind",
  "service",
  "servicerole",
  "servicekey",
  "secretkey",
  "owner",
  "ownersubjectref",
  "lawyersubjectref",
  "admin",
  "objectpath",
  "storagelocator",
  "bucketid",
  "uploadtoken",
  "signedurl",
  "providertoken",
  "providerreceipt",
  "receipt",
  "checksum",
  "checksumsha256",
  "mimetype",
  "bytesize",
]);

export type EvidenceApiOperation = "evidence.prepare" | "evidence.complete" | "evidence.download";

export type ApiRequestContext = {
  requestId: string;
  rateLimitKey: string;
};

export interface ApiRequestContextSource {
  resolve(request: Request): Promise<ApiRequestContext> | ApiRequestContext;
}

export type ApiRateLimitDecision =
  | { kind: "allowed" }
  | { kind: "limited"; retryAfterSeconds?: number }
  | { kind: "unavailable" };

export interface ApiRateLimitPort {
  consume(input: { operation: EvidenceApiOperation; key: string }): Promise<ApiRateLimitDecision>;
}

export interface ApiAuditLogPort {
  record(event: {
    requestId: string;
    operation: EvidenceApiOperation;
    status: number;
    errorCode?: string;
  }): Promise<void> | void;
}

export interface EvidenceApiApplication {
  prepareUpload(caseId: string, command: PrepareEvidenceUploadCommand): Promise<PreparedEvidenceUpload>;
  completeUpload(input: {
    caseId: string;
    intentId: string;
    expectedVersion: number;
    idempotencyKey: string;
  }): Promise<CompletedEvidenceUpload>;
  createDownloadGrant(input: {
    caseId: string;
    evidenceId: string;
    expiresInSeconds?: number;
  }): Promise<EvidenceDownloadGrant>;
}

export type ApiPathParams = {
  caseId: string;
  intentId?: string;
  evidenceId?: string;
};

type PublicError = {
  code: string;
  message: string;
};

type GuardFailure = {
  status: number;
  error: PublicError;
  headers?: Record<string, string>;
};

class HttpGuardError extends Error {
  constructor(readonly failure: GuardFailure) {
    super(failure.error.code);
    this.name = "HttpGuardError";
  }
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertNoPrivilegedKeys(value: unknown) {
  if (Array.isArray(value)) {
    for (const item of value) assertNoPrivilegedKeys(item);
    return;
  }
  if (!isPlainRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (PRIVILEGED_KEYS.has(normalizeKey(key))) {
      throw guard(400, "forbidden_request_field", "La solicitud contiene un campo no permitido.");
    }
    assertNoPrivilegedKeys(child);
  }
}

function assertExactKeys(body: Record<string, unknown>, allowed: readonly string[]) {
  const allow = new Set(allowed);
  for (const key of Object.keys(body)) {
    if (!allow.has(key)) {
      throw guard(400, "invalid_body", "La solicitud contiene campos no reconocidos.");
    }
  }
}

function guard(status: number, code: string, message: string, headers?: Record<string, string>): HttpGuardError {
  return new HttpGuardError({ status, error: { code, message }, headers });
}

function parseContentType(value: string | null): boolean {
  if (!value) return false;
  const parts = value.split(";").map((item) => item.trim());
  if (parts.shift()?.toLowerCase() !== "application/json") return false;
  return parts.every((part) => part !== "" && /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\s*=\s*[^\u0000-\u001F\u007F]+$/.test(part));
}

function assertPostJson(request: Request) {
  if (request.method.toUpperCase() !== "POST") {
    throw guard(405, "method_not_allowed", "Método no permitido.", { Allow: "POST" });
  }
  if (!parseContentType(request.headers.get("content-type"))) {
    throw guard(415, "unsupported_media_type", "Se requiere Content-Type application/json.");
  }
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const parsed = Number(contentLength);
    if (Number.isFinite(parsed) && parsed > MAX_API_JSON_BYTES) {
      throw guard(413, "payload_too_large", "La solicitud excede el tamaño permitido.");
    }
  }
}

function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    throw guard(403, "origin_required", "La solicitud requiere un origen válido.");
  }
  let requestOrigin: string;
  let normalizedOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
    normalizedOrigin = new URL(origin).origin;
  } catch {
    throw guard(403, "cross_origin_forbidden", "Origen no permitido.");
  }
  if (origin !== normalizedOrigin || normalizedOrigin !== requestOrigin) {
    throw guard(403, "cross_origin_forbidden", "Origen no permitido.");
  }
}

function assertPathIdentifiers(operation: EvidenceApiOperation, params: ApiPathParams) {
  if (!CASE_ID.test(params.caseId)) {
    throw guard(400, "invalid_path_identifier", "Identificador de expediente inválido.");
  }
  if (operation === "evidence.complete" && (!params.intentId || !INTENT_ID.test(params.intentId))) {
    throw guard(400, "invalid_path_identifier", "Identificador de upload inválido.");
  }
  if (operation === "evidence.download" && (!params.evidenceId || !EVIDENCE_ID.test(params.evidenceId))) {
    throw guard(400, "invalid_path_identifier", "Identificador de evidencia inválido.");
  }
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  const size = new TextEncoder().encode(text).byteLength;
  if (size > MAX_API_JSON_BYTES) {
    throw guard(413, "payload_too_large", "La solicitud excede el tamaño permitido.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw guard(400, "invalid_json", "JSON inválido.");
  }
  if (!isPlainRecord(parsed)) {
    throw guard(400, "invalid_body", "El cuerpo debe ser un objeto JSON.");
  }
  assertNoPrivilegedKeys(parsed);
  return parsed;
}

function parsePrepareBody(body: Record<string, unknown>): PrepareEvidenceUploadCommand {
  assertExactKeys(body, ["kind", "legalDataCategory", "securityTier"]);
  const { kind, legalDataCategory, securityTier } = body;
  if (typeof kind !== "string" || !EVIDENCE_KINDS.has(kind)) {
    throw guard(400, "invalid_body", "kind inválido.");
  }
  if (typeof legalDataCategory !== "string" || !LEGAL_DATA_CATEGORIES.has(legalDataCategory)) {
    throw guard(400, "invalid_body", "legalDataCategory inválido.");
  }
  if (typeof securityTier !== "string" || !SECURITY_TIERS.has(securityTier)) {
    throw guard(400, "invalid_body", "securityTier inválido.");
  }
  return {
    kind: kind as PrepareEvidenceUploadCommand["kind"],
    legalDataCategory: legalDataCategory as PrepareEvidenceUploadCommand["legalDataCategory"],
    securityTier: securityTier as PrepareEvidenceUploadCommand["securityTier"],
  };
}

function parseCompleteBody(body: Record<string, unknown>): { expectedVersion: number } {
  assertExactKeys(body, ["expectedVersion"]);
  if (!Number.isInteger(body.expectedVersion) || (body.expectedVersion as number) < 0) {
    throw guard(400, "invalid_body", "expectedVersion debe ser un entero no negativo.");
  }
  return { expectedVersion: body.expectedVersion as number };
}

function parseDownloadBody(body: Record<string, unknown>): { expiresInSeconds?: number } {
  assertExactKeys(body, ["expiresInSeconds"]);
  if (body.expiresInSeconds === undefined) return {};
  if (
    !Number.isInteger(body.expiresInSeconds) ||
    (body.expiresInSeconds as number) <= 0 ||
    (body.expiresInSeconds as number) > 300
  ) {
    throw guard(400, "invalid_body", "expiresInSeconds debe estar entre 1 y 300.");
  }
  return { expiresInSeconds: body.expiresInSeconds as number };
}

function readIdempotencyKey(request: Request): string {
  const key = request.headers.get("idempotency-key");
  if (key === null || key.trim() === "") {
    throw guard(400, "idempotency_key_required", "Se requiere Idempotency-Key.");
  }
  if (key.length > IDEMPOTENCY_KEY_MAX || CONTROL_CHARACTER.test(key)) {
    throw guard(400, "invalid_idempotency_key", "Idempotency-Key inválida.");
  }
  return key;
}

function publicErrorFromBoundary(error: PersistenceBoundaryError): GuardFailure {
  const code = error.code;
  switch (code) {
    case "authentication_required":
      return { status: 401, error: { code, message: "Se requiere autenticación." } };
    case "forbidden":
      return { status: 403, error: { code, message: "No tienes acceso a este recurso." } };
    case "case_not_found":
    case "evidence_intent_not_found":
    case "evidence_not_found":
      return { status: 404, error: { code, message: "El recurso solicitado no está disponible." } };
    case "version_conflict":
    case "idempotency_conflict":
    case "data_authorization_required":
    case "data_authorization_subject_mismatch":
    case "evidence_intent_expired":
    case "evidence_on_legal_hold":
      return { status: 409, error: { code, message: "La operación no puede completarse en el estado actual." } };
    case "provider_error":
      return { status: 503, error: { code, message: "El servicio está temporalmente no disponible." } };
    default:
      return { status: 400, error: { code, message: "La solicitud no es válida." } };
  }
}

function responseHeaders(requestId: string, additional?: Record<string, string>): Headers {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Request-Id": requestId,
  });
  for (const [key, value] of Object.entries(additional ?? {})) headers.set(key, value);
  return headers;
}

function jsonResponse(status: number, body: unknown, requestId: string, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(requestId, headers),
  });
}

function prepareDto(result: PreparedEvidenceUpload) {
  return {
    intentId: result.intentId,
    evidenceId: result.evidenceId,
    intentExpiresAt: result.intentExpiresAt,
    providerGrantExpiresAt: result.providerGrantExpiresAt,
    upload: {
      bucketId: result.bucketId,
      objectPath: result.objectPath,
      token: result.uploadToken,
      upsert: false as const,
    },
  };
}

function completeDto(result: CompletedEvidenceUpload) {
  return {
    kind: result.kind,
    caseId: result.model.caseId,
    version: result.model.projection.version,
    stage: result.model.projection.stage,
  };
}

function downloadDto(result: EvidenceDownloadGrant) {
  return {
    evidenceId: result.evidenceId,
    url: result.url,
    expiresAt: result.expiresAt,
  };
}

export class EvidenceHttpApi {
  constructor(
    private readonly application: EvidenceApiApplication,
    private readonly contexts: ApiRequestContextSource,
    private readonly rateLimits: ApiRateLimitPort,
    private readonly audit: ApiAuditLogPort,
  ) {}

  prepare(request: Request, params: { caseId: string }): Promise<Response> {
    return this.handle("evidence.prepare", request, params, async (body) => {
      const command = parsePrepareBody(body);
      return prepareDto(await this.application.prepareUpload(params.caseId, command));
    });
  }

  complete(request: Request, params: { caseId: string; intentId: string }): Promise<Response> {
    return this.handle("evidence.complete", request, params, async (body) => {
      const idempotencyKey = readIdempotencyKey(request);
      const command = parseCompleteBody(body);
      return completeDto(
        await this.application.completeUpload({
          caseId: params.caseId,
          intentId: params.intentId,
          expectedVersion: command.expectedVersion,
          idempotencyKey,
        }),
      );
    });
  }

  download(request: Request, params: { caseId: string; evidenceId: string }): Promise<Response> {
    return this.handle("evidence.download", request, params, async (body) => {
      const command = parseDownloadBody(body);
      return downloadDto(
        await this.application.createDownloadGrant({
          caseId: params.caseId,
          evidenceId: params.evidenceId,
          ...command,
        }),
      );
    });
  }

  private async handle(
    operation: EvidenceApiOperation,
    request: Request,
    params: ApiPathParams,
    invoke: (body: Record<string, unknown>) => Promise<unknown>,
  ): Promise<Response> {
    let context: ApiRequestContext;
    try {
      context = await this.contexts.resolve(request);
      if (!/^req_[A-Za-z0-9_-]{6,}$/.test(context.requestId) || context.rateLimitKey.trim() === "") {
        throw new Error("invalid request context");
      }
    } catch {
      return jsonResponse(500, { error: { code: "request_context_unavailable", message: "No fue posible procesar la solicitud." } }, "req_unavailable");
    }

    try {
      assertPostJson(request);
      assertSameOrigin(request);
      assertPathIdentifiers(operation, params);

      const rateLimit = await this.rateLimits.consume({ operation, key: context.rateLimitKey });
      if (rateLimit.kind === "unavailable") {
        throw guard(503, "rate_limit_unavailable", "El servicio está temporalmente no disponible.");
      }
      if (rateLimit.kind === "limited") {
        const retryAfter = rateLimit.retryAfterSeconds;
        throw guard(
          429,
          "rate_limited",
          "Demasiadas solicitudes.",
          retryAfter && retryAfter > 0 ? { "Retry-After": String(Math.ceil(retryAfter)) } : undefined,
        );
      }

      const body = await readJsonObject(request);
      const result = await invoke(body);
      const response = jsonResponse(200, { data: result }, context.requestId);
      await this.safeAudit({ requestId: context.requestId, operation, status: 200 });
      return response;
    } catch (error) {
      const failure =
        error instanceof HttpGuardError
          ? error.failure
          : error instanceof PersistenceBoundaryError
            ? publicErrorFromBoundary(error)
            : { status: 500, error: { code: "internal_error", message: "No fue posible procesar la solicitud." } };
      await this.safeAudit({
        requestId: context.requestId,
        operation,
        status: failure.status,
        errorCode: failure.error.code,
      });
      return jsonResponse(failure.status, { error: failure.error }, context.requestId, failure.headers);
    }
  }

  private async safeAudit(event: Parameters<ApiAuditLogPort["record"]>[0]) {
    try {
      await this.audit.record(event);
    } catch {
      // Audit adapter failure must not leak provider detail or replace the primary API result in v0.9.
    }
  }
}
