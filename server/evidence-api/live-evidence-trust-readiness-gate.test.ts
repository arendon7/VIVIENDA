import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ProviderClientMaterializationGateDecision } from "./authorized-client-materialization-gate";
import type { LiveMaterializationAuthorizationEvidenceContractDecision } from "./live-materialization-authorization-evidence-contract";
import type { StructuralEvidenceCollectionAuthorizationResult } from "./evidence-collection-authorization-executor";
import type { ExternalEvidenceCollectionReceiptVerificationGateDecision } from "./external-evidence-collection-receipt-verification-gate";
import type { IndependentReceiptAuthenticityEvidenceDecision } from "./independent-receipt-authenticity-evidence-contract";
import type { IndependentVerifierTrustAnchorGateDecision } from "./independent-verifier-trust-anchor-gate";
import {
  evaluateLiveEvidenceTrustReadiness,
  liveEvidenceTrustReadinessProducesNoActivationFacts,
  liveEvidenceTrustReadinessProducesNoProviderExecutionFacts,
} from "./live-evidence-trust-readiness-gate";

const binding = "binding_vivienda_dev_001";
const ref = "abcdefghijklmno1";
const url = "https://abcdefghijklmno1.supabase.co";

function v35(): ProviderClientMaterializationGateDecision {
  return {
    version: "V0.23.35-AUTHORIZED-CLIENT-MATERIALIZATION-GATE-V1",
    state: "ready_for_live_materialization_authorization",
    provider: "supabase", projectLabel: "vivienda-dev", projectBindingId: binding,
    expectedProjectRef: ref, expectedProjectUrl: url, authorityHandleCount: 5,
    configurationRevalidated: true, configurationStable: true, contractStackValidated: true, blockers: [],
    syntheticOnly: true, liveRuntimeAuthorized: false, liveMaterializationAuthorizationRequired: true,
    liveRemoteIdentityEvidenceAccepted: false, liveSessionBootstrapEvidenceAccepted: false,
    explicitMaterializationGrantAccepted: false, providerIoAuthorized: false, sdkInstantiationAuthorized: false,
    clientMaterializationAuthorized: false, materializerMayExecute: false, remoteIdentityVerified: false,
    sessionBootstrapProven: false, providerParityProven: false, runtimeActivationAuthorized: false,
    deploymentAuthorized: false, activationFactsProduced: false,
  } as unknown as ProviderClientMaterializationGateDecision;
}

function v36(): LiveMaterializationAuthorizationEvidenceContractDecision {
  return {
    version: "V0.23.36-LIVE-MATERIALIZATION-AUTHORIZATION-EVIDENCE-CONTRACT-V1",
    state: "evidence_authorization_contract_ready", provider: "supabase", projectLabel: "vivienda-dev",
    projectBindingId: binding, expectedProjectRef: ref, expectedProjectUrl: url, authorityHandleCount: 5, blockers: [],
    twoPhaseAuthorizationRequired: true, circularDependencyResolvedBySeparateEvidenceCollectionAuthority: true,
    evidenceCollectionAuthorizationAccepted: false, evidenceCollectionProviderIoAuthorized: false,
    liveRemoteIdentityEvidenceAccepted: false, liveSessionBootstrapEvidenceAccepted: false,
    explicitMaterializationGrantAccepted: false, materializationGrantConsumed: false,
    materializationProviderIoAuthorized: false, sdkInstantiationAuthorized: false, clientMaterializationAuthorized: false,
    materializerMayExecute: false, remoteIdentityVerified: false, sessionBootstrapProven: false,
    providerParityProven: false, runtimeActivationAuthorized: false, deploymentAuthorized: false, activationFactsProduced: false,
  } as unknown as LiveMaterializationAuthorizationEvidenceContractDecision;
}

function v37(): StructuralEvidenceCollectionAuthorizationResult {
  return {
    version: "V0.23.37-EVIDENCE-COLLECTION-AUTHORIZATION-EXECUTOR-V1",
    state: "structural_authorization_exchange_satisfied", provider: "supabase", projectLabel: "vivienda-dev",
    projectBindingId: binding, expectedProjectRef: ref, expectedProjectUrl: url,
    structuralTransportInvoked: true, structuralLeaseEnvelopeValidated: true, externalLeaseIssuanceRequired: true,
    externallyIssuedLeaseProven: false, externalLeaseReceiptAccepted: false,
    evidenceCollectionAuthorizationAccepted: false, evidenceCollectionProviderIoAuthorized: false,
    externalConsumptionReceiptAccepted: false, liveRemoteIdentityEvidenceAccepted: false,
    liveSessionBootstrapEvidenceAccepted: false, explicitMaterializationGrantAccepted: false,
    clientMaterializationAuthorized: false, materializerMayExecute: false, providerParityProven: false,
    runtimeActivationAuthorized: false, deploymentAuthorized: false, activationFactsProduced: false,
  } as unknown as StructuralEvidenceCollectionAuthorizationResult;
}

