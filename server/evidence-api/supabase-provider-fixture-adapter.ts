import { randomBytes } from "node:crypto";
import { EVIDENCE_BUCKET_ID } from "@/domain/storage-coordination/coordinator";
import type { ProviderCandidateParityProbeScope } from "./provider-candidate-parity-harness";
import {
  PROVIDER_CANDIDATE_FIXTURE_CONTRACT_VERSION,
  PROVIDER_CANDIDATE_MAX_FIXTURE_TTL_MS,
  type ProviderCandidateFixtureCleanupReport,
  type ProviderCandidateFixtureLease,
  type ProviderCandidateFixtureLifecycle,
} from "./provider-candidate-fixture-lifecycle";

const DEFAULT_FIXTURE_TTL_MS = 20 * 60 * 1000;
const TOKEN = /^[A-Za-z0-9_-]{8,40}$/;
const AUTH_USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const SUPABASE_PROVIDER_FIXTURE_ADAPTER_VERSION =
  "V0.23.22-SUPABASE-FIXTURE-ADAPTER-V1" as const;

export type SupabaseSyntheticPrincipalRole = "owner" | "intruder";

export type SupabaseSyntheticAuthUser = {
  authUserId: string;
};

export type SupabaseFixtureResidue = {
  caseRows: number;
  storageObjects: number;
  registryRows: number;
  identityRows: number;
  authUsers: number;
};

/**
 * Provider-specific control plane required by the fixture adapter.
 *
 * V0.23.22 intentionally keeps the concrete Supabase SDK/REST client outside this module so the
 * adapter can be certified without credentials or provider I/O. A future DEV-only implementation
 * must map these operations to Supabase Auth Admin, Storage API and service-role persistence
 * operations without exposing them to the public runtime.
 */
export interface SupabaseProviderFixtureAdminPort {
  createSyntheticAuthUser(input: {
    namespace: string;
    subjectRef: string;
    role: SupabaseSyntheticPrincipalRole;
    email: string;
  }): Promise<SupabaseSyntheticAuthUser>;

  bindSyntheticIdentity(input: {
    authUserId: string;
    subjectRef: string;
    principalKind: "client";
  }): Promise<void>;

  listStorageObjects(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    prefix: string;
  }): Promise<string[]>;

  deleteStorageObjects(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPaths: string[];
  }): Promise<void>;

  /** Must be idempotent for a previously purged namespace. */
  purgeFixtureDatabase(input: {
    namespace: string;
    subjectRefs: [string, string];
  }): Promise<void>;

  /** Must treat an already-absent synthetic Auth user as successfully deleted. */
  deleteAuthUser(authUserId: string): Promise<void>;

  inspectFixtureResidue(input: {
    namespace: string;
    subjectRefs: [string, string];
    authUserIds: [string, string];
    bucketId: typeof EVIDENCE_BUCKET_ID;
    storagePrefix: string;
  }): Promise<SupabaseFixtureResidue>;
}

export type SupabaseProviderFixtureAdapterErrorCode =
  | "invalid_configuration"
  | "allocation_failed"
  | "cleanup_failed";

export class SupabaseProviderFixtureAdapterError extends Error {
  constructor(readonly code: SupabaseProviderFixtureAdapterErrorCode) {
    super("Supabase provider fixture adapter failed.");
    this.name = "SupabaseProviderFixtureAdapterError";
  }
}

type ActiveFixture = {
  lease: ProviderCandidateFixtureLease;
  authUserIds: [string, string];
  storagePrefix: string;
};

type ProviderCall = () => Promise<void>;

function defaultTokenSource(): string {
  return randomBytes(12).toString("hex");
}

function plusMilliseconds(iso: string, milliseconds: number): string | null {
  const start = Date.parse(iso);
  if (!Number.isFinite(start)) return null;
  return new Date(start + milliseconds).toISOString();
}

function syntheticEmail(namespace: string, role: SupabaseSyntheticPrincipalRole): string {
  return `fixture+${namespace}.${role}@vivienda.invalid`;
}

function safeCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function validateResidue(value: SupabaseFixtureResidue): boolean {
  return (
    safeCount(value.caseRows) &&
    safeCount(value.storageObjects) &&
    safeCount(value.registryRows) &&
    safeCount(value.identityRows) &&
    safeCount(value.authUsers)
  );
}

