import { LIVE_EVIDENCE_COLLECTION_ACTIONS, type LiveEvidenceCollectionAction } from "./live-materialization-authorization-evidence-contract";
import type { StructuralEvidenceCollectionAuthorizationResult } from "./evidence-collection-authorization-executor";

export const EXTERNAL_EVIDENCE_COLLECTION_RECEIPT_VERIFICATION_GATE_VERSION =
  "V0.23.38-EXTERNAL-EVIDENCE-COLLECTION-RECEIPT-VERIFICATION-GATE-V1" as const;

const DEV_PROJECT_LABEL = "vivienda-dev" as const;
const MAX_TTL_MS = 300 * 1000;
const MAX_CLOCK_SKEW_MS = 60 * 1000;
const OPAQUE = /^[A-Za-z0-9_.:-]{8,160}$/;
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;

export type ExternalEvidenceCollectionLeaseReceiptEnvelope = {
  channel: "live_materialization_evidence_collection_authorization_receipt";
  source: "external_materialization_control_plane";
  provenance: "externally_issued_and_boundary_verified";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  expectedProjectRef: string;
  expectedProjectUrl: string;
  authorizationId: string;
  issuanceReceiptId: string;
  issuedAt: string;
  expiresAt: string;
  allowedActions: readonly LiveEvidenceCollectionAction[];
  maxUsesPerAction: 1;
  syntheticFixtureOnly: true;
  credentialsIncluded: false;
  authorityHandleIdsIncluded: false;
  providerClientMaterializationAllowed: false;
  runtimeActivationAllowed: false;
  deploymentAllowed: false;
};

export type ExternalEvidenceCollectionActionUseEnvelope = {
  action: LiveEvidenceCollectionAction;
  useCount: 1;
  usedAt: string;
  providerIoObserved: true;
};

export type ExternalEvidenceCollectionConsumptionReceiptEnvelope = {
  channel: "live_materialization_evidence_collection_consumption_receipt";
  source: "external_materialization_control_plane";
  provenance: "externally_observed_action_consumption";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  expectedProjectRef: string;
  expectedProjectUrl: string;
  authorizationId: string;
  issuanceReceiptId: string;
  completionReceiptId: string;
  completedAt: string;
  actionUses: readonly ExternalEvidenceCollectionActionUseEnvelope[];
  credentialsIncluded: false;
  accessTokenValuesIncluded: false;
  syntheticEmailValuesIncluded: false;
  authorityHandleIdsIncluded: false;
  providerClientMaterializationAuthorized: false;
  runtimeActivationAuthorized: false;
  deploymentAuthorized: false;
};

export type ExternalReceiptAuthenticityVerificationEvidenceContract = {
  channel: "evidence_collection_receipt_authenticity_verification";
  requiredSource: "independent_external_receipt_verifier";
  requiredProvenance: "out_of_process_receipt_authenticity_verification";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  verificationEvidenceIdRequired: true;
  verifierIdentityRefRequired: true;
  verifiedAtRequired: true;
  maxVerificationAgeSeconds: 300;
  issuanceReceiptIdBindingRequired: true;
  consumptionReceiptIdBindingRequired: true;
  issuanceReceiptDigestRequired: true;
  consumptionReceiptDigestRequired: true;
  projectIdentityBindingRequired: true;
  authenticityMethodRequired: "cryptographic_signature_or_control_plane_audit_attestation";
  structuralValidationAloneAccepted: false;
  selfReportedProvenanceAccepted: false;
  credentialsForbidden: true;
  accessTokenValuesForbidden: true;
  syntheticEmailValuesForbidden: true;
  authorityHandleIdsForbidden: true;
  materializationAuthorityImplied: false;
  runtimeActivationImplied: false;
  deploymentImplied: false;
};

export type ExternalEvidenceCollectionReceiptVerificationBlockerCode =
  | "upstream_structural_result_invalid"
  | "lease_receipt_envelope_invalid"
  | "lease_receipt_identity_mismatch"
  | "lease_receipt_scope_mismatch"
  | "lease_receipt_lifetime_invalid"
  | "consumption_receipt_envelope_invalid"
  | "consumption_receipt_correlation_mismatch"
  | "consumption_receipt_scope_mismatch"
  | "consumption_receipt_timeline_invalid";

export type ExternalEvidenceCollectionReceiptVerificationBlocker = {
  code: ExternalEvidenceCollectionReceiptVerificationBlockerCode;
  scope: "upstream" | "lease_receipt" | "consumption_receipt";
};

