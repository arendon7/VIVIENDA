import type { ProviderClientMaterializationGateDecision } from "./authorized-client-materialization-gate";
import type { LiveMaterializationAuthorizationEvidenceContractDecision } from "./live-materialization-authorization-evidence-contract";
import type { StructuralEvidenceCollectionAuthorizationResult } from "./evidence-collection-authorization-executor";
import type { ExternalEvidenceCollectionReceiptVerificationGateDecision } from "./external-evidence-collection-receipt-verification-gate";
import type { IndependentReceiptAuthenticityEvidenceDecision } from "./independent-receipt-authenticity-evidence-contract";
import type { IndependentVerifierTrustAnchorGateDecision } from "./independent-verifier-trust-anchor-gate";

export const LIVE_EVIDENCE_TRUST_READINESS_GATE_VERSION =
  "V0.23.41-LIVE-EVIDENCE-TRUST-READINESS-GATE-V1" as const;

const DEV_PROJECT_LABEL = "vivienda-dev" as const;
const AUTHORITY_HANDLE_COUNT = 5 as const;
const BINDING_ID = /^[A-Za-z0-9_-]{8,80}$/;
const PROJECT_REF = /^[a-z0-9]{8,40}$/;
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;

export type LiveEvidenceTrustExecutionStage =
  | "authorize_phase_a_evidence_collection"
  | "execute_live_identity_and_session_evidence"
  | "verify_receipt_authenticity_and_verifier_trust"
  | "accept_live_evidence_receipts"
  | "issue_and_atomically_consume_materialization_grant"
  | "materialize_qualified_dev_provider_clients";

export type LiveEvidenceTrustExternalExecutionPlan = {
  channel: "live_evidence_trust_external_execution_plan";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  expectedProjectRef: string;
  expectedProjectUrl: string;
  stages: readonly LiveEvidenceTrustExecutionStage[];
  strictOrderingRequired: true;
  separateAuthorizationRequiredForExternalExecution: true;
  phaseAEvidenceCollectionAuthorizationRequired: true;
  independentTrustVerificationRequiredBeforeReceiptAcceptance: true;
  liveRemoteIdentityEvidenceRequired: true;
  liveOwnerAndIntruderSessionEvidenceRequired: true;
  finalSingleUseMaterializationGrantRequired: true;
  finalGrantAtomicConsumptionRequired: true;
  providerClientMaterializationLast: true;
  offlineArtifactsMayNotSubstituteLiveEvidence: true;
  structuralTestDoublesMayNotSatisfyExternalStages: true;
  noFurtherOfflineTrustPromotionAllowed: true;
  externalExecutionAuthorized: false;
  externalExecutionStarted: false;
  externalExecutionCompleted: false;
  providerIoAuthorized: false;
  materializationAuthorized: false;
  runtimeActivationAuthorized: false;
  deploymentAuthorized: false;
};

export type LiveEvidenceTrustReadinessBlockerCode =
  | "materialization_gate_invalid"
  | "authorization_evidence_contract_invalid"
  | "phase_a_structural_executor_invalid"
  | "receipt_verification_gate_invalid"
  | "authenticity_evidence_contract_invalid"
  | "trust_anchor_offline_closure_invalid"
  | "project_binding_drift"
  | "project_identity_drift"
  | "offline_authority_promotion_detected";

export type LiveEvidenceTrustReadinessBlocker = {
  code: LiveEvidenceTrustReadinessBlockerCode;
  scope: "v0.23.35" | "v0.23.36" | "v0.23.37" | "v0.23.38" | "v0.23.39" | "v0.23.40" | "cross_slice";
};

