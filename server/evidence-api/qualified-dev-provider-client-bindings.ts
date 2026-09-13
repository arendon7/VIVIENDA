import type { SupabaseRpcClient } from "@/domain/persistence-boundary/supabase-adapter";
import { SupabaseCasePersistenceAdapter } from "@/domain/persistence-boundary/supabase-adapter";
import {
  EVIDENCE_BUCKET_ID,
  type EvidenceStorageGateway,
  type ObjectInspection,
  type SignedDownloadProviderGrant,
  type SignedUploadProviderGrant,
  type UserPrincipal,
} from "@/domain/storage-coordination/coordinator";
import { SupabaseStorageCoordinationRegistry } from "@/domain/storage-coordination/supabase-registry";
import type { DevEnvironmentQualificationDecision } from "./dev-provisioning-qualification";
import type { ProviderCandidateFixtureLease } from "./provider-candidate-fixture-lifecycle";
import type { QualifiedDevSignedUploadPort, QualifiedDevProviderCompositionInputs } from "./qualified-dev-provider-composition";
import type { QualifiedDevDriverHostSessionAuthorityPort } from "./qualified-dev-driver-host-bridge";
import {
  SupabaseDevFixtureAdminControlPlane,
  type SupabaseDevFixtureClient,
} from "./supabase-dev-fixture-admin-control-plane";
import type { SupabaseDevProbeRpcClient } from "./supabase-dev-probe-support-plane";
import type { SupabaseProviderCandidateAuthSession } from "./supabase-provider-candidate-execution-driver";

export const QUALIFIED_DEV_PROVIDER_CLIENT_BINDINGS_VERSION =
  "V0.23.30-QUALIFIED-DEV-PROVIDER-CLIENT-BINDINGS-V1" as const;

const DEV_PROJECT_LABEL = "vivienda-dev" as const;
const QUALIFICATION_REQUIREMENT_COUNT = 14;
const BINDING_ID = /^[A-Za-z0-9_-]{8,80}$/;
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;
const OBJECT_PATH = /^quarantine\/upl_vivienda_dev_[A-Za-z0-9_-]{8,40}_[A-Za-z0-9_-]{3,}\/evd_[A-Za-z0-9_-]{3,}\/obj_[A-Za-z0-9_-]{6,}$/;
const SHA256 = /^[A-Fa-f0-9]{64}$/;
const TOKEN = /^[A-Za-z0-9_-]{8,40}$/;
const ACCESS_TOKEN_MAX = 16 * 1024;

export type QualifiedDevProviderClientBindingChannel =
  | "candidate_runtime_rpc"
  | "dev_probe_support_rpc"
  | "dev_fixture_admin"
  | "dev_storage"
  | "candidate_session_authority";

export type QualifiedDevProviderClientBindingAuthority =
  | "candidate_runtime"
  | "probe_support"
  | "fixture_admin"
  | "storage_candidate"
  | "synthetic_session";

export type QualifiedDevProviderClientBindingIdentity<
  TChannel extends QualifiedDevProviderClientBindingChannel,
  TAuthority extends QualifiedDevProviderClientBindingAuthority,
> = {
  readonly provider: "supabase";
  readonly projectLabel: typeof DEV_PROJECT_LABEL;
  readonly projectBindingId: string;
  readonly channel: TChannel;
  readonly authority: TAuthority;
  readonly syntheticOnly: true;
  readonly liveRuntimeAuthorized: false;
};

export type QualifiedDevRuntimeRpcClient = SupabaseRpcClient &
  QualifiedDevProviderClientBindingIdentity<"candidate_runtime_rpc", "candidate_runtime">;

export type QualifiedDevSupportRpcClient = SupabaseDevProbeRpcClient &
  QualifiedDevProviderClientBindingIdentity<"dev_probe_support_rpc", "probe_support">;

export type QualifiedDevFixtureAdminClient = SupabaseDevFixtureClient &
  QualifiedDevProviderClientBindingIdentity<"dev_fixture_admin", "fixture_admin">;

export type QualifiedDevProviderClientResult<T> = {
  data: T;
  error: { code?: string; status?: number; message?: string } | null;
};

