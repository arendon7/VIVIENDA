import { describe, expect, it } from "vitest";
import {
  evaluateOpportunityRoutes,
  type OpportunityRouterInput,
} from "@/domain/opportunity/router";
import { evaluateIntegratedOpportunityRoutes } from "./integration";
import { evaluateLoanHealth } from "./evaluator";

const baseInput: OpportunityRouterInput = {
  asOfDate: "2026-08-26",
  precision: "C2",
  productType: "mortgage_housing",
  modality: "pesos",
  paymentState: "current",
};

function health(overrides: Partial<OpportunityRouterInput> = {}) {
  const routerInput: OpportunityRouterInput = { ...baseInput, ...overrides };
  const routerResult = evaluateOpportunityRoutes(routerInput);

  return evaluateLoanHealth({
    precision: routerInput.precision,
    productType: routerInput.productType,
    paymentState: routerInput.paymentState,
    routerResult,
  });
}

function dimension(result: ReturnType<typeof health>, code: string) {
  const match = result.dimensions.find((item) => item.code === code);
  if (!match) throw new Error(`Missing dimension ${code}`);
  return match;
}

describe("Loan Health v0.21", () => {
  it("uses improve_precision at C1 instead of inventing a health score", () => {
    const result = health({ precision: "C1" });

    expect(result.decisionState).toBe("improve_precision");
    expect(dimension(result, "structure_understanding").status).toBe("needs_data");
    expect(result).not.toHaveProperty("score");
  });

  it("marks prepayment actionable only when an eligible route has no blocker", () => {
    const modeled = health({
      precision: "C2",
      extraPaymentCapacity: 500_000,
      wantsFinishSooner: true,
    });
    const declared = health({
      precision: "C1",
      extraPaymentCapacity: 500_000,
      wantsFinishSooner: true,
    });

    expect(dimension(modeled, "prepayment").status).toBe("ready");
    expect(modeled.decisionState).toBe("actionable_opportunity");
    expect(dimension(declared, "prepayment").status).toBe("explore");
    expect(declared.decisionState).toBe("improve_precision");
  });

  it("keeps the Mortgage Twin at C1 while recognizing a route-specific C2 model", () => {
    const routerInput: OpportunityRouterInput = {
      ...baseInput,
      precision: "C1",
      extraPaymentCapacity: 500_000,
      wantsFinishSooner: true,
    };
    const routerResult = evaluateIntegratedOpportunityRoutes(routerInput, {
      prepaymentTermScenario: "modeled_c2",
    });

    const result = evaluateLoanHealth({
      precision: routerInput.precision,
      productType: routerInput.productType,
      paymentState: routerInput.paymentState,
      routerResult,
    });

    expect(result.precision).toBe("C1");
    expect(dimension(result, "structure_understanding").status).toBe("explore");
    expect(dimension(result, "structure_understanding").sourceRouteCodes).toEqual(["R1_PREPAGO_PLAZO"]);
    expect(dimension(result, "prepayment").status).toBe("ready");
    expect(result.decisionState).toBe("actionable_opportunity");
    expect(result.notices.join(" ")).toMatch(/R1_PREPAGO_PLAZO C2/);
    expect(result.notices.join(" ")).toMatch(/fuente base permanece en C1/i);
  });

  it("does not manufacture route-specific precision when the model is absent", () => {
    const routerInput: OpportunityRouterInput = {
      ...baseInput,
      precision: "C1",
      extraPaymentCapacity: 500_000,
      wantsFinishSooner: true,
    };
    const routerResult = evaluateIntegratedOpportunityRoutes(routerInput, {
      prepaymentTermScenario: "not_modeled",
    });

    const result = evaluateLoanHealth({
      precision: routerInput.precision,
      productType: routerInput.productType,
      paymentState: routerInput.paymentState,
      routerResult,
    });

    expect(dimension(result, "structure_understanding").status).toBe("needs_data");
    expect(dimension(result, "prepayment").status).toBe("explore");
    expect(result.decisionState).toBe("improve_precision");
    expect(result.notices.join(" ")).not.toMatch(/R1_PREPAGO_PLAZO C2/);
  });

  it("prioritizes executive or embargo state over ordinary optimization", () => {
    const result = health({
      paymentState: "embargo_or_auction",
      extraPaymentCapacity: 2_000_000,
      wantsFinishSooner: true,
    });

    expect(dimension(result, "procedural_state").status).toBe("professional_review");
    expect(result.decisionState).toBe("professional_review_priority");
    expect(result.headline).toContain("revisarse profesionalmente");
  });

  it("keeps professional review dominant even when R1 has a route-specific C2 model", () => {
    const routerInput: OpportunityRouterInput = {
      ...baseInput,
      precision: "C1",
      paymentState: "executive",
      extraPaymentCapacity: 500_000,
      wantsFinishSooner: true,
    };
    const routerResult = evaluateIntegratedOpportunityRoutes(routerInput, {
      prepaymentTermScenario: "modeled_c2",
    });

    const result = evaluateLoanHealth({
      precision: routerInput.precision,
      productType: routerInput.productType,
      paymentState: routerInput.paymentState,
      routerResult,
    });

    expect(dimension(result, "prepayment").status).toBe("ready");
    expect(dimension(result, "procedural_state").status).toBe("professional_review");
    expect(result.decisionState).toBe("professional_review_priority");
  });

  it("treats collections as attention even without a judicial proceeding", () => {
    const result = health({ paymentState: "collections" });

    expect(dimension(result, "procedural_state").status).toBe("attention");
    expect(result.decisionState).toBe("attention_required");
  });

  it("turns a reported inconsistency into attention without declaring a violation", () => {
    const result = health({ unexplainedChargeOrAllocationIssue: true });
    const consistency = dimension(result, "consistency");

    expect(consistency.status).toBe("attention");
    expect(result.decisionState).toBe("attention_required");
    expect(consistency.explanation).toContain("no equivale por sí solo a demostrar un incumplimiento jurídico");
  });

  it("preserves the seasonal Article 20 state outside January-February", () => {
    const result = health({
      materialEconomicChange: true,
      currentAccreditedFamilyIncome: 8_000_000,
      proposedRestructuredFirstInstallment: 2_400_000,
    });

    expect(dimension(result, "restructuring").status).toBe("seasonal");
  });

  it("can mark Article 20 ready in-window without calling it approval", () => {
    const result = health({
      asOfDate: "2026-01-15",
      materialEconomicChange: true,
      currentAccreditedFamilyIncome: 8_000_000,
      proposedRestructuredFirstInstallment: 2_400_000,
    });

    expect(dimension(result, "restructuring").status).toBe("ready");
    expect(result.decisionState).toBe("actionable_opportunity");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("aprobado");
  });

  it("uses no_flag_reported without certifying lender correctness", () => {
    const result = health();
    const consistency = dimension(result, "consistency");

    expect(consistency.status).toBe("no_flag_reported");
    expect(consistency.explanation).toContain("no demuestra");
  });
});
