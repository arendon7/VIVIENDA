import { describe, expect, it } from "vitest";
import {
  evaluateDevEnvironmentQualification,
  verifiedDevEnvironmentQualificationFacts,
} from "./dev-provisioning-qualification";
import { ProviderCandidateFixtureSession } from "./provider-candidate-fixture-lifecycle";
import {
  SupabaseProviderCandidateProbeAdapter,
  SupabaseProviderCandidateProbeAdapterError,
  type SupabaseProviderCandidateProbeExecutionPort,
} from "./supabase-provider-candidate-probe-adapter";

const NOW = "2026-09-10T20:30:00.000Z";

describe("Supabase Provider Candidate Probe external IO gate V0.23.24", () => {
  it("rejects a provider candidate surface that declares no external IO before fixture allocation", () => {
    let allocations = 0;
    const qualification = evaluateDevEnvironmentQualification(
      verifiedDevEnvironmentQualificationFacts(),
    );
    const session = new ProviderCandidateFixtureSession(
      qualification,
      {
        async allocate() {
          allocations += 1;
          throw new Error("must not allocate");
        },
        async cleanup() {
          throw new Error("must not cleanup");
        },
      },
      () => NOW,
    );

    const nonProviderExecution = {
      provider: "supabase",
      projectLabel: "vivienda-dev",
      syntheticOnly: true,
      externalIoOccurred: false,
      liveRuntimeAuthorized: false,
      runtimeServerWasUsed: false,
    } as unknown as SupabaseProviderCandidateProbeExecutionPort;

    expect(
      () => new SupabaseProviderCandidateProbeAdapter(session, nonProviderExecution),
    ).toThrowError(SupabaseProviderCandidateProbeAdapterError);
    expect(allocations).toBe(0);
  });
});
