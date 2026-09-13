import { createHash } from "node:crypto";
import type { SupabaseRpcClient, SupabaseRpcError } from "@/domain/persistence-boundary/supabase-adapter";
import { EVIDENCE_BUCKET_ID, type ObjectInspection } from "@/domain/storage-coordination/coordinator";
import type {
  QualifiedDevFixtureAdminClient,
  QualifiedDevProviderClientResult,
  QualifiedDevRuntimeRpcClient,
  QualifiedDevStorageClient,
  QualifiedDevSupportRpcClient,
  QualifiedDevSyntheticSessionClient,
} from "./qualified-dev-provider-client-bindings";
import type {
  SupabaseDevClientResult,
  SupabaseDevFixtureClient,
  SupabaseDevStorageBucketClient,
} from "./supabase-dev-fixture-admin-control-plane";
import type { SupabaseDevProbeRpcResult } from "./supabase-dev-probe-support-plane";
import type { SupabaseProviderCandidateAuthSession } from "./supabase-provider-candidate-execution-driver";

export const SUPABASE_PROVIDER_CLIENT_SHAPE_ADAPTERS_VERSION =
  "V0.23.31-SUPABASE-CLIENT-SHAPE-ADAPTERS-V1" as const;

const DEV_PROJECT_LABEL = "vivienda-dev" as const;
const BINDING_ID = /^[A-Za-z0-9_-]{8,80}$/;
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;
const OPAQUE_TOKEN_MAX = 16 * 1024;
const SIGNED_UPLOAD_TTL_MS = 2 * 60 * 60 * 1000;

export type SupabaseClientShapeError = {
  code?: string;
  status?: number;
  message?: string;
};

export type SupabaseClientShapeResult<T> = {
  data: T | null;
  error: SupabaseClientShapeError | null;
};

export interface SupabaseRpcClientShape {
  rpc<T = unknown>(
    functionName: string,
    args?: Record<string, unknown>,
  ): Promise<{ data: T | null; error: SupabaseRpcError | null }>;
}

export interface SupabaseSupportRpcClientShape {
  rpc<T = unknown>(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<SupabaseDevProbeRpcResult<T>>;
}

export interface SupabaseDownloadedObjectShape {
  readonly type: string;
  readonly size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface SupabaseFileBucketClientShape {
  createSignedUploadUrl(
    path: string,
    options: { upsert: false },
  ): Promise<SupabaseClientShapeResult<{ path?: string; signedUrl?: string; token?: string }>>;

  uploadToSignedUrl(
    path: string,
    token: string,
    fileBody: Uint8Array,
    options: { contentType: string },
  ): Promise<SupabaseClientShapeResult<unknown>>;

  exists(path: string): Promise<SupabaseClientShapeResult<boolean>>;

  download(path: string): Promise<SupabaseClientShapeResult<SupabaseDownloadedObjectShape>>;

  createSignedUrl(
    path: string,
    expiresIn: number,
  ): Promise<SupabaseClientShapeResult<{ signedUrl?: string }>>;

  remove(paths: string[]): Promise<SupabaseClientShapeResult<unknown>>;
}

export interface SupabaseStorageClientShape {
  readonly storage: {
    from(bucketId: string): SupabaseFileBucketClientShape;
  };
}

/**
 * Session bootstrap is intentionally not modeled as a proven Supabase Auth API composition yet.
 * A later slice may implement this port using an approved mechanism and a dedicated DEV project.
 */
export interface SupabaseSyntheticSessionBootstrapShape {
  issue(input: {
    fixtureId: string;
    namespace: string;
    actor: "owner" | "intruder";
    subjectRef: string;
    syntheticEmail: string;
  }): Promise<SupabaseClientShapeResult<SupabaseProviderCandidateAuthSession>>;

