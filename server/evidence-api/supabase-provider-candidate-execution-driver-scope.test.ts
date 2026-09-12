import { describe, expect, it } from "vitest";
import {
  PROVIDER_CANDIDATE_FIXTURE_CONTRACT_VERSION,
  type ProviderCandidateFixtureLease,
} from "./provider-candidate-fixture-lifecycle";
import {
  SupabaseProviderCandidateExecutionDriver,
  type SupabaseProviderCandidateAuthTransport,
  type SupabaseProviderCandidateHttpTransport,
  type SupabaseProviderCandidateObservabilityTransport,
  type SupabaseProviderCandidateParityFaultTransport,
  type SupabaseProviderCandidateStateTransport,
  type SupabaseProviderCandidateStorageTransport,
} from "./supabase-provider-candidate-execution-driver";

const ORIGIN = "https://provider-candidate.vivienda.invalid";
const CASE_ID = "case_vivienda_dev_scope001_case001";

function lease(scope: ProviderCandidateFixtureLease["scope"]): ProviderCandidateFixtureLease {
  return {
    contractVersion: PROVIDER_CANDIDATE_FIXTURE_CONTRACT_VERSION,
    scope,
    fixtureId: `fx_scope001_${scope}`,
    namespace: "vivienda_dev_scope001",
    ownerSubjectRef: "sub_synthetic_scope001_owner",
    intruderSubjectRef: "sub_synthetic_scope001_intruder",
    issuedAt: "2026-09-12T17:00:00.000Z",
    expiresAt: "2026-09-12T17:20:00.000Z",
    syntheticOnly: true,
    disposable: true,
  };
}

function makeDriver() {
  let authCalls = 0;
  let httpCalls = 0;
  let faultCalls = 0;

  const auth: SupabaseProviderCandidateAuthTransport = {
    channel: "supabase_auth",
    projectLabel: "vivienda-dev",
    syntheticOnly: true,
    liveRuntimeAuthorized: false,
    async issueAccessToken(input) {
      authCalls += 1;
      return {
        subjectRef:
          input.actor === "owner"
            ? input.lease.ownerSubjectRef
            : input.lease.intruderSubjectRef,
        accessToken: `jwt_${input.actor}_scope001`,
        expiresAt: "2026-09-12T18:00:00.000Z",
      };
    },
  };

  const http: SupabaseProviderCandidateHttpTransport = {
    channel: "evidence_api",
    projectLabel: "vivienda-dev",
    syntheticOnly: true,
    liveRuntimeAuthorized: false,
    async send() {
      httpCalls += 1;
      return { status: 503, body: { error: { code: "rate_limit_unavailable" } } };
    },
  };

  const storage: SupabaseProviderCandidateStorageTransport = {
    channel: "supabase_storage",
    projectLabel: "vivienda-dev",
    syntheticOnly: true,
    liveRuntimeAuthorized: false,
    async uploadSigned() {
      return { status: 200 };
    },
  };

  const state: SupabaseProviderCandidateStateTransport = {
    channel: "supabase_state",
    projectLabel: "vivienda-dev",
    syntheticOnly: true,
    liveRuntimeAuthorized: false,
    async seedCase() {
      return { caseId: CASE_ID, versionBeforeEvidenceOperation: 4 };
    },
    async readCase(input) {
      return {
        caseId: input.caseId,
        ownerSubjectRef: input.ownerSubjectRef,
        routeCode: "R7_RECLAMACION",
        caseTrack: "assisted",
        version: 4,
        stage: "draft",
        eventSequence: [],
        evidence: [],
        publicReadModel: {},
      };
    },
    async readIntent() {
      return null;
    },
  };

  const observability: SupabaseProviderCandidateObservabilityTransport = {
    channel: "supabase_observability",
    projectLabel: "vivienda-dev",
    syntheticOnly: true,
    liveRuntimeAuthorized: false,
    async readTelemetry(input) {
      return {
        source: "supabase_dev_observability",
        observationId: "obs_scope001",
        fixtureId: input.lease.fixtureId,
        namespace: input.lease.namespace,
        scope: input.lease.scope,
        observedAt: "2026-09-12T17:00:10.000Z",
        complete: true,
        registryRegistrations: 0,
        storageUploadGrantCalls: 0,
        storageInspectionCalls: 0,
        auditOperations: [],
      };
    },
  };

  const faults: SupabaseProviderCandidateParityFaultTransport = {
    channel: "parity_fault_control",
    projectLabel: "vivienda-dev",
    syntheticOnly: true,
    liveRuntimeAuthorized: false,
    parityOnly: true,
    async armRateLimitUnavailable(input) {
      faultCalls += 1;
      return {
        receiptId: "fault_scope001",
        fixtureId: input.lease.fixtureId,
        namespace: input.lease.namespace,
        operation: "evidence.prepare",
        mode: "rate_limit_unavailable_once",
        armed: true,
      };
    },
    async disarm() {},
  };

  return {
    driver: new SupabaseProviderCandidateExecutionDriver(
      { auth, http, storage, state, observability, faults },
      { evidenceApiOrigin: ORIGIN },
    ),
    calls: () => ({ authCalls, httpCalls, faultCalls }),
  };
}

const classification = {
  kind: "statement" as const,
  legalDataCategory: "non_personal" as const,
  securityTier: "open" as const,
};

describe("V0.23.25 prepare scope binding", () => {
  it("rejects rate-limit fault outside rate_limit_unavailable before any transport is touched", async () => {
    const { driver, calls } = makeDriver();
    await expect(
      driver.prepareEvidence({
        lease: lease("happy_path"),
        caseId: CASE_ID,
        actor: "owner",
        clientClassification: classification,
        fault: "rate_limit_unavailable",
      }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(calls()).toEqual({ authCalls: 0, httpCalls: 0, faultCalls: 0 });
  });

  it("requires the rate-limit fault when the lease scope is rate_limit_unavailable", async () => {
    const { driver, calls } = makeDriver();
    await expect(
      driver.prepareEvidence({
        lease: lease("rate_limit_unavailable"),
        caseId: CASE_ID,
        actor: "owner",
        clientClassification: classification,
        fault: null,
      }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(calls()).toEqual({ authCalls: 0, httpCalls: 0, faultCalls: 0 });
  });

  it.each([
    ["unauthenticated_prepare", "owner"],
    ["cross_case_access", "owner"],
    ["happy_path", "intruder"],
    ["missing_data_authorization", "anonymous"],
    ["missing_uploaded_object", "intruder"],
    ["rate_limit_unavailable", "anonymous"],
  ] as const)("rejects actor %s/%s when it does not match the probe scope", async (scope, actor) => {
    const { driver, calls } = makeDriver();
    await expect(
      driver.prepareEvidence({
        lease: lease(scope),
        caseId: CASE_ID,
        actor,
        clientClassification: classification,
        fault: scope === "rate_limit_unavailable" ? "rate_limit_unavailable" : null,
      }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(calls()).toEqual({ authCalls: 0, httpCalls: 0, faultCalls: 0 });
  });
});
