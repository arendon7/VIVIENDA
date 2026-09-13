import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  ProviderClientMaterializationAuthorizationRequirement,
  ProviderClientMaterializationGateDecision,
} from "./authorized-client-materialization-gate";
import {
  LIVE_EVIDENCE_COLLECTION_ACTIONS,
  evaluateLiveMaterializationAuthorizationEvidenceContract,
} from "./live-materialization-authorization-evidence-contract";
import {
  createEvidenceCollectionAuthorizationExecutor,
  type StructuralEvidenceCollectionAuthorizationTransport,
  type StructuralEvidenceCollectionAuthorizationTransportResult,
  type StructuralEvidenceCollectionAuthorizationResult,
} from "./evidence-collection-authorization-executor";
import {
  EXTERNAL_EVIDENCE_COLLECTION_RECEIPT_VERIFICATION_GATE_VERSION,
  evaluateExternalEvidenceCollectionReceiptVerificationGate,
  externalEvidenceCollectionReceiptVerificationGateProducesNoActivationFacts,
  externalEvidenceCollectionReceiptVerificationGateProducesNoProviderExecutionFacts,
  type ExternalEvidenceCollectionConsumptionReceiptEnvelope,
  type ExternalEvidenceCollectionLeaseReceiptEnvelope,
} from "./external-evidence-collection-receipt-verification-gate";

const PROJECT_BINDING_ID = "binding_dev_038";
const PROJECT_REF = "abcdefghijklmno";
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;
const EXTERNAL_AUTHORIZATION_ID = "authorization.external.038";
const ISSUANCE_RECEIPT_ID = "issuance.receipt.038";
const COMPLETION_RECEIPT_ID = "completion.receipt.038";
const ISSUED_AT = "2026-09-13T21:00:00.000Z";
const EXPIRES_AT = "2026-09-13T21:05:00.000Z";
const COMPLETED_AT = "2026-09-13T21:04:30.000Z";
const OBSERVED_AT = "2026-09-13T21:04:45.000Z";

