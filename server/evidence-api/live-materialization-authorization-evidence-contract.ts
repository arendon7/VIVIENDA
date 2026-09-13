import type {
  ProviderClientMaterializationAuthorizationRequirement,
  ProviderClientMaterializationGateDecision,
} from "./authorized-client-materialization-gate";

export const LIVE_MATERIALIZATION_AUTHORIZATION_EVIDENCE_CONTRACT_VERSION =
  "V0.23.36-LIVE-MATERIALIZATION-AUTHORIZATION-EVIDENCE-CONTRACT-V1" as const;

const DEV_PROJECT_LABEL = "vivienda-dev" as const;
const AUTHORITY_HANDLE_COUNT = 5 as const;
const MAX_AUTHORIZATION_TTL_SECONDS = 300 as const;
const BINDING_ID = /^[A-Za-z0-9_-]{8,80}$/;
const PROJECT_REF = /^[a-z0-9]{8,40}$/;
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;

export const LIVE_EVIDENCE_COLLECTION_ACTIONS = [
  "attest_remote_project_identity",
  "bootstrap_owner_synthetic_session",
  "resolve_owner_synthetic_session",
  "bootstrap_intruder_synthetic_session",
  "resolve_intruder_synthetic_session",
] as const;

export type LiveEvidenceCollectionAction = (typeof LIVE_EVIDENCE_COLLECTION_ACTIONS)[number];

export type LiveMaterializationAuthorizationEvidenceContractState =
  | "evidence_authorization_contract_ready"
  | "blocked_materialization_gate_invalid";

export type LiveMaterializationAuthorizationEvidenceContractBlockerCode =
  | "materialization_gate_not_ready"
  | "materialization_authorization_requirement_invalid";

export type LiveMaterializationAuthorizationEvidenceContractBlocker = {
  code: LiveMaterializationAuthorizationEvidenceContractBlockerCode;
  scope: "materialization_gate" | "authorization_requirement";
};

export type EvidenceCollectionAuthorizationContract = {
  channel: "live_materialization_evidence_collection_authorization";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  expectedProjectRef: string;
  expectedProjectUrl: string;
  requiredSource: "external_materialization_control_plane";
  authorizationKind: "scoped_live_evidence_collection_lease";
  maxTtlSeconds: typeof MAX_AUTHORIZATION_TTL_SECONDS;
  singleProjectOnly: true;
  syntheticFixtureOnly: true;
  exactActionSetRequired: true;
  allowedActions: readonly LiveEvidenceCollectionAction[];
  maxUsesPerAction: 1;
  arbitraryRpcAllowed: false;
  arbitraryStorageAllowed: false;
  providerClientMaterializationAllowed: false;
  sdkFactoryInvocationAllowed: false;
  runtimeActivationAllowed: false;
  deploymentAllowed: false;
  receiptRequired: true;
  receiptMustBindAuthorizationId: true;
  receiptMustBindProjectIdentity: true;
  receiptMustBindCompletedActions: true;
  receiptMustBeProducedExternally: true;
};

export type LiveRemoteIdentityEvidenceReceiptContract = {
  evidenceKind: "live_remote_project_identity";
  requiredSource: "authorized_external_live_provider_attestation";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  expectedProjectRef: string;
  expectedProjectUrl: string;
  evidenceCollectionAuthorizationReceiptRequired: true;
  providerIoObservedRequired: true;
  remoteIdentityVerifiedRequired: true;
  externalVerifierReceiptRequired: true;
  evidenceIdRequired: true;
  observedAtRequired: true;
  maxEvidenceAgeSeconds: typeof MAX_AUTHORIZATION_TTL_SECONDS;
  credentialsForbiddenInReceipt: true;
  authorityHandleIdsForbiddenInReceipt: true;
  runtimeActivationImplied: false;
  deploymentImplied: false;
};