export type LiveEvidenceTrustReadinessDecision = {
  version: typeof LIVE_EVIDENCE_TRUST_READINESS_GATE_VERSION;
  state: "offline_architecture_complete_external_execution_blocked" | "blocked_offline_stack_inconsistent";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string | null;
  expectedProjectRef: string | null;
  expectedProjectUrl: string | null;
  authorityHandleCount: number;
  blockers: LiveEvidenceTrustReadinessBlocker[];
  externalExecutionPlan: LiveEvidenceTrustExternalExecutionPlan | null;
  v02335MaterializationGateValidated: boolean;
  v02336TwoPhaseAuthorizationValidated: boolean;
  v02337StructuralAuthorizationExchangeValidated: boolean;
  v02338ReceiptStructureValidated: boolean;
  v02339AuthenticityBindingValidated: boolean;
  v02340OfflineTrustClosureValidated: boolean;
  crossSliceProjectBindingStable: boolean;
  crossSliceProjectIdentityStable: boolean;
  offlineArchitectureComplete: boolean;
  offlineTrustChainClosed: boolean;
  nextProgressRequiresExternalExecution: boolean;
  noFurtherOfflineTrustPromotionAllowed: true;
  externalExecutionSeparatelyAuthorized: false;
  phaseAEvidenceCollectionAuthorizationAccepted: false;
  evidenceCollectionProviderIoAuthorized: false;
  liveRemoteIdentityEvidenceAccepted: false;
  liveSessionBootstrapEvidenceAccepted: false;
  verifierTrustAnchorExternallyVerified: false;
  authenticityEvidenceAccepted: false;
  externalBoundaryVerificationProven: false;
  externalLeaseReceiptAccepted: false;
  externalConsumptionReceiptAccepted: false;
  evidenceCollectionReceiptsVerified: false;
  explicitMaterializationGrantAccepted: false;
  materializationGrantConsumed: false;
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

export type LiveEvidenceTrustReadinessInput = {
  materializationGate: ProviderClientMaterializationGateDecision;
  authorizationEvidenceContract: LiveMaterializationAuthorizationEvidenceContractDecision;
  phaseAStructuralExecutor: StructuralEvidenceCollectionAuthorizationResult;
  receiptVerificationGate: ExternalEvidenceCollectionReceiptVerificationGateDecision;
  authenticityEvidenceContract: IndependentReceiptAuthenticityEvidenceDecision;
  trustAnchorOfflineClosure: IndependentVerifierTrustAnchorGateDecision;
};

function normalizeOrigin(value: string): string | null {
  if (typeof value !== "string" || value.length > 2048 || CONTROL_CHARACTER.test(value)) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    return null;
  }
  return parsed.origin;
}

function v35Valid(value: ProviderClientMaterializationGateDecision): boolean {
  return value.version === "V0.23.35-AUTHORIZED-CLIENT-MATERIALIZATION-GATE-V1" &&
    value.state === "ready_for_live_materialization_authorization" && value.provider === "supabase" &&
    value.projectLabel === DEV_PROJECT_LABEL && typeof value.projectBindingId === "string" && BINDING_ID.test(value.projectBindingId) &&
    typeof value.expectedProjectRef === "string" && PROJECT_REF.test(value.expectedProjectRef) &&
    typeof value.expectedProjectUrl === "string" && normalizeOrigin(value.expectedProjectUrl) === value.expectedProjectUrl &&
    value.authorityHandleCount === AUTHORITY_HANDLE_COUNT && value.configurationRevalidated === true &&
    value.configurationStable === true && value.contractStackValidated === true && value.blockers.length === 0 &&
    value.syntheticOnly === true && value.liveRuntimeAuthorized === false && value.liveMaterializationAuthorizationRequired === true &&
    value.liveRemoteIdentityEvidenceAccepted === false && value.liveSessionBootstrapEvidenceAccepted === false &&
    value.explicitMaterializationGrantAccepted === false && value.providerIoAuthorized === false &&
    value.sdkInstantiationAuthorized === false && value.clientMaterializationAuthorized === false &&
    value.materializerMayExecute === false && value.remoteIdentityVerified === false && value.sessionBootstrapProven === false &&
    value.providerParityProven === false && value.runtimeActivationAuthorized === false && value.deploymentAuthorized === false &&
    value.activationFactsProduced === false;
}

function v36Valid(value: LiveMaterializationAuthorizationEvidenceContractDecision): boolean {
  return value.version === "V0.23.36-LIVE-MATERIALIZATION-AUTHORIZATION-EVIDENCE-CONTRACT-V1" &&
    value.state === "evidence_authorization_contract_ready" && value.provider === "supabase" && value.projectLabel === DEV_PROJECT_LABEL &&
    typeof value.projectBindingId === "string" && typeof value.expectedProjectRef === "string" && typeof value.expectedProjectUrl === "string" &&
    value.authorityHandleCount === AUTHORITY_HANDLE_COUNT && value.blockers.length === 0 && value.twoPhaseAuthorizationRequired === true &&
    value.circularDependencyResolvedBySeparateEvidenceCollectionAuthority === true &&
    value.evidenceCollectionAuthorizationAccepted === false && value.evidenceCollectionProviderIoAuthorized === false &&
    value.liveRemoteIdentityEvidenceAccepted === false && value.liveSessionBootstrapEvidenceAccepted === false &&
    value.explicitMaterializationGrantAccepted === false && value.materializationGrantConsumed === false &&
    value.materializationProviderIoAuthorized === false && value.sdkInstantiationAuthorized === false &&
    value.clientMaterializationAuthorized === false && value.materializerMayExecute === false &&
    value.remoteIdentityVerified === false && value.sessionBootstrapProven === false && value.providerParityProven === false &&
    value.runtimeActivationAuthorized === false && value.deploymentAuthorized === false && value.activationFactsProduced === false;
}

