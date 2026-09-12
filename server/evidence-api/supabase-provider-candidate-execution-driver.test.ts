import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PROVIDER_CANDIDATE_FIXTURE_CONTRACT_VERSION,
  type ProviderCandidateFixtureLease,
} from "./provider-candidate-fixture-lifecycle";
import {
  SUPABASE_PROVIDER_CANDIDATE_EXECUTION_DRIVER_VERSION,
  SupabaseProviderCandidateExecutionDriver,
  SupabaseProviderCandidateExecutionDriverError,
  supabaseProviderCandidateExecutionDriverProducesNoActivationFacts,
  type SupabaseProviderCandidateAuthSession,
  type SupabaseProviderCandidateAuthTransport,
  type SupabaseProviderCandidateFaultReceipt,
  type SupabaseProviderCandidateHttpRequest,
  type SupabaseProviderCandidateHttpResponse,
  type SupabaseProviderCandidateHttpTransport,
  type SupabaseProviderCandidateObservabilityTransport,
  type SupabaseProviderCandidateParityFaultTransport,
  type SupabaseProviderCandidateSeedSpec,
  type SupabaseProviderCandidateStateTransport,
  type SupabaseProviderCandidateStorageTransport,
  type SupabaseProviderCandidateTelemetryEnvelope,
} from "./supabase-provider-candidate-execution-driver";
import type {
  SupabaseProviderProbeCaseSnapshot,
  SupabaseProviderProbeIntentSnapshot,
} from "./supabase-provider-candidate-probe-adapter";

const ORIGIN = "https://provider-candidate.vivienda.invalid";
const CASE_ID = "case_vivienda_dev_driver001_case001";
const INTENT_ID = "upl_vivienda_dev_driver001_intent001";
const EVIDENCE_ID = "evd_vivienda_dev_driver001_evidence001";
const OBJECT_PATH = `quarantine/${INTENT_ID}/${EVIDENCE_ID}/obj_vivienda_dev_driver001_object001`;
const CAPABILITY = "signed_capability_driver001";

function lease(scope: ProviderCandidateFixtureLease["scope"] = "happy_path"): ProviderCandidateFixtureLease {
  return {
    contractVersion: PROVIDER_CANDIDATE_FIXTURE_CONTRACT_VERSION,
    scope,
    fixtureId: "fx_driver001",
    namespace: "vivienda_dev_driver001",
    ownerSubjectRef: "sub_synthetic_driver001_owner",
    intruderSubjectRef: "sub_synthetic_driver001_intruder",
    issuedAt: "2026-09-12T17:00:00.000Z",
    expiresAt: "2026-09-12T17:20:00.000Z",
    syntheticOnly: true,
    disposable: true,
  };
}

const preparedBody = {
  data: {
    intentId: INTENT_ID,
    evidenceId: EVIDENCE_ID,
    intentExpiresAt: "2026-09-12T17:10:00.000Z",
    providerGrantExpiresAt: "2026-09-12T17:05:00.000Z",
    upload: {
      bucketId: "vivienda-evidence",
      objectPath: OBJECT_PATH,
      token: CAPABILITY,
      upsert: false,
    },
  },
};

class FakeAuth implements SupabaseProviderCandidateAuthTransport {
  readonly channel = "supabase_auth" as const;
  readonly projectLabel = "vivienda-dev" as const;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly calls: Array<{ actor: "owner" | "intruder"; fixtureId: string }> = [];
  subjectOverride: string | null = null;

  async issueAccessToken(input: {
    lease: ProviderCandidateFixtureLease;
    actor: "owner" | "intruder";
  }): Promise<SupabaseProviderCandidateAuthSession> {
    this.calls.push({ actor: input.actor, fixtureId: input.lease.fixtureId });
    const subjectRef =
      this.subjectOverride ??
      (input.actor === "owner" ? input.lease.ownerSubjectRef : input.lease.intruderSubjectRef);
    return {
      subjectRef,
      accessToken: `jwt_${input.actor}_${input.lease.fixtureId}`,
      expiresAt: "2026-09-12T18:00:00.000Z",
    };
  }
}

