import { AsyncLocalStorage } from "node:async_hooks";
import type { UserPrincipal } from "@/domain/storage-coordination/coordinator";
import type { ProviderCandidateFixtureLease } from "./provider-candidate-fixture-lifecycle";
import { ProviderCandidateFixtureSession } from "./provider-candidate-fixture-lifecycle";
import { SupabaseProviderCandidateProbeAdapter } from "./supabase-provider-candidate-probe-adapter";
import type {
  SupabaseProviderCandidateProbeExecutionPort,
  SupabaseProviderPreparedUpload,
  SupabaseProviderProbeActor,
  SupabaseProviderProbeCaseSeed,
  SupabaseProviderProbeCaseSnapshot,
  SupabaseProviderProbeFault,
  SupabaseProviderProbeHttpResult,
  SupabaseProviderProbeIntentSnapshot,
  SupabaseProviderProbeTelemetry,
} from "./supabase-provider-candidate-probe-adapter";
import type {
  SupabaseProviderCandidateAuthSession,
  SupabaseProviderCandidateHttpRequest,
  SupabaseProviderCandidateHttpResponse,
} from "./supabase-provider-candidate-execution-driver";
import type {
  QualifiedDevAuthSessionPort,
  QualifiedDevEvidenceHttpClientPort,
  QualifiedDevProviderCompositionInputs,
} from "./qualified-dev-provider-composition";
import {
  createQualifiedDevCandidateEvidenceApiHost,
  type QualifiedDevCandidateHostInputs,
  type QualifiedDevCandidatePrincipalResolverPort,
  type QualifiedDevCandidateProbeScopePort,
  type QualifiedDevCandidateEvidenceApiHost,
} from "./qualified-dev-candidate-host";

export const QUALIFIED_DEV_DRIVER_HOST_BRIDGE_VERSION =
  "V0.23.29-QUALIFIED-DEV-DRIVER-HOST-BRIDGE-V1" as const;

const DEV_PROJECT_LABEL = "vivienda-dev" as const;
const ALLOWED_HEADERS = new Set([
  "accept",
  "authorization",
  "content-type",
  "idempotency-key",
  "origin",
]);
const TOKEN = /^[A-Za-z0-9_-]{8,40}$/;

export type QualifiedDevDriverHostBridgeErrorCode =
  | "invalid_configuration"
  | "invalid_invocation"
  | "context_unavailable"
  | "bridge_unbound"
  | "invalid_response";

export class QualifiedDevDriverHostBridgeError extends Error {
  constructor(readonly code: QualifiedDevDriverHostBridgeErrorCode) {
    super("Qualified DEV driver-host bridge failed.");
    this.name = "QualifiedDevDriverHostBridgeError";
  }
}

function fail(code: QualifiedDevDriverHostBridgeErrorCode): never {
  throw new QualifiedDevDriverHostBridgeError(code);
}

function tokenFromNamespace(namespace: string): string | null {
  const prefix = "vivienda_dev_";
  if (!namespace.startsWith(prefix)) return null;
  const token = namespace.slice(prefix.length);
  return TOKEN.test(token) ? token : null;
}

function validLease(lease: ProviderCandidateFixtureLease): boolean {
  const token = tokenFromNamespace(lease.namespace);
  return Boolean(
    token &&
      lease.fixtureId === `fx_${token}` &&
      lease.ownerSubjectRef === `sub_synthetic_${token}_owner` &&
      lease.intruderSubjectRef === `sub_synthetic_${token}_intruder` &&
      lease.ownerSubjectRef !== lease.intruderSubjectRef &&
      lease.syntheticOnly === true &&
      lease.disposable === true,
  );
}

function assertLease(lease: ProviderCandidateFixtureLease): void {
  if (!lease || !validLease(lease)) fail("invalid_invocation");
}