function v37Valid(value: StructuralEvidenceCollectionAuthorizationResult): boolean {
  return value.version === "V0.23.37-EVIDENCE-COLLECTION-AUTHORIZATION-EXECUTOR-V1" &&
    value.state === "structural_authorization_exchange_satisfied" && value.provider === "supabase" && value.projectLabel === DEV_PROJECT_LABEL &&
    typeof value.projectBindingId === "string" && typeof value.expectedProjectRef === "string" && typeof value.expectedProjectUrl === "string" &&
    value.structuralTransportInvoked === true && value.structuralLeaseEnvelopeValidated === true &&
    value.externalLeaseIssuanceRequired === true && value.externallyIssuedLeaseProven === false &&
    value.externalLeaseReceiptAccepted === false && value.evidenceCollectionAuthorizationAccepted === false &&
    value.evidenceCollectionProviderIoAuthorized === false && value.externalConsumptionReceiptAccepted === false &&
    value.liveRemoteIdentityEvidenceAccepted === false && value.liveSessionBootstrapEvidenceAccepted === false &&
    value.explicitMaterializationGrantAccepted === false && value.clientMaterializationAuthorized === false &&
    value.materializerMayExecute === false && value.providerParityProven === false && value.runtimeActivationAuthorized === false &&
    value.deploymentAuthorized === false && value.activationFactsProduced === false;
}

function v38Valid(value: ExternalEvidenceCollectionReceiptVerificationGateDecision): boolean {
  return value.version === "V0.23.38-EXTERNAL-EVIDENCE-COLLECTION-RECEIPT-VERIFICATION-GATE-V1" &&
    value.state === "receipt_envelopes_structurally_verified" && value.provider === "supabase" && value.projectLabel === DEV_PROJECT_LABEL &&
    typeof value.projectBindingId === "string" && value.blockers.length === 0 && value.leaseEnvelopeStructurallyVerified === true &&
    value.consumptionEnvelopeStructurallyVerified === true && value.receiptCorrelationStructurallyVerified === true &&
    value.receiptTimelineStructurallyVerified === true && value.authenticityVerificationStillRequired === true &&
    value.externalBoundaryVerificationProven === false && value.externalLeaseReceiptAccepted === false &&
    value.evidenceCollectionAuthorizationAccepted === false && value.evidenceCollectionProviderIoAuthorized === false &&
    value.externalConsumptionReceiptAccepted === false && value.evidenceCollectionReceiptsVerified === false &&
    value.liveRemoteIdentityEvidenceAccepted === false && value.liveSessionBootstrapEvidenceAccepted === false &&
    value.explicitMaterializationGrantAccepted === false && value.clientMaterializationAuthorized === false &&
    value.materializerMayExecute === false && value.providerParityProven === false && value.runtimeActivationAuthorized === false &&
    value.deploymentAuthorized === false && value.activationFactsProduced === false;
}

function v39Valid(value: IndependentReceiptAuthenticityEvidenceDecision): boolean {
  return value.version === "V0.23.39-INDEPENDENT-RECEIPT-AUTHENTICITY-EVIDENCE-CONTRACT-V1" &&
    value.state === "authenticity_evidence_structurally_bound" && value.provider === "supabase" && value.projectLabel === DEV_PROJECT_LABEL &&
    typeof value.projectBindingId === "string" && value.blockers.length === 0 && value.canonicalReceiptDigestsComputed === true &&
    value.authenticityEvidenceEnvelopeStructurallyVerified === true && value.authenticityEvidenceReceiptBindingVerified === true &&
    value.authenticityEvidenceFreshnessStructurallyVerified === true && value.authenticityClaimObserved === true &&
    value.independentVerifierTrustStillRequired === true && value.verifierTrustAnchorExternallyVerified === false &&
    value.authenticityEvidenceAccepted === false && value.externalBoundaryVerificationProven === false &&
    value.evidenceCollectionProviderIoAuthorized === false && value.explicitMaterializationGrantAccepted === false &&
    value.clientMaterializationAuthorized === false && value.materializerMayExecute === false && value.providerParityProven === false &&
    value.runtimeActivationAuthorized === false && value.deploymentAuthorized === false && value.activationFactsProduced === false;
}

