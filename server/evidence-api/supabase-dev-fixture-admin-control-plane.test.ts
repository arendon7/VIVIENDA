import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateDevEnvironmentQualification,
  verifiedDevEnvironmentQualificationFacts,
} from "./dev-provisioning-qualification";
import {
  SUPABASE_DEV_FIXTURE_ADMIN_CONTROL_PLANE_VERSION,
  SupabaseDevFixtureAdminControlPlane,
  SupabaseDevFixtureAdminControlPlaneError,
  supabaseDevFixtureAdminControlPlaneProducesNoActivationFacts,
  type SupabaseDevClientResult,
  type SupabaseDevFixtureClient,
  type SupabaseDevStorageEntry,
} from "./supabase-dev-fixture-admin-control-plane";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const INTRUDER_ID = "22222222-2222-4222-8222-222222222222";
const NAMESPACE = "vivienda_dev_fixture123";
const OWNER_REF = "sub_synthetic_fixture123_owner";
const INTRUDER_REF = "sub_synthetic_fixture123_intruder";
const STORAGE_PREFIX = "quarantine/upl_vivienda_dev_fixture123_";

function ok<T>(data: T): SupabaseDevClientResult<T> {
  return { data, error: null };
}

function qualifiedDev() {
  return evaluateDevEnvironmentQualification(verifiedDevEnvironmentQualificationFacts());
}

class FakeSupabaseDevClient implements SupabaseDevFixtureClient {
  readonly events: Array<{ name: string; payload: unknown }> = [];
  createUserResult: SupabaseDevClientResult<{ user: { id: string } | null }> = ok({ user: { id: OWNER_ID } });
  deleteUserResults = new Map<string, SupabaseDevClientResult<unknown>>();
  getUserResults = new Map<string, SupabaseDevClientResult<{ user: { id: string } | null }>>();
  rpcResults = new Map<string, SupabaseDevClientResult<unknown>>();
  storagePages = new Map<string, SupabaseDevClientResult<SupabaseDevStorageEntry[] | null>>();
  removeResults: SupabaseDevClientResult<unknown>[] = [];

  auth = {
    admin: {
      createUser: async (attributes: { email: string; email_confirm: true }) => {
        this.events.push({ name: "auth.createUser", payload: attributes });
        return this.createUserResult;
      },
      deleteUser: async (userId: string) => {
        this.events.push({ name: "auth.deleteUser", payload: userId });
        return this.deleteUserResults.get(userId) ?? ok(null);
      },
      getUserById: async (userId: string) => {
        this.events.push({ name: "auth.getUserById", payload: userId });
        return this.getUserResults.get(userId) ?? ok({ user: null });
      },
    },
  };

  storage = {
    from: (bucketId: string) => {
      this.events.push({ name: "storage.from", payload: bucketId });
      return {
        list: async (
          path: string,
          options: {
            limit: number;
            offset: number;
            sortBy: { column: "name"; order: "asc" };
            search?: string;
          },
        ) => {
          this.events.push({ name: "storage.list", payload: { path, options } });
          const key = `${path}|${options.search ?? ""}|${options.offset}`;
          return this.storagePages.get(key) ?? ok([]);
        },
        remove: async (paths: string[]) => {
          this.events.push({ name: "storage.remove", payload: paths });
          return this.removeResults.shift() ?? ok([]);
        },
      };
    },
  };

