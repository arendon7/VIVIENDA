import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ProviderCandidateFixtureLease } from "./provider-candidate-fixture-lifecycle";
import {
  SUPABASE_PROVIDER_FIXTURE_ADAPTER_VERSION,
  SupabaseProviderCandidateFixtureLifecycle,
  SupabaseProviderFixtureAdapterError,
  supabaseProviderFixtureAdapterProducesNoActivationFacts,
  type SupabaseFixtureResidue,
  type SupabaseProviderFixtureAdminPort,
} from "./supabase-provider-fixture-adapter";

const NOW = "2026-09-10T18:00:00.000Z";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const INTRUDER_ID = "22222222-2222-4222-8222-222222222222";

function zeroResidue(): SupabaseFixtureResidue {
  return {
    caseRows: 0,
    storageObjects: 0,
    registryRows: 0,
    identityRows: 0,
    authUsers: 0,
  };
}

class RecordingSupabaseAdmin implements SupabaseProviderFixtureAdminPort {
  readonly events: string[] = [];
  objectPaths: string[] = [];
  residue: SupabaseFixtureResidue = zeroResidue();
  failOn = new Set<string>();
  createCount = 0;

  private maybeFail(name: string) {
    if (this.failOn.has(name)) throw new Error(`provider secret from ${name}`);
  }

  async createSyntheticAuthUser(input: {
    namespace: string;
    subjectRef: string;
    role: "owner" | "intruder";
    email: string;
  }) {
    this.createCount += 1;
    this.events.push(`auth:create:${input.role}:${input.namespace}:${input.subjectRef}:${input.email}`);
    this.maybeFail(`create:${input.role}`);
    return { authUserId: input.role === "owner" ? OWNER_ID : INTRUDER_ID };
  }

  async bindSyntheticIdentity(input: {
    authUserId: string;
    subjectRef: string;
    principalKind: "client";
  }) {
    const role = input.authUserId === OWNER_ID ? "owner" : "intruder";
    this.events.push(`identity:bind:${role}:${input.subjectRef}:${input.principalKind}`);
    this.maybeFail(`bind:${role}`);
  }

  async listStorageObjects(input: { bucketId: "vivienda-evidence"; prefix: string }) {
    this.events.push(`storage:list:${input.bucketId}:${input.prefix}`);
    this.maybeFail("storage:list");
    return [...this.objectPaths];
  }

  async deleteStorageObjects(input: { bucketId: "vivienda-evidence"; objectPaths: string[] }) {
    this.events.push(`storage:delete:${input.bucketId}:${input.objectPaths.join(",")}`);
    this.maybeFail("storage:delete");
  }

  async purgeFixtureDatabase(input: { namespace: string; subjectRefs: [string, string] }) {
    this.events.push(`db:purge:${input.namespace}:${input.subjectRefs.join(",")}`);
    this.maybeFail("db:purge");
  }

  async deleteAuthUser(authUserId: string) {
    const role = authUserId === OWNER_ID ? "owner" : authUserId === INTRUDER_ID ? "intruder" : "unknown";
    this.events.push(`auth:delete:${role}`);
    this.maybeFail(`auth:delete:${role}`);
  }

  async inspectFixtureResidue(input: {
    namespace: string;
    subjectRefs: [string, string];
    authUserIds: [string, string];
    bucketId: "vivienda-evidence";
    storagePrefix: string;
  }) {
    this.events.push(
      `inspect:${input.namespace}:${input.subjectRefs.join(",")}:${input.authUserIds.join(",")}:${input.bucketId}:${input.storagePrefix}`,
    );
    this.maybeFail("inspect");
    return { ...this.residue };
  }
}

function lifecycle(admin: RecordingSupabaseAdmin, token = "fixture001", ttlMs?: number) {
  return new SupabaseProviderCandidateFixtureLifecycle(admin, {
    now: () => NOW,
    tokenSource: () => token,
    ...(ttlMs === undefined ? {} : { ttlMs }),
  });
}

async function allocated(admin = new RecordingSupabaseAdmin(), token = "fixture001") {
  const adapter = lifecycle(admin, token);
  const lease = await adapter.allocate("happy_path");
  return { adapter, lease, admin };
}

