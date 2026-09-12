import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MemoryCasePersistence } from "@/domain/persistence-boundary/memory-adapter";
import {
  PROVIDER_CANDIDATE_FIXTURE_CONTRACT_VERSION,
  type ProviderCandidateFixtureLease,
} from "./provider-candidate-fixture-lifecycle";
import {
  SUPABASE_DEV_PROBE_SUPPORT_PLANE_VERSION,
  SupabaseDevProbeObservabilityTransport,
  SupabaseDevProbeParityFaultTransport,
  SupabaseDevProbeRateLimitFaultConsumer,
  SupabaseDevProbeStateTransport,
  SupabaseDevProbeSupportError,
  SupabaseDevProbeSupportRpc,
  SupabaseDevProbeTelemetryRecorder,
  supabaseDevProbeSupportPlaneProducesNoActivationFacts,
  type SupabaseDevProbeRpcClient,
  type SupabaseDevProbeRpcResult,
} from "./supabase-dev-probe-support-plane";

function lease(
  scope: ProviderCandidateFixtureLease["scope"] = "happy_path",
): ProviderCandidateFixtureLease {
  return {
    contractVersion: PROVIDER_CANDIDATE_FIXTURE_CONTRACT_VERSION,
    scope,
    fixtureId: "fx_support001",
    namespace: "vivienda_dev_support001",
    ownerSubjectRef: "sub_synthetic_support001_owner",
    intruderSubjectRef: "sub_synthetic_support001_intruder",
    issuedAt: "2026-09-12T18:00:00.000Z",
    expiresAt: "2026-09-12T18:20:00.000Z",
    syntheticOnly: true,
    disposable: true,
  };
}

class FakeRpc implements SupabaseDevProbeRpcClient {
  readonly calls: Array<{ functionName: string; args: Record<string, unknown> }> = [];
  readonly results = new Map<string, SupabaseDevProbeRpcResult<unknown>>();

  async rpc<T = unknown>(functionName: string, args: Record<string, unknown>): Promise<SupabaseDevProbeRpcResult<T>> {
    this.calls.push({ functionName, args: { ...args } });
    return (this.results.get(functionName) ?? { data: null, error: null }) as SupabaseDevProbeRpcResult<T>;
  }
}

