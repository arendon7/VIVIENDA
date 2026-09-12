import type { ProviderCandidateFixtureLease } from "./provider-candidate-fixture-lifecycle";
import type {
  SupabaseProviderCandidateProbeExecutionPort,
  SupabaseProviderPreparedUpload,
  SupabaseProviderProbeActor,
  SupabaseProviderProbeAuditEvent,
  SupabaseProviderProbeCaseSeed,
  SupabaseProviderProbeCaseSnapshot,
  SupabaseProviderProbeFault,
  SupabaseProviderProbeHttpResult,
  SupabaseProviderProbeIntentSnapshot,
  SupabaseProviderProbeTelemetry,
} from "./supabase-provider-candidate-probe-adapter";

export const SUPABASE_PROVIDER_CANDIDATE_EXECUTION_DRIVER_VERSION =
  "V0.23.25-SUPABASE-PROVIDER-EXECUTION-DRIVER-V1" as const;

const PROJECT_LABEL = "vivienda-dev" as const;
const EVIDENCE_BUCKET_ID = "vivienda-evidence" as const;
const API_PATH_PREFIX = "/api/v1/cases/";
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;
const TOKEN_MAX = 16 * 1024;
const HTTP_STATUS_MIN = 100;
const HTTP_STATUS_MAX = 599;
const OBSERVATION_ID = /^obs_[A-Za-z0-9_-]{6,}$/;
const CASE_ID = /^case_[A-Za-z0-9_-]{6,}$/;
const INTENT_ID = /^upl_[A-Za-z0-9_-]{6,}$/;
const EVIDENCE_ID = /^evd_[A-Za-z0-9_-]{6,}$/;
const OBJECT_PATH = /^quarantine\/upl_[A-Za-z0-9_-]{6,}\/evd_[A-Za-z0-9_-]{6,}\/obj_[A-Za-z0-9_-]{6,}$/;
const AUDIT_OPERATIONS = new Set([
  "evidence.prepare",
  "evidence.complete",
  "evidence.download",
] as const);

export type SupabaseProviderCandidateExecutionDriverErrorCode =
  | "invalid_configuration"
  | "invalid_input"
  | "invalid_transport_response"
  | "transport_failure"
  | "fault_cleanup_failed";

export class SupabaseProviderCandidateExecutionDriverError extends Error {
  constructor(readonly code: SupabaseProviderCandidateExecutionDriverErrorCode) {
    super("Supabase provider candidate execution driver failed.");
    this.name = "SupabaseProviderCandidateExecutionDriverError";
  }
}

export type SupabaseProviderCandidateTransportIdentity = {
  projectLabel: typeof PROJECT_LABEL;
  syntheticOnly: true;
  liveRuntimeAuthorized: false;
};

export type SupabaseProviderCandidateAuthSession = {
  subjectRef: string;
  accessToken: string;
  expiresAt: string;
};

export interface SupabaseProviderCandidateAuthTransport
  extends SupabaseProviderCandidateTransportIdentity {
  readonly channel: "supabase_auth";
  issueAccessToken(input: {
    lease: ProviderCandidateFixtureLease;
    actor: "owner" | "intruder";
  }): Promise<SupabaseProviderCandidateAuthSession>;
}

export type SupabaseProviderCandidateHttpRequest = {
  method: "POST";
  url: string;
  headers: Record<string, string>;
  body: unknown;
};

export type SupabaseProviderCandidateHttpResponse = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

export interface SupabaseProviderCandidateHttpTransport
  extends SupabaseProviderCandidateTransportIdentity {
  readonly channel: "evidence_api";
  send(request: SupabaseProviderCandidateHttpRequest): Promise<SupabaseProviderCandidateHttpResponse>;
}

export interface SupabaseProviderCandidateStorageTransport
  extends SupabaseProviderCandidateTransportIdentity {
  readonly channel: "supabase_storage";
  uploadSigned(input: {
    lease: ProviderCandidateFixtureLease;
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
    signedCapability: string;
    contentType: "application/pdf";
    bytes: Uint8Array;
    upsert: false;
  }): Promise<{ status: number }>;
}

