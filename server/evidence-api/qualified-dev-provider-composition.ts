import type { CasePersistencePort } from "@/domain/persistence-boundary/contracts";
import type {
  EvidenceStorageGateway,
  ObjectInspection,
  SignedDownloadProviderGrant,
  SignedUploadProviderGrant,
} from "@/domain/storage-coordination/coordinator";
import type {
  ApiAuditLogPort,
  ApiRateLimitDecision,
  ApiRateLimitPort,
  EvidenceApiOperation,
} from "./http-boundary";
import type { DevEnvironmentQualificationDecision } from "./dev-provisioning-qualification";
import {
  ProviderCandidateFixtureSession,
  type ProviderCandidateFixtureLease,
} from "./provider-candidate-fixture-lifecycle";
import {
  SupabaseProviderCandidateFixtureLifecycle,
  type SupabaseProviderFixtureAdminPort,
} from "./supabase-provider-fixture-adapter";
import { SupabaseDevProbeAwareFixtureAdmin } from "./supabase-dev-probe-aware-fixture-admin";
import {
  SupabaseDevProbeObservabilityTransport,
  SupabaseDevProbeParityFaultTransport,
  SupabaseDevProbeRateLimitFaultConsumer,
  SupabaseDevProbeStateTransport,
  SupabaseDevProbeSupportRpc,
  SupabaseDevProbeTelemetryRecorder,
  type SupabaseDevProbeRpcClient,
} from "./supabase-dev-probe-support-plane";
import {
  SupabaseProviderCandidateExecutionDriver,
  type SupabaseProviderCandidateAuthSession,
  type SupabaseProviderCandidateAuthTransport,
  type SupabaseProviderCandidateHttpRequest,
  type SupabaseProviderCandidateHttpResponse,
  type SupabaseProviderCandidateHttpTransport,
  type SupabaseProviderCandidateStorageTransport,
} from "./supabase-provider-candidate-execution-driver";
import { SupabaseProviderCandidateProbeAdapter } from "./supabase-provider-candidate-probe-adapter";

export const QUALIFIED_DEV_PROVIDER_COMPOSITION_VERSION =
  "V0.23.27-QUALIFIED-DEV-PROVIDER-COMPOSITION-V1" as const;

const DEV_PROJECT_LABEL = "vivienda-dev" as const;
const QUALIFICATION_REQUIREMENT_COUNT = 14;
const EVIDENCE_BUCKET_ID = "vivienda-evidence" as const;
const API_PATH = /^\/api\/v1\/cases\/case_[A-Za-z0-9_-]{3,}\/evidence\/(?:uploads(?:\/upl_[A-Za-z0-9_-]{3,}\/complete)?|evd_[A-Za-z0-9_-]{3,}\/download)$/;
const OBJECT_PATH = /^quarantine\/upl_vivienda_dev_[A-Za-z0-9_-]{8,40}_[A-Za-z0-9_-]{3,}\/evd_[A-Za-z0-9_-]{3,}\/obj_[A-Za-z0-9_-]{6,}$/;
const TOKEN = /^[A-Za-z0-9_-]{8,40}$/;
const PROBE_SCOPES = new Set<ProviderCandidateFixtureLease["scope"]>([
  "happy_path",
  "unauthenticated_prepare",
  "cross_case_access",
  "missing_data_authorization",
  "missing_uploaded_object",
  "rate_limit_unavailable",
]);

export type QualifiedDevProviderCompositionErrorCode =
  | "invalid_configuration"
  | "dev_environment_unqualified"
  | "invalid_input"
  | "context_unavailable"
  | "instrumentation_failure";

export class QualifiedDevProviderCompositionError extends Error {
  constructor(readonly code: QualifiedDevProviderCompositionErrorCode) {
    super("Qualified DEV provider composition failed.");
    this.name = "QualifiedDevProviderCompositionError";
  }
}

function fail(code: QualifiedDevProviderCompositionErrorCode): never {
  throw new QualifiedDevProviderCompositionError(code);
}

