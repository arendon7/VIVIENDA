import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateDevEnvironmentQualification,
  verifiedDevEnvironmentQualificationFacts,
} from "./dev-provisioning-qualification";
import {
  certifyEvidenceRuntimeProviderCandidate,
  ProviderCandidateParityHarnessError,
  type ProviderCandidateParityProbeScope,
} from "./provider-candidate-parity-harness";
import {
  PROVIDER_CANDIDATE_FIXTURE_CONTRACT_VERSION,
  ProviderCandidateFixtureSession,
  type ProviderCandidateFixtureCleanupReport,
  type ProviderCandidateFixtureLease,
  type ProviderCandidateFixtureLifecycle,
} from "./provider-candidate-fixture-lifecycle";
import type { SyntheticEvidenceFailureScenario } from "./synthetic-failure-rehearsal";
import {
  SUPABASE_PROVIDER_CANDIDATE_PROBE_ADAPTER_VERSION,
  SupabaseProviderCandidateProbeAdapter,
  SupabaseProviderCandidateProbeAdapterError,
  supabaseProviderCandidateProbeAdapterProducesNoActivationFacts,
  type SupabaseProviderCandidateProbeExecutionPort,
  type SupabaseProviderPreparedUpload,
  type SupabaseProviderProbeAuditEvent,
  type SupabaseProviderProbeCaseSnapshot,
  type SupabaseProviderProbeFault,
  type SupabaseProviderProbeHttpResult,
  type SupabaseProviderProbeTelemetry,
} from "./supabase-provider-candidate-probe-adapter";

const NOW = "2026-09-10T20:30:00.000Z";
const EXPIRES = "2026-09-10T20:50:00.000Z";

const FAILURE_EXPECTATIONS: Record<
  SyntheticEvidenceFailureScenario,
  {
    status: number;
    code: string;
    version: number;
    events: string[];
    audit: SupabaseProviderProbeAuditEvent[];
  }
> = {
  unauthenticated_prepare: {
    status: 401,
    code: "authentication_required",
    version: 4,
    events: [
      "CASE_CREATED",
      "DATA_AUTHORIZATION_RECORDED",
      "SERVICE_AGREEMENT_ACCEPTED",
      "EVIDENCE_REQUESTED",
    ],
    audit: [{ operation: "evidence.prepare", status: 401, errorCode: "authentication_required" }],
  },
  missing_data_authorization: {
    status: 409,
    code: "data_authorization_required",
    version: 3,
    events: ["CASE_CREATED", "SERVICE_AGREEMENT_ACCEPTED", "EVIDENCE_REQUESTED"],
    audit: [{ operation: "evidence.prepare", status: 409, errorCode: "data_authorization_required" }],
  },
  cross_case_access: {
    status: 403,
    code: "forbidden",
    version: 4,
    events: [
      "CASE_CREATED",
      "DATA_AUTHORIZATION_RECORDED",
      "SERVICE_AGREEMENT_ACCEPTED",
      "EVIDENCE_REQUESTED",
    ],
    audit: [{ operation: "evidence.prepare", status: 403, errorCode: "forbidden" }],
  },
  missing_uploaded_object: {
    status: 404,
    code: "evidence_not_found",
    version: 4,
    events: [
      "CASE_CREATED",
      "DATA_AUTHORIZATION_RECORDED",
      "SERVICE_AGREEMENT_ACCEPTED",
      "EVIDENCE_REQUESTED",
    ],
    audit: [
      { operation: "evidence.prepare", status: 200 },
      { operation: "evidence.complete", status: 404, errorCode: "evidence_not_found" },
    ],
  },
  rate_limit_unavailable: {
    status: 503,
    code: "rate_limit_unavailable",
    version: 4,
    events: [
      "CASE_CREATED",
      "DATA_AUTHORIZATION_RECORDED",
      "SERVICE_AGREEMENT_ACCEPTED",
      "EVIDENCE_REQUESTED",
    ],
    audit: [{ operation: "evidence.prepare", status: 503, errorCode: "rate_limit_unavailable" }],
  },
};

function qualifiedDev() {
  return evaluateDevEnvironmentQualification(verifiedDevEnvironmentQualificationFacts());
}

