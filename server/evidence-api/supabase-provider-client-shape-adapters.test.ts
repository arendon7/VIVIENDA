import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateDevEnvironmentQualification,
  verifiedDevEnvironmentQualificationFacts,
} from "./dev-provisioning-qualification";
import { createQualifiedDevProviderClientBindings } from "./qualified-dev-provider-client-bindings";
import type { SupabaseDevFixtureClient } from "./supabase-dev-fixture-admin-control-plane";
import {
  SUPABASE_PROVIDER_CLIENT_SHAPE_ADAPTERS_VERSION,
  SupabaseProviderClientShapeAdaptersError,
  createSupabaseProviderClientShapeAdapters,
  supabaseProviderClientShapeAdaptersProduceNoActivationFacts,
  type SupabaseFileBucketClientShape,
  type SupabaseProviderClientShapeAdaptersInputs,
  type SupabaseRpcClientShape,
  type SupabaseStorageClientShape,
  type SupabaseSupportRpcClientShape,
  type SupabaseSyntheticSessionBootstrapShape,
} from "./supabase-provider-client-shape-adapters";

const NOW = "2026-09-13T16:00:00.000Z";
const BINDING_ID = "binding_shape_001";
const PATH = "quarantine/upl_vivienda_dev_shape1234_001/evd_vivienda_dev_shape1234_002/obj_shape1234_003";

function qualifiedDev() {
  return evaluateDevEnvironmentQualification(verifiedDevEnvironmentQualificationFacts());
}

type Calls = {
  runtimeRpc: Array<{ fn: string; args?: Record<string, unknown> }>;
  supportRpc: Array<{ fn: string; args: Record<string, unknown> }>;
  admin: number;
  storageFrom: string[];
  createUpload: Array<{ path: string; upsert: false }>;
  upload: Array<{ path: string; token: string; contentType: string; size: number }>;
  exists: string[];
  download: string[];
  signedDownload: Array<{ path: string; expiresIn: number }>;
  remove: string[][];
  sessionIssue: Array<Record<string, unknown>>;
  sessionResolve: Array<Record<string, unknown>>;
  clock: number;
};

type RawOptions = {
  storageError?: boolean;
  malformedUploadGrant?: boolean;
  malformedSignedDownload?: boolean;
  missingObject?: boolean;
  sessionSubject?: string;
  invalidNow?: boolean;
};

