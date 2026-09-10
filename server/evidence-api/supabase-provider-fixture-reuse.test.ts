import { describe, expect, it } from "vitest";
import {
  SupabaseProviderCandidateFixtureLifecycle,
  type SupabaseProviderFixtureAdminPort,
} from "./supabase-provider-fixture-adapter";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const INTRUDER_ID = "22222222-2222-4222-8222-222222222222";

class ReuseGuardAdmin implements SupabaseProviderFixtureAdminPort {
  calls = 0;

  async createSyntheticAuthUser(input: { role: "owner" | "intruder" }) {
    this.calls += 1;
    return { authUserId: input.role === "owner" ? OWNER_ID : INTRUDER_ID };
  }

  async bindSyntheticIdentity() {
    this.calls += 1;
  }

  async listStorageObjects() {
    this.calls += 1;
    return [];
  }

  async deleteStorageObjects() {
    this.calls += 1;
  }

  async purgeFixtureDatabase() {
    this.calls += 1;
  }

  async deleteAuthUser() {
    this.calls += 1;
  }

  async inspectFixtureResidue() {
    this.calls += 1;
    return { caseRows: 0, storageObjects: 0, registryRows: 0, identityRows: 0, authUsers: 0 };
  }
}

describe("Supabase fixture historical reuse guard V0.23.22", () => {
  it("never reuses a consumed fixtureId even after the first fixture cleaned successfully", async () => {
    const admin = new ReuseGuardAdmin();
    const adapter = new SupabaseProviderCandidateFixtureLifecycle(admin, {
      now: () => "2026-09-10T18:00:00.000Z",
      tokenSource: () => "historical01",
    });

    const lease = await adapter.allocate("happy_path");
    await adapter.cleanup(lease);
    const callsAfterClean = admin.calls;

    await expect(adapter.allocate("cross_case_access")).rejects.toMatchObject({
      code: "allocation_failed",
    });
    expect(admin.calls).toBe(callsAfterClean);
  });
});
