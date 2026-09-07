import { describe, expect, it } from "vitest";
import {
  EvidenceRuntimeActivationError,
  assertEvidenceRuntimeActivationAllowed,
  evaluateEvidenceRuntimeActivation,
  verifiedEvidenceRuntimeActivationFacts,
  type EvidenceRuntimeActivationFacts,
} from "./activation-preflight";

describe("Evidence Runtime Activation Preflight", () => {
  it("fails closed when nothing is configured", () => {
    const decision = evaluateEvidenceRuntimeActivation();

    expect(decision.state).toBe("not_configured");
    expect(decision.runtimeMayActivate).toBe(false);
    expect(decision.partialActivationDetected).toBe(false);
    expect(decision.verifiedRequirementCount).toBe(0);
    expect(decision.totalRequirementCount).toBe(15);
    expect(decision.blockers).toHaveLength(15);
    expect(decision.nextBlockingLayer).toBe("environment");
  });

  it("detects partial activation and still blocks the runtime", () => {
    const facts: EvidenceRuntimeActivationFacts = {
      dedicated_vivienda_project: "verified",
      migrations_applied: "configured_unverified",
      authenticated_principal_resolver: "verified",
    };

    const decision = evaluateEvidenceRuntimeActivation(facts);

    expect(decision.state).toBe("blocked_partial_configuration");
    expect(decision.runtimeMayActivate).toBe(false);
    expect(decision.partialActivationDetected).toBe(true);
    expect(decision.verifiedRequirementCount).toBe(2);
    expect(decision.nextBlockingLayer).toBe("environment");
    expect(decision.blockers.find((item) => item.code === "migrations_applied")?.status).toBe(
      "configured_unverified",
    );
  });

  it("does not treat configured-but-unverified requirements as activation ready", () => {
    const configured = Object.fromEntries(
      Object.keys(verifiedEvidenceRuntimeActivationFacts()).map((code) => [code, "configured_unverified"]),
    ) as EvidenceRuntimeActivationFacts;

    const decision = evaluateEvidenceRuntimeActivation(configured);

    expect(decision.state).toBe("blocked_partial_configuration");
    expect(decision.runtimeMayActivate).toBe(false);
    expect(decision.verifiedRequirementCount).toBe(0);
    expect(decision.blockers).toHaveLength(15);
  });

  it("surfaces the earliest blocking layer deterministically", () => {
    const facts = verifiedEvidenceRuntimeActivationFacts();
    facts.physical_deletion_worker = "missing";
    facts.rate_limit_provider = "missing";
    facts.service_agreement_recording = "missing";

    const decision = evaluateEvidenceRuntimeActivation(facts);

    expect(decision.runtimeMayActivate).toBe(false);
    expect(decision.nextBlockingLayer).toBe("storage");
    expect(decision.blockers.map((item) => item.code)).toEqual([
      "physical_deletion_worker",
      "rate_limit_provider",
      "service_agreement_recording",
    ]);
  });

  it("requires product consent/case semantics in addition to technical infrastructure", () => {
    const facts = verifiedEvidenceRuntimeActivationFacts();
    facts.real_case_creation_flow = "missing";
    facts.purpose_specific_data_authorization = "missing";
    facts.service_agreement_recording = "missing";

    const decision = evaluateEvidenceRuntimeActivation(facts);

    expect(decision.runtimeMayActivate).toBe(false);
    expect(decision.nextBlockingLayer).toBe("product");
    expect(decision.blockers.map((item) => item.code)).toEqual([
      "real_case_creation_flow",
      "purpose_specific_data_authorization",
      "service_agreement_recording",
    ]);
  });

  it("allows controlled activation only when every requirement is verified", () => {
    const decision = evaluateEvidenceRuntimeActivation(verifiedEvidenceRuntimeActivationFacts());

    expect(decision.state).toBe("ready_for_controlled_activation");
    expect(decision.runtimeMayActivate).toBe(true);
    expect(decision.partialActivationDetected).toBe(false);
    expect(decision.verifiedRequirementCount).toBe(15);
    expect(decision.blockers).toEqual([]);
    expect(decision.nextBlockingLayer).toBeNull();
  });

  it("assertion throws a fail-closed error containing only safe blocker metadata", () => {
    expect(() =>
      assertEvidenceRuntimeActivationAllowed({
        dedicated_vivienda_project: "verified",
      }),
    ).toThrow(EvidenceRuntimeActivationError);

    try {
      assertEvidenceRuntimeActivationAllowed({ dedicated_vivienda_project: "verified" });
      throw new Error("expected activation assertion to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(EvidenceRuntimeActivationError);
      const activationError = error as EvidenceRuntimeActivationError;
      expect(activationError.code).toBe("runtime_activation_blocked");
      expect(activationError.decision.runtimeMayActivate).toBe(false);
      expect(activationError.message).toContain("migrations_applied");
      expect(activationError.message).not.toMatch(/token|secret|password|key=/i);
    }
  });
});
