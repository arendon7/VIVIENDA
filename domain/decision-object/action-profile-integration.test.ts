import { describe, expect, it } from "vitest";
import type { OpportunityRoute, OpportunityRouterResult } from "@/domain/opportunity/router";
import { createDecisionObject } from "./evaluator";

function route(overrides: Partial<OpportunityRoute> & Pick<OpportunityRoute, "routeCode" | "title">): OpportunityRoute {
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

describe("Decision Object action-profile integration v0.23.7", () => {
  it("embeds one current profile per route without collapsing route precision", () => {
    const r1 = route({
      routeCode: "R1_PREPAGO_PLAZO",
      title: "Reducir plazo",
      status: "eligible_now",
      precision: "C2",
    });
    const r7 = route({
      routeCode: "R7_RECLAMACION",
      title: "Auditar diferencia",
      precision: "C1",
      humanReviewRequired: true,
    });
    const routerResult: OpportunityRouterResult = {
      asOfDate: "2026-09-06",
      routes: [r1, r7],
      primaryRoute: r1,
      notices: [],
    };

    const decision = createDecisionObject({ routerResult });

    expect(decision.actionProfiles).toHaveLength(decision.options.length);
    expect(decision.actionProfiles.find((item) => item.routeCode === "R1_PREPAGO_PLAZO")?.precision).toBe("C2");
    expect(decision.actionProfiles.find((item) => item.routeCode === "R7_RECLAMACION")?.precision).toBe("C1");
    expect(decision.actionProfiles.find((item) => item.routeCode === "R7_RECLAMACION")?.availability.assisted).toBe("mortgage_audit_preview");
  });

  it("keeps action profiles empty when no current route exists", () => {
    const routerResult: OpportunityRouterResult = {
      asOfDate: "2026-09-06",
      routes: [],
      primaryRoute: null,
      notices: [],
    };

    const decision = createDecisionObject({ routerResult });

    expect(decision.state).toBe("insufficient_options");
    expect(decision.actionProfiles).toEqual([]);
  });
});