function v38(): ExternalEvidenceCollectionReceiptVerificationGateDecision {
  return {
    version: "V0.23.38-EXTERNAL-EVIDENCE-COLLECTION-RECEIPT-VERIFICATION-GATE-V1",
    state: "receipt_envelopes_structurally_verified", provider: "supabase", projectLabel: "vivienda-dev",
    projectBindingId: binding, expectedProjectRef: ref, expectedProjectUrl: url, blockers: [],
    leaseEnvelopeStructurallyVerified: true, consumptionEnvelopeStructurallyVerified: true,
    receiptCorrelationStructurallyVerified: true, receiptTimelineStructurallyVerified: true,
    authenticityVerificationStillRequired: true, externalBoundaryVerificationProven: false,
    externalLeaseReceiptAccepted: false, evidenceCollectionAuthorizationAccepted: false,
    evidenceCollectionProviderIoAuthorized: false, externalConsumptionReceiptAccepted: false,
    evidenceCollectionReceiptsVerified: false, liveRemoteIdentityEvidenceAccepted: false,
    liveSessionBootstrapEvidenceAccepted: false, explicitMaterializationGrantAccepted: false,
    clientMaterializationAuthorized: false, materializerMayExecute: false, providerParityProven: false,
    runtimeActivationAuthorized: false, deploymentAuthorized: false, activationFactsProduced: false,
  } as unknown as ExternalEvidenceCollectionReceiptVerificationGateDecision;
}

function v39(): IndependentReceiptAuthenticityEvidenceDecision {
  return {
    version: "V0.23.39-INDEPENDENT-RECEIPT-AUTHENTICITY-EVIDENCE-CONTRACT-V1",
    state: "authenticity_evidence_structurally_bound", provider: "supabase", projectLabel: "vivienda-dev",
    projectBindingId: binding, blockers: [], canonicalReceiptDigestsComputed: true,
    authenticityEvidenceEnvelopeStructurallyVerified: true, authenticityEvidenceReceiptBindingVerified: true,
    authenticityEvidenceFreshnessStructurallyVerified: true, authenticityClaimObserved: true,
    independentVerifierTrustStillRequired: true, verifierTrustAnchorExternallyVerified: false,
    authenticityEvidenceAccepted: false, externalBoundaryVerificationProven: false,
    evidenceCollectionProviderIoAuthorized: false, explicitMaterializationGrantAccepted: false,
    clientMaterializationAuthorized: false, materializerMayExecute: false, providerParityProven: false,
    runtimeActivationAuthorized: false, deploymentAuthorized: false, activationFactsProduced: false,
  } as unknown as IndependentReceiptAuthenticityEvidenceDecision;
}

function v40(): IndependentVerifierTrustAnchorGateDecision {
  return {
    version: "V0.23.40-INDEPENDENT-VERIFIER-TRUST-ANCHOR-GATE-V1",
    state: "trust_anchor_evidence_structurally_verified", provider: "supabase", projectLabel: "vivienda-dev",
    projectBindingId: binding, blockers: [], trustRegistryEvidenceStructurallyVerified: true,
    trustRegistryBindingVerified: true, trustAnchorTemporalPreconditionVerified: true,
    revocationObservationStructurallyCurrent: true, offlineClosureReached: true, offlineTrustChainClosed: true,
    externalTrustVerificationExecutionRequired: true, noFurtherOfflineTrustPromotionAllowed: true,
    externalTrustVerificationExecution: {
      required: true, offlineSatisfactionAllowed: false, separateAuthorizationRequired: true,
      performed: false, verified: false,
    },
    verifierTrustAnchorExternallyVerified: false, authenticityEvidenceAccepted: false,
    externalBoundaryVerificationProven: false, evidenceCollectionProviderIoAuthorized: false,
    explicitMaterializationGrantAccepted: false, clientMaterializationAuthorized: false,
    materializerMayExecute: false, providerParityProven: false, runtimeActivationAuthorized: false,
    deploymentAuthorized: false, activationFactsProduced: false,
  } as unknown as IndependentVerifierTrustAnchorGateDecision;
}

