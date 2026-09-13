import {
  PROVIDER_FACTORY_AUTHORITIES,
  evaluateProviderClientFactoryPreflight,
  type ProviderClientFactoryPreflightDecision,
  type ProviderClientFactoryPreflightInput,
  type ProviderRemoteIdentityAttestationRequirement,
  type ProviderSyntheticSessionBootstrapPlan,
} from "./provider-client-factory-preflight";
import type { RemoteIdentityAttestationContractResult } from "./remote-project-identity-attestation-executor";
import type {
  SyntheticSessionBootstrapContractResult,
  SyntheticSessionCapability,
} from "./synthetic-session-bootstrap-executor";

export const AUTHORIZED_CLIENT_MATERIALIZATION_GATE_VERSION =
  "V0.23.35-AUTHORIZED-CLIENT-MATERIALIZATION-GATE-V1" as const;

const DEV_PROJECT_LABEL = "vivienda-dev" as const;
const AUTHORITY_HANDLE_COUNT = 5 as const;
const MAX_FUTURE_GRANT_TTL_SECONDS = 300 as const;
const OPAQUE = /^[A-Za-z0-9_.:-]{8,160}$/;
const PROJECT_REF = /^[a-z0-9]{8,40}$/;
const FIXTURE_ID = /^fx_[A-Za-z0-9_-]{6,}$/;
const FIXTURE_NAMESPACE = /^vivienda_dev_[A-Za-z0-9_-]{6,}$/;
const SUBJECT_REF = /^sub_synthetic_[A-Za-z0-9_-]{6,}$/;
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;

export type ProviderClientMaterializationGateState =
  | "blocked_contract_inconsistent"
  | "ready_for_live_materialization_authorization";

export type ProviderClientMaterializationGateBlockerCode =
  | "preflight_revalidation_failed"
  | "preflight_decision_mismatch"
  | "attestation_contract_invalid"
  | "session_bootstrap_contract_invalid"
  | "project_binding_mismatch";

export type ProviderClientMaterializationGateBlocker = {
  code: ProviderClientMaterializationGateBlockerCode;
  scope:
    | "preflight"
    | "attestation_contract"
    | "session_bootstrap_contract"
    | "project_binding";
};

export type ProviderClientMaterializationAuthorizationRequirement = {
  channel: "provider_client_materialization_authorization";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  expectedProjectRef: string;
  expectedProjectUrl: string;
  authorityHandleCount: typeof AUTHORITY_HANDLE_COUNT;
  preflightRevalidationRequired: true;
  liveRemoteIdentityEvidence: {
    required: true;
    accepted: false;
    requiredSource: "authorized_external_live_provider_attestation";
    mustBindProjectIdentity: true;
  };
  liveSessionBootstrapEvidence: {
    required: true;
    accepted: false;
    requiredSource: "authorized_external_live_provider_session_bootstrap";
    ownerAndIntruderRequired: true;
    fixtureDisposableRequired: true;
    capabilityLifetimeContainmentRequired: true;
  };
  explicitSingleUseGrant: {
    required: true;
    accepted: false;
    requiredSource: "external_materialization_control_plane";
    action: "materialize_qualified_dev_provider_clients";
    maxTtlSeconds: typeof MAX_FUTURE_GRANT_TTL_SECONDS;
    mustBindProjectIdentity: true;
    mustBindAuthorityHandles: true;
    mustBindLiveEvidence: true;
    atomicConsumptionRequired: true;
  };
  providerIoBeforeGrantAllowed: false;
  sdkInstantiationBeforeGrantAllowed: false;
  runtimeActivationImplied: false;
  deploymentImplied: false;
};

export type ProviderClientMaterializationGateDecision = {
  version: typeof AUTHORIZED_CLIENT_MATERIALIZATION_GATE_VERSION;
  state: ProviderClientMaterializationGateState;
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string | null;
  expectedProjectRef: string | null;
  expectedProjectUrl: string | null;
  authorityHandleCount: number;
  configurationRevalidated: boolean;
  contractStackValidated: boolean;
  blockers: ProviderClientMaterializationGateBlocker[];
  authorizationRequirement: ProviderClientMaterializationAuthorizationRequirement | null;
  syntheticOnly: true;
  liveRuntimeAuthorized: false;
  liveMaterializationAuthorizationRequired: true;
  liveRemoteIdentityEvidenceAccepted: false;
  liveSessionBootstrapEvidenceAccepted: false;
  explicitMaterializationGrantAccepted: false;
  providerIoAuthorized: false;
  sdkInstantiationAuthorized: false;
  clientMaterializationAuthorized: false;
  materializerMayExecute: false;
  remoteIdentityVerified: false;
  sessionBootstrapProven: false;
  providerParityProven: false;
  runtimeActivationAuthorized: false;
  deploymentAuthorized: false;
  activationFactsProduced: false;
};

