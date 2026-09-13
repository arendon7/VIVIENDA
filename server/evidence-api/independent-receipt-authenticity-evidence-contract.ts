import { createHash } from "node:crypto";
import type {
  ExternalEvidenceCollectionConsumptionReceiptEnvelope,
  ExternalEvidenceCollectionLeaseReceiptEnvelope,
  ExternalEvidenceCollectionReceiptVerificationGateDecision,
  ExternalReceiptAuthenticityVerificationEvidenceContract,
} from "./external-evidence-collection-receipt-verification-gate";

export const INDEPENDENT_RECEIPT_AUTHENTICITY_EVIDENCE_CONTRACT_VERSION =
  "V0.23.39-INDEPENDENT-RECEIPT-AUTHENTICITY-EVIDENCE-CONTRACT-V1" as const;

const DEV_PROJECT_LABEL = "vivienda-dev" as const;
const MAX_EVIDENCE_AGE_MS = 300 * 1000;
const MAX_CLOCK_SKEW_MS = 60 * 1000;
const OPAQUE = /^[A-Za-z0-9_.:-]{8,200}$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;

export type IndependentReceiptAuthenticityMethod =
  | "cryptographic_signature"
  | "control_plane_audit_attestation";

export type IndependentReceiptAuthenticityEvidenceEnvelope = {
  channel: "evidence_collection_receipt_authenticity_verification";
  source: "independent_external_receipt_verifier";
  provenance: "out_of_process_receipt_authenticity_verification";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  verificationEvidenceId: string;
  verifierIdentityRef: string;
  verifierTrustAnchorRef: string;
  verificationArtifactRef: string;
  verificationArtifactDigest: string;
  verifiedAt: string;
  issuanceReceiptId: string;
  completionReceiptId: string;
  issuanceReceiptDigest: string;
  consumptionReceiptDigest: string;
  authenticityMethod: IndependentReceiptAuthenticityMethod;
  authenticityClaim: "receipts_authentic";
  verifierExecutedOutOfProcess: true;
  verifierIndependentFromReceiptIssuer: true;
  verificationArtifactExternallyRetained: true;
  credentialsIncluded: false;
  accessTokenValuesIncluded: false;
  syntheticEmailValuesIncluded: false;
  authorityHandleIdsIncluded: false;
  signaturePrivateMaterialIncluded: false;
  materializationAuthorityIncluded: false;
  runtimeActivationAuthorityIncluded: false;
  deploymentAuthorityIncluded: false;
};

export type IndependentVerifierTrustAnchorRequirement = {
  channel: "independent_receipt_verifier_trust_anchor";
  requiredSource: "externally_managed_verifier_trust_registry";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  verifierIdentityRef: string;
  verifierTrustAnchorRef: string;
  verificationEvidenceId: string;
  verificationArtifactRef: string;
  verificationArtifactDigest: string;
  verifierIdentityRegistrationRequired: true;
  trustAnchorRegistrationRequired: true;
  trustAnchorMustPredateVerification: true;
  verifierIndependenceAttestationRequired: true;
  verificationArtifactAuthenticityRequired: true;
  verificationArtifactDigestBindingRequired: true;
  revocationStatusCheckRequired: true;
  externallyVerifiedTrustRequired: true;
  selfReportedVerifierTrustAccepted: false;
  localStructuralValidationAcceptedAsTrustProof: false;
  credentialsForbidden: true;
  authorityHandleIdsForbidden: true;
  materializationAuthorityImplied: false;
  runtimeActivationImplied: false;
  deploymentImplied: false;
};

export type IndependentReceiptAuthenticityEvidenceBlockerCode =
  | "upstream_receipt_gate_invalid"
  | "authenticity_requirement_invalid"
  | "receipt_envelope_binding_invalid"
  | "authenticity_evidence_envelope_invalid"
  | "authenticity_evidence_identity_mismatch"
  | "authenticity_evidence_digest_mismatch"
  | "authenticity_evidence_freshness_invalid"
  | "authenticity_evidence_scope_invalid";