function sameLease(left: ProviderCandidateFixtureLease, right: ProviderCandidateFixtureLease): boolean {
  return (
    left.contractVersion === right.contractVersion &&
    left.scope === right.scope &&
    left.fixtureId === right.fixtureId &&
    left.namespace === right.namespace &&
    left.ownerSubjectRef === right.ownerSubjectRef &&
    left.intruderSubjectRef === right.intruderSubjectRef &&
    left.issuedAt === right.issuedAt &&
    left.expiresAt === right.expiresAt &&
    left.syntheticOnly === right.syntheticOnly &&
    left.disposable === right.disposable
  );
}

function cloneLease(lease: ProviderCandidateFixtureLease): ProviderCandidateFixtureLease {
  return { ...lease };
}

export interface QualifiedDevDriverHostSessionAuthorityPort {
  readonly channel: "candidate_session_authority";
  readonly projectLabel: typeof DEV_PROJECT_LABEL;
  readonly syntheticOnly: true;
  readonly liveRuntimeAuthorized: false;
  readonly publicFixtureSelectorsAccepted: false;

  issueSession(input: {
    lease: ProviderCandidateFixtureLease;
    actor: "owner" | "intruder";
    expectedSubjectRef: string;
  }): Promise<SupabaseProviderCandidateAuthSession>;

  resolvePrincipal(input: {
    request: Request;
    lease: ProviderCandidateFixtureLease;
  }): Promise<UserPrincipal | null>;
}

function assertSessionAuthority(authority: QualifiedDevDriverHostSessionAuthorityPort): void {
  if (
    authority.channel !== "candidate_session_authority" ||
    authority.projectLabel !== DEV_PROJECT_LABEL ||
    authority.syntheticOnly !== true ||
    authority.liveRuntimeAuthorized !== false ||
    authority.publicFixtureSelectorsAccepted !== false
  ) {
    fail("invalid_configuration");
  }
}

/**
 * Concurrency-safe candidate fixture context.
 * Exact same-lease nesting is permitted because the driver wrapper invokes the host inside the
 * same logical probe operation. Cross-fixture nesting is rejected fail-closed.
 */
export class QualifiedDevDriverHostBridgeScope implements QualifiedDevCandidateProbeScopePort {
  readonly scopeChannel = "server_probe_scope" as const;
  readonly channel = "server_probe_context" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly publicRequestDerived = false as const;

  private readonly storage = new AsyncLocalStorage<ProviderCandidateFixtureLease>();

  async run<T>(lease: ProviderCandidateFixtureLease, task: () => Promise<T>): Promise<T> {
    assertLease(lease);
    const active = this.storage.getStore();
    if (active) {
      if (!sameLease(active, lease)) fail("invalid_invocation");
      return task();
    }
    return this.storage.run(cloneLease(lease), task);
  }

  currentLease(): ProviderCandidateFixtureLease | null {
    const lease = this.storage.getStore();
    return lease ? cloneLease(lease) : null;
  }

  resolveForStorage(): ProviderCandidateFixtureLease | null {
    return this.currentLease();
  }

  resolveForAudit(): ProviderCandidateFixtureLease | null {
    return this.currentLease();
  }

  resolveForRateLimit(): ProviderCandidateFixtureLease | null {
    return this.currentLease();
  }
}

class BridgeAuthSessions implements QualifiedDevAuthSessionPort {
  constructor(private readonly authority: QualifiedDevDriverHostSessionAuthorityPort) {}

  issueSession(input: {
    lease: ProviderCandidateFixtureLease;
    actor: "owner" | "intruder";
    expectedSubjectRef: string;
  }): Promise<SupabaseProviderCandidateAuthSession> {
    assertLease(input.lease);
    const expected =
      input.actor === "owner" ? input.lease.ownerSubjectRef : input.lease.intruderSubjectRef;
    if (input.expectedSubjectRef !== expected) fail("invalid_invocation");
    return this.authority.issueSession(input);
  }
}

class BridgePrincipalResolver implements QualifiedDevCandidatePrincipalResolverPort {
  readonly channel = "candidate_principal_resolver" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly syntheticOnly = true as const;
  readonly publicFixtureSelectorsAccepted = false as const;