function assertQualifiedDev(qualification: DevEnvironmentQualificationDecision): void {
  const requirementsValid =
    Array.isArray(qualification.requirements) &&
    qualification.requirements.length === QUALIFICATION_REQUIREMENT_COUNT &&
    qualification.requirements.every((requirement) => requirement.status === "verified");

  if (
    qualification.state !== "qualified_for_staging_candidate" ||
    qualification.devEnvironmentVerified !== true ||
    qualification.liveRuntimeAuthorized !== false ||
    qualification.totalRequirementCount !== QUALIFICATION_REQUIREMENT_COUNT ||
    qualification.verifiedRequirementCount !== QUALIFICATION_REQUIREMENT_COUNT ||
    qualification.blockers.length !== 0 ||
    !requirementsValid
  ) {
    fail("dev_environment_unqualified");
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

function tokenFromNamespace(namespace: string): string | null {
  const prefix = "vivienda_dev_";
  if (!namespace.startsWith(prefix)) return null;
  const token = namespace.slice(prefix.length);
  return TOKEN.test(token) ? token : null;
}

function assertLease(lease: ProviderCandidateFixtureLease): void {
  const token = tokenFromNamespace(lease.namespace);
  if (
    !token ||
    lease.fixtureId !== `fx_${token}` ||
    lease.ownerSubjectRef !== `sub_synthetic_${token}_owner` ||
    lease.intruderSubjectRef !== `sub_synthetic_${token}_intruder` ||
    lease.ownerSubjectRef === lease.intruderSubjectRef ||
    lease.syntheticOnly !== true ||
    lease.disposable !== true ||
    !PROBE_SCOPES.has(lease.scope)
  ) {
    fail("invalid_input");
  }
}

function assertObjectPath(path: string): void {
  if (!OBJECT_PATH.test(path)) fail("invalid_input");
}

export interface QualifiedDevAuthSessionPort {
  issueSession(input: {
    lease: ProviderCandidateFixtureLease;
    actor: "owner" | "intruder";
    expectedSubjectRef: string;
  }): Promise<SupabaseProviderCandidateAuthSession>;
}

export interface QualifiedDevEvidenceHttpClientPort {
  send(request: SupabaseProviderCandidateHttpRequest): Promise<SupabaseProviderCandidateHttpResponse>;
}

export interface QualifiedDevSignedUploadPort {
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

/**
 * Trusted server-only resolver for instrumentation. It must derive fixture context from an
 * out-of-band DEV control plane, never from public request fields supplied by the browser.
 */
export interface QualifiedDevProbeServerContextPort {
  resolveForStorage(input: {
    kind: "upload_grant" | "inspection";
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
  }): Promise<ProviderCandidateFixtureLease | null> | ProviderCandidateFixtureLease | null;

  resolveForAudit(input: {
    requestId: string;
    operation: EvidenceApiOperation;
  }): Promise<ProviderCandidateFixtureLease | null> | ProviderCandidateFixtureLease | null;

  resolveForRateLimit(input: {
    operation: EvidenceApiOperation;
    key: string;
  }): Promise<ProviderCandidateFixtureLease | null> | ProviderCandidateFixtureLease | null;
}

export class QualifiedDevAuthTransport implements SupabaseProviderCandidateAuthTransport {
  readonly channel = "supabase_auth" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;

  constructor(private readonly sessions: QualifiedDevAuthSessionPort) {}

  issueAccessToken(input: {
    lease: ProviderCandidateFixtureLease;
    actor: "owner" | "intruder";
  }): Promise<SupabaseProviderCandidateAuthSession> {
    assertLease(input.lease);
    const expectedSubjectRef =
      input.actor === "owner" ? input.lease.ownerSubjectRef : input.lease.intruderSubjectRef;
    return this.sessions.issueSession({ ...input, expectedSubjectRef });
  }
}

export class QualifiedDevHttpTransport implements SupabaseProviderCandidateHttpTransport {
  readonly channel = "evidence_api" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;
  private readonly origin: string;

  constructor(
    private readonly client: QualifiedDevEvidenceHttpClientPort,
    evidenceApiOrigin: string,
  ) {
    this.origin = normalizeOrigin(evidenceApiOrigin);
  }

  send(request: SupabaseProviderCandidateHttpRequest): Promise<SupabaseProviderCandidateHttpResponse> {
    let parsed: URL;
    try {
      parsed = new URL(request.url);
    } catch {
      fail("invalid_input");
    }
    if (
      request.method !== "POST" ||
      parsed.origin !== this.origin ||
      parsed.search !== "" ||
      parsed.hash !== "" ||
      !API_PATH.test(parsed.pathname) ||
      request.headers.origin !== this.origin ||
      request.headers.accept !== "application/json" ||
      request.headers["content-type"] !== "application/json"
    ) {
      fail("invalid_input");
    }
    return this.client.send(request);
  }
}

export class QualifiedDevStorageTransport implements SupabaseProviderCandidateStorageTransport {
  readonly channel = "supabase_storage" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;

  constructor(private readonly uploads: QualifiedDevSignedUploadPort) {}

  uploadSigned(input: {
    lease: ProviderCandidateFixtureLease;
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
    signedCapability: string;
    contentType: "application/pdf";
    bytes: Uint8Array;
    upsert: false;
  }): Promise<{ status: number }> {
    assertLease(input.lease);
    assertObjectPath(input.objectPath);
    if (
      input.bucketId !== EVIDENCE_BUCKET_ID ||
      input.contentType !== "application/pdf" ||
      input.upsert !== false ||
      !(input.bytes instanceof Uint8Array) ||
      input.bytes.byteLength !== 2048 ||
      typeof input.signedCapability !== "string" ||
      input.signedCapability.length < 8
    ) {
      fail("invalid_input");
    }
    return this.uploads.uploadSigned(input);
  }
}

async function requireContext(
  value: Promise<ProviderCandidateFixtureLease | null> | ProviderCandidateFixtureLease | null,
): Promise<ProviderCandidateFixtureLease> {
  let lease: ProviderCandidateFixtureLease | null;
  try {
    lease = await value;
  } catch {
    fail("context_unavailable");
  }
  if (!lease) fail("context_unavailable");
  assertLease(lease);
  return lease;
}

/** DEV-only Storage wrapper. It observes real gateway calls; it does not manufacture parity booleans. */
export class QualifiedDevInstrumentedStorageGateway implements EvidenceStorageGateway {
  constructor(
    private readonly delegate: EvidenceStorageGateway,
    private readonly context: QualifiedDevProbeServerContextPort,
    private readonly telemetry: SupabaseDevProbeTelemetryRecorder,
  ) {}

  async createSignedUploadGrant(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
    upsert: false;
  }): Promise<SignedUploadProviderGrant> {
    assertObjectPath(input.objectPath);
    const result = await this.delegate.createSignedUploadGrant(input);
    const lease = await requireContext(
      this.context.resolveForStorage({
        kind: "upload_grant",
        bucketId: input.bucketId,
        objectPath: input.objectPath,
      }),
    );
    try {
      await this.telemetry.recordStorageUploadGrant(lease);
    } catch {
      fail("instrumentation_failure");
    }
    return result;
  }

  async inspectAndHashObject(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
  }): Promise<ObjectInspection | null> {
    assertObjectPath(input.objectPath);
    const result = await this.delegate.inspectAndHashObject(input);
    const lease = await requireContext(
      this.context.resolveForStorage({
        kind: "inspection",
        bucketId: input.bucketId,
        objectPath: input.objectPath,
      }),
    );
    try {
      await this.telemetry.recordStorageInspection(lease);
    } catch {
      fail("instrumentation_failure");
    }
    return result;
  }

  createSignedDownloadGrant(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
    expiresInSeconds: number;
  }): Promise<SignedDownloadProviderGrant> {
    assertObjectPath(input.objectPath);
    return this.delegate.createSignedDownloadGrant(input);
  }

  deleteObject(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
  }): Promise<"deleted" | "not_found"> {
    assertObjectPath(input.objectPath);
    return this.delegate.deleteObject(input);
  }
}

