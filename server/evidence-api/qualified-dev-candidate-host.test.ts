import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MemoryCasePersistence } from "@/domain/persistence-boundary/memory-adapter";
import type { CasePersistencePort, Clock } from "@/domain/persistence-boundary/contracts";
import type {
  EvidenceObjectRegistryPort,
  EvidenceStorageGateway,
  IntentObjectResolution,
  EvidenceObjectResolution,
  ObjectInspection,
  SignedDownloadProviderGrant,
  SignedUploadProviderGrant,
} from "@/domain/storage-coordination/coordinator";
import {
  evaluateDevEnvironmentQualification,
  verifiedDevEnvironmentQualificationFacts,
} from "./dev-provisioning-qualification";
import type { ApiAuditLogPort, ApiRateLimitPort, EvidenceApiOperation } from "./http-boundary";
import type { ProviderCandidateFixtureLease } from "./provider-candidate-fixture-lifecycle";
import type {
  SupabaseFixtureResidue,
  SupabaseProviderFixtureAdminPort,
  SupabaseSyntheticPrincipalRole,
} from "./supabase-provider-fixture-adapter";
import {
  SupabaseDevProbeStateTransport,
  type SupabaseDevProbeRpcClient,
  type SupabaseDevProbeRpcResult,
} from "./supabase-dev-probe-support-plane";
import type {
  QualifiedDevAuthSessionPort,
  QualifiedDevEvidenceHttpClientPort,
  QualifiedDevSignedUploadPort,
} from "./qualified-dev-provider-composition";
import {
  QUALIFIED_DEV_CANDIDATE_HOST_VERSION,
  createQualifiedDevCandidateEvidenceApiHost,
  qualifiedDevCandidateHostProducesNoActivationFacts,
  type QualifiedDevCandidateHostInputs,
  type QualifiedDevCandidatePrincipalResolverPort,
  type QualifiedDevCandidateProbeScopePort,
} from "./qualified-dev-candidate-host";

const NOW = "2026-09-12T21:20:00.000Z";
const ORIGIN = "https://vivienda-dev.example.test";
const TOKEN = "hostprobe001";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const INTRUDER_ID = "22222222-2222-4222-8222-222222222222";

function qualifiedDev() {
  return evaluateDevEnvironmentQualification(verifiedDevEnvironmentQualificationFacts());
}

function lease(
  scope: ProviderCandidateFixtureLease["scope"] = "happy_path",
): ProviderCandidateFixtureLease {
  return {
    contractVersion: "V0.23.21-PROVIDER-FIXTURE-V1",
    scope,
    fixtureId: `fx_${TOKEN}`,
    namespace: `vivienda_dev_${TOKEN}`,
    ownerSubjectRef: `sub_synthetic_${TOKEN}_owner`,
    intruderSubjectRef: `sub_synthetic_${TOKEN}_intruder`,
    issuedAt: NOW,
    expiresAt: "2026-09-12T21:40:00.000Z",
    syntheticOnly: true,
    disposable: true,
  };
}

class FixedClock implements Clock {
  now() {
    return NOW;
  }
}

class FakeFixtureAdmin implements SupabaseProviderFixtureAdminPort {
  readonly calls: string[] = [];
  readonly residue: SupabaseFixtureResidue = {
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

  async bindSyntheticIdentity(input: {
    authUserId: string;
    subjectRef: string;
    principalKind: "client";
  }) {
    this.calls.push(`bind:${input.subjectRef}`);
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
    this.calls.push("residue");
    return { ...this.residue };
  }
}

class FakeSupportRpc implements SupabaseDevProbeRpcClient {
  readonly calls: Array<{ functionName: string; args: Record<string, unknown> }> = [];
  consumeFault = false;