  constructor(private readonly authority: QualifiedDevDriverHostSessionAuthorityPort) {}

  resolve(input: {
    request: Request;
    lease: ProviderCandidateFixtureLease;
  }): Promise<UserPrincipal | null> {
    assertLease(input.lease);
    return this.authority.resolvePrincipal(input);
  }
}

function assertRequestHeaders(headers: Record<string, string>): void {
  for (const [key, value] of Object.entries(headers)) {
    const normalized = key.toLowerCase();
    if (!ALLOWED_HEADERS.has(normalized) || typeof value !== "string") fail("invalid_invocation");
  }
}

function responseHeaders(response: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

class LateBoundHostHttpClient implements QualifiedDevEvidenceHttpClientPort {
  private host: QualifiedDevCandidateEvidenceApiHost | null = null;

  constructor(private readonly scope: QualifiedDevDriverHostBridgeScope) {}

  bind(host: QualifiedDevCandidateEvidenceApiHost): void {
    if (this.host) fail("invalid_configuration");
    this.host = host;
  }

  async send(
    request: SupabaseProviderCandidateHttpRequest,
  ): Promise<SupabaseProviderCandidateHttpResponse> {
    if (!this.host) fail("bridge_unbound");
    const lease = this.scope.currentLease();
    if (!lease) fail("context_unavailable");
    assertRequestHeaders(request.headers);

    let body: string;
    try {
      body = JSON.stringify(request.body);
    } catch {
      fail("invalid_invocation");
    }
    if (typeof body !== "string") fail("invalid_invocation");

    const nativeRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body,
    });

    const response = await this.host.handle(nativeRequest, {
      source: "server_probe_harness",
      publicRequestDerived: false,
      lease,
    });

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text === "" ? null : JSON.parse(text);
    } catch {
      fail("invalid_response");
    }

    return {
      status: response.status,
      body: parsed,
      headers: responseHeaders(response),
    };
  }
}

/**
 * Wraps the frozen V0.23.25 driver so every operation that already receives a lease executes
 * inside the out-of-band bridge scope. No frozen driver interface is modified.
 */
export class QualifiedDevScopedExecutionPort implements SupabaseProviderCandidateProbeExecutionPort {
  readonly provider = "supabase" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly syntheticOnly = true as const;
  readonly externalIoOccurred = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly runtimeServerWasUsed = false as const;

  constructor(
    private readonly inner: SupabaseProviderCandidateProbeExecutionPort,
    private readonly scope: QualifiedDevDriverHostBridgeScope,
  ) {
    if (
      inner.provider !== "supabase" ||
      inner.projectLabel !== DEV_PROJECT_LABEL ||
      inner.syntheticOnly !== true ||
      inner.externalIoOccurred !== true ||
      inner.liveRuntimeAuthorized !== false ||
      inner.runtimeServerWasUsed !== false
    ) {
      fail("invalid_configuration");
    }
  }

  seedCase(input: {
    lease: ProviderCandidateFixtureLease;
    authorizeData: boolean;
  }): Promise<SupabaseProviderProbeCaseSeed> {
    return this.scope.run(input.lease, () => this.inner.seedCase(input));
  }