/** DEV-only audit wrapper. Support telemetry is recorded only after the real audit delegate succeeds. */
export class QualifiedDevInstrumentedAuditLogPort implements ApiAuditLogPort {
  constructor(
    private readonly delegate: ApiAuditLogPort,
    private readonly context: QualifiedDevProbeServerContextPort,
    private readonly telemetry: SupabaseDevProbeTelemetryRecorder,
  ) {}

  async record(event: {
    requestId: string;
    operation: EvidenceApiOperation;
    status: number;
    errorCode?: string;
  }): Promise<void> {
    await this.delegate.record(event);
    const lease = await requireContext(
      this.context.resolveForAudit({ requestId: event.requestId, operation: event.operation }),
    );
    try {
      await this.telemetry.recordAudit(lease, {
        operation: event.operation,
        status: event.status,
        ...(event.errorCode ? { errorCode: event.errorCode } : {}),
      });
    } catch {
      fail("instrumentation_failure");
    }
  }
}

/**
 * DEV-only rate-limit wrapper. The one-shot fault is consumed out-of-band and is never represented
 * in public HTTP headers/body. Any non-target operation delegates to the real limiter unchanged.
 */
export class QualifiedDevInstrumentedRateLimitPort implements ApiRateLimitPort {
  constructor(
    private readonly delegate: ApiRateLimitPort,
    private readonly context: QualifiedDevProbeServerContextPort,
    private readonly faults: SupabaseDevProbeRateLimitFaultConsumer,
  ) {}

  async consume(input: {
    operation: EvidenceApiOperation;
    key: string;
  }): Promise<ApiRateLimitDecision> {
    const lease = await requireContext(this.context.resolveForRateLimit(input));
    if (lease.scope === "rate_limit_unavailable" && input.operation === "evidence.prepare") {
      let consumed: boolean;
      try {
        consumed = await this.faults.consumePrepareUnavailable(lease);
      } catch {
        fail("instrumentation_failure");
      }
      if (consumed) return { kind: "unavailable" };
    }
    return this.delegate.consume(input);
  }
}