  resolve(input: {
    fixtureId: string;
    namespace: string;
    accessToken: string;
  }): Promise<SupabaseClientShapeResult<{ kind: "client"; subjectRef: string }>>;
}

export type SupabaseProviderClientShapeAdaptersErrorCode =
  | "invalid_configuration"
  | "invalid_input"
  | "provider_error"
  | "invalid_provider_response";

export class SupabaseProviderClientShapeAdaptersError extends Error {
  constructor(readonly code: SupabaseProviderClientShapeAdaptersErrorCode) {
    super("Supabase provider client shape adapter failed.");
    this.name = "SupabaseProviderClientShapeAdaptersError";
  }
}

function fail(code: SupabaseProviderClientShapeAdaptersErrorCode): never {
  throw new SupabaseProviderClientShapeAdaptersError(code);
}

function assertBindingId(value: string): void {
  if (!BINDING_ID.test(value)) fail("invalid_configuration");
}

function assertDistinctAuthorities(values: object[]): void {
  const unique = new Set(values);
  if (unique.size !== values.length) fail("invalid_configuration");
}

function parseIso(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function addMilliseconds(iso: string, deltaMs: number): string {
  const parsed = parseIso(iso);
  if (parsed === null || !Number.isSafeInteger(deltaMs) || deltaMs < 1) {
    fail("invalid_configuration");
  }
  return new Date(parsed + deltaMs).toISOString();
}

function assertOpaque(value: string): void {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    value.length > OPAQUE_TOKEN_MAX ||
    CONTROL_CHARACTER.test(value) ||
    /\s/.test(value)
  ) {
    fail("invalid_provider_response");
  }
}

function providerFailure<T>(error: SupabaseClientShapeError | null): QualifiedDevProviderClientResult<T> {
  return {
    data: undefined as T,
    error: {
      code: error?.code ?? "provider_error",
      ...(typeof error?.status === "number" ? { status: error.status } : {}),
    },
  };
}

function supportProviderFailure<T>(error: SupabaseClientShapeError | null): SupabaseDevProbeRpcResult<T> {
  return {
    data: undefined as T,
    error: {
      code: error?.code ?? "provider_error",
      ...(typeof error?.status === "number" ? { status: error.status } : {}),
    },
  };
}

function validateProjectConfiguration(input: {
  projectLabel: string;
  projectBindingId: string;
}): void {
  if (input.projectLabel !== DEV_PROJECT_LABEL) fail("invalid_configuration");
  assertBindingId(input.projectBindingId);
}

class BoundRuntimeRpcClient implements QualifiedDevRuntimeRpcClient {
  readonly provider = "supabase" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly channel = "candidate_runtime_rpc" as const;
  readonly authority = "candidate_runtime" as const;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;

  constructor(
    readonly projectBindingId: string,
    private readonly client: SupabaseRpcClientShape,
  ) {}

  rpc<T = unknown>(functionName: string, args?: Record<string, unknown>) {
    return this.client.rpc<T>(functionName, args);
  }
}

class BoundSupportRpcClient implements QualifiedDevSupportRpcClient {
  readonly provider = "supabase" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly channel = "dev_probe_support_rpc" as const;
  readonly authority = "probe_support" as const;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;

  constructor(
    readonly projectBindingId: string,
    private readonly client: SupabaseSupportRpcClientShape,
  ) {}

  async rpc<T = unknown>(functionName: string, args: Record<string, unknown>): Promise<SupabaseDevProbeRpcResult<T>> {
    try {
      const result = await this.client.rpc<T>(functionName, args);
      if (!result || typeof result !== "object") fail("invalid_provider_response");
      if (result.error) return supportProviderFailure<T>(result.error);
      return { data: result.data, error: null };
    } catch (error) {
      if (error instanceof SupabaseProviderClientShapeAdaptersError) throw error;
      return supportProviderFailure<T>(null);
    }
  }
}

class BoundFixtureAdminClient implements QualifiedDevFixtureAdminClient {
  readonly provider = "supabase" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly channel = "dev_fixture_admin" as const;
  readonly authority = "fixture_admin" as const;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;

  readonly auth: SupabaseDevFixtureClient["auth"];
  readonly storage: SupabaseDevFixtureClient["storage"];

