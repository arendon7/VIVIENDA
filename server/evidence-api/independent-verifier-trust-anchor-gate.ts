import type {
  IndependentReceiptAuthenticityEvidenceDecision,
  IndependentReceiptAuthenticityEvidenceEnvelope,
  IndependentVerifierTrustAnchorRequirement,
} from "./independent-receipt-authenticity-evidence-contract";

export const INDEPENDENT_VERIFIER_TRUST_ANCHOR_GATE_VERSION =
  "V0.23.40-INDEPENDENT-VERIFIER-TRUST-ANCHOR-GATE-V1" as const;

const DEV_PROJECT_LABEL = "vivienda-dev" as const;
const MAX_REVOCATION_AGE_MS = 300 * 1000;
const MAX_CLOCK_SKEW_MS = 60 * 1000;
const OPAQUE = /^[A-Za-z0-9_.:-]{8,220}$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;

export type VerifierTrustAnchorKind =
  | "public_key_fingerprint"
  | "control_plane_attestor_identity";

export type ExternalVerifierTrustRegistryEvidenceEnvelope = {
  channel: "independent_receipt_verifier_trust_anchor";
  source: "externally_managed_verifier_trust_registry";
  provenance: "external_trust_registry_observation";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  trustRegistryEvidenceId: string;
  registryIdentityRef: string;
  verifierIdentityRef: string;
  verifierTrustAnchorRef: string;
  verificationEvidenceId: string;
  verificationArtifactRef: string;
  verificationArtifactDigest: string;
  trustAnchorKind: VerifierTrustAnchorKind;
  trustAnchorDigest: string;
  registeredAt: string;
  effectiveAt: string;
  revocationCheckedAt: string;
  verifierIdentityRegistered: true;
  trustAnchorRegistered: true;
  verifierIndependentFromReceiptIssuer: true;
  verificationArtifactAuthenticityAttested: true;
  verificationArtifactDigestBound: true;
  revocationState: "not_revoked";
  credentialsIncluded: false;
  privateKeyMaterialIncluded: false;
  authorityHandleIdsIncluded: false;
  materializationAuthorityIncluded: false;
  runtimeActivationAuthorityIncluded: false;
  deploymentAuthorityIncluded: false;
};

export type ExternalTrustVerificationExecutionRequirement = {
  channel: "independent_receipt_verifier_external_trust_verification";
  executionClass: "external_authorized_trust_verification";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  trustRegistryEvidenceId: string;
  registryIdentityRef: string;
  verifierIdentityRef: string;
  verifierTrustAnchorRef: string;
  verificationEvidenceId: string;
  verificationArtifactRef: string;
  verificationArtifactDigest: string;
  trustAnchorDigest: string;
  required: true;
  offlineSatisfactionAllowed: false;
  separateAuthorizationRequired: true;
  externalControlPlaneIoRequired: true;
  mustVerifyRegistryIdentity: true;
  mustVerifyTrustAnchorAuthenticity: true;
  mustVerifyRevocationStatus: true;
  mustVerifyVerifierIndependence: true;
  mustVerifyVerificationArtifactAuthenticity: true;
  mustBindProjectIdentity: true;
  mustBindVerificationEvidence: true;
  mustBindVerificationArtifactDigest: true;
  noFurtherOfflineTrustPromotionAllowed: true;
  performed: false;
  verified: false;
  materializationAuthorityImplied: false;
  runtimeActivationImplied: false;
  deploymentImplied: false;
};

export type IndependentVerifierTrustAnchorGateBlockerCode =
  | "upstream_authenticity_evidence_invalid"
  | "trust_anchor_requirement_invalid"
  | "authenticity_evidence_binding_invalid"
  | "trust_registry_evidence_envelope_invalid"
  | "trust_registry_identity_mismatch"
  | "trust_registry_artifact_mismatch"
  | "trust_anchor_timeline_invalid"
  | "revocation_observation_invalid"
  | "trust_anchor_scope_invalid";

export type IndependentVerifierTrustAnchorGateBlocker = {
  code: IndependentVerifierTrustAnchorGateBlockerCode;
  scope: "upstream" | "requirement" | "authenticity_evidence" | "trust_registry" | "timeline";
};

