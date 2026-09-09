import type { DevEnvironmentQualificationDecision } from "./dev-provisioning-qualification";
import type { ProviderCandidateParityProbeScope } from "./provider-candidate-parity-harness";

export const PROVIDER_CANDIDATE_FIXTURE_CONTRACT_VERSION =
  "V0.23.21-PROVIDER-FIXTURE-V1" as const;

export const PROVIDER_CANDIDATE_MAX_FIXTURE_TTL_MS = 30 * 60 * 1000;
const PROVIDER_CANDIDATE_CLOCK_SKEW_MS = 60 * 1000;

const FIXTURE_ID = /^fx_[A-Za-z0-9_-]{6,}$/;
const FIXTURE_NAMESPACE = /^vivienda_dev_[A-Za-z0-9_-]{6,}$/;
const SYNTHETIC_SUBJECT_REF = /^sub_synthetic_[A-Za-z0-9_-]{6,}$/;

export type ProviderCandidateFixtureLease = {
  contractVersion: typeof PROVIDER_CANDIDATE_FIXTURE_CONTRACT_VERSION;
  scope: ProviderCandidateParityProbeScope;
  fixtureId: string;
  namespace: string;
  ownerSubjectRef: string;
  intruderSubjectRef: string;
  issuedAt: string;
  expiresAt: string;
  syntheticOnly: true;
  disposable: true;
};

export type ProviderCandidateFixtureCleanupReport = {
  scope: ProviderCandidateParityProbeScope;
  fixtureId: string;
  caseResidueAbsent: boolean;
  storageResidueAbsent: boolean;
  registryResidueAbsent: boolean;
  identityResidueAbsent: boolean;
};

export interface ProviderCandidateFixtureLifecycle {
  allocate(scope: ProviderCandidateParityProbeScope): Promise<ProviderCandidateFixtureLease>;
  cleanup(lease: ProviderCandidateFixtureLease): Promise<ProviderCandidateFixtureCleanupReport>;
}

export type ProviderCandidateFixtureContractErrorCode =
  | "dev_environment_unqualified"
  | "fixture_allocation_failed"
  | "fixture_invalid"
  | "fixture_reuse_detected"
  | "fixture_cleanup_failed";

export class ProviderCandidateFixtureContractError extends Error {
  constructor(
    readonly code: ProviderCandidateFixtureContractErrorCode,
    readonly scope: ProviderCandidateParityProbeScope,
  ) {
    super(`Provider candidate fixture contract failed in ${scope}.`);
    this.name = "ProviderCandidateFixtureContractError";
  }
}

function assertQualifiedDev(
  qualification: DevEnvironmentQualificationDecision,
  scope: ProviderCandidateParityProbeScope,
): void {
  const qualified =
    qualification.state === "qualified_for_staging_candidate" &&
    qualification.devEnvironmentVerified === true &&
    qualification.liveRuntimeAuthorized === false &&
    qualification.blockers.length === 0 &&
    qualification.totalRequirementCount > 0 &&
    qualification.verifiedRequirementCount === qualification.totalRequirementCount;

  if (!qualified) {
    throw new ProviderCandidateFixtureContractError("dev_environment_unqualified", scope);
  }
}

