import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateDevEnvironmentQualification,
  verifiedDevEnvironmentQualificationFacts,
  type DevEnvironmentQualificationDecision,
} from "./dev-provisioning-qualification";
import {
  evaluateProviderClientFactoryPreflight,
  type ProviderClientFactoryPreflightDecision,
  type ProviderClientFactoryPreflightInput,
  type ProviderFactoryConstructionPolicy,
  type ProviderFactoryExternalConfigurationManifest,
} from "./provider-client-factory-preflight";
import type { RemoteIdentityAttestationContractResult } from "./remote-project-identity-attestation-executor";
import type { SyntheticSessionBootstrapContractResult } from "./synthetic-session-bootstrap-executor";
import {
  AUTHORIZED_CLIENT_MATERIALIZATION_GATE_VERSION,
  authorizedClientMaterializationGateProducesNoActivationFacts,
  authorizedClientMaterializationGateProducesNoProviderExecutionFacts,
  evaluateAuthorizedClientMaterializationGate,
  expectedProviderFactoryAuthorityCount,
  type ProviderClientMaterializationGateInput,
} from "./authorized-client-materialization-gate";

const PROJECT_BINDING_ID = "binding_dev_035";
const PROJECT_REF = "abcdefghijklmno";
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;
const OBSERVED_AT = "2026-09-13T17:40:00.000Z";
const SESSION_EXPIRES_AT = "2026-09-13T18:00:00.000Z";
const FIXTURE_ID = "fx_bootstrap035";
const NAMESPACE = "vivienda_dev_bootstrap035";
const OWNER_SUBJECT = "sub_synthetic_bootstrap035_owner";
const INTRUDER_SUBJECT = "sub_synthetic_bootstrap035_intruder";
const OWNER_TOKEN = "owner.access.token.035";
const INTRUDER_TOKEN = "intruder.access.token.035";

function qualifiedDev() {
  return evaluateDevEnvironmentQualification(verifiedDevEnvironmentQualificationFacts());
}

function authorityHandles(): ProviderFactoryExternalConfigurationManifest["authorityHandles"] {
  return {
    candidate_runtime_rpc: {
      authority: "candidate_runtime",
      handleId: "handle.runtime.035",
      source: "external_secret_broker",
      serverOnly: true,
      secretValueExposedToApplication: false,
    },
    dev_probe_support_rpc: {
      authority: "probe_support",
      handleId: "handle.support.035",
      source: "external_secret_broker",
      serverOnly: true,
      secretValueExposedToApplication: false,
    },
    dev_fixture_admin: {
      authority: "fixture_admin",
      handleId: "handle.admin.035",
      source: "external_secret_broker",
      serverOnly: true,
      secretValueExposedToApplication: false,
    },
    dev_storage: {
      authority: "storage_candidate",
      handleId: "handle.storage.035",
      source: "external_secret_broker",
      serverOnly: true,
      secretValueExposedToApplication: false,
    },
    candidate_session_authority: {
      authority: "synthetic_session",
      handleId: "handle.session.035",
      source: "external_secret_broker",
      serverOnly: true,
      secretValueExposedToApplication: false,
    },
  };
}

function manifest(): ProviderFactoryExternalConfigurationManifest {
  return {
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId: PROJECT_BINDING_ID,
    projectUrl: PROJECT_URL,
    expectedRemoteProjectRef: PROJECT_REF,
    source: "external_injected_configuration",
    syntheticOnly: true,
    liveRuntimeAuthorized: false,
    secretValuesEmbedded: false,
    environmentReadRequiredByContract: false,
    authorityHandles: authorityHandles(),
  };
}

function policy(): ProviderFactoryConstructionPolicy {
  return {
    sdkFactoryInjected: true,
    sdkDependencyRequiredByContract: false,
    providerIoOnConstruction: false,
    remoteAttestationOnConstruction: false,
    sessionBootstrapOnConstruction: false,
    runtimeServerUsed: false,
  };
}

function preflightInput(): ProviderClientFactoryPreflightInput {
  return {
    qualification: qualifiedDev(),
    manifest: manifest(),
    constructionPolicy: policy(),
  };
}