class FakeHttp implements SupabaseProviderCandidateHttpTransport {
  readonly channel = "evidence_api" as const;
  readonly projectLabel = "vivienda-dev" as const;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly requests: SupabaseProviderCandidateHttpRequest[] = [];
  throwOnSend = false;
  handler: (request: SupabaseProviderCandidateHttpRequest) => SupabaseProviderCandidateHttpResponse =
    (request) => {
      if (request.url.endsWith("/evidence/uploads")) {
        return { status: 200, body: preparedBody };
      }
      if (request.url.endsWith("/complete")) {
        return { status: 200, body: { data: { kind: "attached" } } };
      }
      if (request.url.endsWith("/download")) {
        return {
          status: 200,
          body: { data: { evidenceId: EVIDENCE_ID, url: "https://download.invalid/opaque", expiresAt: "2026-09-12T17:01:00.000Z" } },
        };
      }
      return { status: 404, body: { error: { code: "not_found" } } };
    };

  async send(request: SupabaseProviderCandidateHttpRequest): Promise<SupabaseProviderCandidateHttpResponse> {
    this.requests.push({
      ...request,
      headers: { ...request.headers },
    });
    if (this.throwOnSend) throw new Error("provider secret detail must not escape");
    return this.handler(request);
  }
}

class FakeStorage implements SupabaseProviderCandidateStorageTransport {
  readonly channel = "supabase_storage" as const;
  readonly projectLabel = "vivienda-dev" as const;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly uploads: Array<Parameters<SupabaseProviderCandidateStorageTransport["uploadSigned"]>[0]> = [];
  status = 200;

  async uploadSigned(input: Parameters<SupabaseProviderCandidateStorageTransport["uploadSigned"]>[0]) {
    this.uploads.push({ ...input, bytes: new Uint8Array(input.bytes) });
    return { status: this.status };
  }
}

class FakeState implements SupabaseProviderCandidateStateTransport {
  readonly channel = "supabase_state" as const;
  readonly projectLabel = "vivienda-dev" as const;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly seeds: SupabaseProviderCandidateSeedSpec[] = [];
  readonly caseReads: Array<{ caseId: string; ownerSubjectRef: string }> = [];
  readonly intentReads: Array<{ caseId: string; intentId: string }> = [];
  seedVersionOverride: number | null = null;

  async seedCase(input: SupabaseProviderCandidateSeedSpec) {
    this.seeds.push(input);
    return {
      caseId: CASE_ID,
      versionBeforeEvidenceOperation:
        this.seedVersionOverride ?? (input.authorizeData ? 4 : 3),
    };
  }

  async readCase(input: Parameters<SupabaseProviderCandidateStateTransport["readCase"]>[0]): Promise<SupabaseProviderProbeCaseSnapshot> {
    this.caseReads.push({ caseId: input.caseId, ownerSubjectRef: input.ownerSubjectRef });
    return {
      caseId: input.caseId,
      ownerSubjectRef: input.ownerSubjectRef,
      routeCode: "R7_RECLAMACION",
      caseTrack: "assisted",
      version: 5,
      stage: "collecting_evidence",
      eventSequence: [
        "CASE_CREATED",
        "DATA_AUTHORIZATION_RECORDED",
        "SERVICE_AGREEMENT_ACCEPTED",
        "EVIDENCE_REQUESTED",
        "EVIDENCE_ATTACHED",
      ],
      evidence: [
        {
          kind: "statement",
          legalDataCategory: "financial_credit_semiprivate",
          securityTier: "restricted",
          lifecycle: "active",
        },
      ],
      publicReadModel: { caseId: input.caseId, evidenceCount: 1 },
    };
  }

  async readIntent(input: Parameters<SupabaseProviderCandidateStateTransport["readIntent"]>[0]): Promise<SupabaseProviderProbeIntentSnapshot | null> {
    this.intentReads.push({ caseId: input.caseId, intentId: input.intentId });
    return {
      caseId: input.caseId,
      intentId: input.intentId,
      status: "quarantine",
    };
  }
}

class FakeObservability implements SupabaseProviderCandidateObservabilityTransport {
  readonly channel = "supabase_observability" as const;
  readonly projectLabel = "vivienda-dev" as const;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly calls: string[] = [];
  fixtureOverride: string | null = null;