  constructor(
    readonly projectBindingId: string,
    private readonly client: SupabaseDevFixtureClient,
  ) {
    this.auth = client.auth;
    this.storage = client.storage;
  }

  rpc<T = unknown>(functionName: string, args: Record<string, unknown>): Promise<SupabaseDevClientResult<T>> {
    return this.client.rpc<T>(functionName, args);
  }
}

class BoundStorageClient implements QualifiedDevStorageClient {
  readonly provider = "supabase" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly channel = "dev_storage" as const;
  readonly authority = "storage_candidate" as const;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;

  constructor(
    readonly projectBindingId: string,
    private readonly client: SupabaseStorageClientShape,
    private readonly now: () => string,
  ) {}

  private bucket(bucketId: typeof EVIDENCE_BUCKET_ID): SupabaseFileBucketClientShape {
    if (bucketId !== EVIDENCE_BUCKET_ID) fail("invalid_input");
    const bucket = this.client.storage.from(bucketId);
    if (!bucket) fail("invalid_provider_response");
    return bucket;
  }

  async createSignedUploadGrant(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
    upsert: false;
  }): Promise<QualifiedDevProviderClientResult<{ token: string; expiresAt: string }>> {
    if (input.upsert !== false) fail("invalid_input");
    let result: SupabaseClientShapeResult<{ path?: string; signedUrl?: string; token?: string }>;
    try {
      result = await this.bucket(input.bucketId).createSignedUploadUrl(input.objectPath, { upsert: false });
    } catch {
      return providerFailure(null);
    }
    if (result.error) return providerFailure(result.error);
    if (!result.data || typeof result.data.token !== "string") fail("invalid_provider_response");
    if (result.data.path !== undefined && result.data.path !== input.objectPath) {
      fail("invalid_provider_response");
    }
    assertOpaque(result.data.token);
    const issuedAt = this.now();
    return {
      data: {
        token: result.data.token,
        expiresAt: addMilliseconds(issuedAt, SIGNED_UPLOAD_TTL_MS),
      },
      error: null,
    };
  }

  async uploadSigned(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
    signedCapability: string;
    contentType: "application/pdf";
    bytes: Uint8Array;
    upsert: false;
  }): Promise<QualifiedDevProviderClientResult<{ status: number }>> {
    if (
      input.contentType !== "application/pdf" ||
      input.upsert !== false ||
      !(input.bytes instanceof Uint8Array)
    ) {
      fail("invalid_input");
    }
    assertOpaque(input.signedCapability);
    let result: SupabaseClientShapeResult<unknown>;
    try {
      result = await this.bucket(input.bucketId).uploadToSignedUrl(
        input.objectPath,
        input.signedCapability,
        input.bytes,
        { contentType: input.contentType },
      );
    } catch {
      return providerFailure(null);
    }
    if (result.error) return providerFailure(result.error);
    return { data: { status: 200 }, error: null };
  }