export interface QualifiedDevStorageClient
  extends QualifiedDevProviderClientBindingIdentity<"dev_storage", "storage_candidate"> {
  createSignedUploadGrant(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
    upsert: false;
  }): Promise<QualifiedDevProviderClientResult<{ token: string; expiresAt: string }>>;

  uploadSigned(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
    signedCapability: string;
    contentType: "application/pdf";
    bytes: Uint8Array;
    upsert: false;
  }): Promise<QualifiedDevProviderClientResult<{ status: number }>>;

  inspectObject(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
  }): Promise<QualifiedDevProviderClientResult<ObjectInspection | null>>;

  createSignedDownloadGrant(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
    expiresInSeconds: number;
  }): Promise<QualifiedDevProviderClientResult<SignedDownloadProviderGrant>>;

  deleteObject(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
  }): Promise<QualifiedDevProviderClientResult<"deleted" | "not_found">>;
}

export interface QualifiedDevSyntheticSessionClient
  extends QualifiedDevProviderClientBindingIdentity<"candidate_session_authority", "synthetic_session"> {
  readonly publicFixtureSelectorsAccepted: false;

  issueSyntheticSession(input: {
    fixtureId: string;
    namespace: string;
    actor: "owner" | "intruder";
    subjectRef: string;
  }): Promise<QualifiedDevProviderClientResult<SupabaseProviderCandidateAuthSession>>;

  resolveSyntheticSession(input: {
    fixtureId: string;
    namespace: string;
    accessToken: string;
  }): Promise<QualifiedDevProviderClientResult<{ kind: "client"; subjectRef: string } | null>>;
}

export type QualifiedDevProviderClientBindingsErrorCode =
  | "invalid_configuration"
  | "dev_environment_unqualified"
  | "invalid_input"
  | "provider_error"
  | "invalid_provider_response";

export class QualifiedDevProviderClientBindingsError extends Error {
  constructor(readonly code: QualifiedDevProviderClientBindingsErrorCode) {
    super("Qualified DEV provider client binding failed.");
    this.name = "QualifiedDevProviderClientBindingsError";
  }
}

function fail(code: QualifiedDevProviderClientBindingsErrorCode): never {
  throw new QualifiedDevProviderClientBindingsError(code);
}

function assertQualifiedDev(qualification: DevEnvironmentQualificationDecision): void {
  const requirementsValid =
    Array.isArray(qualification.requirements) &&
    qualification.requirements.length === QUALIFICATION_REQUIREMENT_COUNT &&
    qualification.requirements.every((requirement) => requirement.status === "verified");

  if (
    qualification.state !== "qualified_for_staging_candidate" ||
    qualification.devEnvironmentVerified !== true ||
    qualification.liveRuntimeAuthorized !== false ||
    qualification.totalRequirementCount !== QUALIFICATION_REQUIREMENT_COUNT ||
    qualification.verifiedRequirementCount !== QUALIFICATION_REQUIREMENT_COUNT ||
    qualification.blockers.length !== 0 ||
    !requirementsValid
  ) {
    fail("dev_environment_unqualified");
  }
}

function normalizeOrigin(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    fail("invalid_configuration");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    fail("invalid_configuration");
  }
  return parsed.origin;
}

function assertBindingId(value: string): void {
  if (!BINDING_ID.test(value)) fail("invalid_configuration");
}

function assertIdentity<
  TChannel extends QualifiedDevProviderClientBindingChannel,
  TAuthority extends QualifiedDevProviderClientBindingAuthority,
>(
  identity: QualifiedDevProviderClientBindingIdentity<TChannel, TAuthority>,
  expected: { channel: TChannel; authority: TAuthority; projectBindingId: string },
): void {
  if (
    identity.provider !== "supabase" ||
    identity.projectLabel !== DEV_PROJECT_LABEL ||
    identity.projectBindingId !== expected.projectBindingId ||
    identity.channel !== expected.channel ||
    identity.authority !== expected.authority ||
    identity.syntheticOnly !== true ||
    identity.liveRuntimeAuthorized !== false
  ) {
    fail("invalid_configuration");
  }
}

function requireSuccess<T>(result: QualifiedDevProviderClientResult<T>): T {
  if (!result || result.error) fail("provider_error");
  return result.data;
}

function parseIso(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function assertObjectPath(value: string): void {
  if (!OBJECT_PATH.test(value)) fail("invalid_input");
}

function assertOpaqueToken(value: string): void {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    value.length > ACCESS_TOKEN_MAX ||
    CONTROL_CHARACTER.test(value) ||
    /\s/.test(value)
  ) {
    fail("invalid_provider_response");
  }
}