class RecordingFixtureLifecycle implements ProviderCandidateFixtureLifecycle {
  readonly allocations: ProviderCandidateFixtureLease[] = [];
  readonly cleanups: ProviderCandidateFixtureLease[] = [];
  private counter = 0;

  async allocate(scope: ProviderCandidateParityProbeScope): Promise<ProviderCandidateFixtureLease> {
    this.counter += 1;
    const token = `probe${String(this.counter).padStart(3, "0")}`;
    const lease: ProviderCandidateFixtureLease = {
      contractVersion: PROVIDER_CANDIDATE_FIXTURE_CONTRACT_VERSION,
      scope,
      fixtureId: `fx_${token}`,
      namespace: `vivienda_dev_${token}`,
      ownerSubjectRef: `sub_synthetic_${token}_owner`,
      intruderSubjectRef: `sub_synthetic_${token}_intruder`,
      issuedAt: NOW,
      expiresAt: EXPIRES,
      syntheticOnly: true,
      disposable: true,
    };
    this.allocations.push(lease);
    return lease;
  }

  async cleanup(lease: ProviderCandidateFixtureLease): Promise<ProviderCandidateFixtureCleanupReport> {
    this.cleanups.push(lease);
    return {
      scope: lease.scope,
      fixtureId: lease.fixtureId,
      caseResidueAbsent: true,
      storageResidueAbsent: true,
      registryResidueAbsent: true,
      identityResidueAbsent: true,
    };
  }
}

function preparedFor(lease: ProviderCandidateFixtureLease): SupabaseProviderPreparedUpload {
  const intentId = `upl_${lease.namespace}_intent001`;
  const evidenceId = `evd_${lease.namespace}_evidence001`;
  return {
    intentId,
    evidenceId,
    objectPath: `quarantine/${intentId}/${evidenceId}/obj_${lease.namespace}_object001`,
    uploadCapability: `opaque-upload-capability-${lease.fixtureId}`,
  };
}

class CanonicalExecutionPort implements SupabaseProviderCandidateProbeExecutionPort {
  readonly provider = "supabase" as const;
  readonly projectLabel = "vivienda-dev" as const;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly runtimeServerWasUsed = false as const;
  readonly externalIoOccurred = true;

  readonly events: Array<{
    operation: string;
    scope: ProviderCandidateParityProbeScope;
    actor?: string;
    fault?: SupabaseProviderProbeFault;
  }> = [];

  preparedOverride?: (lease: ProviderCandidateFixtureLease) => SupabaseProviderPreparedUpload;
  caseOverride?: (
    lease: ProviderCandidateFixtureLease,
    snapshot: SupabaseProviderProbeCaseSnapshot,
  ) => SupabaseProviderProbeCaseSnapshot;
  secretFailureScenario: SyntheticEvidenceFailureScenario | null = null;
  throwOnPrepareScope: ProviderCandidateParityProbeScope | null = null;

  async seedCase(input: { lease: ProviderCandidateFixtureLease; authorizeData: boolean }) {
    this.events.push({ operation: "seedCase", scope: input.lease.scope });
    const version = input.authorizeData ? 4 : 3;
    return {
      caseId: `case_${input.lease.namespace}_r7`,
      versionBeforeEvidenceOperation: version,
    };
  }

  async prepareEvidence(input: Parameters<SupabaseProviderCandidateProbeExecutionPort["prepareEvidence"]>[0]) {
    this.events.push({
      operation: "prepareEvidence",
      scope: input.lease.scope,
      actor: input.actor,
      fault: input.fault,
    });
    if (this.throwOnPrepareScope === input.lease.scope) throw new Error("provider diagnostic secret");

    if (input.lease.scope === "happy_path" || input.lease.scope === "missing_uploaded_object") {
      const prepared = this.preparedOverride?.(input.lease) ?? preparedFor(input.lease);
      return {
        status: 200,
        body: { data: { intentId: prepared.intentId, evidenceId: prepared.evidenceId } },
        data: prepared,
      } satisfies SupabaseProviderProbeHttpResult<SupabaseProviderPreparedUpload>;
    }

    const expected = FAILURE_EXPECTATIONS[input.lease.scope];
    const body =
      this.secretFailureScenario === input.lease.scope
        ? { error: { code: expected.code, diagnostic: "service_role=super-secret" } }
        : { error: { code: expected.code, message: "Operación rechazada." } };
    return {
      status: expected.status,
      body,
      data: null,
    } satisfies SupabaseProviderProbeHttpResult<SupabaseProviderPreparedUpload>;
  }

