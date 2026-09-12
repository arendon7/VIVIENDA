import { describe, expect, it } from "vitest";
import {
  SUPABASE_DEV_PROBE_AWARE_FIXTURE_ADMIN_VERSION,
  SupabaseDevProbeAwareFixtureAdmin,
  SupabaseDevProbeAwareFixtureAdminError,
  supabaseDevProbeAwareFixtureAdminProducesNoActivationFacts,
} from "./supabase-dev-probe-aware-fixture-admin";
import type {
  SupabaseFixtureResidue,
  SupabaseProviderFixtureAdminPort,
  SupabaseSyntheticPrincipalRole,
} from "./supabase-provider-fixture-adapter";
import type {
  SupabaseDevProbeRpcClient,
  SupabaseDevProbeRpcResult,
} from "./supabase-dev-probe-support-plane";

const NAMESPACE = "vivienda_dev_cleanup001";
const OWNER = "sub_synthetic_cleanup001_owner";
const INTRUDER = "sub_synthetic_cleanup001_intruder";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const INTRUDER_ID = "22222222-2222-4222-8222-222222222222";

class BaseAdmin implements SupabaseProviderFixtureAdminPort {
  readonly calls: string[] = [];
  residue: SupabaseFixtureResidue = {
    caseRows: 0,
    storageObjects: 0,
    registryRows: 0,
    identityRows: 0,
    authUsers: 0,
  };

  async createSyntheticAuthUser(input: {
    namespace: string;
    subjectRef: string;
    role: SupabaseSyntheticPrincipalRole;
    email: string;
  }) {
    this.calls.push(`create:${input.role}`);
    return { authUserId: input.role === "owner" ? OWNER_ID : INTRUDER_ID };
  }

  async bindSyntheticIdentity() {
    this.calls.push("bind");
  }

  async listStorageObjects() {
    this.calls.push("list");
    return [];
  }

  async deleteStorageObjects() {
    this.calls.push("delete-storage");
  }

  async purgeFixtureDatabase() {
    this.calls.push("purge");
  }

  async deleteAuthUser() {
    this.calls.push("delete-auth");
  }

  async inspectFixtureResidue() {
    this.calls.push("inspect-base");
    return { ...this.residue };
  }
}

class SupportClient implements SupabaseDevProbeRpcClient {
  readonly calls: Array<{ functionName: string; args: Record<string, unknown> }> = [];
  result: SupabaseDevProbeRpcResult<unknown> = { data: 0, error: null };

  async rpc<T = unknown>(functionName: string, args: Record<string, unknown>): Promise<SupabaseDevProbeRpcResult<T>> {
    this.calls.push({ functionName, args: { ...args } });
    return this.result as SupabaseDevProbeRpcResult<T>;
  }
}

function inspectionInput() {
  return {
    namespace: NAMESPACE,
    subjectRefs: [OWNER, INTRUDER] as [string, string],
    authUserIds: [OWNER_ID, INTRUDER_ID] as [string, string],
    bucketId: "vivienda-evidence" as const,
    storagePrefix: `quarantine/upl_${NAMESPACE}_`,
  };
}

describe("Supabase DEV probe-aware fixture admin V0.23.26", () => {
  it("exports the compatibility-decorator version and zero activation facts", () => {
    expect(SUPABASE_DEV_PROBE_AWARE_FIXTURE_ADMIN_VERSION).toBe(
      "V0.23.26-PROBE-AWARE-FIXTURE-ADMIN-V1",
    );
    expect(supabaseDevProbeAwareFixtureAdminProducesNoActivationFacts()).toEqual({});
  });

  it("delegates purge to the frozen admin contract", async () => {
    const base = new BaseAdmin();
    const client = new SupportClient();
    const admin = new SupabaseDevProbeAwareFixtureAdmin(base, client, {
      projectLabel: "vivienda-dev",
    });
    await admin.purgeFixtureDatabase({ namespace: NAMESPACE, subjectRefs: [OWNER, INTRUDER] });
    expect(base.calls).toEqual(["purge"]);
    expect(client.calls).toEqual([]);
  });

  it("keeps zero support residue transparent to the frozen residue shape", async () => {
    const base = new BaseAdmin();
    const client = new SupportClient();
    const admin = new SupabaseDevProbeAwareFixtureAdmin(base, client, {
      projectLabel: "vivienda-dev",
    });
    await expect(admin.inspectFixtureResidue(inspectionInput())).resolves.toEqual(base.residue);
    expect(client.calls).toEqual([
      {
        functionName: "vivienda_dev_probe_support_residue",
        args: { p_project_label: "vivienda-dev", p_namespace: NAMESPACE },
      },
    ]);
  });

  it("folds support residue into caseRows so V0.23.22 cleanup fails closed", async () => {
    const base = new BaseAdmin();
    base.residue.caseRows = 2;
    const client = new SupportClient();
    client.result = { data: 3, error: null };
    const admin = new SupabaseDevProbeAwareFixtureAdmin(base, client, {
      projectLabel: "vivienda-dev",
    });
    await expect(admin.inspectFixtureResidue(inspectionInput())).resolves.toMatchObject({
      caseRows: 5,
      storageObjects: 0,
      registryRows: 0,
      identityRows: 0,
      authUsers: 0,
    });
  });

  it("fails closed if support residue RPC is absent, errors, or malformed", async () => {
    for (const result of [
      { data: null, error: { message: "missing function" } },
      { data: "0", error: null },
      { data: -1, error: null },
    ] satisfies SupabaseDevProbeRpcResult<unknown>[]) {
      const base = new BaseAdmin();
      const client = new SupportClient();
      client.result = result;
      const admin = new SupabaseDevProbeAwareFixtureAdmin(base, client, {
        projectLabel: "vivienda-dev",
      });
      await expect(admin.inspectFixtureResidue(inspectionInput())).rejects.toBeInstanceOf(
        SupabaseDevProbeAwareFixtureAdminError,
      );
    }
  });

  it("rejects a non-DEV project label before delegated I/O", () => {
    const base = new BaseAdmin();
    const client = new SupportClient();
    expect(
      () =>
        new SupabaseDevProbeAwareFixtureAdmin(base, client, {
          projectLabel: "production",
        }),
    ).toThrowError(SupabaseDevProbeAwareFixtureAdminError);
    expect(base.calls).toEqual([]);
    expect(client.calls).toEqual([]);
  });
});
