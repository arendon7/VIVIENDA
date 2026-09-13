import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  ProviderClientMaterializationAuthorizationRequirement,
  ProviderClientMaterializationGateDecision,
} from "./authorized-client-materialization-gate";
import {
  LIVE_EVIDENCE_COLLECTION_ACTIONS,
  LIVE_MATERIALIZATION_AUTHORIZATION_EVIDENCE_CONTRACT_VERSION,
  evaluateLiveMaterializationAuthorizationEvidenceContract,
  liveMaterializationAuthorizationEvidenceContractProducesNoActivationFacts,
  liveMaterializationAuthorizationEvidenceContractProducesNoProviderExecutionFacts,
} from "./live-materialization-authorization-evidence-contract";

const PROJECT_BINDING_ID = "binding_dev_036";
const PROJECT_REF = "abcdefghijklmno";
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;

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

function readyGate(): ProviderClientMaterializationGateDecision {
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

function hostileGate(patch: Record<string, unknown>): ProviderClientMaterializationGateDecision {
  return { ...readyGate(), ...patch } as unknown as ProviderClientMaterializationGateDecision;
}

function hostileRequirement(
  patch: Record<string, unknown>,
): ProviderClientMaterializationAuthorizationRequirement {
  return { ...requirement(), ...patch } as unknown as ProviderClientMaterializationAuthorizationRequirement;
}

describe("V0.23.36 live materialization authorization evidence contract", () => {
  it("builds a two-phase evidence contract from an exact V0.23.35 ready gate without granting authority", () => {
    const decision = evaluateLiveMaterializationAuthorizationEvidenceContract({ materializationGate: readyGate() });

    expect(decision).toMatchObject({
      version: LIVE_MATERIALIZATION_AUTHORIZATION_EVIDENCE_CONTRACT_VERSION,
      state: "evidence_authorization_contract_ready",
      provider: "supabase",
      projectLabel: "vivienda-dev",
      projectBindingId: PROJECT_BINDING_ID,
      expectedProjectRef: PROJECT_REF,
      expectedProjectUrl: PROJECT_URL,
      authorityHandleCount: 5,
      blockers: [],
      twoPhaseAuthorizationRequired: true,
      circularDependencyResolvedBySeparateEvidenceCollectionAuthority: true,
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
    });
  });

  it("separates narrow live-evidence collection authority from final client materialization authority", () => {
    const decision = evaluateLiveMaterializationAuthorizationEvidenceContract({ materializationGate: readyGate() });
    expect(decision.evidenceCollectionAuthorization).toEqual({
      channel: "live_materialization_evidence_collection_authorization",
      provider: "supabase",
      projectLabel: "vivienda-dev",
      projectBindingId: PROJECT_BINDING_ID,
      expectedProjectRef: PROJECT_REF,
      expectedProjectUrl: PROJECT_URL,
      requiredSource: "external_materialization_control_plane",
      authorizationKind: "scoped_live_evidence_collection_lease",
      maxTtlSeconds: 300,
      singleProjectOnly: true,
      syntheticFixtureOnly: true,
      exactActionSetRequired: true,
      allowedActions: LIVE_EVIDENCE_COLLECTION_ACTIONS,
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
    });
  });

  it("defines remote identity evidence as externally verified live evidence without carrying credentials", () => {
    const receipt = evaluateLiveMaterializationAuthorizationEvidenceContract({
      materializationGate: readyGate(),
    }).remoteIdentityEvidenceReceipt;

    expect(receipt).toEqual({
      evidenceKind: "live_remote_project_identity",
      requiredSource: "authorized_external_live_provider_attestation",
      provider: "supabase",
      projectLabel: "vivienda-dev",
      projectBindingId: PROJECT_BINDING_ID,
      expectedProjectRef: PROJECT_REF,
      expectedProjectUrl: PROJECT_URL,
      evidenceCollectionAuthorizationReceiptRequired: true,
      providerIoObservedRequired: true,
      remoteIdentityVerifiedRequired: true,
      externalVerifierReceiptRequired: true,
      evidenceIdRequired: true,
      observedAtRequired: true,
      maxEvidenceAgeSeconds: 300,
      credentialsForbiddenInReceipt: true,
      authorityHandleIdsForbiddenInReceipt: true,
      runtimeActivationImplied: false,
      deploymentImplied: false,
    });
  });

  it("defines session evidence for owner and intruder while forbidding token and email values in the receipt", () => {
    const receipt = evaluateLiveMaterializationAuthorizationEvidenceContract({
      materializationGate: readyGate(),
    }).sessionBootstrapEvidenceReceipt;

    expect(receipt).toMatchObject({
      evidenceKind: "live_synthetic_session_bootstrap",
      requiredSource: "authorized_external_live_provider_session_bootstrap",
      ownerAndIntruderRequired: true,
      issueAndResolveRequiredForEachActor: true,
      distinctSubjectsRequired: true,
      disposableFixtureRequired: true,
      capabilityLifetimeContainmentRequired: true,
      providerIoObservedRequired: true,
      sessionBootstrapProvenRequired: true,
      externalVerifierReceiptRequired: true,
      maxEvidenceAgeSeconds: 300,
      accessTokenValuesForbiddenInReceipt: true,
      syntheticEmailValuesForbiddenInReceipt: true,
      authorityHandleIdsForbiddenInReceipt: true,
      runtimeActivationImplied: false,
      deploymentImplied: false,
    });
  });

  it("requires the final grant to bind the exact authority set and both live evidence receipts before atomic consumption", () => {
    const grant = evaluateLiveMaterializationAuthorizationEvidenceContract({
      materializationGate: readyGate(),
    }).materializationGrantAcceptance;

    expect(grant).toEqual({
      channel: "provider_client_materialization_authorization",
      provider: "supabase",
      projectLabel: "vivienda-dev",
      projectBindingId: PROJECT_BINDING_ID,
      expectedProjectRef: PROJECT_REF,
      expectedProjectUrl: PROJECT_URL,
      authorityHandleCount: 5,
      requiredSource: "external_materialization_control_plane",
      action: "materialize_qualified_dev_provider_clients",
      maxTtlSeconds: 300,
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
    });
  });

  it("fails closed when the upstream materialization gate is not ready", () => {
    const decision = evaluateLiveMaterializationAuthorizationEvidenceContract({
      materializationGate: hostileGate({ state: "blocked_contract_inconsistent" }),
    });

    expect(decision.state).toBe("blocked_materialization_gate_invalid");
    expect(decision.blockers).toContainEqual({
      code: "materialization_gate_not_ready",
      scope: "materialization_gate",
    });
    expect(decision.evidenceCollectionAuthorization).toBeNull();
    expect(decision.materializationGrantAcceptance).toBeNull();
  });

  it.each([
    ["providerIoAuthorized", true],
    ["sdkInstantiationAuthorized", true],
    ["clientMaterializationAuthorized", true],
    ["materializerMayExecute", true],
    ["remoteIdentityVerified", true],
    ["sessionBootstrapProven", true],
    ["runtimeActivationAuthorized", true],
    ["deploymentAuthorized", true],
  ])("rejects upstream self-promotion %s=%s", (field, value) => {
    const decision = evaluateLiveMaterializationAuthorizationEvidenceContract({
      materializationGate: hostileGate({ [field]: value }),
    });
    expect(decision.state).toBe("blocked_materialization_gate_invalid");
    expect(decision.evidenceCollectionProviderIoAuthorized).toBe(false);
    expect(decision.clientMaterializationAuthorized).toBe(false);
  });

  it("rejects a requirement that silently permits provider IO before the final materialization grant", () => {
    const gate = readyGate();
    gate.authorizationRequirement = hostileRequirement({ providerIoBeforeGrantAllowed: true });
    const decision = evaluateLiveMaterializationAuthorizationEvidenceContract({ materializationGate: gate });

    expect(decision.state).toBe("blocked_materialization_gate_invalid");
    expect(decision.blockers).toContainEqual({
      code: "materialization_authorization_requirement_invalid",
      scope: "authorization_requirement",
    });
  });

  it("rejects grant TTL, source, action or live-evidence binding drift", () => {
    const patches = [
      { maxTtlSeconds: 301 },
      { requiredSource: "local_test_control_plane" },
      { action: "materialize_any_provider_clients" },
      { mustBindLiveEvidence: false },
      { atomicConsumptionRequired: false },
    ];

    for (const patch of patches) {
      const gate = readyGate();
      gate.authorizationRequirement = {
        ...requirement(),
        explicitSingleUseGrant: {
          ...requirement().explicitSingleUseGrant,
          ...patch,
        },
      } as ProviderClientMaterializationAuthorizationRequirement;
      expect(
        evaluateLiveMaterializationAuthorizationEvidenceContract({ materializationGate: gate }).state,
      ).toBe("blocked_materialization_gate_invalid");
    }
  });

  it("does not leak access tokens, synthetic emails, secrets or authority handle ids", () => {
    const serialized = JSON.stringify(
      evaluateLiveMaterializationAuthorizationEvidenceContract({ materializationGate: readyGate() }),
    );
    for (const forbidden of [
      "access_token",
      "fixture+",
      "service_role",
      "anon_key",
      "handle.runtime",
      "handle.support",
      "handle.admin",
      "handle.storage",
      "handle.session",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("produces neither activation facts nor provider-execution facts", () => {
    expect(liveMaterializationAuthorizationEvidenceContractProducesNoActivationFacts()).toEqual({});
    expect(liveMaterializationAuthorizationEvidenceContractProducesNoProviderExecutionFacts()).toEqual({});
  });

  it("contains no runtime activation, environment, network or Supabase SDK imports", () => {
    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/live-materialization-authorization-evidence-contract.ts"),
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
