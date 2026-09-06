import { describe, expect, it } from "vitest";
import type {
  OpportunityRoute,
  OpportunityRouterResult,
} from "@/domain/opportunity/router";
import {
  buildDecisionActionProfile,
  buildDecisionActionProfiles,
} from "./action-profile";

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

describe("Decision Action Profile v0.23.7", () => {
  it("shows prepayment as self-service while separating user capital from service pricing", () => {
    const profile = buildDecisionActionProfile(route({
      routeCode: "R1_PREPAGO_PLAZO",
      title: "Reducir plazo",
      status: "eligible_now",
      precision: "C2",
    }), "2026-09-06");

    expect(profile.effectKind).toBe("shorten_term");
    expect(profile.precision).toBe("C2");
    expect(profile.availability.selfService).toBe("available");
    expect(profile.availability.assisted).toBe("not_productized");
    expect(profile.cost.userCapitalRequirement).toBe("required_for_execution");
    expect(profile.cost.assistedServicePricing).toBe("not_applicable");
    expect(profile.cost.externalCosts).toBe("not_modeled");
    expect(profile.disclosures.join(" ")).toMatch(/capital adicional lo aporta el usuario/i);
  });

  it("exposes R7 as preparation plus the existing assisted mortgage-audit preview without inventing a price", () => {
    const profile = buildDecisionActionProfile(route({
      routeCode: "R7_RECLAMACION",
      title: "Auditar una diferencia",
      status: "candidate",
      precision: "C1",
      humanReviewRequired: true,
      requiredEvidence: ["Extracto con la diferencia"],
    }), "2026-09-06");

    expect(profile.effectKind).toBe("clarify_or_correct_inconsistency");
    expect(profile.availability.selfService).toBe("preparation_only");
    expect(profile.availability.assisted).toBe("mortgage_audit_preview");
    expect(profile.availability.professionalReview).toBe("required");
    expect(profile.cost.assistedServicePricing).toBe("not_quoted_preview");
    expect(profile.disclosures.join(" ")).toMatch(/precio final.*no están activos/i);
    expect(profile.effort.professionalTaskCount).toBeGreaterThan(0);
  });

  it("makes legal-review routes inappropriate for ordinary self-service and does not imply a productized legal service", () => {
    const profile = buildDecisionActionProfile(route({
      routeCode: "R10_EXECUTIVE_DEFENSE",
      title: "Revisión jurídica prioritaria",
      status: "legal_review",
      humanReviewRequired: true,
      requiredEvidence: ["Mandamiento de pago"],
    }), "2026-09-06");

    expect(profile.effectKind).toBe("protect_legal_position");
    expect(profile.availability.selfService).toBe("not_appropriate");
    expect(profile.availability.assisted).toBe("not_productized");
    expect(profile.availability.professionalReview).toBe("required");
    expect(profile.cost.assistedServicePricing).toBe("not_available_in_preview");
    expect(profile.disclosures.join(" ")).toMatch(/no significa que exista aquí un servicio jurídico contratado/i);
  });

  it("uses Case Plan tasks and evidence as objective effort signals rather than a subjective score", () => {
    const profile = buildDecisionActionProfile(route({
      routeCode: "R5_CESION_546_24",
      title: "Preparar cesión",
      status: "candidate",
      reasonCodes: ["binding_transfer_offer_missing"],
      requiredEvidence: ["Oferta vinculante"],
    }), "2026-09-06");

    expect(profile.effort.userTaskCount).toBeGreaterThanOrEqual(0);
    expect(profile.effort.evidenceItemCount).toBeGreaterThan(0);
    expect(profile.effort.conditionalTaskCount).toBeGreaterThanOrEqual(0);
    expect(profile.availability.selfService).toBe("preparation_only");
    expect(profile.cost.externalCosts).toBe("not_modeled");
  });

  it("builds one action profile per current router route and preserves route precision independently", () => {
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
    const result: OpportunityRouterResult = {
      asOfDate: "2026-09-06",
      routes: [r1, r7],
      primaryRoute: r1,
      notices: [],
    };

    const profiles = buildDecisionActionProfiles(result);

    expect(profiles).toHaveLength(2);
    expect(profiles.find((item) => item.routeCode === "R1_PREPAGO_PLAZO")?.precision).toBe("C2");
    expect(profiles.find((item) => item.routeCode === "R7_RECLAMACION")?.precision).toBe("C1");
  });
});
