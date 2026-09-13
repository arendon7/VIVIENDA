import type { DevEnvironmentQualificationDecision } from "./dev-provisioning-qualification";

export const PROVIDER_CLIENT_FACTORY_PREFLIGHT_VERSION =
  "V0.23.32-PROVIDER-CLIENT-FACTORY-PREFLIGHT-V1" as const;

const DEV_PROJECT_LABEL = "vivienda-dev" as const;
const QUALIFICATION_REQUIREMENT_COUNT = 14;
const BINDING_ID = /^[A-Za-z0-9_-]{8,80}$/;
const HANDLE_ID = /^[A-Za-z0-9_.:-]{8,120}$/;
const PROJECT_REF = /^[a-z0-9]{8,40}$/;
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;

export const PROVIDER_FACTORY_AUTHORITIES = [
  "candidate_runtime_rpc",
  "dev_probe_support_rpc",
  "dev_fixture_admin",
  "dev_storage",
  "candidate_session_authority",
] as const;

export type ProviderFactoryAuthority = (typeof PROVIDER_FACTORY_AUTHORITIES)[number];

export type ProviderFactoryAuthorityClass =
  | "candidate_runtime"
  | "probe_support"
  | "fixture_admin"
  | "storage_candidate"
  | "synthetic_session";

const AUTHORITY_CLASS: Record<ProviderFactoryAuthority, ProviderFactoryAuthorityClass> = {
  candidate_runtime_rpc: "candidate_runtime",
  dev_probe_support_rpc: "probe_support",
  dev_fixture_admin: "fixture_admin",
  dev_storage: "storage_candidate",
  candidate_session_authority: "synthetic_session",
};

export type ProviderFactoryExternalConfigurationManifest = {
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  projectUrl: string;
  expectedRemoteProjectRef: string;
  source: "external_injected_configuration";
  syntheticOnly: true;
  liveRuntimeAuthorized: false;
  secretValuesEmbedded: false;
  environmentReadRequiredByContract: false;
  authorityHandles: Record<
    ProviderFactoryAuthority,
    {
      authority: ProviderFactoryAuthorityClass;
      handleId: string;
      source: "external_secret_broker";
      serverOnly: true;
      secretValueExposedToApplication: false;
    }
  >;
};

export type ProviderFactoryConstructionPolicy = {
  sdkFactoryInjected: true;
  sdkDependencyRequiredByContract: false;
  providerIoOnConstruction: false;
  remoteAttestationOnConstruction: false;
  sessionBootstrapOnConstruction: false;
  runtimeServerUsed: false;
};

export type ProviderRemoteIdentityAttestationRequirement = {
  channel: "remote_project_identity_attestation";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  expectedProjectRef: string;
  expectedProjectUrl: string;
  required: true;
  networkIoRequired: true;
  performed: false;
  verified: false;
};

export type ProviderSyntheticSessionBootstrapPlan = {
  channel: "synthetic_session_bootstrap";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  strategy: "provider_supported_one_time_exchange";
  ownerAndIntruderRequired: true;
  deterministicFixtureEmailRequired: true;
  passwordGrantAssumed: false;
  locallyMintedJwtAllowed: false;
  providerIoRequired: true;
  performed: false;
  proven: false;
};

export type ProviderClientFactoryPreflightState =
  | "structurally_ready_for_authorized_materialization"
  | "blocked";

export type ProviderClientFactoryPreflightBlockerCode =
  | "dev_environment_unqualified"
  | "invalid_project_configuration"
  | "invalid_authority_handle"
  | "authority_handle_reuse"
  | "authority_class_mismatch"
  | "unsafe_construction_policy";

export type ProviderClientFactoryPreflightBlocker = {
  code: ProviderClientFactoryPreflightBlockerCode;
  scope: "qualification" | "project" | ProviderFactoryAuthority | "construction_policy";
};

export type ProviderClientFactoryPreflightDecision = {
  version: typeof PROVIDER_CLIENT_FACTORY_PREFLIGHT_VERSION;
  state: ProviderClientFactoryPreflightState;
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string | null;
  normalizedProjectUrl: string | null;
  expectedRemoteProjectRef: string | null;
  authorityHandleCount: number;
  blockers: ProviderClientFactoryPreflightBlocker[];
  syntheticOnly: true;
  liveRuntimeAuthorized: false;
  providerIoAuthorized: false;
  clientMaterializationAuthorized: false;
  sdkInstantiated: false;
  remoteIdentityVerified: false;
  sessionBootstrapProven: false;
  runtimeServerWasUsed: false;
  remoteIdentityAttestation: ProviderRemoteIdentityAttestationRequirement | null;
  sessionBootstrap: ProviderSyntheticSessionBootstrapPlan | null;
  activationFactsProduced: false;
  deploymentAuthorized: false;
};

export type ProviderClientFactoryPreflightInput = {
  qualification: DevEnvironmentQualificationDecision;
  manifest: ProviderFactoryExternalConfigurationManifest;
  constructionPolicy: ProviderFactoryConstructionPolicy;
};

function isQualifiedDev(qualification: DevEnvironmentQualificationDecision): boolean {
  return (
    qualification.state === "qualified_for_staging_candidate" &&
    qualification.devEnvironmentVerified === true &&
    qualification.liveRuntimeAuthorized === false &&
    qualification.totalRequirementCount === QUALIFICATION_REQUIREMENT_COUNT &&
    qualification.verifiedRequirementCount === QUALIFICATION_REQUIREMENT_COUNT &&
    qualification.blockers.length === 0 &&
    qualification.requirements.length === QUALIFICATION_REQUIREMENT_COUNT &&
    qualification.requirements.every((requirement) => requirement.status === "verified")
  );
}