  async rpc<T = unknown>(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<SupabaseDevProbeRpcResult<T>> {
    this.calls.push({ functionName, args: { ...args } });
    let data: unknown = null;
    if (functionName === "vivienda_dev_probe_support_residue") data = 0;
    if (functionName === "vivienda_dev_probe_fault_consume") data = this.consumeFault;
    if (functionName === "vivienda_dev_probe_fault_arm") data = "fault_hostprobe001_001";
    if (functionName === "vivienda_dev_probe_fault_disarm") data = true;
    if (functionName === "vivienda_dev_probe_observe") {
      data = {
        source: "supabase_dev_observability",
        observationId: "obs_hostprobe001_001",
        fixtureId: args.p_fixture_id,
        namespace: args.p_namespace,
        scope: args.p_scope,
        observedAt: NOW,
        complete: true,
        registryRegistrations: 1,
        storageUploadGrantCalls: 1,
        storageInspectionCalls: 1,
        auditOperations: [],
      };
    }
    return { data: data as T, error: null };
  }
}

class NeverAuthSessions implements QualifiedDevAuthSessionPort {
  calls = 0;
  async issueSession(input: Parameters<QualifiedDevAuthSessionPort["issueSession"]>[0]) {
    this.calls += 1;
    return {
      subjectRef: input.expectedSubjectRef,
      accessToken: "unused_host_access_token",
      expiresAt: "2026-09-12T21:35:00.000Z",
    };
  }
}

class NeverHttpClient implements QualifiedDevEvidenceHttpClientPort {
  calls = 0;
  async send() {
    this.calls += 1;
    return { status: 500, body: { error: { code: "unexpected" } } };
  }
}

class NeverSignedUpload implements QualifiedDevSignedUploadPort {
  calls = 0;
  async uploadSigned() {
    this.calls += 1;
    return { status: 500 };
  }
}

class MemoryRegistry implements EvidenceObjectRegistryPort {
  private readonly objects = new Map<string, { storageLocator: string; objectPath: string }>();

