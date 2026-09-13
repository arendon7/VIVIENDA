import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SupabaseCasePersistenceAdapter } from "@/domain/persistence-boundary/supabase-adapter";
import { SupabaseStorageCoordinationRegistry } from "@/domain/storage-coordination/supabase-registry";
import {
  evaluateDevEnvironmentQualification,
  verifiedDevEnvironmentQualificationFacts,
  type DevEnvironmentQualificationDecision,
} from "./dev-provisioning-qualification";
import type { ProviderCandidateFixtureLease } from "./provider-candidate-fixture-lifecycle";
import {
  QUALIFIED_DEV_PROVIDER_CLIENT_BINDINGS_VERSION,
  QualifiedDevProviderClientBindingsError,
  createQualifiedDevProviderClientBindings,
  qualifiedDevProviderClientBindingsProducesNoActivationFacts,
  type QualifiedDevFixtureAdminClient,
  type QualifiedDevProviderClientBindingsInputs,
  type QualifiedDevProviderClientResult,
  type QualifiedDevRuntimeRpcClient,
  type QualifiedDevStorageClient,
  type QualifiedDevSupportRpcClient,
  type QualifiedDevSyntheticSessionClient,
} from "./qualified-dev-provider-client-bindings";

const PROJECT_BINDING_ID = "binding_dev_001";
const ORIGIN = "https://vivienda-dev.example.test";
const NOW = "2026-09-13T15:00:00.000Z";
const OBJECT_PATH =
  "quarantine/upl_vivienda_dev_binding1234_001/evd_vivienda_dev_binding1234_002/obj_vivienda_dev_binding1234_003";

function qualifiedDev() {
  return evaluateDevEnvironmentQualification(verifiedDevEnvironmentQualificationFacts());
}

function lease(): ProviderCandidateFixtureLease {
  return {
    contractVersion: "V0.23.21-PROVIDER-FIXTURE-V1",
    scope: "happy_path",
    fixtureId: "fx_binding1234",
    namespace: "vivienda_dev_binding1234",
    ownerSubjectRef: "sub_synthetic_binding1234_owner",
    intruderSubjectRef: "sub_synthetic_binding1234_intruder",
    issuedAt: NOW,
    expiresAt: "2026-09-13T15:20:00.000Z",
    syntheticOnly: true,
    disposable: true,
  };
}

type Counters = {
  runtimeRpc: number;
  supportRpc: number;
  adminAuth: number;
  adminStorage: number;
  adminRpc: number;
  storage: number;
  sessions: number;
};

type Options = {
  supportBindingId?: string;
  storageError?: boolean;
  invalidDownloadUrl?: boolean;
  resolvedSubjectRef?: string;
};

function success<T>(data: T): QualifiedDevProviderClientResult<T> {
  return { data, error: null };
}

