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
  EVIDENCE_COLLECTION_AUTHORIZATION_EXECUTOR_VERSION,
  EvidenceCollectionAuthorizationExecutorError,
  createEvidenceCollectionAuthorizationExecutor,
  evidenceCollectionAuthorizationExecutorProducesNoActivationFacts,
  evidenceCollectionAuthorizationExecutorProducesNoProviderExecutionFacts,
  type StructuralEvidenceCollectionAuthorizationTransport,
  type StructuralEvidenceCollectionAuthorizationTransportResult,
} from "./evidence-collection-authorization-executor";

const PROJECT_BINDING_ID = "binding_dev_037";
const PROJECT_REF = "abcdefghijklmno";
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;
const NOW = "2026-09-13T20:50:00.000Z";
const EXPIRES = "2026-09-13T20:55:00.000Z";
const AUTHORIZATION_ID = "authorization.structural.037";

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

function authorizationContract() {
  return evaluateLiveMaterializationAuthorizationEvidenceContract({ materializationGate: gate() });
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
  calls = 0;
  patch: Record<string, unknown> = {};
  throwTransport = false;
  errorTransport = false;

  async exercise(
    input: Parameters<StructuralEvidenceCollectionAuthorizationTransport["exercise"]>[0],
  ): Promise<StructuralEvidenceCollectionAuthorizationTransportResult> {
    this.calls += 1;
    if (this.throwTransport) throw new Error("offline structural failure");
    if (this.errorTransport) return { data: null, error: { code: "offline_failure" } };
    return {
      data: {
        source: "injected_structural_test_observation",
        provenance: "structural_test_double",
        provider: "supabase",
        projectLabel: "vivienda-dev",
        projectBindingId: input.projectBindingId,
        expectedProjectRef: input.expectedProjectRef,
        expectedProjectUrl: input.expectedProjectUrl,
        authorizationId: AUTHORIZATION_ID,
        requestId: input.requestId,
        nonce: input.nonce,
        issuedAt: NOW,
        expiresAt: EXPIRES,
        allowedActions: [...LIVE_EVIDENCE_COLLECTION_ACTIONS],
        maxUsesPerAction: 1,
        syntheticFixtureOnly: true,
        materializationAllowed: false,
        runtimeActivationAllowed: false,
        deploymentAllowed: false,
        ...this.patch,
      } as StructuralEvidenceCollectionAuthorizationTransportResult extends { data: infer D; error: null }
        ? D
        : never,
      error: null,
    };
  }
}

function executor(transport = new StructuralTransport(), tokenPatch?: (kind: "request_id" | "authorization_nonce") => string) {
  return createEvidenceCollectionAuthorizationExecutor({
    authorizationContract: authorizationContract(),
    transport,
    now: () => NOW,
    tokenSource:
      tokenPatch ??
      ((kind) => (kind === "request_id" ? "request.authorization.037" : "nonce.authorization.037")),
  });
}

async function errorCode(task: () => Promise<unknown>): Promise<string | null> {
  try {
    await task();
    return null;
  } catch (error) {
    return error instanceof EvidenceCollectionAuthorizationExecutorError ? error.code : "unexpected";
  }
}