export type LiveSessionBootstrapEvidenceReceiptContract = {
  evidenceKind: "live_synthetic_session_bootstrap";
  requiredSource: "authorized_external_live_provider_session_bootstrap";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  evidenceCollectionAuthorizationReceiptRequired: true;
  ownerAndIntruderRequired: true;
  issueAndResolveRequiredForEachActor: true;
  distinctSubjectsRequired: true;
  disposableFixtureRequired: true;
  capabilityLifetimeContainmentRequired: true;
  providerIoObservedRequired: true;
  sessionBootstrapProvenRequired: true;
  externalVerifierReceiptRequired: true;
  evidenceIdRequired: true;
  observedAtRequired: true;
  maxEvidenceAgeSeconds: typeof MAX_AUTHORIZATION_TTL_SECONDS;
  accessTokenValuesForbiddenInReceipt: true;
  syntheticEmailValuesForbiddenInReceipt: true;
  authorityHandleIdsForbiddenInReceipt: true;
  runtimeActivationImplied: false;
  deploymentImplied: false;
};

export type MaterializationGrantAcceptanceContract = {
  channel: "provider_client_materialization_authorization";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  expectedProjectRef: string;
  expectedProjectUrl: string;
  authorityHandleCount: typeof AUTHORITY_HANDLE_COUNT;
  requiredSource: "external_materialization_control_plane";
  action: "materialize_qualified_dev_provider_clients";
  maxTtlSeconds: typeof MAX_AUTHORIZATION_TTL_SECONDS;
  singleUseRequired: true;
  atomicConsumptionRequired: true;
  consumedGrantRequired: false;
  mustBindProjectIdentity: true;
  mustBindExactAuthoritySetViaExternalReceipt: true;
  rawAuthorityHandleIdsForbiddenInContractOutput: true;
  mustBindEvidenceCollectionAuthorizationReceipt: true;
  mustBindLiveRemoteIdentityEvidenceId: true;
  mustBindLiveSessionBootstrapEvidenceId: true;
  liveEvidenceMustPredateGrant: true;
  liveEvidenceMustBeFreshAtGrantIssue: true;
  liveEvidenceAuthenticityMustBeExternallyVerified: true;
  materializerMayExecuteBeforeAtomicConsumption: false;
  runtimeActivationImplied: false;
  deploymentImplied: false;
};