  async rpc<T = unknown>(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<SupabaseDevClientResult<T>> {
    this.events.push({ name: "rpc", payload: { functionName, args } });
    return (this.rpcResults.get(functionName) ?? ok(null)) as SupabaseDevClientResult<T>;
  }
}

function control(client = new FakeSupabaseDevClient()) {
  return {
    client,
    control: new SupabaseDevFixtureAdminControlPlane(
      client,
      { projectLabel: "vivienda-dev" },
      qualifiedDev(),
    ),
  };
}

describe("Supabase DEV Fixture Admin Control Plane V0.23.23", () => {
  it("exposes the frozen control-plane version", () => {
    expect(SUPABASE_DEV_FIXTURE_ADMIN_CONTROL_PLANE_VERSION).toBe(
      "V0.23.23-SUPABASE-DEV-ADMIN-V1",
    );
  });

  it("refuses any project label other than vivienda-dev at construction", () => {
    const client = new FakeSupabaseDevClient();
    expect(
      () =>
        new SupabaseDevFixtureAdminControlPlane(
          client,
          { projectLabel: "production" },
          qualifiedDev(),
        ),
    ).toThrowError(SupabaseDevFixtureAdminControlPlaneError);
    expect(client.events).toEqual([]);
  });

  it("refuses construction unless V0.23.14 is fully 14/14 qualified", () => {
    const client = new FakeSupabaseDevClient();
    expect(
      () =>
        new SupabaseDevFixtureAdminControlPlane(
          client,
          { projectLabel: "vivienda-dev" },
          evaluateDevEnvironmentQualification(),
        ),
    ).toThrowError(SupabaseDevFixtureAdminControlPlaneError);
    expect(client.events).toEqual([]);
  });

  it("creates only the exact synthetic fixture identity and auto-confirms the email", async () => {
    const { client, control } = control();

    await expect(
      control.createSyntheticAuthUser({
        namespace: NAMESPACE,
        subjectRef: OWNER_REF,
        role: "owner",
        email: `fixture+${NAMESPACE}.owner@vivienda.invalid`,
      }),
    ).resolves.toEqual({ authUserId: OWNER_ID });

    expect(client.events).toEqual([
      {
        name: "auth.createUser",
        payload: {
          email: `fixture+${NAMESPACE}.owner@vivienda.invalid`,
          email_confirm: true,
        },
      },
    ]);
  });

  it("rejects mismatched namespace, subject or email before Auth Admin I/O", async () => {
    const { client, control } = control();

    await expect(
      control.createSyntheticAuthUser({
        namespace: NAMESPACE,
        subjectRef: INTRUDER_REF,
        role: "owner",
        email: `fixture+${NAMESPACE}.owner@vivienda.invalid`,
      }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(client.events).toEqual([]);
  });

  it("sanitizes Auth provider errors and invalid user responses", async () => {
    const first = control();
    first.client.createUserResult = {
      data: { user: null },
      error: { code: "unexpected_failure", message: "service_role=secret" },
    };

    try {
      await first.control.createSyntheticAuthUser({
        namespace: NAMESPACE,
        subjectRef: OWNER_REF,
        role: "owner",
        email: `fixture+${NAMESPACE}.owner@vivienda.invalid`,
      });
      throw new Error("expected provider failure");
    } catch (error) {
      expect(error).toBeInstanceOf(SupabaseDevFixtureAdminControlPlaneError);
      expect(error).toMatchObject({ code: "provider_error" });
      expect(String((error as Error).message)).not.toContain("service_role");
    }

    const second = control();
    second.client.createUserResult = ok({ user: { id: "not-a-uuid" } });
    await expect(
      second.control.createSyntheticAuthUser({
        namespace: NAMESPACE,
        subjectRef: OWNER_REF,
        role: "owner",
        email: `fixture+${NAMESPACE}.owner@vivienda.invalid`,
      }),
    ).rejects.toMatchObject({ code: "invalid_provider_response" });
  });

  it("binds identity through the canonical immutable-identity RPC", async () => {
    const { client, control } = control();
    client.rpcResults.set("vivienda_persist_upsert_identity", ok(null));

    await control.bindSyntheticIdentity({
      authUserId: OWNER_ID,
      subjectRef: OWNER_REF,
      principalKind: "client",
    });

    expect(client.events).toContainEqual({
      name: "rpc",
      payload: {
        functionName: "vivienda_persist_upsert_identity",
        args: {
          p_auth_user_id: OWNER_ID,
          p_subject_ref: OWNER_REF,
          p_principal_kind: "client",
        },
      },
    });
  });

  it("rejects non-synthetic identity binding before RPC", async () => {
    const { client, control } = control();
    await expect(
      control.bindSyntheticIdentity({
        authUserId: OWNER_ID,
        subjectRef: "sub_real_customer_123",
        principalKind: "client",
      }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(client.events).toEqual([]);
  });

  it("recursively enumerates only fixture-owned canonical Storage objects", async () => {
    const { client, control } = control();
    client.storagePages.set(
      `quarantine|upl_vivienda_dev_fixture123_|0`,
      ok([
        { name: "upl_vivienda_dev_fixture123_intentA", id: null },
        { name: "upl_vivienda_dev_other000_intentB", id: null },
      ]),
    );
    client.storagePages.set(
      "quarantine/upl_vivienda_dev_fixture123_intentA||0",
      ok([{ name: "evd_abc", id: null }]),
    );
    client.storagePages.set(
      "quarantine/upl_vivienda_dev_fixture123_intentA/evd_abc||0",
      ok([{ name: "obj_abcdef", id: "storage-object-id" }]),
    );

    await expect(
      control.listStorageObjects({ bucketId: "vivienda-evidence", prefix: STORAGE_PREFIX }),
    ).resolves.toEqual([
      "quarantine/upl_vivienda_dev_fixture123_intentA/evd_abc/obj_abcdef",
    ]);

    expect(
      client.events.filter((event) => event.name === "storage.list").map((event) => event.payload),
    ).toEqual([
      {
        path: "quarantine",
        options: {
          limit: 100,
          offset: 0,
          sortBy: { column: "name", order: "asc" },
          search: "upl_vivienda_dev_fixture123_",
        },
      },
      {
        path: "quarantine/upl_vivienda_dev_fixture123_intentA",
        options: { limit: 100, offset: 0, sortBy: { column: "name", order: "asc" } },
      },
      {
        path: "quarantine/upl_vivienda_dev_fixture123_intentA/evd_abc",
        options: { limit: 100, offset: 0, sortBy: { column: "name", order: "asc" } },
      },
    ]);
  });

  it("fails closed if Storage returns a direct file at fixture-root depth", async () => {
    const { client, control } = control();
    client.storagePages.set(
      `quarantine|upl_vivienda_dev_fixture123_|0`,
      ok([{ name: "upl_vivienda_dev_fixture123_badfile", id: "unexpected-file" }]),
    );

    await expect(
      control.listStorageObjects({ bucketId: "vivienda-evidence", prefix: STORAGE_PREFIX }),
    ).rejects.toMatchObject({ code: "invalid_provider_response" });
  });

  it("fails closed on an unexpected folder depth instead of returning an incomplete object set", async () => {
    const { client, control } = control();
    client.storagePages.set(
      `quarantine|upl_vivienda_dev_fixture123_|0`,
      ok([{ name: "upl_vivienda_dev_fixture123_intentA", id: null }]),
    );
    client.storagePages.set(
      "quarantine/upl_vivienda_dev_fixture123_intentA||0",
      ok([{ name: "evd_abc", id: null }]),
    );
    client.storagePages.set(
      "quarantine/upl_vivienda_dev_fixture123_intentA/evd_abc||0",
      ok([{ name: "unexpected-folder", id: null }]),
    );

    await expect(
      control.listStorageObjects({ bucketId: "vivienda-evidence", prefix: STORAGE_PREFIX }),
    ).rejects.toMatchObject({ code: "invalid_provider_response" });
  });

  it("batches physical Storage deletion and rejects duplicate/non-canonical paths before remove", async () => {
    const { client, control } = control();
    const paths = Array.from({ length: 101 }, (_, index) =>
      `quarantine/upl_vivienda_dev_fixture123_intentA/evd_abc/obj_${String(index).padStart(6, "0")}`,
    );

    await control.deleteStorageObjects({ bucketId: "vivienda-evidence", objectPaths: paths });
    const removes = client.events.filter((event) => event.name === "storage.remove");
    expect(removes).toHaveLength(2);
    expect(removes[0]!.payload as string[]).toHaveLength(100);
    expect(removes[1]!.payload as string[]).toHaveLength(1);

    const second = control();
    await expect(
      second.control.deleteStorageObjects({
        bucketId: "vivienda-evidence",
        objectPaths: [paths[0]!, paths[0]!],
      }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(second.client.events).toEqual([]);
  });

  it("purges only the exact DEV namespace/subject pair through the DEV-only RPC", async () => {
    const { client, control } = control();
    client.rpcResults.set("vivienda_dev_fixture_purge", ok(null));

    await control.purgeFixtureDatabase({ namespace: NAMESPACE, subjectRefs: [OWNER_REF, INTRUDER_REF] });
    expect(client.events).toContainEqual({
      name: "rpc",
      payload: {
        functionName: "vivienda_dev_fixture_purge",
        args: {
          p_project_label: "vivienda-dev",
          p_namespace: NAMESPACE,
          p_subject_refs: [OWNER_REF, INTRUDER_REF],
        },
      },
    });

    const second = control();
    await expect(
      second.control.purgeFixtureDatabase({ namespace: NAMESPACE, subjectRefs: [INTRUDER_REF, OWNER_REF] }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(second.client.events).toEqual([]);
  });

  it("treats Auth user_not_found as idempotent deletion but no other provider error as success", async () => {
    const first = control();
    first.client.deleteUserResults.set(OWNER_ID, {
      data: null,
      error: { code: "user_not_found", status: 404, message: "gone" },
    });
    await expect(first.control.deleteAuthUser(OWNER_ID)).resolves.toBeUndefined();

    const second = control();
    second.client.deleteUserResults.set(OWNER_ID, {
      data: null,
      error: { code: "unexpected_failure", status: 500, message: "secret provider diagnostic" },
    });
    await expect(second.control.deleteAuthUser(OWNER_ID)).rejects.toMatchObject({
      code: "provider_error",
    });
  });

  it("combines independent DB, Storage and Auth residue into one truthful report", async () => {
    const { client, control } = control();
    client.rpcResults.set(
      "vivienda_dev_fixture_residue",
      ok({ caseRows: 2, registryRows: 1, identityRows: 0 }),
    );
    client.storagePages.set(`quarantine|upl_vivienda_dev_fixture123_|0`, ok([]));
    client.getUserResults.set(OWNER_ID, ok({ user: { id: OWNER_ID } }));
    client.getUserResults.set(INTRUDER_ID, {
      data: { user: null },
      error: { code: "user_not_found", status: 404 },
    });

    await expect(
      control.inspectFixtureResidue({
        namespace: NAMESPACE,
        subjectRefs: [OWNER_REF, INTRUDER_REF],
        authUserIds: [OWNER_ID, INTRUDER_ID],
        bucketId: "vivienda-evidence",
        storagePrefix: STORAGE_PREFIX,
      }),
    ).resolves.toEqual({
      caseRows: 2,
      storageObjects: 0,
      registryRows: 1,
      identityRows: 0,
      authUsers: 1,
    });
  });

  it("rejects malformed residue instead of manufacturing a clean report", async () => {
    const { client, control } = control();
    client.rpcResults.set(
      "vivienda_dev_fixture_residue",
      ok({ caseRows: 0, registryRows: "0", identityRows: 0 }),
    );

    await expect(
      control.inspectFixtureResidue({
        namespace: NAMESPACE,
        subjectRefs: [OWNER_REF, INTRUDER_REF],
        authUserIds: [OWNER_ID, INTRUDER_ID],
        bucketId: "vivienda-evidence",
        storagePrefix: STORAGE_PREFIX,
      }),
    ).rejects.toMatchObject({ code: "invalid_provider_response" });

    expect(client.events.some((event) => event.name === "storage.from")).toBe(false);
    expect(client.events.some((event) => event.name === "auth.getUserById")).toBe(false);
  });

  it("caps Storage pagination so an incomplete provider enumeration can never certify zero residue", async () => {
    const { client, control } = control();
    for (let offset = 0; offset < 10_000; offset += 100) {
      client.storagePages.set(
        `quarantine|upl_vivienda_dev_fixture123_|${offset}`,
        ok(
          Array.from({ length: 100 }, (_, index) => ({
            name: `unrelated_${String(offset + index).padStart(6, "0")}`,
            id: null,
          })),
        ),
      );
    }

    await expect(
      control.listStorageObjects({ bucketId: "vivienda-evidence", prefix: STORAGE_PREFIX }),
    ).rejects.toMatchObject({ code: "enumeration_limit_exceeded" });
  });

  it("produces zero activation facts and contains no Supabase credential source", () => {
    expect(supabaseDevFixtureAdminControlPlaneProducesNoActivationFacts()).toEqual({});

    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/supabase-dev-fixture-admin-control-plane.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from\s+["']\.\/runtime\.server["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activated-runtime["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activation-preflight["']/);
    expect(source).not.toMatch(/process\.env/);
    expect(source).not.toMatch(/SUPABASE_(?:URL|SERVICE_ROLE|ANON)_KEY/);
  });
});