export type ExternalEvidenceCollectionReceiptVerificationGateDecision = {
  version: typeof EXTERNAL_EVIDENCE_COLLECTION_RECEIPT_VERIFICATION_GATE_VERSION;
  state: "receipt_envelopes_structurally_verified" | "blocked_receipt_envelopes_invalid";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string | null;
  expectedProjectRef: string | null;
  expectedProjectUrl: string | null;
  authorizationId: string | null;
  issuanceReceiptId: string | null;
  completionReceiptId: string | null;
  blockers: ExternalEvidenceCollectionReceiptVerificationBlocker[];
  authenticityVerificationEvidence: ExternalReceiptAuthenticityVerificationEvidenceContract | null;
  leaseEnvelopeStructurallyVerified: boolean;
  consumptionEnvelopeStructurallyVerified: boolean;
  receiptCorrelationStructurallyVerified: boolean;
  receiptTimelineStructurallyVerified: boolean;
  authenticityVerificationStillRequired: true;
  externalBoundaryVerificationProven: false;
  externalLeaseReceiptAccepted: false;
  evidenceCollectionAuthorizationAccepted: false;
  evidenceCollectionProviderIoAuthorized: false;
  externalConsumptionReceiptAccepted: false;
  evidenceCollectionReceiptsVerified: false;
  liveRemoteIdentityEvidenceAccepted: false;
  liveSessionBootstrapEvidenceAccepted: false;
  explicitMaterializationGrantAccepted: false;
  clientMaterializationAuthorized: false;
  materializerMayExecute: false;
  providerParityProven: false;
  runtimeActivationAuthorized: false;
  deploymentAuthorized: false;
  activationFactsProduced: false;
};

export type ExternalEvidenceCollectionReceiptVerificationGateInput = {
  upstream: StructuralEvidenceCollectionAuthorizationResult;
  leaseReceipt: ExternalEvidenceCollectionLeaseReceiptEnvelope;
  consumptionReceipt: ExternalEvidenceCollectionConsumptionReceiptEnvelope;
  observedAt: string;
};

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
  ) return null;
  return parsed.origin;
}

function exactActions(value: readonly LiveEvidenceCollectionAction[]): boolean {
  return Array.isArray(value) &&
    value.length === LIVE_EVIDENCE_COLLECTION_ACTIONS.length &&
    value.every((action, index) => action === LIVE_EVIDENCE_COLLECTION_ACTIONS[index]);
}

function upstreamValid(value: StructuralEvidenceCollectionAuthorizationResult): boolean {
  return (
    value.version === "V0.23.37-EVIDENCE-COLLECTION-AUTHORIZATION-EXECUTOR-V1" &&
    value.state === "structural_authorization_exchange_satisfied" &&
    value.provider === "supabase" &&
    value.projectLabel === DEV_PROJECT_LABEL &&
    value.structuralTransportInvoked === true &&
    value.structuralLeaseEnvelopeValidated === true &&
    value.externalLeaseIssuanceRequired === true &&
    value.externallyIssuedLeaseProven === false &&
    value.externalLeaseReceiptAccepted === false &&
    value.evidenceCollectionAuthorizationAccepted === false &&
    value.evidenceCollectionProviderIoAuthorized === false &&
    value.externalConsumptionReceiptAccepted === false &&
    value.liveRemoteIdentityEvidenceAccepted === false &&
    value.liveSessionBootstrapEvidenceAccepted === false &&
    value.explicitMaterializationGrantAccepted === false &&
    value.clientMaterializationAuthorized === false &&
    value.materializerMayExecute === false &&
    value.providerParityProven === false &&
    value.runtimeActivationAuthorized === false &&
    value.deploymentAuthorized === false &&
    value.activationFactsProduced === false &&
    value.externalLeaseReceiptAcceptance.structuralTestDoubleAcceptedAsExternalEvidence === false &&
    value.externalLeaseReceiptAcceptance.externalBoundaryVerificationRequired === true &&
    value.externalConsumptionReceiptAcceptance.structuralTestDoubleAcceptedAsExternalEvidence === false &&
    value.externalConsumptionReceiptAcceptance.externalBoundaryVerificationRequired === true
  );
}

function baseDecision(): Omit<ExternalEvidenceCollectionReceiptVerificationGateDecision,
  "state" | "projectBindingId" | "expectedProjectRef" | "expectedProjectUrl" | "authorizationId" |
  "issuanceReceiptId" | "completionReceiptId" | "blockers" | "authenticityVerificationEvidence" |
  "leaseEnvelopeStructurallyVerified" | "consumptionEnvelopeStructurallyVerified" |
  "receiptCorrelationStructurallyVerified" | "receiptTimelineStructurallyVerified"> {
  return {
    version: EXTERNAL_EVIDENCE_COLLECTION_RECEIPT_VERIFICATION_GATE_VERSION,
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    authenticityVerificationStillRequired: true,
    externalBoundaryVerificationProven: false,
    externalLeaseReceiptAccepted: false,
    evidenceCollectionAuthorizationAccepted: false,
    evidenceCollectionProviderIoAuthorized: false,
    externalConsumptionReceiptAccepted: false,
    evidenceCollectionReceiptsVerified: false,
    liveRemoteIdentityEvidenceAccepted: false,
    liveSessionBootstrapEvidenceAccepted: false,
    explicitMaterializationGrantAccepted: false,
    clientMaterializationAuthorized: false,
    materializerMayExecute: false,
    providerParityProven: false,
    runtimeActivationAuthorized: false,
    deploymentAuthorized: false,
    activationFactsProduced: false,
  };
}