function decide(overrides?: Partial<{
  materializationGate: ProviderClientMaterializationGateDecision;
  authorizationEvidenceContract: LiveMaterializationAuthorizationEvidenceContractDecision;
  phaseAStructuralExecutor: StructuralEvidenceCollectionAuthorizationResult;
  receiptVerificationGate: ExternalEvidenceCollectionReceiptVerificationGateDecision;
  authenticityEvidenceContract: IndependentReceiptAuthenticityEvidenceDecision;
  trustAnchorOfflineClosure: IndependentVerifierTrustAnchorGateDecision;
}>) {
  return evaluateLiveEvidenceTrustReadiness({
    materializationGate: overrides?.materializationGate ?? v35(),
    authorizationEvidenceContract: overrides?.authorizationEvidenceContract ?? v36(),
    phaseAStructuralExecutor: overrides?.phaseAStructuralExecutor ?? v37(),
    receiptVerificationGate: overrides?.receiptVerificationGate ?? v38(),
    authenticityEvidenceContract: overrides?.authenticityEvidenceContract ?? v39(),
    trustAnchorOfflineClosure: overrides?.trustAnchorOfflineClosure ?? v40(),
  });
}

describe("V0.23.41 live evidence trust readiness aggregate", () => {
  it("declares the offline architecture complete while keeping all external/live authority blocked", () => {
    const result = decide();
    expect(result.state).toBe("offline_architecture_complete_external_execution_blocked");
    expect(result.blockers).toEqual([]);
    expect(result.offlineArchitectureComplete).toBe(true);
    expect(result.offlineTrustChainClosed).toBe(true);
    expect(result.nextProgressRequiresExternalExecution).toBe(true);
    expect(result.noFurtherOfflineTrustPromotionAllowed).toBe(true);
    expect(result.externalExecutionSeparatelyAuthorized).toBe(false);
    expect(result.evidenceCollectionProviderIoAuthorized).toBe(false);
    expect(result.verifierTrustAnchorExternallyVerified).toBe(false);
    expect(result.explicitMaterializationGrantAccepted).toBe(false);
    expect(result.clientMaterializationAuthorized).toBe(false);
    expect(result.providerParityProven).toBe(false);
    expect(result.runtimeActivationAuthorized).toBe(false);
    expect(result.deploymentAuthorized).toBe(false);
  });

  it("validates all six frozen authority slices", () => {
    const result = decide();
    expect([
      result.v02335MaterializationGateValidated,
      result.v02336TwoPhaseAuthorizationValidated,
      result.v02337StructuralAuthorizationExchangeValidated,
      result.v02338ReceiptStructureValidated,
      result.v02339AuthenticityBindingValidated,
      result.v02340OfflineTrustClosureValidated,
    ]).toEqual([true, true, true, true, true, true]);
  });

  it("emits the only valid external execution order without authorizing it", () => {
    const plan = decide().externalExecutionPlan!;
    expect(plan.stages).toEqual([
      "authorize_phase_a_evidence_collection",
      "execute_live_identity_and_session_evidence",
      "verify_receipt_authenticity_and_verifier_trust",
      "accept_live_evidence_receipts",
      "issue_and_atomically_consume_materialization_grant",
      "materialize_qualified_dev_provider_clients",
    ]);
    expect(plan.strictOrderingRequired).toBe(true);
    expect(plan.offlineArtifactsMayNotSubstituteLiveEvidence).toBe(true);
    expect(plan.structuralTestDoublesMayNotSatisfyExternalStages).toBe(true);
    expect(plan.externalExecutionAuthorized).toBe(false);
    expect(plan.externalExecutionStarted).toBe(false);
    expect(plan.externalExecutionCompleted).toBe(false);
    expect(plan.providerIoAuthorized).toBe(false);
  });

  it.each([
    ["V0.23.35", "materializationGate", "materialization_gate_invalid", { providerIoAuthorized: true }],
    ["V0.23.36", "authorizationEvidenceContract", "authorization_evidence_contract_invalid", { evidenceCollectionAuthorizationAccepted: true }],
    ["V0.23.37", "phaseAStructuralExecutor", "phase_a_structural_executor_invalid", { externallyIssuedLeaseProven: true }],
    ["V0.23.38", "receiptVerificationGate", "receipt_verification_gate_invalid", { externalBoundaryVerificationProven: true }],
    ["V0.23.39", "authenticityEvidenceContract", "authenticity_evidence_contract_invalid", { authenticityEvidenceAccepted: true }],
    ["V0.23.40", "trustAnchorOfflineClosure", "trust_anchor_offline_closure_invalid", { verifierTrustAnchorExternallyVerified: true }],
  ] as const)("rejects authority promotion in %s", (_label, key, blocker, mutation) => {
    const factories = {
      materializationGate: v35,
      authorizationEvidenceContract: v36,
      phaseAStructuralExecutor: v37,
      receiptVerificationGate: v38,
      authenticityEvidenceContract: v39,
      trustAnchorOfflineClosure: v40,
    } as const;
    const bad = { ...factories[key](), ...mutation } as never;
    const result = decide({ [key]: bad });
    expect(result.blockers.map((b) => b.code)).toContain(blocker);
    expect(result.offlineArchitectureComplete).toBe(false);
    expect(result.externalExecutionPlan).toBeNull();
  });

  it("rejects projectBindingId drift at any downstream slice", () => {
    const bad = { ...v39(), projectBindingId: "binding_vivienda_dev_other" } as IndependentReceiptAuthenticityEvidenceDecision;
    const result = decide({ authenticityEvidenceContract: bad });
    expect(result.blockers.map((b) => b.code)).toContain("project_binding_drift");
    expect(result.crossSliceProjectBindingStable).toBe(false);
  });

  it.each([
    ["V0.23.36 project ref", "authorizationEvidenceContract", { expectedProjectRef: "otherprojectref1" }],
    ["V0.23.37 project url", "phaseAStructuralExecutor", { expectedProjectUrl: "https://otherprojectref1.supabase.co" }],
    ["V0.23.38 project ref", "receiptVerificationGate", { expectedProjectRef: "otherprojectref1" }],
  ] as const)("rejects cross-slice project identity drift: %s", (_label, key, mutation) => {
    const factories = {
      authorizationEvidenceContract: v36,
      phaseAStructuralExecutor: v37,
      receiptVerificationGate: v38,
    } as const;
    const bad = { ...factories[key](), ...mutation } as never;
    const result = decide({ [key]: bad });
    expect(result.blockers.map((b) => b.code)).toContain("project_identity_drift");
    expect(result.crossSliceProjectIdentityStable).toBe(false);
  });

  it("does not mistake structural V0.23.37 evidence for an externally issued Phase A lease", () => {
    const result = decide();
    expect(result.v02337StructuralAuthorizationExchangeValidated).toBe(true);
    expect(result.phaseAEvidenceCollectionAuthorizationAccepted).toBe(false);
    expect(result.externalLeaseReceiptAccepted).toBe(false);
  });

  it("does not mistake V0.23.38 receipt structure for verified external receipts", () => {
    const result = decide();
    expect(result.v02338ReceiptStructureValidated).toBe(true);
    expect(result.evidenceCollectionReceiptsVerified).toBe(false);
    expect(result.externalBoundaryVerificationProven).toBe(false);
  });

  it("does not mistake V0.23.40 offline closure for external trust verification", () => {
    const result = decide();
    expect(result.v02340OfflineTrustClosureValidated).toBe(true);
    expect(result.verifierTrustAnchorExternallyVerified).toBe(false);
    expect(result.nextProgressRequiresExternalExecution).toBe(true);
  });

  it("does not produce activation or provider-execution facts", () => {
    expect(liveEvidenceTrustReadinessProducesNoActivationFacts()).toEqual({});
    expect(liveEvidenceTrustReadinessProducesNoProviderExecutionFacts()).toEqual({});
  });

  it("contains no env reads, SDK, network fetch, runtime.server, materializer invocation, or authority promotion", () => {
    const source = readFileSync(new URL("./live-evidence-trust-readiness-gate.ts", import.meta.url), "utf8");
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("@supabase/supabase-js");
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toContain("runtime.server");
    expect(source).not.toContain("createActivatedEvidenceRuntime");
    expect(source).not.toContain("createClient(");
    expect(source).not.toContain("service_role");
    expect(source).not.toContain("externalExecutionAuthorized: true");
    expect(source).not.toContain("providerIoAuthorized: true");
    expect(source).not.toContain("clientMaterializationAuthorized: true");
  });
});
