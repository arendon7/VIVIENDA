import { describe, expect, it } from "vitest";
import {
  DEV_PROVIDER_PROFILE,
  approvedDevProvisioningAuthorizationFacts,
  devQualificationProducesNoRuntimeActivationFacts,
  evaluateDevEnvironmentQualification,
  evaluateDevProvisioningAuthorization,
  verifiedDevEnvironmentQualificationFacts,
} from "./dev-provisioning-qualification";
import {
  approvedProvisioningPlanFacts,
  evaluateProvisioningBlueprint,
} from "./provisioning-blueprint";

describe("DEV provisioning authorization", () => {
  it("fails closed when neither the V0.23.13 blueprint nor DEV authorization is complete", () => {
    const decision = evaluateDevProvisioningAuthorization(
      evaluateProvisioningBlueprint(),
      {},
    );

    expect(decision.state).toBe("not_authorized");
    expect(decision.projectCreationMayBeRequested).toBe(false);
    expect(decision.blueprintApproved).toBe(false);
    expect(decision.approvedRequirementCount).toBe(0);
    expect(decision.blockers).toHaveLength(decision.totalRequirementCount);
  });

  it("does not permit project creation when DEV-specific approvals exist but the parent blueprint is not approved", () => {
    const decision = evaluateDevProvisioningAuthorization(
      evaluateProvisioningBlueprint(),
      approvedDevProvisioningAuthorizationFacts(),
    );

    expect(decision.state).toBe("partially_authorized");
    expect(decision.projectCreationMayBeRequested).toBe(false);
    expect(decision.blueprintApproved).toBe(false);
    expect(decision.blockers).toHaveLength(0);
  });

  it("does not treat proposed provider cost or region as explicit approval", () => {
    const facts = approvedDevProvisioningAuthorizationFacts();
    facts.provider_cost_approval_recorded = "proposed";
    facts.development_region_approved = "proposed";

    const decision = evaluateDevProvisioningAuthorization(
      evaluateProvisioningBlueprint(approvedProvisioningPlanFacts()),
      facts,
    );

    expect(decision.projectCreationMayBeRequested).toBe(false);
    expect(decision.blockers.map((blocker) => blocker.code)).toEqual([
      "provider_cost_approval_recorded",
      "development_region_approved",
    ]);
  });

  it("permits only requesting the cost-confirmed creation action after both gates are approved", () => {
    const decision = evaluateDevProvisioningAuthorization(
      evaluateProvisioningBlueprint(approvedProvisioningPlanFacts()),
      approvedDevProvisioningAuthorizationFacts(),
    );

    expect(decision.state).toBe("authorized_for_cost_confirmed_creation");
    expect(decision.projectCreationMayBeRequested).toBe(true);
    expect(decision.approvedRequirementCount).toBe(decision.totalRequirementCount);
  });

  it("publishes a conservative DEV provider profile without implying an external project already exists", () => {
    expect(DEV_PROVIDER_PROFILE).toMatchObject({
      provider: "supabase",
      projectRole: "development",
      recommendedProjectName: "vivienda-dev",
      recommendedRegion: "sa-east-1",
      dataPolicy: "synthetic_only",
      evidenceRuntimeDefault: "fail_closed",
      secretsVisibility: "server_only",
      projectIsolation: "dedicated_project",
      databaseAndStorageRecoveryAreSeparate: true,
      freshProviderCostConfirmationRequired: true,
      explicitOrganizationSelectionRequired: true,
    });
  });
});

describe("DEV environment qualification", () => {
  it("remains not provisioned when no real project existence has been verified", () => {
    const decision = evaluateDevEnvironmentQualification();

    expect(decision.state).toBe("not_provisioned");
    expect(decision.devEnvironmentVerified).toBe(false);
    expect(decision.liveRuntimeAuthorized).toBe(false);
  });

  it("marks an existing but incompletely verified project as provisioned_unqualified", () => {
    const decision = evaluateDevEnvironmentQualification({
      project_exists: "verified",
      project_role_matches_dev: "configured_unverified",
    });

    expect(decision.state).toBe("provisioned_unqualified");
    expect(decision.devEnvironmentVerified).toBe(false);
    expect(decision.blockers.map((blocker) => blocker.code)).toContain(
      "project_role_matches_dev",
    );
  });

  it("never treats configured_unverified as verification", () => {
    const facts = verifiedDevEnvironmentQualificationFacts();
    facts.private_storage_verified = "configured_unverified";

    const decision = evaluateDevEnvironmentQualification(facts);

    expect(decision.devEnvironmentVerified).toBe(false);
    expect(decision.blockers.map((blocker) => blocker.code)).toContain(
      "private_storage_verified",
    );
  });

  it("requires database recovery and Storage-object recovery as separate verified controls", () => {
    const facts = verifiedDevEnvironmentQualificationFacts();
    facts.storage_object_recovery_strategy_verified = "missing";

    const decision = evaluateDevEnvironmentQualification(facts);

    expect(decision.devEnvironmentVerified).toBe(false);
    expect(decision.blockers.map((blocker) => blocker.code)).toContain(
      "storage_object_recovery_strategy_verified",
    );
    expect(decision.requirements.find((item) => item.code === "database_recovery_verified")?.status).toBe(
      "verified",
    );
  });

  it("qualifies DEV only after every provider/environment fact is verified", () => {
    const decision = evaluateDevEnvironmentQualification(
      verifiedDevEnvironmentQualificationFacts(),
    );

    expect(decision.state).toBe("qualified_for_staging_candidate");
    expect(decision.devEnvironmentVerified).toBe(true);
    expect(decision.liveRuntimeAuthorized).toBe(false);
    expect(decision.verifiedRequirementCount).toBe(decision.totalRequirementCount);
    expect(decision.blockers).toHaveLength(0);
  });

  it("does not turn DEV qualification into V0.23.12 live-runtime activation facts", () => {
    const decision = evaluateDevEnvironmentQualification(
      verifiedDevEnvironmentQualificationFacts(),
    );
    const activationFacts = devQualificationProducesNoRuntimeActivationFacts();

    expect(decision.devEnvironmentVerified).toBe(true);
    expect(decision.liveRuntimeAuthorized).toBe(false);
    expect(activationFacts).toEqual({});
  });
});