  prepareEvidence(input: {
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
    return this.scope.run(input.lease, () => this.inner.prepareEvidence(input));
  }

  uploadSyntheticPdf(input: {
    lease: ProviderCandidateFixtureLease;
    prepared: SupabaseProviderPreparedUpload;
    mimeType: "application/pdf";
    byteSize: 2048;
  }): Promise<void> {
    return this.scope.run(input.lease, () => this.inner.uploadSyntheticPdf(input));
  }

  completeEvidence(input: {
    lease: ProviderCandidateFixtureLease;
    caseId: string;
    intentId: string;
    actor: "owner";
    expectedVersion: number;
    idempotencyKey: string;
  }): Promise<SupabaseProviderProbeHttpResult<unknown>> {
    return this.scope.run(input.lease, () => this.inner.completeEvidence(input));
  }

  downloadEvidence(input: {
    lease: ProviderCandidateFixtureLease;
    caseId: string;
    evidenceId: string;
    actor: "owner";
    expiresInSeconds: 60;
  }): Promise<SupabaseProviderProbeHttpResult<unknown>> {
    return this.scope.run(input.lease, () => this.inner.downloadEvidence(input));
  }

  readCase(input: {
    lease: ProviderCandidateFixtureLease;
    caseId: string;
    actor: "owner";
  }): Promise<SupabaseProviderProbeCaseSnapshot> {
    return this.scope.run(input.lease, () => this.inner.readCase(input));
  }

  readIntent(input: {
    lease: ProviderCandidateFixtureLease;
    caseId: string;
    intentId: string;
  }): Promise<SupabaseProviderProbeIntentSnapshot | null> {
    return this.scope.run(input.lease, () => this.inner.readIntent(input));
  }

  readTelemetry(input: {
    lease: ProviderCandidateFixtureLease;
  }): Promise<SupabaseProviderProbeTelemetry> {
    return this.scope.run(input.lease, () => this.inner.readTelemetry(input));
  }
}

export type QualifiedDevDriverHostBridgeInputs = {
  provider: Omit<QualifiedDevProviderCompositionInputs, "server" | "authSessions" | "httpClient">;
  server: Omit<QualifiedDevCandidateHostInputs["server"], "probeScope" | "principalResolver">;
  sessionAuthority: QualifiedDevDriverHostSessionAuthorityPort;
  tokenSource?: () => string;
};

export type QualifiedDevDriverHostBridge = {
  readonly version: typeof QUALIFIED_DEV_DRIVER_HOST_BRIDGE_VERSION;
  readonly provider: "supabase";
  readonly projectLabel: typeof DEV_PROJECT_LABEL;
  readonly syntheticOnly: true;
  readonly externalIoOccurred: true;
  readonly liveRuntimeAuthorized: false;
  readonly runtimeServerWasUsed: false;
  readonly host: QualifiedDevCandidateEvidenceApiHost;
  readonly scope: QualifiedDevDriverHostBridgeScope;
  readonly execution: QualifiedDevScopedExecutionPort;
  readonly probe: SupabaseProviderCandidateProbeAdapter;
};

export function createQualifiedDevDriverHostBridge(
  input: QualifiedDevDriverHostBridgeInputs,
): QualifiedDevDriverHostBridge {
  assertSessionAuthority(input.sessionAuthority);

  const scope = new QualifiedDevDriverHostBridgeScope();
  const authSessions = new BridgeAuthSessions(input.sessionAuthority);
  const principalResolver = new BridgePrincipalResolver(input.sessionAuthority);
  const httpClient = new LateBoundHostHttpClient(scope);

  const host = createQualifiedDevCandidateEvidenceApiHost({
    provider: {
      ...input.provider,
      authSessions,
      httpClient,
    },
    server: {
      ...input.server,
      probeScope: scope,
      principalResolver,
    },
    tokenSource: input.tokenSource,
  });
  httpClient.bind(host);

  const execution = new QualifiedDevScopedExecutionPort(host.composition.execution, scope);
  const session = new ProviderCandidateFixtureSession(
    input.provider.qualification,
    host.composition.fixtureLifecycle,
    input.provider.fixture?.now,
  );
  const probe = new SupabaseProviderCandidateProbeAdapter(session, execution);

  return {
    version: QUALIFIED_DEV_DRIVER_HOST_BRIDGE_VERSION,
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    syntheticOnly: true,
    externalIoOccurred: true,
    liveRuntimeAuthorized: false,
    runtimeServerWasUsed: false,
    host,
    scope,
    execution,
    probe,
  };
}

export function qualifiedDevDriverHostBridgeProducesNoActivationFacts(): Record<string, never> {
  return {};
}
