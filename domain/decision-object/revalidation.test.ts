import { describe, expect, it } from "vitest";
import type {
  OpportunityRoute,
  OpportunityRouterResult,
} from "@/domain/opportunity/router";
import { createDecisionObject } from "./evaluator";
import {
  captureDecisionBasis,
  revalidateDecisionBasis,
} from "./revalidation";

function route(
  overrides: Partial<OpportunityRoute> & Pick<OpportunityRoute, "routeCode" | "title">,
): OpportunityRoute {
  return {
    routeCode: overrides.routeCode,
    title: overrides.title,
    status: overrides.status ?? "eligible_now",
    priority: overrides.priority ?? 50,
    reasonCodes: overrides.reasonCodes ?? ["test_reason"],
    blockers: overrides.blockers ?? [],
    requiredEvidence: overrides.requiredEvidence ?? [],
    legalBasis: overrides.legalBasis ?? [],
    humanReviewRequired: overrides.humanReviewRequired ?? false,
    nextAction: overrides.nextAction ?? "Continuar con esta ruta.",
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

function selectedBasis(routerResult: OpportunityRouterResult, selectedRouteCode: OpportunityRoute["routeCode"]) {
  return captureDecisionBasis(createDecisionObject({
    routerResult,
    selectedRouteCode,
  }));
}

describe("Decision revalidation v0.23.6", () => {
  it("keeps a decision current when its material basis did not change", () => {
    const r1 = route({
      routeCode: "R1_PREPAGO_PLAZO",
      title: "Reducir plazo",
      precision: "C2",
      requiredEvidence: ["Extracto", "Tasa"],
      blockers: ["Confirmar instrucción"],
    });
    const original = result([r1]);
    const basis = selectedBasis(original, "R1_PREPAGO_PLAZO");

    const reordered = route({
      ...r1,
      blockers: ["Confirmar instrucción"],
      requiredEvidence: ["Tasa", "Extracto"],
    });
    const revalidation = revalidateDecisionBasis(basis, result([reordered]));

    expect(revalidation.status).toBe("current");
    expect(revalidation.reasons).toEqual([]);
  });

  it("fails closed when the selected route disappeared", () => {
    const r1 = route({
      routeCode: "R1_PREPAGO_PLAZO",
      title: "Reducir plazo",
    });
    const basis = selectedBasis(result([r1]), "R1_PREPAGO_PLAZO");

    const revalidation = revalidateDecisionBasis(basis, result([], null));

    expect(revalidation.status).toBe("selection_invalid");
    expect(revalidation.reasons).toEqual(["selected_route_removed"]);
    expect(revalidation.current).toBeNull();
    expect(revalidation.decision).toBeNull();
  });

  it("requires review when a modeled route loses precision", () => {
    const modeled = route({
      routeCode: "R1_PREPAGO_PLAZO",
      title: "Reducir plazo",
      precision: "C2",
    });
    const basis = selectedBasis(result([modeled]), "R1_PREPAGO_PLAZO");

    const downgraded = route({
      routeCode: "R1_PREPAGO_PLAZO",
      title: "Reducir plazo",
      precision: "C1",
    });
    const revalidation = revalidateDecisionBasis(basis, result([downgraded]));

    expect(revalidation.status).toBe("review_required");
    expect(revalidation.reasons).toContain("precision_changed");
    expect(revalidation.current?.governingPrecision).toBe("C1");
  });

  it("requires review when R10 becomes the governing route", () => {
    const r1 = route({
      routeCode: "R1_PREPAGO_PLAZO",
      title: "Reducir plazo",
      precision: "C2",
      priority: 70,
    });
    const basis = selectedBasis(result([r1], r1), "R1_PREPAGO_PLAZO");

    const r10 = route({
      routeCode: "R10_EXECUTIVE_DEFENSE",
      title: "Revisión jurídica prioritaria",
      status: "legal_review",
      priority: 100,
      precision: "C1",
      humanReviewRequired: true,
      blockers: ["Requiere revisión individual."],
      requiredEvidence: ["Mandamiento de pago"],
      nextAction: "Priorizar revisión por abogado.",
    });
    const revalidation = revalidateDecisionBasis(basis, result([r10, r1], r10));

    expect(revalidation.status).toBe("review_required");
    expect(revalidation.reasons).toContain("governing_route_changed");
    expect(revalidation.reasons).toContain("precision_changed");
    expect(revalidation.reasons).toContain("status_changed");
    expect(revalidation.reasons).toContain("professional_review_changed");
    expect(revalidation.current?.governingRouteCode).toBe("R10_EXECUTIVE_DEFENSE");
    expect(revalidation.decision?.requiresProfessionalReview).toBe(true);
  });

  it("treats blockers, evidence and next action as material decision basis", () => {
    const r1 = route({
      routeCode: "R1_PREPAGO_PLAZO",
      title: "Reducir plazo",
      blockers: ["Bloqueo A"],
      requiredEvidence: ["Documento A"],
      nextAction: "Paso A",
    });
    const basis = selectedBasis(result([r1]), "R1_PREPAGO_PLAZO");

    const changed = route({
      ...r1,
      blockers: ["Bloqueo B"],
      requiredEvidence: ["Documento B"],
      nextAction: "Paso B",
    });
    const revalidation = revalidateDecisionBasis(basis, result([changed]));

    expect(revalidation.status).toBe("review_required");
    expect(revalidation.reasons).toEqual(expect.arrayContaining([
      "blockers_changed",
      "required_evidence_changed",
      "next_action_changed",
    ]));
  });

  it("does not revalidate merely because router notices changed", () => {
    const r1 = route({
      routeCode: "R1_PREPAGO_PLAZO",
      title: "Reducir plazo",
      precision: "C2",
    });
    const original = result([r1]);
    const basis = selectedBasis(original, "R1_PREPAGO_PLAZO");
    const changedNotices = {
      ...original,
      notices: ["Nueva nota informativa sin cambio en la ruta gobernante."],
    };

    const revalidation = revalidateDecisionBasis(basis, changedNotices);

    expect(revalidation.status).toBe("current");
  });

  it("refuses to capture a basis before the user selected a route", () => {
    const r1 = route({
      routeCode: "R1_PREPAGO_PLAZO",
      title: "Reducir plazo",
    });
    const decision = createDecisionObject({ routerResult: result([r1]) });

    expect(() => captureDecisionBasis(decision)).toThrow(/decision-basis-requires-selected-route/i);
  });
});