function attestationContract(): RemoteIdentityAttestationContractResult {
  return {
    version: "V0.23.33-REMOTE-IDENTITY-ATTESTATION-EXECUTOR-V1",
    state: "attestation_contract_satisfied",
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId: PROJECT_BINDING_ID,
    expectedProjectRef: PROJECT_REF,
    expectedProjectUrl: PROJECT_URL,
    requestId: "request.attestation.035",
    observationNonce: "nonce.attestation.035",
    observedAt: OBSERVED_AT,
    attestationContractSatisfied: true,
    injectedTransportInvoked: true,
    liveProviderEvidenceProven: false,
    remoteIdentityVerified: false,
    clientMaterializationAuthorized: false,
    sessionBootstrapProven: false,
    providerParityProven: false,
    runtimeActivationAuthorized: false,
    deploymentAuthorized: false,
  };
}

function sessionContract(): SyntheticSessionBootstrapContractResult {
  return {
    version: "V0.23.34-SYNTHETIC-SESSION-BOOTSTRAP-EXECUTOR-V1",
    state: "session_bootstrap_contract_satisfied",
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId: PROJECT_BINDING_ID,
    fixtureId: FIXTURE_ID,
    namespace: NAMESPACE,
    owner: {
      actor: "owner",
      subjectRef: OWNER_SUBJECT,
      syntheticEmail: `fixture+${NAMESPACE}.owner@vivienda.invalid`,
      accessToken: OWNER_TOKEN,
      expiresAt: SESSION_EXPIRES_AT,
      serverOnly: true,
    },
    intruder: {
      actor: "intruder",
      subjectRef: INTRUDER_SUBJECT,
      syntheticEmail: `fixture+${NAMESPACE}.intruder@vivienda.invalid`,
      accessToken: INTRUDER_TOKEN,
      expiresAt: SESSION_EXPIRES_AT,
      serverOnly: true,
    },
    sessionBootstrapContractSatisfied: true,
    injectedTransportInvoked: true,
    liveProviderSessionProven: false,
    sessionBootstrapProven: false,
    remoteIdentityVerified: false,
    clientMaterializationAuthorized: false,
    providerParityProven: false,
    runtimeActivationAuthorized: false,
    deploymentAuthorized: false,
  };
}

function validGateInput(): ProviderClientMaterializationGateInput {
  const snapshot = preflightInput();
  return {
    preflightInput: snapshot,
    currentPreflightInput: preflightInput(),
    preflightDecision: evaluateProviderClientFactoryPreflight(snapshot),
    attestationContract: attestationContract(),
    sessionBootstrapContract: sessionContract(),
  };
}

function hostileDecision(
  base: ProviderClientFactoryPreflightDecision,
  patch: Record<string, unknown>,
): ProviderClientFactoryPreflightDecision {
  return { ...base, ...patch } as unknown as ProviderClientFactoryPreflightDecision;
}

function hostileAttestation(patch: Record<string, unknown>): RemoteIdentityAttestationContractResult {
  return { ...attestationContract(), ...patch } as unknown as RemoteIdentityAttestationContractResult;
}

function hostileSession(patch: Record<string, unknown>): SyntheticSessionBootstrapContractResult {
  return { ...sessionContract(), ...patch } as unknown as SyntheticSessionBootstrapContractResult;
}

function hostileQualification(patch: Record<string, unknown>): DevEnvironmentQualificationDecision {
  return { ...qualifiedDev(), ...patch } as unknown as DevEnvironmentQualificationDecision;
}

function currentWithHandleDrift(): ProviderClientFactoryPreflightInput {
  const current = preflightInput();
  return {
    ...current,
    manifest: {
      ...current.manifest,
      authorityHandles: {
        ...current.manifest.authorityHandles,
        dev_storage: {
          ...current.manifest.authorityHandles.dev_storage,
          handleId: "handle.storage.035.rotated",
        },
      },
    },
  };
}