export type SupabaseProviderCandidateSeedSpec = {
  lease: ProviderCandidateFixtureLease;
  ownerSubjectRef: string;
  routeCode: "R7_RECLAMACION";
  caseTrack: "assisted";
  authorizeData: boolean;
  evidenceRequestCode: "R7_STATEMENT_DIFFERENCE";
};

export interface SupabaseProviderCandidateStateTransport
  extends SupabaseProviderCandidateTransportIdentity {
  readonly channel: "supabase_state";
  seedCase(input: SupabaseProviderCandidateSeedSpec): Promise<SupabaseProviderProbeCaseSeed>;
  readCase(input: {
    lease: ProviderCandidateFixtureLease;
    caseId: string;
    ownerSubjectRef: string;
  }): Promise<SupabaseProviderProbeCaseSnapshot>;
  readIntent(input: {
    lease: ProviderCandidateFixtureLease;
    caseId: string;
    intentId: string;
  }): Promise<SupabaseProviderProbeIntentSnapshot | null>;
}

export type SupabaseProviderCandidateTelemetryEnvelope = {
  source: "supabase_dev_observability";
  observationId: string;
  fixtureId: string;
  namespace: string;
  scope: ProviderCandidateFixtureLease["scope"];
  observedAt: string;
  complete: true;
  registryRegistrations: number;
  storageUploadGrantCalls: number;
  storageInspectionCalls: number;
  auditOperations: SupabaseProviderProbeAuditEvent[];
};

export interface SupabaseProviderCandidateObservabilityTransport
  extends SupabaseProviderCandidateTransportIdentity {
  readonly channel: "supabase_observability";
  readTelemetry(input: {
    lease: ProviderCandidateFixtureLease;
  }): Promise<SupabaseProviderCandidateTelemetryEnvelope>;
}

export type SupabaseProviderCandidateFaultReceipt = {
  receiptId: string;
  fixtureId: string;
  namespace: string;
  operation: "evidence.prepare";
  mode: "rate_limit_unavailable_once";
  armed: true;
};

export interface SupabaseProviderCandidateParityFaultTransport
  extends SupabaseProviderCandidateTransportIdentity {
  readonly channel: "parity_fault_control";
  readonly parityOnly: true;
  armRateLimitUnavailable(input: {
    lease: ProviderCandidateFixtureLease;
    operation: "evidence.prepare";
    oneShot: true;
  }): Promise<SupabaseProviderCandidateFaultReceipt>;
  disarm(input: {
    lease: ProviderCandidateFixtureLease;
    receipt: SupabaseProviderCandidateFaultReceipt;
  }): Promise<void>;
}

export type SupabaseProviderCandidateExecutionDriverConfig = {
  evidenceApiOrigin: string;
};

type DriverTransports = {
  auth: SupabaseProviderCandidateAuthTransport;
  http: SupabaseProviderCandidateHttpTransport;
  storage: SupabaseProviderCandidateStorageTransport;
  state: SupabaseProviderCandidateStateTransport;
  observability: SupabaseProviderCandidateObservabilityTransport;
  faults: SupabaseProviderCandidateParityFaultTransport;
};