  async readTelemetry(input: { lease: ProviderCandidateFixtureLease }): Promise<SupabaseProviderCandidateTelemetryEnvelope> {
    this.calls.push(input.lease.fixtureId);
    return {
      source: "supabase_dev_observability",
      observationId: `obs_${input.lease.namespace}_001`,
      fixtureId: this.fixtureOverride ?? input.lease.fixtureId,
      namespace: input.lease.namespace,
      scope: input.lease.scope,
      observedAt: "2026-09-12T17:00:30.000Z",
      complete: true,
      registryRegistrations: 1,
      storageUploadGrantCalls: 1,
      storageInspectionCalls: 1,
      auditOperations: [{ operation: "evidence.prepare", status: 200 }],
    };
  }
}

class FakeFaults implements SupabaseProviderCandidateParityFaultTransport {
  readonly channel = "parity_fault_control" as const;
  readonly projectLabel = "vivienda-dev" as const;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly parityOnly = true as const;
  readonly arms: string[] = [];
  readonly disarms: string[] = [];
  throwOnDisarm = false;

  async armRateLimitUnavailable(input: {
    lease: ProviderCandidateFixtureLease;
    operation: "evidence.prepare";
    oneShot: true;
  }): Promise<SupabaseProviderCandidateFaultReceipt> {
    this.arms.push(input.lease.fixtureId);
    return {
      receiptId: `fault_${input.lease.fixtureId}`,
      fixtureId: input.lease.fixtureId,
      namespace: input.lease.namespace,
      operation: input.operation,
      mode: "rate_limit_unavailable_once",
      armed: true,
    };
  }

  async disarm(input: {
    lease: ProviderCandidateFixtureLease;
    receipt: SupabaseProviderCandidateFaultReceipt;
  }): Promise<void> {
    this.disarms.push(input.receipt.receiptId);
    if (this.throwOnDisarm) throw new Error("fault backend detail");
  }
}

function makeDriver() {
  const auth = new FakeAuth();
  const http = new FakeHttp();
  const storage = new FakeStorage();
  const state = new FakeState();
  const observability = new FakeObservability();
  const faults = new FakeFaults();
  const driver = new SupabaseProviderCandidateExecutionDriver(
    { auth, http, storage, state, observability, faults },
    { evidenceApiOrigin: ORIGIN },
  );
  return { driver, auth, http, storage, state, observability, faults };
}

function prepared() {
  return {
    intentId: INTENT_ID,
    evidenceId: EVIDENCE_ID,
    objectPath: OBJECT_PATH,
    uploadCapability: CAPABILITY,
  };
}