function normalizeProjectUrl(value: string): string | null {
  if (typeof value !== "string" || value.length > 2048 || CONTROL_CHARACTER.test(value)) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    return null;
  }
  return parsed.origin;
}

function projectManifestValid(manifest: ProviderFactoryExternalConfigurationManifest): {
  normalizedUrl: string | null;
  valid: boolean;
} {
  const normalizedUrl = normalizeProjectUrl(manifest.projectUrl);
  const valid =
    manifest.provider === "supabase" &&
    manifest.projectLabel === DEV_PROJECT_LABEL &&
    BINDING_ID.test(manifest.projectBindingId) &&
    normalizedUrl !== null &&
    PROJECT_REF.test(manifest.expectedRemoteProjectRef) &&
    manifest.source === "external_injected_configuration" &&
    manifest.syntheticOnly === true &&
    manifest.liveRuntimeAuthorized === false &&
    manifest.secretValuesEmbedded === false &&
    manifest.environmentReadRequiredByContract === false;
  return { normalizedUrl, valid };
}

function constructionPolicyValid(policy: ProviderFactoryConstructionPolicy): boolean {
  return (
    policy.sdkFactoryInjected === true &&
    policy.sdkDependencyRequiredByContract === false &&
    policy.providerIoOnConstruction === false &&
    policy.remoteAttestationOnConstruction === false &&
    policy.sessionBootstrapOnConstruction === false &&
    policy.runtimeServerUsed === false
  );
}

function handleIsValid(
  authority: ProviderFactoryAuthority,
  handle: ProviderFactoryExternalConfigurationManifest["authorityHandles"][ProviderFactoryAuthority],
): boolean {
  return (
    handle !== null &&
    typeof handle === "object" &&
    handle.authority === AUTHORITY_CLASS[authority] &&
    HANDLE_ID.test(handle.handleId) &&
    handle.source === "external_secret_broker" &&
    handle.serverOnly === true &&
    handle.secretValueExposedToApplication === false
  );
}

function baseDecision(): Omit<
  ProviderClientFactoryPreflightDecision,
  | "state"
  | "projectBindingId"
  | "normalizedProjectUrl"
  | "expectedRemoteProjectRef"
  | "authorityHandleCount"
  | "blockers"
  | "remoteIdentityAttestation"
  | "sessionBootstrap"
> {
  return {
    version: PROVIDER_CLIENT_FACTORY_PREFLIGHT_VERSION,
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
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
  };
}

export function evaluateProviderClientFactoryPreflight(
  input: ProviderClientFactoryPreflightInput,
): ProviderClientFactoryPreflightDecision {
  const blockers: ProviderClientFactoryPreflightBlocker[] = [];

  if (!isQualifiedDev(input.qualification)) {
    blockers.push({ code: "dev_environment_unqualified", scope: "qualification" });
  }

  const project = projectManifestValid(input.manifest);
  if (!project.valid) {
    blockers.push({ code: "invalid_project_configuration", scope: "project" });
  }

  if (!constructionPolicyValid(input.constructionPolicy)) {
    blockers.push({ code: "unsafe_construction_policy", scope: "construction_policy" });
  }

  const seenHandles = new Set<string>();
  let validHandleCount = 0;
  for (const authority of PROVIDER_FACTORY_AUTHORITIES) {
    const handle = input.manifest.authorityHandles?.[authority];
    if (!handle || !handleIsValid(authority, handle)) {
      blockers.push({
        code: handle && handle.authority !== AUTHORITY_CLASS[authority]
          ? "authority_class_mismatch"
          : "invalid_authority_handle",
        scope: authority,
      });
      continue;
    }
    if (seenHandles.has(handle.handleId)) {
      blockers.push({ code: "authority_handle_reuse", scope: authority });
      continue;
    }
    seenHandles.add(handle.handleId);
    validHandleCount += 1;
  }

  const ready = blockers.length === 0;
  const projectBindingId = project.valid ? input.manifest.projectBindingId : null;
  const expectedRemoteProjectRef = project.valid ? input.manifest.expectedRemoteProjectRef : null;

  return {
    ...baseDecision(),
    state: ready ? "structurally_ready_for_authorized_materialization" : "blocked",
    projectBindingId,
    normalizedProjectUrl: project.valid ? project.normalizedUrl : null,
    expectedRemoteProjectRef,
    authorityHandleCount: validHandleCount,
    blockers,
    remoteIdentityAttestation: ready
      ? {
          channel: "remote_project_identity_attestation",
          provider: "supabase",
          projectLabel: DEV_PROJECT_LABEL,
          projectBindingId: input.manifest.projectBindingId,
          expectedProjectRef: input.manifest.expectedRemoteProjectRef,
          expectedProjectUrl: project.normalizedUrl!,
          required: true,
          networkIoRequired: true,
          performed: false,
          verified: false,
        }
      : null,
    sessionBootstrap: ready
      ? {
          channel: "synthetic_session_bootstrap",
          provider: "supabase",
          projectLabel: DEV_PROJECT_LABEL,
          projectBindingId: input.manifest.projectBindingId,
          strategy: "provider_supported_one_time_exchange",
          ownerAndIntruderRequired: true,
          deterministicFixtureEmailRequired: true,
          passwordGrantAssumed: false,
          locallyMintedJwtAllowed: false,
          providerIoRequired: true,
          performed: false,
          proven: false,
        }
      : null,
  };
}

export function providerClientFactoryPreflightProducesNoActivationFacts(): Record<string, never> {
  return {};
}
