import { describe, expect, it } from "vitest";
import type {
  OpportunityRoute,
  OpportunityRouterResult,
} from "@/domain/opportunity/router";
import {
  createDecisionBrief,
  createDecisionObject,
} from "./evaluator";

function route(
  overrides: Partial<OpportunityRoute> & Pick<OpportunityRoute, "routeCode" | "title">,
): OpportunityRoute {
  return {
    routeCode: overrides.routeCode,
    title: overrides.title,
    status: overrides.status ?? "candidate",
    priority: overrides.priority ?? 50,
    reasonCodes: overrides.reasonCodes ?? ["test_reason"],
    blockers: overrides.blockers ?? [],
    requiredEvidence: overrides.requiredEvidence ?? [],
    legalBasis: overrides.legalBasis ?? [],
    humanReviewRequired: overrides.humanReviewRequired ?? false,
    nextAction: overrides.nextAction ?? "Revisar la ruta antes de ejecutar.",
    precision: overrides.precision ?? "C1",
    ...(overrides.caveat ? { caveat: overrides.caveat } : {}),
  };
}

function result(routes: OpportunityRoute[], primaryRoute: OpportunityRoute | null = routes[0] ?? null): OpportunityRouterResult {
  return {
    asOfDate: "2026-09-05",
    routes,
    primaryRoute,
    notices: [],
  };
}

describe("Mi Decisión v0.23.4", () => {
  it("keeps precision attached to each route instead of silently upgrading all options", () => {
    const r1 = route({
      routeCode: "R1_PREPAGO_PLAZO",
      title: "Reducir plazo",
      status: "eligible_now",
      precision: "C2",
      priority: 72,
    });
    const r2 = route({
      routeCode: "R2_PREPAGO_CUOTA",
      title: "Reducir cuota",
      status: "eligible_now",
      precision: "C1",
      priority: 58,
    });

    const decision = createDecisionObject({
      routerResult: result([r1, r2], r1),
      selectedRouteCode: "R1_PREPAGO_PLAZO",
    });

    expect(decision.state).toBe("selection_recorded_local");
    expect(decision.decisionPrecision).toBe("C2");
    expect(decision.options.find((option) => option.routeCode === "R1_PREPAGO_PLAZO")?.precision).toBe("C2");
    expect(decision.options.find((option) => option.routeCode === "R2_PREPAGO_CUOTA")?.precision).toBe("C1");
    expect(decision.truthBoundary.precisionIsNotApproval).toBe(true);
    expect(decision.truthBoundary.thirdPartyDecisionOccurred).toBe(false);
  });

  it("records a user preference locally without pretending execution occurred", () => {
    const r1 = route({
      routeCode: "R1_PREPAGO_PLAZO",
      title: "Reducir plazo",
      status: "eligible_now",
      precision: "C2",
    });

    const decision = createDecisionObject({
      routerResult: result([r1]),
      selectedRouteCode: "R1_PREPAGO_PLAZO",
    });
    const brief = createDecisionBrief(decision);

    expect(decision.selectedRouteCode).toBe("R1_PREPAGO_PLAZO");
    expect(decision.governingRouteCode).toBe("R1_PREPAGO_PLAZO");
    expect(decision.truthBoundary.executionOccurred).toBe(false);
    expect(decision.truthBoundary.guaranteedOutcome).toBe(false);
    expect(brief.statusLabel).toMatch(/Preferencia registrada/i);
    expect(brief.summary).toMatch(/no ejecuta una instrucción/i);
    expect(brief.disclosures.join(" ")).toMatch(/no constituye ahorro garantizado/i);
  });

  it("makes R10 govern the next step even when an ordinary optimization was selected", () => {
    const r10 = route({
      routeCode: "R10_EXECUTIVE_DEFENSE",
      title: "Revisión jurídica prioritaria del proceso",
      status: "legal_review",
      precision: "C1",
      priority: 100,
      humanReviewRequired: true,
      blockers: ["La estrategia procesal requiere revisión individual."],
      requiredEvidence: ["Mandamiento de pago"],
      nextAction: "Priorizar revisión por abogado.",
    });
    const r1 = route({
      routeCode: "R1_PREPAGO_PLAZO",
      title: "Reducir plazo",
      status: "eligible_now",
      precision: "C2",
      priority: 72,
    });

    const decision = createDecisionObject({
      routerResult: result([r10, r1], r10),
      selectedRouteCode: "R1_PREPAGO_PLAZO",
    });
    const brief = createDecisionBrief(decision);

    expect(decision.state).toBe("professional_review_required");
    expect(decision.selectedRouteCode).toBe("R1_PREPAGO_PLAZO");
    expect(decision.governingRouteCode).toBe("R10_EXECUTIVE_DEFENSE");
    expect(decision.decisionPrecision).toBe("C1");
    expect(decision.requiresProfessionalReview).toBe(true);
    expect(decision.warnings.join(" ")).toMatch(/no desplaza la revisión jurídica prioritaria/i);
    expect(brief.nextAction).toBe("Priorizar revisión por abogado.");
    expect(brief.verificationNeeds).toContain("Mandamiento de pago");
  });

  it("fails closed when a selected route is not present in the current router result", () => {
    const r1 = route({
      routeCode: "R1_PREPAGO_PLAZO",
      title: "Reducir plazo",
    });

    expect(() => createDecisionObject({
      routerResult: result([r1]),
      selectedRouteCode: "R5_CESION_546_24",
    })).toThrow(/decision-selection-not-in-current-router-result/i);
  });

  it("does not invent a route when the router has no options", () => {
    const decision = createDecisionObject({
      routerResult: result([], null),
    });
    const brief = createDecisionBrief(decision);

    expect(decision.state).toBe("insufficient_options");
    expect(decision.governingRouteCode).toBeNull();
    expect(decision.decisionPrecision).toBeNull();
    expect(brief.nextAction).toBeNull();
  });

  it("preserves C3 only when the governing route already earned C3", () => {
    const verifiedClaim = route({
      routeCode: "R7_RECLAMACION",
      title: "Auditar una diferencia documentada",
      status: "candidate",
      precision: "C3",
      requiredEvidence: ["Respuesta del banco"],
    });

    const decision = createDecisionObject({
      routerResult: result([verifiedClaim], verifiedClaim),
    });

    expect(decision.state).toBe("ready_for_choice");
    expect(decision.decisionPrecision).toBe("C3");
    expect(decision.truthBoundary.thirdPartyDecisionOccurred).toBe(false);
  });
});
