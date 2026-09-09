import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertEvidenceRuntimeParity,
  captureSyntheticEvidenceRuntimeParityObservation,
  evaluateEvidenceRuntimeParity,
  type EvidenceRuntimeParityObservation,
} from "./runtime-parity-contract";

function cloneObservation(value: EvidenceRuntimeParityObservation): EvidenceRuntimeParityObservation {
  return structuredClone(value);
}

describe("Evidence Runtime Parity Contract V0.23.19", () => {
  it("certifies the combined V0.23.17 happy-path and V0.23.18 failure baseline", async () => {
    const observation = await captureSyntheticEvidenceRuntimeParityObservation();
    const decision = evaluateEvidenceRuntimeParity(observation);

    expect(observation.source).toBe("synthetic_baseline");
    expect(observation.externalIoOccurred).toBe(false);
    expect(decision).toMatchObject({
      state: "conformant",
      conformsToBaseline: true,
      totalChecks: 37,
      passedChecks: 37,
      deviations: [],
      runtimeActivationAuthorized: false,
      activationDecisionEvaluated: false,
    });
    expect(() => assertEvidenceRuntimeParity(observation)).not.toThrow();
  });

  it("keeps technical inspection below professional EVIDENCE_VERIFIED semantics", async () => {
    const observation = cloneObservation(await captureSyntheticEvidenceRuntimeParityObservation());
    observation.happyPath.eventSequence.push("EVIDENCE_VERIFIED");

    const decision = evaluateEvidenceRuntimeParity(observation);

    expect(decision.conformsToBaseline).toBe(false);
    expect(decision.deviations).toContainEqual(
      expect.objectContaining({ code: "happy_event_sequence_mismatch", scope: "happy_path" }),
    );
  });

  it("rejects a candidate that persists or attaches evidence after a failed operation", async () => {
    const observation = cloneObservation(await captureSyntheticEvidenceRuntimeParityObservation());
    const missingObject = observation.failures.find((item) => item.scenario === "missing_uploaded_object")!;
    missingObject.evidenceCount = 1;
    missingObject.eventSequence.push("EVIDENCE_ATTACHED");
    missingObject.boundaries.noEvidencePersisted = false;
    missingObject.boundaries.noEvidenceAttachedEvent = false;
    missingObject.boundaries.caseVersionUnchangedByRejectedOperation = false;

    const decision = evaluateEvidenceRuntimeParity(observation);

    expect(decision.conformsToBaseline).toBe(false);
    expect(decision.deviations).toContainEqual(
      expect.objectContaining({
        code: "failure_persistence_boundary_mismatch",
        scope: "missing_uploaded_object",
      }),
    );
  });

  it("rejects fail-open Storage contact before auth/ownership boundaries", async () => {
    const observation = cloneObservation(await captureSyntheticEvidenceRuntimeParityObservation());
    const crossCase = observation.failures.find((item) => item.scenario === "cross_case_access")!;
    crossCase.registryRegistrations = 1;
    crossCase.storageUploadGrantCalls = 1;

    const decision = evaluateEvidenceRuntimeParity(observation);

    expect(decision.conformsToBaseline).toBe(false);
    expect(decision.deviations).toContainEqual(
      expect.objectContaining({ code: "failure_storage_touch_mismatch", scope: "cross_case_access" }),
    );
  });

  it("rejects provider-shaped public errors that drift from the canonical boundary", async () => {
    const observation = cloneObservation(await captureSyntheticEvidenceRuntimeParityObservation());
    const unauthenticated = observation.failures.find((item) => item.scenario === "unauthenticated_prepare")!;
    unauthenticated.httpStatuses.prepare = 500;
    unauthenticated.observedErrorCode = "provider_error";

    const decision = evaluateEvidenceRuntimeParity(observation);

    expect(decision.conformsToBaseline).toBe(false);
    expect(decision.deviations).toContainEqual(
      expect.objectContaining({
        code: "failure_public_contract_mismatch",
        scope: "unauthenticated_prepare",
      }),
    );
  });

  it("fails when any canonical adversarial scenario is omitted", async () => {
    const observation = cloneObservation(await captureSyntheticEvidenceRuntimeParityObservation());
    observation.failures = observation.failures.filter((item) => item.scenario !== "rate_limit_unavailable");

    const decision = evaluateEvidenceRuntimeParity(observation);

    expect(decision.conformsToBaseline).toBe(false);
    expect(decision.deviations).toContainEqual(
      expect.objectContaining({ code: "failure_scenario_set_mismatch", scope: "global" }),
    );
  });

  it("never turns a parity PASS into live runtime activation authority", async () => {
    const observation = cloneObservation(await captureSyntheticEvidenceRuntimeParityObservation());
    observation.source = "dev_provider_candidate";
    observation.externalIoOccurred = true;

    const decision = evaluateEvidenceRuntimeParity(observation);
    expect(decision.state).toBe("conformant");
    expect(decision.runtimeActivationAuthorized).toBe(false);
    expect(decision.activationDecisionEvaluated).toBe(false);

    observation.liveRuntimeAuthorized = true;
    observation.runtimeServerWasUsed = true;
    const invalid = evaluateEvidenceRuntimeParity(observation);
    expect(invalid.conformsToBaseline).toBe(false);
    expect(invalid.deviations.map((item) => item.code)).toEqual(
      expect.arrayContaining(["activation_authority_present", "runtime_server_used"]),
    );
  });

  it("produces a secret-free deterministic observation suitable for future DEV comparison", async () => {
    const first = await captureSyntheticEvidenceRuntimeParityObservation();
    const second = await captureSyntheticEvidenceRuntimeParityObservation();

    expect(second).toEqual(first);
    const serialized = JSON.stringify(first);
    expect(serialized).not.toContain("storageLocator");
    expect(serialized).not.toContain("checksumSha256");
    expect(serialized).not.toContain("uploadToken");
    expect(serialized).not.toContain("objectPath");
    expect(serialized).not.toContain("signedUrl");
  });

  it("stays mechanically isolated from runtime activation and runtime.server.ts", () => {
    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/runtime-parity-contract.ts"),
      "utf8",
    );

    expect(source).not.toContain('from "./runtime.server"');
    expect(source).not.toContain("createActivatedEvidenceRuntime");
    expect(source).not.toContain("verifiedEvidenceRuntimeActivationFacts");
    expect(source).not.toContain("assertEvidenceRuntimeActivationAllowed");
  });
});
