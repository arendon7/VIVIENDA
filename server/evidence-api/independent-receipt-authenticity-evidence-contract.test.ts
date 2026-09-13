import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type {
  ExternalEvidenceCollectionConsumptionReceiptEnvelope,
  ExternalEvidenceCollectionLeaseReceiptEnvelope,
  ExternalEvidenceCollectionReceiptVerificationGateDecision,
} from "./external-evidence-collection-receipt-verification-gate";
import {
  computeExternalEvidenceCollectionReceiptDigests,
  evaluateIndependentReceiptAuthenticityEvidence,
  independentReceiptAuthenticityEvidenceProducesNoActivationFacts,
  independentReceiptAuthenticityEvidenceProducesNoProviderExecutionFacts,
  type IndependentReceiptAuthenticityEvidenceEnvelope,
} from "./independent-receipt-authenticity-evidence-contract";

const projectBindingId = "binding_vivienda_dev_001";
const projectRef = "abcdefghijklmno1";
const projectUrl = "https://abcdefghijklmno1.supabase.co";
const authorizationId = "authz.phaseA.0001";
const issuanceReceiptId = "receipt.issuance.0001";
const completionReceiptId = "receipt.completion.0001";

const actions = [
  "attest_remote_project_identity",
  "bootstrap_owner_synthetic_session",
  "resolve_owner_synthetic_session",
  "bootstrap_intruder_synthetic_session",
  "resolve_intruder_synthetic_session",
] as const;