describe("V0.23.35 authorized client materialization gate", () => {
  it("validates the offline contract stack but grants no provider, SDK or materialization authority", () => {
    const decision = evaluateAuthorizedClientMaterializationGate(validGateInput());

    expect(decision).toMatchObject({
      version: AUTHORIZED_CLIENT_MATERIALIZATION_GATE_VERSION,
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
    });
    expect(expectedProviderFactoryAuthorityCount()).toBe(5);
    expect(authorizedClientMaterializationGateProducesNoActivationFacts()).toEqual({});
    expect(authorizedClientMaterializationGateProducesNoProviderExecutionFacts()).toEqual({});
  });

  it("emits an exact future live-authorization requirement without satisfying it", () => {
    const requirement = evaluateAuthorizedClientMaterializationGate(validGateInput()).authorizationRequirement;
    expect(requirement).toEqual({
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
    });
  });

  it("never returns access tokens, fixture emails or authority handle ids", () => {
    const decision = evaluateAuthorizedClientMaterializationGate(validGateInput());
    const serialized = JSON.stringify(decision);
    for (const forbidden of [
      OWNER_TOKEN,
      INTRUDER_TOKEN,
      `fixture+${NAMESPACE}.owner@vivienda.invalid`,
      `fixture+${NAMESPACE}.intruder@vivienda.invalid`,
      "handle.runtime.035",
      "handle.support.035",
      "handle.admin.035",
      "handle.storage.035",
      "handle.session.035",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("detects opaque authority handle rotation that V0.23.32 summary fields cannot reveal", () => {
    const input = validGateInput();
    const decision = evaluateAuthorizedClientMaterializationGate({
      ...input,
      currentPreflightInput: currentWithHandleDrift(),
    });

    expect(decision.state).toBe("blocked_contract_inconsistent");
    expect(decision.configurationRevalidated).toBe(true);
    expect(decision.configurationStable).toBe(false);
    expect(decision.contractStackValidated).toBe(false);
    expect(decision.blockers).toContainEqual({
      code: "preflight_configuration_drift",
      scope: "configuration_drift",
    });
    expect(decision.authorizationRequirement).toBeNull();
    expect(decision.materializerMayExecute).toBe(false);
  });

  it("detects project configuration drift even when both snapshots are structurally valid", () => {
    const input = validGateInput();
    const current = preflightInput();
    current.manifest.projectUrl = "https://custom.vivienda-dev.example.com";
    const decision = evaluateAuthorizedClientMaterializationGate({
      ...input,
      currentPreflightInput: current,
    });

    expect(decision.state).toBe("blocked_contract_inconsistent");
    expect(decision.configurationRevalidated).toBe(true);
    expect(decision.configurationStable).toBe(false);
    expect(decision.expectedProjectUrl).toBe("https://custom.vivienda-dev.example.com");
    expect(decision.blockers).toContainEqual({
      code: "preflight_configuration_drift",
      scope: "configuration_drift",
    });
  });

  it("blocks when current DEV qualification or construction policy no longer passes V0.23.32", () => {
    const variants: ProviderClientFactoryPreflightInput[] = [
      {
        ...preflightInput(),
        qualification: hostileQualification({ verifiedRequirementCount: 13 }),
      },
      {
        ...preflightInput(),
        constructionPolicy: {
          ...policy(),
          providerIoOnConstruction: true,
        } as unknown as ProviderFactoryConstructionPolicy,
      },
    ];

    for (const currentPreflightInput of variants) {
      const decision = evaluateAuthorizedClientMaterializationGate({
        ...validGateInput(),
        currentPreflightInput,
      });
      expect(decision.state).toBe("blocked_contract_inconsistent");
      expect(decision.configurationRevalidated).toBe(false);
      expect(decision.contractStackValidated).toBe(false);
      expect(decision.blockers).toContainEqual({
        code: "preflight_revalidation_failed",
        scope: "preflight",
      });
      expect(decision.authorizationRequirement).toBeNull();
    }
  });

  it("blocks a supplied V0.23.32 decision that no longer matches its frozen structural input", () => {
    const input = validGateInput();
    const decision = evaluateAuthorizedClientMaterializationGate({
      ...input,
      preflightDecision: hostileDecision(input.preflightDecision, { authorityHandleCount: 4 }),
    });

    expect(decision.state).toBe("blocked_contract_inconsistent");
    expect(decision.blockers).toContainEqual({
      code: "preflight_decision_mismatch",
      scope: "preflight",
    });
    expect(decision.contractStackValidated).toBe(false);
  });

  it("rejects any V0.23.33 attempt to self-promote injected evidence into live authority", () => {
    const variants = [
      hostileAttestation({ liveProviderEvidenceProven: true }),
      hostileAttestation({ remoteIdentityVerified: true }),
      hostileAttestation({ clientMaterializationAuthorized: true }),
      hostileAttestation({ runtimeActivationAuthorized: true }),
      hostileAttestation({ deploymentAuthorized: true }),
    ];

    for (const attestationContract of variants) {
      const decision = evaluateAuthorizedClientMaterializationGate({
        ...validGateInput(),
        attestationContract,
      });
      expect(decision.state).toBe("blocked_contract_inconsistent");
      expect(decision.blockers).toContainEqual({
        code: "attestation_contract_invalid",
        scope: "attestation_contract",
      });
      expect(decision.remoteIdentityVerified).toBe(false);
      expect(decision.clientMaterializationAuthorized).toBe(false);
    }
  });

  it("rejects malformed or mismatched V0.23.33 project/request evidence", () => {
    const variants = [
      hostileAttestation({ expectedProjectRef: "wrongprojectref" }),
      hostileAttestation({ expectedProjectUrl: `${PROJECT_URL}/rest/v1` }),
      hostileAttestation({ requestId: "bad id whitespace" }),
      hostileAttestation({ observationNonce: "bad" }),
      hostileAttestation({ observedAt: "not-a-date" }),
      hostileAttestation({ projectBindingId: "binding_other_035" }),
    ];

    for (const attestationContract of variants) {
      const decision = evaluateAuthorizedClientMaterializationGate({
        ...validGateInput(),
        attestationContract,
      });
      expect(decision.blockers).toContainEqual({
        code: "attestation_contract_invalid",
        scope: "attestation_contract",
      });
      expect(decision.authorizationRequirement).toBeNull();
    }
  });

  it("rejects any V0.23.34 attempt to self-promote injected sessions into live authority", () => {
    const variants = [
      hostileSession({ liveProviderSessionProven: true }),
      hostileSession({ sessionBootstrapProven: true }),
      hostileSession({ remoteIdentityVerified: true }),
      hostileSession({ clientMaterializationAuthorized: true }),
      hostileSession({ runtimeActivationAuthorized: true }),
      hostileSession({ deploymentAuthorized: true }),
    ];

    for (const sessionBootstrapContract of variants) {
      const decision = evaluateAuthorizedClientMaterializationGate({
        ...validGateInput(),
        sessionBootstrapContract,
      });
      expect(decision.state).toBe("blocked_contract_inconsistent");
      expect(decision.blockers).toContainEqual({
        code: "session_bootstrap_contract_invalid",
        scope: "session_bootstrap_contract",
      });
      expect(decision.sessionBootstrapProven).toBe(false);
      expect(decision.materializerMayExecute).toBe(false);
    }
  });

  it("rejects session identity, email, token separation and server-only tampering", () => {
    const base = sessionContract();
    const variants = [
      hostileSession({
        owner: { ...base.owner, syntheticEmail: "owner@example.com" },
      }),
      hostileSession({
        owner: { ...base.owner, subjectRef: "subject_external" },
      }),
      hostileSession({
        owner: { ...base.owner, accessToken: base.intruder.accessToken },
      }),
      hostileSession({
        owner: { ...base.owner, serverOnly: false },
      }),
      hostileSession({
        intruder: { ...base.intruder, expiresAt: "not-a-date" },
      }),
      hostileSession({ projectBindingId: "binding_other_035" }),
    ];

    for (const sessionBootstrapContract of variants) {
      const decision = evaluateAuthorizedClientMaterializationGate({
        ...validGateInput(),
        sessionBootstrapContract,
      });
      expect(decision.blockers).toContainEqual({
        code: "session_bootstrap_contract_invalid",
        scope: "session_bootstrap_contract",
      });
      expect(decision.authorizationRequirement).toBeNull();
    }
  });

  it("does not treat cross-stack binding mismatch as a separate live fact; it fails the originating contract", () => {
    const attestationMismatch = evaluateAuthorizedClientMaterializationGate({
      ...validGateInput(),
      attestationContract: hostileAttestation({ projectBindingId: "binding_other_035" }),
    });
    expect(attestationMismatch.blockers).toEqual([
      { code: "attestation_contract_invalid", scope: "attestation_contract" },
    ]);

    const sessionMismatch = evaluateAuthorizedClientMaterializationGate({
      ...validGateInput(),
      sessionBootstrapContract: hostileSession({ projectBindingId: "binding_other_035" }),
    });
    expect(sessionMismatch.blockers).toEqual([
      { code: "session_bootstrap_contract_invalid", scope: "session_bootstrap_contract" },
    ]);
  });

  it("contains no environment reads, SDK creation, direct provider I/O or runtime activation dependency", () => {
    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/authorized-client-materialization-gate.ts"),
      "utf8",
    );

    for (const forbidden of [
      "process.env",
      "@supabase/",
      "createClient(",
      "fetch(",
      ".rpc(",
      "runtime.server",
      "activated-runtime",
      "activation-preflight",
    ]) {
      expect(source).not.toContain(forbidden);
    }
    expect(source).not.toContain(OWNER_TOKEN);
    expect(source).not.toContain(INTRUDER_TOKEN);
  });
});