function makeInputs(options: Options = {}) {
  const counters: Counters = {
    runtimeRpc: 0,
    supportRpc: 0,
    adminAuth: 0,
    adminStorage: 0,
    adminRpc: 0,
    storage: 0,
    sessions: 0,
  };

  const runtimeRpc: QualifiedDevRuntimeRpcClient = {
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId: PROJECT_BINDING_ID,
    channel: "candidate_runtime_rpc",
    authority: "candidate_runtime",
    syntheticOnly: true,
    liveRuntimeAuthorized: false,
    async rpc<T = unknown>() {
      counters.runtimeRpc += 1;
      return { data: null as T | null, error: null };
    },
  };

  const supportRpc: QualifiedDevSupportRpcClient = {
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId: options.supportBindingId ?? PROJECT_BINDING_ID,
    channel: "dev_probe_support_rpc",
    authority: "probe_support",
    syntheticOnly: true,
    liveRuntimeAuthorized: false,
    async rpc<T = unknown>() {
      counters.supportRpc += 1;
      return { data: undefined as T, error: null };
    },
  };

  const fixtureAdmin: QualifiedDevFixtureAdminClient = {
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId: PROJECT_BINDING_ID,
    channel: "dev_fixture_admin",
    authority: "fixture_admin",
    syntheticOnly: true,
    liveRuntimeAuthorized: false,
    auth: {
      admin: {
        async createUser() {
          counters.adminAuth += 1;
          return { data: { user: { id: "11111111-1111-4111-8111-111111111111" } }, error: null };
        },
        async deleteUser() {
          counters.adminAuth += 1;
          return { data: null, error: null };
        },
        async getUserById() {
          counters.adminAuth += 1;
          return { data: { user: null }, error: null };
        },
      },
    },
    storage: {
      from() {
        counters.adminStorage += 1;
        return {
          async list() {
            counters.adminStorage += 1;
            return { data: [], error: null };
          },
          async remove() {
            counters.adminStorage += 1;
            return { data: null, error: null };
          },
        };
      },
    },
    async rpc<T = unknown>() {
      counters.adminRpc += 1;
      return { data: undefined as T, error: null };
    },
  };

  const storage: QualifiedDevStorageClient = {
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId: PROJECT_BINDING_ID,
    channel: "dev_storage",
    authority: "storage_candidate",
    syntheticOnly: true,
    liveRuntimeAuthorized: false,
    async createSignedUploadGrant() {
      counters.storage += 1;
      if (options.storageError) {
        return { data: { token: "unused_token", expiresAt: NOW }, error: { message: "sensitive provider detail" } };
      }
      return success({ token: "upload_capability_001", expiresAt: "2026-09-13T15:05:00.000Z" });
    },
    async uploadSigned() {
      counters.storage += 1;
      return success({ status: 200 });
    },
    async inspectObject() {
      counters.storage += 1;
      return success({
        mimeType: "application/pdf",
        byteSize: 2048,
        checksumSha256: "a".repeat(64),
        verifiedAt: NOW,
      });
    },
    async createSignedDownloadGrant() {
      counters.storage += 1;
      return success({
        url: options.invalidDownloadUrl
          ? "http://storage.example.test/download"
          : "https://storage.example.test/download?sig=opaque",
        expiresAt: "2026-09-13T15:01:00.000Z",
      });
    },
    async deleteObject() {
      counters.storage += 1;
      return success("deleted" as const);
    },
  };

  const sessions: QualifiedDevSyntheticSessionClient = {
    provider: "supabase",
    projectLabel: "vivienda-dev",
    projectBindingId: PROJECT_BINDING_ID,
    channel: "candidate_session_authority",
    authority: "synthetic_session",
    syntheticOnly: true,
    liveRuntimeAuthorized: false,
    publicFixtureSelectorsAccepted: false,
    async issueSyntheticSession(input) {
      counters.sessions += 1;
      return success({
        subjectRef: input.subjectRef,
        accessToken: `session_${input.actor}_binding1234`,
        expiresAt: "2026-09-13T15:10:00.000Z",
      });
    },
    async resolveSyntheticSession() {
      counters.sessions += 1;
      return success({
        kind: "client" as const,
        subjectRef: options.resolvedSubjectRef ?? "sub_synthetic_binding1234_owner",
      });
    },
  };

  const input: QualifiedDevProviderClientBindingsInputs = {
    qualification: qualifiedDev(),
    configuration: {
      projectLabel: "vivienda-dev",
      projectBindingId: PROJECT_BINDING_ID,
      evidenceApiOrigin: ORIGIN,
    },
    runtimeRpc,
    supportRpc,
    fixtureAdmin,
    storage,
    sessions,
  };

  return { input, counters };
}

function expectBindingError(error: unknown, code: QualifiedDevProviderClientBindingsError["code"]) {
  expect(error).toBeInstanceOf(QualifiedDevProviderClientBindingsError);
  expect((error as QualifiedDevProviderClientBindingsError).code).toBe(code);
  expect((error as Error).message).toBe("Qualified DEV provider client binding failed.");
}