export type QualifiedDevProviderCompositionInputs = {
  qualification: DevEnvironmentQualificationDecision;
  configuration: {
    projectLabel: string;
    evidenceApiOrigin: string;
  };
  fixtureAdmin: SupabaseProviderFixtureAdminPort;
  casePersistence: CasePersistencePort;
  supportRpcClient: SupabaseDevProbeRpcClient;
  authSessions: QualifiedDevAuthSessionPort;
  httpClient: QualifiedDevEvidenceHttpClientPort;
  signedUploads: QualifiedDevSignedUploadPort;
  server: {
    storageGateway: EvidenceStorageGateway;
    auditLog: ApiAuditLogPort;
    rateLimit: ApiRateLimitPort;
    context: QualifiedDevProbeServerContextPort;
  };
  fixture?: {
    now?: () => string;
    tokenSource?: () => string;
    ttlMs?: number;
  };
};

export type QualifiedDevProviderComposition = {
  readonly version: typeof QUALIFIED_DEV_PROVIDER_COMPOSITION_VERSION;
  readonly provider: "supabase";
  readonly projectLabel: typeof DEV_PROJECT_LABEL;
  readonly syntheticOnly: true;
  readonly externalIoOccurred: true;
  readonly liveRuntimeAuthorized: false;
  readonly runtimeServerWasUsed: false;
  readonly fixtureLifecycle: SupabaseProviderCandidateFixtureLifecycle;
  readonly execution: SupabaseProviderCandidateExecutionDriver;
  readonly probe: SupabaseProviderCandidateProbeAdapter;
  readonly server: {
    storageGateway: QualifiedDevInstrumentedStorageGateway;
    auditLog: QualifiedDevInstrumentedAuditLogPort;
    rateLimit: QualifiedDevInstrumentedRateLimitPort;
  };
};

export function createQualifiedDevProviderComposition(
  input: QualifiedDevProviderCompositionInputs,
): QualifiedDevProviderComposition {
  if (input.configuration.projectLabel !== DEV_PROJECT_LABEL) fail("invalid_configuration");
  assertQualifiedDev(input.qualification);
  const evidenceApiOrigin = normalizeOrigin(input.configuration.evidenceApiOrigin);

  const support = new SupabaseDevProbeSupportRpc(input.supportRpcClient, {
    projectLabel: DEV_PROJECT_LABEL,
  });
  const telemetry = new SupabaseDevProbeTelemetryRecorder(support);
  const faultConsumer = new SupabaseDevProbeRateLimitFaultConsumer(support);

  const probeAwareAdmin = new SupabaseDevProbeAwareFixtureAdmin(
    input.fixtureAdmin,
    input.supportRpcClient,
    { projectLabel: DEV_PROJECT_LABEL },
  );
  const fixtureLifecycle = new SupabaseProviderCandidateFixtureLifecycle(
    probeAwareAdmin,
    input.fixture,
  );
  const session = new ProviderCandidateFixtureSession(
    input.qualification,
    fixtureLifecycle,
    input.fixture?.now,
  );

  const auth = new QualifiedDevAuthTransport(input.authSessions);
  const http = new QualifiedDevHttpTransport(input.httpClient, evidenceApiOrigin);
  const storage = new QualifiedDevStorageTransport(input.signedUploads);
  const state = new SupabaseDevProbeStateTransport(input.casePersistence);
  const observability = new SupabaseDevProbeObservabilityTransport(support);
  const faults = new SupabaseDevProbeParityFaultTransport(support);

  const execution = new SupabaseProviderCandidateExecutionDriver(
    { auth, http, storage, state, observability, faults },
    { evidenceApiOrigin },
  );
  const probe = new SupabaseProviderCandidateProbeAdapter(session, execution);

  return {
    version: QUALIFIED_DEV_PROVIDER_COMPOSITION_VERSION,
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    syntheticOnly: true,
    externalIoOccurred: true,
    liveRuntimeAuthorized: false,
    runtimeServerWasUsed: false,
    fixtureLifecycle,
    execution,
    probe,
    server: {
      storageGateway: new QualifiedDevInstrumentedStorageGateway(
        input.server.storageGateway,
        input.server.context,
        telemetry,
      ),
      auditLog: new QualifiedDevInstrumentedAuditLogPort(
        input.server.auditLog,
        input.server.context,
        telemetry,
      ),
      rateLimit: new QualifiedDevInstrumentedRateLimitPort(
        input.server.rateLimit,
        input.server.context,
        faultConsumer,
      ),
    },
  };
}

export function qualifiedDevProviderCompositionProducesNoActivationFacts(): Record<string, never> {
  return {};
}