export type ProviderClientMaterializationGateInput = {
  preflightInput: ProviderClientFactoryPreflightInput;
  preflightDecision: ProviderClientFactoryPreflightDecision;
  attestationContract: RemoteIdentityAttestationContractResult;
  sessionBootstrapContract: SyntheticSessionBootstrapContractResult;
};

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

function remoteRequirementMatches(
  left: ProviderRemoteIdentityAttestationRequirement | null,
  right: ProviderRemoteIdentityAttestationRequirement | null,
): boolean {
  if (left === null || right === null) return left === right;
  return (
    left.channel === right.channel &&
    left.provider === right.provider &&
    left.projectLabel === right.projectLabel &&
    left.projectBindingId === right.projectBindingId &&
    left.expectedProjectRef === right.expectedProjectRef &&
    left.expectedProjectUrl === right.expectedProjectUrl &&
    left.required === right.required &&
    left.networkIoRequired === right.networkIoRequired &&
    left.performed === right.performed &&
    left.verified === right.verified
  );
}

function sessionPlanMatches(
  left: ProviderSyntheticSessionBootstrapPlan | null,
  right: ProviderSyntheticSessionBootstrapPlan | null,
): boolean {
  if (left === null || right === null) return left === right;
  return (
    left.channel === right.channel &&
    left.provider === right.provider &&
    left.projectLabel === right.projectLabel &&
    left.projectBindingId === right.projectBindingId &&
    left.strategy === right.strategy &&
    left.ownerAndIntruderRequired === right.ownerAndIntruderRequired &&
    left.deterministicFixtureEmailRequired === right.deterministicFixtureEmailRequired &&
    left.passwordGrantAssumed === right.passwordGrantAssumed &&
    left.locallyMintedJwtAllowed === right.locallyMintedJwtAllowed &&
    left.providerIoRequired === right.providerIoRequired &&
    left.performed === right.performed &&
    left.proven === right.proven
  );
}

function readyPreflight(decision: ProviderClientFactoryPreflightDecision): boolean {
  return (
    decision.version === "V0.23.32-PROVIDER-CLIENT-FACTORY-PREFLIGHT-V1" &&
    decision.state === "structurally_ready_for_authorized_materialization" &&
    decision.provider === "supabase" &&
    decision.projectLabel === DEV_PROJECT_LABEL &&
    typeof decision.projectBindingId === "string" &&
    OPAQUE.test(decision.projectBindingId) &&
    typeof decision.expectedRemoteProjectRef === "string" &&
    PROJECT_REF.test(decision.expectedRemoteProjectRef) &&
    typeof decision.normalizedProjectUrl === "string" &&
    normalizeOrigin(decision.normalizedProjectUrl) === decision.normalizedProjectUrl &&
    decision.authorityHandleCount === AUTHORITY_HANDLE_COUNT &&
    decision.blockers.length === 0 &&
    decision.syntheticOnly === true &&
    decision.liveRuntimeAuthorized === false &&
    decision.providerIoAuthorized === false &&
    decision.clientMaterializationAuthorized === false &&
    decision.sdkInstantiated === false &&
    decision.remoteIdentityVerified === false &&
    decision.sessionBootstrapProven === false &&
    decision.runtimeServerWasUsed === false &&
    decision.remoteIdentityAttestation !== null &&
    decision.sessionBootstrap !== null &&
    decision.activationFactsProduced === false &&
    decision.deploymentAuthorized === false
  );
}

function preflightMatches(
  recomputed: ProviderClientFactoryPreflightDecision,
  supplied: ProviderClientFactoryPreflightDecision,
): boolean {
  return (
    readyPreflight(recomputed) &&
    readyPreflight(supplied) &&
    recomputed.state === supplied.state &&
    recomputed.projectBindingId === supplied.projectBindingId &&
    recomputed.normalizedProjectUrl === supplied.normalizedProjectUrl &&
    recomputed.expectedRemoteProjectRef === supplied.expectedRemoteProjectRef &&
    recomputed.authorityHandleCount === supplied.authorityHandleCount &&
    remoteRequirementMatches(recomputed.remoteIdentityAttestation, supplied.remoteIdentityAttestation) &&
    sessionPlanMatches(recomputed.sessionBootstrap, supplied.sessionBootstrap)
  );
}