  async uploadSyntheticPdf(input: Parameters<SupabaseProviderCandidateProbeExecutionPort["uploadSyntheticPdf"]>[0]) {
    this.events.push({ operation: "uploadSyntheticPdf", scope: input.lease.scope });
  }

  async completeEvidence(input: Parameters<SupabaseProviderCandidateProbeExecutionPort["completeEvidence"]>[0]) {
    this.events.push({ operation: "completeEvidence", scope: input.lease.scope, actor: input.actor });
    if (input.lease.scope === "happy_path") {
      return { status: 200, body: { data: { completed: true } }, data: null };
    }
    if (input.lease.scope !== "missing_uploaded_object") {
      throw new Error("completeEvidence called for unsupported scope");
    }
    return {
      status: 404,
      body: { error: { code: "evidence_not_found", message: "Evidencia no encontrada." } },
      data: null,
    };
  }

  async downloadEvidence(input: Parameters<SupabaseProviderCandidateProbeExecutionPort["downloadEvidence"]>[0]) {
    this.events.push({ operation: "downloadEvidence", scope: input.lease.scope, actor: input.actor });
    return { status: 200, body: { data: { url: "https://signed.invalid/download" } }, data: null };
  }

  async readCase(input: Parameters<SupabaseProviderCandidateProbeExecutionPort["readCase"]>[0]) {
    this.events.push({ operation: "readCase", scope: input.lease.scope, actor: input.actor });
    const scope = input.lease.scope;
    const snapshot: SupabaseProviderProbeCaseSnapshot =
      scope === "happy_path"
        ? {
            caseId: input.caseId,
            ownerSubjectRef: input.lease.ownerSubjectRef,
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
            publicReadModel: {
              caseId: input.caseId,
              evidence: [{ evidenceId: preparedFor(input.lease).evidenceId, kind: "statement" }],
            },
          }
        : {
            caseId: input.caseId,
            ownerSubjectRef: input.lease.ownerSubjectRef,
            routeCode: "R7_RECLAMACION",
            caseTrack: "assisted",
            version: FAILURE_EXPECTATIONS[scope].version,
            stage: "draft",
            eventSequence: [...FAILURE_EXPECTATIONS[scope].events],
            evidence: [],
            publicReadModel: { caseId: input.caseId, evidence: [] },
          };
    return this.caseOverride?.(input.lease, snapshot) ?? snapshot;
  }

  async readIntent(input: Parameters<SupabaseProviderCandidateProbeExecutionPort["readIntent"]>[0]) {
    this.events.push({ operation: "readIntent", scope: input.lease.scope });
    return {
      intentId: input.intentId,
      caseId: input.caseId,
      status: "quarantine" as const,
    };
  }

  async readTelemetry(input: Parameters<SupabaseProviderCandidateProbeExecutionPort["readTelemetry"]>[0]) {
    this.events.push({ operation: "readTelemetry", scope: input.lease.scope });
    const scope = input.lease.scope;
    const telemetry: SupabaseProviderProbeTelemetry =
      scope === "happy_path"
        ? {
            fixtureId: input.lease.fixtureId,
            namespace: input.lease.namespace,
            registryRegistrations: 1,
            storageUploadGrantCalls: 1,
            storageInspectionCalls: 1,
            auditOperations: [
              { operation: "evidence.prepare", status: 200 },
              { operation: "evidence.complete", status: 200 },
              { operation: "evidence.download", status: 200 },
            ],
          }
        : {
            fixtureId: input.lease.fixtureId,
            namespace: input.lease.namespace,
            registryRegistrations: scope === "missing_uploaded_object" ? 1 : 0,
            storageUploadGrantCalls: scope === "missing_uploaded_object" ? 1 : 0,
            storageInspectionCalls: scope === "missing_uploaded_object" ? 1 : 0,
            auditOperations: [...FAILURE_EXPECTATIONS[scope].audit],
          };
    return telemetry;
  }
}