export type IndependentReceiptAuthenticityEvidenceBlocker = {
  code: IndependentReceiptAuthenticityEvidenceBlockerCode;
  scope: "upstream" | "requirement" | "receipt_binding" | "authenticity_evidence";
};

export type IndependentReceiptAuthenticityEvidenceDecision = {
  version: typeof INDEPENDENT_RECEIPT_AUTHENTICITY_EVIDENCE_CONTRACT_VERSION;
  state: "authenticity_evidence_structurally_bound" | "blocked_authenticity_evidence_invalid";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string | null;
  authorizationId: string | null;
  issuanceReceiptId: string | null;
  completionReceiptId: string | null;
  verificationEvidenceId: string | null;
  verifierIdentityRef: string | null;
  verifierTrustAnchorRef: string | null;
  issuanceReceiptDigest: string | null;
  consumptionReceiptDigest: string | null;
  blockers: IndependentReceiptAuthenticityEvidenceBlocker[];
  verifierTrustAnchorRequirement: IndependentVerifierTrustAnchorRequirement | null;
  canonicalReceiptDigestsComputed: boolean;
  authenticityEvidenceEnvelopeStructurallyVerified: boolean;
  authenticityEvidenceReceiptBindingVerified: boolean;
  authenticityEvidenceFreshnessStructurallyVerified: boolean;
  authenticityClaimObserved: boolean;
  independentVerifierTrustStillRequired: true;
  verifierTrustAnchorExternallyVerified: false;
  authenticityEvidenceAccepted: false;
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

export type IndependentReceiptAuthenticityEvidenceInput = {
  upstream: ExternalEvidenceCollectionReceiptVerificationGateDecision;
  leaseReceipt: ExternalEvidenceCollectionLeaseReceiptEnvelope;
  consumptionReceipt: ExternalEvidenceCollectionConsumptionReceiptEnvelope;
  evidence: IndependentReceiptAuthenticityEvidenceEnvelope;
  observedAt: string;
};

function parseIso(value: string): number | null {
  if (typeof value !== "string" || CONTROL_CHARACTER.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

function digest(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalJson(value), "utf8").digest("hex")}`;
}

export function computeExternalEvidenceCollectionReceiptDigests(input: {
  leaseReceipt: ExternalEvidenceCollectionLeaseReceiptEnvelope;
  consumptionReceipt: ExternalEvidenceCollectionConsumptionReceiptEnvelope;
}): { issuanceReceiptDigest: string; consumptionReceiptDigest: string } {
  return {
    issuanceReceiptDigest: digest(input.leaseReceipt),
    consumptionReceiptDigest: digest(input.consumptionReceipt),
  };
}

function requirementValid(
  value: ExternalReceiptAuthenticityVerificationEvidenceContract | null,
  upstream: ExternalEvidenceCollectionReceiptVerificationGateDecision,
): value is ExternalReceiptAuthenticityVerificationEvidenceContract {
  return !!value &&
    value.channel === "evidence_collection_receipt_authenticity_verification" &&
    value.requiredSource === "independent_external_receipt_verifier" &&
    value.requiredProvenance === "out_of_process_receipt_authenticity_verification" &&
    value.provider === "supabase" &&
    value.projectLabel === DEV_PROJECT_LABEL &&
    value.projectBindingId === upstream.projectBindingId &&
    value.verificationEvidenceIdRequired === true &&
    value.verifierIdentityRefRequired === true &&
    value.verifiedAtRequired === true &&
    value.maxVerificationAgeSeconds === 300 &&
    value.issuanceReceiptIdBindingRequired === true &&
    value.consumptionReceiptIdBindingRequired === true &&
    value.issuanceReceiptDigestRequired === true &&
    value.consumptionReceiptDigestRequired === true &&
    value.projectIdentityBindingRequired === true &&
    value.authenticityMethodRequired === "cryptographic_signature_or_control_plane_audit_attestation" &&
    value.structuralValidationAloneAccepted === false &&
    value.selfReportedProvenanceAccepted === false &&
    value.credentialsForbidden === true &&
    value.accessTokenValuesForbidden === true &&
    value.syntheticEmailValuesForbidden === true &&
    value.authorityHandleIdsForbidden === true &&
    value.materializationAuthorityImplied === false &&
    value.runtimeActivationImplied === false &&
    value.deploymentImplied === false;
}

function upstreamValid(value: ExternalEvidenceCollectionReceiptVerificationGateDecision): boolean {
  return value.version === "V0.23.38-EXTERNAL-EVIDENCE-COLLECTION-RECEIPT-VERIFICATION-GATE-V1" &&
    value.state === "receipt_envelopes_structurally_verified" &&
    value.provider === "supabase" &&
    value.projectLabel === DEV_PROJECT_LABEL &&
    typeof value.projectBindingId === "string" &&
    typeof value.authorizationId === "string" &&
    typeof value.issuanceReceiptId === "string" &&
    typeof value.completionReceiptId === "string" &&
    value.blockers.length === 0 &&
    value.leaseEnvelopeStructurallyVerified === true &&
    value.consumptionEnvelopeStructurallyVerified === true &&
    value.receiptCorrelationStructurallyVerified === true &&
    value.receiptTimelineStructurallyVerified === true &&
    value.authenticityVerificationStillRequired === true &&
    value.externalBoundaryVerificationProven === false &&
    value.externalLeaseReceiptAccepted === false &&
    value.evidenceCollectionAuthorizationAccepted === false &&
    value.evidenceCollectionProviderIoAuthorized === false &&
    value.externalConsumptionReceiptAccepted === false &&
    value.evidenceCollectionReceiptsVerified === false &&
    value.liveRemoteIdentityEvidenceAccepted === false &&
    value.liveSessionBootstrapEvidenceAccepted === false &&
    value.explicitMaterializationGrantAccepted === false &&
    value.clientMaterializationAuthorized === false &&
    value.materializerMayExecute === false &&
    value.providerParityProven === false &&
    value.runtimeActivationAuthorized === false &&
    value.deploymentAuthorized === false &&
    value.activationFactsProduced === false;
}

function receiptBindingValid(
  upstream: ExternalEvidenceCollectionReceiptVerificationGateDecision,
  lease: ExternalEvidenceCollectionLeaseReceiptEnvelope,
  consumption: ExternalEvidenceCollectionConsumptionReceiptEnvelope,
): boolean {
  return lease.provider === "supabase" && lease.projectLabel === DEV_PROJECT_LABEL &&
    lease.projectBindingId === upstream.projectBindingId &&
    lease.authorizationId === upstream.authorizationId &&
    lease.issuanceReceiptId === upstream.issuanceReceiptId &&
    consumption.provider === "supabase" && consumption.projectLabel === DEV_PROJECT_LABEL &&
    consumption.projectBindingId === upstream.projectBindingId &&
    consumption.authorizationId === upstream.authorizationId &&
    consumption.issuanceReceiptId === upstream.issuanceReceiptId &&
    consumption.completionReceiptId === upstream.completionReceiptId;
}

function baseDecision(): Omit<IndependentReceiptAuthenticityEvidenceDecision,
  "state" | "projectBindingId" | "authorizationId" | "issuanceReceiptId" | "completionReceiptId" |
  "verificationEvidenceId" | "verifierIdentityRef" | "verifierTrustAnchorRef" |
  "issuanceReceiptDigest" | "consumptionReceiptDigest" | "blockers" | "verifierTrustAnchorRequirement" |
  "canonicalReceiptDigestsComputed" | "authenticityEvidenceEnvelopeStructurallyVerified" |
  "authenticityEvidenceReceiptBindingVerified" | "authenticityEvidenceFreshnessStructurallyVerified" |
  "authenticityClaimObserved"> {
  return {
    version: INDEPENDENT_RECEIPT_AUTHENTICITY_EVIDENCE_CONTRACT_VERSION,
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    independentVerifierTrustStillRequired: true,
    verifierTrustAnchorExternallyVerified: false,
    authenticityEvidenceAccepted: false,
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

function trustAnchorRequirement(
  evidence: IndependentReceiptAuthenticityEvidenceEnvelope,
): IndependentVerifierTrustAnchorRequirement {
  return {
    channel: "independent_receipt_verifier_trust_anchor",
    requiredSource: "externally_managed_verifier_trust_registry",
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    projectBindingId: evidence.projectBindingId,
    verifierIdentityRef: evidence.verifierIdentityRef,
    verifierTrustAnchorRef: evidence.verifierTrustAnchorRef,
    verificationEvidenceId: evidence.verificationEvidenceId,
    verificationArtifactRef: evidence.verificationArtifactRef,
    verificationArtifactDigest: evidence.verificationArtifactDigest,
    verifierIdentityRegistrationRequired: true,
    trustAnchorRegistrationRequired: true,
    trustAnchorMustPredateVerification: true,
    verifierIndependenceAttestationRequired: true,
    verificationArtifactAuthenticityRequired: true,
    verificationArtifactDigestBindingRequired: true,
    revocationStatusCheckRequired: true,
    externallyVerifiedTrustRequired: true,
    selfReportedVerifierTrustAccepted: false,
    localStructuralValidationAcceptedAsTrustProof: false,
    credentialsForbidden: true,
    authorityHandleIdsForbidden: true,
    materializationAuthorityImplied: false,
    runtimeActivationImplied: false,
    deploymentImplied: false,
  };
}

export function evaluateIndependentReceiptAuthenticityEvidence(
  input: IndependentReceiptAuthenticityEvidenceInput,
): IndependentReceiptAuthenticityEvidenceDecision {
  const blockers: IndependentReceiptAuthenticityEvidenceBlocker[] = [];
  if (!upstreamValid(input.upstream)) {
    blockers.push({ code: "upstream_receipt_gate_invalid", scope: "upstream" });
  }
  if (blockers.length === 0 && !requirementValid(input.upstream.authenticityVerificationEvidence, input.upstream)) {
    blockers.push({ code: "authenticity_requirement_invalid", scope: "requirement" });
  }

  const receiptBinding = blockers.length === 0 && receiptBindingValid(input.upstream, input.leaseReceipt, input.consumptionReceipt);
  if (blockers.length === 0 && !receiptBinding) {
    blockers.push({ code: "receipt_envelope_binding_invalid", scope: "receipt_binding" });
  }

  const computed = receiptBinding
    ? computeExternalEvidenceCollectionReceiptDigests({ leaseReceipt: input.leaseReceipt, consumptionReceipt: input.consumptionReceipt })
    : null;
  const evidence = input.evidence;
  const envelopeValid = blockers.length === 0 && !!evidence && typeof evidence === "object" &&
    evidence.channel === "evidence_collection_receipt_authenticity_verification" &&
    evidence.source === "independent_external_receipt_verifier" &&
    evidence.provenance === "out_of_process_receipt_authenticity_verification" &&
    evidence.provider === "supabase" && evidence.projectLabel === DEV_PROJECT_LABEL &&
    OPAQUE.test(evidence.verificationEvidenceId) && OPAQUE.test(evidence.verifierIdentityRef) &&
    OPAQUE.test(evidence.verifierTrustAnchorRef) && OPAQUE.test(evidence.verificationArtifactRef) &&
    SHA256.test(evidence.verificationArtifactDigest) &&
    evidence.verifierExecutedOutOfProcess === true &&
    evidence.verifierIndependentFromReceiptIssuer === true &&
    evidence.verificationArtifactExternallyRetained === true &&
    evidence.credentialsIncluded === false && evidence.accessTokenValuesIncluded === false &&
    evidence.syntheticEmailValuesIncluded === false && evidence.authorityHandleIdsIncluded === false &&
    evidence.signaturePrivateMaterialIncluded === false && evidence.materializationAuthorityIncluded === false &&
    evidence.runtimeActivationAuthorityIncluded === false && evidence.deploymentAuthorityIncluded === false;
  if (blockers.length === 0 && !envelopeValid) {
    blockers.push({ code: "authenticity_evidence_envelope_invalid", scope: "authenticity_evidence" });
  }

  const identityValid = envelopeValid &&
    evidence.projectBindingId === input.upstream.projectBindingId &&
    evidence.issuanceReceiptId === input.upstream.issuanceReceiptId &&
    evidence.completionReceiptId === input.upstream.completionReceiptId;
  if (envelopeValid && !identityValid) {
    blockers.push({ code: "authenticity_evidence_identity_mismatch", scope: "authenticity_evidence" });
  }

  const digestValid = identityValid && computed !== null &&
    evidence.issuanceReceiptDigest === computed.issuanceReceiptDigest &&
    evidence.consumptionReceiptDigest === computed.consumptionReceiptDigest;
  if (identityValid && !digestValid) {
    blockers.push({ code: "authenticity_evidence_digest_mismatch", scope: "authenticity_evidence" });
  }

  const verifiedAt = parseIso(evidence.verifiedAt);
  const observedAt = parseIso(input.observedAt);
  const freshnessValid = digestValid && verifiedAt !== null && observedAt !== null &&
    verifiedAt <= observedAt + MAX_CLOCK_SKEW_MS && observedAt - verifiedAt <= MAX_EVIDENCE_AGE_MS;
  if (digestValid && !freshnessValid) {
    blockers.push({ code: "authenticity_evidence_freshness_invalid", scope: "authenticity_evidence" });
  }

  const scopeValid = freshnessValid &&
    (evidence.authenticityMethod === "cryptographic_signature" || evidence.authenticityMethod === "control_plane_audit_attestation") &&
    evidence.authenticityClaim === "receipts_authentic";
  if (freshnessValid && !scopeValid) {
    blockers.push({ code: "authenticity_evidence_scope_invalid", scope: "authenticity_evidence" });
  }

  const structurallyBound = blockers.length === 0;
  return {
    ...baseDecision(),
    state: structurallyBound ? "authenticity_evidence_structurally_bound" : "blocked_authenticity_evidence_invalid",
    projectBindingId: structurallyBound ? evidence.projectBindingId : null,
    authorizationId: structurallyBound ? input.upstream.authorizationId : null,
    issuanceReceiptId: structurallyBound ? evidence.issuanceReceiptId : null,
    completionReceiptId: structurallyBound ? evidence.completionReceiptId : null,
    verificationEvidenceId: structurallyBound ? evidence.verificationEvidenceId : null,
    verifierIdentityRef: structurallyBound ? evidence.verifierIdentityRef : null,
    verifierTrustAnchorRef: structurallyBound ? evidence.verifierTrustAnchorRef : null,
    issuanceReceiptDigest: structurallyBound && computed ? computed.issuanceReceiptDigest : null,
    consumptionReceiptDigest: structurallyBound && computed ? computed.consumptionReceiptDigest : null,
    blockers,
    verifierTrustAnchorRequirement: structurallyBound ? trustAnchorRequirement(evidence) : null,
    canonicalReceiptDigestsComputed: structurallyBound && computed !== null,
    authenticityEvidenceEnvelopeStructurallyVerified: structurallyBound && envelopeValid,
    authenticityEvidenceReceiptBindingVerified: structurallyBound && identityValid && digestValid,
    authenticityEvidenceFreshnessStructurallyVerified: structurallyBound && freshnessValid,
    authenticityClaimObserved: structurallyBound && scopeValid,
  };
}

export function independentReceiptAuthenticityEvidenceProducesNoActivationFacts(): Record<string, never> {
  return {};
}

export function independentReceiptAuthenticityEvidenceProducesNoProviderExecutionFacts(): Record<string, never> {
  return {};
}