function attestationContractValid(
  value: RemoteIdentityAttestationContractResult,
  preflight: ProviderClientFactoryPreflightDecision,
): boolean {
  if (!value || typeof value !== "object") return false;
  return (
    value.version === "V0.23.33-REMOTE-IDENTITY-ATTESTATION-EXECUTOR-V1" &&
    value.state === "attestation_contract_satisfied" &&
    value.provider === "supabase" &&
    value.projectLabel === DEV_PROJECT_LABEL &&
    value.projectBindingId === preflight.projectBindingId &&
    value.expectedProjectRef === preflight.expectedRemoteProjectRef &&
    normalizeOrigin(value.expectedProjectUrl) === preflight.normalizedProjectUrl &&
    typeof value.requestId === "string" &&
    OPAQUE.test(value.requestId) &&
    typeof value.observationNonce === "string" &&
    OPAQUE.test(value.observationNonce) &&
    value.requestId !== value.observationNonce &&
    Number.isFinite(Date.parse(value.observedAt)) &&
    value.attestationContractSatisfied === true &&
    value.injectedTransportInvoked === true &&
    value.liveProviderEvidenceProven === false &&
    value.remoteIdentityVerified === false &&
    value.clientMaterializationAuthorized === false &&
    value.sessionBootstrapProven === false &&
    value.providerParityProven === false &&
    value.runtimeActivationAuthorized === false &&
    value.deploymentAuthorized === false
  );
}

function expectedFixtureEmail(namespace: string, actor: "owner" | "intruder"): string {
  return `fixture+${namespace}.${actor}@vivienda.invalid`;
}

function sessionCapabilityValid(
  value: SyntheticSessionCapability,
  actor: "owner" | "intruder",
  namespace: string,
): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    value.actor === actor &&
    SUBJECT_REF.test(value.subjectRef) &&
    value.syntheticEmail === expectedFixtureEmail(namespace, actor) &&
    typeof value.accessToken === "string" &&
    value.accessToken.length >= 16 &&
    !CONTROL_CHARACTER.test(value.accessToken) &&
    !/\s/.test(value.accessToken) &&
    Number.isFinite(Date.parse(value.expiresAt)) &&
    value.serverOnly === true
  );
}

function sessionContractValid(
  value: SyntheticSessionBootstrapContractResult,
  preflight: ProviderClientFactoryPreflightDecision,
): boolean {
  if (!value || typeof value !== "object") return false;
  if (
    value.version !== "V0.23.34-SYNTHETIC-SESSION-BOOTSTRAP-EXECUTOR-V1" ||
    value.state !== "session_bootstrap_contract_satisfied" ||
    value.provider !== "supabase" ||
    value.projectLabel !== DEV_PROJECT_LABEL ||
    value.projectBindingId !== preflight.projectBindingId ||
    !FIXTURE_ID.test(value.fixtureId) ||
    !FIXTURE_NAMESPACE.test(value.namespace) ||
    !sessionCapabilityValid(value.owner, "owner", value.namespace) ||
    !sessionCapabilityValid(value.intruder, "intruder", value.namespace) ||
    value.owner.subjectRef === value.intruder.subjectRef ||
    value.owner.syntheticEmail === value.intruder.syntheticEmail ||
    value.owner.accessToken === value.intruder.accessToken ||
    value.sessionBootstrapContractSatisfied !== true ||
    value.injectedTransportInvoked !== true ||
    value.liveProviderSessionProven !== false ||
    value.sessionBootstrapProven !== false ||
    value.remoteIdentityVerified !== false ||
    value.clientMaterializationAuthorized !== false ||
    value.providerParityProven !== false ||
    value.runtimeActivationAuthorized !== false ||
    value.deploymentAuthorized !== false
  ) {
    return false;
  }
  return true;
}

function baseDecision(): Omit<
  ProviderClientMaterializationGateDecision,
  | "state"
  | "projectBindingId"
  | "expectedProjectRef"
  | "expectedProjectUrl"
  | "authorityHandleCount"
  | "configurationRevalidated"
  | "contractStackValidated"
  | "blockers"
  | "authorizationRequirement"
> {
  return {
    version: AUTHORIZED_CLIENT_MATERIALIZATION_GATE_VERSION,
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    syntheticOnly: true,
    liveRuntimeAuthorized: false,
    liveMaterializationAuthorizationRequired: true,
    liveRemoteIdentityEvidenceAccepted: false,
    liveSessionBootstrapEvidenceAccepted: false,
    explicitMaterializationGrantAccepted: false,
    providerIoAuthorized: false,
    sdkInstantiationAuthorized: false,
    clientMaterializationAuthorized: false,
    materializerMayExecute: false,
    remoteIdentityVerified: false,
    sessionBootstrapProven: false,
    providerParityProven: false,
    runtimeActivationAuthorized: false,
    deploymentAuthorized: false,
    activationFactsProduced: false,
  };
}

