import {
  PROVIDER_CANDIDATE_MAX_FIXTURE_TTL_MS,
  type ProviderCandidateFixtureLease,
} from "./provider-candidate-fixture-lifecycle";
import type {
  ProviderClientFactoryPreflightDecision,
  ProviderSyntheticSessionBootstrapPlan,
} from "./provider-client-factory-preflight";

export const SYNTHETIC_SESSION_BOOTSTRAP_EXECUTOR_VERSION =
  "V0.23.34-SYNTHETIC-SESSION-BOOTSTRAP-EXECUTOR-V1" as const;

const DEV_PROJECT_LABEL = "vivienda-dev" as const;
const FIXTURE_ID = /^fx_[A-Za-z0-9_-]{6,}$/;
const FIXTURE_NAMESPACE = /^vivienda_dev_[A-Za-z0-9_-]{6,}$/;
const SUBJECT_REF = /^sub_synthetic_[A-Za-z0-9_-]{6,}$/;
const OPAQUE = /^[A-Za-z0-9_.:-]{8,160}$/;
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;
const ACCESS_TOKEN_MAX = 16 * 1024;
const CLOCK_SKEW_MS = 60 * 1000;

export type SyntheticSessionActor = "owner" | "intruder";

export type SyntheticSessionIssueObservation = {
  source: "injected_transport_observation";
  actor: SyntheticSessionActor;
  fixtureId: string;
  namespace: string;
  subjectRef: string;
  syntheticEmail: string;
  accessToken: string;
  expiresAt: string;
  requestId: string;
  nonce: string;
};

export type SyntheticSessionResolveObservation = {
  source: "injected_transport_observation";
  actor: SyntheticSessionActor;
  fixtureId: string;
  namespace: string;
  subjectRef: string;
  syntheticEmail: string;
  requestId: string;
  nonce: string;
};

export type SyntheticSessionTransportError = {
  code?: string;
  status?: number;
  message?: string;
};

export interface SyntheticSessionBootstrapTransport {
  readonly channel: "synthetic_session_bootstrap_transport";
  readonly provider: "supabase";
  readonly projectLabel: typeof DEV_PROJECT_LABEL;
  readonly syntheticOnly: true;
  readonly liveRuntimeAuthorized: false;
  readonly liveProviderSessionProven: false;

  issue(input: {
    projectBindingId: string;
    actor: SyntheticSessionActor;
    fixtureId: string;
    namespace: string;
    subjectRef: string;
    syntheticEmail: string;
    requestId: string;
    nonce: string;
    requestedAt: string;
  }): Promise<
    | { data: SyntheticSessionIssueObservation; error: null }
    | { data: null; error: SyntheticSessionTransportError }
  >;

  resolve(input: {
    projectBindingId: string;
    actor: SyntheticSessionActor;
    fixtureId: string;
    namespace: string;
    accessToken: string;
    requestId: string;
    nonce: string;
    requestedAt: string;
  }): Promise<
    | { data: SyntheticSessionResolveObservation; error: null }
    | { data: null; error: SyntheticSessionTransportError }
  >;
}

export type SyntheticSessionBootstrapExecutorErrorCode =
  | "preflight_not_ready"
  | "invalid_plan"
  | "invalid_transport"
  | "invalid_fixture"
  | "invalid_clock"
  | "invalid_token_source"
  | "transport_unavailable"
  | "invalid_transport_response"
  | "session_identity_mismatch"
  | "session_expiry_invalid"
  | "session_separation_failed";

export class SyntheticSessionBootstrapExecutorError extends Error {
  constructor(readonly code: SyntheticSessionBootstrapExecutorErrorCode) {
    super("Synthetic session bootstrap failed.");
    this.name = "SyntheticSessionBootstrapExecutorError";
  }
}

export type SyntheticSessionCapability = {
  actor: SyntheticSessionActor;
  subjectRef: string;
  syntheticEmail: string;
  accessToken: string;
  expiresAt: string;
  serverOnly: true;
};

