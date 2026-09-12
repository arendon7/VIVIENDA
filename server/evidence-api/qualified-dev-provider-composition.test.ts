import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MemoryCasePersistence } from "@/domain/persistence-boundary/memory-adapter";
import type {
  EvidenceStorageGateway,
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
import type {
  SupabaseDevProbeRpcClient,
  SupabaseDevProbeRpcResult,
} from "./supabase-dev-probe-support-plane";
import {
  QUALIFIED_DEV_PROVIDER_COMPOSITION_VERSION,
  QualifiedDevAuthTransport,
  QualifiedDevHttpTransport,
  QualifiedDevProviderCompositionError,
  QualifiedDevStorageTransport,
  createQualifiedDevProviderComposition,
  qualifiedDevProviderCompositionProducesNoActivationFacts,
  type QualifiedDevAuthSessionPort,
  type QualifiedDevEvidenceHttpClientPort,
  type QualifiedDevProbeServerContextPort,
  type QualifiedDevSignedUploadPort,
} from "./qualified-dev-provider-composition";

const NOW = "2026-09-12T20:10:00.000Z";
const ORIGIN = "https://vivienda-dev.example.test";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const INTRUDER_ID = "22222222-2222-4222-8222-222222222222";

function qualifiedDev() {
  return evaluateDevEnvironmentQualification(verifiedDevEnvironmentQualificationFacts());
}

function lease(scope: ProviderCandidateFixtureLease["scope"] = "happy_path"): ProviderCandidateFixtureLease {
  return {
    contractVersion: "V0.23.21-PROVIDER-FIXTURE-V1",
    scope,
    fixtureId: "fx_compose001",
    namespace: "vivienda_dev_compose001",
    ownerSubjectRef: "sub_synthetic_compose001_owner",
    intruderSubjectRef: "sub_synthetic_compose001_intruder",
    issuedAt: NOW,
    expiresAt: "2026-09-12T20:30:00.000Z",
    syntheticOnly: true,
    disposable: true,
  };
}

class FakeFixtureAdmin implements SupabaseProviderFixtureAdminPort {
  readonly calls: string[] = [];
  residue: SupabaseFixtureResidue = {
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
    this.calls.push(`create:${input.role}:${input.namespace}`);
    return { authUserId: input.role === "owner" ? OWNER_ID : INTRUDER_ID };
  }

  async bindSyntheticIdentity(input: {
    authUserId: string;
    subjectRef: string;
    principalKind: "client";
  }) {
    this.calls.push(`bind:${input.subjectRef}`);
  }

  async listStorageObjects(input: { bucketId: "vivienda-evidence"; prefix: string }) {
    this.calls.push(`list:${input.prefix}`);
    return [];
  }

  async deleteStorageObjects(input: { bucketId: "vivienda-evidence"; objectPaths: string[] }) {
    this.calls.push(`delete:${input.objectPaths.length}`);
  }

  async purgeFixtureDatabase(input: { namespace: string; subjectRefs: [string, string] }) {
    this.calls.push(`purge:${input.namespace}`);
  }

  async deleteAuthUser(authUserId: string) {
    this.calls.push(`auth-delete:${authUserId}`);
  }

  async inspectFixtureResidue(input: {
    namespace: string;
    subjectRefs: [string, string];
    authUserIds: [string, string];
    bucketId: "vivienda-evidence";
    storagePrefix: string;
  }) {
    this.calls.push(`residue:${input.namespace}`);
    return { ...this.residue };
  }
}

class FakeSupportRpc implements SupabaseDevProbeRpcClient {
  readonly calls: Array<{ functionName: string; args: Record<string, unknown> }> = [];
  supportRows = 0;
  consumeFault = false;

  async rpc<T = unknown>(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<SupabaseDevProbeRpcResult<T>> {
    this.calls.push({ functionName, args: { ...args } });
    let data: unknown = null;
    if (functionName === "vivienda_dev_probe_support_residue") data = this.supportRows;
    if (functionName === "vivienda_dev_probe_fault_consume") data = this.consumeFault;
    if (functionName === "vivienda_dev_probe_observe") {
      data = {
        source: "supabase_dev_observability",
        observationId: "obs_compose001_001",
        fixtureId: args.p_fixture_id,
        namespace: args.p_namespace,
        scope: args.p_scope,
        observedAt: NOW,
        complete: true,
        registryRegistrations: 0,
        storageUploadGrantCalls: 0,
        storageInspectionCalls: 0,
        auditOperations: [],
      };
    }
    return { data: data as T, error: null };
  }
}

class FakeAuthSessions implements QualifiedDevAuthSessionPort {
  readonly calls: Array<{ actor: string; expectedSubjectRef: string }> = [];

  async issueSession(input: {
    lease: ProviderCandidateFixtureLease;
    actor: "owner" | "intruder";
    expectedSubjectRef: string;
  }) {
    this.calls.push({ actor: input.actor, expectedSubjectRef: input.expectedSubjectRef });
    return {
      subjectRef: input.expectedSubjectRef,
      accessToken: `token_${input.actor}_compose001`,
      expiresAt: "2026-09-12T20:25:00.000Z",
    };
  }
}

class FakeHttpClient implements QualifiedDevEvidenceHttpClientPort {
  readonly requests: unknown[] = [];
  async send(request: Parameters<QualifiedDevEvidenceHttpClientPort["send"]>[0]) {
    this.requests.push(request);
    return { status: 409, body: { error: { code: "data_authorization_required" } } };
  }
}

class FakeSignedUploads implements QualifiedDevSignedUploadPort {
  readonly calls: Array<{ objectPath: string; byteSize: number }> = [];
  async uploadSigned(input: Parameters<QualifiedDevSignedUploadPort["uploadSigned"]>[0]) {
    this.calls.push({ objectPath: input.objectPath, byteSize: input.bytes.byteLength });
    return { status: 200 };
  }
}

class FakeStorageGateway implements EvidenceStorageGateway {
  readonly calls: string[] = [];

  async createSignedUploadGrant(input: {
    bucketId: "vivienda-evidence";
    objectPath: string;
    upsert: false;
  }): Promise<SignedUploadProviderGrant> {
    this.calls.push(`grant:${input.objectPath}`);
    return { token: "signed_upload_compose001", expiresAt: "2026-09-12T20:20:00.000Z" };
  }

  async inspectAndHashObject(input: {
    bucketId: "vivienda-evidence";
    objectPath: string;
  }): Promise<ObjectInspection | null> {
    this.calls.push(`inspect:${input.objectPath}`);
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
    return { url: "https://download.invalid/signed", expiresAt: "2026-09-12T20:11:00.000Z" };
  }

  async deleteObject(input: { bucketId: "vivienda-evidence"; objectPath: string }) {
    this.calls.push(`delete:${input.objectPath}`);
    return "deleted" as const;
  }
}

class FakeAudit implements ApiAuditLogPort {
  readonly events: Array<{ requestId: string; operation: EvidenceApiOperation; status: number; errorCode?: string }> = [];
  async record(event: { requestId: string; operation: EvidenceApiOperation; status: number; errorCode?: string }) {
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

class FakeContext implements QualifiedDevProbeServerContextPort {
  readonly channel = "server_probe_context" as const;
  readonly projectLabel = "vivienda-dev" as const;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly publicRequestDerived = false as const;
  current: ProviderCandidateFixtureLease | null = lease();
  readonly calls: string[] = [];

  resolveForStorage(input: { kind: "upload_grant" | "inspection"; bucketId: "vivienda-evidence"; objectPath: string }) {
    this.calls.push(`storage:${input.kind}:${input.objectPath}`);
    return this.current;
  }

  resolveForAudit(input: { requestId: string; operation: EvidenceApiOperation }) {
    this.calls.push(`audit:${input.operation}:${input.requestId}`);
    return this.current;
  }

  resolveForRateLimit(input: { operation: EvidenceApiOperation; key: string }) {
    this.calls.push(`rate:${input.operation}:${input.key}`);
    return this.current;
  }
}

function makeInputs() {
  const fixtureAdmin = new FakeFixtureAdmin();
  const supportRpcClient = new FakeSupportRpc();
  const authSessions = new FakeAuthSessions();
  const httpClient = new FakeHttpClient();
  const signedUploads = new FakeSignedUploads();
  const storageGateway = new FakeStorageGateway();
  const auditLog = new FakeAudit();
  const rateLimit = new FakeRateLimit();
  const context = new FakeContext();

  return {
    input: {
      qualification: qualifiedDev(),
      configuration: { projectLabel: "vivienda-dev", evidenceApiOrigin: ORIGIN },
      fixtureAdmin,
      casePersistence: new MemoryCasePersistence(),
      supportRpcClient,
      authSessions,
      httpClient,
      signedUploads,
      server: { storageGateway, auditLog, rateLimit, context },
      fixture: {
        now: () => NOW,
        tokenSource: () => "compose001",
        ttlMs: 20 * 60 * 1000,
      },
    },
    fixtureAdmin,
    supportRpcClient,
    authSessions,
    httpClient,
    signedUploads,
    storageGateway,
    auditLog,
    rateLimit,
    context,
  };
}

const OBJECT = "quarantine/upl_vivienda_dev_compose001_intent/evd_compose001/obj_compose001";
const FOREIGN_OBJECT = "quarantine/upl_vivienda_dev_foreign001_intent/evd_foreign001/obj_foreign001";

describe("Qualified DEV Provider Composition V0.23.27", () => {
  it("constructs only on exact 14/14 qualification and exposes no runtime authority", () => {
    const { input } = makeInputs();
    const composition = createQualifiedDevProviderComposition(input);

    expect(composition).toMatchObject({
      version: QUALIFIED_DEV_PROVIDER_COMPOSITION_VERSION,
      provider: "supabase",
      projectLabel: "vivienda-dev",
      syntheticOnly: true,
      externalIoOccurred: true,
      liveRuntimeAuthorized: false,
      runtimeServerWasUsed: false,
    });
    expect(composition.probe).toMatchObject({
      externalIoOccurred: true,
      liveRuntimeAuthorized: false,
      runtimeServerWasUsed: false,
    });
    expect(composition.execution).toMatchObject({
      provider: "supabase",
      projectLabel: "vivienda-dev",
      syntheticOnly: true,
      externalIoOccurred: true,
      liveRuntimeAuthorized: false,
      runtimeServerWasUsed: false,
    });
    expect(qualifiedDevProviderCompositionProducesNoActivationFacts()).toEqual({});
  });

  it("rejects incomplete qualification before touching any injected provider port", () => {
    const made = makeInputs();
    made.input.qualification = evaluateDevEnvironmentQualification();

    expect(() => createQualifiedDevProviderComposition(made.input)).toThrowError(
      QualifiedDevProviderCompositionError,
    );
    expect(made.fixtureAdmin.calls).toEqual([]);
    expect(made.supportRpcClient.calls).toEqual([]);
    expect(made.authSessions.calls).toEqual([]);
    expect(made.httpClient.requests).toEqual([]);
    expect(made.signedUploads.calls).toEqual([]);
  });

  it("rejects non-DEV project label and non-HTTPS Evidence API origin", () => {
    const first = makeInputs();
    first.input.configuration.projectLabel = "production";
    expect(() => createQualifiedDevProviderComposition(first.input)).toThrowError(
      QualifiedDevProviderCompositionError,
    );

    const second = makeInputs();
    second.input.configuration.evidenceApiOrigin = "http://localhost:3000";
    expect(() => createQualifiedDevProviderComposition(second.input)).toThrowError(
      QualifiedDevProviderCompositionError,
    );
  });

  it("rejects any probe context that can be derived from the public request", () => {
    const made = makeInputs();
    made.input.server.context = {
      channel: "server_probe_context",
      projectLabel: "vivienda-dev",
      syntheticOnly: true,
      liveRuntimeAuthorized: false,
      publicRequestDerived: true,
    } as unknown as FakeContext;

    expect(() => createQualifiedDevProviderComposition(made.input)).toThrowError(
      QualifiedDevProviderCompositionError,
    );
    expect(made.fixtureAdmin.calls).toEqual([]);
    expect(made.supportRpcClient.calls).toEqual([]);
  });

  it("auth transport binds owner/intruder sessions to the lease subjectRef", async () => {
    const sessions = new FakeAuthSessions();
    const transport = new QualifiedDevAuthTransport(sessions);
    const current = lease();

    await transport.issueAccessToken({ lease: current, actor: "owner" });
    await transport.issueAccessToken({ lease: current, actor: "intruder" });

    expect(sessions.calls).toEqual([
      { actor: "owner", expectedSubjectRef: current.ownerSubjectRef },
      { actor: "intruder", expectedSubjectRef: current.intruderSubjectRef },
    ]);
  });

  it("HTTP transport permits only exact same-origin Evidence API POST routes", async () => {
    const client = new FakeHttpClient();
    const transport = new QualifiedDevHttpTransport(client, ORIGIN);

    await transport.send({
      method: "POST",
      url: `${ORIGIN}/api/v1/cases/case_vivienda_dev_compose001_001/evidence/uploads`,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        origin: ORIGIN,
      },
      body: { kind: "statement", legalDataCategory: "non_personal", securityTier: "open" },
    });
    expect(client.requests).toHaveLength(1);

    await expect(
      transport.send({
        method: "POST",
        url: "https://evil.example/api/v1/cases/case_vivienda_dev_compose001_001/evidence/uploads",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          origin: ORIGIN,
        },
        body: {},
      }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(client.requests).toHaveLength(1);
  });

  it("signed upload transport accepts only fixture-owned synthetic 2048-byte canonical uploads", async () => {
    const uploads = new FakeSignedUploads();
    const transport = new QualifiedDevStorageTransport(uploads);
    await transport.uploadSigned({
      lease: lease(),
      bucketId: "vivienda-evidence",
      objectPath: OBJECT,
      signedCapability: "signed_capability_compose001",
      contentType: "application/pdf",
      bytes: new Uint8Array(2048),
      upsert: false,
    });
    expect(uploads.calls).toEqual([{ objectPath: OBJECT, byteSize: 2048 }]);

    await expect(
      transport.uploadSigned({
        lease: lease(),
        bucketId: "vivienda-evidence",
        objectPath: FOREIGN_OBJECT,
        signedCapability: "signed_capability_compose001",
        contentType: "application/pdf",
        bytes: new Uint8Array(2048),
        upsert: false,
      }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(uploads.calls).toHaveLength(1);
  });

  it("instruments real Storage grant and inspection calls through support telemetry", async () => {
    const made = makeInputs();
    const composition = createQualifiedDevProviderComposition(made.input);

    await composition.server.storageGateway.createSignedUploadGrant({
      bucketId: "vivienda-evidence",
      objectPath: OBJECT,
      upsert: false,
    });
    await composition.server.storageGateway.inspectAndHashObject({
      bucketId: "vivienda-evidence",
      objectPath: OBJECT,
    });

    expect(made.storageGateway.calls).toEqual([`grant:${OBJECT}`, `inspect:${OBJECT}`]);
    expect(
      made.supportRpcClient.calls
        .filter((call) => call.functionName === "vivienda_dev_probe_record_storage_touch")
        .map((call) => call.args.p_kind),
    ).toEqual(["upload_grant", "inspection"]);
  });

  it("rejects a foreign fixture Storage path before delegate I/O", async () => {
    const made = makeInputs();
    const composition = createQualifiedDevProviderComposition(made.input);

    await expect(
      composition.server.storageGateway.createSignedUploadGrant({
        bucketId: "vivienda-evidence",
        objectPath: FOREIGN_OBJECT,
        upsert: false,
      }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(made.storageGateway.calls).toEqual([]);
    expect(
      made.supportRpcClient.calls.some((call) => call.functionName === "vivienda_dev_probe_record_storage_touch"),
    ).toBe(false);
  });

  it("records support audit only after the real audit delegate succeeds", async () => {
    const made = makeInputs();
    const composition = createQualifiedDevProviderComposition(made.input);

    await composition.server.auditLog.record({
      requestId: "req_compose001",
      operation: "evidence.prepare",
      status: 409,
      errorCode: "data_authorization_required",
    });

    expect(made.auditLog.events).toEqual([
      {
        requestId: "req_compose001",
        operation: "evidence.prepare",
        status: 409,
        errorCode: "data_authorization_required",
      },
    ]);
    expect(made.supportRpcClient.calls).toContainEqual({
      functionName: "vivienda_dev_probe_record_audit",
      args: {
        p_project_label: "vivienda-dev",
        p_fixture_id: "fx_compose001",
        p_namespace: "vivienda_dev_compose001",
        p_scope: "happy_path",
        p_operation: "evidence.prepare",
        p_status: 409,
        p_error_code: "data_authorization_required",
      },
    });
  });

  it("consumes rate_limit_unavailable out-of-band and does not call the real limiter for that one shot", async () => {
    const made = makeInputs();
    made.context.current = lease("rate_limit_unavailable");
    made.supportRpcClient.consumeFault = true;
    const composition = createQualifiedDevProviderComposition(made.input);

    await expect(
      composition.server.rateLimit.consume({ operation: "evidence.prepare", key: "fixture-key" }),
    ).resolves.toEqual({ kind: "unavailable" });
    expect(made.rateLimit.calls).toEqual([]);
    expect(made.supportRpcClient.calls.some((call) => call.functionName === "vivienda_dev_probe_fault_consume")).toBe(true);
  });

  it("delegates normal rate limiting without consuming a fault", async () => {
    const made = makeInputs();
    made.context.current = lease("happy_path");
    const composition = createQualifiedDevProviderComposition(made.input);

    await expect(
      composition.server.rateLimit.consume({ operation: "evidence.prepare", key: "fixture-key" }),
    ).resolves.toEqual({ kind: "allowed" });
    expect(made.rateLimit.calls).toEqual([{ operation: "evidence.prepare", key: "fixture-key" }]);
    expect(made.supportRpcClient.calls.some((call) => call.functionName === "vivienda_dev_probe_fault_consume")).toBe(false);
  });

  it("fixture lifecycle is probe-aware and verifies support residue before reporting clean", async () => {
    const made = makeInputs();
    const composition = createQualifiedDevProviderComposition(made.input);
    const allocated = await composition.fixtureLifecycle.allocate("happy_path");

    await expect(composition.fixtureLifecycle.cleanup(allocated)).resolves.toEqual({
      scope: "happy_path",
      fixtureId: "fx_compose001",
      caseResidueAbsent: true,
      storageResidueAbsent: true,
      registryResidueAbsent: true,
      identityResidueAbsent: true,
    });
    expect(
      made.supportRpcClient.calls.some((call) => call.functionName === "vivienda_dev_probe_support_residue"),
    ).toBe(true);
  });

  it("fails closed when trusted server probe context is unavailable", async () => {
    const made = makeInputs();
    made.context.current = null;
    const composition = createQualifiedDevProviderComposition(made.input);

    await expect(
      composition.server.rateLimit.consume({ operation: "evidence.prepare", key: "fixture-key" }),
    ).rejects.toMatchObject({ code: "context_unavailable" });
    expect(made.rateLimit.calls).toEqual([]);
  });

  it("contains no env, Supabase URL/key, runtime activation import or provider SDK dependency", () => {
    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/qualified-dev-provider-composition.ts"),
      "utf8",
    );
    expect(source).not.toContain("process.env");
    expect(source).not.toMatch(/https:\/\/[a-z0-9-]+\.supabase\.co/i);
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(source).not.toContain("@supabase/supabase-js");
    expect(source).not.toMatch(/from\s+["']\.\/runtime\.server["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activated-runtime["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activation-preflight["']/);
  });
});
