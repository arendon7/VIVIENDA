import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type {
  IndependentReceiptAuthenticityEvidenceDecision,
  IndependentReceiptAuthenticityEvidenceEnvelope,
} from "./independent-receipt-authenticity-evidence-contract";
import {
  evaluateIndependentVerifierTrustAnchorGate,
  independentVerifierTrustAnchorGateProducesNoActivationFacts,
  independentVerifierTrustAnchorGateProducesNoProviderExecutionFacts,
  type ExternalVerifierTrustRegistryEvidenceEnvelope,
} from "./independent-verifier-trust-anchor-gate";

const projectBindingId = "binding_vivienda_dev_001";
const verificationEvidenceId = "verification.evidence.0001";
const verifierIdentityRef = "verifier.identity.0001";
const verifierTrustAnchorRef = "verifier.trust.anchor.0001";
const verificationArtifactRef = "verification.artifact.0001";
const verificationArtifactDigest = `sha256:${"a".repeat(64)}`;
const trustAnchorDigest = `sha256:${"b".repeat(64)}`;

function authenticityEvidence(): IndependentReceiptAuthenticityEvidenceEnvelope {
  return {
    channel: "evidence_collection_receipt_authenticity_verification",
    source: "independent_external_receipt_verifier",
    provenance: "out_of_process_receipt_authenticity_verification",
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId,
    verificationEvidenceId,
    verifierIdentityRef,
    verifierTrustAnchorRef,
    verificationArtifactRef,
    verificationArtifactDigest,
    verifiedAt: "2026-09-13T21:04:45.000Z",
    issuanceReceiptId: "receipt.issuance.0001",
    completionReceiptId: "receipt.completion.0001",
    issuanceReceiptDigest: `sha256:${"c".repeat(64)}`,
    consumptionReceiptDigest: `sha256:${"d".repeat(64)}`,
    authenticityMethod: "cryptographic_signature",
    authenticityClaim: "receipts_authentic",
    verifierExecutedOutOfProcess: true,
    verifierIndependentFromReceiptIssuer: true,
    verificationArtifactExternallyRetained: true,
    credentialsIncluded: false,
    accessTokenValuesIncluded: false,
    syntheticEmailValuesIncluded: false,
    authorityHandleIdsIncluded: false,
    signaturePrivateMaterialIncluded: false,
    materializationAuthorityIncluded: false,
    runtimeActivationAuthorityIncluded: false,
    deploymentAuthorityIncluded: false,
  };
}

