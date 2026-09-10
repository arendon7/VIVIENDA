import { EVIDENCE_BUCKET_ID } from "@/domain/storage-coordination/coordinator";
import type {
  SupabaseFixtureResidue,
  SupabaseProviderFixtureAdminPort,
  SupabaseSyntheticPrincipalRole,
} from "./supabase-provider-fixture-adapter";

export const SUPABASE_DEV_FIXTURE_ADMIN_CONTROL_PLANE_VERSION =
  "V0.23.23-SUPABASE-DEV-ADMIN-V1" as const;

const DEV_PROJECT_LABEL = "vivienda-dev" as const;
const STORAGE_LIST_LIMIT = 100;
const STORAGE_LIST_MAX_PAGES = 100;
const STORAGE_REMOVE_BATCH_SIZE = 100;
const AUTH_USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{8,40}$/;
const CANONICAL_OBJECT_PATH =
  /^quarantine\/(upl_vivienda_dev_[A-Za-z0-9_-]{8,40}_[A-Za-z0-9_-]{3,})\/(evd_[A-Za-z0-9_-]{3,})\/(obj_[A-Za-z0-9_-]{6,})$/;

export type SupabaseDevClientError = {
  code?: string;
  status?: number;
  message?: string;
};

export type SupabaseDevClientResult<T> = {
  data: T;
  error: SupabaseDevClientError | null;
};

export type SupabaseDevAuthUser = {
  id: string;
};

export interface SupabaseDevAuthAdminClient {
  createUser(attributes: {
    email: string;
    email_confirm: true;
  }): Promise<SupabaseDevClientResult<{ user: SupabaseDevAuthUser | null }>>;

  deleteUser(userId: string): Promise<SupabaseDevClientResult<unknown>>;

  getUserById(userId: string): Promise<SupabaseDevClientResult<{ user: SupabaseDevAuthUser | null }>>;
}

export type SupabaseDevStorageEntry = {
  name: string;
  id: string | null;
};

export interface SupabaseDevStorageBucketClient {
  list(
    path: string,
    options: {
      limit: number;
      offset: number;
      sortBy: { column: "name"; order: "asc" };
      search?: string;
    },
  ): Promise<SupabaseDevClientResult<SupabaseDevStorageEntry[] | null>>;

  remove(paths: string[]): Promise<SupabaseDevClientResult<unknown>>;
}

export interface SupabaseDevFixtureClient {
  auth: {
    admin: SupabaseDevAuthAdminClient;
  };
  storage: {
    from(bucketId: string): SupabaseDevStorageBucketClient;
  };
  rpc<T = unknown>(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<SupabaseDevClientResult<T>>;
}

export type SupabaseDevFixtureAdminControlPlaneErrorCode =
  | "invalid_configuration"
  | "invalid_input"
  | "provider_error"
  | "invalid_provider_response"
  | "enumeration_limit_exceeded";

export class SupabaseDevFixtureAdminControlPlaneError extends Error {
  constructor(readonly code: SupabaseDevFixtureAdminControlPlaneErrorCode) {
    super("Supabase DEV fixture admin control plane failed.");
    this.name = "SupabaseDevFixtureAdminControlPlaneError";
  }
}

function fail(code: SupabaseDevFixtureAdminControlPlaneErrorCode): never {
  throw new SupabaseDevFixtureAdminControlPlaneError(code);
}

function requireProviderSuccess<T>(result: SupabaseDevClientResult<T>): T {
  if (result.error) fail("provider_error");
  return result.data;
}

function tokenFromNamespace(namespace: string): string | null {
  const prefix = "vivienda_dev_";
  if (!namespace.startsWith(prefix)) return null;
  const token = namespace.slice(prefix.length);
  return TOKEN.test(token) ? token : null;
}

function expectedSubjectRef(namespace: string, role: SupabaseSyntheticPrincipalRole): string | null {
  const token = tokenFromNamespace(namespace);
  return token ? `sub_synthetic_${token}_${role}` : null;
}

function validateFixtureIdentity(input: {
  namespace: string;
  subjectRef: string;
  role: SupabaseSyntheticPrincipalRole;
  email: string;
}): void {
  const expectedSubject = expectedSubjectRef(input.namespace, input.role);
  const expectedEmail = `fixture+${input.namespace}.${input.role}@vivienda.invalid`;
  if (!expectedSubject || input.subjectRef !== expectedSubject || input.email !== expectedEmail) {
    fail("invalid_input");
  }
}

function validateSubjectPair(namespace: string, subjectRefs: [string, string]): void {
  const owner = expectedSubjectRef(namespace, "owner");
  const intruder = expectedSubjectRef(namespace, "intruder");
  if (!owner || !intruder || subjectRefs[0] !== owner || subjectRefs[1] !== intruder) {
    fail("invalid_input");
  }
}

function storagePrefixParts(prefix: string): { parent: "quarantine"; folderPrefix: string } | null {
  const root = "quarantine/";
  const fixtureRoot = "upl_vivienda_dev_";
  if (!prefix.startsWith(root + fixtureRoot) || !prefix.endsWith("_") || prefix.includes("/", root.length)) {
    return null;
  }

  const folderPrefix = prefix.slice(root.length);
  const token = folderPrefix.slice(fixtureRoot.length, -1);
  if (!TOKEN.test(token)) return null;
  return { parent: "quarantine", folderPrefix };
}

function validSegment(name: string): boolean {
  return name.length > 0 && name !== "." && name !== ".." && !name.includes("/");
}

function parseNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function parseDatabaseResidue(value: unknown): Pick<SupabaseFixtureResidue, "caseRows" | "registryRows" | "identityRows"> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("invalid_provider_response");
  const record = value as Record<string, unknown>;
  const caseRows = parseNonNegativeInteger(record.caseRows);
  const registryRows = parseNonNegativeInteger(record.registryRows);
  const identityRows = parseNonNegativeInteger(record.identityRows);
  if (caseRows === null || registryRows === null || identityRows === null) {
    fail("invalid_provider_response");
  }
  return { caseRows, registryRows, identityRows };
}

