import { describe, expect, it } from "vitest";
import { buildDecisionActionProfile } from "@/domain/decision-object/action-profile";
import type { OpportunityRoute } from "@/domain/opportunity/router";
import {
  ExecutionIntentError,
  resolveExecutionIntents,
  selectExecutionIntent,
} from "./resolver";

function route(
  overrides: Partial<OpportunityRoute> & Pick<OpportunityRoute, "routeCode" | "title">,
): OpportunityRoute {
  return {
    routeCode: overrides.routeCode,
    title: overrides.title,
    status: overrides.status ?? "candidate",
    priority: overrides.priority ?? 50,
    reasonCodes: overrides.reasonCodes ?? [],
    blockers: overrides.blockers ?? [],
    requiredEvidence: overrides.requiredEvidence ?? [],
    legalBasis: overrides.legalBasis ?? [],
    humanReviewRequired: overrides.humanReviewRequired ?? false,
    nextAction: overrides.nextAction ?? "Revisar antes de continuar.",
    precision: overrides.precision ?? "C1",
    ...(overrides.caveat ? { caveat: overrides.caveat } : {}),
  };
}

function resolve(routeValue: OpportunityRoute) {
  return resolveExecutionIntents(
    routeValue,
    buildDecisionActionProfile(routeValue, "2026-09-06"),
  );
}

describe("Execution Intent v0.23.8", () => {
  it("requires an explicit self-preparation choice for an ordinary prepayment route", () => {
    const r1 = route({
      routeCode: "R1_PREPAGO_PLAZO",
      title: "Reducir plazo",
      status: "eligible_now",
      precision: "C2",
    });

    const resolution = resolve(r1);

    expect(resolution.requiresExplicitUserChoice).toBe(true);
    expect(resolution.selectedIntent).toBeNull();
    expect(resolution.options.map((item) => item.code)).toEqual(["prepare_self"]);
    expect(resolution.options[0].caseTrack).toBe("self_service");

    const selection = selectExecutionIntent(resolution, "prepare_self");
    expect(selection.caseTrack).toBe("self_service");
    expect(selection.createsCase).toBe(false);
    expect(selection.executesExternally).toBe(false);
    expect(selection.grantsAuthority).toBe(false);
  });

  it("lets R7 choose between self preparation and the existing assisted audit track", () => {
    const r7 = route({
      routeCode: "R7_RECLAMACION",
      title: "Auditar diferencia",
      status: "candidate",
      humanReviewRequired: true,
      requiredEvidence: ["Extracto con la diferencia"],
    });

    const resolution = resolve(r7);

    expect(resolution.options.map((item) => item.code)).toEqual([
      "prepare_self",
      "assisted_mortgage_audit",
    ]);
    expect(selectExecutionIntent(resolution, "prepare_self").caseTrack).toBe("self_service");

    const assisted = selectExecutionIntent(resolution, "assisted_mortgage_audit");
    expect(assisted.caseTrack).toBe("assisted");
    expect(assisted.serviceAgreementAccepted).toBe(false);
    expect(assisted.dataAuthorizationRecorded).toBe(false);
    expect(assisted.professionalEngagementCreated).toBe(false);
  });

  it("resolves R10 to legal review only", () => {
    const r10 = route({
      routeCode: "R10_EXECUTIVE_DEFENSE",
      title: "Revisión jurídica prioritaria",
      status: "legal_review",
      humanReviewRequired: true,
      requiredEvidence: ["Mandamiento de pago"],
    });

    const resolution = resolve(r10);

    expect(resolution.options.map((item) => item.code)).toEqual(["professional_review"]);
    expect(selectExecutionIntent(resolution, "professional_review").caseTrack).toBe("legal");
  });

  it("uses legal track for another route when ordinary self-service is not appropriate", () => {
    const r3 = route({
      routeCode: "R3_RESTRUCTURACION_546_20",
      title: "Reestructuración",
      status: "legal_review",
      humanReviewRequired: true,
    });

    const resolution = resolve(r3);

    expect(resolution.options).toHaveLength(1);
    expect(resolution.options[0].code).toBe("professional_review");
    expect(resolution.options[0].caseTrack).toBe("legal");
  });

  it("fails closed when selecting an unavailable assisted mode", () => {
    const r1 = route({
      routeCode: "R1_PREPAGO_PLAZO",
      title: "Reducir plazo",
      status: "eligible_now",
    });
    const resolution = resolve(r1);

    expect(() => selectExecutionIntent(resolution, "assisted_mortgage_audit")).toThrowError(ExecutionIntentError);
    try {
      selectExecutionIntent(resolution, "assisted_mortgage_audit");
    } catch (error) {
      expect((error as ExecutionIntentError).code).toBe("execution_intent_not_available");
    }
  });

  it("rejects a profile that belongs to a different route", () => {
    const r1 = route({ routeCode: "R1_PREPAGO_PLAZO", title: "Reducir plazo" });
    const r7 = route({ routeCode: "R7_RECLAMACION", title: "Auditar diferencia", humanReviewRequired: true });
    const r7Profile = buildDecisionActionProfile(r7, "2026-09-06");

    expect(() => resolveExecutionIntents(r1, r7Profile)).toThrowError(ExecutionIntentError);
    try {
      resolveExecutionIntents(r1, r7Profile);
    } catch (error) {
      expect((error as ExecutionIntentError).code).toBe("profile_route_mismatch");
    }
  });
});
