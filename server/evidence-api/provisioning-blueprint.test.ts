import { describe, expect, it } from "vitest";
import {
  PROVISIONING_ENVIRONMENT_POLICIES,
  approvedProvisioningPlanFacts,
  evaluateProvisioningBlueprint,
  evaluateProvisioningPromotion,
} from "./provisioning-blueprint";
import {
  evaluateEvidenceRuntimeActivation,
  verifiedEvidenceRuntimeActivationFacts,
} from "./activation-preflight";

function promotionEvidence() {
  return {
    blueprint: evaluateProvisioningBlueprint(approvedProvisioningPlanFacts()),
    sourceEnvironmentVerified: true,
    targetEnvironmentIsolationVerified: true,
    rollbackRehearsed: true,
    backupRestoreVerified: true,
    securityReviewComplete: true,
    costApprovalRecorded: false,
    incidentOwnerAssigned: false,
    killSwitchVerified: false,
  };
}

describe("V0.23.13 provisioning blueprint", () => {
  it("starts fail closed until all planning decisions are approved", () => {
    const empty = evaluateProvisioningBlueprint();
    expect(empty.state).toBe("not_defined");
    expect(empty.provisioningMayBegin).toBe(false);
    expect(empty.approvedDecisionCount).toBe(0);
    expect(empty.totalDecisionCount).toBe(20);

    const partial = evaluateProvisioningBlueprint({
      dedicated_environment_projects: "approved",
      billing_owner_approved: "defined",
    });

    expect(partial.state).toBe("partially_defined");
    expect(partial.provisioningMayBegin).toBe(false);
    expect(partial.blockers.some((item) => item.code === "billing_owner_approved")).toBe(true);

    const approved = evaluateProvisioningBlueprint(approvedProvisioningPlanFacts());
    expect(approved.state).toBe("approved_for_controlled_provisioning");
    expect(approved.provisioningMayBegin).toBe(true);
    expect(approved.approvedDecisionCount).toBe(20);
  });

  it("keeps development and staging synthetic-only and production fail closed by default", () => {
    expect(PROVISIONING_ENVIRONMENT_POLICIES.development.dataPolicy).toBe("synthetic_only");
    expect(PROVISIONING_ENVIRONMENT_POLICIES.staging.dataPolicy).toBe("synthetic_only");
    expect(PROVISIONING_ENVIRONMENT_POLICIES.production.dataPolicy).toBe(
      "real_data_after_controlled_activation",
    );

    for (const policy of Object.values(PROVISIONING_ENVIRONMENT_POLICIES)) {
      expect(policy.projectIsolation).toBe("dedicated_project");
      expect(policy.secretsVisibility).toBe("server_only");
      expect(policy.directManualProductionMutation).toBe(false);
      expect(policy.evidenceRuntimeDefault).toBe("fail_closed");
    }
  });

  it("allows only sequential environment promotion", () => {
    const evidence = promotionEvidence();

    expect(evaluateProvisioningPromotion("development", "production", evidence).state).toBe(
      "invalid_transition",
    );
    expect(evaluateProvisioningPromotion("production", "staging", evidence).state).toBe(
      "invalid_transition",
    );
  });

  it("allows DEV to STAGING after planning, isolation, rollback, recovery and security evidence", () => {
    const decision = evaluateProvisioningPromotion(
      "development",
      "staging",
      promotionEvidence(),
    );

    expect(decision.state).toBe("ready_for_controlled_promotion");
    expect(decision.promotionMayProceed).toBe(true);
    expect(decision.blockers).toEqual([]);
  });

  it("blocks production even with an approved provisioning plan when V0.23.12 activation is not ready", () => {
    const evidence = {
      ...promotionEvidence(),
      costApprovalRecorded: true,
      incidentOwnerAssigned: true,
      killSwitchVerified: true,
      activation: evaluateEvidenceRuntimeActivation({
        dedicated_vivienda_project: "verified",
      }),
    };

    const decision = evaluateProvisioningPromotion("staging", "production", evidence);

    expect(decision.state).toBe("blocked");
    expect(decision.promotionMayProceed).toBe(false);
    expect(decision.blockers).toContain("runtime_activation_preflight_not_ready");
  });

  it("requires production cost approval, incident ownership, kill switch and 15/15 activation readiness", () => {
    const activation = evaluateEvidenceRuntimeActivation(
      verifiedEvidenceRuntimeActivationFacts(),
    );

    const blocked = evaluateProvisioningPromotion("staging", "production", {
      ...promotionEvidence(),
      activation,
    });

    expect(blocked.blockers).toEqual([
      "production_cost_not_approved",
      "production_incident_owner_missing",
      "production_kill_switch_not_verified",
    ]);

    const ready = evaluateProvisioningPromotion("staging", "production", {
      ...promotionEvidence(),
      costApprovalRecorded: true,
      incidentOwnerAssigned: true,
      killSwitchVerified: true,
      activation,
    });

    expect(ready.state).toBe("ready_for_controlled_promotion");
    expect(ready.promotionMayProceed).toBe(true);
    expect(ready.blockers).toEqual([]);
  });

  it("never treats an approved provisioning blueprint as runtime verification", () => {
    const blueprint = evaluateProvisioningBlueprint(approvedProvisioningPlanFacts());
    const activation = evaluateEvidenceRuntimeActivation();

    expect(blueprint.provisioningMayBegin).toBe(true);
    expect(activation.runtimeMayActivate).toBe(false);
    expect(activation.verifiedRequirementCount).toBe(0);
  });
});
