import type {
  ProviderClientFactoryPreflightDecision,
  ProviderRemoteIdentityAttestationRequirement,
} from "./provider-client-factory-preflight";

export const REMOTE_PROJECT_IDENTITY_ATTESTATION_EXECUTOR_VERSION =
  "V0.23.33-REMOTE-IDENTITY-ATTESTATION-EXECUTOR-V1" as const;

const DEV_PROJECT_LABEL = "vivienda-dev" as const;
const MAX_ATTESTATION_AGE_MS = 5 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 60 * 1000;
const OPAQUE_ID = /^[A-Za-z0-9_.:-]{8,160}$/;
const PROJECT_REF = /^[a-z0-9]{8,40}$/;
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;

export type RemoteIdentityAttestationObservation = {
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  projectRef: string;
  projectUrl: string;
  requestId: string;
  nonce: string;
  observedAt: string;
  source: "injected_transport_observation";
};

export type RemoteIdentityAttestationTransportResult =
  | { data: RemoteIdentityAttestationObservation; error: null }
  | { data: null; error: { code?: string; status?: number; message?: string } };

export interface RemoteIdentityAttestationTransport {
  readonly channel: "remote_project_identity_attestation_transport";
  readonly provider: "supabase";
  readonly projectLabel: typeof DEV_PROJECT_LABEL;
  readonly syntheticOnly: true;
  readonly liveRuntimeAuthorized: false;
  readonly liveProviderEvidenceProven: false;
  observe(input: {
    provider: "supabase";
    projectLabel: typeof DEV_PROJECT_LABEL;
    projectBindingId: string;
    expectedProjectRef: string;
    expectedProjectUrl: string;
    requestId: string;
    nonce: string;
    requestedAt: string;
  }): Promise<RemoteIdentityAttestationTransportResult>;
}

export type RemoteIdentityAttestationExecutorErrorCode =
  | "preflight_not_ready"
  | "invalid_requirement"
  | "invalid_transport"
  | "invalid_clock"
  | "invalid_token_source"
  | "transport_unavailable"
  | "invalid_transport_response"
  | "identity_mismatch"
  | "stale_observation";

export class RemoteIdentityAttestationExecutorError extends Error {
  constructor(readonly code: RemoteIdentityAttestationExecutorErrorCode) {
    super("Remote project identity attestation failed.");
    this.name = "RemoteIdentityAttestationExecutorError";
  }
}

export type RemoteIdentityAttestationContractResult = {
  version: typeof REMOTE_PROJECT_IDENTITY_ATTESTATION_EXECUTOR_VERSION;
  state: "attestation_contract_satisfied";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  expectedProjectRef: string;
  expectedProjectUrl: string;
  requestId: string;
  observationNonce: string;
  observedAt: string;
  attestationContractSatisfied: true;
  injectedTransportInvoked: true;
  liveProviderEvidenceProven: false;
  remoteIdentityVerified: false;
  clientMaterializationAuthorized: false;
  sessionBootstrapProven: false;
  providerParityProven: false;
  runtimeActivationAuthorized: false;
  deploymentAuthorized: false;
};

export type RemoteIdentityAttestationExecutorInputs = {
  preflight: ProviderClientFactoryPreflightDecision;
  transport: RemoteIdentityAttestationTransport;
  now: () => string;
  tokenSource: (kind: "request_id" | "attestation_nonce") => string;
};

function fail(code: RemoteIdentityAttestationExecutorErrorCode): never {
  throw new RemoteIdentityAttestationExecutorError(code);
}

function parseIso(value: string): number | null {
  if (typeof value !== "string" || CONTROL_CHARACTER.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeOrigin(value: string): string | null {
  if (typeof value !== "string" || value.length > 2048 || CONTROL_CHARACTER.test(value)) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    return null;
  }
  return parsed.origin;
}

function assertOpaque(value: string, code: RemoteIdentityAttestationExecutorErrorCode): void {
  if (typeof value !== "string" || !OPAQUE_ID.test(value) || CONTROL_CHARACTER.test(value)) fail(code);
}

function requirementValid(requirement: ProviderRemoteIdentityAttestationRequirement): boolean {
  return (
    requirement.channel === "remote_project_identity_attestation" &&
    requirement.provider === "supabase" &&
    requirement.projectLabel === DEV_PROJECT_LABEL &&
    OPAQUE_ID.test(requirement.projectBindingId) &&
    PROJECT_REF.test(requirement.expectedProjectRef) &&
    normalizeOrigin(requirement.expectedProjectUrl) !== null &&
    requirement.required === true &&
    requirement.networkIoRequired === true &&
    requirement.performed === false &&
    requirement.verified === false
  );
}

function assertPreflight(input: ProviderClientFactoryPreflightDecision): ProviderRemoteIdentityAttestationRequirement {
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
    input.remoteIdentityAttestation === null
  ) {
    fail("preflight_not_ready");
  }
  if (!requirementValid(input.remoteIdentityAttestation)) fail("invalid_requirement");
  if (
    input.projectBindingId !== input.remoteIdentityAttestation.projectBindingId ||
    input.normalizedProjectUrl !== input.remoteIdentityAttestation.expectedProjectUrl ||
    input.expectedRemoteProjectRef !== input.remoteIdentityAttestation.expectedProjectRef
  ) {
    fail("invalid_requirement");
  }
  return input.remoteIdentityAttestation;
}