function requirement(): ProviderClientMaterializationAuthorizationRequirement {
  return {
    channel: "provider_client_materialization_authorization",
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId: PROJECT_BINDING_ID,
    expectedProjectRef: PROJECT_REF,
    expectedProjectUrl: PROJECT_URL,
    authorityHandleCount: 5,
    preflightRevalidationRequired: true,
    configurationDriftCheckRequired: true,
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
      maxTtlSeconds: 300,
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

function gate(): ProviderClientMaterializationGateDecision {
  return {
    version: "V0.23.35-AUTHORIZED-CLIENT-MATERIALIZATION-GATE-V1",
    state: "ready_for_live_materialization_authorization",
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId: PROJECT_BINDING_ID,
    expectedProjectRef: PROJECT_REF,
    expectedProjectUrl: PROJECT_URL,
    authorityHandleCount: 5,
    configurationRevalidated: true,
    configurationStable: true,
    contractStackValidated: true,
    blockers: [],
    authorizationRequirement: requirement(),
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

class StructuralTransport implements StructuralEvidenceCollectionAuthorizationTransport {
  readonly channel = "evidence_collection_authorization_structural_transport" as const;
  readonly provider = "supabase" as const;
  readonly projectLabel = "vivienda-dev" as const;
  readonly structuralOnly = true as const;
  readonly externallyIssuedLeaseProven = false as const;
  readonly providerIoAuthorized = false as const;
  readonly clientMaterializationAuthorized = false as const;
  readonly runtimeActivationAuthorized = false as const;
  readonly deploymentAuthorized = false as const;

  async exercise(
    input: Parameters<StructuralEvidenceCollectionAuthorizationTransport["exercise"]>[0],
  ): Promise<StructuralEvidenceCollectionAuthorizationTransportResult> {
    return {
      data: {
        source: "injected_structural_test_observation",
        provenance: "structural_test_double",
        provider: "supabase",
        projectLabel: "vivienda-dev",
        projectBindingId: input.projectBindingId,
        expectedProjectRef: input.expectedProjectRef,
        expectedProjectUrl: input.expectedProjectUrl,
        authorizationId: "authorization.structural.038",
        requestId: input.requestId,
        nonce: input.nonce,
        issuedAt: "2026-09-13T20:50:00.000Z",
        expiresAt: "2026-09-13T20:55:00.000Z",
        allowedActions: [...LIVE_EVIDENCE_COLLECTION_ACTIONS],
        maxUsesPerAction: 1,
        syntheticFixtureOnly: true,
        materializationAllowed: false,
        runtimeActivationAllowed: false,
        deploymentAllowed: false,
      },
      error: null,
    };
  }
}

async function upstream(): Promise<StructuralEvidenceCollectionAuthorizationResult> {
  const authorizationContract = evaluateLiveMaterializationAuthorizationEvidenceContract({ materializationGate: gate() });
  return createEvidenceCollectionAuthorizationExecutor({
    authorizationContract,
    transport: new StructuralTransport(),
    now: () => "2026-09-13T20:50:00.000Z",
    tokenSource: (kind) => (kind === "request_id" ? "request.authorization.038" : "nonce.authorization.038"),
  }).execute();
}

function leaseReceipt(): ExternalEvidenceCollectionLeaseReceiptEnvelope {
  return {
    channel: "live_materialization_evidence_collection_authorization_receipt",
    source: "external_materialization_control_plane",
    provenance: "externally_issued_and_boundary_verified",
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId: PROJECT_BINDING_ID,
    expectedProjectRef: PROJECT_REF,
    expectedProjectUrl: PROJECT_URL,
    authorizationId: EXTERNAL_AUTHORIZATION_ID,
    issuanceReceiptId: ISSUANCE_RECEIPT_ID,
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
    allowedActions: [...LIVE_EVIDENCE_COLLECTION_ACTIONS],
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
  const times = [
    "2026-09-13T21:00:30.000Z",
    "2026-09-13T21:01:30.000Z",
    "2026-09-13T21:02:30.000Z",
    "2026-09-13T21:03:30.000Z",
    "2026-09-13T21:04:00.000Z",
  ];
  return {
    channel: "live_materialization_evidence_collection_consumption_receipt",
    source: "external_materialization_control_plane",
    provenance: "externally_observed_action_consumption",
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId: PROJECT_BINDING_ID,
    expectedProjectRef: PROJECT_REF,
    expectedProjectUrl: PROJECT_URL,
    authorizationId: EXTERNAL_AUTHORIZATION_ID,
    issuanceReceiptId: ISSUANCE_RECEIPT_ID,
    completionReceiptId: COMPLETION_RECEIPT_ID,
    completedAt: COMPLETED_AT,
    actionUses: LIVE_EVIDENCE_COLLECTION_ACTIONS.map((action, index) => ({
      action,
      useCount: 1 as const,
      usedAt: times[index]!,
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

async function evaluate(
  lease = leaseReceipt(),
  consumption = consumptionReceipt(),
  upstreamPatch: Partial<StructuralEvidenceCollectionAuthorizationResult> = {},
) {
  return evaluateExternalEvidenceCollectionReceiptVerificationGate({
    upstream: { ...(await upstream()), ...upstreamPatch },
    leaseReceipt: lease,
    consumptionReceipt: consumption,
    observedAt: OBSERVED_AT,
  });
}

describe("V0.23.38 external evidence collection receipt verification gate", () => {
  it("structurally verifies perfectly correlated receipt envelopes without accepting their claimed external provenance", async () => {
    const decision = await evaluate();
    expect(decision).toMatchObject({
      version: EXTERNAL_EVIDENCE_COLLECTION_RECEIPT_VERIFICATION_GATE_VERSION,
      state: "receipt_envelopes_structurally_verified",
      provider: "supabase",
      projectLabel: "vivienda-dev",
      projectBindingId: PROJECT_BINDING_ID,
      expectedProjectRef: PROJECT_REF,
      expectedProjectUrl: PROJECT_URL,
      authorizationId: EXTERNAL_AUTHORIZATION_ID,
      issuanceReceiptId: ISSUANCE_RECEIPT_ID,
      completionReceiptId: COMPLETION_RECEIPT_ID,
      blockers: [],
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
      clientMaterializationAuthorized: false,
      materializerMayExecute: false,
      runtimeActivationAuthorized: false,
      deploymentAuthorized: false,
      activationFactsProduced: false,
    });
  });

  it("requires an independent out-of-process authenticity proof instead of trusting self-reported provenance", async () => {
    const contract = (await evaluate()).authenticityVerificationEvidence;
    expect(contract).toEqual({
      channel: "evidence_collection_receipt_authenticity_verification",
      requiredSource: "independent_external_receipt_verifier",
      requiredProvenance: "out_of_process_receipt_authenticity_verification",
      provider: "supabase",
      projectLabel: "vivienda-dev",
      projectBindingId: PROJECT_BINDING_ID,
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
    });
  });

  it.each([
    ["externallyIssuedLeaseProven", true],
    ["externalLeaseReceiptAccepted", true],
    ["evidenceCollectionAuthorizationAccepted", true],
    ["evidenceCollectionProviderIoAuthorized", true],
    ["externalConsumptionReceiptAccepted", true],
    ["clientMaterializationAuthorized", true],
    ["materializerMayExecute", true],
    ["runtimeActivationAuthorized", true],
    ["deploymentAuthorized", true],
  ] as const)("blocks upstream self-promotion %s=%s", async (field, value) => {
    const decision = await evaluate(leaseReceipt(), consumptionReceipt(), { [field]: value });
    expect(decision.state).toBe("blocked_receipt_envelopes_invalid");
    expect(decision.blockers).toContainEqual({ code: "upstream_structural_result_invalid", scope: "upstream" });
    expect(decision.authenticityVerificationEvidence).toBeNull();
  });

  it("rejects a structural-test provenance pretending to be an external issuance receipt", async () => {
    const lease = { ...leaseReceipt(), provenance: "structural_test_double" } as unknown as ExternalEvidenceCollectionLeaseReceiptEnvelope;
    const decision = await evaluate(lease);
    expect(decision.blockers).toContainEqual({ code: "lease_receipt_envelope_invalid", scope: "lease_receipt" });
    expect(decision.externalLeaseReceiptAccepted).toBe(false);
  });

  it.each([
    { projectBindingId: "binding_dev_other" },
    { expectedProjectRef: "otherprojectref" },
    { expectedProjectUrl: "https://otherprojectref.supabase.co" },
  ])("rejects lease project identity drift %#", async (patch) => {
    const decision = await evaluate({ ...leaseReceipt(), ...patch });
    expect(decision.blockers).toContainEqual({ code: "lease_receipt_identity_mismatch", scope: "lease_receipt" });
  });

  it.each([
    { allowedActions: LIVE_EVIDENCE_COLLECTION_ACTIONS.slice(0, 4) },
    { allowedActions: [...LIVE_EVIDENCE_COLLECTION_ACTIONS].reverse() },
    { maxUsesPerAction: 2 },
    { syntheticFixtureOnly: false },
    { providerClientMaterializationAllowed: true },
    { runtimeActivationAllowed: true },
    { deploymentAllowed: true },
  ])("rejects lease scope drift %#", async (patch) => {
    const decision = await evaluate({ ...leaseReceipt(), ...patch } as ExternalEvidenceCollectionLeaseReceiptEnvelope);
    expect(decision.blockers).toContainEqual({ code: "lease_receipt_scope_mismatch", scope: "lease_receipt" });
  });

  it.each([
    { issuedAt: ISSUED_AT, expiresAt: "2026-09-13T21:05:01.000Z" },
    { issuedAt: ISSUED_AT, expiresAt: "2026-09-13T20:59:59.000Z" },
    { issuedAt: "bad-time", expiresAt: EXPIRES_AT },
  ])("rejects invalid lease lifetime %#", async (patch) => {
    const decision = await evaluate({ ...leaseReceipt(), ...patch });
    expect(decision.blockers).toContainEqual({ code: "lease_receipt_lifetime_invalid", scope: "lease_receipt" });
  });

  it.each([
    { authorizationId: "authorization.other.038" },
    { issuanceReceiptId: "issuance.other.038" },
    { projectBindingId: "binding_dev_other" },
    { expectedProjectUrl: "https://otherprojectref.supabase.co" },
  ])("rejects consumption correlation drift %#", async (patch) => {
    const decision = await evaluate(leaseReceipt(), { ...consumptionReceipt(), ...patch });
    expect(decision.blockers).toContainEqual({
      code: "consumption_receipt_correlation_mismatch",
      scope: "consumption_receipt",
    });
  });

  it("rejects missing, duplicate, reordered or non-observed action consumption", async () => {
    const valid = consumptionReceipt();
    const variants: ExternalEvidenceCollectionConsumptionReceiptEnvelope[] = [
      { ...valid, actionUses: valid.actionUses.slice(0, 4) },
      { ...valid, actionUses: [...valid.actionUses].reverse() },
      {
        ...valid,
        actionUses: valid.actionUses.map((use, index) =>
          index === 0 ? { ...use, useCount: 2 as 1 } : use,
        ),
      },
      {
        ...valid,
        actionUses: valid.actionUses.map((use, index) =>
          index === 0 ? { ...use, providerIoObserved: false as true } : use,
        ),
      },
    ];
    for (const variant of variants) {
      const decision = await evaluate(leaseReceipt(), variant);
      expect(decision.blockers).toContainEqual({ code: "consumption_receipt_scope_mismatch", scope: "consumption_receipt" });
    }
  });

  it.each([
    { completedAt: "2026-09-13T21:05:01.000Z" },
    { completedAt: "2026-09-13T20:59:59.000Z" },
  ])("rejects consumption completion outside lease lifetime %#", async (patch) => {
    const decision = await evaluate(leaseReceipt(), { ...consumptionReceipt(), ...patch });
    expect(decision.blockers).toContainEqual({ code: "consumption_receipt_timeline_invalid", scope: "consumption_receipt" });
  });

  it("rejects an action use after completion even when the lease itself has not expired", async () => {
    const consumption = consumptionReceipt();
    consumption.actionUses = consumption.actionUses.map((use, index) =>
      index === 4 ? { ...use, usedAt: "2026-09-13T21:04:45.000Z" } : use,
    );
    const decision = await evaluate(leaseReceipt(), consumption);
    expect(decision.blockers).toContainEqual({ code: "consumption_receipt_timeline_invalid", scope: "consumption_receipt" });
  });

  it("does not elevate external authenticity merely because envelope provenance strings look external", async () => {
    const decision = await evaluate();
    expect(decision.externalBoundaryVerificationProven).toBe(false);
    expect(decision.externalLeaseReceiptAccepted).toBe(false);
    expect(decision.externalConsumptionReceiptAccepted).toBe(false);
    expect(decision.evidenceCollectionReceiptsVerified).toBe(false);
  });

  it("produces neither activation facts nor provider execution facts", () => {
    expect(externalEvidenceCollectionReceiptVerificationGateProducesNoActivationFacts()).toEqual({});
    expect(externalEvidenceCollectionReceiptVerificationGateProducesNoProviderExecutionFacts()).toEqual({});
  });

  it("contains no runtime activation, environment, network or Supabase SDK imports", () => {
    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/external-evidence-collection-receipt-verification-gate.ts"),
      "utf8",
    );
    for (const forbidden of [
      "runtime.server",
      "activated-runtime",
      "activation-preflight",
      "@supabase/supabase-js",
      "createClient(",
      "process.env",
      "fetch(",
      "axios",
      "node:http",
      "node:https",
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