/**
 * Concrete V0.23.22 AdminPort implementation over the public shape of a server-side Supabase client.
 * The client itself is injected so source code never carries a URL or service-role credential.
 */
export class SupabaseDevFixtureAdminControlPlane implements SupabaseProviderFixtureAdminPort {
  constructor(
    private readonly client: SupabaseDevFixtureClient,
    private readonly configuration: { projectLabel: string },
  ) {
    if (configuration.projectLabel !== DEV_PROJECT_LABEL) fail("invalid_configuration");
  }

  async createSyntheticAuthUser(input: {
    namespace: string;
    subjectRef: string;
    role: SupabaseSyntheticPrincipalRole;
    email: string;
  }): Promise<{ authUserId: string }> {
    validateFixtureIdentity(input);

    const data = requireProviderSuccess(
      await this.client.auth.admin.createUser({
        email: input.email,
        email_confirm: true,
      }),
    );

    if (!data.user || !AUTH_USER_ID.test(data.user.id)) fail("invalid_provider_response");
    return { authUserId: data.user.id };
  }

  async bindSyntheticIdentity(input: {
    authUserId: string;
    subjectRef: string;
    principalKind: "client";
  }): Promise<void> {
    if (!AUTH_USER_ID.test(input.authUserId) || !/^sub_synthetic_[A-Za-z0-9_-]{8,}_/.test(input.subjectRef)) {
      fail("invalid_input");
    }

    requireProviderSuccess(
      await this.client.rpc("vivienda_persist_upsert_identity", {
        p_auth_user_id: input.authUserId,
        p_subject_ref: input.subjectRef,
        p_principal_kind: input.principalKind,
      }),
    );
  }

  private async listAllEntries(
    bucket: SupabaseDevStorageBucketClient,
    path: string,
    search?: string,
  ): Promise<SupabaseDevStorageEntry[]> {
    const entries: SupabaseDevStorageEntry[] = [];

    for (let page = 0; page < STORAGE_LIST_MAX_PAGES; page += 1) {
      const data = requireProviderSuccess(
        await bucket.list(path, {
          limit: STORAGE_LIST_LIMIT,
          offset: page * STORAGE_LIST_LIMIT,
          sortBy: { column: "name", order: "asc" },
          ...(search ? { search } : {}),
        }),
      );

      if (!Array.isArray(data)) fail("invalid_provider_response");
      for (const entry of data) {
        if (!entry || typeof entry.name !== "string" || !validSegment(entry.name)) {
          fail("invalid_provider_response");
        }
        if (entry.id !== null && typeof entry.id !== "string") fail("invalid_provider_response");
      }

      entries.push(...data);
      if (data.length < STORAGE_LIST_LIMIT) return entries;
    }

    fail("enumeration_limit_exceeded");
  }

  private async walkEvidenceFolder(
    bucket: SupabaseDevStorageBucketClient,
    folderPath: string,
    remainingFolderDepth: number,
    output: Set<string>,
  ): Promise<void> {
    const entries = await this.listAllEntries(bucket, folderPath);
    for (const entry of entries) {
      const childPath = `${folderPath}/${entry.name}`;
      if (entry.id === null) {
        if (remainingFolderDepth <= 0) fail("invalid_provider_response");
        await this.walkEvidenceFolder(bucket, childPath, remainingFolderDepth - 1, output);
        continue;
      }

      if (!CANONICAL_OBJECT_PATH.test(childPath) || output.has(childPath)) {
        fail("invalid_provider_response");
      }
      output.add(childPath);
    }
  }