function v40Valid(value: IndependentVerifierTrustAnchorGateDecision): boolean {
  return value.version === "V0.23.40-INDEPENDENT-VERIFIER-TRUST-ANCHOR-GATE-V1" &&
    value.state === "trust_anchor_evidence_structurally_verified" && value.provider === "supabase" && value.projectLabel === DEV_PROJECT_LABEL &&
    typeof value.projectBindingId === "string" && value.blockers.length === 0 && value.trustRegistryEvidenceStructurallyVerified === true &&
    value.trustRegistryBindingVerified === true && value.trustAnchorTemporalPreconditionVerified === true &&
    value.revocationObservationStructurallyCurrent === true && value.offlineClosureReached === true && value.offlineTrustChainClosed === true &&
    value.externalTrustVerificationExecutionRequired === true && value.noFurtherOfflineTrustPromotionAllowed === true &&
    value.externalTrustVerificationExecution?.required === true && value.externalTrustVerificationExecution.offlineSatisfactionAllowed === false &&
    value.externalTrustVerificationExecution.separateAuthorizationRequired === true &&
    value.externalTrustVerificationExecution.performed === false && value.externalTrustVerificationExecution.verified === false &&
    value.verifierTrustAnchorExternallyVerified === false && value.authenticityEvidenceAccepted === false &&
    value.externalBoundaryVerificationProven === false && value.evidenceCollectionProviderIoAuthorized === false &&
    value.explicitMaterializationGrantAccepted === false && value.clientMaterializationAuthorized === false &&
    value.materializerMayExecute === false && value.providerParityProven === false && value.runtimeActivationAuthorized === false &&
    value.deploymentAuthorized === false && value.activationFactsProduced === false;
}

