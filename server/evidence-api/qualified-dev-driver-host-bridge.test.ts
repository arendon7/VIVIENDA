import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MemoryCasePersistence } from "@/domain/persistence-boundary/memory-adapter";
import type { CasePersistencePort, Clock } from "@/domain/persistence-boundary/contracts";
import type {
  EvidenceObjectRegistryPort,
  EvidenceStorageGateway,
  EvidenceObjectResolution,
  IntentObjectResolution,
  ObjectInspection,
  SignedDownloadProviderGrant,
  SignedUploadProviderGrant,
  UserPrincipal,
} from "@/domain/storage-coordination/coordinator";
import {
  evaluateDevEnvironmentQualification,
  verifiedDevEnvironmentQualificationFacts,
} from "./dev-provisioning-qualification";
import type { ApiAuditLogPort, ApiRateLimitPort } from "./http-boundary";
import { certifyEvidenceRuntimeProviderCandidate } from "./provider-candidate-parity-harness";
import type { ProviderCandidateFixtureLease } from "./provider-candidate-fixture-lifecycle";
import type {
  SupabaseFixtureResidue,
  SupabaseProviderFixtureAdminPort,
  SupabaseSyntheticPrincipalRole,
} from "./supabase-provider-fixture-adapter";
import type {
  SupabaseDevProbeRpcClient,
  SupabaseDevProbeRpcResult,
} from "./supabase-dev-probe-support-plane";
import type { QualifiedDevSignedUploadPort } from "./qualified-dev-provider-composition";
import {
  QUALIFIED_DEV_DRIVER_HOST_BRIDGE_VERSION,
  QualifiedDevDriverHostBridgeError,
  QualifiedDevDriverHostBridgeScope,
  createQualifiedDevDriverHostBridge,
  qualifiedDevDriverHostBridgeProducesNoActivationFacts,
  type QualifiedDevDriverHostSessionAuthorityPort,
} from "./qualified-dev-driver-host-bridge";

const NOW = "2026-09-12T21:35:00.000Z";
const ORIGIN = "https://vivienda-dev.example.test";

function qualifiedDev() {
  return evaluateDevEnvironmentQualification(verifiedDevEnvironmentQualificationFacts());
}

class FixedClock implements Clock {
  now() {
    return NOW;
  }
}

function fixtureLease(token: string, scope: ProviderCandidateFixtureLease["scope"]): ProviderCandidateFixtureLease {
  return {
    contractVersion: "V0.23.21-PROVIDER-FIXTURE-V1",
    scope,
    fixtureId: `fx_${token}`,
    namespace: `vivienda_dev_${token}`,
    ownerSubjectRef: `sub_synthetic_${token}_owner`,
    intruderSubjectRef: `sub_synthetic_${token}_intruder`,
    issuedAt: NOW,
    expiresAt: "2026-09-12T21:55:00.000Z",
    syntheticOnly: true,
    disposable: true,
  };
}

class MemoryRegistry implements EvidenceObjectRegistryPort {
  private readonly objects = new Map<string, { storageLocator: string; objectPath: string }>();
  private readonly namespaces = new Set<string>();

  constructor(private readonly persistence: CasePersistencePort) {}

  registerNamespace(namespace: string) {
    this.namespaces.add(namespace);
  }

  async registerObject(input: { intentId: string; storageLocator: string; objectPath: string }) {
    this.objects.set(input.intentId, {
      storageLocator: input.storageLocator,
      objectPath: input.objectPath,
    });
  }

  async resolveIntentObject(intentId: string): Promise<IntentObjectResolution | null> {
    const object = this.objects.get(intentId);
    const intent = await this.persistence.loadEvidenceIntent(intentId);
    if (!object || !intent) return null;
    return {
      intentId,
      evidenceId: intent.evidenceId,
      caseId: intent.caseId,
      status: intent.status,
      expiresAt: intent.expiresAt,
      storageLocator: object.storageLocator,
      bucketId: "vivienda-evidence",
      objectPath: object.objectPath,
      deletedAt: null,
    };
  }

