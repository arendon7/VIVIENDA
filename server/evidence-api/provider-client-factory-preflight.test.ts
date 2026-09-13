import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateDevEnvironmentQualification,
  verifiedDevEnvironmentQualificationFacts,
  type DevEnvironmentQualificationDecision,
} from "./dev-provisioning-qualification";
import {
  PROVIDER_CLIENT_FACTORY_PREFLIGHT_VERSION,
  PROVIDER_FACTORY_AUTHORITIES,
  evaluateProviderClientFactoryPreflight,
  providerClientFactoryPreflightProducesNoActivationFacts,
  type ProviderClientFactoryPreflightInput,
  type ProviderFactoryAuthority,
  type ProviderFactoryConstructionPolicy,
  type ProviderFactoryExternalConfigurationManifest,
} from "./provider-client-factory-preflight";

const PROJECT_BINDING_ID = "binding_dev_032";
const PROJECT_REF = "bvykdyhlwawojivopztl";
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;

function qualifiedDev() {
  return evaluateDevEnvironmentQualification(verifiedDevEnvironmentQualificationFacts());
}

function handles(): ProviderFactoryExternalConfigurationManifest["authorityHandles"] {
  return {
    candidate_runtime_rpc: {
      authority: "candidate_runtime",
      handleId: "handle.runtime.032",
      source: "external_secret_broker",
      serverOnly: true,
      secretValueExposedToApplication: false,
    },
    dev_probe_support_rpc: {
      authority: "probe_support",
      handleId: "handle.support.032",
      source: "external_secret_broker",
      serverOnly: true,
      secretValueExposedToApplication: false,
    },
    dev_fixture_admin: {
      authority: "fixture_admin",
      handleId: "handle.admin.032",
      source: "external_secret_broker",
      serverOnly: true,
      secretValueExposedToApplication: false,
    },
    dev_storage: {
      authority: "storage_candidate",
      handleId: "handle.storage.032",
      source: "external_secret_broker",
      serverOnly: true,
      secretValueExposedToApplication: false,
    },
    candidate_session_authority: {
      authority: "synthetic_session",
      handleId: "handle.session.032",
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
    authorityHandles: handles(),
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

function validInput(): ProviderClientFactoryPreflightInput {
  return { qualification: qualifiedDev(), manifest: manifest(), constructionPolicy: policy() };
}

function hostileManifest(patch: Record<string, unknown>): ProviderFactoryExternalConfigurationManifest {
  return { ...manifest(), ...patch } as unknown as ProviderFactoryExternalConfigurationManifest;
}

function hostilePolicy(patch: Record<string, unknown>): ProviderFactoryConstructionPolicy {
  return { ...policy(), ...patch } as unknown as ProviderFactoryConstructionPolicy;
}

function hostileQualification(patch: Record<string, unknown>): DevEnvironmentQualificationDecision {
  return { ...qualifiedDev(), ...patch } as unknown as DevEnvironmentQualificationDecision;
}

function mutateHandle(
  authority: ProviderFactoryAuthority,
  patch: Record<string, unknown>,
): ProviderFactoryExternalConfigurationManifest {
  const base = manifest();
  return {
    ...base,
    authorityHandles: {
      ...base.authorityHandles,
      [authority]: { ...base.authorityHandles[authority], ...patch },
    },
  } as unknown as ProviderFactoryExternalConfigurationManifest;
}

describe("V0.23.32 provider client factory preflight", () => {
  it("declares structural readiness without granting materialization, provider I/O or activation", () => {
    const decision = evaluateProviderClientFactoryPreflight(validInput());
    expect(decision).toMatchObject({
      version: PROVIDER_CLIENT_FACTORY_PREFLIGHT_VERSION,
      state: "structurally_ready_for_authorized_materialization",
      provider: "supabase",
      projectLabel: "vivienda-dev",
      projectBindingId: PROJECT_BINDING_ID,
      normalizedProjectUrl: PROJECT_URL,
      expectedRemoteProjectRef: PROJECT_REF,
      authorityHandleCount: 5,
      blockers: [],
      syntheticOnly: true,
      liveRuntimeAuthorized: false,
      providerIoAuthorized: false,
      clientMaterializationAuthorized: false,
      sdkInstantiated: false,
      remoteIdentityVerified: false,
      sessionBootstrapProven: false,
      runtimeServerWasUsed: false,
      activationFactsProduced: false,
      deploymentAuthorized: false,
    });
    expect(providerClientFactoryPreflightProducesNoActivationFacts()).toEqual({});
  });

  it("emits separate unperformed requirements for remote identity and synthetic sessions", () => {
    const decision = evaluateProviderClientFactoryPreflight(validInput());
    expect(decision.remoteIdentityAttestation).toEqual({
      channel: "remote_project_identity_attestation",
      provider: "supabase",
      projectLabel: "vivienda-dev",
      projectBindingId: PROJECT_BINDING_ID,
      expectedProjectRef: PROJECT_REF,
      expectedProjectUrl: PROJECT_URL,
      required: true,
      networkIoRequired: true,
      performed: false,
      verified: false,
    });
    expect(decision.sessionBootstrap).toEqual({
      channel: "synthetic_session_bootstrap",
      provider: "supabase",
      projectLabel: "vivienda-dev",
      projectBindingId: PROJECT_BINDING_ID,
      strategy: "provider_supported_one_time_exchange",
      ownerAndIntruderRequired: true,
      deterministicFixtureEmailRequired: true,
      passwordGrantAssumed: false,
      locallyMintedJwtAllowed: false,
      providerIoRequired: true,
      performed: false,
      proven: false,
    });
  });

  it("requires exact DEV 14/14 qualification", () => {
    const variants = [
      hostileQualification({ devEnvironmentVerified: false }),
      hostileQualification({ liveRuntimeAuthorized: true }),
      hostileQualification({ verifiedRequirementCount: 13 }),
      hostileQualification({ totalRequirementCount: 13 }),
      hostileQualification({ requirements: qualifiedDev().requirements.slice(0, 13) }),
      hostileQualification({ blockers: [qualifiedDev().requirements[0]] }),
    ];
    for (const qualification of variants) {
      const decision = evaluateProviderClientFactoryPreflight({ ...validInput(), qualification });
      expect(decision.state).toBe("blocked");
      expect(decision.blockers).toContainEqual({ code: "dev_environment_unqualified", scope: "qualification" });
      expect(decision.remoteIdentityAttestation).toBeNull();
      expect(decision.sessionBootstrap).toBeNull();
    }
  });

  it("rejects unsafe project configuration and emits no partial remote identity facts", () => {
    const variants = [
      hostileManifest({ projectLabel: "vivienda-prod" }),
      hostileManifest({ projectBindingId: "short" }),
      hostileManifest({ projectUrl: "http://bvykdyhlwawojivopztl.supabase.co" }),
      hostileManifest({ projectUrl: `${PROJECT_URL}/rest/v1` }),
      hostileManifest({ projectUrl: `${PROJECT_URL}?apikey=secret` }),
      hostileManifest({ projectUrl: "https://user:pass@example.com" }),
      hostileManifest({ expectedRemoteProjectRef: "bad_ref!" }),
      hostileManifest({ source: "runtime_env" }),
      hostileManifest({ syntheticOnly: false }),
      hostileManifest({ liveRuntimeAuthorized: true }),
      hostileManifest({ secretValuesEmbedded: true }),
      hostileManifest({ environmentReadRequiredByContract: true }),
    ];
    for (const badManifest of variants) {
      const decision = evaluateProviderClientFactoryPreflight({ ...validInput(), manifest: badManifest });
      expect(decision.state).toBe("blocked");
      expect(decision.blockers).toContainEqual({ code: "invalid_project_configuration", scope: "project" });
      expect(decision.projectBindingId).toBeNull();
      expect(decision.normalizedProjectUrl).toBeNull();
      expect(decision.expectedRemoteProjectRef).toBeNull();
      expect(decision.remoteIdentityAttestation).toBeNull();
      expect(decision.sessionBootstrap).toBeNull();
    }
  });

  it("accepts HTTPS custom domains while keeping project-ref identity unverified", () => {
    const customDomain = "https://api.vivienda-dev.example.com";
    const decision = evaluateProviderClientFactoryPreflight({
      ...validInput(),
      manifest: hostileManifest({ projectUrl: `${customDomain}/` }),
    });
    expect(decision.state).toBe("structurally_ready_for_authorized_materialization");
    expect(decision.normalizedProjectUrl).toBe(customDomain);
    expect(decision.expectedRemoteProjectRef).toBe(PROJECT_REF);
    expect(decision.remoteIdentityVerified).toBe(false);
    expect(decision.remoteIdentityAttestation?.expectedProjectUrl).toBe(customDomain);
  });

  it("requires all five handles with exact authority classes", () => {
    for (const authority of PROVIDER_FACTORY_AUTHORITIES) {
      const base = manifest();
      const missing = { ...base, authorityHandles: { ...base.authorityHandles } } as ProviderFactoryExternalConfigurationManifest;
      delete (missing.authorityHandles as Partial<typeof missing.authorityHandles>)[authority];
      const missingDecision = evaluateProviderClientFactoryPreflight({ ...validInput(), manifest: missing });
      expect(missingDecision.blockers).toContainEqual({ code: "invalid_authority_handle", scope: authority });

      const mismatch = mutateHandle(authority, {
        authority: authority === "candidate_runtime_rpc" ? "probe_support" : "candidate_runtime",
      });
      const mismatchDecision = evaluateProviderClientFactoryPreflight({ ...validInput(), manifest: mismatch });
      expect(mismatchDecision.blockers).toContainEqual({ code: "authority_class_mismatch", scope: authority });
      expect(mismatchDecision.authorityHandleCount).toBe(4);
    }
  });

  it("requires brokered server-only opaque handles and forbids application-visible secrets", () => {
    const variants = [
      mutateHandle("dev_storage", { handleId: "tiny" }),
      mutateHandle("dev_storage", { handleId: "bad handle whitespace" }),
      mutateHandle("dev_storage", { source: "application_config" }),
      mutateHandle("dev_storage", { serverOnly: false }),
      mutateHandle("dev_storage", { secretValueExposedToApplication: true }),
    ];
    for (const badManifest of variants) {
      const decision = evaluateProviderClientFactoryPreflight({ ...validInput(), manifest: badManifest });
      expect(decision.blockers).toContainEqual({ code: "invalid_authority_handle", scope: "dev_storage" });
      expect(decision.remoteIdentityAttestation).toBeNull();
    }
  });

  it("rejects authority handle reuse", () => {
    const base = manifest();
    const reused = mutateHandle("dev_storage", {
      handleId: base.authorityHandles.candidate_runtime_rpc.handleId,
    });
    const decision = evaluateProviderClientFactoryPreflight({ ...validInput(), manifest: reused });
    expect(decision.blockers).toContainEqual({ code: "authority_handle_reuse", scope: "dev_storage" });
    expect(decision.authorityHandleCount).toBe(4);
  });

  it("blocks every unsafe construction policy", () => {
    const variants = [
      hostilePolicy({ sdkFactoryInjected: false }),
      hostilePolicy({ sdkDependencyRequiredByContract: true }),
      hostilePolicy({ providerIoOnConstruction: true }),
      hostilePolicy({ remoteAttestationOnConstruction: true }),
      hostilePolicy({ sessionBootstrapOnConstruction: true }),
      hostilePolicy({ runtimeServerUsed: true }),
    ];
    for (const constructionPolicy of variants) {
      const decision = evaluateProviderClientFactoryPreflight({ ...validInput(), constructionPolicy });
      expect(decision.blockers).toContainEqual({ code: "unsafe_construction_policy", scope: "construction_policy" });
      expect(decision.providerIoAuthorized).toBe(false);
      expect(decision.clientMaterializationAuthorized).toBe(false);
    }
  });

  it("accumulates independent blockers instead of masking them", () => {
    const decision = evaluateProviderClientFactoryPreflight({
      qualification: hostileQualification({ devEnvironmentVerified: false }),
      manifest: mutateHandle("candidate_session_authority", { serverOnly: false, handleId: "tiny" }),
      constructionPolicy: hostilePolicy({ providerIoOnConstruction: true }),
    });
    expect(decision.state).toBe("blocked");
    expect(decision.blockers).toEqual(expect.arrayContaining([
      { code: "dev_environment_unqualified", scope: "qualification" },
      { code: "unsafe_construction_policy", scope: "construction_policy" },
      { code: "invalid_authority_handle", scope: "candidate_session_authority" },
    ]));
  });

  it("keeps authority map exact and complete", () => {
    expect(PROVIDER_FACTORY_AUTHORITIES).toEqual([
      "candidate_runtime_rpc",
      "dev_probe_support_rpc",
      "dev_fixture_admin",
      "dev_storage",
      "candidate_session_authority",
    ]);
    expect(handles()).toMatchObject({
      candidate_runtime_rpc: { authority: "candidate_runtime" },
      dev_probe_support_rpc: { authority: "probe_support" },
      dev_fixture_admin: { authority: "fixture_admin" },
      dev_storage: { authority: "storage_candidate" },
      candidate_session_authority: { authority: "synthetic_session" },
    });
  });

  it("has no env, SDK construction, runtime activation or provider-I/O implementation dependency", () => {
    const source = readFileSync(join(process.cwd(), "server/evidence-api/provider-client-factory-preflight.ts"), "utf8");
    expect(source).not.toMatch(/process\.env|Deno\.env|SUPABASE_(URL|KEY|SECRET)|service_role|sb_secret_/);
    expect(source).not.toMatch(/@supabase\/supabase-js|createClient\s*\(/);
    expect(source).not.toMatch(/from\s+["']\.\/runtime\.server["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activated-runtime["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activation-preflight["']/);
    expect(source).not.toMatch(/fetch\s*\(|\.rpc\s*\(|createSigned|signIn|verifyOtp|generateLink/);
  });
});