  constructor(private readonly persistence: CasePersistencePort) {}

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
    for (const [intentId, object] of this.objects) {
      const intent = await this.persistence.loadEvidenceIntent(intentId);
      if (intent?.caseId === caseId && intent.evidenceId === evidenceId && intent.status === "finalized") {
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
}

class FakeStorageGateway implements EvidenceStorageGateway {
  readonly calls: string[] = [];
  objectAvailable = true;

  async createSignedUploadGrant(input: {
    bucketId: "vivienda-evidence";
    objectPath: string;
    upsert: false;
  }): Promise<SignedUploadProviderGrant> {
    this.calls.push(`grant:${input.objectPath}`);
    return {
      token: "signed_upload_hostprobe001",
      expiresAt: "2026-09-12T21:30:00.000Z",
    };
  }

  async inspectAndHashObject(input: {
    bucketId: "vivienda-evidence";
    objectPath: string;
  }): Promise<ObjectInspection | null> {
    this.calls.push(`inspect:${input.objectPath}`);
    if (!this.objectAvailable) return null;
    return {
      mimeType: "application/pdf",
      byteSize: 2048,
      checksumSha256: "a".repeat(64),
      verifiedAt: NOW,
    };
  }

  async createSignedDownloadGrant(input: {
    bucketId: "vivienda-evidence";
    objectPath: string;
    expiresInSeconds: number;
  }): Promise<SignedDownloadProviderGrant> {
    this.calls.push(`download:${input.objectPath}`);
    return {
      url: "https://storage.example.test/signed/download-hostprobe001",
      expiresAt: "2026-09-12T21:21:00.000Z",
    };
  }

  async deleteObject(input: { bucketId: "vivienda-evidence"; objectPath: string }) {
    this.calls.push(`delete:${input.objectPath}`);
    return "deleted" as const;
  }
}

class FakeAudit implements ApiAuditLogPort {
  readonly events: Array<{
    requestId: string;
    operation: EvidenceApiOperation;
    status: number;
    errorCode?: string;
  }> = [];

  async record(event: {
    requestId: string;
    operation: EvidenceApiOperation;
    status: number;
    errorCode?: string;
  }) {
    this.events.push({ ...event });
  }
}

class FakeRateLimit implements ApiRateLimitPort {
  readonly calls: Array<{ operation: EvidenceApiOperation; key: string }> = [];
  async consume(input: { operation: EvidenceApiOperation; key: string }) {
    this.calls.push({ ...input });
    return { kind: "allowed" as const };
  }
}

class MemoryProbeScope implements QualifiedDevCandidateProbeScopePort {
  readonly scopeChannel = "server_probe_scope" as const;
  readonly channel = "server_probe_context" as const;
  readonly projectLabel = "vivienda-dev" as const;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly publicRequestDerived = false as const;
  readonly runCalls: string[] = [];
  private current: ProviderCandidateFixtureLease | null = null;

  async run<T>(leaseValue: ProviderCandidateFixtureLease, task: () => Promise<T>): Promise<T> {
    if (this.current) throw new Error("nested probe scope");
    this.current = leaseValue;
    this.runCalls.push(leaseValue.scope);
    try {
      return await task();
    } finally {
      this.current = null;
    }
  }

  private active() {
    if (!this.current) throw new Error("probe scope unavailable");
    return this.current;
  }

  resolveForStorage() {
    return this.active();
  }

  resolveForAudit() {
    return this.active();
  }

  resolveForRateLimit() {
    return this.active();
  }
}

class HeaderPrincipalResolver implements QualifiedDevCandidatePrincipalResolverPort {
  readonly channel = "candidate_principal_resolver" as const;
  readonly projectLabel = "vivienda-dev" as const;
  readonly syntheticOnly = true as const;
  readonly publicFixtureSelectorsAccepted = false as const;
  readonly calls: string[] = [];

  async resolve(input: { request: Request; lease: ProviderCandidateFixtureLease }) {
    const authorization = input.request.headers.get("authorization") ?? "";
    this.calls.push(authorization || "anonymous");
    if (authorization === "Bearer owner") {
      return { kind: "client" as const, subjectRef: input.lease.ownerSubjectRef };
    }
    if (authorization === "Bearer intruder") {
      return { kind: "client" as const, subjectRef: input.lease.intruderSubjectRef };
    }
    return null;
  }
}

function tokenSource() {
  let counter = 0;
  return () => `hostid${String(++counter).padStart(4, "0")}`;
}

function request(
  path: string,
  body: unknown,
  actor: "owner" | "intruder" | "anonymous" = "owner",
  additionalHeaders: Record<string, string> = {},
) {
  const headers = new Headers({
    accept: "application/json",
    "content-type": "application/json",
    origin: ORIGIN,
    ...additionalHeaders,
  });
  if (actor !== "anonymous") headers.set("authorization", `Bearer ${actor}`);
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function json(response: Response): Promise<any> {
  return response.json();
}

function makeHost() {
  const persistence = new MemoryCasePersistence();
  const fixtureAdmin = new FakeFixtureAdmin();
  const supportRpcClient = new FakeSupportRpc();
  const authSessions = new NeverAuthSessions();
  const httpClient = new NeverHttpClient();
  const signedUploads = new NeverSignedUpload();
  const storageGateway = new FakeStorageGateway();
  const auditLog = new FakeAudit();
  const rateLimit = new FakeRateLimit();
  const probeScope = new MemoryProbeScope();
  const principalResolver = new HeaderPrincipalResolver();
  const registry = new MemoryRegistry(persistence);
  const clock = new FixedClock();

  const input: QualifiedDevCandidateHostInputs = {
    provider: {
      qualification: qualifiedDev(),
      configuration: {
        projectLabel: "vivienda-dev",
        evidenceApiOrigin: ORIGIN,
      },
      fixtureAdmin,
      casePersistence: persistence,
      supportRpcClient,
      authSessions,
      httpClient,
      signedUploads,
      fixture: {
        now: () => NOW,
        tokenSource: () => TOKEN,
        ttlMs: 20 * 60 * 1000,
      },
    },
    server: {
      storageGateway,
      auditLog,
      rateLimit,
      probeScope,
      registry,
      principalResolver,
      clock,
    },
    tokenSource: tokenSource(),
  };

  const host = createQualifiedDevCandidateEvidenceApiHost(input);
  return {
    host,
    input,
    persistence,
    fixtureAdmin,
    supportRpcClient,
    authSessions,
    httpClient,
    signedUploads,
    storageGateway,
    auditLog,
    rateLimit,
    probeScope,
    principalResolver,
  };
}

async function seed(
  persistence: CasePersistencePort,
  currentLease: ProviderCandidateFixtureLease,
  authorizeData = true,
) {
  const state = new SupabaseDevProbeStateTransport(persistence);
  return state.seedCase({
    lease: currentLease,
    ownerSubjectRef: currentLease.ownerSubjectRef,
    routeCode: "R7_RECLAMACION",
    caseTrack: "assisted",
    evidenceRequestCode: "R7_STATEMENT_DIFFERENCE",
    authorizeData,
  });
}

describe("Qualified DEV Candidate Evidence API Host V0.23.28", () => {
  it("constructs only as a synthetic DEV candidate and exposes no activation authority", () => {
    const made = makeHost();
    expect(made.host).toMatchObject({
      version: QUALIFIED_DEV_CANDIDATE_HOST_VERSION,
      provider: "supabase",
      projectLabel: "vivienda-dev",
      syntheticOnly: true,
      externalIoOccurred: true,
      liveRuntimeAuthorized: false,
      runtimeServerWasUsed: false,
    });
    expect(qualifiedDevCandidateHostProducesNoActivationFacts()).toEqual({});
  });

  it("rejects incomplete DEV qualification before any provider/control-plane I/O", () => {
    const made = makeHost();
    made.input.provider.qualification = evaluateDevEnvironmentQualification();

    expect(() => createQualifiedDevCandidateEvidenceApiHost(made.input)).toThrowError(
      expect.objectContaining({ code: "dev_environment_unqualified" }),
    );
    expect(made.fixtureAdmin.calls).toEqual([]);
    expect(made.supportRpcClient.calls).toEqual([]);
    expect(made.authSessions.calls).toBe(0);
    expect(made.httpClient.calls).toBe(0);
    expect(made.signedUploads.calls).toBe(0);
  });

  it("executes prepare → complete → download through canonical domain and server classification", async () => {
    const made = makeHost();
    const currentLease = lease("happy_path");
    const seeded = await seed(made.persistence, currentLease, true);

    const preparedResponse = await made.host.handle(
      request(`/api/v1/cases/${seeded.caseId}/evidence/uploads`, {
        kind: "statement",
        legalDataCategory: "non_personal",
        securityTier: "open",
      }),
      { source: "server_probe_harness", publicRequestDerived: false, lease: currentLease },
    );
    expect(preparedResponse.status).toBe(200);
    const preparedBody = await json(preparedResponse);
    expect(preparedBody.data.intentId).toMatch(/^upl_vivienda_dev_hostprobe001_/);
    expect(preparedBody.data.evidenceId).toMatch(/^evd_vivienda_dev_hostprobe001_/);
    expect(preparedBody.data.upload).toMatchObject({
      bucketId: "vivienda-evidence",
      upsert: false,
    });
    expect(preparedBody.data.upload.objectPath).toContain(
      `quarantine/${preparedBody.data.intentId}/${preparedBody.data.evidenceId}/obj_vivienda_dev_hostprobe001_`,
    );

    const intent = await made.persistence.loadEvidenceIntent(preparedBody.data.intentId);
    expect(intent).toMatchObject({
      kind: "statement",
      legalDataCategory: "financial_credit_semiprivate",
      securityTier: "restricted",
      createdBySubjectRef: currentLease.ownerSubjectRef,
      status: "quarantine",
    });

    const completeResponse = await made.host.handle(
      request(
        `/api/v1/cases/${seeded.caseId}/evidence/uploads/${preparedBody.data.intentId}/complete`,
        { expectedVersion: seeded.versionBeforeEvidenceOperation },
        "owner",
        { "idempotency-key": `probe.${currentLease.namespace}.complete.v1` },
      ),
      { source: "server_probe_harness", publicRequestDerived: false, lease: currentLease },
    );
    expect(completeResponse.status).toBe(200);

    const finalizedIntent = await made.persistence.loadEvidenceIntent(preparedBody.data.intentId);
    expect(finalizedIntent?.status).toBe("finalized");

    const downloadResponse = await made.host.handle(
      request(
        `/api/v1/cases/${seeded.caseId}/evidence/${preparedBody.data.evidenceId}/download`,
        { expiresInSeconds: 60 },
      ),
      { source: "server_probe_harness", publicRequestDerived: false, lease: currentLease },
    );
    expect(downloadResponse.status).toBe(200);
    const downloadBody = await json(downloadResponse);
    expect(downloadBody.data).toMatchObject({
      evidenceId: preparedBody.data.evidenceId,
      url: "https://storage.example.test/signed/download-hostprobe001",
    });

    expect(made.storageGateway.calls.filter((item) => item.startsWith("grant:"))).toHaveLength(1);
    expect(made.storageGateway.calls.filter((item) => item.startsWith("inspect:"))).toHaveLength(1);
    expect(made.storageGateway.calls.filter((item) => item.startsWith("download:"))).toHaveLength(1);
    expect(made.auditLog.events.map((event) => [event.operation, event.status])).toEqual([
      ["evidence.prepare", 200],
      ["evidence.complete", 200],
      ["evidence.download", 200],
    ]);
    expect(made.probeScope.runCalls).toEqual(["happy_path", "happy_path", "happy_path"]);
    expect(made.authSessions.calls).toBe(0);
    expect(made.httpClient.calls).toBe(0);
    expect(made.signedUploads.calls).toBe(0);
  });

  it("keeps unauthenticated prepare inside the server probe scope and returns sanitized 401", async () => {
    const made = makeHost();
    const currentLease = lease("unauthenticated_prepare");
    const seeded = await seed(made.persistence, currentLease, true);

    const response = await made.host.handle(
      request(
        `/api/v1/cases/${seeded.caseId}/evidence/uploads`,
        { kind: "statement", legalDataCategory: "non_personal", securityTier: "open" },
        "anonymous",
      ),
      { source: "server_probe_harness", publicRequestDerived: false, lease: currentLease },
    );

    expect(response.status).toBe(401);
    expect(await json(response)).toEqual({
      error: { code: "authentication_required", message: "Se requiere autenticación." },
    });
    expect(made.storageGateway.calls).toEqual([]);
    expect(made.auditLog.events).toMatchObject([
      { operation: "evidence.prepare", status: 401, errorCode: "authentication_required" },
    ]);
    expect(made.probeScope.runCalls).toEqual(["unauthenticated_prepare"]);
  });

  it("rejects an intruder against an owner Case before issuing a Storage grant", async () => {
    const made = makeHost();
    const currentLease = lease("cross_case_access");
    const seeded = await seed(made.persistence, currentLease, true);

    const response = await made.host.handle(
      request(
        `/api/v1/cases/${seeded.caseId}/evidence/uploads`,
        { kind: "statement", legalDataCategory: "non_personal", securityTier: "open" },
        "intruder",
      ),
      { source: "server_probe_harness", publicRequestDerived: false, lease: currentLease },
    );

    expect(response.status).toBe(403);
    expect(await json(response)).toEqual({
      error: { code: "forbidden", message: "No tienes acceso a este recurso." },
    });
    expect(made.storageGateway.calls).toEqual([]);
    expect(made.auditLog.events).toMatchObject([
      { operation: "evidence.prepare", status: 403, errorCode: "forbidden" },
    ]);
  });

  it("returns data_authorization_required without creating an upload reservation", async () => {
    const made = makeHost();
    const currentLease = lease("missing_data_authorization");
    const seeded = await seed(made.persistence, currentLease, false);

    const response = await made.host.handle(
      request(`/api/v1/cases/${seeded.caseId}/evidence/uploads`, {
        kind: "statement",
        legalDataCategory: "non_personal",
        securityTier: "open",
      }),
      { source: "server_probe_harness", publicRequestDerived: false, lease: currentLease },
    );

    expect(response.status).toBe(409);
    expect(await json(response)).toEqual({
      error: {
        code: "data_authorization_required",
        message: "La operación no puede completarse en el estado actual.",
      },
    });
    expect(made.storageGateway.calls).toEqual([]);
  });

  it("maps a missing uploaded object to sanitized 404 and leaves the intent quarantined", async () => {
    const made = makeHost();
    const currentLease = lease("missing_uploaded_object");
    const seeded = await seed(made.persistence, currentLease, true);

    const preparedResponse = await made.host.handle(
      request(`/api/v1/cases/${seeded.caseId}/evidence/uploads`, {
        kind: "statement",
        legalDataCategory: "non_personal",
        securityTier: "open",
      }),
      { source: "server_probe_harness", publicRequestDerived: false, lease: currentLease },
    );
    const preparedBody = await json(preparedResponse);
    made.storageGateway.objectAvailable = false;

    const response = await made.host.handle(
      request(
        `/api/v1/cases/${seeded.caseId}/evidence/uploads/${preparedBody.data.intentId}/complete`,
        { expectedVersion: seeded.versionBeforeEvidenceOperation },
        "owner",
        { "idempotency-key": `probe.${currentLease.namespace}.complete.v1` },
      ),
      { source: "server_probe_harness", publicRequestDerived: false, lease: currentLease },
    );

    expect(response.status).toBe(404);
    expect(await json(response)).toEqual({
      error: { code: "evidence_not_found", message: "El recurso solicitado no está disponible." },
    });
    expect((await made.persistence.loadEvidenceIntent(preparedBody.data.intentId))?.status).toBe(
      "quarantine",
    );
  });

  it("consumes the one-shot rate-limit fault out-of-band before principal or Storage work", async () => {
    const made = makeHost();
    made.supportRpcClient.consumeFault = true;
    const currentLease = lease("rate_limit_unavailable");
    const seeded = await seed(made.persistence, currentLease, true);

    const response = await made.host.handle(
      request(`/api/v1/cases/${seeded.caseId}/evidence/uploads`, {
        kind: "statement",
        legalDataCategory: "non_personal",
        securityTier: "open",
      }),
      { source: "server_probe_harness", publicRequestDerived: false, lease: currentLease },
    );

    expect(response.status).toBe(503);
    expect(await json(response)).toEqual({
      error: {
        code: "rate_limit_unavailable",
        message: "El servicio está temporalmente no disponible.",
      },
    });
    expect(made.principalResolver.calls).toEqual([]);
    expect(made.storageGateway.calls).toEqual([]);
    expect(
      made.supportRpcClient.calls.some(
        (call) => call.functionName === "vivienda_dev_probe_fault_consume",
      ),
    ).toBe(true);
  });

  it("does not enter the probe scope for foreign origin or unknown routes", async () => {
    const made = makeHost();
    const currentLease = lease();

    const foreign = new Request(
      `https://evil.example/api/v1/cases/case_${currentLease.namespace}_001/evidence/uploads`,
      {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://evil.example" },
        body: JSON.stringify({}),
      },
    );
    const foreignResponse = await made.host.handle(foreign, {
      source: "server_probe_harness",
      publicRequestDerived: false,
      lease: currentLease,
    });
    expect(foreignResponse.status).toBe(404);

    const unknownResponse = await made.host.handle(
      request(`/api/v1/cases/case_${currentLease.namespace}_001/unknown`, {}),
      { source: "server_probe_harness", publicRequestDerived: false, lease: currentLease },
    );
    expect(unknownResponse.status).toBe(404);
    expect(made.probeScope.runCalls).toEqual([]);
    expect(made.principalResolver.calls).toEqual([]);
  });

  it("rejects public-derived or tampered invocation leases before entering the host", async () => {
    const made = makeHost();
    const currentLease = lease();
    const candidateRequest = request(
      `/api/v1/cases/case_${currentLease.namespace}_001/evidence/uploads`,
      {},
    );

    await expect(
      made.host.handle(candidateRequest, {
        source: "server_probe_harness",
        publicRequestDerived: true as false,
        lease: currentLease,
      }),
    ).rejects.toMatchObject({ code: "invalid_invocation" });

    await expect(
      made.host.handle(candidateRequest, {
        source: "server_probe_harness",
        publicRequestDerived: false,
        lease: { ...currentLease, ownerSubjectRef: "sub_synthetic_wrong_owner" },
      }),
    ).rejects.toMatchObject({ code: "invalid_invocation" });

    expect(made.probeScope.runCalls).toEqual([]);
  });

  it("rejects a principal outside the active fixture before persistence or Storage authorization", async () => {
    const made = makeHost();
    const currentLease = lease();
    const seeded = await seed(made.persistence, currentLease, true);
    const badResolver: QualifiedDevCandidatePrincipalResolverPort = {
      channel: "candidate_principal_resolver",
      projectLabel: "vivienda-dev",
      syntheticOnly: true,
      publicFixtureSelectorsAccepted: false,
      async resolve() {
        return { kind: "client", subjectRef: "sub_synthetic_foreign_owner" };
      },
    };
    made.input.server.principalResolver = badResolver;
    const host = createQualifiedDevCandidateEvidenceApiHost(made.input);

    const response = await host.handle(
      request(`/api/v1/cases/${seeded.caseId}/evidence/uploads`, {
        kind: "statement",
        legalDataCategory: "non_personal",
        securityTier: "open",
      }),
      { source: "server_probe_harness", publicRequestDerived: false, lease: currentLease },
    );

    expect(response.status).toBe(403);
    expect(made.storageGateway.calls).toEqual([]);
  });

  it("contains no runtime activation import, env lookup, provider secret or SDK construction", () => {
    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/qualified-dev-candidate-host.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from\s+["']\.\/runtime\.server["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activated-runtime["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activation-preflight["']/);
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("SUPABASE_URL");
    expect(source).not.toContain("SERVICE_ROLE");
    expect(source).not.toContain("createClient(");
    expect(source).not.toContain("@supabase/supabase-js");
  });
});
