import type {
  SupabaseFixtureResidue,
  SupabaseProviderFixtureAdminPort,
  SupabaseSyntheticAuthUser,
  SupabaseSyntheticPrincipalRole,
} from "./supabase-provider-fixture-adapter";
import type {
  SupabaseDevProbeRpcClient,
  SupabaseDevProbeRpcResult,
} from "./supabase-dev-probe-support-plane";

export const SUPABASE_DEV_PROBE_AWARE_FIXTURE_ADMIN_VERSION =
  "V0.23.26-PROBE-AWARE-FIXTURE-ADMIN-V1" as const;

const DEV_PROJECT_LABEL = "vivienda-dev" as const;
const TOKEN = /^[A-Za-z0-9_-]{8,40}$/;

export class SupabaseDevProbeAwareFixtureAdminError extends Error {
  readonly code = "probe_support_residue_unverified" as const;

  constructor() {
    super("Supabase DEV probe-aware fixture cleanup failed.");
    this.name = "SupabaseDevProbeAwareFixtureAdminError";
  }
}

function tokenFromNamespace(namespace: string): string | null {
  const prefix = "vivienda_dev_";
  if (!namespace.startsWith(prefix)) return null;
  const token = namespace.slice(prefix.length);
  return TOKEN.test(token) ? token : null;
}

function parseSupportRows(result: SupabaseDevProbeRpcResult<unknown>): number {
  if (result.error) throw new SupabaseDevProbeAwareFixtureAdminError();
  if (typeof result.data !== "number" || !Number.isSafeInteger(result.data) || result.data < 0) {
    throw new SupabaseDevProbeAwareFixtureAdminError();
  }
  return result.data;
}

function safeAdd(left: number, right: number): number {
  const sum = left + right;
  if (!Number.isSafeInteger(sum) || sum < 0) throw new SupabaseDevProbeAwareFixtureAdminError();
  return sum;
}

/**
 * Compatibility decorator for the frozen V0.23.22/V0.23.23 fixture contracts.
 *
 * The old cleanup report has no probe-support residue field. Rather than mutate that frozen
 * contract, this decorator folds verified support residue into `caseRows`. Therefore
 * `caseResidueAbsent` can only become true when both canonical Case rows AND V0.23.26 support rows
 * are zero. Missing support RPCs fail closed instead of silently certifying cleanup.
 */
export class SupabaseDevProbeAwareFixtureAdmin implements SupabaseProviderFixtureAdminPort {
  constructor(
    private readonly base: SupabaseProviderFixtureAdminPort,
    private readonly supportClient: SupabaseDevProbeRpcClient,
    configuration: { projectLabel: string },
  ) {
    if (configuration.projectLabel !== DEV_PROJECT_LABEL) {
      throw new SupabaseDevProbeAwareFixtureAdminError();
    }
  }

  createSyntheticAuthUser(input: {
    namespace: string;
    subjectRef: string;
    role: SupabaseSyntheticPrincipalRole;
    email: string;
  }): Promise<SupabaseSyntheticAuthUser> {
    return this.base.createSyntheticAuthUser(input);
  }

  bindSyntheticIdentity(input: {
    authUserId: string;
    subjectRef: string;
    principalKind: "client";
  }): Promise<void> {
    return this.base.bindSyntheticIdentity(input);
  }

  listStorageObjects(input: {
    bucketId: "vivienda-evidence";
    prefix: string;
  }): Promise<string[]> {
    return this.base.listStorageObjects(input);
  }

  deleteStorageObjects(input: {
    bucketId: "vivienda-evidence";
    objectPaths: string[];
  }): Promise<void> {
    return this.base.deleteStorageObjects(input);
  }

  purgeFixtureDatabase(input: {
    namespace: string;
    subjectRefs: [string, string];
  }): Promise<void> {
    if (!tokenFromNamespace(input.namespace)) throw new SupabaseDevProbeAwareFixtureAdminError();
    // V0.23.26 redefines the existing purge RPC so the delegated call removes probe-support rows too.
    return this.base.purgeFixtureDatabase(input);
  }

  deleteAuthUser(authUserId: string): Promise<void> {
    return this.base.deleteAuthUser(authUserId);
  }

  async inspectFixtureResidue(input: {
    namespace: string;
    subjectRefs: [string, string];
    authUserIds: [string, string];
    bucketId: "vivienda-evidence";
    storagePrefix: string;
  }): Promise<SupabaseFixtureResidue> {
    const token = tokenFromNamespace(input.namespace);
    if (!token) throw new SupabaseDevProbeAwareFixtureAdminError();

    const baseResidue = await this.base.inspectFixtureResidue(input);
    let result: SupabaseDevProbeRpcResult<unknown>;
    try {
      result = await this.supportClient.rpc<unknown>("vivienda_dev_probe_support_residue", {
        p_project_label: DEV_PROJECT_LABEL,
        p_namespace: input.namespace,
      });
    } catch {
      throw new SupabaseDevProbeAwareFixtureAdminError();
    }
    const supportRows = parseSupportRows(result);

    return {
      ...baseResidue,
      // Compatibility bridge: lifecycle's existing caseResidueAbsent now also proves supportRows=0.
      caseRows: safeAdd(baseResidue.caseRows, supportRows),
    };
  }
}

export function supabaseDevProbeAwareFixtureAdminProducesNoActivationFacts(): Record<string, never> {
  return {};
}