function makeRaw(options: RawOptions = {}) {
  const calls: Calls = {
    runtimeRpc: [],
    supportRpc: [],
    admin: 0,
    storageFrom: [],
    createUpload: [],
    upload: [],
    exists: [],
    download: [],
    signedDownload: [],
    remove: [],
    sessionIssue: [],
    sessionResolve: [],
    clock: 0,
  };
  const objects = new Map<string, Uint8Array>();

  const runtimeRpc: SupabaseRpcClientShape = {
    async rpc<T = unknown>(fn: string, args?: Record<string, unknown>) {
      calls.runtimeRpc.push({ fn, ...(args ? { args } : {}) });
      return { data: { source: "runtime" } as T, error: null };
    },
  };

  const supportRpc: SupabaseSupportRpcClientShape = {
    async rpc<T = unknown>(fn: string, args: Record<string, unknown>) {
      calls.supportRpc.push({ fn, args });
      return { data: { source: "support" } as T, error: null };
    },
  };

  const adminBucket = {
    async list() {
      calls.admin += 1;
      return { data: [], error: null };
    },
    async remove() {
      calls.admin += 1;
      return { data: null, error: null };
    },
  };

  const fixtureAdmin: SupabaseDevFixtureClient = {
    auth: {
      admin: {
        async createUser() {
          calls.admin += 1;
          return { data: { user: { id: "11111111-1111-4111-8111-111111111111" } }, error: null };
        },
        async deleteUser() {
          calls.admin += 1;
          return { data: null, error: null };
        },
        async getUserById() {
          calls.admin += 1;
          return { data: { user: null }, error: null };
        },
      },
    },
    storage: {
      from() {
        calls.admin += 1;
        return adminBucket;
      },
    },
    async rpc<T = unknown>() {
      calls.admin += 1;
      return { data: undefined as T, error: null };
    },
  };

  const bucket: SupabaseFileBucketClientShape = {
    async createSignedUploadUrl(path, config) {
      calls.createUpload.push({ path, upsert: config.upsert });
      if (options.storageError) {
        return { data: null, error: { code: "storage_denied", status: 403, message: "provider internal detail" } };
      }
      if (options.malformedUploadGrant) {
        return { data: { path }, error: null };
      }
      return { data: { path, signedUrl: "https://storage.example.test/upload", token: "signed_upload_shape_001" }, error: null };
    },
    async uploadToSignedUrl(path, token, bytes, config) {
      calls.upload.push({ path, token, contentType: config.contentType, size: bytes.byteLength });
      objects.set(path, bytes.slice());
      return { data: { path }, error: null };
    },
    async exists(path) {
      calls.exists.push(path);
      return { data: options.missingObject ? false : objects.has(path), error: null };
    },
    async download(path) {
      calls.download.push(path);
      const bytes = objects.get(path);
      if (!bytes) return { data: null, error: { code: "not_found", status: 404 } };
      const copy = bytes.slice();
      return {
        data: {
          type: "application/pdf",
          size: copy.byteLength,
          async arrayBuffer() {
            return copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength) as ArrayBuffer;
          },
        },
        error: null,
      };
    },
    async createSignedUrl(path, expiresIn) {
      calls.signedDownload.push({ path, expiresIn });
      return {
        data: {
          signedUrl: options.malformedSignedDownload
            ? "http://storage.example.test/download"
            : "https://storage.example.test/download?token=opaque",
        },
        error: null,
      };
    },
    async remove(paths) {
      calls.remove.push([...paths]);
      for (const path of paths) objects.delete(path);
      return { data: paths.map((name) => ({ name })), error: null };
    },
  };

  const storage: SupabaseStorageClientShape = {
    storage: {
      from(bucketId: string) {
        calls.storageFrom.push(bucketId);
        return bucket;
      },
    },
  };

  const sessionBootstrap: SupabaseSyntheticSessionBootstrapShape = {
    async issue(input) {
      calls.sessionIssue.push({ ...input });
      return {
        data: {
          subjectRef: input.subjectRef,
          accessToken: `shape_session_${input.actor}_001`,
          expiresAt: "2026-09-13T16:10:00.000Z",
        },
        error: null,
      };
    },
    async resolve(input) {
      calls.sessionResolve.push({ ...input });
      return {
        data: {
          kind: "client",
          subjectRef: options.sessionSubject ?? "sub_synthetic_shape1234_owner",
        },
        error: null,
      };
    },
  };

  const now = () => {
    calls.clock += 1;
    return options.invalidNow ? "not-an-iso-date" : NOW;
  };

  const input: SupabaseProviderClientShapeAdaptersInputs = {
    configuration: { projectLabel: "vivienda-dev", projectBindingId: BINDING_ID },
    runtimeRpc,
    supportRpc,
    fixtureAdmin,
    storage,
    sessionBootstrap,
    now,
  };

  return { input, calls, objects, runtimeRpc, supportRpc, fixtureAdmin, storage, sessionBootstrap };
}

function expectAdapterError(error: unknown, code: SupabaseProviderClientShapeAdaptersError["code"]) {
  expect(error).toBeInstanceOf(SupabaseProviderClientShapeAdaptersError);
  expect((error as SupabaseProviderClientShapeAdaptersError).code).toBe(code);
  expect((error as Error).message).toBe("Supabase provider client shape adapter failed.");
}