  async listStorageObjects(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    prefix: string;
  }): Promise<string[]> {
    if (input.bucketId !== EVIDENCE_BUCKET_ID) fail("invalid_input");
    const parts = storagePrefixParts(input.prefix);
    if (!parts) fail("invalid_input");

    const bucket = this.client.storage.from(EVIDENCE_BUCKET_ID);
    const roots = await this.listAllEntries(bucket, parts.parent, parts.folderPrefix);
    const output = new Set<string>();

    for (const entry of roots) {
      if (!entry.name.startsWith(parts.folderPrefix)) continue;
      if (entry.id !== null) fail("invalid_provider_response");
      await this.walkEvidenceFolder(bucket, `${parts.parent}/${entry.name}`, 1, output);
    }

    return [...output].sort();
  }

  async deleteStorageObjects(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPaths: string[];
  }): Promise<void> {
    if (input.bucketId !== EVIDENCE_BUCKET_ID || input.objectPaths.length === 0) fail("invalid_input");
    const unique = new Set(input.objectPaths);
    if (unique.size !== input.objectPaths.length || input.objectPaths.some((path) => !CANONICAL_OBJECT_PATH.test(path))) {
      fail("invalid_input");
    }

    const bucket = this.client.storage.from(EVIDENCE_BUCKET_ID);
    for (let offset = 0; offset < input.objectPaths.length; offset += STORAGE_REMOVE_BATCH_SIZE) {
      const batch = input.objectPaths.slice(offset, offset + STORAGE_REMOVE_BATCH_SIZE);
      requireProviderSuccess(await bucket.remove(batch));
    }
  }

  async purgeFixtureDatabase(input: {
    namespace: string;
    subjectRefs: [string, string];
  }): Promise<void> {
    validateSubjectPair(input.namespace, input.subjectRefs);
    requireProviderSuccess(
      await this.client.rpc("vivienda_dev_fixture_purge", {
        p_project_label: DEV_PROJECT_LABEL,
        p_namespace: input.namespace,
        p_subject_refs: input.subjectRefs,
      }),
    );
  }

  async deleteAuthUser(authUserId: string): Promise<void> {
    if (!AUTH_USER_ID.test(authUserId)) fail("invalid_input");
    const result = await this.client.auth.admin.deleteUser(authUserId);
    if (result.error && result.error.code !== "user_not_found") fail("provider_error");
  }

  private async authUserExists(authUserId: string): Promise<boolean> {
    if (!AUTH_USER_ID.test(authUserId)) fail("invalid_input");
    const result = await this.client.auth.admin.getUserById(authUserId);
    if (result.error) {
      if (result.error.code === "user_not_found") return false;
      fail("provider_error");
    }
    if (!result.data.user) return false;
    if (result.data.user.id !== authUserId || !AUTH_USER_ID.test(result.data.user.id)) {
      fail("invalid_provider_response");
    }
    return true;
  }

  async inspectFixtureResidue(input: {
    namespace: string;
    subjectRefs: [string, string];
    authUserIds: [string, string];
    bucketId: typeof EVIDENCE_BUCKET_ID;
    storagePrefix: string;
  }): Promise<SupabaseFixtureResidue> {
    validateSubjectPair(input.namespace, input.subjectRefs);
    if (
      input.bucketId !== EVIDENCE_BUCKET_ID ||
      input.authUserIds[0] === input.authUserIds[1] ||
      input.authUserIds.some((id) => !AUTH_USER_ID.test(id))
    ) {
      fail("invalid_input");
    }

    const prefix = storagePrefixParts(input.storagePrefix);
    if (!prefix || input.storagePrefix !== `quarantine/upl_${input.namespace}_`) fail("invalid_input");

    const databaseData = requireProviderSuccess(
      await this.client.rpc<unknown>("vivienda_dev_fixture_residue", {
        p_project_label: DEV_PROJECT_LABEL,
        p_namespace: input.namespace,
        p_subject_refs: input.subjectRefs,
      }),
    );
    const database = parseDatabaseResidue(databaseData);

    const storageObjects = (await this.listStorageObjects({
      bucketId: EVIDENCE_BUCKET_ID,
      prefix: input.storagePrefix,
    })).length;

    let authUsers = 0;
    for (const authUserId of input.authUserIds) {
      if (await this.authUserExists(authUserId)) authUsers += 1;
    }

    return {
      ...database,
      storageObjects,
      authUsers,
    };
  }
}

export function supabaseDevFixtureAdminControlPlaneProducesNoActivationFacts(): Record<string, never> {
  return {};
}
