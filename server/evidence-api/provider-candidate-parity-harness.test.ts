import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SyntheticEvidenceFailureScenario } from "./synthetic-failure-rehearsal";
import {
  captureSyntheticEvidenceRuntimeParityObservation,
  type EvidenceRuntimeFailureObservation,
  type EvidenceRuntimeHappyPathObservation,
  type EvidenceRuntimeParityObservation,
} from "./runtime-parity-contract";
import {
  PROVIDER_CANDIDATE_PARITY_FAILURE_SCENARIOS,
  ProviderCandidateParityHarnessError,
  certifyEvidenceRuntimeProviderCandidate,
  type EvidenceRuntimeProviderCandidateProbe,
} from "./provider-candidate-parity-harness";

class BaselineCandidate implements EvidenceRuntimeProviderCandidateProbe {
  readonly calls: Array<"happy_path" | SyntheticEvidenceFailureScenario> = [];
  externalIoOccurred = true;
  liveRuntimeAuthorized = false;
  runtimeServerWasUsed = false;

  constructor(
    protected readonly baseline: EvidenceRuntimeParityObservation,
    private readonly mutateFailure?: (
      scenario: SyntheticEvidenceFailureScenario,
      observation: EvidenceRuntimeFailureObservation,
    ) => void,
  ) {}

  async captureHappyPath(): Promise<EvidenceRuntimeHappyPathObservation> {
    this.calls.push("happy_path");
    return structuredClone(this.baseline.happyPath);
  }

  async captureFailureScenario(
    scenario: SyntheticEvidenceFailureScenario,
  ): Promise<EvidenceRuntimeFailureObservation> {
    this.calls.push(scenario);
    const found = this.baseline.failures.find((item) => item.scenario === scenario);
    if (!found) throw new Error(`missing baseline for ${scenario}`);
    const observation = structuredClone(found);
    this.mutateFailure?.(scenario, observation);
    return observation;
  }
}

describe("Provider Candidate Parity Harness V0.23.20", () => {
  it("runs one happy path plus the five failures in canonical sequential order", async () => {
    const baseline = await captureSyntheticEvidenceRuntimeParityObservation();
    const candidate = new BaselineCandidate(baseline);

    const certification = await certifyEvidenceRuntimeProviderCandidate(candidate);

    expect(candidate.calls).toEqual([
      "happy_path",
      ...PROVIDER_CANDIDATE_PARITY_FAILURE_SCENARIOS,
    ]);
    expect(certification.probeOrder).toEqual(candidate.calls);
    expect(certification.observation.source).toBe("dev_provider_candidate");
    expect(certification.observation.externalIoOccurred).toBe(true);
    expect(certification.decision).toMatchObject({
      state: "conformant",
      conformsToBaseline: true,
      totalChecks: 37,
      passedChecks: 37,
      deviations: [],
    });
  });

  it("keeps provider conformance separate from activation and deployment authority", async () => {
    const baseline = await captureSyntheticEvidenceRuntimeParityObservation();
    const certification = await certifyEvidenceRuntimeProviderCandidate(new BaselineCandidate(baseline));

    expect(certification).toMatchObject({
      runtimeActivationAuthorized: false,
      activationFactsProduced: false,
      deploymentAuthorized: false,
    });
    expect(certification.decision).toMatchObject({
      runtimeActivationAuthorized: false,
      activationDecisionEvaluated: false,
    });
  });

  it("surfaces provider behavioral drift through the canonical V0.23.19 deviations", async () => {
    const baseline = await captureSyntheticEvidenceRuntimeParityObservation();
    const candidate = new BaselineCandidate(baseline, (scenario, observation) => {
      if (scenario === "cross_case_access") {
        observation.registryRegistrations = 1;
        observation.storageUploadGrantCalls = 1;
      }
    });

    const certification = await certifyEvidenceRuntimeProviderCandidate(candidate);

    expect(certification.decision.conformsToBaseline).toBe(false);
    expect(certification.decision.deviations).toContainEqual(
      expect.objectContaining({
        code: "failure_storage_touch_mismatch",
        scope: "cross_case_access",
      }),
    );
    expect(certification.runtimeActivationAuthorized).toBe(false);
  });

  it("rejects candidate claims of live authority instead of normalizing them away", async () => {
    const baseline = await captureSyntheticEvidenceRuntimeParityObservation();
    const candidate = new BaselineCandidate(baseline);
    candidate.liveRuntimeAuthorized = true;
    candidate.runtimeServerWasUsed = true;

    const certification = await certifyEvidenceRuntimeProviderCandidate(candidate);

    expect(certification.decision.conformsToBaseline).toBe(false);
    expect(certification.decision.deviations.map((item) => item.code)).toEqual(
      expect.arrayContaining(["activation_authority_present", "runtime_server_used"]),
    );
  });

  it("sanitizes probe exceptions and stops before later provider scenarios", async () => {
    const baseline = await captureSyntheticEvidenceRuntimeParityObservation();
    const candidate = new BaselineCandidate(baseline);
    candidate.captureFailureScenario = async (scenario) => {
      candidate.calls.push(scenario);
      if (scenario === "missing_data_authorization") {
        throw new Error("provider secret=do-not-leak objectPath=/private/file.pdf");
      }
      const found = baseline.failures.find((item) => item.scenario === scenario);
      if (!found) throw new Error("missing fixture");
      return structuredClone(found);
    };

    try {
      await certifyEvidenceRuntimeProviderCandidate(candidate);
      throw new Error("expected provider probe failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderCandidateParityHarnessError);
      expect(error).toMatchObject({
        code: "provider_candidate_parity_probe_failed",
        scope: "missing_data_authorization",
      });
      expect(String((error as Error).message)).not.toContain("do-not-leak");
      expect(String((error as Error).message)).not.toContain("/private/file.pdf");
    }

    expect(candidate.calls).toEqual([
      "happy_path",
      "unauthenticated_prepare",
      "missing_data_authorization",
    ]);
  });

  it("does not import activation/runtime factories into the provider candidate harness", () => {
    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/provider-candidate-parity-harness.ts"),
      "utf8",
    );

    expect(source).not.toContain('from "./runtime.server"');
    expect(source).not.toContain("createActivatedEvidenceRuntime");
    expect(source).not.toContain("verifiedEvidenceRuntimeActivationFacts");
    expect(source).not.toContain("assertEvidenceRuntimeActivationAllowed");
  });
});
