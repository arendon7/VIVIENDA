import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateDevEnvironmentQualification,
  verifiedDevEnvironmentQualificationFacts,
} from "./dev-provisioning-qualification";
import type { ProviderCandidateParityProbeScope } from "./provider-candidate-parity-harness";
import {
  PROVIDER_CANDIDATE_FIXTURE_CONTRACT_VERSION,
  ProviderCandidateFixtureContractError,
  ProviderCandidateFixtureSession,
  providerCandidateFixtureContractProducesNoActivationFacts,
  type ProviderCandidateFixtureCleanupReport,
  type ProviderCandidateFixtureLease,
  type ProviderCandidateFixtureLifecycle,
} from "./provider-candidate-fixture-lifecycle";

const NOW = "2026-09-09T21:00:00.000Z";

function qualifiedDev() {
  return evaluateDevEnvironmentQualification(verifiedDevEnvironmentQualificationFacts());
}

function fixture(
  scope: ProviderCandidateParityProbeScope,
  suffix: string,
  overrides: Partial<ProviderCandidateFixtureLease> = {},
): ProviderCandidateFixtureLease {
  return {
    contractVersion: PROVIDER_CANDIDATE_FIXTURE_CONTRACT_VERSION,
    scope,
    fixtureId: `fx_fixture_${suffix}`,
    namespace: `vivienda_dev_fixture_${suffix}`,
    ownerSubjectRef: `sub_synthetic_owner_${suffix}`,
    intruderSubjectRef: `sub_synthetic_intruder_${suffix}`,
    issuedAt: NOW,
    expiresAt: "2026-09-09T21:20:00.000Z",
    syntheticOnly: true,
    disposable: true,
    ...overrides,
  };
}

function cleanReport(lease: ProviderCandidateFixtureLease): ProviderCandidateFixtureCleanupReport {
  return {
    scope: lease.scope,
    fixtureId: lease.fixtureId,
    caseResidueAbsent: true,
    storageResidueAbsent: true,
    registryResidueAbsent: true,
    identityResidueAbsent: true,
  };
}

class RecordingLifecycle implements ProviderCandidateFixtureLifecycle {
  readonly allocated: ProviderCandidateParityProbeScope[] = [];
  readonly cleaned: string[] = [];

  constructor(
    private readonly allocateFixture: (
      scope: ProviderCandidateParityProbeScope,
      call: number,
    ) => ProviderCandidateFixtureLease,
    private readonly cleanupFixture: (
      lease: ProviderCandidateFixtureLease,
    ) => ProviderCandidateFixtureCleanupReport = cleanReport,
  ) {}

  async allocate(scope: ProviderCandidateParityProbeScope): Promise<ProviderCandidateFixtureLease> {
    this.allocated.push(scope);
    return this.allocateFixture(scope, this.allocated.length);
  }

  async cleanup(lease: ProviderCandidateFixtureLease): Promise<ProviderCandidateFixtureCleanupReport> {
    this.cleaned.push(lease.fixtureId);
    return this.cleanupFixture(lease);
  }
}