function assertLease(lease: ProviderCandidateFixtureLease): void {
  const prefix = "vivienda_dev_";
  const token = lease.namespace.startsWith(prefix) ? lease.namespace.slice(prefix.length) : "";
  if (
    !TOKEN.test(token) ||
    lease.fixtureId !== `fx_${token}` ||
    lease.ownerSubjectRef !== `sub_synthetic_${token}_owner` ||
    lease.intruderSubjectRef !== `sub_synthetic_${token}_intruder` ||
    lease.ownerSubjectRef === lease.intruderSubjectRef ||
    lease.syntheticOnly !== true ||
    lease.disposable !== true
  ) {
    fail("invalid_input");
  }
}

function validateUploadGrant(value: { token: string; expiresAt: string }): SignedUploadProviderGrant {
  if (!value || typeof value.token !== "string" || typeof value.expiresAt !== "string") {
    fail("invalid_provider_response");
  }
  assertOpaqueToken(value.token);
  if (parseIso(value.expiresAt) === null) fail("invalid_provider_response");
  return { token: value.token, expiresAt: value.expiresAt };
}

function validateInspection(value: ObjectInspection | null): ObjectInspection | null {
  if (value === null) return null;
  if (
    typeof value.mimeType !== "string" ||
    value.mimeType.trim() === "" ||
    !Number.isSafeInteger(value.byteSize) ||
    value.byteSize < 0 ||
    !SHA256.test(value.checksumSha256) ||
    parseIso(value.verifiedAt) === null
  ) {
    fail("invalid_provider_response");
  }
  return { ...value };
}

function validateDownloadGrant(value: SignedDownloadProviderGrant): SignedDownloadProviderGrant {
  if (!value || typeof value.url !== "string" || typeof value.expiresAt !== "string") {
    fail("invalid_provider_response");
  }
  let parsed: URL;
  try {
    parsed = new URL(value.url);
  } catch {
    fail("invalid_provider_response");
  }
  if (parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "") {
    fail("invalid_provider_response");
  }
  if (parseIso(value.expiresAt) === null) fail("invalid_provider_response");
  return { url: value.url, expiresAt: value.expiresAt };
}

class BoundQualifiedDevStorage implements EvidenceStorageGateway, QualifiedDevSignedUploadPort {
  constructor(private readonly client: QualifiedDevStorageClient) {}

  async createSignedUploadGrant(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
    upsert: false;
  }): Promise<SignedUploadProviderGrant> {
    if (input.bucketId !== EVIDENCE_BUCKET_ID || input.upsert !== false) fail("invalid_input");
    assertObjectPath(input.objectPath);
    let result: QualifiedDevProviderClientResult<{ token: string; expiresAt: string }>;
    try {
      result = await this.client.createSignedUploadGrant(input);
    } catch {
      fail("provider_error");
    }
    return validateUploadGrant(requireSuccess(result));
  }

  async uploadSigned(input: {
    lease: ProviderCandidateFixtureLease;
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
    signedCapability: string;
    contentType: "application/pdf";
    bytes: Uint8Array;
    upsert: false;
  }): Promise<{ status: number }> {
    assertLease(input.lease);
    if (
      input.bucketId !== EVIDENCE_BUCKET_ID ||
      input.contentType !== "application/pdf" ||
      input.upsert !== false ||
      !(input.bytes instanceof Uint8Array) ||
      !input.objectPath.startsWith(`quarantine/upl_${input.lease.namespace}_`)
    ) {
      fail("invalid_input");
    }
    assertObjectPath(input.objectPath);
    assertOpaqueToken(input.signedCapability);
    let result: QualifiedDevProviderClientResult<{ status: number }>;
    try {
      result = await this.client.uploadSigned({
        bucketId: input.bucketId,
        objectPath: input.objectPath,
        signedCapability: input.signedCapability,
        contentType: input.contentType,
        bytes: input.bytes,
        upsert: input.upsert,
      });
    } catch {
      fail("provider_error");
    }
    const data = requireSuccess(result);
    if (!data || !Number.isSafeInteger(data.status) || data.status < 200 || data.status >= 300) {
      fail("invalid_provider_response");
    }
    return { status: data.status };
  }

  async inspectAndHashObject(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
  }): Promise<ObjectInspection | null> {
    if (input.bucketId !== EVIDENCE_BUCKET_ID) fail("invalid_input");
    assertObjectPath(input.objectPath);
    let result: QualifiedDevProviderClientResult<ObjectInspection | null>;
    try {
      result = await this.client.inspectObject(input);
    } catch {
      fail("provider_error");
    }
    return validateInspection(requireSuccess(result));
  }

  async createSignedDownloadGrant(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
    expiresInSeconds: number;
  }): Promise<SignedDownloadProviderGrant> {
    if (
      input.bucketId !== EVIDENCE_BUCKET_ID ||
      !Number.isSafeInteger(input.expiresInSeconds) ||
      input.expiresInSeconds < 1 ||
      input.expiresInSeconds > 300
    ) {
      fail("invalid_input");
    }
    assertObjectPath(input.objectPath);
    let result: QualifiedDevProviderClientResult<SignedDownloadProviderGrant>;
    try {
      result = await this.client.createSignedDownloadGrant(input);
    } catch {
      fail("provider_error");
    }
    return validateDownloadGrant(requireSuccess(result));
  }

  async deleteObject(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
  }): Promise<"deleted" | "not_found"> {
    if (input.bucketId !== EVIDENCE_BUCKET_ID) fail("invalid_input");
    assertObjectPath(input.objectPath);
    let result: QualifiedDevProviderClientResult<"deleted" | "not_found">;
    try {
      result = await this.client.deleteObject(input);
    } catch {
      fail("provider_error");
    }
    const data = requireSuccess(result);
    if (data !== "deleted" && data !== "not_found") fail("invalid_provider_response");
    return data;
  }
}