describe("V0.23.37 evidence collection authorization executor", () => {
  it("validates a structural lease exchange while refusing to treat it as externally issued authority", async () => {
    const result = await executor().execute();

    expect(result).toMatchObject({
      version: EVIDENCE_COLLECTION_AUTHORIZATION_EXECUTOR_VERSION,
      state: "structural_authorization_exchange_satisfied",
      provider: "supabase",
      projectLabel: "vivienda-dev",
      projectBindingId: PROJECT_BINDING_ID,
      expectedProjectRef: PROJECT_REF,
      expectedProjectUrl: PROJECT_URL,
      structuralTransportInvoked: true,
      structuralLeaseEnvelopeValidated: true,
      externalLeaseIssuanceRequired: true,
      externallyIssuedLeaseProven: false,
      externalLeaseReceiptAccepted: false,
      evidenceCollectionAuthorizationAccepted: false,
      evidenceCollectionProviderIoAuthorized: false,
      externalConsumptionReceiptAccepted: false,
      liveRemoteIdentityEvidenceAccepted: false,
      liveSessionBootstrapEvidenceAccepted: false,
      explicitMaterializationGrantAccepted: false,
      clientMaterializationAuthorized: false,
      materializerMayExecute: false,
      providerParityProven: false,
      runtimeActivationAuthorized: false,
      deploymentAuthorized: false,
      activationFactsProduced: false,
    });
    expect(result.structuralLease).toEqual({
      provenance: "structural_test_double",
      authorizationId: AUTHORIZATION_ID,
      issuedAt: NOW,
      expiresAt: EXPIRES,
      allowedActions: LIVE_EVIDENCE_COLLECTION_ACTIONS,
      maxUsesPerAction: 1,
    });
  });

  it("defines a future external issuance receipt that explicitly rejects structural test doubles as evidence", async () => {
    const receipt = (await executor().execute()).externalLeaseReceiptAcceptance;
    expect(receipt).toMatchObject({
      channel: "live_materialization_evidence_collection_authorization_receipt",
      requiredSource: "external_materialization_control_plane",
      requiredProvenance: "externally_issued_and_boundary_verified",
      projectBindingId: PROJECT_BINDING_ID,
      maxTtlSeconds: 300,
      exactActionSetRequired: true,
      allowedActions: LIVE_EVIDENCE_COLLECTION_ACTIONS,
      maxUsesPerAction: 1,
      externalBoundaryVerificationRequired: true,
      structuralTestDoubleAcceptedAsExternalEvidence: false,
      providerClientMaterializationAllowed: false,
      sdkFactoryInvocationAllowed: false,
      runtimeActivationAllowed: false,
      deploymentAllowed: false,
    });
  });

  it("defines the completion receipt as exact one-use consumption of all five Phase A actions", async () => {
    const receipt = (await executor().execute()).externalConsumptionReceiptAcceptance;
    expect(receipt).toMatchObject({
      channel: "live_materialization_evidence_collection_consumption_receipt",
      requiredSource: "external_materialization_control_plane",
      requiredProvenance: "externally_observed_action_consumption",
      authorizationIdMustMatchAcceptedLease: true,
      issuanceReceiptIdMustMatchAcceptedLease: true,
      projectIdentityMustMatchAcceptedLease: true,
      completionMustOccurBeforeLeaseExpiry: true,
      exactCompletedActionSetRequired: true,
      duplicateActionUseAllowed: false,
      unlistedActionUseAllowed: false,
      structuralTestDoubleAcceptedAsExternalEvidence: false,
      providerClientMaterializationAuthorized: false,
      runtimeActivationAuthorized: false,
      deploymentAuthorized: false,
    });
    expect(receipt.actionUses).toEqual(
      LIVE_EVIDENCE_COLLECTION_ACTIONS.map((action) => ({
        action,
        exactUseCount: 1,
        usedAtRequired: true,
        providerIoObservedRequired: true,
      })),
    );
  });

  it("rejects an upstream V0.23.36 decision that self-promotes any execution authority before invoking the transport", async () => {
    const fields = [
      "evidenceCollectionAuthorizationAccepted",
      "evidenceCollectionProviderIoAuthorized",
      "explicitMaterializationGrantAccepted",
      "clientMaterializationAuthorized",
      "materializerMayExecute",
      "runtimeActivationAuthorized",
      "deploymentAuthorized",
    ] as const;

    for (const field of fields) {
      const transport = new StructuralTransport();
      const contract = { ...authorizationContract(), [field]: true } as ReturnType<typeof authorizationContract>;
      expect(() =>
        createEvidenceCollectionAuthorizationExecutor({
          authorizationContract: contract,
          transport,
          now: () => NOW,
          tokenSource: (kind) => (kind === "request_id" ? "request.authorization.037" : "nonce.authorization.037"),
        }),
      ).toThrow(EvidenceCollectionAuthorizationExecutorError);
      expect(transport.calls).toBe(0);
    }
  });

  it("rejects a transport that claims external issuance or provider IO authority before any transport call", () => {
    const transport = new StructuralTransport() as StructuralTransport & {
      externallyIssuedLeaseProven: boolean;
      providerIoAuthorized: boolean;
    };
    Object.defineProperty(transport, "externallyIssuedLeaseProven", { value: true });
    Object.defineProperty(transport, "providerIoAuthorized", { value: true });

    expect(() =>
      createEvidenceCollectionAuthorizationExecutor({
        authorizationContract: authorizationContract(),
        transport: transport as unknown as StructuralEvidenceCollectionAuthorizationTransport,
        now: () => NOW,
        tokenSource: (kind) => (kind === "request_id" ? "request.authorization.037" : "nonce.authorization.037"),
      }),
    ).toThrowError(expect.objectContaining({ code: "invalid_structural_transport" }));
    expect(transport.calls).toBe(0);
  });

  it("rejects project identity drift in a structural observation", async () => {
    const transport = new StructuralTransport();
    transport.patch = { projectBindingId: "binding_dev_other" };
    expect(await errorCode(() => executor(transport).execute())).toBe("structural_identity_mismatch");
  });

  it.each([
    { allowedActions: LIVE_EVIDENCE_COLLECTION_ACTIONS.slice(0, 4) },
    { allowedActions: [...LIVE_EVIDENCE_COLLECTION_ACTIONS].reverse() },
    { maxUsesPerAction: 2 },
    { syntheticFixtureOnly: false },
    { materializationAllowed: true },
    { runtimeActivationAllowed: true },
    { deploymentAllowed: true },
  ])("rejects structural action-scope drift %#", async (patch) => {
    const transport = new StructuralTransport();
    transport.patch = patch;
    expect(await errorCode(() => executor(transport).execute())).toBe("structural_action_scope_mismatch");
  });

  it.each([
    { issuedAt: "2026-09-13T20:50:00.000Z", expiresAt: "2026-09-13T20:55:01.000Z" },
    { issuedAt: "2026-09-13T20:50:00.000Z", expiresAt: "2026-09-13T20:49:59.000Z" },
    { issuedAt: "bad-time", expiresAt: EXPIRES },
  ])("rejects invalid structural lease lifetime %#", async (patch) => {
    const transport = new StructuralTransport();
    transport.patch = patch;
    expect(await errorCode(() => executor(transport).execute())).toBe("structural_lease_lifetime_invalid");
  });

  it("rejects reused or malformed request/nonce values before transport invocation", async () => {
    const transport = new StructuralTransport();
    expect(
      await errorCode(() => executor(transport, () => "same.token.037").execute()),
    ).toBe("invalid_token_source");
    expect(transport.calls).toBe(0);
  });

  it.each(["throw", "error"])("fails closed when structural transport is unavailable via %s", async (mode) => {
    const transport = new StructuralTransport();
    transport.throwTransport = mode === "throw";
    transport.errorTransport = mode === "error";
    expect(await errorCode(() => executor(transport).execute())).toBe("structural_transport_unavailable");
  });

  it("does not leak credentials, synthetic emails or authority handle ids", async () => {
    const serialized = JSON.stringify(await executor().execute());
    for (const forbidden of [
      "service_role",
      "anon_key",
      "access_token",
      "fixture+",
      "handle.runtime",
      "handle.support",
      "handle.admin",
      "handle.storage",
      "handle.session",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("produces neither activation facts nor provider execution facts", () => {
    expect(evidenceCollectionAuthorizationExecutorProducesNoActivationFacts()).toEqual({});
    expect(evidenceCollectionAuthorizationExecutorProducesNoProviderExecutionFacts()).toEqual({});
  });

  it("contains no runtime activation, environment, network or Supabase SDK imports", () => {
    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/evidence-collection-authorization-executor.ts"),
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