function assertTransport(
  transport: RemoteIdentityAttestationTransport,
  requirement: ProviderRemoteIdentityAttestationRequirement,
): void {
  if (
    transport.channel !== "remote_project_identity_attestation_transport" ||
    transport.provider !== "supabase" ||
    transport.projectLabel !== DEV_PROJECT_LABEL ||
    transport.syntheticOnly !== true ||
    transport.liveRuntimeAuthorized !== false ||
    transport.liveProviderEvidenceProven !== false ||
    requirement.projectLabel !== transport.projectLabel
  ) {
    fail("invalid_transport");
  }
}

function validateObservation(
  observation: RemoteIdentityAttestationObservation,
  requirement: ProviderRemoteIdentityAttestationRequirement,
  requestId: string,
  nonce: string,
  requestedAtMs: number,
  completedAtMs: number,
): void {
  if (
    !observation ||
    typeof observation !== "object" ||
    observation.provider !== "supabase" ||
    observation.projectLabel !== DEV_PROJECT_LABEL ||
    observation.source !== "injected_transport_observation" ||
    observation.requestId !== requestId ||
    observation.nonce !== nonce
  ) {
    fail("invalid_transport_response");
  }
  if (
    observation.projectBindingId !== requirement.projectBindingId ||
    observation.projectRef !== requirement.expectedProjectRef ||
    normalizeOrigin(observation.projectUrl) !== requirement.expectedProjectUrl
  ) {
    fail("identity_mismatch");
  }
  const observedAtMs = parseIso(observation.observedAt);
  if (observedAtMs === null) fail("invalid_transport_response");
  if (
    observedAtMs < requestedAtMs - MAX_CLOCK_SKEW_MS ||
    observedAtMs > completedAtMs + MAX_CLOCK_SKEW_MS ||
    completedAtMs - observedAtMs > MAX_ATTESTATION_AGE_MS
  ) {
    fail("stale_observation");
  }
}

export class RemoteProjectIdentityAttestationExecutor {
  readonly version = REMOTE_PROJECT_IDENTITY_ATTESTATION_EXECUTOR_VERSION;
  readonly provider = "supabase" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly liveProviderIoProven = false as const;

  private readonly requirement: ProviderRemoteIdentityAttestationRequirement;

  constructor(private readonly input: RemoteIdentityAttestationExecutorInputs) {
    this.requirement = assertPreflight(input.preflight);
    assertTransport(input.transport, this.requirement);
    if (typeof input.now !== "function") fail("invalid_clock");
    if (typeof input.tokenSource !== "function") fail("invalid_token_source");
  }

  async execute(): Promise<RemoteIdentityAttestationContractResult> {
    const requestedAt = this.input.now();
    const requestedAtMs = parseIso(requestedAt);
    if (requestedAtMs === null) fail("invalid_clock");

    const requestId = this.input.tokenSource("request_id");
    const nonce = this.input.tokenSource("attestation_nonce");
    assertOpaque(requestId, "invalid_token_source");
    assertOpaque(nonce, "invalid_token_source");
    if (requestId === nonce) fail("invalid_token_source");

    let response: RemoteIdentityAttestationTransportResult;
    try {
      response = await this.input.transport.observe({
        provider: "supabase",
        projectLabel: DEV_PROJECT_LABEL,
        projectBindingId: this.requirement.projectBindingId,
        expectedProjectRef: this.requirement.expectedProjectRef,
        expectedProjectUrl: this.requirement.expectedProjectUrl,
        requestId,
        nonce,
        requestedAt,
      });
    } catch {
      fail("transport_unavailable");
    }

    if (!response || typeof response !== "object") fail("invalid_transport_response");
    if (response.error !== null) fail("transport_unavailable");
    if (!response.data) fail("invalid_transport_response");

    const completedAt = this.input.now();
    const completedAtMs = parseIso(completedAt);
    if (completedAtMs === null || completedAtMs < requestedAtMs - MAX_CLOCK_SKEW_MS) fail("invalid_clock");

    validateObservation(
      response.data,
      this.requirement,
      requestId,
      nonce,
      requestedAtMs,
      completedAtMs,
    );

    return {
      version: REMOTE_PROJECT_IDENTITY_ATTESTATION_EXECUTOR_VERSION,
      state: "attestation_contract_satisfied",
      provider: "supabase",
      projectLabel: DEV_PROJECT_LABEL,
      projectBindingId: this.requirement.projectBindingId,
      expectedProjectRef: this.requirement.expectedProjectRef,
      expectedProjectUrl: this.requirement.expectedProjectUrl,
      requestId,
      observationNonce: nonce,
      observedAt: response.data.observedAt,
      attestationContractSatisfied: true,
      injectedTransportInvoked: true,
      liveProviderEvidenceProven: false,
      remoteIdentityVerified: false,
      clientMaterializationAuthorized: false,
      sessionBootstrapProven: false,
      providerParityProven: false,
      runtimeActivationAuthorized: false,
      deploymentAuthorized: false,
    };
  }
}

export function createRemoteProjectIdentityAttestationExecutor(
  input: RemoteIdentityAttestationExecutorInputs,
): RemoteProjectIdentityAttestationExecutor {
  return new RemoteProjectIdentityAttestationExecutor(input);
}

export function remoteIdentityAttestationExecutorProducesNoActivationFacts(): Record<string, never> {
  return {};
}