function authenticityContract(upstream: StructuralEvidenceCollectionAuthorizationResult): ExternalReceiptAuthenticityVerificationEvidenceContract {
  return {
    channel: "evidence_collection_receipt_authenticity_verification",
    requiredSource: "independent_external_receipt_verifier",
    requiredProvenance: "out_of_process_receipt_authenticity_verification",
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    projectBindingId: upstream.projectBindingId,
    verificationEvidenceIdRequired: true,
    verifierIdentityRefRequired: true,
    verifiedAtRequired: true,
    maxVerificationAgeSeconds: 300,
    issuanceReceiptIdBindingRequired: true,
    consumptionReceiptIdBindingRequired: true,
    issuanceReceiptDigestRequired: true,
    consumptionReceiptDigestRequired: true,
    projectIdentityBindingRequired: true,
    authenticityMethodRequired: "cryptographic_signature_or_control_plane_audit_attestation",
    structuralValidationAloneAccepted: false,
    selfReportedProvenanceAccepted: false,
    credentialsForbidden: true,
    accessTokenValuesForbidden: true,
    syntheticEmailValuesForbidden: true,
    authorityHandleIdsForbidden: true,
    materializationAuthorityImplied: false,
    runtimeActivationImplied: false,
    deploymentImplied: false,
  };
}