function baseDecision(): Omit<LiveEvidenceTrustReadinessDecision,
  "state" | "projectBindingId" | "expectedProjectRef" | "expectedProjectUrl" | "authorityHandleCount" | "blockers" |
  "externalExecutionPlan" | "v02335MaterializationGateValidated" | "v02336TwoPhaseAuthorizationValidated" |
  "v02337StructuralAuthorizationExchangeValidated" | "v02338ReceiptStructureValidated" |
  "v02339AuthenticityBindingValidated" | "v02340OfflineTrustClosureValidated" | "crossSliceProjectBindingStable" |
  "crossSliceProjectIdentityStable" | "offlineArchitectureComplete" | "offlineTrustChainClosed" |
  "nextProgressRequiresExternalExecution"> {
  return {
    version: LIVE_EVIDENCE_TRUST_READINESS_GATE_VERSION,
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    noFurtherOfflineTrustPromotionAllowed: true,
    externalExecutionSeparatelyAuthorized: false,
    phaseAEvidenceCollectionAuthorizationAccepted: false,
    evidenceCollectionProviderIoAuthorized: false,
    liveRemoteIdentityEvidenceAccepted: false,
    liveSessionBootstrapEvidenceAccepted: false,
    verifierTrustAnchorExternallyVerified: false,
    authenticityEvidenceAccepted: false,
    externalBoundaryVerificationProven: false,
    externalLeaseReceiptAccepted: false,
    externalConsumptionReceiptAccepted: false,
    evidenceCollectionReceiptsVerified: false,
    explicitMaterializationGrantAccepted: false,
    materializationGrantConsumed: false,
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

function executionPlan(binding: string, ref: string, url: string): LiveEvidenceTrustExternalExecutionPlan {
  return {
    channel: "live_evidence_trust_external_execution_plan",
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    projectBindingId: binding,
    expectedProjectRef: ref,
    expectedProjectUrl: url,
    stages: [
      "authorize_phase_a_evidence_collection",
      "execute_live_identity_and_session_evidence",
      "verify_receipt_authenticity_and_verifier_trust",
      "accept_live_evidence_receipts",
      "issue_and_atomically_consume_materialization_grant",
      "materialize_qualified_dev_provider_clients",
    ],
    strictOrderingRequired: true,
    separateAuthorizationRequiredForExternalExecution: true,
    phaseAEvidenceCollectionAuthorizationRequired: true,
    independentTrustVerificationRequiredBeforeReceiptAcceptance: true,
    liveRemoteIdentityEvidenceRequired: true,
    liveOwnerAndIntruderSessionEvidenceRequired: true,
    finalSingleUseMaterializationGrantRequired: true,
    finalGrantAtomicConsumptionRequired: true,
    providerClientMaterializationLast: true,
    offlineArtifactsMayNotSubstituteLiveEvidence: true,
    structuralTestDoublesMayNotSatisfyExternalStages: true,
    noFurtherOfflineTrustPromotionAllowed: true,
    externalExecutionAuthorized: false,
    externalExecutionStarted: false,
    externalExecutionCompleted: false,
    providerIoAuthorized: false,
    materializationAuthorized: false,
    runtimeActivationAuthorized: false,
    deploymentAuthorized: false,
  };
}

export function evaluateLiveEvidenceTrustReadiness(input: LiveEvidenceTrustReadinessInput): LiveEvidenceTrustReadinessDecision {
  const blockers: LiveEvidenceTrustReadinessBlocker[] = [];
  const s35 = v35Valid(input.materializationGate);
  const s36 = v36Valid(input.authorizationEvidenceContract);
  const s37 = v37Valid(input.phaseAStructuralExecutor);
  const s38 = v38Valid(input.receiptVerificationGate);
  const s39 = v39Valid(input.authenticityEvidenceContract);
  const s40 = v40Valid(input.trustAnchorOfflineClosure);
  if (!s35) blockers.push({ code: "materialization_gate_invalid", scope: "v0.23.35" });
  if (!s36) blockers.push({ code: "authorization_evidence_contract_invalid", scope: "v0.23.36" });
  if (!s37) blockers.push({ code: "phase_a_structural_executor_invalid", scope: "v0.23.37" });
  if (!s38) blockers.push({ code: "receipt_verification_gate_invalid", scope: "v0.23.38" });
  if (!s39) blockers.push({ code: "authenticity_evidence_contract_invalid", scope: "v0.23.39" });
  if (!s40) blockers.push({ code: "trust_anchor_offline_closure_invalid", scope: "v0.23.40" });

  const bindings = [
    input.materializationGate.projectBindingId,
    input.authorizationEvidenceContract.projectBindingId,
    input.phaseAStructuralExecutor.projectBindingId,
    input.receiptVerificationGate.projectBindingId,
    input.authenticityEvidenceContract.projectBindingId,
    input.trustAnchorOfflineClosure.projectBindingId,
  ];
  const binding = bindings[0];
  const bindingStable = blockers.length === 0 && typeof binding === "string" && bindings.every((value) => value === binding);
  if (blockers.length === 0 && !bindingStable) blockers.push({ code: "project_binding_drift", scope: "cross_slice" });

  const ref = input.materializationGate.expectedProjectRef;
  const url = input.materializationGate.expectedProjectUrl;
  const identityStable = bindingStable && typeof ref === "string" && typeof url === "string" &&
    input.authorizationEvidenceContract.expectedProjectRef === ref && input.authorizationEvidenceContract.expectedProjectUrl === url &&
    input.phaseAStructuralExecutor.expectedProjectRef === ref && input.phaseAStructuralExecutor.expectedProjectUrl === url &&
    input.receiptVerificationGate.expectedProjectRef === ref && input.receiptVerificationGate.expectedProjectUrl === url;
  if (bindingStable && !identityStable) blockers.push({ code: "project_identity_drift", scope: "cross_slice" });

  const pass = blockers.length === 0;
  return {
    ...baseDecision(),
    state: pass ? "offline_architecture_complete_external_execution_blocked" : "blocked_offline_stack_inconsistent",
    projectBindingId: pass ? binding : null,
    expectedProjectRef: pass ? ref : null,
    expectedProjectUrl: pass ? url : null,
    authorityHandleCount: pass ? AUTHORITY_HANDLE_COUNT : 0,
    blockers,
    externalExecutionPlan: pass && binding && ref && url ? executionPlan(binding, ref, url) : null,
    v02335MaterializationGateValidated: s35,
    v02336TwoPhaseAuthorizationValidated: s36,
    v02337StructuralAuthorizationExchangeValidated: s37,
    v02338ReceiptStructureValidated: s38,
    v02339AuthenticityBindingValidated: s39,
    v02340OfflineTrustClosureValidated: s40,
    crossSliceProjectBindingStable: bindingStable,
    crossSliceProjectIdentityStable: identityStable,
    offlineArchitectureComplete: pass,
    offlineTrustChainClosed: pass && s40,
    nextProgressRequiresExternalExecution: pass,
  };
}

export function liveEvidenceTrustReadinessProducesNoActivationFacts(): Record<string, never> {
  return {};
}

export function liveEvidenceTrustReadinessProducesNoProviderExecutionFacts(): Record<string, never> {
  return {};
}