function parseTimestamp(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function assertLease(
  lease: ProviderCandidateFixtureLease,
  scope: ProviderCandidateParityProbeScope,
  now: string,
): void {
  const issuedAt = parseTimestamp(lease.issuedAt);
  const expiresAt = parseTimestamp(lease.expiresAt);
  const nowAt = parseTimestamp(now);

  const valid =
    lease.contractVersion === PROVIDER_CANDIDATE_FIXTURE_CONTRACT_VERSION &&
    lease.scope === scope &&
    FIXTURE_ID.test(lease.fixtureId) &&
    FIXTURE_NAMESPACE.test(lease.namespace) &&
    SYNTHETIC_SUBJECT_REF.test(lease.ownerSubjectRef) &&
    SYNTHETIC_SUBJECT_REF.test(lease.intruderSubjectRef) &&
    lease.ownerSubjectRef !== lease.intruderSubjectRef &&
    lease.syntheticOnly === true &&
    lease.disposable === true &&
    issuedAt !== null &&
    expiresAt !== null &&
    nowAt !== null &&
    expiresAt > issuedAt &&
    expiresAt > nowAt &&
    issuedAt <= nowAt + PROVIDER_CANDIDATE_CLOCK_SKEW_MS &&
    expiresAt - issuedAt <= PROVIDER_CANDIDATE_MAX_FIXTURE_TTL_MS;

  if (!valid) {
    throw new ProviderCandidateFixtureContractError("fixture_invalid", scope);
  }
}

function assertCleanupReport(
  report: ProviderCandidateFixtureCleanupReport,
  lease: ProviderCandidateFixtureLease,
): void {
  const clean =
    report.scope === lease.scope &&
    report.fixtureId === lease.fixtureId &&
    report.caseResidueAbsent === true &&
    report.storageResidueAbsent === true &&
    report.registryResidueAbsent === true &&
    report.identityResidueAbsent === true;

  if (!clean) {
    throw new ProviderCandidateFixtureContractError("fixture_cleanup_failed", lease.scope);
  }
}

/**
 * One parity certification must use one session so identities and namespaces cannot be reused
 * across happy-path/adversarial probes by accident.
 *
 * The session requires a fully qualified DEV environment, accepts only synthetic disposable
 * leases, and verifies cleanup after every probe. It neither imports the public runtime nor
 * produces activation facts.
 */
export class ProviderCandidateFixtureSession {
  private readonly consumedIdentifiers = new Set<string>();

  constructor(
    private readonly qualification: DevEnvironmentQualificationDecision,
    private readonly lifecycle: ProviderCandidateFixtureLifecycle,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  private assertFreshIdentifiers(
    lease: ProviderCandidateFixtureLease,
    scope: ProviderCandidateParityProbeScope,
  ): void {
    const identifiers = [
      `fixture:${lease.fixtureId}`,
      `namespace:${lease.namespace}`,
      `subject:${lease.ownerSubjectRef}`,
      `subject:${lease.intruderSubjectRef}`,
    ];

    if (identifiers.some((identifier) => this.consumedIdentifiers.has(identifier))) {
      throw new ProviderCandidateFixtureContractError("fixture_reuse_detected", scope);
    }

    for (const identifier of identifiers) this.consumedIdentifiers.add(identifier);
  }

  private async cleanupOrFail(lease: ProviderCandidateFixtureLease): Promise<void> {
    try {
      const report = await this.lifecycle.cleanup(lease);
      assertCleanupReport(report, lease);
    } catch {
      throw new ProviderCandidateFixtureContractError("fixture_cleanup_failed", lease.scope);
    }
  }

  async run<T>(
    scope: ProviderCandidateParityProbeScope,
    execute: (lease: ProviderCandidateFixtureLease) => Promise<T>,
  ): Promise<T> {
    assertQualifiedDev(this.qualification, scope);

    let lease: ProviderCandidateFixtureLease;
    try {
      lease = await this.lifecycle.allocate(scope);
    } catch {
      throw new ProviderCandidateFixtureContractError("fixture_allocation_failed", scope);
    }

    try {
      assertLease(lease, scope, this.now());
      this.assertFreshIdentifiers(lease, scope);
    } catch (error) {
      await this.cleanupOrFail(lease);
      throw error;
    }

    let result: T | undefined;
    let executionFailed = false;
    let executionError: unknown;

    try {
      result = await execute(lease);
    } catch (error) {
      executionFailed = true;
      executionError = error;
    }

    await this.cleanupOrFail(lease);

    if (executionFailed) throw executionError;
    return result as T;
  }
}

/**
 * Fixture qualification/cleanup is conformance plumbing only. It must never be translated into
 * Evidence Runtime activation facts.
 */
export function providerCandidateFixtureContractProducesNoActivationFacts(): Record<string, never> {
  return {};
}
