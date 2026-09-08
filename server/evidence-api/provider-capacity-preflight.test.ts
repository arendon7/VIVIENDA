import { describe, expect, it } from "vitest";
import {
  emptyDevProviderCapacityFacts,
  evaluateDevProviderCapacityPreflight,
  providerCapacityProducesNoEnvironmentQualificationFacts,
  providerCapacityProducesNoRuntimeActivationFacts,
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

function approvedAuthorization() {
  return evaluateDevProvisioningAuthorization(
    evaluateProvisioningBlueprint(approvedProvisioningPlanFacts()),
    approvedDevProvisioningAuthorizationFacts(),
  );
}

describe("DEV provider capacity preflight", () => {
  it("fails closed when the parent DEV authorization is incomplete", () => {
    const authorization = evaluateDevProvisioningAuthorization(
      evaluateProvisioningBlueprint(),
      {},
    );

    const decision = evaluateDevProviderCapacityPreflight(
      authorization,
      verifiedAvailableDevProviderCapacityFacts(0),
    );

    expect(decision.state).toBe("authorization_blocked");
    expect(decision.providerCreationMayExecute).toBe(false);
    expect(decision.blockers.map((item) => item.code)).toContain(
      "parent_authorization_incomplete",
    );
  });

  it("does not infer provider capacity from an otherwise approved zero-cost creation", () => {
    const facts = verifiedAvailableDevProviderCapacityFacts(0);
    facts.capacityObservation = "missing";
    facts.projectCapacity = "unknown";

    const decision = evaluateDevProviderCapacityPreflight(approvedAuthorization(), facts);

    expect(decision.quotedProjectCreationCost).toBe(0);
    expect(decision.state).toBe("capacity_unverified");
    expect(decision.providerCreationMayExecute).toBe(false);
    expect(decision.blockers.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "capacity_observation_unverified",
        "project_capacity_unknown",
      ]),
    );
  });

  it("blocks creation when the provider has explicitly reported exhausted project capacity even at zero cost", () => {
    const facts = verifiedAvailableDevProviderCapacityFacts(0);
    facts.projectCapacity = "exhausted";

    const decision = evaluateDevProviderCapacityPreflight(approvedAuthorization(), facts);

    expect(decision.state).toBe("capacity_exhausted");
    expect(decision.providerCreationMayExecute).toBe(false);
    expect(decision.quotedProjectCreationCost).toBe(0);
    expect(decision.blockers.map((item) => item.code)).toContain(
      "project_capacity_exhausted",
    );
  });

  it("treats stale quota observations as unverified even when they previously showed available capacity", () => {
    const facts = verifiedAvailableDevProviderCapacityFacts(0);
    facts.capacityObservation = "stale";

    const decision = evaluateDevProviderCapacityPreflight(approvedAuthorization(), facts);

    expect(decision.state).toBe("capacity_unverified");
    expect(decision.providerCreationMayExecute).toBe(false);
    expect(decision.blockers.map((item) => item.code)).toContain(
      "capacity_observation_unverified",
    );
  });

  it("requires a current cost quote independently from capacity availability", () => {
    const facts = verifiedAvailableDevProviderCapacityFacts(0);
    facts.costQuote = "stale";

    const decision = evaluateDevProviderCapacityPreflight(approvedAuthorization(), facts);

    expect(decision.state).toBe("capacity_unverified");
    expect(decision.providerCreationMayExecute).toBe(false);
    expect(decision.blockers.map((item) => item.code)).toContain(
      "cost_quote_unverified",
    );
  });

  it("requires a current cost confirmation independently from a current zero-cost quote", () => {
    const facts = verifiedAvailableDevProviderCapacityFacts(0);
    facts.costConfirmation = "missing";

    const decision = evaluateDevProviderCapacityPreflight(approvedAuthorization(), facts);

    expect(decision.providerCreationMayExecute).toBe(false);
    expect(decision.blockers.map((item) => item.code)).toContain(
      "cost_confirmation_unverified",
    );
  });

  it("permits the provider creation call only when authorization, organization, capacity and cost are all current", () => {
    const decision = evaluateDevProviderCapacityPreflight(
      approvedAuthorization(),
      verifiedAvailableDevProviderCapacityFacts(0),
    );

    expect(decision.state).toBe("ready_for_provider_creation");
    expect(decision.providerCreationMayExecute).toBe(true);
    expect(decision.blockers).toHaveLength(0);
  });

  it("defaults to a fully fail-closed capacity snapshot", () => {
    const facts = emptyDevProviderCapacityFacts();
    const decision = evaluateDevProviderCapacityPreflight(approvedAuthorization(), facts);

    expect(facts.projectCapacity).toBe("unknown");
    expect(decision.providerCreationMayExecute).toBe(false);
  });

  it("does not convert a provider-capacity check into DEV qualification or runtime activation facts", () => {
    const decision = evaluateDevProviderCapacityPreflight(
      approvedAuthorization(),
      verifiedAvailableDevProviderCapacityFacts(0),
    );

    expect(decision.providerCreationMayExecute).toBe(true);
    expect(providerCapacityProducesNoEnvironmentQualificationFacts()).toEqual({});
    expect(providerCapacityProducesNoRuntimeActivationFacts()).toEqual({});
  });
});