export type LiveMaterializationAuthorizationEvidenceContractDecision = {
  version: typeof LIVE_MATERIALIZATION_AUTHORIZATION_EVIDENCE_CONTRACT_VERSION;
  state: LiveMaterializationAuthorizationEvidenceContractState;
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string | null;
  expectedProjectRef: string | null;
  expectedProjectUrl: string | null;
  authorityHandleCount: number;
  blockers: LiveMaterializationAuthorizationEvidenceContractBlocker[];
  evidenceCollectionAuthorization: EvidenceCollectionAuthorizationContract | null;
  remoteIdentityEvidenceReceipt: LiveRemoteIdentityEvidenceReceiptContract | null;
  sessionBootstrapEvidenceReceipt: LiveSessionBootstrapEvidenceReceiptContract | null;
  materializationGrantAcceptance: MaterializationGrantAcceptanceContract | null;
  twoPhaseAuthorizationRequired: true;
  circularDependencyResolvedBySeparateEvidenceCollectionAuthority: boolean;
  evidenceCollectionAuthorizationAccepted: false;
  evidenceCollectionProviderIoAuthorized: false;
  liveRemoteIdentityEvidenceAccepted: false;
  liveSessionBootstrapEvidenceAccepted: false;
  explicitMaterializationGrantAccepted: false;
  materializationGrantConsumed: false;
  materializationProviderIoAuthorized: false;
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

export type LiveMaterializationAuthorizationEvidenceContractInput = {
  materializationGate: ProviderClientMaterializationGateDecision;
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

function authorizationRequirementValid(
  value: ProviderClientMaterializationAuthorizationRequirement | null,
  gate: ProviderClientMaterializationGateDecision,
): value is ProviderClientMaterializationAuthorizationRequirement {
  if (!value || typeof value !== "object") return false;
  return (
    value.channel === "provider_client_materialization_authorization" &&
    value.provider === "supabase" &&
    value.projectLabel === DEV_PROJECT_LABEL &&
    value.projectBindingId === gate.projectBindingId &&
    value.expectedProjectRef === gate.expectedProjectRef &&
    value.expectedProjectUrl === gate.expectedProjectUrl &&
    value.authorityHandleCount === AUTHORITY_HANDLE_COUNT &&
    value.preflightRevalidationRequired === true &&
    value.configurationDriftCheckRequired === true &&
    value.liveRemoteIdentityEvidence.required === true &&
    value.liveRemoteIdentityEvidence.accepted === false &&
    value.liveRemoteIdentityEvidence.requiredSource === "authorized_external_live_provider_attestation" &&
    value.liveRemoteIdentityEvidence.mustBindProjectIdentity === true &&
    value.liveSessionBootstrapEvidence.required === true &&
    value.liveSessionBootstrapEvidence.accepted === false &&
    value.liveSessionBootstrapEvidence.requiredSource ===
      "authorized_external_live_provider_session_bootstrap" &&
    value.liveSessionBootstrapEvidence.ownerAndIntruderRequired === true &&
    value.liveSessionBootstrapEvidence.fixtureDisposableRequired === true &&
    value.liveSessionBootstrapEvidence.capabilityLifetimeContainmentRequired === true &&
    value.explicitSingleUseGrant.required === true &&
    value.explicitSingleUseGrant.accepted === false &&
    value.explicitSingleUseGrant.requiredSource === "external_materialization_control_plane" &&
    value.explicitSingleUseGrant.action === "materialize_qualified_dev_provider_clients" &&
    value.explicitSingleUseGrant.maxTtlSeconds === MAX_AUTHORIZATION_TTL_SECONDS &&
    value.explicitSingleUseGrant.mustBindProjectIdentity === true &&
    value.explicitSingleUseGrant.mustBindAuthorityHandles === true &&
    value.explicitSingleUseGrant.mustBindLiveEvidence === true &&
    value.explicitSingleUseGrant.atomicConsumptionRequired === true &&
    value.providerIoBeforeGrantAllowed === false &&
    value.sdkInstantiationBeforeGrantAllowed === false &&
    value.runtimeActivationImplied === false &&
    value.deploymentImplied === false
  );
}

function readyGate(value: ProviderClientMaterializationGateDecision): boolean {
  return (
    value.version === "V0.23.35-AUTHORIZED-CLIENT-MATERIALIZATION-GATE-V1" &&
    value.state === "ready_for_live_materialization_authorization" &&
    value.provider === "supabase" &&
    value.projectLabel === DEV_PROJECT_LABEL &&
    typeof value.projectBindingId === "string" &&
    BINDING_ID.test(value.projectBindingId) &&
    typeof value.expectedProjectRef === "string" &&
    PROJECT_REF.test(value.expectedProjectRef) &&
    typeof value.expectedProjectUrl === "string" &&
    normalizeOrigin(value.expectedProjectUrl) === value.expectedProjectUrl &&
    value.authorityHandleCount === AUTHORITY_HANDLE_COUNT &&
    value.configurationRevalidated === true &&
    value.configurationStable === true &&
    value.contractStackValidated === true &&
    value.blockers.length === 0 &&
    value.syntheticOnly === true &&
    value.liveRuntimeAuthorized === false &&
    value.liveMaterializationAuthorizationRequired === true &&
    value.liveRemoteIdentityEvidenceAccepted === false &&
    value.liveSessionBootstrapEvidenceAccepted === false &&
    value.explicitMaterializationGrantAccepted === false &&
    value.providerIoAuthorized === false &&
    value.sdkInstantiationAuthorized === false &&
    value.clientMaterializationAuthorized === false &&
    value.materializerMayExecute === false &&
    value.remoteIdentityVerified === false &&
    value.sessionBootstrapProven === false &&
    value.providerParityProven === false &&
    value.runtimeActivationAuthorized === false &&
    value.deploymentAuthorized === false &&
    value.activationFactsProduced === false
  );
}

function baseDecision(): Omit<
  LiveMaterializationAuthorizationEvidenceContractDecision,
  | "state"
  | "projectBindingId"
  | "expectedProjectRef"
  | "expectedProjectUrl"
  | "authorityHandleCount"
  | "blockers"
  | "evidenceCollectionAuthorization"
  | "remoteIdentityEvidenceReceipt"
  | "sessionBootstrapEvidenceReceipt"
  | "materializationGrantAcceptance"
  | "circularDependencyResolvedBySeparateEvidenceCollectionAuthority"
> {
  return {
    version: LIVE_MATERIALIZATION_AUTHORIZATION_EVIDENCE_CONTRACT_VERSION,
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    twoPhaseAuthorizationRequired: true,
    evidenceCollectionAuthorizationAccepted: false,
    evidenceCollectionProviderIoAuthorized: false,
    liveRemoteIdentityEvidenceAccepted: false,
    liveSessionBootstrapEvidenceAccepted: false,
    explicitMaterializationGrantAccepted: false,
    materializationGrantConsumed: false,
    materializationProviderIoAuthorized: false,
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

function evidenceCollectionAuthorization(
  gate: ProviderClientMaterializationGateDecision,
): EvidenceCollectionAuthorizationContract {
  return {
    channel: "live_materialization_evidence_collection_authorization",
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    projectBindingId: gate.projectBindingId!,
    expectedProjectRef: gate.expectedProjectRef!,
    expectedProjectUrl: gate.expectedProjectUrl!,
    requiredSource: "external_materialization_control_plane",
    authorizationKind: "scoped_live_evidence_collection_lease",
    maxTtlSeconds: MAX_AUTHORIZATION_TTL_SECONDS,
    singleProjectOnly: true,
    syntheticFixtureOnly: true,
    exactActionSetRequired: true,
    allowedActions: [...LIVE_EVIDENCE_COLLECTION_ACTIONS],
    maxUsesPerAction: 1,
    arbitraryRpcAllowed: false,
    arbitraryStorageAllowed: false,
    providerClientMaterializationAllowed: false,
    sdkFactoryInvocationAllowed: false,
    runtimeActivationAllowed: false,
    deploymentAllowed: false,
    receiptRequired: true,
    receiptMustBindAuthorizationId: true,
    receiptMustBindProjectIdentity: true,
    receiptMustBindCompletedActions: true,
    receiptMustBeProducedExternally: true,
  };
}

function remoteIdentityReceipt(
  gate: ProviderClientMaterializationGateDecision,
): LiveRemoteIdentityEvidenceReceiptContract {
  return {
    evidenceKind: "live_remote_project_identity",
    requiredSource: "authorized_external_live_provider_attestation",
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    projectBindingId: gate.projectBindingId!,
    expectedProjectRef: gate.expectedProjectRef!,
    expectedProjectUrl: gate.expectedProjectUrl!,
    evidenceCollectionAuthorizationReceiptRequired: true,
    providerIoObservedRequired: true,
    remoteIdentityVerifiedRequired: true,
    externalVerifierReceiptRequired: true,
    evidenceIdRequired: true,
    observedAtRequired: true,
    maxEvidenceAgeSeconds: MAX_AUTHORIZATION_TTL_SECONDS,
    credentialsForbiddenInReceipt: true,
    authorityHandleIdsForbiddenInReceipt: true,
    runtimeActivationImplied: false,
    deploymentImplied: false,
  };
}

function sessionReceipt(
  gate: ProviderClientMaterializationGateDecision,
): LiveSessionBootstrapEvidenceReceiptContract {
  return {
    evidenceKind: "live_synthetic_session_bootstrap",
    requiredSource: "authorized_external_live_provider_session_bootstrap",
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    projectBindingId: gate.projectBindingId!,
    evidenceCollectionAuthorizationReceiptRequired: true,
    ownerAndIntruderRequired: true,
    issueAndResolveRequiredForEachActor: true,
    distinctSubjectsRequired: true,
    disposableFixtureRequired: true,
    capabilityLifetimeContainmentRequired: true,
    providerIoObservedRequired: true,
    sessionBootstrapProvenRequired: true,
    externalVerifierReceiptRequired: true,
    evidenceIdRequired: true,
    observedAtRequired: true,
    maxEvidenceAgeSeconds: MAX_AUTHORIZATION_TTL_SECONDS,
    accessTokenValuesForbiddenInReceipt: true,
    syntheticEmailValuesForbiddenInReceipt: true,
    authorityHandleIdsForbiddenInReceipt: true,
    runtimeActivationImplied: false,
    deploymentImplied: false,
  };
}

function grantAcceptance(
  gate: ProviderClientMaterializationGateDecision,
): MaterializationGrantAcceptanceContract {
  return {
    channel: "provider_client_materialization_authorization",
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    projectBindingId: gate.projectBindingId!,
    expectedProjectRef: gate.expectedProjectRef!,
    expectedProjectUrl: gate.expectedProjectUrl!,
    authorityHandleCount: AUTHORITY_HANDLE_COUNT,
    requiredSource: "external_materialization_control_plane",
    action: "materialize_qualified_dev_provider_clients",
    maxTtlSeconds: MAX_AUTHORIZATION_TTL_SECONDS,
    singleUseRequired: true,
    atomicConsumptionRequired: true,
    consumedGrantRequired: false,
    mustBindProjectIdentity: true,
    mustBindExactAuthoritySetViaExternalReceipt: true,
    rawAuthorityHandleIdsForbiddenInContractOutput: true,
    mustBindEvidenceCollectionAuthorizationReceipt: true,
    mustBindLiveRemoteIdentityEvidenceId: true,
    mustBindLiveSessionBootstrapEvidenceId: true,
    liveEvidenceMustPredateGrant: true,
    liveEvidenceMustBeFreshAtGrantIssue: true,
    liveEvidenceAuthenticityMustBeExternallyVerified: true,
    materializerMayExecuteBeforeAtomicConsumption: false,
    runtimeActivationImplied: false,
    deploymentImplied: false,
  };
}

export function evaluateLiveMaterializationAuthorizationEvidenceContract(
  input: LiveMaterializationAuthorizationEvidenceContractInput,
): LiveMaterializationAuthorizationEvidenceContractDecision {
  const gate = input.materializationGate;
  const blockers: LiveMaterializationAuthorizationEvidenceContractBlocker[] = [];
  const gateReady = readyGate(gate);
  if (!gateReady) {
    blockers.push({ code: "materialization_gate_not_ready", scope: "materialization_gate" });
  }

  const requirementValid = gateReady && authorizationRequirementValid(gate.authorizationRequirement, gate);
  if (gateReady && !requirementValid) {
    blockers.push({
      code: "materialization_authorization_requirement_invalid",
      scope: "authorization_requirement",
    });
  }

  const ready = gateReady && requirementValid;
  return {
    ...baseDecision(),
    state: ready ? "evidence_authorization_contract_ready" : "blocked_materialization_gate_invalid",
    projectBindingId: ready ? gate.projectBindingId : null,
    expectedProjectRef: ready ? gate.expectedProjectRef : null,
    expectedProjectUrl: ready ? gate.expectedProjectUrl : null,
    authorityHandleCount: ready ? gate.authorityHandleCount : 0,
    blockers,
    evidenceCollectionAuthorization: ready ? evidenceCollectionAuthorization(gate) : null,
    remoteIdentityEvidenceReceipt: ready ? remoteIdentityReceipt(gate) : null,
    sessionBootstrapEvidenceReceipt: ready ? sessionReceipt(gate) : null,
    materializationGrantAcceptance: ready ? grantAcceptance(gate) : null,
    circularDependencyResolvedBySeparateEvidenceCollectionAuthority: ready,
  };
}

export function liveMaterializationAuthorizationEvidenceContractProducesNoActivationFacts(): Record<string, never> {
  return {};
}

export function liveMaterializationAuthorizationEvidenceContractProducesNoProviderExecutionFacts(): Record<
  string,
  never
> {
  return {};
}