function authorizationRequirement(
  preflight: ProviderClientFactoryPreflightDecision,
): ProviderClientMaterializationAuthorizationRequirement {
  return {
    channel: "provider_client_materialization_authorization",
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    projectBindingId: preflight.projectBindingId!,
    expectedProjectRef: preflight.expectedRemoteProjectRef!,
    expectedProjectUrl: preflight.normalizedProjectUrl!,
    authorityHandleCount: AUTHORITY_HANDLE_COUNT,
    preflightRevalidationRequired: true,
    liveRemoteIdentityEvidence: {
      required: true,
      accepted: false,
      requiredSource: "authorized_external_live_provider_attestation",
      mustBindProjectIdentity: true,
    },
    liveSessionBootstrapEvidence: {
      required: true,
      accepted: false,
      requiredSource: "authorized_external_live_provider_session_bootstrap",
      ownerAndIntruderRequired: true,
      fixtureDisposableRequired: true,
      capabilityLifetimeContainmentRequired: true,
    },
    explicitSingleUseGrant: {
      required: true,
      accepted: false,
      requiredSource: "external_materialization_control_plane",
      action: "materialize_qualified_dev_provider_clients",
      maxTtlSeconds: MAX_FUTURE_GRANT_TTL_SECONDS,
      mustBindProjectIdentity: true,
      mustBindAuthorityHandles: true,
      mustBindLiveEvidence: true,
      atomicConsumptionRequired: true,
    },
    providerIoBeforeGrantAllowed: false,
    sdkInstantiationBeforeGrantAllowed: false,
    runtimeActivationImplied: false,
    deploymentImplied: false,
  };
}

export function evaluateAuthorizedClientMaterializationGate(
  input: ProviderClientMaterializationGateInput,
): ProviderClientMaterializationGateDecision {
  const blockers: ProviderClientMaterializationGateBlocker[] = [];
  const recomputed = evaluateProviderClientFactoryPreflight(input.preflightInput);

  const configurationRevalidated = readyPreflight(recomputed);
  if (!configurationRevalidated) {
    blockers.push({ code: "preflight_revalidation_failed", scope: "preflight" });
  }

  const suppliedPreflightMatches = preflightMatches(recomputed, input.preflightDecision);
  if (configurationRevalidated && !suppliedPreflightMatches) {
    blockers.push({ code: "preflight_decision_mismatch", scope: "preflight" });
  }

  const canonicalPreflight = suppliedPreflightMatches ? input.preflightDecision : recomputed;

  const attestationValid =
    configurationRevalidated &&
    suppliedPreflightMatches &&
    attestationContractValid(input.attestationContract, canonicalPreflight);
  if (configurationRevalidated && suppliedPreflightMatches && !attestationValid) {
    blockers.push({ code: "attestation_contract_invalid", scope: "attestation_contract" });
  }

  const sessionValid =
    configurationRevalidated &&
    suppliedPreflightMatches &&
    sessionContractValid(input.sessionBootstrapContract, canonicalPreflight);
  if (configurationRevalidated && suppliedPreflightMatches && !sessionValid) {
    blockers.push({ code: "session_bootstrap_contract_invalid", scope: "session_bootstrap_contract" });
  }

  const bindingMatches =
    attestationValid &&
    sessionValid &&
    input.attestationContract.projectBindingId === input.sessionBootstrapContract.projectBindingId &&
    input.attestationContract.projectBindingId === canonicalPreflight.projectBindingId;
  if (attestationValid && sessionValid && !bindingMatches) {
    blockers.push({ code: "project_binding_mismatch", scope: "project_binding" });
  }

  const contractStackValidated =
    configurationRevalidated && suppliedPreflightMatches && attestationValid && sessionValid && bindingMatches;

  return {
    ...baseDecision(),
    state: contractStackValidated
      ? "ready_for_live_materialization_authorization"
      : "blocked_contract_inconsistent",
    projectBindingId: configurationRevalidated ? recomputed.projectBindingId : null,
    expectedProjectRef: configurationRevalidated ? recomputed.expectedRemoteProjectRef : null,
    expectedProjectUrl: configurationRevalidated ? recomputed.normalizedProjectUrl : null,
    authorityHandleCount: configurationRevalidated ? recomputed.authorityHandleCount : 0,
    configurationRevalidated,
    contractStackValidated,
    blockers,
    authorizationRequirement: contractStackValidated ? authorizationRequirement(canonicalPreflight) : null,
  };
}

export function authorizedClientMaterializationGateProducesNoActivationFacts(): Record<string, never> {
  return {};
}

export function authorizedClientMaterializationGateProducesNoProviderExecutionFacts(): Record<string, never> {
  return {};
}

export function expectedProviderFactoryAuthorityCount(): number {
  return PROVIDER_FACTORY_AUTHORITIES.length;
}