  async resolveReadableEvidenceObject(
    caseId: string,
    evidenceId: string,
  ): Promise<EvidenceObjectResolution | null> {
    for (const [intentId, object] of this.objects.entries()) {
      const intent = await this.persistence.loadEvidenceIntent(intentId);
      if (
        intent?.caseId === caseId &&
        intent.evidenceId === evidenceId &&
        intent.status === "finalized"
      ) {
        return {
          evidenceId,
          caseId,
          storageLocator: object.storageLocator,
          bucketId: "vivienda-evidence",
          objectPath: object.objectPath,
        };
      }
    }
    return null;
  }

  async expireIntents() {
    return [];
  }

  async listPendingDeletions() {
    return [];
  }

  async markObjectDeleted() {}

  count(namespace: string): number {
    let total = 0;
    for (const intentId of this.objects.keys()) {
      if (intentId.startsWith(`upl_${namespace}_`)) total += 1;
    }
    return total;
  }

  purge(namespace: string): void {
    for (const intentId of [...this.objects.keys()]) {
      if (intentId.startsWith(`upl_${namespace}_`)) this.objects.delete(intentId);
    }
    this.namespaces.delete(namespace);
  }

  total(): number {
    return this.objects.size;
  }
}

class MemoryPhysicalStorage implements EvidenceStorageGateway, QualifiedDevSignedUploadPort {
  private readonly grants = new Map<string, string>();
  private readonly objects = new Map<string, Uint8Array>();
  private counter = 0;

  async createSignedUploadGrant(input: {
    bucketId: "vivienda-evidence";
    objectPath: string;
    upsert: false;
  }): Promise<SignedUploadProviderGrant> {
    const token = `cap_bridge_${String(++this.counter).padStart(6, "0")}`;
    this.grants.set(token, input.objectPath);
    return { token, expiresAt: "2026-09-12T21:45:00.000Z" };
  }

  async uploadSigned(input: Parameters<QualifiedDevSignedUploadPort["uploadSigned"]>[0]) {
    if (this.grants.get(input.signedCapability) !== input.objectPath) {
      return { status: 403 };
    }
    this.objects.set(input.objectPath, input.bytes.slice());
    return { status: 200 };
  }

  async inspectAndHashObject(input: {
    bucketId: "vivienda-evidence";
    objectPath: string;
  }): Promise<ObjectInspection | null> {
    const bytes = this.objects.get(input.objectPath);
    if (!bytes) return null;
    return {
      mimeType: "application/pdf",
      byteSize: bytes.byteLength,
      checksumSha256: "a".repeat(64),
      verifiedAt: NOW,
    };
  }

  async createSignedDownloadGrant(input: {
    bucketId: "vivienda-evidence";
    objectPath: string;
    expiresInSeconds: number;
  }): Promise<SignedDownloadProviderGrant> {
    if (!this.objects.has(input.objectPath)) throw new Error("missing object");
    return {
      url: `https://storage.example.test/download/${this.counter}`,
      expiresAt: "2026-09-12T21:36:00.000Z",
    };
  }

  async deleteObject(input: { bucketId: "vivienda-evidence"; objectPath: string }) {
    return this.objects.delete(input.objectPath) ? ("deleted" as const) : ("not_found" as const);
  }

  list(prefix: string): string[] {
    return [...this.objects.keys()].filter((path) => path.startsWith(prefix));
  }

  remove(paths: string[]): void {
    for (const path of paths) this.objects.delete(path);
  }

  total(): number {
    return this.objects.size;
  }
}

type TelemetryState = {
  fixtureId: string;
  namespace: string;
  scope: ProviderCandidateFixtureLease["scope"];
  uploadGrantCalls: number;
  inspectionCalls: number;
  audits: Array<{ operation: string; status: number; errorCode?: string }>;
  faultActive: boolean;
  faultConsumed: boolean;
  receiptId: string;
};

class MemorySupportRpc implements SupabaseDevProbeRpcClient {
  readonly states = new Map<string, TelemetryState>();

  constructor(private readonly registry: MemoryRegistry) {}

  private state(args: Record<string, unknown>): TelemetryState {
    const namespace = String(args.p_namespace ?? "");
    const fixtureId = String(args.p_fixture_id ?? "");
    const scope = args.p_scope as ProviderCandidateFixtureLease["scope"];
    let state = this.states.get(namespace);
    if (!state) {
      const token = namespace.replace(/^vivienda_dev_/, "");
      state = {
        fixtureId,
        namespace,
        scope,
        uploadGrantCalls: 0,
        inspectionCalls: 0,
        audits: [],
        faultActive: false,
        faultConsumed: false,
        receiptId: `fault_${token}_001`,
      };
      this.states.set(namespace, state);
    }
    return state;
  }