function upstream(): ExternalEvidenceCollectionReceiptVerificationGateDecision {
  return {
    version: "V0.23.38-EXTERNAL-EVIDENCE-COLLECTION-RECEIPT-VERIFICATION-GATE-V1",
    state: "receipt_envelopes_structurally_verified",
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId,
    expectedProjectRef: projectRef,
    expectedProjectUrl: projectUrl,
    authorizationId,
    issuanceReceiptId,
    completionReceiptId,
    blockers: [],
    authenticityVerificationEvidence: {
      channel: "evidence_collection_receipt_authenticity_verification",
      requiredSource: "independent_external_receipt_verifier",
      requiredProvenance: "out_of_process_receipt_authenticity_verification",
      provider: "supabase",
      projectLabel: "vivienda-dev",
      projectBindingId,
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
    },
    leaseEnvelopeStructurallyVerified: true,
    consumptionEnvelopeStructurallyVerified: true,
    receiptCorrelationStructurallyVerified: true,
    receiptTimelineStructurallyVerified: true,
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

function leaseReceipt(): ExternalEvidenceCollectionLeaseReceiptEnvelope {
  return {
    channel: "live_materialization_evidence_collection_authorization_receipt",
    source: "external_materialization_control_plane",
    provenance: "externally_issued_and_boundary_verified",
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId,
    expectedProjectRef: projectRef,
    expectedProjectUrl: projectUrl,
    authorizationId,
    issuanceReceiptId,
    issuedAt: "2026-09-13T21:00:00.000Z",
    expiresAt: "2026-09-13T21:05:00.000Z",
    allowedActions: [...actions],
    maxUsesPerAction: 1,
    syntheticFixtureOnly: true,
    credentialsIncluded: false,
    authorityHandleIdsIncluded: false,
    providerClientMaterializationAllowed: false,
    runtimeActivationAllowed: false,
    deploymentAllowed: false,
  };
}

function consumptionReceipt(): ExternalEvidenceCollectionConsumptionReceiptEnvelope {
  return {
    channel: "live_materialization_evidence_collection_consumption_receipt",
    source: "external_materialization_control_plane",
    provenance: "externally_observed_action_consumption",
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId,
    expectedProjectRef: projectRef,
    expectedProjectUrl: projectUrl,
    authorizationId,
    issuanceReceiptId,
    completionReceiptId,
    completedAt: "2026-09-13T21:04:30.000Z",
    actionUses: actions.map((action, index) => ({
      action,
      useCount: 1 as const,
      usedAt: `2026-09-13T21:0${index}:30.000Z`,
      providerIoObserved: true as const,
    })),
    credentialsIncluded: false,
    accessTokenValuesIncluded: false,
    syntheticEmailValuesIncluded: false,
    authorityHandleIdsIncluded: false,
    providerClientMaterializationAuthorized: false,
    runtimeActivationAuthorized: false,
    deploymentAuthorized: false,
  };
}

function evidence(
  lease = leaseReceipt(),
  consumption = consumptionReceipt(),
): IndependentReceiptAuthenticityEvidenceEnvelope {
  const digests = computeExternalEvidenceCollectionReceiptDigests({ leaseReceipt: lease, consumptionReceipt: consumption });
  return {
    channel: "evidence_collection_receipt_authenticity_verification",
    source: "independent_external_receipt_verifier",
    provenance: "out_of_process_receipt_authenticity_verification",
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId,
    verificationEvidenceId: "verification.evidence.0001",
    verifierIdentityRef: "verifier.identity.0001",
    verifierTrustAnchorRef: "verifier.trust.anchor.0001",
    verificationArtifactRef: "verification.artifact.0001",
    verificationArtifactDigest: `sha256:${"a".repeat(64)}`,
    verifiedAt: "2026-09-13T21:04:45.000Z",
    issuanceReceiptId,
    completionReceiptId,
    issuanceReceiptDigest: digests.issuanceReceiptDigest,
    consumptionReceiptDigest: digests.consumptionReceiptDigest,
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

function decide(overrides?: {
  upstream?: ExternalEvidenceCollectionReceiptVerificationGateDecision;
  lease?: ExternalEvidenceCollectionLeaseReceiptEnvelope;
  consumption?: ExternalEvidenceCollectionConsumptionReceiptEnvelope;
  evidence?: IndependentReceiptAuthenticityEvidenceEnvelope;
  observedAt?: string;
}) {
  const lease = overrides?.lease ?? leaseReceipt();
  const consumption = overrides?.consumption ?? consumptionReceipt();
  return evaluateIndependentReceiptAuthenticityEvidence({
    upstream: overrides?.upstream ?? upstream(),
    leaseReceipt: lease,
    consumptionReceipt: consumption,
    evidence: overrides?.evidence ?? evidence(lease, consumption),
    observedAt: overrides?.observedAt ?? "2026-09-13T21:05:00.000Z",
  });
}

describe("V0.23.39 independent receipt authenticity evidence contract", () => {
  it("structurally binds exact receipt digests but never accepts authenticity or elevates authority", () => {
    const result = decide();
    expect(result.state).toBe("authenticity_evidence_structurally_bound");
    expect(result.blockers).toEqual([]);
    expect(result.canonicalReceiptDigestsComputed).toBe(true);
    expect(result.authenticityEvidenceEnvelopeStructurallyVerified).toBe(true);
    expect(result.authenticityEvidenceReceiptBindingVerified).toBe(true);
    expect(result.authenticityEvidenceFreshnessStructurallyVerified).toBe(true);
    expect(result.authenticityClaimObserved).toBe(true);
    expect(result.independentVerifierTrustStillRequired).toBe(true);
    expect(result.verifierTrustAnchorExternallyVerified).toBe(false);
    expect(result.authenticityEvidenceAccepted).toBe(false);
    expect(result.externalBoundaryVerificationProven).toBe(false);
    expect(result.evidenceCollectionProviderIoAuthorized).toBe(false);
    expect(result.clientMaterializationAuthorized).toBe(false);
    expect(result.runtimeActivationAuthorized).toBe(false);
    expect(result.deploymentAuthorized).toBe(false);
  });

  it("computes deterministic SHA-256 digests and changes them when receipt content changes", () => {
    const lease = leaseReceipt();
    const consumption = consumptionReceipt();
    const first = computeExternalEvidenceCollectionReceiptDigests({ leaseReceipt: lease, consumptionReceipt: consumption });
    const second = computeExternalEvidenceCollectionReceiptDigests({ leaseReceipt: { ...lease }, consumptionReceipt: { ...consumption } });
    expect(first).toEqual(second);
    expect(first.issuanceReceiptDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    const changed = computeExternalEvidenceCollectionReceiptDigests({
      leaseReceipt: { ...lease, expiresAt: "2026-09-13T21:04:59.000Z" },
      consumptionReceipt: consumption,
    });
    expect(changed.issuanceReceiptDigest).not.toBe(first.issuanceReceiptDigest);
  });

  it("rejects a promoted or otherwise invalid upstream receipt gate", () => {
    const bad = { ...upstream(), externalBoundaryVerificationProven: true } as unknown as ExternalEvidenceCollectionReceiptVerificationGateDecision;
    const result = decide({ upstream: bad });
    expect(result.state).toBe("blocked_authenticity_evidence_invalid");
    expect(result.blockers.map((item) => item.code)).toContain("upstream_receipt_gate_invalid");
  });

  it("rejects an altered upstream authenticity requirement", () => {
    const original = upstream();
    const bad = {
      ...original,
      authenticityVerificationEvidence: {
        ...original.authenticityVerificationEvidence!,
        selfReportedProvenanceAccepted: true,
      },
    } as unknown as ExternalEvidenceCollectionReceiptVerificationGateDecision;
    const result = decide({ upstream: bad });
    expect(result.blockers.map((item) => item.code)).toContain("authenticity_requirement_invalid");
  });

  it("rejects receipts that no longer bind to the structurally verified upstream IDs", () => {
    const lease = { ...leaseReceipt(), authorizationId: "authz.phaseA.other" };
    const result = decide({ lease, evidence: evidence(lease, consumptionReceipt()) });
    expect(result.blockers.map((item) => item.code)).toContain("receipt_envelope_binding_invalid");
  });

  it.each([
    ["credentials included", { credentialsIncluded: true }],
    ["access token values included", { accessTokenValuesIncluded: true }],
    ["synthetic emails included", { syntheticEmailValuesIncluded: true }],
    ["authority handle IDs included", { authorityHandleIdsIncluded: true }],
    ["private signature material included", { signaturePrivateMaterialIncluded: true }],
    ["materialization authority included", { materializationAuthorityIncluded: true }],
    ["runtime authority included", { runtimeActivationAuthorityIncluded: true }],
    ["deployment authority included", { deploymentAuthorityIncluded: true }],
    ["verifier not independent", { verifierIndependentFromReceiptIssuer: false }],
    ["artifact not externally retained", { verificationArtifactExternallyRetained: false }],
  ])("rejects unsafe authenticity envelope: %s", (_name, mutation) => {
    const base = evidence();
    const result = decide({ evidence: { ...base, ...mutation } as IndependentReceiptAuthenticityEvidenceEnvelope });
    expect(result.blockers.map((item) => item.code)).toContain("authenticity_evidence_envelope_invalid");
  });

  it("rejects malformed verification artifact digest", () => {
    const bad = { ...evidence(), verificationArtifactDigest: "sha256:not-a-digest" };
    const result = decide({ evidence: bad });
    expect(result.blockers.map((item) => item.code)).toContain("authenticity_evidence_envelope_invalid");
  });

  it("rejects identity and receipt-ID mismatch", () => {
    const bad = { ...evidence(), completionReceiptId: "receipt.completion.other" };
    const result = decide({ evidence: bad });
    expect(result.blockers.map((item) => item.code)).toContain("authenticity_evidence_identity_mismatch");
  });

  it("rejects any digest that does not bind the exact receipt contents", () => {
    const bad = { ...evidence(), issuanceReceiptDigest: `sha256:${"b".repeat(64)}` };
    const result = decide({ evidence: bad });
    expect(result.blockers.map((item) => item.code)).toContain("authenticity_evidence_digest_mismatch");
  });

  it("rejects stale authenticity evidence", () => {
    const bad = { ...evidence(), verifiedAt: "2026-09-13T20:59:00.000Z" };
    const result = decide({ evidence: bad, observedAt: "2026-09-13T21:05:00.001Z" });
    expect(result.blockers.map((item) => item.code)).toContain("authenticity_evidence_freshness_invalid");
  });

  it("rejects evidence too far in the future beyond allowed clock skew", () => {
    const bad = { ...evidence(), verifiedAt: "2026-09-13T21:06:01.000Z" };
    const result = decide({ evidence: bad, observedAt: "2026-09-13T21:05:00.000Z" });
    expect(result.blockers.map((item) => item.code)).toContain("authenticity_evidence_freshness_invalid");
  });

  it.each(["cryptographic_signature", "control_plane_audit_attestation"] as const)(
    "accepts %s only as a structural authenticity method",
    (authenticityMethod) => {
      const result = decide({ evidence: { ...evidence(), authenticityMethod } });
      expect(result.state).toBe("authenticity_evidence_structurally_bound");
      expect(result.authenticityEvidenceAccepted).toBe(false);
      expect(result.verifierTrustAnchorExternallyVerified).toBe(false);
    },
  );

  it("rejects an unsupported authenticity method even if the rest of the envelope is valid", () => {
    const bad = { ...evidence(), authenticityMethod: "self_asserted" } as unknown as IndependentReceiptAuthenticityEvidenceEnvelope;
    const result = decide({ evidence: bad });
    expect(result.blockers.map((item) => item.code)).toContain("authenticity_evidence_scope_invalid");
  });

  it("rejects a self-declared non-canonical authenticity claim", () => {
    const bad = { ...evidence(), authenticityClaim: "probably_authentic" } as unknown as IndependentReceiptAuthenticityEvidenceEnvelope;
    const result = decide({ evidence: bad });
    expect(result.blockers.map((item) => item.code)).toContain("authenticity_evidence_scope_invalid");
  });

  it("emits a separate verifier trust-anchor requirement instead of trusting the evidence envelope", () => {
    const result = decide();
    expect(result.verifierTrustAnchorRequirement).toEqual(expect.objectContaining({
      channel: "independent_receipt_verifier_trust_anchor",
      requiredSource: "externally_managed_verifier_trust_registry",
      verifierIdentityRef: "verifier.identity.0001",
      verifierTrustAnchorRef: "verifier.trust.anchor.0001",
      externallyVerifiedTrustRequired: true,
      selfReportedVerifierTrustAccepted: false,
      localStructuralValidationAcceptedAsTrustProof: false,
      materializationAuthorityImplied: false,
      runtimeActivationImplied: false,
      deploymentImplied: false,
    }));
  });

  it("returns no activation or provider-execution facts", () => {
    expect(independentReceiptAuthenticityEvidenceProducesNoActivationFacts()).toEqual({});
    expect(independentReceiptAuthenticityEvidenceProducesNoProviderExecutionFacts()).toEqual({});
  });

  it("contains no env reads, provider SDK, network fetch, runtime activation, or runtime.server dependency", () => {
    const source = readFileSync(new URL("./independent-receipt-authenticity-evidence-contract.ts", import.meta.url), "utf8");
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("@supabase/supabase-js");
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toContain("runtime.server");
    expect(source).not.toContain("createActivatedEvidenceRuntime");
    expect(source).not.toContain("createClient(");
    expect(source).not.toContain("service_role");
  });
});