class BoundQualifiedDevSessionAuthority implements QualifiedDevDriverHostSessionAuthorityPort {
  readonly channel = "candidate_session_authority" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly publicFixtureSelectorsAccepted = false as const;

  constructor(private readonly client: QualifiedDevSyntheticSessionClient) {}

  async issueSession(input: {
    lease: ProviderCandidateFixtureLease;
    actor: "owner" | "intruder";
    expectedSubjectRef: string;
  }): Promise<SupabaseProviderCandidateAuthSession> {
    assertLease(input.lease);
    const expected = input.actor === "owner" ? input.lease.ownerSubjectRef : input.lease.intruderSubjectRef;
    if (input.expectedSubjectRef !== expected) fail("invalid_input");
    let result: QualifiedDevProviderClientResult<SupabaseProviderCandidateAuthSession>;
    try {
      result = await this.client.issueSyntheticSession({
        fixtureId: input.lease.fixtureId,
        namespace: input.lease.namespace,
        actor: input.actor,
        subjectRef: expected,
      });
    } catch {
      fail("provider_error");
    }
    const session = requireSuccess(result);
    if (
      !session ||
      session.subjectRef !== expected ||
      typeof session.expiresAt !== "string" ||
      parseIso(session.expiresAt) === null
    ) {
      fail("invalid_provider_response");
    }
    assertOpaqueToken(session.accessToken);
    return { ...session };
  }