function leaseMatches(active: ProviderCandidateFixtureLease, candidate: ProviderCandidateFixtureLease): boolean {
  return (
    active.contractVersion === candidate.contractVersion &&
    active.scope === candidate.scope &&
    active.fixtureId === candidate.fixtureId &&
    active.namespace === candidate.namespace &&
    active.ownerSubjectRef === candidate.ownerSubjectRef &&
    active.intruderSubjectRef === candidate.intruderSubjectRef &&
    active.issuedAt === candidate.issuedAt &&
    active.expiresAt === candidate.expiresAt &&
    active.syntheticOnly === candidate.syntheticOnly &&
    active.disposable === candidate.disposable
  );
}

async function settleAll(calls: ProviderCall[]): Promise<boolean> {
  let failed = false;
  for (const call of calls) {
    try {
      await call();
    } catch {
      failed = true;
    }
  }
  return failed;
}

/**
 * Supabase-specific lifecycle adapter for V0.23.21 fixture sessions.
 *
 * It is deliberately DEV-only plumbing. It never receives runtime activation authority and never
 * imports the public Evidence Runtime. Storage deletion is always attempted before database purge;
 * Auth deletion happens only after persistence rows are removed.
 */
export class SupabaseProviderCandidateFixtureLifecycle implements ProviderCandidateFixtureLifecycle {
  private readonly activeFixtures = new Map<string, ActiveFixture>();
  private readonly consumedFixtureIds = new Set<string>();

  constructor(
    private readonly admin: SupabaseProviderFixtureAdminPort,
    private readonly options: {
      now?: () => string;
      tokenSource?: () => string;
      ttlMs?: number;
    } = {},
  ) {}

  private now(): string {
    return (this.options.now ?? (() => new Date().toISOString()))();
  }

  private token(): string {
    return (this.options.tokenSource ?? defaultTokenSource)();
  }

  private ttlMs(): number {
    return this.options.ttlMs ?? DEFAULT_FIXTURE_TTL_MS;
  }

  private buildLease(scope: ProviderCandidateParityProbeScope): ProviderCandidateFixtureLease {
    const token = this.token();
    const issuedAt = this.now();
    const ttlMs = this.ttlMs();
    const expiresAt = plusMilliseconds(issuedAt, ttlMs);

    if (
      !TOKEN.test(token) ||
      !expiresAt ||
      !Number.isSafeInteger(ttlMs) ||
      ttlMs <= 0 ||
      ttlMs > PROVIDER_CANDIDATE_MAX_FIXTURE_TTL_MS
    ) {
      throw new SupabaseProviderFixtureAdapterError("invalid_configuration");
    }

    const namespace = `vivienda_dev_${token}`;
    return {
      contractVersion: PROVIDER_CANDIDATE_FIXTURE_CONTRACT_VERSION,
      scope,
      fixtureId: `fx_${token}`,
      namespace,
      ownerSubjectRef: `sub_synthetic_${token}_owner`,
      intruderSubjectRef: `sub_synthetic_${token}_intruder`,
      issuedAt,
      expiresAt,
      syntheticOnly: true,
      disposable: true,
    };
  }

  private async rollbackPartialAllocation(
    lease: ProviderCandidateFixtureLease,
    authUserIds: string[],
  ): Promise<void> {
    const subjectRefs: [string, string] = [lease.ownerSubjectRef, lease.intruderSubjectRef];
    await settleAll([
      () => this.admin.purgeFixtureDatabase({ namespace: lease.namespace, subjectRefs }),
      ...authUserIds.map((authUserId) => () => this.admin.deleteAuthUser(authUserId)),
    ]);
  }