  purge(namespace: string): void {
    this.states.delete(namespace);
  }

  async rpc<T = unknown>(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<SupabaseDevProbeRpcResult<T>> {
    if (functionName === "vivienda_dev_probe_support_residue") {
      const namespace = String(args.p_namespace ?? "");
      return { data: (this.states.has(namespace) ? 1 : 0) as T, error: null };
    }

    const state = this.state(args);
    let data: unknown = null;

    if (functionName === "vivienda_dev_probe_record_storage_touch") {
      if (args.p_kind === "upload_grant") state.uploadGrantCalls += 1;
      if (args.p_kind === "inspection") state.inspectionCalls += 1;
    } else if (functionName === "vivienda_dev_probe_record_audit") {
      const event = {
        operation: String(args.p_operation),
        status: Number(args.p_status),
        ...(typeof args.p_error_code === "string" ? { errorCode: args.p_error_code } : {}),
      };
      state.audits.push(event);
    } else if (functionName === "vivienda_dev_probe_observe") {
      const token = state.namespace.replace(/^vivienda_dev_/, "");
      data = {
        source: "supabase_dev_observability",
        observationId: `obs_${token}_001`,
        fixtureId: state.fixtureId,
        namespace: state.namespace,
        scope: state.scope,
        observedAt: NOW,
        complete: true,
        registryRegistrations: this.registry.count(state.namespace),
        storageUploadGrantCalls: state.uploadGrantCalls,
        storageInspectionCalls: state.inspectionCalls,
        auditOperations: state.audits.map((event) => ({ ...event })),
      };
    } else if (functionName === "vivienda_dev_probe_fault_arm") {
      state.faultActive = true;
      state.faultConsumed = false;
      data = {
        receiptId: state.receiptId,
        fixtureId: state.fixtureId,
        namespace: state.namespace,
        operation: "evidence.prepare",
        mode: "rate_limit_unavailable_once",
        armed: true,
      };
    } else if (functionName === "vivienda_dev_probe_fault_consume") {
      const consume = state.faultActive && !state.faultConsumed;
      if (consume) state.faultConsumed = true;
      data = consume;
    } else if (functionName === "vivienda_dev_probe_fault_disarm") {
      state.faultActive = false;
      data = true;
    }

    return { data: data as T, error: null };
  }
}

class MemoryFixtureAdmin implements SupabaseProviderFixtureAdminPort {
  private userCounter = 0;
  readonly createdNamespaces: string[] = [];
  readonly deletedUsers: string[] = [];

  constructor(
    private readonly storage: MemoryPhysicalStorage,
    private readonly registry: MemoryRegistry,
    private readonly support: MemorySupportRpc,
  ) {}

  async createSyntheticAuthUser(input: {
    namespace: string;
    subjectRef: string;
    role: SupabaseSyntheticPrincipalRole;
    email: string;
  }) {
    this.createdNamespaces.push(input.namespace);
    const tail = String(++this.userCounter).padStart(12, "0");
    return { authUserId: `00000000-0000-4000-8000-${tail}` };
  }

  async bindSyntheticIdentity() {}

  async listStorageObjects(input: { bucketId: "vivienda-evidence"; prefix: string }) {
    return this.storage.list(input.prefix);
  }

  async deleteStorageObjects(input: {
    bucketId: "vivienda-evidence";
    objectPaths: string[];
  }) {
    this.storage.remove(input.objectPaths);
  }

  async purgeFixtureDatabase(input: { namespace: string; subjectRefs: [string, string] }) {
    this.registry.purge(input.namespace);
    this.support.purge(input.namespace);
  }

  async deleteAuthUser(authUserId: string) {
    this.deletedUsers.push(authUserId);
  }

  async inspectFixtureResidue(input: {
    namespace: string;
    subjectRefs: [string, string];
    authUserIds: [string, string];
    bucketId: "vivienda-evidence";
    storagePrefix: string;
  }): Promise<SupabaseFixtureResidue> {
    return {
      caseRows: 0,
      storageObjects: this.storage.list(input.storagePrefix).length,
      registryRows: this.registry.count(input.namespace),
      identityRows: 0,
      authUsers: 0,
    };
  }
}

class MemorySessionAuthority implements QualifiedDevDriverHostSessionAuthorityPort {
  readonly channel = "candidate_session_authority" as const;
  readonly projectLabel = "vivienda-dev" as const;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly publicFixtureSelectorsAccepted = false as const;

