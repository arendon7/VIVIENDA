import { describe, expect, it } from "vitest";
import {
  runSyntheticEvidenceFailureMatrix,
  runSyntheticEvidenceFailureRehearsal,
  type SyntheticEvidenceFailureScenario,
} from "./synthetic-failure-rehearsal";

const expected: Record<
  SyntheticEvidenceFailureScenario,
  { operation: "prepare" | "complete"; status: number; code: string; version: number }
> = {
  unauthenticated_prepare: {
    operation: "prepare",
    status: 401,
    code: "authentication_required",
    version: 4,
  },
  missing_data_authorization: {
    operation: "prepare",
    status: 409,
    code: "data_authorization_required",
    version: 3,
  },
  cross_case_access: {
    operation: "prepare",
    status: 403,
    code: "forbidden",
    version: 4,
  },
  missing_uploaded_object: {
    operation: "complete",
    status: 404,
    code: "evidence_not_found",
    version: 4,
  },
  rate_limit_unavailable: {
    operation: "prepare",
    status: 503,
    code: "rate_limit_unavailable",
    version: 4,
  },
};

describe("Synthetic Evidence Runtime failure rehearsal V0.23.18", () => {
  it("rejects every canonical failure scenario with the expected public status/code", async () => {
    const reports = await runSyntheticEvidenceFailureMatrix();

    expect(reports).toHaveLength(5);
    for (const report of reports) {
      const contract = expected[report.scenario];
      expect(report.errorOperation).toBe(contract.operation);
      expect(report.observedErrorCode).toBe(contract.code);
      expect(report.httpStatuses[contract.operation]).toBe(contract.status);
    }
  });

  it("never persists evidence or advances the Case after a rejected operation", async () => {
    const reports = await runSyntheticEvidenceFailureMatrix();

    for (const report of reports) {
      expect(report.finalCaseVersion).toBe(expected[report.scenario].version);
      expect(report.finalCaseStage).toBe("draft");
      expect(report.evidenceCount).toBe(0);
      expect(report.eventSequence).not.toContain("EVIDENCE_ATTACHED");
      expect(report.boundaries.noEvidencePersisted).toBe(true);
      expect(report.boundaries.noEvidenceAttachedEvent).toBe(true);
      expect(report.boundaries.caseVersionUnchangedByRejectedOperation).toBe(true);
    }
  });

  it("stops unauthenticated, cross-case, missing-consent and rate-limit failures before Storage is touched", async () => {
    const scenarios: SyntheticEvidenceFailureScenario[] = [
      "unauthenticated_prepare",
      "missing_data_authorization",
      "cross_case_access",
      "rate_limit_unavailable",
    ];

    for (const scenario of scenarios) {
      const report = await runSyntheticEvidenceFailureRehearsal(scenario);
      expect(report.registryRegistrations).toBe(0);
      expect(report.storageUploadGrantCalls).toBe(0);
      expect(report.storageInspectionCalls).toBe(0);
      expect(report.uploadIntentStatus).toBeNull();
    }
  });

  it("keeps a missing-object upload quarantined and refuses finalization without fabricating evidence", async () => {
    const report = await runSyntheticEvidenceFailureRehearsal("missing_uploaded_object");

    expect(report.httpStatuses.prepare).toBe(200);
    expect(report.httpStatuses.complete).toBe(404);
    expect(report.observedErrorCode).toBe("evidence_not_found");
    expect(report.registryRegistrations).toBe(1);
    expect(report.storageUploadGrantCalls).toBe(1);
    expect(report.storageInspectionCalls).toBe(1);
    expect(report.uploadIntentStatus).toBe("quarantine");
    expect(report.evidenceCount).toBe(0);
    expect(report.eventSequence).not.toContain("EVIDENCE_ATTACHED");
  });

  it("sanitizes every public failure and preserves zero live-runtime authority", async () => {
    const reports = await runSyntheticEvidenceFailureMatrix();

    for (const report of reports) {
      expect(report.mode).toBe("synthetic_failure_rehearsal");
      expect(report.externalIoOccurred).toBe(false);
      expect(report.liveRuntimeAuthorized).toBe(false);
      expect(report.runtimeServerWasUsed).toBe(false);
      expect(report.boundaries.publicErrorSanitized).toBe(true);
      expect(report.auditOperations.at(-1)).toMatchObject({
        operation: report.errorOperation === "complete" ? "evidence.complete" : "evidence.prepare",
        status: expected[report.scenario].status,
        errorCode: expected[report.scenario].code,
      });
    }
  });

  it("is deterministic across repeated matrices", async () => {
    const first = await runSyntheticEvidenceFailureMatrix();
    const second = await runSyntheticEvidenceFailureMatrix();

    expect(second).toEqual(first);
  });
});