export function evaluateExternalEvidenceCollectionReceiptVerificationGate(
  input: ExternalEvidenceCollectionReceiptVerificationGateInput,
): ExternalEvidenceCollectionReceiptVerificationGateDecision {
  const blockers: ExternalEvidenceCollectionReceiptVerificationBlocker[] = [];
  if (!upstreamValid(input.upstream)) {
    blockers.push({ code: "upstream_structural_result_invalid", scope: "upstream" });
  }

  const lease = input.leaseReceipt;
  let leaseEnvelopeValid = false;
  let leaseIdentityValid = false;
  let leaseScopeValid = false;
  let leaseLifetimeValid = false;

  if (blockers.length === 0) {
    leaseEnvelopeValid = !!lease && typeof lease === "object" &&
      lease.channel === "live_materialization_evidence_collection_authorization_receipt" &&
      lease.source === "external_materialization_control_plane" &&
      lease.provenance === "externally_issued_and_boundary_verified" &&
      lease.provider === "supabase" && lease.projectLabel === DEV_PROJECT_LABEL &&
      OPAQUE.test(lease.authorizationId) && OPAQUE.test(lease.issuanceReceiptId) &&
      lease.credentialsIncluded === false && lease.authorityHandleIdsIncluded === false;
    if (!leaseEnvelopeValid) blockers.push({ code: "lease_receipt_envelope_invalid", scope: "lease_receipt" });

    leaseIdentityValid = leaseEnvelopeValid &&
      lease.projectBindingId === input.upstream.projectBindingId &&
      lease.expectedProjectRef === input.upstream.expectedProjectRef &&
      normalizeOrigin(lease.expectedProjectUrl) === input.upstream.expectedProjectUrl;
    if (leaseEnvelopeValid && !leaseIdentityValid) blockers.push({ code: "lease_receipt_identity_mismatch", scope: "lease_receipt" });

    leaseScopeValid = leaseIdentityValid && exactActions(lease.allowedActions) &&
      lease.maxUsesPerAction === 1 && lease.syntheticFixtureOnly === true &&
      lease.providerClientMaterializationAllowed === false && lease.runtimeActivationAllowed === false &&
      lease.deploymentAllowed === false;
    if (leaseIdentityValid && !leaseScopeValid) blockers.push({ code: "lease_receipt_scope_mismatch", scope: "lease_receipt" });

    const issuedAt = parseIso(lease.issuedAt);
    const expiresAt = parseIso(lease.expiresAt);
    const observedAt = parseIso(input.observedAt);
    leaseLifetimeValid = leaseScopeValid && issuedAt !== null && expiresAt !== null && observedAt !== null &&
      expiresAt > issuedAt && expiresAt - issuedAt <= MAX_TTL_MS &&
      issuedAt <= observedAt + MAX_CLOCK_SKEW_MS;
    if (leaseScopeValid && !leaseLifetimeValid) blockers.push({ code: "lease_receipt_lifetime_invalid", scope: "lease_receipt" });
  }

  const consumption = input.consumptionReceipt;
  let consumptionEnvelopeValid = false;
  let correlationValid = false;
  let consumptionScopeValid = false;
  let timelineValid = false;

  if (leaseLifetimeValid) {
    consumptionEnvelopeValid = !!consumption && typeof consumption === "object" &&
      consumption.channel === "live_materialization_evidence_collection_consumption_receipt" &&
      consumption.source === "external_materialization_control_plane" &&
      consumption.provenance === "externally_observed_action_consumption" &&
      consumption.provider === "supabase" && consumption.projectLabel === DEV_PROJECT_LABEL &&
      OPAQUE.test(consumption.completionReceiptId) &&
      consumption.credentialsIncluded === false && consumption.accessTokenValuesIncluded === false &&
      consumption.syntheticEmailValuesIncluded === false && consumption.authorityHandleIdsIncluded === false;
    if (!consumptionEnvelopeValid) blockers.push({ code: "consumption_receipt_envelope_invalid", scope: "consumption_receipt" });

    correlationValid = consumptionEnvelopeValid &&
      consumption.projectBindingId === lease.projectBindingId &&
      consumption.expectedProjectRef === lease.expectedProjectRef &&
      normalizeOrigin(consumption.expectedProjectUrl) === lease.expectedProjectUrl &&
      consumption.authorizationId === lease.authorizationId &&
      consumption.issuanceReceiptId === lease.issuanceReceiptId;
    if (consumptionEnvelopeValid && !correlationValid) blockers.push({ code: "consumption_receipt_correlation_mismatch", scope: "consumption_receipt" });

    const actionUses = consumption.actionUses;
    consumptionScopeValid = correlationValid && Array.isArray(actionUses) &&
      actionUses.length === LIVE_EVIDENCE_COLLECTION_ACTIONS.length &&
      actionUses.every((use, index) => use.action === LIVE_EVIDENCE_COLLECTION_ACTIONS[index] && use.useCount === 1 && use.providerIoObserved === true) &&
      consumption.providerClientMaterializationAuthorized === false &&
      consumption.runtimeActivationAuthorized === false && consumption.deploymentAuthorized === false;
    if (correlationValid && !consumptionScopeValid) blockers.push({ code: "consumption_receipt_scope_mismatch", scope: "consumption_receipt" });

    const issuedAt = parseIso(lease.issuedAt)!;
    const expiresAt = parseIso(lease.expiresAt)!;
    const completedAt = parseIso(consumption.completedAt);
    const useTimes = Array.isArray(actionUses) ? actionUses.map((use) => parseIso(use.usedAt)) : [];
    timelineValid = consumptionScopeValid && completedAt !== null && completedAt >= issuedAt && completedAt <= expiresAt &&
      useTimes.length === LIVE_EVIDENCE_COLLECTION_ACTIONS.length &&
      useTimes.every((time) => time !== null && time >= issuedAt && time <= completedAt && time <= expiresAt);
    if (consumptionScopeValid && !timelineValid) blockers.push({ code: "consumption_receipt_timeline_invalid", scope: "consumption_receipt" });
  }

  const structurallyVerified = blockers.length === 0;
  return {
    ...baseDecision(),
    state: structurallyVerified ? "receipt_envelopes_structurally_verified" : "blocked_receipt_envelopes_invalid",
    projectBindingId: structurallyVerified ? input.upstream.projectBindingId : null,
    expectedProjectRef: structurallyVerified ? input.upstream.expectedProjectRef : null,
    expectedProjectUrl: structurallyVerified ? input.upstream.expectedProjectUrl : null,
    authorizationId: structurallyVerified ? lease.authorizationId : null,
    issuanceReceiptId: structurallyVerified ? lease.issuanceReceiptId : null,
    completionReceiptId: structurallyVerified ? consumption.completionReceiptId : null,
    blockers,
    authenticityVerificationEvidence: structurallyVerified ? authenticityContract(input.upstream) : null,
    leaseEnvelopeStructurallyVerified: structurallyVerified && leaseEnvelopeValid && leaseIdentityValid && leaseScopeValid && leaseLifetimeValid,
    consumptionEnvelopeStructurallyVerified: structurallyVerified && consumptionEnvelopeValid && consumptionScopeValid,
    receiptCorrelationStructurallyVerified: structurallyVerified && correlationValid,
    receiptTimelineStructurallyVerified: structurallyVerified && timelineValid,
  };
}

export function externalEvidenceCollectionReceiptVerificationGateProducesNoActivationFacts(): Record<string, never> {
  return {};
}

export function externalEvidenceCollectionReceiptVerificationGateProducesNoProviderExecutionFacts(): Record<string, never> {
  return {};
}