  async inspectObject(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
  }): Promise<QualifiedDevProviderClientResult<ObjectInspection | null>> {
    const bucket = this.bucket(input.bucketId);
    let exists: SupabaseClientShapeResult<boolean>;
    try {
      exists = await bucket.exists(input.objectPath);
    } catch {
      return providerFailure(null);
    }
    if (exists.error) return providerFailure(exists.error);
    if (typeof exists.data !== "boolean") fail("invalid_provider_response");
    if (!exists.data) return { data: null, error: null };

    let downloaded: SupabaseClientShapeResult<SupabaseDownloadedObjectShape>;
    try {
      downloaded = await bucket.download(input.objectPath);
    } catch {
      return providerFailure(null);
    }
    if (downloaded.error) return providerFailure(downloaded.error);
    if (!downloaded.data || typeof downloaded.data.arrayBuffer !== "function") {
      fail("invalid_provider_response");
    }
    const object = downloaded.data;
    if (
      typeof object.type !== "string" ||
      object.type.trim() === "" ||
      !Number.isSafeInteger(object.size) ||
      object.size < 0
    ) {
      fail("invalid_provider_response");
    }

    let buffer: ArrayBuffer;
    try {
      buffer = await object.arrayBuffer();
    } catch {
      return providerFailure(null);
    }
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength !== object.size) {
      fail("invalid_provider_response");
    }
    const verifiedAt = this.now();
    if (parseIso(verifiedAt) === null) fail("invalid_configuration");
    const checksumSha256 = createHash("sha256").update(new Uint8Array(buffer)).digest("hex");

    return {
      data: {
        mimeType: object.type,
        byteSize: object.size,
        checksumSha256,
        verifiedAt,
      },
      error: null,
    };
  }

  async createSignedDownloadGrant(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
    expiresInSeconds: number;
  }): Promise<QualifiedDevProviderClientResult<{ url: string; expiresAt: string }>> {
    if (!Number.isSafeInteger(input.expiresInSeconds) || input.expiresInSeconds < 1) {
      fail("invalid_input");
    }
    let result: SupabaseClientShapeResult<{ signedUrl?: string }>;
    try {
      result = await this.bucket(input.bucketId).createSignedUrl(input.objectPath, input.expiresInSeconds);
    } catch {
      return providerFailure(null);
    }
    if (result.error) return providerFailure(result.error);
    if (!result.data || typeof result.data.signedUrl !== "string") fail("invalid_provider_response");
    let signedUrl: URL;
    try {
      signedUrl = new URL(result.data.signedUrl);
    } catch {
      fail("invalid_provider_response");
    }
    if (signedUrl.protocol !== "https:" || signedUrl.username !== "" || signedUrl.password !== "") {
      fail("invalid_provider_response");
    }
    const issuedAt = this.now();
    return {
      data: {
        url: signedUrl.toString(),
        expiresAt: addMilliseconds(issuedAt, input.expiresInSeconds * 1000),
      },
      error: null,
    };
  }

  async deleteObject(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
  }): Promise<QualifiedDevProviderClientResult<"deleted" | "not_found">> {
    const bucket = this.bucket(input.bucketId);
    let exists: SupabaseClientShapeResult<boolean>;
    try {
      exists = await bucket.exists(input.objectPath);
    } catch {
      return providerFailure(null);
    }
    if (exists.error) return providerFailure(exists.error);
    if (typeof exists.data !== "boolean") fail("invalid_provider_response");
    if (!exists.data) return { data: "not_found", error: null };

    let removed: SupabaseClientShapeResult<unknown>;
    try {
      removed = await bucket.remove([input.objectPath]);
    } catch {
      return providerFailure(null);
    }
    if (removed.error) return providerFailure(removed.error);
    return { data: "deleted", error: null };
  }
}

class BoundSyntheticSessionClient implements QualifiedDevSyntheticSessionClient {
  readonly provider = "supabase" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly channel = "candidate_session_authority" as const;
  readonly authority = "synthetic_session" as const;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly publicFixtureSelectorsAccepted = false as const;

  constructor(
    readonly projectBindingId: string,
    private readonly bootstrap: SupabaseSyntheticSessionBootstrapShape,
  ) {}

  async issueSyntheticSession(input: {
    fixtureId: string;
    namespace: string;
    actor: "owner" | "intruder";
    subjectRef: string;
  }): Promise<QualifiedDevProviderClientResult<SupabaseProviderCandidateAuthSession>> {
    const syntheticEmail = `fixture+${input.namespace}.${input.actor}@vivienda.invalid`;
    let result: SupabaseClientShapeResult<SupabaseProviderCandidateAuthSession>;
    try {
      result = await this.bootstrap.issue({ ...input, syntheticEmail });
    } catch {
      return providerFailure(null);
    }
    if (result.error) return providerFailure(result.error);
    if (
      !result.data ||
      result.data.subjectRef !== input.subjectRef ||
      typeof result.data.accessToken !== "string" ||
      typeof result.data.expiresAt !== "string" ||
      parseIso(result.data.expiresAt) === null
    ) {
      fail("invalid_provider_response");
    }
    assertOpaque(result.data.accessToken);
    return { data: { ...result.data }, error: null };
  }