function fail(code: SupabaseProviderCandidateExecutionDriverErrorCode): never {
  throw new SupabaseProviderCandidateExecutionDriverError(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validStatus(value: number): boolean {
  return Number.isSafeInteger(value) && value >= HTTP_STATUS_MIN && value <= HTTP_STATUS_MAX;
}

function validCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function parseIso(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeJson(value: unknown): void {
  try {
    JSON.stringify(value);
  } catch {
    fail("invalid_transport_response");
  }
}

function normalizeOrigin(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    fail("invalid_configuration");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    fail("invalid_configuration");
  }
  return parsed.origin;
}

function assertLease(lease: ProviderCandidateFixtureLease): void {
  if (
    !lease ||
    lease.syntheticOnly !== true ||
    lease.disposable !== true ||
    typeof lease.fixtureId !== "string" ||
    typeof lease.namespace !== "string" ||
    typeof lease.ownerSubjectRef !== "string" ||
    typeof lease.intruderSubjectRef !== "string" ||
    lease.ownerSubjectRef === lease.intruderSubjectRef ||
    !lease.namespace.startsWith("vivienda_dev_")
  ) {
    fail("invalid_input");
  }
}

function expectedPrepareActor(scope: ProviderCandidateFixtureLease["scope"]): SupabaseProviderProbeActor {
  if (scope === "unauthenticated_prepare") return "anonymous";
  if (scope === "cross_case_access") return "intruder";
  return "owner";
}

function expectedPrepareFault(scope: ProviderCandidateFixtureLease["scope"]): SupabaseProviderProbeFault {
  return scope === "rate_limit_unavailable" ? "rate_limit_unavailable" : null;
}

function assertPrepareScope(
  lease: ProviderCandidateFixtureLease,
  actor: SupabaseProviderProbeActor,
  fault: SupabaseProviderProbeFault,
): void {
  if (actor !== expectedPrepareActor(lease.scope) || fault !== expectedPrepareFault(lease.scope)) {
    fail("invalid_input");
  }
}

function assertTransportIdentity(
  transport: SupabaseProviderCandidateTransportIdentity & { channel: string },
  channel: string,
): void {
  if (
    transport.projectLabel !== PROJECT_LABEL ||
    transport.syntheticOnly !== true ||
    transport.liveRuntimeAuthorized !== false ||
    transport.channel !== channel
  ) {
    fail("invalid_configuration");
  }
}

function subjectForActor(
  lease: ProviderCandidateFixtureLease,
  actor: "owner" | "intruder",
): string {
  return actor === "owner" ? lease.ownerSubjectRef : lease.intruderSubjectRef;
}

function assertOpaqueToken(token: string): void {
  if (
    typeof token !== "string" ||
    token.length < 8 ||
    token.length > TOKEN_MAX ||
    CONTROL_CHARACTER.test(token) ||
    /\s/.test(token)
  ) {
    fail("invalid_transport_response");
  }
}

function assertAuthSession(
  session: SupabaseProviderCandidateAuthSession,
  lease: ProviderCandidateFixtureLease,
  actor: "owner" | "intruder",
): void {
  if (
    !session ||
    session.subjectRef !== subjectForActor(lease, actor) ||
    parseIso(session.expiresAt) === null
  ) {
    fail("invalid_transport_response");
  }
  assertOpaqueToken(session.accessToken);
}

function assertHttpResponse(response: SupabaseProviderCandidateHttpResponse): void {
  if (!response || !validStatus(response.status)) fail("invalid_transport_response");
  safeJson(response.body);
  if (response.headers !== undefined) {
    if (!isRecord(response.headers)) fail("invalid_transport_response");
    for (const [key, value] of Object.entries(response.headers)) {
      if (key.trim() === "" || typeof value !== "string" || CONTROL_CHARACTER.test(key + value)) {
        fail("invalid_transport_response");
      }
    }
  }
}

function dataFromBody(body: unknown): unknown | null {
  if (!isRecord(body) || !("data" in body)) return null;
  return body.data ?? null;
}

function parsePreparedUpload(
  response: SupabaseProviderCandidateHttpResponse,
  lease: ProviderCandidateFixtureLease,
): SupabaseProviderPreparedUpload {
  const root = response.body;
  if (!isRecord(root) || !isRecord(root.data)) fail("invalid_transport_response");
  const data = root.data;
  if (!isRecord(data.upload)) fail("invalid_transport_response");
  const upload = data.upload;
  const intentId = data.intentId;
  const evidenceId = data.evidenceId;
  const objectPath = upload.objectPath;
  const token = upload.token;
  if (
    typeof intentId !== "string" ||
    !INTENT_ID.test(intentId) ||
    !intentId.startsWith(`upl_${lease.namespace}_`) ||
    typeof evidenceId !== "string" ||
    !EVIDENCE_ID.test(evidenceId) ||
    typeof objectPath !== "string" ||
    !OBJECT_PATH.test(objectPath) ||
    upload.bucketId !== EVIDENCE_BUCKET_ID ||
    upload.upsert !== false ||
    typeof token !== "string"
  ) {
    fail("invalid_transport_response");
  }
  const parts = objectPath.split("/");
  if (parts[1] !== intentId || parts[2] !== evidenceId) fail("invalid_transport_response");
  assertOpaqueToken(token);
  return {
    intentId,
    evidenceId,
    objectPath,
    uploadCapability: token,
  };
}

function validateSeed(
  seed: SupabaseProviderProbeCaseSeed,
  lease: ProviderCandidateFixtureLease,
  authorizeData: boolean,
): SupabaseProviderProbeCaseSeed {
  const expectedVersion = authorizeData ? 4 : 3;
  if (
    !seed ||
    typeof seed.caseId !== "string" ||
    !CASE_ID.test(seed.caseId) ||
    !seed.caseId.startsWith(`case_${lease.namespace}_`) ||
    seed.versionBeforeEvidenceOperation !== expectedVersion
  ) {
    fail("invalid_transport_response");
  }
  return { ...seed };
}

function validateCaseSnapshot(
  snapshot: SupabaseProviderProbeCaseSnapshot,
  lease: ProviderCandidateFixtureLease,
  caseId: string,
): SupabaseProviderProbeCaseSnapshot {
  if (
    !snapshot ||
    snapshot.caseId !== caseId ||
    snapshot.ownerSubjectRef !== lease.ownerSubjectRef ||
    typeof snapshot.routeCode !== "string" ||
    typeof snapshot.caseTrack !== "string" ||
    !Number.isSafeInteger(snapshot.version) ||
    snapshot.version < 1 ||
    typeof snapshot.stage !== "string" ||
    !Array.isArray(snapshot.eventSequence) ||
    snapshot.eventSequence.some((event) => typeof event !== "string") ||
    !Array.isArray(snapshot.evidence)
  ) {
    fail("invalid_transport_response");
  }
  safeJson(snapshot.publicReadModel);
  return {
    ...snapshot,
    eventSequence: [...snapshot.eventSequence],
    evidence: snapshot.evidence.map((item) => ({ ...item })),
  };
}

function validateIntent(
  intent: SupabaseProviderProbeIntentSnapshot | null,
  lease: ProviderCandidateFixtureLease,
  caseId: string,
  intentId: string,
): SupabaseProviderProbeIntentSnapshot | null {
  if (intent === null) return null;
  if (
    intent.caseId !== caseId ||
    intent.intentId !== intentId ||
    !intentId.startsWith(`upl_${lease.namespace}_`) ||
    (intent.status !== "quarantine" && intent.status !== "finalized" && intent.status !== "expired")
  ) {
    fail("invalid_transport_response");
  }
  return { ...intent };
}

function validateAudit(event: SupabaseProviderProbeAuditEvent): SupabaseProviderProbeAuditEvent {
  if (
    !event ||
    !AUDIT_OPERATIONS.has(event.operation) ||
    !validStatus(event.status) ||
    (event.errorCode !== undefined &&
      (typeof event.errorCode !== "string" || event.errorCode.trim() === "" || CONTROL_CHARACTER.test(event.errorCode)))
  ) {
    fail("invalid_transport_response");
  }
  return {
    operation: event.operation,
    status: event.status,
    ...(event.errorCode ? { errorCode: event.errorCode } : {}),
  };
}

function validateTelemetry(
  envelope: SupabaseProviderCandidateTelemetryEnvelope,
  lease: ProviderCandidateFixtureLease,
): SupabaseProviderProbeTelemetry {
  if (
    !envelope ||
    envelope.source !== "supabase_dev_observability" ||
    !OBSERVATION_ID.test(envelope.observationId) ||
    envelope.fixtureId !== lease.fixtureId ||
    envelope.namespace !== lease.namespace ||
    envelope.scope !== lease.scope ||
    envelope.complete !== true ||
    parseIso(envelope.observedAt) === null ||
    !validCount(envelope.registryRegistrations) ||
    !validCount(envelope.storageUploadGrantCalls) ||
    !validCount(envelope.storageInspectionCalls) ||
    !Array.isArray(envelope.auditOperations)
  ) {
    fail("invalid_transport_response");
  }
  return {
    fixtureId: envelope.fixtureId,
    namespace: envelope.namespace,
    registryRegistrations: envelope.registryRegistrations,
    storageUploadGrantCalls: envelope.storageUploadGrantCalls,
    storageInspectionCalls: envelope.storageInspectionCalls,
    auditOperations: envelope.auditOperations.map(validateAudit),
  };
}

function validateFaultReceipt(
  receipt: SupabaseProviderCandidateFaultReceipt,
  lease: ProviderCandidateFixtureLease,
): SupabaseProviderCandidateFaultReceipt {
  if (
    !receipt ||
    typeof receipt.receiptId !== "string" ||
    receipt.receiptId.trim() === "" ||
    CONTROL_CHARACTER.test(receipt.receiptId) ||
    receipt.fixtureId !== lease.fixtureId ||
    receipt.namespace !== lease.namespace ||
    receipt.operation !== "evidence.prepare" ||
    receipt.mode !== "rate_limit_unavailable_once" ||
    receipt.armed !== true
  ) {
    fail("invalid_transport_response");
  }
  return { ...receipt };
}

function syntheticPdf(lease: ProviderCandidateFixtureLease, byteSize: 2048): Uint8Array {
  const encoder = new TextEncoder();
  const prefix = encoder.encode(
    `%PDF-1.4\n% VIVIENDA provider parity synthetic-only\n% fixture=${lease.fixtureId}\n% namespace=${lease.namespace}\n`,
  );
  const suffix = encoder.encode("\n%%EOF\n");
  if (prefix.length + suffix.length > byteSize) fail("invalid_input");
  const bytes = new Uint8Array(byteSize);
  bytes.fill(0x20);
  bytes.set(prefix, 0);
  bytes.set(suffix, byteSize - suffix.length);
  return bytes;
}

export class SupabaseProviderCandidateExecutionDriver
  implements SupabaseProviderCandidateProbeExecutionPort
{
  readonly provider = "supabase" as const;
  readonly projectLabel = PROJECT_LABEL;
  readonly syntheticOnly = true as const;
  readonly externalIoOccurred = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly runtimeServerWasUsed = false as const;

  private readonly apiOrigin: string;

  constructor(
    private readonly transports: DriverTransports,
    config: SupabaseProviderCandidateExecutionDriverConfig,
  ) {
    this.apiOrigin = normalizeOrigin(config.evidenceApiOrigin);
    assertTransportIdentity(transports.auth, "supabase_auth");
    assertTransportIdentity(transports.http, "evidence_api");
    assertTransportIdentity(transports.storage, "supabase_storage");
    assertTransportIdentity(transports.state, "supabase_state");
    assertTransportIdentity(transports.observability, "supabase_observability");
    assertTransportIdentity(transports.faults, "parity_fault_control");
    if (transports.faults.parityOnly !== true) fail("invalid_configuration");
  }

  private async bearerHeaders(
    lease: ProviderCandidateFixtureLease,
    actor: SupabaseProviderProbeActor,
  ): Promise<Record<string, string>> {
    if (actor === "anonymous") return {};
    let session: SupabaseProviderCandidateAuthSession;
    try {
      session = await this.transports.auth.issueAccessToken({ lease, actor });
    } catch {
      fail("transport_failure");
    }
    assertAuthSession(session, lease, actor);
    return { authorization: `Bearer ${session.accessToken}` };
  }

  private async post(
    lease: ProviderCandidateFixtureLease,
    actor: SupabaseProviderProbeActor,
    path: string,
    body: unknown,
    extraHeaders: Record<string, string> = {},
  ): Promise<SupabaseProviderCandidateHttpResponse> {
    assertLease(lease);
    if (!path.startsWith(API_PATH_PREFIX)) fail("invalid_input");
    const bearer = await this.bearerHeaders(lease, actor);
    let response: SupabaseProviderCandidateHttpResponse;
    try {
      response = await this.transports.http.send({
        method: "POST",
        url: `${this.apiOrigin}${path}`,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          origin: this.apiOrigin,
          ...bearer,
          ...extraHeaders,
        },
        body,
      });
    } catch {
      fail("transport_failure");
    }
    assertHttpResponse(response);
    return response;
  }

  async seedCase(input: {
    lease: ProviderCandidateFixtureLease;
    authorizeData: boolean;
  }): Promise<SupabaseProviderProbeCaseSeed> {
    assertLease(input.lease);
    let seed: SupabaseProviderProbeCaseSeed;
    try {
      seed = await this.transports.state.seedCase({
        lease: input.lease,
        ownerSubjectRef: input.lease.ownerSubjectRef,
        routeCode: "R7_RECLAMACION",
        caseTrack: "assisted",
        authorizeData: input.authorizeData,
        evidenceRequestCode: "R7_STATEMENT_DIFFERENCE",
      });
    } catch {
      fail("transport_failure");
    }
    return validateSeed(seed, input.lease, input.authorizeData);
  }

  async prepareEvidence(input: {
    lease: ProviderCandidateFixtureLease;
    caseId: string;
    actor: SupabaseProviderProbeActor;
    clientClassification: {
      kind: "statement";
      legalDataCategory: "non_personal";
      securityTier: "open";
    };
    fault: SupabaseProviderProbeFault;
  }): Promise<SupabaseProviderProbeHttpResult<SupabaseProviderPreparedUpload>> {
    assertLease(input.lease);
    assertPrepareScope(input.lease, input.actor, input.fault);
    if (!CASE_ID.test(input.caseId) || !input.caseId.startsWith(`case_${input.lease.namespace}_`)) {
      fail("invalid_input");
    }
    if (
      input.clientClassification.kind !== "statement" ||
      input.clientClassification.legalDataCategory !== "non_personal" ||
      input.clientClassification.securityTier !== "open"
    ) {
      fail("invalid_input");
    }

    let receipt: SupabaseProviderCandidateFaultReceipt | null = null;
    let response: SupabaseProviderCandidateHttpResponse | null = null;
    let requestFailed = false;

    if (input.fault === "rate_limit_unavailable") {
      try {
        receipt = validateFaultReceipt(
          await this.transports.faults.armRateLimitUnavailable({
            lease: input.lease,
            operation: "evidence.prepare",
            oneShot: true,
          }),
          input.lease,
        );
      } catch (error) {
        if (error instanceof SupabaseProviderCandidateExecutionDriverError) throw error;
        fail("transport_failure");
      }
    }

    try {
      response = await this.post(
        input.lease,
        input.actor,
        `${API_PATH_PREFIX}${encodeURIComponent(input.caseId)}/evidence/uploads`,
        input.clientClassification,
      );
    } catch {
      requestFailed = true;
    }

    if (receipt) {
      try {
        await this.transports.faults.disarm({ lease: input.lease, receipt });
      } catch {
        fail("fault_cleanup_failed");
      }
    }

    if (requestFailed || !response) fail("transport_failure");
    if (response.status !== 200) {
      return { status: response.status, body: response.body, data: null };
    }
    return {
      status: response.status,
      body: response.body,
      data: parsePreparedUpload(response, input.lease),
    };
  }

  async uploadSyntheticPdf(input: {
    lease: ProviderCandidateFixtureLease;
    prepared: SupabaseProviderPreparedUpload;
    mimeType: "application/pdf";
    byteSize: 2048;
  }): Promise<void> {
    assertLease(input.lease);
    if (
      input.mimeType !== "application/pdf" ||
      input.byteSize !== 2048 ||
      typeof input.prepared?.intentId !== "string" ||
      !input.prepared.intentId.startsWith(`upl_${input.lease.namespace}_`) ||
      typeof input.prepared.evidenceId !== "string" ||
      typeof input.prepared.objectPath !== "string" ||
      !OBJECT_PATH.test(input.prepared.objectPath) ||
      !input.prepared.objectPath.includes(`/${input.prepared.intentId}/${input.prepared.evidenceId}/`)
    ) {
      fail("invalid_input");
    }
    assertOpaqueToken(input.prepared.uploadCapability);
    let result: { status: number };
    try {
      result = await this.transports.storage.uploadSigned({
        lease: input.lease,
        bucketId: EVIDENCE_BUCKET_ID,
        objectPath: input.prepared.objectPath,
        signedCapability: input.prepared.uploadCapability,
        contentType: "application/pdf",
        bytes: syntheticPdf(input.lease, input.byteSize),
        upsert: false,
      });
    } catch {
      fail("transport_failure");
    }
    if (!result || !validStatus(result.status) || result.status < 200 || result.status >= 300) {
      fail("invalid_transport_response");
    }
  }

  async completeEvidence(input: {
    lease: ProviderCandidateFixtureLease;
    caseId: string;
    intentId: string;
    actor: "owner";
    expectedVersion: number;
    idempotencyKey: string;
  }): Promise<SupabaseProviderProbeHttpResult<unknown>> {
    assertLease(input.lease);
    if (
      input.actor !== "owner" ||
      !CASE_ID.test(input.caseId) ||
      !input.caseId.startsWith(`case_${input.lease.namespace}_`) ||
      !INTENT_ID.test(input.intentId) ||
      !input.intentId.startsWith(`upl_${input.lease.namespace}_`) ||
      !Number.isSafeInteger(input.expectedVersion) ||
      input.expectedVersion < 1 ||
      typeof input.idempotencyKey !== "string" ||
      input.idempotencyKey.trim() === "" ||
      input.idempotencyKey.length > 200 ||
      CONTROL_CHARACTER.test(input.idempotencyKey)
    ) {
      fail("invalid_input");
    }
    const response = await this.post(
      input.lease,
      "owner",
      `${API_PATH_PREFIX}${encodeURIComponent(input.caseId)}/evidence/uploads/${encodeURIComponent(input.intentId)}/complete`,
      { expectedVersion: input.expectedVersion },
      { "idempotency-key": input.idempotencyKey },
    );
    return {
      status: response.status,
      body: response.body,
      data: response.status === 200 ? dataFromBody(response.body) : null,
    };
  }

  async downloadEvidence(input: {
    lease: ProviderCandidateFixtureLease;
    caseId: string;
    evidenceId: string;
    actor: "owner";
    expiresInSeconds: 60;
  }): Promise<SupabaseProviderProbeHttpResult<unknown>> {
    assertLease(input.lease);
    if (
      input.actor !== "owner" ||
      !CASE_ID.test(input.caseId) ||
      !input.caseId.startsWith(`case_${input.lease.namespace}_`) ||
      !EVIDENCE_ID.test(input.evidenceId) ||
      input.expiresInSeconds !== 60
    ) {
      fail("invalid_input");
    }
    const response = await this.post(
      input.lease,
      "owner",
      `${API_PATH_PREFIX}${encodeURIComponent(input.caseId)}/evidence/${encodeURIComponent(input.evidenceId)}/download`,
      { expiresInSeconds: 60 },
    );
    return {
      status: response.status,
      body: response.body,
      data: response.status === 200 ? dataFromBody(response.body) : null,
    };
  }

  async readCase(input: {
    lease: ProviderCandidateFixtureLease;
    caseId: string;
    actor: "owner";
  }): Promise<SupabaseProviderProbeCaseSnapshot> {
    assertLease(input.lease);
    if (
      input.actor !== "owner" ||
      !CASE_ID.test(input.caseId) ||
      !input.caseId.startsWith(`case_${input.lease.namespace}_`)
    ) {
      fail("invalid_input");
    }
    let snapshot: SupabaseProviderProbeCaseSnapshot;
    try {
      snapshot = await this.transports.state.readCase({
        lease: input.lease,
        caseId: input.caseId,
        ownerSubjectRef: input.lease.ownerSubjectRef,
      });
    } catch {
      fail("transport_failure");
    }
    return validateCaseSnapshot(snapshot, input.lease, input.caseId);
  }

  async readIntent(input: {
    lease: ProviderCandidateFixtureLease;
    caseId: string;
    intentId: string;
  }): Promise<SupabaseProviderProbeIntentSnapshot | null> {
    assertLease(input.lease);
    if (
      !CASE_ID.test(input.caseId) ||
      !input.caseId.startsWith(`case_${input.lease.namespace}_`) ||
      !INTENT_ID.test(input.intentId) ||
      !input.intentId.startsWith(`upl_${input.lease.namespace}_`)
    ) {
      fail("invalid_input");
    }
    let intent: SupabaseProviderProbeIntentSnapshot | null;
    try {
      intent = await this.transports.state.readIntent(input);
    } catch {
      fail("transport_failure");
    }
    return validateIntent(intent, input.lease, input.caseId, input.intentId);
  }

  async readTelemetry(input: {
    lease: ProviderCandidateFixtureLease;
  }): Promise<SupabaseProviderProbeTelemetry> {
    assertLease(input.lease);
    let envelope: SupabaseProviderCandidateTelemetryEnvelope;
    try {
      envelope = await this.transports.observability.readTelemetry({ lease: input.lease });
    } catch {
      fail("transport_failure");
    }
    return validateTelemetry(envelope, input.lease);
  }
}

export function supabaseProviderCandidateExecutionDriverProducesNoActivationFacts(): Record<string, never> {
  return {};
}