export type SyntheticSessionBootstrapContractResult = {
  version: typeof SYNTHETIC_SESSION_BOOTSTRAP_EXECUTOR_VERSION;
  state: "session_bootstrap_contract_satisfied";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  fixtureId: string;
  namespace: string;
  owner: SyntheticSessionCapability;
  intruder: SyntheticSessionCapability;
  sessionBootstrapContractSatisfied: true;
  injectedTransportInvoked: true;
  liveProviderSessionProven: false;
  sessionBootstrapProven: false;
  remoteIdentityVerified: false;
  clientMaterializationAuthorized: false;
  providerParityProven: false;
  runtimeActivationAuthorized: false;
  deploymentAuthorized: false;
};

export type SyntheticSessionBootstrapExecutorInputs = {
  preflight: ProviderClientFactoryPreflightDecision;
  transport: SyntheticSessionBootstrapTransport;
  now: () => string;
  tokenSource: (
    kind: "issue_request" | "issue_nonce" | "resolve_request" | "resolve_nonce",
    actor: SyntheticSessionActor,
  ) => string;
};

function fail(code: SyntheticSessionBootstrapExecutorErrorCode): never {
  throw new SyntheticSessionBootstrapExecutorError(code);
}

function parseIso(value: string): number | null {
  if (typeof value !== "string" || CONTROL_CHARACTER.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function assertOpaque(value: string): void {
  if (typeof value !== "string" || !OPAQUE.test(value) || CONTROL_CHARACTER.test(value)) {
    fail("invalid_token_source");
  }
}

function assertAccessToken(value: string): void {
  if (
    typeof value !== "string" ||
    value.length < 16 ||
    value.length > ACCESS_TOKEN_MAX ||
    CONTROL_CHARACTER.test(value) ||
    /\s/.test(value)
  ) {
    fail("invalid_transport_response");
  }
}

function expectedEmail(namespace: string, actor: SyntheticSessionActor): string {
  return `fixture+${namespace}.${actor}@vivienda.invalid`;
}

function planValid(plan: ProviderSyntheticSessionBootstrapPlan): boolean {
  return (
    plan.channel === "synthetic_session_bootstrap" &&
    plan.provider === "supabase" &&
    plan.projectLabel === DEV_PROJECT_LABEL &&
    OPAQUE.test(plan.projectBindingId) &&
    plan.strategy === "provider_supported_one_time_exchange" &&
    plan.ownerAndIntruderRequired === true &&
    plan.deterministicFixtureEmailRequired === true &&
    plan.passwordGrantAssumed === false &&
    plan.locallyMintedJwtAllowed === false &&
    plan.providerIoRequired === true &&
    plan.performed === false &&
    plan.proven === false
  );
}

function assertPreflight(input: ProviderClientFactoryPreflightDecision): ProviderSyntheticSessionBootstrapPlan {
  if (
    input.version !== "V0.23.32-PROVIDER-CLIENT-FACTORY-PREFLIGHT-V1" ||
    input.state !== "structurally_ready_for_authorized_materialization" ||
    input.provider !== "supabase" ||
    input.projectLabel !== DEV_PROJECT_LABEL ||
    input.syntheticOnly !== true ||
    input.liveRuntimeAuthorized !== false ||
    input.providerIoAuthorized !== false ||
    input.clientMaterializationAuthorized !== false ||
    input.sdkInstantiated !== false ||
    input.remoteIdentityVerified !== false ||
    input.sessionBootstrapProven !== false ||
    input.runtimeServerWasUsed !== false ||
    input.activationFactsProduced !== false ||
    input.deploymentAuthorized !== false ||
    input.blockers.length !== 0 ||
    input.sessionBootstrap === null
  ) {
    fail("preflight_not_ready");
  }
  if (!planValid(input.sessionBootstrap)) fail("invalid_plan");
  if (input.projectBindingId !== input.sessionBootstrap.projectBindingId) fail("invalid_plan");
  return input.sessionBootstrap;
}

function assertTransport(
  transport: SyntheticSessionBootstrapTransport,
  plan: ProviderSyntheticSessionBootstrapPlan,
): void {
  if (
    transport.channel !== "synthetic_session_bootstrap_transport" ||
    transport.provider !== "supabase" ||
    transport.projectLabel !== DEV_PROJECT_LABEL ||
    transport.syntheticOnly !== true ||
    transport.liveRuntimeAuthorized !== false ||
    transport.liveProviderSessionProven !== false ||
    plan.projectLabel !== transport.projectLabel
  ) {
    fail("invalid_transport");
  }
}

function assertFixture(lease: ProviderCandidateFixtureLease, nowMs: number): void {
  const issuedAt = parseIso(lease.issuedAt);
  const expiresAt = parseIso(lease.expiresAt);
  if (
    lease.contractVersion !== "V0.23.21-PROVIDER-FIXTURE-V1" ||
    !FIXTURE_ID.test(lease.fixtureId) ||
    !FIXTURE_NAMESPACE.test(lease.namespace) ||
    !SUBJECT_REF.test(lease.ownerSubjectRef) ||
    !SUBJECT_REF.test(lease.intruderSubjectRef) ||
    lease.ownerSubjectRef === lease.intruderSubjectRef ||
    lease.syntheticOnly !== true ||
    lease.disposable !== true ||
    issuedAt === null ||
    expiresAt === null ||
    expiresAt <= issuedAt ||
    expiresAt <= nowMs ||
    issuedAt > nowMs + CLOCK_SKEW_MS ||
    expiresAt - issuedAt > PROVIDER_CANDIDATE_MAX_FIXTURE_TTL_MS
  ) {
    fail("invalid_fixture");
  }
}

function validateIssue(
  observation: SyntheticSessionIssueObservation,
  actor: SyntheticSessionActor,
  lease: ProviderCandidateFixtureLease,
  subjectRef: string,
  email: string,
  requestId: string,
  nonce: string,
  nowMs: number,
): SyntheticSessionCapability {
  if (
    !observation ||
    typeof observation !== "object" ||
    observation.source !== "injected_transport_observation" ||
    observation.actor !== actor ||
    observation.fixtureId !== lease.fixtureId ||
    observation.namespace !== lease.namespace ||
    observation.requestId !== requestId ||
    observation.nonce !== nonce
  ) {
    fail("invalid_transport_response");
  }
  if (observation.subjectRef !== subjectRef || observation.syntheticEmail !== email) {
    fail("session_identity_mismatch");
  }
  assertAccessToken(observation.accessToken);
  const expiresAtMs = parseIso(observation.expiresAt);
  const leaseExpiresAt = parseIso(lease.expiresAt)!;
  if (expiresAtMs === null || expiresAtMs <= nowMs || expiresAtMs > leaseExpiresAt) {
    fail("session_expiry_invalid");
  }
  return {
    actor,
    subjectRef,
    syntheticEmail: email,
    accessToken: observation.accessToken,
    expiresAt: observation.expiresAt,
    serverOnly: true,
  };
}

function validateResolve(
  observation: SyntheticSessionResolveObservation,
  actor: SyntheticSessionActor,
  lease: ProviderCandidateFixtureLease,
  subjectRef: string,
  email: string,
  requestId: string,
  nonce: string,
): void {
  if (
    !observation ||
    typeof observation !== "object" ||
    observation.source !== "injected_transport_observation" ||
    observation.actor !== actor ||
    observation.fixtureId !== lease.fixtureId ||
    observation.namespace !== lease.namespace ||
    observation.requestId !== requestId ||
    observation.nonce !== nonce
  ) {
    fail("invalid_transport_response");
  }
  if (observation.subjectRef !== subjectRef || observation.syntheticEmail !== email) {
    fail("session_identity_mismatch");
  }
}

export class SyntheticSessionBootstrapExecutor {
  readonly version = SYNTHETIC_SESSION_BOOTSTRAP_EXECUTOR_VERSION;
  readonly provider = "supabase" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly liveProviderSessionProven = false as const;

  private readonly plan: ProviderSyntheticSessionBootstrapPlan;

  constructor(private readonly input: SyntheticSessionBootstrapExecutorInputs) {
    this.plan = assertPreflight(input.preflight);
    assertTransport(input.transport, this.plan);
    if (typeof input.now !== "function") fail("invalid_clock");
    if (typeof input.tokenSource !== "function") fail("invalid_token_source");
  }

  private token(
    kind: "issue_request" | "issue_nonce" | "resolve_request" | "resolve_nonce",
    actor: SyntheticSessionActor,
  ): string {
    const value = this.input.tokenSource(kind, actor);
    assertOpaque(value);
    return value;
  }

  private async bootstrapActor(
    actor: SyntheticSessionActor,
    lease: ProviderCandidateFixtureLease,
    now: string,
    nowMs: number,
  ): Promise<SyntheticSessionCapability> {
    const subjectRef = actor === "owner" ? lease.ownerSubjectRef : lease.intruderSubjectRef;
    const email = expectedEmail(lease.namespace, actor);
    const issueRequestId = this.token("issue_request", actor);
    const issueNonce = this.token("issue_nonce", actor);
    if (issueRequestId === issueNonce) fail("invalid_token_source");

    let issueResponse: Awaited<ReturnType<SyntheticSessionBootstrapTransport["issue"]>>;
    try {
      issueResponse = await this.input.transport.issue({
        projectBindingId: this.plan.projectBindingId,
        actor,
        fixtureId: lease.fixtureId,
        namespace: lease.namespace,
        subjectRef,
        syntheticEmail: email,
        requestId: issueRequestId,
        nonce: issueNonce,
        requestedAt: now,
      });
    } catch {
      fail("transport_unavailable");
    }
    if (!issueResponse || typeof issueResponse !== "object") fail("invalid_transport_response");
    if (issueResponse.error !== null) fail("transport_unavailable");
    if (!issueResponse.data) fail("invalid_transport_response");
    const capability = validateIssue(
      issueResponse.data,
      actor,
      lease,
      subjectRef,
      email,
      issueRequestId,
      issueNonce,
      nowMs,
    );

    const resolveRequestId = this.token("resolve_request", actor);
    const resolveNonce = this.token("resolve_nonce", actor);
    if (
      resolveRequestId === resolveNonce ||
      resolveRequestId === issueRequestId ||
      resolveRequestId === issueNonce ||
      resolveNonce === issueRequestId ||
      resolveNonce === issueNonce
    ) {
      fail("invalid_token_source");
    }

    let resolveResponse: Awaited<ReturnType<SyntheticSessionBootstrapTransport["resolve"]>>;
    try {
      resolveResponse = await this.input.transport.resolve({
        projectBindingId: this.plan.projectBindingId,
        actor,
        fixtureId: lease.fixtureId,
        namespace: lease.namespace,
        accessToken: capability.accessToken,
        requestId: resolveRequestId,
        nonce: resolveNonce,
        requestedAt: now,
      });
    } catch {
      fail("transport_unavailable");
    }
    if (!resolveResponse || typeof resolveResponse !== "object") fail("invalid_transport_response");
    if (resolveResponse.error !== null) fail("transport_unavailable");
    if (!resolveResponse.data) fail("invalid_transport_response");
    validateResolve(
      resolveResponse.data,
      actor,
      lease,
      subjectRef,
      email,
      resolveRequestId,
      resolveNonce,
    );
    return capability;
  }

  async execute(lease: ProviderCandidateFixtureLease): Promise<SyntheticSessionBootstrapContractResult> {
    const now = this.input.now();
    const nowMs = parseIso(now);
    if (nowMs === null) fail("invalid_clock");
    assertFixture(lease, nowMs);

    const owner = await this.bootstrapActor("owner", lease, now, nowMs);
    const intruder = await this.bootstrapActor("intruder", lease, now, nowMs);

    if (
      owner.subjectRef === intruder.subjectRef ||
      owner.syntheticEmail === intruder.syntheticEmail ||
      owner.accessToken === intruder.accessToken
    ) {
      fail("session_separation_failed");
    }

    return {
      version: SYNTHETIC_SESSION_BOOTSTRAP_EXECUTOR_VERSION,
      state: "session_bootstrap_contract_satisfied",
      provider: "supabase",
      projectLabel: DEV_PROJECT_LABEL,
      projectBindingId: this.plan.projectBindingId,
      fixtureId: lease.fixtureId,
      namespace: lease.namespace,
      owner,
      intruder,
      sessionBootstrapContractSatisfied: true,
      injectedTransportInvoked: true,
      liveProviderSessionProven: false,
      sessionBootstrapProven: false,
      remoteIdentityVerified: false,
      clientMaterializationAuthorized: false,
      providerParityProven: false,
      runtimeActivationAuthorized: false,
      deploymentAuthorized: false,
    };
  }
}

export function createSyntheticSessionBootstrapExecutor(
  input: SyntheticSessionBootstrapExecutorInputs,
): SyntheticSessionBootstrapExecutor {
  return new SyntheticSessionBootstrapExecutor(input);
}

export function syntheticSessionBootstrapExecutorProducesNoActivationFacts(): Record<string, never> {
  return {};
}