describe("Supabase Provider Fixture Adapter V0.23.22", () => {
  it("exposes the frozen adapter version", () => {
    expect(SUPABASE_PROVIDER_FIXTURE_ADAPTER_VERSION).toBe("V0.23.22-SUPABASE-FIXTURE-ADAPTER-V1");
  });

  it("allocates two synthetic Supabase Auth principals and binds immutable subject refs", async () => {
    const admin = new RecordingSupabaseAdmin();
    const adapter = lifecycle(admin);

    const lease = await adapter.allocate("happy_path");

    expect(lease).toEqual({
      contractVersion: "V0.23.21-PROVIDER-FIXTURE-V1",
      scope: "happy_path",
      fixtureId: "fx_fixture001",
      namespace: "vivienda_dev_fixture001",
      ownerSubjectRef: "sub_synthetic_fixture001_owner",
      intruderSubjectRef: "sub_synthetic_fixture001_intruder",
      issuedAt: NOW,
      expiresAt: "2026-09-10T18:20:00.000Z",
      syntheticOnly: true,
      disposable: true,
    });
    expect(admin.events).toEqual([
      "auth:create:owner:vivienda_dev_fixture001:sub_synthetic_fixture001_owner:fixture+vivienda_dev_fixture001.owner@vivienda.invalid",
      "identity:bind:owner:sub_synthetic_fixture001_owner:client",
      "auth:create:intruder:vivienda_dev_fixture001:sub_synthetic_fixture001_intruder:fixture+vivienda_dev_fixture001.intruder@vivienda.invalid",
      "identity:bind:intruder:sub_synthetic_fixture001_intruder:client",
    ]);
  });

  it("rejects invalid token or TTL configuration before any provider call", async () => {
    const admin = new RecordingSupabaseAdmin();

    await expect(lifecycle(admin, "bad token").allocate("happy_path")).rejects.toMatchObject({
      code: "invalid_configuration",
    });
    await expect(lifecycle(admin, "fixture002", 30 * 60 * 1000 + 1).allocate("happy_path")).rejects.toMatchObject({
      code: "invalid_configuration",
    });
    expect(admin.events).toEqual([]);
  });

  it("blocks a token collision before touching the provider a second time", async () => {
    const admin = new RecordingSupabaseAdmin();
    const adapter = lifecycle(admin, "fixture003");
    await adapter.allocate("happy_path");
    const eventCount = admin.events.length;

    await expect(adapter.allocate("cross_case_access")).rejects.toMatchObject({
      code: "allocation_failed",
    });
    expect(admin.events).toHaveLength(eventCount);
  });

  it("rolls back database identity rows and every known Auth user after partial allocation failure", async () => {
    const admin = new RecordingSupabaseAdmin();
    admin.failOn.add("bind:intruder");
    const adapter = lifecycle(admin, "fixture004");

    await expect(adapter.allocate("missing_uploaded_object")).rejects.toMatchObject({
      code: "allocation_failed",
    });

    expect(admin.events.slice(-3)).toEqual([
      "db:purge:vivienda_dev_fixture004:sub_synthetic_fixture004_owner,sub_synthetic_fixture004_intruder",
      "auth:delete:owner",
      "auth:delete:intruder",
    ]);
  });

  it("cleans Storage first, then database, then Auth, and verifies all residue last", async () => {
    const { adapter, lease, admin } = await allocated(new RecordingSupabaseAdmin(), "fixture005");
    admin.events.length = 0;
    admin.objectPaths = [
      "quarantine/upl_vivienda_dev_fixture005_a/evd_a/obj_aaaaaa",
      "quarantine/upl_vivienda_dev_fixture005_b/evd_b/obj_bbbbbb",
    ];

    const report = await adapter.cleanup(lease);

    expect(report).toEqual({
      scope: "happy_path",
      fixtureId: "fx_fixture005",
      caseResidueAbsent: true,
      storageResidueAbsent: true,
      registryResidueAbsent: true,
      identityResidueAbsent: true,
    });
    expect(admin.events[0]).toBe(
      "storage:list:vivienda-evidence:quarantine/upl_vivienda_dev_fixture005_",
    );
    expect(admin.events[1]).toContain("storage:delete:vivienda-evidence:");
    expect(admin.events[2]).toContain("db:purge:vivienda_dev_fixture005:");
    expect(admin.events[3]).toBe("auth:delete:owner");
    expect(admin.events[4]).toBe("auth:delete:intruder");
    expect(admin.events[5]).toContain("inspect:vivienda_dev_fixture005:");
  });

  it("never deletes an object returned outside the fixture-owned Storage prefix", async () => {
    const { adapter, lease, admin } = await allocated(new RecordingSupabaseAdmin(), "fixture006");
    admin.events.length = 0;
    admin.objectPaths = ["quarantine/upl_someone_else/evd_x/obj_xxxxxx"];

    await expect(adapter.cleanup(lease)).rejects.toMatchObject({ code: "cleanup_failed" });
    expect(admin.events.some((event) => event.startsWith("storage:delete:"))).toBe(false);
    expect(admin.events.some((event) => event.startsWith("db:purge:"))).toBe(true);
    expect(admin.events).toContain("auth:delete:owner");
    expect(admin.events).toContain("auth:delete:intruder");
  });

  it("attempts later cleanup phases after a Storage failure and retains the fixture for a safe retry", async () => {
    const { adapter, lease, admin } = await allocated(new RecordingSupabaseAdmin(), "fixture007");
    admin.events.length = 0;
    admin.objectPaths = ["quarantine/upl_vivienda_dev_fixture007_a/evd_a/obj_aaaaaa"];
    admin.failOn.add("storage:delete");

    await expect(adapter.cleanup(lease)).rejects.toMatchObject({ code: "cleanup_failed" });
    expect(admin.events.some((event) => event.startsWith("db:purge:"))).toBe(true);
    expect(admin.events).toContain("auth:delete:owner");
    expect(admin.events).toContain("auth:delete:intruder");
    expect(admin.events.some((event) => event.startsWith("inspect:"))).toBe(true);

    admin.failOn.clear();
    admin.objectPaths = [];
    admin.events.length = 0;
    const clonedLease = { ...lease } as ProviderCandidateFixtureLease;
    await expect(adapter.cleanup(clonedLease)).resolves.toMatchObject({ storageResidueAbsent: true });
  });

  it("returns explicit residue flags and retains a non-clean fixture for remediation", async () => {
    const { adapter, lease, admin } = await allocated(new RecordingSupabaseAdmin(), "fixture008");
    admin.residue = {
      caseRows: 1,
      storageObjects: 0,
      registryRows: 2,
      identityRows: 0,
      authUsers: 1,
    };

    const first = await adapter.cleanup(lease);
    expect(first).toMatchObject({
      caseResidueAbsent: false,
      storageResidueAbsent: true,
      registryResidueAbsent: false,
      identityResidueAbsent: false,
    });

    admin.residue = zeroResidue();
    await expect(adapter.cleanup({ ...lease })).resolves.toMatchObject({
      caseResidueAbsent: true,
      storageResidueAbsent: true,
      registryResidueAbsent: true,
      identityResidueAbsent: true,
    });
  });

  it("rejects unknown or tampered leases without issuing destructive provider calls", async () => {
    const { adapter, lease, admin } = await allocated(new RecordingSupabaseAdmin(), "fixture009");
    admin.events.length = 0;

    await expect(
      adapter.cleanup({ ...lease, ownerSubjectRef: "sub_synthetic_fixture009_changed" }),
    ).rejects.toMatchObject({ code: "cleanup_failed" });
    expect(admin.events).toEqual([]);
  });

  it("sanitizes provider failures behind a stable adapter error", async () => {
    const { adapter, lease, admin } = await allocated(new RecordingSupabaseAdmin(), "fixture010");
    admin.failOn.add("inspect");

    try {
      await adapter.cleanup(lease);
      throw new Error("expected cleanup failure");
    } catch (error) {
      expect(error).toBeInstanceOf(SupabaseProviderFixtureAdapterError);
      expect(error).toMatchObject({ code: "cleanup_failed" });
      expect(String((error as Error).message)).not.toContain("provider secret");
    }
  });

  it("produces zero activation facts and stays isolated from runtime activation modules", () => {
    expect(supabaseProviderFixtureAdapterProducesNoActivationFacts()).toEqual({});

    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/supabase-provider-fixture-adapter.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from\s+["']\.\/runtime\.server["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activated-runtime["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activation-preflight["']/);
    expect(source).not.toMatch(/SUPABASE_(?:URL|SERVICE_ROLE|ANON)_KEY/);
  });
});
