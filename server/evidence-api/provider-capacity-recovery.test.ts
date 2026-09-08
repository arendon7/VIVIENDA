import { describe, expect, it } from "vitest";
import { evaluateProviderCapacityRecovery } from "./provider-capacity-recovery";
import {
  evaluateDevProviderCapacityPreflight,
  verifiedAvailableDevProviderCapacityFacts,
} from "./provider-capacity-preflight";
import {
  approvedDevProvisioningAuthorizationFacts,
  evaluateDevProvisioningAuthorization,
} from "./dev-provisioning-qualification";
import {
  approvedProvisioningPlanFacts,
  evaluateProvisioningBlueprint,
} from "./provisioning-blueprint";

function authorization() {
  return evaluateDevProvisioningAuthorization(
    evaluateProvisioningBlueprint(approvedProvisioningPlanFacts()),
    approvedDevProvisioningAuthorizationFacts(),
  );
}

function exhaustedCapacity() {
  const facts = verifiedAvailableDevProviderCapacityFacts(0);
  facts.projectCapacity = "exhausted";
  return evaluateDevProviderCapacityPreflight(authorization(), facts);
}

function availableCapacity() {
  return evaluateDevProviderCapacityPreflight(
    authorization(),
    verifiedAvailableDevProviderCapacityFacts(0),
  );
}

describe("provider capacity recovery decision", () => {
  it("does not activate recovery unless current capacity exhaustion was verified", () => {
    const decision = evaluateProviderCapacityRecovery(availableCapacity(), "plan_upgrade", {
      planUpgradeQuote: "verified",
      billingOwnerApproval: "approved",
      planUpgradeApproval: "approved",
    });

    expect(decision.state).toBe("recovery_not_applicable");
    expect(decision.externalMutationMayExecute).toBe(false);
    expect(decision.projectCreationMayExecute).toBe(false);
  });

  it("requires an explicit strategy and never chooses a recovery path by default", () => {
    const decision = evaluateProviderCapacityRecovery(exhaustedCapacity());

    expect(decision.state).toBe("awaiting_explicit_strategy");
    expect(decision.selectedStrategy).toBeNull();
    expect(decision.blockers.map((item) => item.code)).toEqual(["explicit_strategy_required"]);
  });

  it("allows deferring provisioning without creating any external mutation authority", () => {
    const decision = evaluateProviderCapacityRecovery(
      exhaustedCapacity(),
      "defer_provisioning",
    );

    expect(decision.state).toBe("deferred");
    expect(decision.externalMutationMayExecute).toBe(false);
    expect(decision.capacityRecheckRequired).toBe(false);
    expect(decision.projectCreationMayExecute).toBe(false);
  });

  it("fails closed when a pause candidate is unknown or not verified safe to pause", () => {
    const decision = evaluateProviderCapacityRecovery(
      exhaustedCapacity(),
      "pause_existing_project",
      {
        candidateProjectId: "existing-project",
        candidateProjectPauseSafety: "unknown",
        candidateImpactReview: "approved",
        candidateRestorePath: "verified",
        pauseApproval: "approved",
      },
    );

    expect(decision.state).toBe("recovery_blocked");
    expect(decision.externalMutationMayExecute).toBe(false);
    expect(decision.blockers.map((item) => item.code)).toContain(
      "candidate_project_not_verified_safe_to_pause",
    );
  });

  it("requires impact review, restore verification and a separate explicit pause approval", () => {
    const decision = evaluateProviderCapacityRecovery(
      exhaustedCapacity(),
      "pause_existing_project",
      {
        candidateProjectId: "existing-project",
        candidateProjectPauseSafety: "verified_safe_to_pause",
        candidateImpactReview: "proposed",
        candidateRestorePath: "configured_unverified",
        pauseApproval: "proposed",
      },
    );

    expect(decision.externalMutationMayExecute).toBe(false);
    expect(decision.blockers.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "candidate_impact_review_missing",
        "candidate_restore_path_unverified",
        "pause_approval_missing",
      ]),
    );
  });

  it("can authorize a pause mutation only after every pause-specific safeguard is satisfied", () => {
    const decision = evaluateProviderCapacityRecovery(
      exhaustedCapacity(),
      "pause_existing_project",
      {
        candidateProjectId: "verified-pause-candidate",
        candidateProjectPauseSafety: "verified_safe_to_pause",
        candidateImpactReview: "approved",
        candidateRestorePath: "verified",
        pauseApproval: "approved",
      },
    );

    expect(decision.state).toBe("authorized_for_recovery_mutation");
    expect(decision.externalMutationMayExecute).toBe(true);
    expect(decision.capacityRecheckRequired).toBe(true);
    expect(decision.projectCreationMayExecute).toBe(false);
  });

  it("treats an alternate organization as a new capacity context, not as direct creation authority", () => {
    const decision = evaluateProviderCapacityRecovery(
      exhaustedCapacity(),
      "alternate_organization",
      {
        alternateOrganizationId: "other-org",
        alternateOrganizationSelection: "approved",
        alternateOrganizationCapacity: "available",
        alternateOrganizationCostQuote: "verified",
        alternateOrganizationCostApproval: "approved",
      },
    );

    expect(decision.state).toBe("ready_for_capacity_recheck");
    expect(decision.externalMutationMayExecute).toBe(false);
    expect(decision.capacityRecheckRequired).toBe(true);
    expect(decision.projectCreationMayExecute).toBe(false);
  });

  it("blocks an alternate organization when its capacity or pricing is not fully verified and approved", () => {
    const decision = evaluateProviderCapacityRecovery(
      exhaustedCapacity(),
      "alternate_organization",
      {
        alternateOrganizationId: "other-org",
        alternateOrganizationSelection: "approved",
        alternateOrganizationCapacity: "unknown",
        alternateOrganizationCostQuote: "configured_unverified",
        alternateOrganizationCostApproval: "proposed",
      },
    );

    expect(decision.state).toBe("recovery_blocked");
    expect(decision.blockers.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "alternate_organization_capacity_unavailable",
        "alternate_organization_cost_quote_unverified",
        "alternate_organization_cost_approval_missing",
      ]),
    );
  });

  it("can authorize a plan-upgrade mutation only with current quote and separate billing approvals", () => {
    const blocked = evaluateProviderCapacityRecovery(
      exhaustedCapacity(),
      "plan_upgrade",
      {
        planUpgradeQuote: "configured_unverified",
        billingOwnerApproval: "proposed",
        planUpgradeApproval: "proposed",
      },
    );

    expect(blocked.state).toBe("recovery_blocked");
    expect(blocked.externalMutationMayExecute).toBe(false);

    const authorized = evaluateProviderCapacityRecovery(
      exhaustedCapacity(),
      "plan_upgrade",
      {
        planUpgradeQuote: "verified",
        billingOwnerApproval: "approved",
        planUpgradeApproval: "approved",
      },
    );

    expect(authorized.state).toBe("authorized_for_recovery_mutation");
    expect(authorized.externalMutationMayExecute).toBe(true);
    expect(authorized.capacityRecheckRequired).toBe(true);
    expect(authorized.projectCreationMayExecute).toBe(false);
  });
});