describe("V0.23.31 Supabase provider client shape adapters", () => {
  it("declares shape-only authority and produces no activation facts", () => {
    const { input } = makeRaw();
    const pack = createSupabaseProviderClientShapeAdapters(input);

    expect(pack.version).toBe(SUPABASE_PROVIDER_CLIENT_SHAPE_ADAPTERS_VERSION);
    expect(pack.provider).toBe("supabase");
    expect(pack.projectLabel).toBe("vivienda-dev");
    expect(pack.projectBindingId).toBe(BINDING_ID);
    expect(pack.syntheticOnly).toBe(true);
    expect(pack.liveRuntimeAuthorized).toBe(false);
    expect(pack.sdkInstantiated).toBe(false);
    expect(pack.remoteIdentityVerified).toBe(false);
    expect(pack.sessionBootstrapProven).toBe(false);
    expect(supabaseProviderClientShapeAdaptersProduceNoActivationFacts()).toEqual({});
  });

  it("constructs all five bindings with zero raw provider I/O and zero clock reads", () => {
    const { input, calls } = makeRaw();
    const pack = createSupabaseProviderClientShapeAdapters(input);

    expect(pack.clients.runtimeRpc.channel).toBe("candidate_runtime_rpc");
    expect(pack.clients.supportRpc.channel).toBe("dev_probe_support_rpc");
    expect(pack.clients.fixtureAdmin.channel).toBe("dev_fixture_admin");
    expect(pack.clients.storage.channel).toBe("dev_storage");
    expect(pack.clients.sessions.channel).toBe("candidate_session_authority");
    expect(calls).toEqual({
      runtimeRpc: [], supportRpc: [], admin: 0, storageFrom: [], createUpload: [], upload: [],
      exists: [], download: [], signedDownload: [], remove: [], sessionIssue: [], sessionResolve: [], clock: 0,
    });
  });

  it("feeds V0.23.30 bindings without provider I/O", () => {
    const { input, calls } = makeRaw();
    const pack = createSupabaseProviderClientShapeAdapters(input);
    const bindings = createQualifiedDevProviderClientBindings({
      qualification: qualifiedDev(),
      configuration: {
        projectLabel: "vivienda-dev",
        projectBindingId: BINDING_ID,
        evidenceApiOrigin: "https://vivienda-dev.example.test",
      },
      runtimeRpc: pack.clients.runtimeRpc,
      supportRpc: pack.clients.supportRpc,
      fixtureAdmin: pack.clients.fixtureAdmin,
      storage: pack.clients.storage,
      sessions: pack.clients.sessions,
    });

    expect(bindings.projectBindingId).toBe(BINDING_ID);
    expect(bindings.remoteIdentityVerified).toBe(false);
    expect(calls.runtimeRpc).toHaveLength(0);
    expect(calls.supportRpc).toHaveLength(0);
    expect(calls.admin).toBe(0);
    expect(calls.storageFrom).toHaveLength(0);
    expect(calls.sessionIssue).toHaveLength(0);
    expect(calls.clock).toBe(0);
  });

  it("preserves runtime/support RPC separation and call shapes", async () => {
    const { input, calls } = makeRaw();
    const pack = createSupabaseProviderClientShapeAdapters(input);

    await pack.clients.runtimeRpc.rpc("vivienda_persist_load_case", { p_case_id: "case_1" });
    await pack.clients.supportRpc.rpc("vivienda_dev_probe_observe", { p_namespace: "vivienda_dev_shape1234" });

    expect(calls.runtimeRpc).toEqual([{ fn: "vivienda_persist_load_case", args: { p_case_id: "case_1" } }]);
    expect(calls.supportRpc).toEqual([{ fn: "vivienda_dev_probe_observe", args: { p_namespace: "vivienda_dev_shape1234" } }]);
  });

  it("maps current Supabase Storage shapes into signed upload, inspection, signed download and delete", async () => {
    const { input, calls } = makeRaw();
    const storage = createSupabaseProviderClientShapeAdapters(input).clients.storage;
    const bytes = new TextEncoder().encode("%PDF-1.4\nsynthetic-only\n%%EOF");

    const grant = await storage.createSignedUploadGrant({
      bucketId: "vivienda-evidence",
      objectPath: PATH,
      upsert: false,
    });
    expect(grant).toEqual({
      data: { token: "signed_upload_shape_001", expiresAt: "2026-09-13T18:00:00.000Z" },
      error: null,
    });
    expect(calls.createUpload).toEqual([{ path: PATH, upsert: false }]);

    await expect(storage.uploadSigned({
      bucketId: "vivienda-evidence",
      objectPath: PATH,
      signedCapability: "signed_upload_shape_001",
      contentType: "application/pdf",
      bytes,
      upsert: false,
    })).resolves.toEqual({ data: { status: 200 }, error: null });
    expect(calls.upload[0]).toMatchObject({ path: PATH, token: "signed_upload_shape_001", contentType: "application/pdf", size: bytes.byteLength });

    const inspection = await storage.inspectObject({ bucketId: "vivienda-evidence", objectPath: PATH });
    expect(inspection).toEqual({
      data: {
        mimeType: "application/pdf",
        byteSize: bytes.byteLength,
        checksumSha256: createHash("sha256").update(bytes).digest("hex"),
        verifiedAt: NOW,
      },
      error: null,
    });

    await expect(storage.createSignedDownloadGrant({
      bucketId: "vivienda-evidence",
      objectPath: PATH,
      expiresInSeconds: 60,
    })).resolves.toEqual({
      data: {
        url: "https://storage.example.test/download?token=opaque",
        expiresAt: "2026-09-13T16:01:00.000Z",
      },
      error: null,
    });

    await expect(storage.deleteObject({ bucketId: "vivienda-evidence", objectPath: PATH }))
      .resolves.toEqual({ data: "deleted", error: null });
    await expect(storage.deleteObject({ bucketId: "vivienda-evidence", objectPath: PATH }))
      .resolves.toEqual({ data: "not_found", error: null });
  });

  it("returns null inspection and not_found without downloading/removing a missing object", async () => {
    const { input, calls } = makeRaw({ missingObject: true });
    const storage = createSupabaseProviderClientShapeAdapters(input).clients.storage;

    await expect(storage.inspectObject({ bucketId: "vivienda-evidence", objectPath: PATH }))
      .resolves.toEqual({ data: null, error: null });
    await expect(storage.deleteObject({ bucketId: "vivienda-evidence", objectPath: PATH }))
      .resolves.toEqual({ data: "not_found", error: null });
    expect(calls.download).toEqual([]);
    expect(calls.remove).toEqual([]);
  });

  it("sanitizes raw Storage errors before handing them to V0.23.30", async () => {
    const { input } = makeRaw({ storageError: true });
    const storage = createSupabaseProviderClientShapeAdapters(input).clients.storage;

    const result = await storage.createSignedUploadGrant({
      bucketId: "vivienda-evidence",
      objectPath: PATH,
      upsert: false,
    });
    expect(result.error).toEqual({ code: "storage_denied", status: 403 });
    expect(JSON.stringify(result)).not.toContain("provider internal detail");
  });

  it("rejects malformed Storage responses fail-closed", async () => {
    const malformedUpload = createSupabaseProviderClientShapeAdapters(makeRaw({ malformedUploadGrant: true }).input).clients.storage;
    let uploadError: unknown;
    try {
      await malformedUpload.createSignedUploadGrant({ bucketId: "vivienda-evidence", objectPath: PATH, upsert: false });
    } catch (error) {
      uploadError = error;
    }
    expectAdapterError(uploadError, "invalid_provider_response");

    const malformedDownload = createSupabaseProviderClientShapeAdapters(makeRaw({ malformedSignedDownload: true }).input).clients.storage;
    let downloadError: unknown;
    try {
      await malformedDownload.createSignedDownloadGrant({ bucketId: "vivienda-evidence", objectPath: PATH, expiresInSeconds: 60 });
    } catch (error) {
      downloadError = error;
    }
    expectAdapterError(downloadError, "invalid_provider_response");
  });

  it("adapts synthetic session bootstrap without claiming that the bootstrap is proven", async () => {
    const { input, calls } = makeRaw();
    const pack = createSupabaseProviderClientShapeAdapters(input);
    const sessions = pack.clients.sessions;

    await expect(sessions.issueSyntheticSession({
      fixtureId: "fx_shape1234",
      namespace: "vivienda_dev_shape1234",
      actor: "owner",
      subjectRef: "sub_synthetic_shape1234_owner",
    })).resolves.toMatchObject({
      data: { subjectRef: "sub_synthetic_shape1234_owner" },
      error: null,
    });
    expect(calls.sessionIssue[0]).toEqual({
      fixtureId: "fx_shape1234",
      namespace: "vivienda_dev_shape1234",
      actor: "owner",
      subjectRef: "sub_synthetic_shape1234_owner",
      syntheticEmail: "fixture+vivienda_dev_shape1234.owner@vivienda.invalid",
    });

    await expect(sessions.resolveSyntheticSession({
      fixtureId: "fx_shape1234",
      namespace: "vivienda_dev_shape1234",
      accessToken: "shape_session_owner_001",
    })).resolves.toEqual({
      data: { kind: "client", subjectRef: "sub_synthetic_shape1234_owner" },
      error: null,
    });
    expect(pack.sessionBootstrapProven).toBe(false);
  });

  it("rejects authority aliasing and fixture/storage client reuse before I/O", () => {
    const raw = makeRaw();
    let aliasError: unknown;
    try {
      createSupabaseProviderClientShapeAdapters({
        ...raw.input,
        supportRpc: raw.runtimeRpc as unknown as SupabaseSupportRpcClientShape,
      });
    } catch (error) {
      aliasError = error;
    }
    expectAdapterError(aliasError, "invalid_configuration");
    expect(raw.calls.runtimeRpc).toHaveLength(0);

    const second = makeRaw();
    const sharedStorage = second.fixtureAdmin.storage as unknown as SupabaseStorageClientShape["storage"];
    let storageAliasError: unknown;
    try {
      createSupabaseProviderClientShapeAdapters({
        ...second.input,
        storage: { storage: sharedStorage },
      });
    } catch (error) {
      storageAliasError = error;
    }
    expectAdapterError(storageAliasError, "invalid_configuration");
    expect(second.calls.admin).toBe(0);
  });

  it("defers clock validation until a time-bearing Storage operation", async () => {
    const { input, calls } = makeRaw({ invalidNow: true });
    const pack = createSupabaseProviderClientShapeAdapters(input);
    expect(calls.clock).toBe(0);

    let thrown: unknown;
    try {
      await pack.clients.storage.createSignedUploadGrant({
        bucketId: "vivienda-evidence",
        objectPath: PATH,
        upsert: false,
      });
    } catch (error) {
      thrown = error;
    }
    expectAdapterError(thrown, "invalid_configuration");
  });

  it("does not import or instantiate Supabase SDK, read env, or touch public runtime", () => {
    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/supabase-provider-client-shape-adapters.ts"),
      "utf8",
    );
    const pkg = readFileSync(join(process.cwd(), "package.json"), "utf8");

    expect(source).not.toContain("@supabase/supabase-js");
    expect(source).not.toContain("createClient(");
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("runtime.server");
    expect(source).not.toContain("createActivatedEvidenceRuntime");
    expect(source).not.toContain("service_role");
    expect(pkg).not.toContain("@supabase/supabase-js");
  });
});