function makeAdapter(input?: {
  qualification?: ReturnType<typeof qualifiedDev>;
  lifecycle?: RecordingFixtureLifecycle;
  execution?: CanonicalExecutionPort;
}) {
  const fixtureLifecycle = input?.lifecycle ?? new RecordingFixtureLifecycle();
  const execution = input?.execution ?? new CanonicalExecutionPort();
  const session = new ProviderCandidateFixtureSession(
    input?.qualification ?? qualifiedDev(),
    fixtureLifecycle,
    () => NOW,
  );
  const adapter = new SupabaseProviderCandidateProbeAdapter(session, execution);
  return { adapter, fixtureLifecycle, execution };
}

describe("Supabase Provider Candidate Probe Adapter V0.23.24", () => {
  it("exposes the frozen adapter version", () => {
    expect(SUPABASE_PROVIDER_CANDIDATE_PROBE_ADAPTER_VERSION).toBe(
      "V0.23.24-SUPABASE-PROVIDER-PROBE-V1",
    );
  });

  it("drives all six probes into a conformant 37-of-37 provider parity certification", async () => {
    const { adapter, fixtureLifecycle, execution } = makeAdapter();

    const certification = await certifyEvidenceRuntimeProviderCandidate(adapter);

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
    expect(certification.observation).toMatchObject({
      source: "dev_provider_candidate",
      externalIoOccurred: true,
      liveRuntimeAuthorized: false,
      runtimeServerWasUsed: false,
    });
    expect(certification.runtimeActivationAuthorized).toBe(false);
    expect(certification.activationFactsProduced).toBe(false);
    expect(certification.deploymentAuthorized).toBe(false);

    expect(fixtureLifecycle.allocations).toHaveLength(6);
    expect(fixtureLifecycle.cleanups).toHaveLength(6);
    expect(new Set(fixtureLifecycle.allocations.map((lease) => lease.fixtureId)).size).toBe(6);
    expect(new Set(fixtureLifecycle.allocations.map((lease) => lease.namespace)).size).toBe(6);
    expect(fixtureLifecycle.cleanups.map((lease) => lease.fixtureId)).toEqual(
      fixtureLifecycle.allocations.map((lease) => lease.fixtureId),
    );

    const rateLimitPrepare = execution.events.find(
      (event) => event.operation === "prepareEvidence" && event.scope === "rate_limit_unavailable",
    );
    expect(rateLimitPrepare?.fault).toBe("rate_limit_unavailable");
    expect(
      execution.events
        .filter((event) => event.operation === "prepareEvidence" && event.scope !== "rate_limit_unavailable")
        .every((event) => event.fault === null),
    ).toBe(true);
  });

  it("maps the canonical actor per adversarial scenario", async () => {
    const { adapter, execution } = makeAdapter();

    await adapter.captureFailureScenario("unauthenticated_prepare");
    await adapter.captureFailureScenario("cross_case_access");
    await adapter.captureFailureScenario("missing_data_authorization");

    const actors = Object.fromEntries(
      execution.events
        .filter((event) => event.operation === "prepareEvidence")
        .map((event) => [event.scope, event.actor]),
    );
    expect(actors).toMatchObject({
      unauthenticated_prepare: "anonymous",
      cross_case_access: "intruder",
      missing_data_authorization: "owner",
    });
  });

  it("blocks an unqualified DEV session before the execution port or cleanup is touched", async () => {
    const lifecycle = new RecordingFixtureLifecycle();
    const execution = new CanonicalExecutionPort();
    const { adapter } = makeAdapter({
      qualification: evaluateDevEnvironmentQualification(),
      lifecycle,
      execution,
    });

    await expect(adapter.captureHappyPath()).rejects.toMatchObject({
      code: "dev_environment_unqualified",
      scope: "happy_path",
    });
    expect(lifecycle.allocations).toHaveLength(0);
    expect(lifecycle.cleanups).toHaveLength(0);
    expect(execution.events).toHaveLength(0);
  });

  it("rejects a prepared upload outside the fixture namespace and still verifies cleanup", async () => {
    const lifecycle = new RecordingFixtureLifecycle();
    const execution = new CanonicalExecutionPort();
    execution.preparedOverride = (lease) => ({
      ...preparedFor(lease),
      intentId: "upl_vivienda_dev_foreign_intent001",
      objectPath: "quarantine/upl_vivienda_dev_foreign_intent001/evd_foreign/obj_foreign001",
    });
    const { adapter } = makeAdapter({ lifecycle, execution });

    await expect(adapter.captureHappyPath()).rejects.toBeInstanceOf(
      SupabaseProviderCandidateProbeAdapterError,
    );
    expect(lifecycle.cleanups).toHaveLength(1);
    expect(lifecycle.cleanups[0]?.scope).toBe("happy_path");
    expect(execution.events.some((event) => event.operation === "uploadSyntheticPdf")).toBe(false);
  });

  it("rejects a tampered case snapshot and still cleans the allocated fixture", async () => {
    const lifecycle = new RecordingFixtureLifecycle();
    const execution = new CanonicalExecutionPort();
    execution.caseOverride = (_lease, snapshot) => ({
      ...snapshot,
      ownerSubjectRef: "sub_synthetic_someone_else_owner",
    });
    const { adapter } = makeAdapter({ lifecycle, execution });

    await expect(adapter.captureHappyPath()).rejects.toMatchObject({
      code: "invalid_provider_response",
      scope: "happy_path",
    });
    expect(lifecycle.cleanups).toHaveLength(1);
  });

  it("does not hide leaked provider material: the observation becomes nonconformant", async () => {
    const execution = new CanonicalExecutionPort();
    execution.secretFailureScenario = "cross_case_access";
    const { adapter } = makeAdapter({ execution });

    const observation = await adapter.captureFailureScenario("cross_case_access");

    expect(observation.observedErrorCode).toBe("forbidden");
    expect(observation.boundaries.publicErrorSanitized).toBe(false);
  });

  it("lets V0.23.20 sanitize execution exceptions and still runs fixture cleanup", async () => {
    const lifecycle = new RecordingFixtureLifecycle();
    const execution = new CanonicalExecutionPort();
    execution.throwOnPrepareScope = "happy_path";
    const { adapter } = makeAdapter({ lifecycle, execution });

    try {
      await certifyEvidenceRuntimeProviderCandidate(adapter);
      throw new Error("expected certification failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderCandidateParityHarnessError);
      expect(error).toMatchObject({ scope: "happy_path" });
      expect(String((error as Error).message)).not.toContain("provider diagnostic secret");
    }
    expect(lifecycle.cleanups).toHaveLength(1);
  });

  it("derives read-model leakage boundaries instead of trusting provider booleans", async () => {
    const execution = new CanonicalExecutionPort();
    execution.caseOverride = (_lease, snapshot) => ({
      ...snapshot,
      publicReadModel: {
        caseId: snapshot.caseId,
        storageLocator: "obj_should_never_be_public",
        checksumSha256: "a".repeat(64),
      },
    });
    const { adapter } = makeAdapter({ execution });

    const observation = await adapter.captureHappyPath();
    expect(observation.boundaries.rawStorageLocatorExposedInCaseReadModel).toBe(true);
    expect(observation.boundaries.checksumExposedInCaseReadModel).toBe(true);
  });

  it("refuses a control surface that claims runtime authority at construction", () => {
    const lifecycle = new RecordingFixtureLifecycle();
    const session = new ProviderCandidateFixtureSession(qualifiedDev(), lifecycle, () => NOW);
    const execution = new CanonicalExecutionPort();
    const unsafe = Object.assign(execution, { liveRuntimeAuthorized: true as boolean });

    expect(
      () =>
        new SupabaseProviderCandidateProbeAdapter(
          session,
          unsafe as unknown as SupabaseProviderCandidateProbeExecutionPort,
        ),
    ).toThrowError(SupabaseProviderCandidateProbeAdapterError);
    expect(lifecycle.allocations).toHaveLength(0);
  });

  it("produces zero activation facts and remains isolated from runtime wiring and credentials", () => {
    expect(supabaseProviderCandidateProbeAdapterProducesNoActivationFacts()).toEqual({});

    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/supabase-provider-candidate-probe-adapter.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from\s+["']\.\/runtime\.server["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activated-runtime["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activation-preflight["']/);
    expect(source).not.toMatch(/process\.env/);
    expect(source).not.toMatch(/SUPABASE_(?:URL|SERVICE_ROLE|ANON)_KEY/);
    expect(source).not.toMatch(/@supabase\/supabase-js/);
  });
});