  async resolvePrincipal(input: {
    request: Request;
    lease: ProviderCandidateFixtureLease;
  }): Promise<UserPrincipal | null> {
    assertLease(input.lease);
    const authorization = input.request.headers.get("authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) return null;
    const accessToken = authorization.slice("Bearer ".length);
    try {
      assertOpaqueToken(accessToken);
    } catch {
      return null;
    }

    let result: QualifiedDevProviderClientResult<{ kind: "client"; subjectRef: string } | null>;
    try {
      result = await this.client.resolveSyntheticSession({
        fixtureId: input.lease.fixtureId,
        namespace: input.lease.namespace,
        accessToken,
      });
    } catch {
      fail("provider_error");
    }
    const principal = requireSuccess(result);
    if (principal === null) return null;
    if (
      principal.kind !== "client" ||
      (principal.subjectRef !== input.lease.ownerSubjectRef &&
        principal.subjectRef !== input.lease.intruderSubjectRef)
    ) {
      fail("invalid_provider_response");
    }
    return { kind: "client", subjectRef: principal.subjectRef };
  }
}

export type QualifiedDevProviderClientBindingsInputs = {
  qualification: DevEnvironmentQualificationDecision;
  configuration: {
    projectLabel: string;
    projectBindingId: string;
    evidenceApiOrigin: string;
  };
  runtimeRpc: QualifiedDevRuntimeRpcClient;
  supportRpc: QualifiedDevSupportRpcClient;
  fixtureAdmin: QualifiedDevFixtureAdminClient;
  storage: QualifiedDevStorageClient;
  sessions: QualifiedDevSyntheticSessionClient;
  fixture?: {
    now?: () => string;
    tokenSource?: () => string;
    ttlMs?: number;
  };
};

export type QualifiedDevProviderClientBindings = {
  readonly version: typeof QUALIFIED_DEV_PROVIDER_CLIENT_BINDINGS_VERSION;
  readonly provider: "supabase";
  readonly projectLabel: typeof DEV_PROJECT_LABEL;
  readonly projectBindingId: string;
  readonly syntheticOnly: true;
  readonly liveRuntimeAuthorized: false;
  readonly remoteIdentityVerified: false;
  readonly provider: "supabase";
  readonly bridge: {
    provider: Omit<QualifiedDevProviderCompositionInputs, "server" | "authSessions" | "httpClient">;
    server: {
      storageGateway: EvidenceStorageGateway;
      registry: SupabaseStorageCoordinationRegistry;
    };
    sessionAuthority: QualifiedDevDriverHostSessionAuthorityPort;
  };
};

export function createQualifiedDevProviderClientBindings(
  input: QualifiedDevProviderClientBindingsInputs,
): QualifiedDevProviderClientBindings {
  if (input.configuration.projectLabel !== DEV_PROJECT_LABEL) fail("invalid_configuration");
  assertQualifiedDev(input.qualification);
  assertBindingId(input.configuration.projectBindingId);
  const evidenceApiOrigin = normalizeOrigin(input.configuration.evidenceApiOrigin);
  const expectedBindingId = input.configuration.projectBindingId;

  assertIdentity(input.runtimeRpc, {
    channel: "candidate_runtime_rpc",
    authority: "candidate_runtime",
    projectBindingId: expectedBindingId,
  });
  assertIdentity(input.supportRpc, {
    channel: "dev_probe_support_rpc",
    authority: "probe_support",
    projectBindingId: expectedBindingId,
  });
  assertIdentity(input.fixtureAdmin, {
    channel: "dev_fixture_admin",
    authority: "fixture_admin",
    projectBindingId: expectedBindingId,
  });
  assertIdentity(input.storage, {
    channel: "dev_storage",
    authority: "storage_candidate",
    projectBindingId: expectedBindingId,
  });
  assertIdentity(input.sessions, {
    channel: "candidate_session_authority",
    authority: "synthetic_session",
    projectBindingId: expectedBindingId,
  });
  if (input.sessions.publicFixtureSelectorsAccepted !== false) fail("invalid_configuration");

  const casePersistence = new SupabaseCasePersistenceAdapter(input.runtimeRpc);
  const registry = new SupabaseStorageCoordinationRegistry(input.runtimeRpc);
  const fixtureAdmin = new SupabaseDevFixtureAdminControlPlane(
    input.fixtureAdmin,
    { projectLabel: DEV_PROJECT_LABEL },
    input.qualification,
  );
  const storage = new BoundQualifiedDevStorage(input.storage);
  const sessionAuthority = new BoundQualifiedDevSessionAuthority(input.sessions);

  const providerBase = {
    qualification: input.qualification,
    configuration: {
      projectLabel: DEV_PROJECT_LABEL,
      evidenceApiOrigin,
    },
    fixtureAdmin,
    casePersistence,
    supportRpcClient: input.supportRpc,
    signedUploads: storage,
  };
  const provider = input.fixture
    ? { ...providerBase, fixture: input.fixture }
    : providerBase;

  return {
    version: QUALIFIED_DEV_PROVIDER_CLIENT_BINDINGS_VERSION,
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    projectBindingId: expectedBindingId,
    syntheticOnly: true,
    liveRuntimeAuthorized: false,
    remoteIdentityVerified: false,
    bridge: {
      provider,
      server: {
        storageGateway: storage,
        registry,
      },
      sessionAuthority,
    },
  };
}

export function qualifiedDevProviderClientBindingsProducesNoActivationFacts(): Record<string, never> {
  return {};
}
