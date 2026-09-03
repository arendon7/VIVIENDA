import { describe, expect, it } from "vitest";
import {
  evaluateFinancingStructures,
  type FinancingDenominationCode,
  type FinancingStructureCode,
  type FinancingStructuresInput,
} from "./evaluator";

const neutralInput: FinancingStructuresInput = {
  ownershipTimingPreference: "unknown",
  paymentBehaviorPreference: "unknown",
};

function evaluate(overrides: Partial<FinancingStructuresInput> = {}) {
  return evaluateFinancingStructures({ ...neutralInput, ...overrides });
}

function structure(result: ReturnType<typeof evaluateFinancingStructures>, code: FinancingStructureCode) {
  const option = result.structureOptions.find((item) => item.code === code);
  if (!option) throw new Error(`Missing structure ${code}`);
  return option;
}

function denomination(result: ReturnType<typeof evaluateFinancingStructures>, code: FinancingDenominationCode) {
  const option = result.denominationOptions.find((item) => item.code === code);
  if (!option) throw new Error(`Missing denomination ${code}`);
  return option;
}

describe("Financing Structures v0.17", () => {
  it("keeps a fully unknown profile at C0 without creating a preferred option", () => {
    const result = evaluate();

    expect(result.precision).toBe("C0");
    expect(result.structureOptions.every((item) => item.priority === "needs_information")).toBe(true);
    expect(result.denominationOptions.every((item) => item.priority === "needs_information")).toBe(true);
    expect([...result.structureOptions, ...result.denominationOptions].some((item) => item.priority === "explore_first")).toBe(false);
  });

  it("routes mortgage first only when immediate ownership is explicitly preferred", () => {
    const result = evaluate({ ownershipTimingPreference: "title_from_purchase" });

    expect(result.precision).toBe("C1");
    expect(structure(result, "mortgage_credit").priority).toBe("explore_first");
    expect(structure(result, "housing_leasing").priority).toBe("secondary");
    expect(structure(result, "mortgage_credit").reasonCodes).toContain("immediate_title_preference_aligned");
    expect(structure(result, "housing_leasing").reasonCodes).toContain("later_acquisition_option_conflicts_with_preference");
  });

  it("keeps mortgage and leasing comparable when later acquisition is acceptable", () => {
    const result = evaluate({ ownershipTimingPreference: "open_to_option_later_if_terms_fit" });

    expect(structure(result, "mortgage_credit").priority).toBe("compare");
    expect(structure(result, "housing_leasing").priority).toBe("compare");
    expect(structure(result, "housing_leasing").priority).not.toBe("explore_first");
    expect(structure(result, "housing_leasing").explanation.toLowerCase()).toContain("condiciones comerciales");
  });

  it("keeps both contractual structures comparable when there is no strong ownership preference", () => {
    const result = evaluate({ ownershipTimingPreference: "no_strong_preference" });

    expect(structure(result, "mortgage_credit").priority).toBe("compare");
    expect(structure(result, "housing_leasing").priority).toBe("compare");
  });

  it("routes pesos first only from an explicit nominal-peso predictability preference", () => {
    const result = evaluate({ paymentBehaviorPreference: "nominal_peso_predictability" });

    expect(result.precision).toBe("C1");
    expect(denomination(result, "pesos").priority).toBe("explore_first");
    expect(denomination(result, "uvr").priority).toBe("secondary");
    expect(denomination(result, "pesos").reasonCodes).toContain("nominal_peso_predictability_aligned");
  });

  it("does not make UVR a winner merely because inflation-linked variation is accepted", () => {
    const result = evaluate({ paymentBehaviorPreference: "open_to_inflation_linked_variation" });

    expect(denomination(result, "pesos").priority).toBe("compare");
    expect(denomination(result, "uvr").priority).toBe("compare");
    expect(denomination(result, "uvr").priority).not.toBe("explore_first");
    expect(denomination(result, "uvr").explanation.toLowerCase()).toContain("cotización concreta");
  });

  it("keeps pesos and UVR comparable when the user explicitly wants both", () => {
    const result = evaluate({ paymentBehaviorPreference: "compare_both" });

    expect(denomination(result, "pesos").priority).toBe("compare");
    expect(denomination(result, "uvr").priority).toBe("compare");
  });

  it("does not let a declared preference on one axis manufacture preference on the other axis", () => {
    const result = evaluate({ ownershipTimingPreference: "title_from_purchase" });

    expect(structure(result, "mortgage_credit").priority).toBe("explore_first");
    expect(result.denominationOptions.every((item) => item.priority === "needs_information")).toBe(true);
  });

  it("returns explicit non-underwriting and non-market boundaries", () => {
    const result = evaluate({
      ownershipTimingPreference: "title_from_purchase",
      paymentBehaviorPreference: "nominal_peso_predictability",
    });

    expect(result.boundaries).toEqual({
      isEligibility: false,
      isApproval: false,
      isApprovalProbability: false,
      isBankMatch: false,
      isMarketQuote: false,
      isCostRanking: false,
    });
  });

  it("does not return numerical match scores, bank names, approval claims or market rates", () => {
    const result = evaluate({
      ownershipTimingPreference: "open_to_option_later_if_terms_fit",
      paymentBehaviorPreference: "compare_both",
    });
    const humanFacing = [
      ...result.structureOptions.flatMap((item) => [item.title, item.explanation, item.referenceFact, ...item.factsToVerify]),
      ...result.denominationOptions.flatMap((item) => [item.title, item.explanation, item.referenceFact, ...item.factsToVerify]),
      ...result.quoteChecklist,
      ...result.contextNotices.map((item) => item.text),
    ].join(" ").toLowerCase();

    expect(humanFacing).not.toMatch(/\b\d{1,3}%\s*(match|compatib|aprob)/i);
    expect(humanFacing).not.toContain("te aprobarán");
    expect(humanFacing).not.toContain("probabilidad de aprobación");
    expect(humanFacing).not.toContain("bancolombia");
    expect(humanFacing).not.toContain("davivienda");
    expect(humanFacing).not.toContain("banco de bogotá");
    expect(humanFacing).not.toContain("fondo nacional del ahorro");
  });

  it("keeps public reference facts and user-preference routing explicitly separated by provenance", () => {
    const result = evaluate({
      ownershipTimingPreference: "title_from_purchase",
      paymentBehaviorPreference: "nominal_peso_predictability",
    });

    for (const option of [...result.structureOptions, ...result.denominationOptions]) {
      expect(option.provenance.referenceFact).toBe("public_reference");
      expect(option.provenance.priority).toBe("user_preference");
    }
  });

  it("adds a down-payment context notice without assuming leasing finances more", () => {
    const result = evaluate({ constraintContext: "down_payment" });

    expect(result.contextNotices).toHaveLength(1);
    expect(result.contextNotices[0]?.code).toBe("down_payment_constraint");
    expect(result.contextNotices[0]?.text).toContain("VIVIENDA no supone que leasing financie más que crédito hipotecario");
    expect(result.contextNotices[0]?.provenance).toBe("user_context");
  });

  it("adds a payment context notice focused on real cash-flow terms", () => {
    const result = evaluate({ constraintContext: "payment" });

    expect(result.contextNotices).toHaveLength(1);
    expect(result.contextNotices[0]?.code).toBe("payment_constraint");
    expect(result.contextNotices[0]?.text).toContain("cuota o canon real, seguros, costos recurrentes");
    expect(result.contextNotices[0]?.text).toContain("no solo el porcentaje financiado");
  });

  it("preserves both constraint notices when both affordability constraints bind", () => {
    const result = evaluate({ constraintContext: "both" });

    expect(result.contextNotices.map((item) => item.code)).toEqual([
      "down_payment_constraint",
      "payment_constraint",
    ]);
  });

  it("does not invent a constraint notice when the context is unknown or absent", () => {
    expect(evaluate().contextNotices).toEqual([]);
    expect(evaluate({ constraintContext: "unknown" }).contextNotices).toEqual([]);
  });

  it("requires the material fields needed for a future actual quote comparison", () => {
    const checklist = evaluate().quoteChecklist.join(" | ").toLowerCase();

    expect(checklist).toContain("fecha/vigencia");
    expect(checklist).toContain("estructura contractual");
    expect(checklist).toContain("denominación");
    expect(checklist).toContain("sistema exacto");
    expect(checklist).toContain("monto efectivamente financiado");
    expect(checklist).toContain("porcentaje del valor del inmueble");
    expect(checklist).toContain("tasa y convención exacta");
    expect(checklist).toContain("plazo");
    expect(checklist).toContain("seguros");
    expect(checklist).toContain("opción de adquisición");
    expect(checklist).toContain("efectivo total requerido");
    expect(checklist).toContain("documento o canal fuente");
  });

  it("keeps Home Readiness total and employment type outside the evaluator input contract", () => {
    const input: FinancingStructuresInput = {
      ownershipTimingPreference: "no_strong_preference",
      paymentBehaviorPreference: "compare_both",
    };

    expect(Object.keys(input)).not.toContain("homeReadinessScore");
    expect(Object.keys(input)).not.toContain("score");
    expect(Object.keys(input)).not.toContain("employmentType");
    expect(evaluateFinancingStructures(input).precision).toBe("C1");
  });

  it("keeps the two decision axes structurally separate", () => {
    const result = evaluate({
      ownershipTimingPreference: "title_from_purchase",
      paymentBehaviorPreference: "nominal_peso_predictability",
    });

    expect(result.structureOptions.map((item) => item.code)).toEqual(["mortgage_credit", "housing_leasing"]);
    expect(result.denominationOptions.map((item) => item.code)).toEqual(["pesos", "uvr"]);
    expect(result.structureOptions.some((item) => (item.code as string) === "mortgage_in_pesos")).toBe(false);
  });
});