describe("Supabase DEV Probe Support Plane V0.23.26", () => {
  it("exports the contract version and zero activation facts", () => {
    expect(SUPABASE_DEV_PROBE_SUPPORT_PLANE_VERSION).toBe(
      "V0.23.26-SUPABASE-DEV-PROBE-SUPPORT-V1",
    );
    expect(supabaseDevProbeSupportPlaneProducesNoActivationFacts()).toEqual({});
  });

  it("seeds the canonical R7 Case through CasePersistenceService with authorization", async () => {
    const store = new MemoryCasePersistence();
    const state = new SupabaseDevProbeStateTransport(store);
    const current = lease("happy_path");

    const seed = await state.seedCase({
      lease: current,
      ownerSubjectRef: current.ownerSubjectRef,
      routeCode: "R7_RECLAMACION",
      caseTrack: "assisted",
      authorizeData: true,
      evidenceRequestCode: "R7_STATEMENT_DIFFERENCE",
    });

    expect(seed).toEqual({
      caseId: "case_vivienda_dev_support001_001",
      versionBeforeEvidenceOperation: 4,
    });

    const snapshot = await state.readCase({
      lease: current,
      caseId: seed.caseId,
      ownerSubjectRef: current.ownerSubjectRef,
    });
    expect(snapshot).toMatchObject({
      caseId: seed.caseId,
      ownerSubjectRef: current.ownerSubjectRef,
      routeCode: "R7_RECLAMACION",
      caseTrack: "assisted",
      version: 4,
      stage: "draft",
      eventSequence: [
        "CASE_CREATED",
        "DATA_AUTHORIZATION_RECORDED",
        "SERVICE_AGREEMENT_ACCEPTED",
        "EVIDENCE_REQUESTED",
      ],
      evidence: [],
    });
    expect(JSON.stringify(snapshot.publicReadModel)).not.toContain("storageLocator");
    expect(JSON.stringify(snapshot.publicReadModel)).not.toContain("checksumSha256");
  });

  it("seeds missing_data_authorization at canonical pre-evidence version 3", async () => {
    const state = new SupabaseDevProbeStateTransport(new MemoryCasePersistence());
    const current = lease("missing_data_authorization");
    const seed = await state.seedCase({
      lease: current,
      ownerSubjectRef: current.ownerSubjectRef,
      routeCode: "R7_RECLAMACION",
      caseTrack: "assisted",
      authorizeData: false,
      evidenceRequestCode: "R7_STATEMENT_DIFFERENCE",
    });
    expect(seed.versionBeforeEvidenceOperation).toBe(3);
    const snapshot = await state.readCase({
      lease: current,
      caseId: seed.caseId,
      ownerSubjectRef: current.ownerSubjectRef,
    });
    expect(snapshot.eventSequence).toEqual([
      "CASE_CREATED",
      "SERVICE_AGREEMENT_ACCEPTED",
      "EVIDENCE_REQUESTED",
    ]);
  });

  it("rejects a seed spec that is not the canonical R7 parity fixture", async () => {
    const state = new SupabaseDevProbeStateTransport(new MemoryCasePersistence());
    const current = lease();
    await expect(
      state.seedCase({
        lease: current,
        ownerSubjectRef: current.intruderSubjectRef,
        routeCode: "R7_RECLAMACION",
        caseTrack: "assisted",
        authorizeData: true,
        evidenceRequestCode: "R7_STATEMENT_DIFFERENCE",
      }),
    ).rejects.toBeInstanceOf(SupabaseDevProbeSupportError);
  });

  it("reads a fixture-scoped intent through the canonical persistence port", async () => {
    const store = new MemoryCasePersistence();
    const state = new SupabaseDevProbeStateTransport(store);
    const current = lease();
    const seed = await state.seedCase({
      lease: current,
      ownerSubjectRef: current.ownerSubjectRef,
      routeCode: "R7_RECLAMACION",
      caseTrack: "assisted",
      authorizeData: true,
      evidenceRequestCode: "R7_STATEMENT_DIFFERENCE",
    });
    await store.createEvidenceIntent({
      intentId: "upl_vivienda_dev_support001_001",
      evidenceId: "evd_vivienda_dev_support001_001",
      caseId: seed.caseId,
      createdBySubjectRef: current.ownerSubjectRef,
      kind: "statement",
      legalDataCategory: "financial_credit_semiprivate",
      securityTier: "restricted",
      displayName: "Extracto hipotecario",
      createdAt: current.issuedAt,
      expiresAt: "2026-09-12T18:15:00.000Z",
      status: "quarantine",
    });
    await expect(
      state.readIntent({
        lease: current,
        caseId: seed.caseId,
        intentId: "upl_vivienda_dev_support001_001",
      }),
    ).resolves.toEqual({
      intentId: "upl_vivienda_dev_support001_001",
      caseId: seed.caseId,
      status: "quarantine",
    });
  });

  it("records provider-side storage/audit signals with exact fixture identity", async () => {
    const rpc = new FakeRpc();
    rpc.results.set("vivienda_dev_probe_record_storage_touch", { data: null, error: null });
    rpc.results.set("vivienda_dev_probe_record_audit", { data: null, error: null });
    const support = new SupabaseDevProbeSupportRpc(rpc, { projectLabel: "vivienda-dev" });
    const recorder = new SupabaseDevProbeTelemetryRecorder(support);
    const current = lease("missing_uploaded_object");

    await recorder.recordStorageUploadGrant(current);
    await recorder.recordStorageInspection(current);
    await recorder.recordAudit(current, {
      operation: "evidence.complete",
      status: 404,
      errorCode: "evidence_not_found",
    });

    expect(rpc.calls).toEqual([
      {
        functionName: "vivienda_dev_probe_record_storage_touch",
        args: {
          p_project_label: "vivienda-dev",
          p_fixture_id: current.fixtureId,
          p_namespace: current.namespace,
          p_scope: current.scope,
          p_kind: "upload_grant",
        },
      },
      {
        functionName: "vivienda_dev_probe_record_storage_touch",
        args: {
          p_project_label: "vivienda-dev",
          p_fixture_id: current.fixtureId,
          p_namespace: current.namespace,
          p_scope: current.scope,
          p_kind: "inspection",
        },
      },
      {
        functionName: "vivienda_dev_probe_record_audit",
        args: {
          p_project_label: "vivienda-dev",
          p_fixture_id: current.fixtureId,
          p_namespace: current.namespace,
          p_scope: current.scope,
          p_operation: "evidence.complete",
          p_status: 404,
          p_error_code: "evidence_not_found",
        },
      },
    ]);
  });

  it("accepts only provider-verifiable telemetry bound to fixture, namespace and scope", async () => {
    const rpc = new FakeRpc();
    const current = lease("happy_path");
    rpc.results.set("vivienda_dev_probe_observe", {
      data: {
        source: "supabase_dev_observability",
        observationId: "obs_support001_001",
        fixtureId: current.fixtureId,
        namespace: current.namespace,
        scope: current.scope,
        observedAt: "2026-09-12T18:01:00.000Z",
        complete: true,
        registryRegistrations: 1,
        storageUploadGrantCalls: 1,
        storageInspectionCalls: 1,
        auditOperations: [
          { operation: "evidence.prepare", status: 200 },
          { operation: "evidence.complete", status: 200 },
          { operation: "evidence.download", status: 200 },
        ],
      },
      error: null,
    });
    const support = new SupabaseDevProbeSupportRpc(rpc, { projectLabel: "vivienda-dev" });
    const transport = new SupabaseDevProbeObservabilityTransport(support);
    await expect(transport.readTelemetry({ lease: current })).resolves.toMatchObject({
      source: "supabase_dev_observability",
      fixtureId: current.fixtureId,
      namespace: current.namespace,
      scope: current.scope,
      registryRegistrations: 1,
    });

    rpc.results.set("vivienda_dev_probe_observe", {
      data: {
        source: "supabase_dev_observability",
        observationId: "obs_support001_002",
        fixtureId: "fx_foreign000",
        namespace: current.namespace,
        scope: current.scope,
        observedAt: "2026-09-12T18:01:01.000Z",
        complete: true,
        registryRegistrations: 0,
        storageUploadGrantCalls: 0,
        storageInspectionCalls: 0,
        auditOperations: [],
      },
      error: null,
    });
    await expect(transport.readTelemetry({ lease: current })).rejects.toMatchObject({
      code: "invalid_provider_response",
    });
  });

  it("arms, consumes once and disarms rate-limit fault through DEV-only RPCs", async () => {
    const rpc = new FakeRpc();
    const current = lease("rate_limit_unavailable");
    rpc.results.set("vivienda_dev_probe_fault_arm", {
      data: {
        receiptId: "fault_support001_001",
        fixtureId: current.fixtureId,
        namespace: current.namespace,
        operation: "evidence.prepare",
        mode: "rate_limit_unavailable_once",
        armed: true,
      },
      error: null,
    });
    rpc.results.set("vivienda_dev_probe_fault_consume", { data: true, error: null });
    rpc.results.set("vivienda_dev_probe_fault_disarm", { data: null, error: null });
    const support = new SupabaseDevProbeSupportRpc(rpc, { projectLabel: "vivienda-dev" });
    const faults = new SupabaseDevProbeParityFaultTransport(support);
    const consumer = new SupabaseDevProbeRateLimitFaultConsumer(support);

    const receipt = await faults.armRateLimitUnavailable({
      lease: current,
      operation: "evidence.prepare",
      oneShot: true,
    });
    await expect(consumer.consumePrepareUnavailable(current)).resolves.toBe(true);
    await expect(faults.disarm({ lease: current, receipt })).resolves.toBeUndefined();

    expect(rpc.calls.map((call) => call.functionName)).toEqual([
      "vivienda_dev_probe_fault_arm",
      "vivienda_dev_probe_fault_consume",
      "vivienda_dev_probe_fault_disarm",
    ]);
  });

  it("rejects fault operations outside rate_limit_unavailable before RPC", async () => {
    const rpc = new FakeRpc();
    const support = new SupabaseDevProbeSupportRpc(rpc, { projectLabel: "vivienda-dev" });
    await expect(support.armRateLimitUnavailable(lease("happy_path"))).rejects.toMatchObject({
      code: "invalid_input",
    });
    expect(rpc.calls).toEqual([]);
  });

  it("sanitizes provider errors and refuses wrong project configuration", async () => {
    const rpc = new FakeRpc();
    expect(() => new SupabaseDevProbeSupportRpc(rpc, { projectLabel: "production" })).toThrowError(
      SupabaseDevProbeSupportError,
    );
    rpc.results.set("vivienda_dev_probe_observe", {
      data: null,
      error: { message: "service_role secret diagnostic" },
    });
    const support = new SupabaseDevProbeSupportRpc(rpc, { projectLabel: "vivienda-dev" });
    try {
      await support.observe(lease());
      throw new Error("expected support provider error");
    } catch (error) {
      expect(error).toBeInstanceOf(SupabaseDevProbeSupportError);
      expect(error).toMatchObject({ code: "provider_error" });
      expect(String((error as Error).message)).not.toContain("service_role");
    }
  });

  it("keeps support SQL DEV-only, service-role-only and outside migrations", () => {
    const sqlPath = join(process.cwd(), "supabase/dev-fixtures/V0.23.26_DEV_PROBE_SUPPORT.sql");
    const sql = readFileSync(sqlPath, "utf8");
    expect(sqlPath).not.toContain("supabase/migrations");
    expect(sql).toContain("vivienda_dev_probe_observe");
    expect(sql).toContain("vivienda_dev_probe_fault_consume");
    expect(sql).toContain("vivienda_dev_probe_support_residue");
    expect(sql).toContain("vivienda_dev_fixture_purge");
    expect(sql).toContain("supportRows");
    expect(sql).toContain("to service_role");
    expect(sql).toContain("from public,anon,authenticated");
    expect(sql).not.toContain("as $$;");
  });

  it("contains no credentials, runtime import or activation path", () => {
    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/supabase-dev-probe-support-plane.ts"),
      "utf8",
    );
    expect(source).not.toContain("process.env");
    expect(source).not.toMatch(/from\s+["']\.\/runtime\.server["']/);
    expect(source).not.toContain("createActivatedEvidenceRuntime");
    expect(source).not.toMatch(/https:\/\/[a-z0-9-]+\.supabase\.co/i);
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
