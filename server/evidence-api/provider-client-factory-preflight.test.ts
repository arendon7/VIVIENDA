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

const authorityClass = {
  candidate_runtime_rpc: "candidate_runtime",
  dev_probe_support_rpc: "probe_support",
  dev_fixture_admin: "fixture_admin",
  dev_storage: "storage_candidate",
  candidate_session_authority: "synthetic_session",
} as const;

function authorityHandles(): ProviderFactoryExternalConfigurationManifest["authorityHandles"] {
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

function manifest(
  overrides: Partial<ProviderFactoryExternalConfigurationManifest> = {},
): ProviderFactoryExternalConfigurationManifest {
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
    ...overrides,
  };
}

function constructionPolicy(
  overrides: Partial<ProviderFactoryConstructionPolicy> = {},
): ProviderFactoryConstructionPolicy {
  return {
    sdkFactoryInjected: true,
    sdkDependencyRequiredByContract: false,
    providerIoOnConstruction: false,
    remoteAttestationOnConstruction: false,
    sessionBootstrapOnConstruction: false,
    runtimeServerUsed: false,
    ...overrides,
  };
}

function input(overrides: Partial<ProviderClientFactoryPreflightInput> = {}): ProviderClientFactoryPreflightInput {
  return {
    qualification: qualifiedDev(),
    manifest: manifest(),
    constructionPolicy: constructionPolicy(),
    ...overrides,
  };
}

function mutateHandle(
  base: ProviderFactoryExternalConfigurationManifest,
  authority: ProviderFactoryAuthority,
  patch: Record<string, unknown>,
): ProviderFactoryExternalConfigurationManifest {
  return {
    ...base,
    authorityHandles: {
      ...base.authorityHandles,
      [authority]: {
        ...base.authorityHandles[authority],
        ...patch,
      },
    },
  } as ProviderFactoryExternalConfigurationManifest;
}