  private counter = 0;
  private readonly sessions = new Map<
    string,
    { fixtureId: string; subjectRef: string }
  >();
  readonly issues: Array<{ fixtureId: string; actor: string }> = [];
  readonly resolutions: Array<{ fixtureId: string; authenticated: boolean }> = [];

  async issueSession(input: {
    lease: ProviderCandidateFixtureLease;
    actor: "owner" | "intruder";
    expectedSubjectRef: string;
  }) {
    const token = `session_bridge_${String(++this.counter).padStart(6, "0")}`;
    this.sessions.set(token, {
      fixtureId: input.lease.fixtureId,
      subjectRef: input.expectedSubjectRef,
    });
    this.issues.push({ fixtureId: input.lease.fixtureId, actor: input.actor });
    return {
      subjectRef: input.expectedSubjectRef,
      accessToken: token,
      expiresAt: "2026-09-12T21:50:00.000Z",
    };
  }

  async resolvePrincipal(input: {
    request: Request;
    lease: ProviderCandidateFixtureLease;
  }): Promise<UserPrincipal | null> {
    const authorization = input.request.headers.get("authorization");
    this.resolutions.push({
      fixtureId: input.lease.fixtureId,
      authenticated: authorization !== null,
    });
    if (!authorization?.startsWith("Bearer ")) return null;
    const session = this.sessions.get(authorization.slice("Bearer ".length));
    if (!session || session.fixtureId !== input.lease.fixtureId) return null;
    return { kind: "client", subjectRef: session.subjectRef };
  }
}

class NoopAudit implements ApiAuditLogPort {
  record() {}
}

class AllowRateLimit implements ApiRateLimitPort {
  async consume() {
    return { kind: "allowed" as const };
  }
}

function sequentialTokenSource(prefix: string) {
  let counter = 0;
  return () => `${prefix}${String(++counter).padStart(4, "0")}`;
}

function createWorld() {
  const persistence = new MemoryCasePersistence();
  const registry = new MemoryRegistry(persistence);
  const physical = new MemoryPhysicalStorage();
  const support = new MemorySupportRpc(registry);
  const fixtureAdmin = new MemoryFixtureAdmin(physical, registry, support);
  const sessionAuthority = new MemorySessionAuthority();

  const bridge = createQualifiedDevDriverHostBridge({
    provider: {
      qualification: qualifiedDev(),
      configuration: {
        projectLabel: "vivienda-dev",
        evidenceApiOrigin: ORIGIN,
      },
      fixtureAdmin,
      casePersistence: persistence,
      supportRpcClient: support,
      signedUploads: physical,
      fixture: {
        now: () => NOW,
        tokenSource: sequentialTokenSource("bridgefx"),
        ttlMs: 20 * 60 * 1000,
      },
    },
    server: {
      storageGateway: physical,
      auditLog: new NoopAudit(),
      rateLimit: new AllowRateLimit(),
      registry,
      clock: new FixedClock(),
    },
    sessionAuthority,
    tokenSource: sequentialTokenSource("hostid"),
  });

  return {
    bridge,
    persistence,
    registry,
    physical,
    support,
    fixtureAdmin,
    sessionAuthority,
  };
}

describe("Qualified DEV Driver↔Host Bridge V0.23.29", () => {
  it("certifies all six canonical probes through driver → bridge → host with exact parity", async () => {
    const world = createWorld();

    const certification = await certifyEvidenceRuntimeProviderCandidate(world.bridge.probe);

    expect(certification.probeOrder).toEqual([
      "happy_path",
      "unauthenticated_prepare",
      "missing_data_authorization",
      "cross_case_access",
      "missing_uploaded_object",
      "rate_limit_unavailable",
    ]);
    expect(certification.decision).toMatchObject({
      state: "conformant",
      conformsToBaseline: true,
      totalChecks: 37,
      passedChecks: 37,
      deviations: [],
      runtimeActivationAuthorized: false,
      activationDecisionEvaluated: false,
    });
    expect(certification.runtimeActivationAuthorized).toBe(false);
    expect(certification.activationFactsProduced).toBe(false);
    expect(certification.deploymentAuthorized).toBe(false);

    expect(certification.observation.happyPath.httpStatuses).toEqual({
      prepare: 200,
      complete: 200,
      download: 200,
    });
    expect(
      certification.observation.failures.find(
        (item) => item.scenario === "unauthenticated_prepare",
      ),
    ).toMatchObject({
      observedErrorCode: "authentication_required",
      httpStatuses: { prepare: 401, complete: null },
    });
    expect(
      certification.observation.failures.find(
        (item) => item.scenario === "rate_limit_unavailable",
      ),
    ).toMatchObject({
      observedErrorCode: "rate_limit_unavailable",
      httpStatuses: { prepare: 503, complete: null },
    });

    expect(world.fixtureAdmin.createdNamespaces).toHaveLength(12);
    expect(world.fixtureAdmin.deletedUsers).toHaveLength(12);
    expect(world.registry.total()).toBe(0);
    expect(world.physical.total()).toBe(0);
    expect(world.support.states.size).toBe(0);
    expect(world.bridge.scope.currentLease()).toBeNull();
    expect(world.sessionAuthority.resolutions.some((item) => !item.authenticated)).toBe(true);
  });

  it("keeps concurrent fixture contexts isolated and permits only exact same-lease nesting", async () => {
    const scope = new QualifiedDevDriverHostBridgeScope();
    const first = fixtureLease("scopeone01", "happy_path");
    const second = fixtureLease("scopetwo02", "cross_case_access");

    const [firstSeen, secondSeen] = await Promise.all([
      scope.run(first, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        const nested = await scope.run(first, async () => scope.currentLease()?.fixtureId);
        return { outer: scope.currentLease()?.fixtureId, nested };
      }),
      scope.run(second, async () => {
        await Promise.resolve();
        return scope.currentLease()?.fixtureId;
      }),
    ]);

    expect(firstSeen).toEqual({ outer: first.fixtureId, nested: first.fixtureId });
    expect(secondSeen).toBe(second.fixtureId);
    expect(scope.currentLease()).toBeNull();

    await expect(
      scope.run(first, async () => scope.run(second, async () => true)),
    ).rejects.toMatchObject({ code: "invalid_invocation" });
    expect(scope.currentLease()).toBeNull();
  });

  it("rejects a noncanonical session authority before any fixture allocation", () => {
    const persistence = new MemoryCasePersistence();
    const registry = new MemoryRegistry(persistence);
    const physical = new MemoryPhysicalStorage();
    const support = new MemorySupportRpc(registry);
    const fixtureAdmin = new MemoryFixtureAdmin(physical, registry, support);
    const invalidAuthority = new MemorySessionAuthority() as QualifiedDevDriverHostSessionAuthorityPort & {
      publicFixtureSelectorsAccepted: boolean;
    };
    Object.defineProperty(invalidAuthority, "publicFixtureSelectorsAccepted", { value: true });

    expect(() =>
      createQualifiedDevDriverHostBridge({
        provider: {
          qualification: qualifiedDev(),
          configuration: { projectLabel: "vivienda-dev", evidenceApiOrigin: ORIGIN },
          fixtureAdmin,
          casePersistence: persistence,
          supportRpcClient: support,
          signedUploads: physical,
        },
        server: {
          storageGateway: physical,
          auditLog: new NoopAudit(),
          rateLimit: new AllowRateLimit(),
          registry,
          clock: new FixedClock(),
        },
        sessionAuthority: invalidAuthority,
      }),
    ).toThrowError(QualifiedDevDriverHostBridgeError);
    expect(fixtureAdmin.createdNamespaces).toEqual([]);
  });

  it("exposes no activation facts and does not depend on the public runtime", () => {
    const world = createWorld();
    expect(world.bridge).toMatchObject({
      version: QUALIFIED_DEV_DRIVER_HOST_BRIDGE_VERSION,
      provider: "supabase",
      projectLabel: "vivienda-dev",
      syntheticOnly: true,
      externalIoOccurred: true,
      liveRuntimeAuthorized: false,
      runtimeServerWasUsed: false,
    });
    expect(qualifiedDevDriverHostBridgeProducesNoActivationFacts()).toEqual({});

    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/qualified-dev-driver-host-bridge.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from\s+["']\.\/runtime\.server["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activated-runtime["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activation-preflight["']/);
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("@supabase/supabase-js");
  });
});