  async resolveSyntheticSession(input: {
    fixtureId: string;
    namespace: string;
    accessToken: string;
  }): Promise<QualifiedDevProviderClientResult<{ kind: "client"; subjectRef: string } | null>> {
    assertOpaque(input.accessToken);
    let result: SupabaseClientShapeResult<{ kind: "client"; subjectRef: string }>;
    try {
      result = await this.bootstrap.resolve(input);
    } catch {
      return providerFailure(null);
    }
    if (result.error) return providerFailure(result.error);
    if (result.data === null) return { data: null, error: null };
    if (
      result.data.kind !== "client" ||
      typeof result.data.subjectRef !== "string" ||
      result.data.subjectRef.trim() === "" ||
      CONTROL_CHARACTER.test(result.data.subjectRef)
    ) {
      fail("invalid_provider_response");
    }
    return { data: { ...result.data }, error: null };
  }
}

export type SupabaseProviderClientShapeAdaptersInputs = {
  configuration: {
    projectLabel: string;
    projectBindingId: string;
  };
  runtimeRpc: SupabaseRpcClientShape;
  supportRpc: SupabaseSupportRpcClientShape;
  fixtureAdmin: SupabaseDevFixtureClient;
  storage: SupabaseStorageClientShape;
  sessionBootstrap: SupabaseSyntheticSessionBootstrapShape;
  now?: () => string;
};

export type SupabaseProviderClientShapeAdapters = {
  readonly version: typeof SUPABASE_PROVIDER_CLIENT_SHAPE_ADAPTERS_VERSION;
  readonly provider: "supabase";
  readonly projectLabel: typeof DEV_PROJECT_LABEL;
  readonly projectBindingId: string;
  readonly syntheticOnly: true;
  readonly liveRuntimeAuthorized: false;
  readonly sdkInstantiated: false;
  readonly remoteIdentityVerified: false;
  readonly sessionBootstrapProven: false;
  readonly clients: {
    runtimeRpc: QualifiedDevRuntimeRpcClient;
    supportRpc: QualifiedDevSupportRpcClient;
    fixtureAdmin: QualifiedDevFixtureAdminClient;
    storage: QualifiedDevStorageClient;
    sessions: QualifiedDevSyntheticSessionClient;
  };
};

export function createSupabaseProviderClientShapeAdapters(
  input: SupabaseProviderClientShapeAdaptersInputs,
): SupabaseProviderClientShapeAdapters {
  validateProjectConfiguration(input.configuration);
  assertDistinctAuthorities([
    input.runtimeRpc as object,
    input.supportRpc as object,
    input.fixtureAdmin as object,
    input.storage as object,
    input.sessionBootstrap as object,
  ]);
  if (input.fixtureAdmin.storage === input.storage.storage) fail("invalid_configuration");

  const now = input.now ?? (() => new Date().toISOString());
  const initialNow = now();
  if (parseIso(initialNow) === null) fail("invalid_configuration");

  const projectBindingId = input.configuration.projectBindingId;
  return {
    version: SUPABASE_PROVIDER_CLIENT_SHAPE_ADAPTERS_VERSION,
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    projectBindingId,
    syntheticOnly: true,
    liveRuntimeAuthorized: false,
    sdkInstantiated: false,
    remoteIdentityVerified: false,
    sessionBootstrapProven: false,
    clients: {
      runtimeRpc: new BoundRuntimeRpcClient(projectBindingId, input.runtimeRpc),
      supportRpc: new BoundSupportRpcClient(projectBindingId, input.supportRpc),
      fixtureAdmin: new BoundFixtureAdminClient(projectBindingId, input.fixtureAdmin),
      storage: new BoundStorageClient(projectBindingId, input.storage, now),
      sessions: new BoundSyntheticSessionClient(projectBindingId, input.sessionBootstrap),
    },
  };
}

export function supabaseProviderClientShapeAdaptersProduceNoActivationFacts(): Record<string, never> {
  return {};
}