describe("V0.23.32 provider client factory preflight", () => {
  it("declares structural readiness without granting materialization or provider I/O", () => {
    const decision = evaluateProviderClientFactoryPreflight(input());

    expect(decision.version).toBe(PROVIDER_CLIENT_FACTORY_PREFLIGHT_VERSION);
    expect(decision.state).toBe("structurally_ready_for_authorized_materialization");
    expect(decision.provider).toBe("supabase");
    expect(decision.projectLabel).toBe("vivienda-dev");
    expect(decision.projectBindingId).toBe(PROJECT_BINDING_ID);
    expect(decision.normalizedProjectUrl).toBe(PROJECT_URL);
    expect(decision.expectedRemoteProjectRef).toBe(PROJECT_REF);
    expect(decision.authorityHandleCount).toBe(5);
    expect(decision.blockers).toEqual([]);
    expect(decision.syntheticOnly).toBe(true);
    expect(decision.liveRuntimeAuthorized).toBe(false);
    expect(decision.providerIoAuthorized).toBe(false);
    expect(decision.clientMaterializationAuthorized).toBe(false);
    expect(decision.sdkInstantiated).toBe(false);
    expect(decision.remoteIdentityVerified).toBe(false);
    expect(decision.sessionBootstrapProven).toBe(false);
    expect(decision.runtimeServerWasUsed).toBe(false);
    expect(decision.activationFactsProduced).toBe(false);
    expect(decision.deploymentAuthorized).toBe(false);
  });

  it("produces separate, still-unperformed plans for remote identity and synthetic sessions", () => {
    const decision = evaluateProviderClientFactoryPreflight(input());

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
    expect(providerClientFactoryPreflightProducesNoActivationFacts()).toEqual({});
  });

  it("requires the exact qualified DEV 14/14 state", () => {
    const base = qualifiedDev();
    const variants: DevEnvironmentQualificationDecision[] = [
      { ...base, state: "blocked" } as DevEnvironmentQualificationDecision,
      { ...base, devEnvironmentVerified: false } as DevEnvironmentQualificationDecision,
      { ...base, liveRuntimeAuthorized: true } as DevEnvironmentQualificationDecision,
      { ...base, verifiedRequirementCount: 13 } as DevEnvironmentQualificationDecision,
      { ...base, totalRequirementCount: 13 } as DevEnvironmentQualificationDecision,
      { ...base, requirements: base.requirements.slice(0, 13) } as DevEnvironmentQualificationDecision,
    ];

    for (const qualification of variants) {
      const decision = evaluateProviderClientFactoryPreflight(input({ qualification }));
      expect(decision.state).toBe("blocked");
      expect(decision.blockers).toContainEqual({
        code: "dev_environment_unqualified",
        scope: "qualification",
      });
      expect(decision.remoteIdentityAttestation).toBeNull();
      expect(decision.sessionBootstrap).toBeNull();
    }
  });

  it("rejects unsafe project configuration and never emits partial remote identity facts", () => {
    const variants = [
      manifest({ projectLabel: "vivienda-prod" as "vivienda-dev" }),
      manifest({ projectBindingId: "short" }),
      manifest({ projectUrl: "http://bvykdyhlwawojivopztl.supabase.co" }),
      manifest({ projectUrl: `${PROJECT_URL}/rest/v1` }),
      manifest({ projectUrl: `${PROJECT_URL}?apikey=secret` }),
      manifest({ projectUrl: "https://user:pass@example.com" }),
      manifest({ expectedRemoteProjectRef: "bad_ref!" }),
      manifest({ source: "runtime_env" as "external_injected_configuration" }),
      manifest({ syntheticOnly: false as true }),
      manifest({ liveRuntimeAuthorized: true as false }),
      manifest({ secretValuesEmbedded: true }),
      manifest({ environmentReadRequiredByContract: true }),
    ];

    for (const unsafeManifest of variants) {
      const decision = evaluateProviderClientFactoryPreflight(input({ manifest: unsafeManifest }));
      expect(decision.state).toBe("blocked");
      expect(decision.blockers).toContainEqual({
        code: "invalid_project_configuration",
        scope: "project",
      });
      expect(decision.projectBindingId).toBeNull();
      expect(decision.normalizedProjectUrl).toBeNull();
      expect(decision.expectedRemoteProjectRef).toBeNull();
      expect(decision.remoteIdentityAttestation).toBeNull();
      expect(decision.sessionBootstrap).toBeNull();
    }
  });

  it("accepts a clean HTTPS custom domain while keeping project-ref attestation separate", () => {
    const customDomain = "https://api.vivienda-dev.example.com";
    const decision = evaluateProviderClientFactoryPreflight(
      input({ manifest: manifest({ projectUrl: `${customDomain}/` }) }),
    );

    expect(decision.state).toBe("structurally_ready_for_authorized_materialization");
    expect(decision.normalizedProjectUrl).toBe(customDomain);
    expect(decision.expectedRemoteProjectRef).toBe(PROJECT_REF);
    expect(decision.remoteIdentityVerified).toBe(false);
    expect(decision.remoteIdentityAttestation?.expectedProjectUrl).toBe(customDomain);
    expect(decision.remoteIdentityAttestation?.expectedProjectRef).toBe(PROJECT_REF);
  });

  it("requires all five authority handles with their exact authority classes", () => {
    const base = manifest();
    for (const authority of PROVIDER_FACTORY_AUTHORITIES) {
      const missing = {
        ...base,
        authorityHandles: { ...base.authorityHandles },
      } as ProviderFactoryExternalConfigurationManifest;
      delete (missing.authorityHandles as Partial<typeof missing.authorityHandles>)[authority];
      const missingDecision = evaluateProviderClientFactoryPreflight(input({ manifest: missing }));
      expect(missingDecision.state).toBe("blocked");
      expect(missingDecision.blockers).toContainEqual({ code: "invalid_authority_handle", scope: authority });

      const mismatched = mutateHandle(base, authority, {
        authority: authority === "candidate_runtime_rpc" ? "probe_support" : "candidate_runtime",
      });
      const mismatchDecision = evaluateProviderClientFactoryPreflight(input({ manifest: mismatched }));
      expect(mismatchDecision.blockers).toContainEqual({ code: "authority_class_mismatch", scope: authority });
      expect(mismatchDecision.authorityHandleCount).toBe(4);
    }
  });

  it("requires brokered server-only opaque handles and forbids application-visible secrets", () => {
    const base = manifest();
    const variants = [
      mutateHandle(base, "dev_storage", { handleId: "tiny" }),
      mutateHandle(base, "dev_storage", { handleId: "bad handle whitespace" }),
      mutateHandle(base, "dev_storage", { source: "application_config" }),
      mutateHandle(base, "dev_storage", { serverOnly: false }),
      mutateHandle(base, "dev_storage", { secretValueExposedToApplication: true }),
    ];

    for (const unsafeManifest of variants) {
      const decision = evaluateProviderClientFactoryPreflight(input({ manifest: unsafeManifest }));
      expect(decision.state).toBe("blocked");
      expect(decision.blockers).toContainEqual({
        code: "invalid_authority_handle",
        scope: "dev_storage",
      });
      expect(decision.remoteIdentityAttestation).toBeNull();
      expect(decision.sessionBootstrap).toBeNull();
    }
  });

  it("rejects authority handle reuse even when both individual handles are otherwise valid", () => {
    const base = manifest();
    const reused = mutateHandle(base, "dev_storage", {
      handleId: base.authorityHandles.candidate_runtime_rpc.handleId,
    });
    const decision = evaluateProviderClientFactoryPreflight(input({ manifest: reused }));

    expect(decision.state).toBe("blocked");
    expect(decision.blockers).toContainEqual({
      code: "authority_handle_reuse",
      scope: "dev_storage",
    });
    expect(decision.authorityHandleCount).toBe(4);
  });

  it("blocks every policy that would instantiate, attest, bootstrap or use runtime authority during construction", () => {
    const unsafePolicies: ProviderFactoryConstructionPolicy[] = [
      constructionPolicy({ sdkFactoryInjected: false as true }),
      constructionPolicy({ sdkDependencyRequiredByContract: true }),
      constructionPolicy({ providerIoOnConstruction: true }),
      constructionPolicy({ remoteAttestationOnConstruction: true }),
      constructionPolicy({ sessionBootstrapOnConstruction: true }),
      constructionPolicy({ runtimeServerUsed: true }),
    ];

    for (const policy of unsafePolicies) {
      const decision = evaluateProviderClientFactoryPreflight(input({ constructionPolicy: policy }));
      expect(decision.state).toBe("blocked");
      expect(decision.blockers).toContainEqual({
        code: "unsafe_construction_policy",
        scope: "construction_policy",
      });
      expect(decision.providerIoAuthorized).toBe(false);
      expect(decision.clientMaterializationAuthorized).toBe(false);
    }
  });

  it("accumulates independent blockers instead of allowing one valid boundary to mask another", () => {
    const badQualification = {
      ...qualifiedDev(),
      devEnvironmentVerified: false,
    } as DevEnvironmentQualificationDecision;
    const badManifest = mutateHandle(
      manifest({ projectBindingId: "short" }),
      "candidate_session_authority",
      { serverOnly: false },
    );
    const decision = evaluateProviderClientFactoryPreflight(
      input({
        qualification: badQualification,
        manifest: badManifest,
        constructionPolicy: constructionPolicy({ providerIoOnConstruction: true }),
      }),
    );

    expect(decision.state).toBe("blocked");
    expect(decision.blockers).toEqual(
      expect.arrayContaining([
        { code: "dev_environment_unqualified", scope: "qualification" },
        { code: "invalid_project_configuration", scope: "project" },
        { code: "unsafe_construction_policy", scope: "construction_policy" },
        { code: "invalid_authority_handle", scope: "candidate_session_authority" },
      ]),
    );
    expect(decision.remoteIdentityAttestation).toBeNull();
    expect(decision.sessionBootstrap).toBeNull();
  });

  it("never converts structural readiness into remote identity, session, activation or deployment authority", () => {
    const decision = evaluateProviderClientFactoryPreflight(input());

    expect(decision.state).toBe("structurally_ready_for_authorized_materialization");
    expect({
      providerIoAuthorized: decision.providerIoAuthorized,
      clientMaterializationAuthorized: decision.clientMaterializationAuthorized,
      sdkInstantiated: decision.sdkInstantiated,
      remoteIdentityVerified: decision.remoteIdentityVerified,
      sessionBootstrapProven: decision.sessionBootstrapProven,
      runtimeServerWasUsed: decision.runtimeServerWasUsed,
      activationFactsProduced: decision.activationFactsProduced,
      deploymentAuthorized: decision.deploymentAuthorized,
    }).toEqual({
      providerIoAuthorized: false,
      clientMaterializationAuthorized: false,
      sdkInstantiated: false,
      remoteIdentityVerified: false,
      sessionBootstrapProven: false,
      runtimeServerWasUsed: false,
      activationFactsProduced: false,
      deploymentAuthorized: false,
    });
  });

  it("has no env, credential, SDK, runtime activation or provider-I/O implementation dependency", () => {
    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/provider-client-factory-preflight.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/process\.env|Deno\.env|SUPABASE_(URL|KEY|SECRET)|service_role|sb_secret_/);
    expect(source).not.toMatch(/@supabase\/supabase-js|createClient\s*\(/);
    expect(source).not.toMatch(/from\s+["']\.\/runtime\.server["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activated-runtime["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activation-preflight["']/);
    expect(source).not.toMatch(/fetch\s*\(|\.rpc\s*\(|createSigned|signIn|verifyOtp|generateLink/);
  });

  it("keeps the authority map exact and complete", () => {
    expect(PROVIDER_FACTORY_AUTHORITIES).toEqual([
      "candidate_runtime_rpc",
      "dev_probe_support_rpc",
      "dev_fixture_admin",
      "dev_storage",
      "candidate_session_authority",
    ]);

    const base = manifest();
    for (const authority of PROVIDER_FACTORY_AUTHORITIES) {
      expect(base.authorityHandles[authority].authority).toBe(authorityClass[authority]);
    }
  });
});