describe("SupabaseProviderCandidateExecutionDriver", () => {
  it("exports the V0.23.25 contract version and no activation facts", () => {
    expect(SUPABASE_PROVIDER_CANDIDATE_EXECUTION_DRIVER_VERSION).toBe(
      "V0.23.25-SUPABASE-PROVIDER-EXECUTION-DRIVER-V1",
    );
    expect(supabaseProviderCandidateExecutionDriverProducesNoActivationFacts()).toEqual({});
  });

  it("seeds exactly the canonical R7 fixture contract", async () => {
    const { driver, state } = makeDriver();
    const currentLease = lease();
    await expect(driver.seedCase({ lease: currentLease, authorizeData: true })).resolves.toEqual({
      caseId: CASE_ID,
      versionBeforeEvidenceOperation: 4,
    });
    expect(state.seeds).toHaveLength(1);
    expect(state.seeds[0]).toMatchObject({
      lease: currentLease,
      ownerSubjectRef: currentLease.ownerSubjectRef,
      routeCode: "R7_RECLAMACION",
      caseTrack: "assisted",
      authorizeData: true,
      evidenceRequestCode: "R7_STATEMENT_DIFFERENCE",
    });
  });

  it("rejects a state transport that seeds the wrong canonical version", async () => {
    const { driver, state } = makeDriver();
    state.seedVersionOverride = 99;
    await expect(driver.seedCase({ lease: lease(), authorizeData: true })).rejects.toMatchObject({
      code: "invalid_transport_response",
      message: "Supabase provider candidate execution driver failed.",
    });
  });

  it("prepares through the Evidence API with owner JWT and parses only the signed upload contract", async () => {
    const { driver, auth, http, faults } = makeDriver();
    const result = await driver.prepareEvidence({
      lease: lease(),
      caseId: CASE_ID,
      actor: "owner",
      clientClassification: {
        kind: "statement",
        legalDataCategory: "non_personal",
        securityTier: "open",
      },
      fault: null,
    });
    expect(result).toEqual({ status: 200, body: preparedBody, data: prepared() });
    expect(auth.calls).toEqual([{ actor: "owner", fixtureId: "fx_driver001" }]);
    expect(faults.arms).toEqual([]);
    expect(http.requests).toHaveLength(1);
    expect(http.requests[0]).toMatchObject({
      method: "POST",
      url: `${ORIGIN}/api/v1/cases/${CASE_ID}/evidence/uploads`,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        origin: ORIGIN,
        authorization: "Bearer jwt_owner_fx_driver001",
      },
      body: {
        kind: "statement",
        legalDataCategory: "non_personal",
        securityTier: "open",
      },
    });
  });

  it("keeps unauthenticated_prepare truly anonymous and never asks Auth for a token", async () => {
    const { driver, auth, http } = makeDriver();
    http.handler = () => ({
      status: 401,
      body: { error: { code: "authentication_required", message: "Se requiere autenticación." } },
    });
    const result = await driver.prepareEvidence({
      lease: lease("unauthenticated_prepare"),
      caseId: CASE_ID,
      actor: "anonymous",
      clientClassification: {
        kind: "statement",
        legalDataCategory: "non_personal",
        securityTier: "open",
      },
      fault: null,
    });
    expect(result.status).toBe(401);
    expect(result.data).toBeNull();
    expect(auth.calls).toEqual([]);
    expect(http.requests[0]?.headers.authorization).toBeUndefined();
  });

  it("arms rate-limit-unavailable only through the parity fault control and always disarms it", async () => {
    const { driver, http, faults } = makeDriver();
    http.handler = () => ({
      status: 503,
      body: { error: { code: "rate_limit_unavailable", message: "Temporalmente no disponible." } },
    });
    const result = await driver.prepareEvidence({
      lease: lease("rate_limit_unavailable"),
      caseId: CASE_ID,
      actor: "owner",
      clientClassification: {
        kind: "statement",
        legalDataCategory: "non_personal",
        securityTier: "open",
      },
      fault: "rate_limit_unavailable",
    });
    expect(result.status).toBe(503);
    expect(faults.arms).toEqual(["fx_driver001"]);
    expect(faults.disarms).toEqual(["fault_fx_driver001"]);
    const headers = http.requests[0]?.headers ?? {};
    expect(Object.keys(headers).some((key) => key.toLowerCase().includes("fault"))).toBe(false);
    expect(JSON.stringify(headers).toLowerCase()).not.toContain("rate_limit_unavailable");
  });

  it("disarms a parity fault even when the Evidence API transport throws", async () => {
    const { driver, http, faults } = makeDriver();
    http.throwOnSend = true;
    await expect(
      driver.prepareEvidence({
        lease: lease("rate_limit_unavailable"),
        caseId: CASE_ID,
        actor: "owner",
        clientClassification: {
          kind: "statement",
          legalDataCategory: "non_personal",
          securityTier: "open",
        },
        fault: "rate_limit_unavailable",
      }),
    ).rejects.toMatchObject({
      code: "transport_failure",
      message: "Supabase provider candidate execution driver failed.",
    });
    expect(faults.disarms).toEqual(["fault_fx_driver001"]);
  });

  it("uploads a deterministic 2048-byte synthetic PDF with the signed capability and no upsert", async () => {
    const { driver, storage } = makeDriver();
    await driver.uploadSyntheticPdf({
      lease: lease(),
      prepared: prepared(),
      mimeType: "application/pdf",
      byteSize: 2048,
    });
    expect(storage.uploads).toHaveLength(1);
    const upload = storage.uploads[0]!;
    expect(upload.bucketId).toBe("vivienda-evidence");
    expect(upload.objectPath).toBe(OBJECT_PATH);
    expect(upload.signedCapability).toBe(CAPABILITY);
    expect(upload.contentType).toBe("application/pdf");
    expect(upload.upsert).toBe(false);
    expect(upload.bytes).toHaveLength(2048);
    expect(new TextDecoder().decode(upload.bytes.slice(0, 8))).toContain("%PDF-1.4");
    expect(new TextDecoder().decode(upload.bytes)).toContain("fixture=fx_driver001");
  });

  it("translates complete and download to the canonical Evidence API routes", async () => {
    const { driver, http, auth } = makeDriver();
    await driver.completeEvidence({
      lease: lease(),
      caseId: CASE_ID,
      intentId: INTENT_ID,
      actor: "owner",
      expectedVersion: 4,
      idempotencyKey: "probe.vivienda_dev_driver001.complete.v1",
    });
    await driver.downloadEvidence({
      lease: lease(),
      caseId: CASE_ID,
      evidenceId: EVIDENCE_ID,
      actor: "owner",
      expiresInSeconds: 60,
    });
    expect(http.requests[0]).toMatchObject({
      url: `${ORIGIN}/api/v1/cases/${CASE_ID}/evidence/uploads/${INTENT_ID}/complete`,
      headers: { "idempotency-key": "probe.vivienda_dev_driver001.complete.v1" },
      body: { expectedVersion: 4 },
    });
    expect(http.requests[1]).toMatchObject({
      url: `${ORIGIN}/api/v1/cases/${CASE_ID}/evidence/${EVIDENCE_ID}/download`,
      body: { expiresInSeconds: 60 },
    });
    expect(auth.calls.map((call) => call.actor)).toEqual(["owner", "owner"]);
  });

  it("keeps state and provider-verifiable telemetry bound to the fixture", async () => {
    const { driver, state, observability } = makeDriver();
    const currentLease = lease("missing_uploaded_object");
    const snapshot = await driver.readCase({
      lease: currentLease,
      caseId: CASE_ID,
      actor: "owner",
    });
    const intent = await driver.readIntent({
      lease: currentLease,
      caseId: CASE_ID,
      intentId: INTENT_ID,
    });
    const telemetry = await driver.readTelemetry({ lease: currentLease });
    expect(snapshot.ownerSubjectRef).toBe(currentLease.ownerSubjectRef);
    expect(intent).toEqual({ caseId: CASE_ID, intentId: INTENT_ID, status: "quarantine" });
    expect(state.caseReads).toEqual([{ caseId: CASE_ID, ownerSubjectRef: currentLease.ownerSubjectRef }]);
    expect(state.intentReads).toEqual([{ caseId: CASE_ID, intentId: INTENT_ID }]);
    expect(observability.calls).toEqual([currentLease.fixtureId]);
    expect(telemetry).toEqual({
      fixtureId: currentLease.fixtureId,
      namespace: currentLease.namespace,
      registryRegistrations: 1,
      storageUploadGrantCalls: 1,
      storageInspectionCalls: 1,
      auditOperations: [{ operation: "evidence.prepare", status: 200 }],
    });
  });

  it("rejects foreign Auth or telemetry identity before it can be accepted as provider evidence", async () => {
    const authCase = makeDriver();
    authCase.auth.subjectOverride = "sub_synthetic_foreign_owner";
    await expect(
      authCase.driver.prepareEvidence({
        lease: lease(),
        caseId: CASE_ID,
        actor: "owner",
        clientClassification: {
          kind: "statement",
          legalDataCategory: "non_personal",
          securityTier: "open",
        },
        fault: null,
      }),
    ).rejects.toBeInstanceOf(SupabaseProviderCandidateExecutionDriverError);
    expect(authCase.http.requests).toHaveLength(0);

    const telemetryCase = makeDriver();
    telemetryCase.observability.fixtureOverride = "fx_foreign001";
    await expect(telemetryCase.driver.readTelemetry({ lease: lease() })).rejects.toMatchObject({
      code: "invalid_transport_response",
    });
  });

  it("rejects malformed signed-upload provider data rather than normalizing it", async () => {
    const { driver, http } = makeDriver();
    http.handler = () => ({
      status: 200,
      body: {
        data: {
          ...preparedBody.data,
          upload: { ...preparedBody.data.upload, bucketId: "foreign-bucket", upsert: true },
        },
      },
    });
    await expect(
      driver.prepareEvidence({
        lease: lease(),
        caseId: CASE_ID,
        actor: "owner",
        clientClassification: {
          kind: "statement",
          legalDataCategory: "non_personal",
          securityTier: "open",
        },
        fault: null,
      }),
    ).rejects.toMatchObject({ code: "invalid_transport_response" });
  });

  it("contains no environment credentials, concrete Supabase URL, runtime.server import or activation path", () => {
    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/supabase-provider-candidate-execution-driver.ts"),
      "utf8",
    );
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("runtime.server");
    expect(source).not.toContain("createActivatedEvidenceRuntime");
    expect(source).not.toContain("service_role");
    expect(source).not.toMatch(/https:\/\/[a-z0-9-]+\.supabase\.co/i);
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