  async allocate(scope: ProviderCandidateParityProbeScope): Promise<ProviderCandidateFixtureLease> {
    const lease = this.buildLease(scope);
    if (this.consumedFixtureIds.has(lease.fixtureId)) {
      throw new SupabaseProviderFixtureAdapterError("allocation_failed");
    }
    this.consumedFixtureIds.add(lease.fixtureId);

    const createdAuthUserIds: string[] = [];

    try {
      const owner = await this.admin.createSyntheticAuthUser({
        namespace: lease.namespace,
        subjectRef: lease.ownerSubjectRef,
        role: "owner",
        email: syntheticEmail(lease.namespace, "owner"),
      });
      if (!AUTH_USER_ID.test(owner.authUserId)) throw new Error("invalid auth user id");
      createdAuthUserIds.push(owner.authUserId);
      await this.admin.bindSyntheticIdentity({
        authUserId: owner.authUserId,
        subjectRef: lease.ownerSubjectRef,
        principalKind: "client",
      });

      const intruder = await this.admin.createSyntheticAuthUser({
        namespace: lease.namespace,
        subjectRef: lease.intruderSubjectRef,
        role: "intruder",
        email: syntheticEmail(lease.namespace, "intruder"),
      });
      if (!AUTH_USER_ID.test(intruder.authUserId) || intruder.authUserId === owner.authUserId) {
        throw new Error("invalid auth user id");
      }
      createdAuthUserIds.push(intruder.authUserId);
      await this.admin.bindSyntheticIdentity({
        authUserId: intruder.authUserId,
        subjectRef: lease.intruderSubjectRef,
        principalKind: "client",
      });

      const active: ActiveFixture = {
        lease,
        authUserIds: [owner.authUserId, intruder.authUserId],
        storagePrefix: `quarantine/upl_${lease.namespace}_`,
      };
      this.activeFixtures.set(lease.fixtureId, active);
      return lease;
    } catch {
      await this.rollbackPartialAllocation(lease, createdAuthUserIds);
      throw new SupabaseProviderFixtureAdapterError("allocation_failed");
    }
  }

  async cleanup(lease: ProviderCandidateFixtureLease): Promise<ProviderCandidateFixtureCleanupReport> {
    const active = this.activeFixtures.get(lease.fixtureId);
    if (!active || !leaseMatches(active.lease, lease)) {
      throw new SupabaseProviderFixtureAdapterError("cleanup_failed");
    }

    const subjectRefs: [string, string] = [lease.ownerSubjectRef, lease.intruderSubjectRef];
    let cleanupOperationFailed = false;

    let objectPaths: string[] = [];
    try {
      const listed = await this.admin.listStorageObjects({
        bucketId: EVIDENCE_BUCKET_ID,
        prefix: active.storagePrefix,
      });
      if (listed.some((path) => !path.startsWith(active.storagePrefix))) {
        throw new Error("provider returned object outside fixture prefix");
      }
      objectPaths = listed;
    } catch {
      objectPaths = [];
      cleanupOperationFailed = true;
    }

    if (objectPaths.length > 0) {
      try {
        await this.admin.deleteStorageObjects({
          bucketId: EVIDENCE_BUCKET_ID,
          objectPaths,
        });
      } catch {
        cleanupOperationFailed = true;
      }
    }

    try {
      await this.admin.purgeFixtureDatabase({ namespace: lease.namespace, subjectRefs });
    } catch {
      cleanupOperationFailed = true;
    }

    for (const authUserId of active.authUserIds) {
      try {
        await this.admin.deleteAuthUser(authUserId);
      } catch {
        cleanupOperationFailed = true;
      }
    }

    let residue: SupabaseFixtureResidue;
    try {
      residue = await this.admin.inspectFixtureResidue({
        namespace: lease.namespace,
        subjectRefs,
        authUserIds: active.authUserIds,
        bucketId: EVIDENCE_BUCKET_ID,
        storagePrefix: active.storagePrefix,
      });
    } catch {
      throw new SupabaseProviderFixtureAdapterError("cleanup_failed");
    }

    if (cleanupOperationFailed || !validateResidue(residue)) {
      throw new SupabaseProviderFixtureAdapterError("cleanup_failed");
    }

    const report: ProviderCandidateFixtureCleanupReport = {
      scope: lease.scope,
      fixtureId: lease.fixtureId,
      caseResidueAbsent: residue.caseRows === 0,
      storageResidueAbsent: residue.storageObjects === 0,
      registryResidueAbsent: residue.registryRows === 0,
      identityResidueAbsent: residue.identityRows === 0 && residue.authUsers === 0,
    };

    if (
      report.caseResidueAbsent &&
      report.storageResidueAbsent &&
      report.registryResidueAbsent &&
      report.identityResidueAbsent
    ) {
      this.activeFixtures.delete(lease.fixtureId);
    }

    return report;
  }
}

/** V0.23.22 is provider conformance plumbing and can never yield activation evidence. */
export function supabaseProviderFixtureAdapterProducesNoActivationFacts(): Record<string, never> {
  return {};
}