describe("Provider Candidate Fixture Lifecycle V0.23.21", () => {
  it("refuses to allocate fixtures until DEV is fully qualified", async () => {
    const lifecycle = new RecordingLifecycle((scope) => fixture(scope, "001"));
    const session = new ProviderCandidateFixtureSession(
      evaluateDevEnvironmentQualification(),
      lifecycle,
      () => NOW,
    );

    await expect(session.run("happy_path", async () => "never")).rejects.toMatchObject({
      code: "dev_environment_unqualified",
      scope: "happy_path",
    });
    expect(lifecycle.allocated).toEqual([]);
    expect(lifecycle.cleaned).toEqual([]);
  });

  it("runs a probe only inside a synthetic disposable fixture and verifies cleanup", async () => {
    const lifecycle = new RecordingLifecycle((scope) => fixture(scope, "001"));
    const session = new ProviderCandidateFixtureSession(qualifiedDev(), lifecycle, () => NOW);

    const result = await session.run("happy_path", async (lease) => ({
      fixtureId: lease.fixtureId,
      namespace: lease.namespace,
    }));

    expect(result).toEqual({
      fixtureId: "fx_fixture_001",
      namespace: "vivienda_dev_fixture_001",
    });
    expect(lifecycle.allocated).toEqual(["happy_path"]);
    expect(lifecycle.cleaned).toEqual(["fx_fixture_001"]);
  });

  it("rejects non-synthetic or overlong leases and still attempts cleanup", async () => {
    const lifecycle = new RecordingLifecycle((scope) =>
      fixture(scope, "002", {
        ownerSubjectRef: "sub_real_person_002",
        expiresAt: "2026-09-09T22:00:00.000Z",
      }),
    );
    const session = new ProviderCandidateFixtureSession(qualifiedDev(), lifecycle, () => NOW);

    await expect(session.run("unauthenticated_prepare", async () => "never")).rejects.toMatchObject({
      code: "fixture_invalid",
      scope: "unauthenticated_prepare",
    });
    expect(lifecycle.cleaned).toEqual(["fx_fixture_002"]);
  });

  it("prevents fixture, namespace or identity reuse across parity probes, including cross-role reuse", async () => {
    const first = fixture("happy_path", "first");
    const lifecycle = new RecordingLifecycle((scope, call) => {
      if (call === 1) return first;
      return fixture(scope, "second", {
        intruderSubjectRef: first.ownerSubjectRef,
      });
    });
    const session = new ProviderCandidateFixtureSession(qualifiedDev(), lifecycle, () => NOW);

    await session.run("happy_path", async () => "first");

    await expect(
      session.run("cross_case_access", async () => "second"),
    ).rejects.toMatchObject({
      code: "fixture_reuse_detected",
      scope: "cross_case_access",
    });
    expect(lifecycle.cleaned).toEqual(["fx_fixture_first", "fx_fixture_second"]);
  });

  it("always cleans the fixture when probe execution fails", async () => {
    const lifecycle = new RecordingLifecycle((scope) => fixture(scope, "003"));
    const session = new ProviderCandidateFixtureSession(qualifiedDev(), lifecycle, () => NOW);

    await expect(
      session.run("missing_uploaded_object", async () => {
        throw new Error("probe failed");
      }),
    ).rejects.toThrow("probe failed");
    expect(lifecycle.cleaned).toEqual(["fx_fixture_003"]);
  });

  it("preserves a rejection even when a probe throws undefined and still cleans the fixture", async () => {
    const lifecycle = new RecordingLifecycle((scope) => fixture(scope, "undefined"));
    const session = new ProviderCandidateFixtureSession(qualifiedDev(), lifecycle, () => NOW);
    let rejected = false;

    try {
      await session.run("missing_data_authorization", async () => {
        throw undefined;
      });
    } catch (error) {
      rejected = true;
      expect(error).toBeUndefined();
    }

    expect(rejected).toBe(true);
    expect(lifecycle.cleaned).toEqual(["fx_fixture_undefined"]);
  });

  it("fails closed when cleanup cannot prove zero database, storage, registry and identity residue", async () => {
    const lifecycle = new RecordingLifecycle(
      (scope) => fixture(scope, "004"),
      (lease) => ({ ...cleanReport(lease), storageResidueAbsent: false }),
    );
    const session = new ProviderCandidateFixtureSession(qualifiedDev(), lifecycle, () => NOW);

    await expect(session.run("rate_limit_unavailable", async () => "observed")).rejects.toMatchObject({
      code: "fixture_cleanup_failed",
      scope: "rate_limit_unavailable",
    });
  });

  it("sanitizes lifecycle cleanup exceptions instead of leaking provider details", async () => {
    const lifecycle: ProviderCandidateFixtureLifecycle = {
      allocate: async (scope) => fixture(scope, "005"),
      cleanup: async () => {
        throw new Error("service_role=secret path=quarantine/private/document.pdf");
      },
    };
    const session = new ProviderCandidateFixtureSession(qualifiedDev(), lifecycle, () => NOW);

    try {
      await session.run("missing_data_authorization", async () => "observed");
      throw new Error("expected cleanup failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderCandidateFixtureContractError);
      expect(error).toMatchObject({
        code: "fixture_cleanup_failed",
        scope: "missing_data_authorization",
      });
      expect(String((error as Error).message)).not.toContain("service_role");
      expect(String((error as Error).message)).not.toContain("quarantine/private");
    }
  });

  it("produces zero runtime activation facts", () => {
    expect(providerCandidateFixtureContractProducesNoActivationFacts()).toEqual({});
  });

  it("does not import the public runtime or activation construction path", () => {
    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/provider-candidate-fixture-lifecycle.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/from\s+["']\.\/runtime\.server["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activated-runtime["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activation-preflight["']/);
    expect(source).not.toMatch(
      /import\s*\(\s*["']\.\/(?:runtime\.server|activated-runtime|activation-preflight)["']\s*\)/,
    );
  });
});