export type IndependentVerifierTrustAnchorGateDecision = {
  version: typeof INDEPENDENT_VERIFIER_TRUST_ANCHOR_GATE_VERSION;
  state: "trust_anchor_evidence_structurally_verified" | "blocked_trust_anchor_evidence_invalid";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string | null;
  trustRegistryEvidenceId: string | null;
  verifierIdentityRef: string | null;
  verifierTrustAnchorRef: string | null;
  verificationEvidenceId: string | null;
  trustAnchorDigest: string | null;
  blockers: IndependentVerifierTrustAnchorGateBlocker[];
  externalTrustVerificationExecution: ExternalTrustVerificationExecutionRequirement | null;
  trustRegistryEvidenceStructurallyVerified: boolean;
  trustRegistryBindingVerified: boolean;
  trustAnchorTemporalPreconditionVerified: boolean;
  revocationObservationStructurallyCurrent: boolean;
  offlineClosureReached: boolean;
  offlineTrustChainClosed: boolean;
  externalTrustVerificationExecutionRequired: boolean;
  noFurtherOfflineTrustPromotionAllowed: true;
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

export type IndependentVerifierTrustAnchorGateInput = {
  upstream: IndependentReceiptAuthenticityEvidenceDecision;
  authenticityEvidence: IndependentReceiptAuthenticityEvidenceEnvelope;
  trustRegistryEvidence: ExternalVerifierTrustRegistryEvidenceEnvelope;
  observedAt: string;
};

function parseIso(value: string): number | null {
  if (typeof value !== "string" || CONTROL_CHARACTER.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function upstreamValid(value: IndependentReceiptAuthenticityEvidenceDecision): boolean {
  return value.version === "V0.23.39-INDEPENDENT-RECEIPT-AUTHENTICITY-EVIDENCE-CONTRACT-V1" &&
    value.state === "authenticity_evidence_structurally_bound" &&
    value.provider === "supabase" &&
    value.projectLabel === DEV_PROJECT_LABEL &&
    typeof value.projectBindingId === "string" &&
    typeof value.verificationEvidenceId === "string" &&
    typeof value.verifierIdentityRef === "string" &&
    typeof value.verifierTrustAnchorRef === "string" &&
    typeof value.issuanceReceiptDigest === "string" &&
    typeof value.consumptionReceiptDigest === "string" &&
    value.blockers.length === 0 &&
    value.canonicalReceiptDigestsComputed === true &&
    value.authenticityEvidenceEnvelopeStructurallyVerified === true &&
    value.authenticityEvidenceReceiptBindingVerified === true &&
    value.authenticityEvidenceFreshnessStructurallyVerified === true &&
    value.authenticityClaimObserved === true &&
    value.independentVerifierTrustStillRequired === true &&
    value.verifierTrustAnchorExternallyVerified === false &&
    value.authenticityEvidenceAccepted === false &&
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

function requirementValid(
  value: IndependentVerifierTrustAnchorRequirement | null,
  upstream: IndependentReceiptAuthenticityEvidenceDecision,
): value is IndependentVerifierTrustAnchorRequirement {
  return !!value && value.channel === "independent_receipt_verifier_trust_anchor" &&
    value.requiredSource === "externally_managed_verifier_trust_registry" &&
    value.provider === "supabase" && value.projectLabel === DEV_PROJECT_LABEL &&
    value.projectBindingId === upstream.projectBindingId &&
    value.verifierIdentityRef === upstream.verifierIdentityRef &&
    value.verifierTrustAnchorRef === upstream.verifierTrustAnchorRef &&
    value.verificationEvidenceId === upstream.verificationEvidenceId &&
    OPAQUE.test(value.verificationArtifactRef) && SHA256.test(value.verificationArtifactDigest) &&
    value.verifierIdentityRegistrationRequired === true && value.trustAnchorRegistrationRequired === true &&
    value.trustAnchorMustPredateVerification === true && value.verifierIndependenceAttestationRequired === true &&
    value.verificationArtifactAuthenticityRequired === true && value.verificationArtifactDigestBindingRequired === true &&
    value.revocationStatusCheckRequired === true && value.externallyVerifiedTrustRequired === true &&
    value.selfReportedVerifierTrustAccepted === false && value.localStructuralValidationAcceptedAsTrustProof === false &&
    value.credentialsForbidden === true && value.authorityHandleIdsForbidden === true &&
    value.materializationAuthorityImplied === false && value.runtimeActivationImplied === false && value.deploymentImplied === false;
}

function authenticityEvidenceBindingValid(
  evidence: IndependentReceiptAuthenticityEvidenceEnvelope,
  upstream: IndependentReceiptAuthenticityEvidenceDecision,
  requirement: IndependentVerifierTrustAnchorRequirement,
): boolean {
  return evidence.channel === "evidence_collection_receipt_authenticity_verification" &&
    evidence.source === "independent_external_receipt_verifier" &&
    evidence.provenance === "out_of_process_receipt_authenticity_verification" &&
    evidence.provider === "supabase" && evidence.projectLabel === DEV_PROJECT_LABEL &&
    evidence.projectBindingId === upstream.projectBindingId &&
    evidence.verificationEvidenceId === upstream.verificationEvidenceId &&
    evidence.verifierIdentityRef === upstream.verifierIdentityRef &&
    evidence.verifierTrustAnchorRef === upstream.verifierTrustAnchorRef &&
    evidence.verificationArtifactRef === requirement.verificationArtifactRef &&
    evidence.verificationArtifactDigest === requirement.verificationArtifactDigest &&
    evidence.credentialsIncluded === false && evidence.accessTokenValuesIncluded === false &&
    evidence.syntheticEmailValuesIncluded === false && evidence.authorityHandleIdsIncluded === false &&
    evidence.signaturePrivateMaterialIncluded === false && evidence.materializationAuthorityIncluded === false &&
    evidence.runtimeActivationAuthorityIncluded === false && evidence.deploymentAuthorityIncluded === false;
}

function envelopeValid(value: ExternalVerifierTrustRegistryEvidenceEnvelope): boolean {
  return !!value && typeof value === "object" &&
    value.channel === "independent_receipt_verifier_trust_anchor" &&
    value.source === "externally_managed_verifier_trust_registry" &&
    value.provenance === "external_trust_registry_observation" &&
    value.provider === "supabase" && value.projectLabel === DEV_PROJECT_LABEL &&
    OPAQUE.test(value.trustRegistryEvidenceId) && OPAQUE.test(value.registryIdentityRef) &&
    OPAQUE.test(value.verifierIdentityRef) && OPAQUE.test(value.verifierTrustAnchorRef) &&
    OPAQUE.test(value.verificationEvidenceId) && OPAQUE.test(value.verificationArtifactRef) &&
    SHA256.test(value.verificationArtifactDigest) && SHA256.test(value.trustAnchorDigest) &&
    value.verifierIdentityRegistered === true && value.trustAnchorRegistered === true &&
    value.verifierIndependentFromReceiptIssuer === true &&
    value.verificationArtifactAuthenticityAttested === true && value.verificationArtifactDigestBound === true &&
    value.revocationState === "not_revoked" && value.credentialsIncluded === false &&
    value.privateKeyMaterialIncluded === false && value.authorityHandleIdsIncluded === false &&
    value.materializationAuthorityIncluded === false && value.runtimeActivationAuthorityIncluded === false &&
    value.deploymentAuthorityIncluded === false;
}

function baseDecision(): Omit<IndependentVerifierTrustAnchorGateDecision,
  "state" | "projectBindingId" | "trustRegistryEvidenceId" | "verifierIdentityRef" |
  "verifierTrustAnchorRef" | "verificationEvidenceId" | "trustAnchorDigest" | "blockers" |
  "externalTrustVerificationExecution" | "trustRegistryEvidenceStructurallyVerified" |
  "trustRegistryBindingVerified" | "trustAnchorTemporalPreconditionVerified" |
  "revocationObservationStructurallyCurrent" | "offlineClosureReached" | "offlineTrustChainClosed" |
  "externalTrustVerificationExecutionRequired"> {
  return {
    version: INDEPENDENT_VERIFIER_TRUST_ANCHOR_GATE_VERSION,
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    noFurtherOfflineTrustPromotionAllowed: true,
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

function executionRequirement(
  evidence: ExternalVerifierTrustRegistryEvidenceEnvelope,
): ExternalTrustVerificationExecutionRequirement {
  return {
    channel: "independent_receipt_verifier_external_trust_verification",
    executionClass: "external_authorized_trust_verification",
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    projectBindingId: evidence.projectBindingId,
    trustRegistryEvidenceId: evidence.trustRegistryEvidenceId,
    registryIdentityRef: evidence.registryIdentityRef,
    verifierIdentityRef: evidence.verifierIdentityRef,
    verifierTrustAnchorRef: evidence.verifierTrustAnchorRef,
    verificationEvidenceId: evidence.verificationEvidenceId,
    verificationArtifactRef: evidence.verificationArtifactRef,
    verificationArtifactDigest: evidence.verificationArtifactDigest,
    trustAnchorDigest: evidence.trustAnchorDigest,
    required: true,
    offlineSatisfactionAllowed: false,
    separateAuthorizationRequired: true,
    externalControlPlaneIoRequired: true,
    mustVerifyRegistryIdentity: true,
    mustVerifyTrustAnchorAuthenticity: true,
    mustVerifyRevocationStatus: true,
    mustVerifyVerifierIndependence: true,
    mustVerifyVerificationArtifactAuthenticity: true,
    mustBindProjectIdentity: true,
    mustBindVerificationEvidence: true,
    mustBindVerificationArtifactDigest: true,
    noFurtherOfflineTrustPromotionAllowed: true,
    performed: false,
    verified: false,
    materializationAuthorityImplied: false,
    runtimeActivationImplied: false,
    deploymentImplied: false,
  };
}

export function evaluateIndependentVerifierTrustAnchorGate(
  input: IndependentVerifierTrustAnchorGateInput,
): IndependentVerifierTrustAnchorGateDecision {
  const blockers: IndependentVerifierTrustAnchorGateBlocker[] = [];
  if (!upstreamValid(input.upstream)) blockers.push({ code: "upstream_authenticity_evidence_invalid", scope: "upstream" });
  const requirement = input.upstream.verifierTrustAnchorRequirement;
  if (blockers.length === 0 && !requirementValid(requirement, input.upstream)) {
    blockers.push({ code: "trust_anchor_requirement_invalid", scope: "requirement" });
  }
  const requirementValue = requirement as IndependentVerifierTrustAnchorRequirement | null;
  const authBinding = blockers.length === 0 && requirementValue !== null &&
    authenticityEvidenceBindingValid(input.authenticityEvidence, input.upstream, requirementValue);
  if (blockers.length === 0 && !authBinding) blockers.push({ code: "authenticity_evidence_binding_invalid", scope: "authenticity_evidence" });

  const trust = input.trustRegistryEvidence;
  const envValid = blockers.length === 0 && envelopeValid(trust);
  if (blockers.length === 0 && !envValid) blockers.push({ code: "trust_registry_evidence_envelope_invalid", scope: "trust_registry" });

  const identityValid = envValid && requirementValue !== null &&
    trust.projectBindingId === input.upstream.projectBindingId &&
    trust.verifierIdentityRef === requirementValue.verifierIdentityRef &&
    trust.verifierTrustAnchorRef === requirementValue.verifierTrustAnchorRef &&
    trust.verificationEvidenceId === requirementValue.verificationEvidenceId;
  if (envValid && !identityValid) blockers.push({ code: "trust_registry_identity_mismatch", scope: "trust_registry" });

  const artifactValid = identityValid && requirementValue !== null &&
    trust.verificationArtifactRef === requirementValue.verificationArtifactRef &&
    trust.verificationArtifactDigest === requirementValue.verificationArtifactDigest;
  if (identityValid && !artifactValid) blockers.push({ code: "trust_registry_artifact_mismatch", scope: "trust_registry" });

  const registeredAt = parseIso(trust.registeredAt);
  const effectiveAt = parseIso(trust.effectiveAt);
  const verifiedAt = parseIso(input.authenticityEvidence.verifiedAt);
  const timelineValid = artifactValid && registeredAt !== null && effectiveAt !== null && verifiedAt !== null &&
    registeredAt <= effectiveAt && effectiveAt <= verifiedAt;
  if (artifactValid && !timelineValid) blockers.push({ code: "trust_anchor_timeline_invalid", scope: "timeline" });

  const revocationCheckedAt = parseIso(trust.revocationCheckedAt);
  const observedAt = parseIso(input.observedAt);
  const revocationValid = timelineValid && revocationCheckedAt !== null && observedAt !== null &&
    revocationCheckedAt <= observedAt + MAX_CLOCK_SKEW_MS &&
    observedAt - revocationCheckedAt <= MAX_REVOCATION_AGE_MS && trust.revocationState === "not_revoked";
  if (timelineValid && !revocationValid) blockers.push({ code: "revocation_observation_invalid", scope: "timeline" });

  const scopeValid = revocationValid &&
    (trust.trustAnchorKind === "public_key_fingerprint" || trust.trustAnchorKind === "control_plane_attestor_identity");
  if (revocationValid && !scopeValid) blockers.push({ code: "trust_anchor_scope_invalid", scope: "trust_registry" });

  const pass = blockers.length === 0;
  return {
    ...baseDecision(),
    state: pass ? "trust_anchor_evidence_structurally_verified" : "blocked_trust_anchor_evidence_invalid",
    projectBindingId: pass ? trust.projectBindingId : null,
    trustRegistryEvidenceId: pass ? trust.trustRegistryEvidenceId : null,
    verifierIdentityRef: pass ? trust.verifierIdentityRef : null,
    verifierTrustAnchorRef: pass ? trust.verifierTrustAnchorRef : null,
    verificationEvidenceId: pass ? trust.verificationEvidenceId : null,
    trustAnchorDigest: pass ? trust.trustAnchorDigest : null,
    blockers,
    externalTrustVerificationExecution: pass ? executionRequirement(trust) : null,
    trustRegistryEvidenceStructurallyVerified: pass && envValid,
    trustRegistryBindingVerified: pass && identityValid && artifactValid,
    trustAnchorTemporalPreconditionVerified: pass && timelineValid,
    revocationObservationStructurallyCurrent: pass && revocationValid,
    offlineClosureReached: pass,
    offlineTrustChainClosed: pass,
    externalTrustVerificationExecutionRequired: pass,
  };
}

export function independentVerifierTrustAnchorGateProducesNoActivationFacts(): Record<string, never> {
  return {};
}

export function independentVerifierTrustAnchorGateProducesNoProviderExecutionFacts(): Record<string, never> {
  return {};
}