describe("V0.23.30 qualified DEV provider client bindings", () => {
  it("declares the frozen binding authority without activation facts", () => {
    const { input } = makeInputs();
    const bindings = createQualifiedDevProviderClientBindings(input);

    expect(bindings.version).toBe(QUALIFIED_DEV_PROVIDER_CLIENT_BINDINGS_VERSION);
    expect(bindings.provider).toBe("supabase");
    expect(bindings.projectLabel).toBe("vivienda-dev");
    expect(bindings.projectBindingId).toBe(PROJECT_BINDING_ID);
    expect(bindings.syntheticOnly).toBe(true);
    expect(bindings.liveRuntimeAuthorized).toBe(false);
    expect(bindings.remoteIdentityVerified).toBe(false);
    expect(qualifiedDevProviderClientBindingsProducesNoActivationFacts()).toEqual({});
  });

  it("constructs canonical adapters with zero provider I/O", () => {
    const { input, counters } = makeInputs();
    const bindings = createQualifiedDevProviderClientBindings(input);

    expect(bindings.bridge.provider.casePersistence).toBeInstanceOf(SupabaseCasePersistenceAdapter);
    expect(bindings.bridge.server.registry).toBeInstanceOf(SupabaseStorageCoordinationRegistry);
    expect(counters).toEqual({
      runtimeRpc: 0,
      supportRpc: 0,
      adminAuth: 0,
      adminStorage: 0,
      adminRpc: 0,
      storage: 0,
      sessions: 0,
    });
  });

  it("rejects a cross-project binding id before any provider I/O", () => {
    const { input, counters } = makeInputs({ supportBindingId: "binding_other_002" });

    let thrown: unknown;
    try {
      createQualifiedDevProviderClientBindings(input);
    } catch (error) {
      thrown = error;
    }
    expectBindingError(thrown, "invalid_configuration");
    expect(Object.values(counters).reduce((sum, value) => sum + value, 0)).toBe(0);
  });

  it("rejects an unqualified DEV environment before any provider I/O", () => {
    const { input, counters } = makeInputs();
    const unqualified = {
      ...input.qualification,
      devEnvironmentVerified: false,
    } as DevEnvironmentQualificationDecision;

    let thrown: unknown;
    try {
      createQualifiedDevProviderClientBindings({ ...input, qualification: unqualified });
    } catch (error) {
      thrown = error;
    }
    expectBindingError(thrown, "dev_environment_unqualified");
    expect(Object.values(counters).reduce((sum, value) => sum + value, 0)).toBe(0);
  });

  it("binds Storage gateway and signed-upload transport with validated provider responses", async () => {
    const { input, counters } = makeInputs();
    const bindings = createQualifiedDevProviderClientBindings(input);
    const gateway = bindings.bridge.server.storageGateway;
    const signedUploads = bindings.bridge.provider.signedUploads;

    await expect(
      gateway.createSignedUploadGrant({
        bucketId: "vivienda-evidence",
        objectPath: OBJECT_PATH,
        upsert: false,
      }),
    ).resolves.toEqual({
      token: "upload_capability_001",
      expiresAt: "2026-09-13T15:05:00.000Z",
    });

    await expect(
      signedUploads.uploadSigned({
        lease: lease(),
        bucketId: "vivienda-evidence",
        objectPath: OBJECT_PATH,
        signedCapability: "upload_capability_001",
        contentType: "application/pdf",
        bytes: new Uint8Array(2048),
        upsert: false,
      }),
    ).resolves.toEqual({ status: 200 });

    await expect(
      gateway.inspectAndHashObject({ bucketId: "vivienda-evidence", objectPath: OBJECT_PATH }),
    ).resolves.toMatchObject({ mimeType: "application/pdf", byteSize: 2048 });

    await expect(
      gateway.createSignedDownloadGrant({
        bucketId: "vivienda-evidence",
        objectPath: OBJECT_PATH,
        expiresInSeconds: 60,
      }),
    ).resolves.toMatchObject({ url: "https://storage.example.test/download?sig=opaque" });

    await expect(
      gateway.deleteObject({ bucketId: "vivienda-evidence", objectPath: OBJECT_PATH }),
    ).resolves.toBe("deleted");
    expect(counters.storage).toBe(5);
  });

  it("sanitizes provider failures and never leaks provider error text", async () => {
    const { input } = makeInputs({ storageError: true });
    const gateway = createQualifiedDevProviderClientBindings(input).bridge.server.storageGateway;

    let thrown: unknown;
    try {
      await gateway.createSignedUploadGrant({
        bucketId: "vivienda-evidence",
        objectPath: OBJECT_PATH,
        upsert: false,
      });
    } catch (error) {
      thrown = error;
    }
    expectBindingError(thrown, "provider_error");
    expect(String((thrown as Error).message)).not.toContain("sensitive provider detail");
  });

  it("rejects malformed provider Storage grants fail-closed", async () => {
    const { input } = makeInputs({ invalidDownloadUrl: true });
    const gateway = createQualifiedDevProviderClientBindings(input).bridge.server.storageGateway;

    let thrown: unknown;
    try {
      await gateway.createSignedDownloadGrant({
        bucketId: "vivienda-evidence",
        objectPath: OBJECT_PATH,
        expiresInSeconds: 60,
      });
    } catch (error) {
      thrown = error;
    }
    expectBindingError(thrown, "invalid_provider_response");
  });

  it("binds synthetic session issue and principal resolution to the active lease", async () => {
    const { input, counters } = makeInputs();
    const authority = createQualifiedDevProviderClientBindings(input).bridge.sessionAuthority;
    const activeLease = lease();

    const session = await authority.issueSession({
      lease: activeLease,
      actor: "owner",
      expectedSubjectRef: activeLease.ownerSubjectRef,
    });
    expect(session.subjectRef).toBe(activeLease.ownerSubjectRef);

    const request = new Request(`${ORIGIN}/api/v1/cases/case_x/evidence/uploads`, {
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    await expect(authority.resolvePrincipal({ request, lease: activeLease })).resolves.toEqual({
      kind: "client",
      subjectRef: activeLease.ownerSubjectRef,
    });

    const anonymous = new Request(`${ORIGIN}/api/v1/cases/case_x/evidence/uploads`);
    await expect(authority.resolvePrincipal({ request: anonymous, lease: activeLease })).resolves.toBeNull();
    expect(counters.sessions).toBe(2);
  });

  it("rejects a session principal outside the active fixture", async () => {
    const { input } = makeInputs({ resolvedSubjectRef: "sub_synthetic_outside123_owner" });
    const authority = createQualifiedDevProviderClientBindings(input).bridge.sessionAuthority;
    const activeLease = lease();
    const request = new Request(`${ORIGIN}/api/v1/cases/case_x/evidence/uploads`, {
      headers: { authorization: "Bearer session_owner_binding1234" },
    });

    let thrown: unknown;
    try {
      await authority.resolvePrincipal({ request, lease: activeLease });
    } catch (error) {
      thrown = error;
    }
    expectBindingError(thrown, "invalid_provider_response");
  });

  it("contains no runtime activation, environment reads, or public runtime import", () => {
    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/qualified-dev-provider-client-bindings.ts"),
      "utf8",
    );
    expect(source).not.toContain("runtime.server");
    expect(source).not.toContain("createActivatedEvidenceRuntime");
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("service_role");
  });
});