function upstream(): IndependentReceiptAuthenticityEvidenceDecision {
  return {
    version: "V0.23.39-INDEPENDENT-RECEIPT-AUTHENTICITY-EVIDENCE-CONTRACT-V1",
    state: "authenticity_evidence_structurally_bound",
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId,
    authorizationId: "authz.phaseA.0001",
    issuanceReceiptId: "receipt.issuance.0001",
    completionReceiptId: "receipt.completion.0001",
    verificationEvidenceId,
    verifierIdentityRef,
    verifierTrustAnchorRef,
    issuanceReceiptDigest: `sha256:${"c".repeat(64)}`,
    consumptionReceiptDigest: `sha256:${"d".repeat(64)}`,
    blockers: [],
    verifierTrustAnchorRequirement: {
      channel: "independent_receipt_verifier_trust_anchor",
      requiredSource: "externally_managed_verifier_trust_registry",
      provider: "supabase",
      projectLabel: "vivienda-dev",
      projectBindingId,
      verifierIdentityRef,
      verifierTrustAnchorRef,
      verificationEvidenceId,
      verificationArtifactRef,
      verificationArtifactDigest,
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
    },
    canonicalReceiptDigestsComputed: true,
    authenticityEvidenceEnvelopeStructurallyVerified: true,
    authenticityEvidenceReceiptBindingVerified: true,
    authenticityEvidenceFreshnessStructurallyVerified: true,
    authenticityClaimObserved: true,
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

function trustEvidence(): ExternalVerifierTrustRegistryEvidenceEnvelope {
  return {
    channel: "independent_receipt_verifier_trust_anchor",
    source: "externally_managed_verifier_trust_registry",
    provenance: "external_trust_registry_observation",
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId,
    trustRegistryEvidenceId: "trust.registry.evidence.0001",
    registryIdentityRef: "trust.registry.identity.0001",
    verifierIdentityRef,
    verifierTrustAnchorRef,
    verificationEvidenceId,
    verificationArtifactRef,
    verificationArtifactDigest,
    trustAnchorKind: "public_key_fingerprint",
    trustAnchorDigest,
    registeredAt: "2026-09-01T12:00:00.000Z",
    effectiveAt: "2026-09-01T12:05:00.000Z",
    revocationCheckedAt: "2026-09-13T21:05:00.000Z",
    verifierIdentityRegistered: true,
    trustAnchorRegistered: true,
    verifierIndependentFromReceiptIssuer: true,
    verificationArtifactAuthenticityAttested: true,
    verificationArtifactDigestBound: true,
    revocationState: "not_revoked",
    credentialsIncluded: false,
    privateKeyMaterialIncluded: false,
    authorityHandleIdsIncluded: false,
    materializationAuthorityIncluded: false,
    runtimeActivationAuthorityIncluded: false,
    deploymentAuthorityIncluded: false,
  };
}

function decide(overrides?: {
  upstream?: IndependentReceiptAuthenticityEvidenceDecision;
  authenticityEvidence?: IndependentReceiptAuthenticityEvidenceEnvelope;
  trust?: ExternalVerifierTrustRegistryEvidenceEnvelope;
  observedAt?: string;
}) {
  return evaluateIndependentVerifierTrustAnchorGate({
    upstream: overrides?.upstream ?? upstream(),
    authenticityEvidence: overrides?.authenticityEvidence ?? authenticityEvidence(),
    trustRegistryEvidence: overrides?.trust ?? trustEvidence(),
    observedAt: overrides?.observedAt ?? "2026-09-13T21:05:00.000Z",
  });
}

describe("V0.23.40 independent verifier trust anchor gate", () => {
  it("reaches the terminal offline closure boundary without promoting external trust", () => {
    const result = decide();
    expect(result.state).toBe("trust_anchor_evidence_structurally_verified");
    expect(result.blockers).toEqual([]);
    expect(result.trustRegistryEvidenceStructurallyVerified).toBe(true);
    expect(result.trustRegistryBindingVerified).toBe(true);
    expect(result.trustAnchorTemporalPreconditionVerified).toBe(true);
    expect(result.revocationObservationStructurallyCurrent).toBe(true);
    expect(result.offlineClosureReached).toBe(true);
    expect(result.offlineTrustChainClosed).toBe(true);
    expect(result.externalTrustVerificationExecutionRequired).toBe(true);
    expect(result.noFurtherOfflineTrustPromotionAllowed).toBe(true);
    expect(result.verifierTrustAnchorExternallyVerified).toBe(false);
    expect(result.authenticityEvidenceAccepted).toBe(false);
    expect(result.externalBoundaryVerificationProven).toBe(false);
    expect(result.evidenceCollectionProviderIoAuthorized).toBe(false);
    expect(result.clientMaterializationAuthorized).toBe(false);
    expect(result.runtimeActivationAuthorized).toBe(false);
    expect(result.deploymentAuthorized).toBe(false);
  });

  it("emits a terminal external execution requirement rather than another offline trust receipt", () => {
    const result = decide();
    expect(result.externalTrustVerificationExecution).toEqual(expect.objectContaining({
      channel: "independent_receipt_verifier_external_trust_verification",
      executionClass: "external_authorized_trust_verification",
      required: true,
      offlineSatisfactionAllowed: false,
      separateAuthorizationRequired: true,
      externalControlPlaneIoRequired: true,
      noFurtherOfflineTrustPromotionAllowed: true,
      performed: false,
      verified: false,
      materializationAuthorityImplied: false,
      runtimeActivationImplied: false,
      deploymentImplied: false,
    }));
  });

  it("rejects an upstream decision that has already promoted verifier trust", () => {
    const bad = { ...upstream(), verifierTrustAnchorExternallyVerified: true } as unknown as IndependentReceiptAuthenticityEvidenceDecision;
    expect(decide({ upstream: bad }).blockers.map((b) => b.code)).toContain("upstream_authenticity_evidence_invalid");
  });

  it("rejects an upstream decision that has accepted authenticity evidence", () => {
    const bad = { ...upstream(), authenticityEvidenceAccepted: true } as unknown as IndependentReceiptAuthenticityEvidenceDecision;
    expect(decide({ upstream: bad }).blockers.map((b) => b.code)).toContain("upstream_authenticity_evidence_invalid");
  });

  it("rejects altered trust-anchor requirements", () => {
    const original = upstream();
    const bad = {
      ...original,
      verifierTrustAnchorRequirement: {
        ...original.verifierTrustAnchorRequirement!,
        selfReportedVerifierTrustAccepted: true,
      },
    } as unknown as IndependentReceiptAuthenticityEvidenceDecision;
    expect(decide({ upstream: bad }).blockers.map((b) => b.code)).toContain("trust_anchor_requirement_invalid");
  });

  it("rejects authenticity evidence not bound to the upstream verifier identity", () => {
    const bad = { ...authenticityEvidence(), verifierIdentityRef: "verifier.identity.other" };
    expect(decide({ authenticityEvidence: bad }).blockers.map((b) => b.code)).toContain("authenticity_evidence_binding_invalid");
  });

  it.each([
    ["credentials", { credentialsIncluded: true }],
    ["private key material", { privateKeyMaterialIncluded: true }],
    ["authority handle ids", { authorityHandleIdsIncluded: true }],
    ["materialization authority", { materializationAuthorityIncluded: true }],
    ["runtime authority", { runtimeActivationAuthorityIncluded: true }],
    ["deployment authority", { deploymentAuthorityIncluded: true }],
    ["unregistered verifier", { verifierIdentityRegistered: false }],
    ["unregistered anchor", { trustAnchorRegistered: false }],
    ["non-independent verifier", { verifierIndependentFromReceiptIssuer: false }],
    ["artifact unattested", { verificationArtifactAuthenticityAttested: false }],
    ["artifact digest unbound", { verificationArtifactDigestBound: false }],
    ["revoked", { revocationState: "revoked" }],
  ])("rejects unsafe or incomplete trust registry evidence: %s", (_name, mutation) => {
    const result = decide({ trust: { ...trustEvidence(), ...mutation } as unknown as ExternalVerifierTrustRegistryEvidenceEnvelope });
    expect(result.state).toBe("blocked_trust_anchor_evidence_invalid");
    expect(result.blockers.map((b) => b.code)).toContain("trust_registry_evidence_envelope_invalid");
  });

  it("rejects trust registry identity mismatch", () => {
    const bad = { ...trustEvidence(), verifierTrustAnchorRef: "verifier.trust.anchor.other" };
    expect(decide({ trust: bad }).blockers.map((b) => b.code)).toContain("trust_registry_identity_mismatch");
  });

  it("rejects verification artifact mismatch", () => {
    const bad = { ...trustEvidence(), verificationArtifactDigest: `sha256:${"e".repeat(64)}` };
    expect(decide({ trust: bad }).blockers.map((b) => b.code)).toContain("trust_registry_artifact_mismatch");
  });

  it.each([
    ["anchor registered after effective", { registeredAt: "2026-09-02T12:00:00.000Z", effectiveAt: "2026-09-01T12:05:00.000Z" }],
    ["anchor effective after verification", { effectiveAt: "2026-09-13T21:04:46.000Z" }],
    ["invalid registration timestamp", { registeredAt: "not-a-date" }],
  ])("rejects invalid trust-anchor timeline: %s", (_name, mutation) => {
    const result = decide({ trust: { ...trustEvidence(), ...mutation } });
    expect(result.blockers.map((b) => b.code)).toContain("trust_anchor_timeline_invalid");
  });

  it("rejects stale revocation observation", () => {
    const bad = { ...trustEvidence(), revocationCheckedAt: "2026-09-13T20:59:59.999Z" };
    expect(decide({ trust: bad }).blockers.map((b) => b.code)).toContain("revocation_observation_invalid");
  });

  it("rejects revocation observation beyond future clock skew", () => {
    const bad = { ...trustEvidence(), revocationCheckedAt: "2026-09-13T21:06:00.001Z" };
    expect(decide({ trust: bad }).blockers.map((b) => b.code)).toContain("revocation_observation_invalid");
  });

  it.each(["public_key_fingerprint", "control_plane_attestor_identity"] as const)(
    "accepts %s only as structural trust-anchor kind",
    (trustAnchorKind) => {
      const result = decide({ trust: { ...trustEvidence(), trustAnchorKind } });
      expect(result.state).toBe("trust_anchor_evidence_structurally_verified");
      expect(result.verifierTrustAnchorExternallyVerified).toBe(false);
    },
  );

  it("rejects unsupported trust-anchor kind", () => {
    const bad = { ...trustEvidence(), trustAnchorKind: "self_reported_identity" } as unknown as ExternalVerifierTrustRegistryEvidenceEnvelope;
    expect(decide({ trust: bad }).blockers.map((b) => b.code)).toContain("trust_anchor_scope_invalid");
  });

  it("rejects malformed trust-anchor digest", () => {
    const bad = { ...trustEvidence(), trustAnchorDigest: "sha256:not-a-digest" };
    expect(decide({ trust: bad }).blockers.map((b) => b.code)).toContain("trust_registry_evidence_envelope_invalid");
  });

  it("does not produce activation or provider execution facts", () => {
    expect(independentVerifierTrustAnchorGateProducesNoActivationFacts()).toEqual({});
    expect(independentVerifierTrustAnchorGateProducesNoProviderExecutionFacts()).toEqual({});
  });

  it("contains no env reads, SDK, network fetch, runtime activation, runtime.server, or recursive offline promotion", () => {
    const source = readFileSync(new URL("./independent-verifier-trust-anchor-gate.ts", import.meta.url), "utf8");
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("@supabase/supabase-js");
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toContain("runtime.server");
    expect(source).not.toContain("createActivatedEvidenceRuntime");
    expect(source).not.toContain("createClient(");
    expect(source).not.toContain("service_role");
    expect(source).not.toContain("offlineSatisfactionAllowed: true");
    expect(source).not.toContain("verifierTrustAnchorExternallyVerified: true");
  });
});
