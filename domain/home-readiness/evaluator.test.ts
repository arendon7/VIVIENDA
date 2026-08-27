import { describe, expect, it } from "vitest";
import { calculateBuyerAffordability } from "@/domain/buyer-affordability/calculator";
import {
  evaluateHomeReadiness,
  HomeReadinessError,
  type HomeReadinessDimensionCode,
  type HomeReadinessInput,
} from "./evaluator";

const baseInput: HomeReadinessInput = {
  netHouseholdIncomeMonthly: 10_000_000,
  currentMonthlyDebtPayments: 1_000_000,
  availableDownPayment: 120_000_000,
  targetPropertyPrice: 300_000_000,
  housingCategory: "non_vis",
  incomeContinuity: "established_12_plus",
  documentationReadiness: "ready",
  planningFinancing: {
    annualEffectiveRate: 0.12,
    termMonths: 240,
    monthlyNonCreditHousingCosts: 0,
  },
};

function evaluate(overrides: Partial<HomeReadinessInput> = {}) {
  return evaluateHomeReadiness({ ...baseInput, ...overrides });
}

function dimension(result: ReturnType<typeof evaluateHomeReadiness>, code: HomeReadinessDimensionCode) {
  const found = result.dimensions.find((item) => item.code === code);
  if (!found) throw new Error(`Missing dimension ${code}`);
  return found;
}

describe("Home Readiness v0.16", () => {
  it("can reach exactly 100 with five dimensions capped at 20", () => {
    const result = evaluate({
      targetPropertyPrice: 240_000_000,
      availableDownPayment: 120_000_000,
    });

    expect(result.indexStatus).toBe("complete");
    expect(result.totalScore).toBe(100);
    expect(result.band).toBe("well_prepared");
    expect(result.dimensions).toHaveLength(5);
    expect(result.dimensions.every((item) => item.score === 20 && item.maxScore === 20)).toBe(true);
  });

  it("keeps every scored dimension between 0 and 20 and in increments of five", () => {
    const cases: HomeReadinessInput[] = [
      baseInput,
      { ...baseInput, currentMonthlyDebtPayments: 4_500_000, availableDownPayment: 20_000_000, targetPropertyPrice: 600_000_000, incomeContinuity: "irregular_or_recently_changed", documentationReadiness: "not_ready" },
      { ...baseInput, currentMonthlyDebtPayments: 2_500_000, availableDownPayment: 70_000_000, incomeContinuity: "recent_under_6", documentationReadiness: "partial" },
    ];

    for (const input of cases) {
      const result = evaluateHomeReadiness(input);
      for (const item of result.dimensions) {
        if (item.score === null) continue;
        expect(item.score).toBeGreaterThanOrEqual(0);
        expect(item.score).toBeLessThanOrEqual(20);
        expect(item.score % 5).toBe(0);
      }
    }
  });

  it("does not normalize a partial profile to 100", () => {
    const result = evaluate({ planningFinancing: undefined });

    expect(result.indexStatus).toBe("incomplete");
    expect(result.totalScore).toBeNull();
    expect(result.band).toBeNull();
    expect(dimension(result, "target_fit").status).toBe("needs_information");
    expect(result.missingInputs).toContain("planning_rate_and_term");
  });

  it("treats unknown income continuity as incomplete rather than zero", () => {
    const result = evaluate({ incomeContinuity: "unknown" });
    const item = dimension(result, "income_continuity");

    expect(item.status).toBe("needs_information");
    expect(item.score).toBeNull();
    expect(result.totalScore).toBeNull();
    expect(result.missingInputs).toContain("income_continuity");
  });

  it("treats unknown documentation readiness as incomplete rather than zero", () => {
    const result = evaluate({ documentationReadiness: "unknown" });
    const item = dimension(result, "documentation_readiness");

    expect(item.status).toBe("needs_information");
    expect(item.score).toBeNull();
    expect(result.totalScore).toBeNull();
    expect(result.missingInputs).toContain("documentation_readiness");
  });

  it("blocks down-payment and target-fit scoring when housing category is unknown", () => {
    const result = evaluate({ housingCategory: "unknown" });

    expect(dimension(result, "down_payment_readiness").status).toBe("needs_information");
    expect(dimension(result, "target_fit").status).toBe("needs_information");
    expect(result.totalScore).toBeNull();
    expect(result.missingInputs).toContain("housing_category_for_down_payment");
    expect(result.missingInputs).toContain("housing_category_for_target_fit");
  });

  it("delegates the modeled property ceiling to Buyer Affordability", () => {
    const result = evaluate();
    const affordability = calculateBuyerAffordability({
      netHouseholdIncomeMonthly: baseInput.netHouseholdIncomeMonthly,
      currentMonthlyDebtPayments: baseInput.currentMonthlyDebtPayments,
      availableDownPayment: baseInput.availableDownPayment,
      housingCategory: baseInput.housingCategory,
      financing: {
        mode: "pesos_fixed_constant",
        annualEffectiveRate: baseInput.planningFinancing!.annualEffectiveRate,
        termMonths: baseInput.planningFinancing!.termMonths,
        monthlyNonCreditHousingCosts: baseInput.planningFinancing!.monthlyNonCreditHousingCosts,
      },
    });
    const scenario = affordability.scenarios.find((item) => item.housingCategory === "non_vis");

    expect(result.underlyingAffordabilityPrecision).toBe("C2");
    expect(result.affordabilityFacts.modeledPropertyCeiling).toBe(scenario?.modeledPropertyCeiling);
    expect(result.affordabilityFacts.bindingConstraint).toBe(scenario?.bindingConstraint);
  });

  it("does not silently insert a market rate or term", () => {
    const result = evaluate({ planningFinancing: undefined });
    const item = dimension(result, "target_fit");

    expect(result.underlyingAffordabilityPrecision).toBe("C1");
    expect(item.status).toBe("needs_information");
    expect(item.reasonCodes).toContain("planning_financing_missing");
    expect(item.caveat.toLowerCase()).toContain("no inserta una tasa de mercado");
  });

  it("never emits approval, bureau-score, bank-score, probability or offer claims", () => {
    const result = evaluate();

    expect(result.boundaries).toEqual({
      isBureauScore: false,
      isBankScore: false,
      isApproval: false,
      isApprovalProbability: false,
      isMarketOffer: false,
    });
    expect(result.precision).toBe("C1");
  });

  it("does not score employment type itself", () => {
    const withExtraEmploymentField = {
      ...baseInput,
      employmentType: "independent_professional",
    } as HomeReadinessInput & { employmentType: string };

    const plain = evaluateHomeReadiness(baseInput);
    const withExtra = evaluateHomeReadiness(withExtraEmploymentField);

    expect(withExtra.totalScore).toBe(plain.totalScore);
    expect(dimension(withExtra, "income_continuity").score).toBe(dimension(plain, "income_continuity").score);
  });

  it("reducing current recurring debt cannot worsen obligation-burden score", () => {
    const high = dimension(evaluate({ currentMonthlyDebtPayments: 3_500_000 }), "obligation_burden").score!;
    const medium = dimension(evaluate({ currentMonthlyDebtPayments: 2_500_000 }), "obligation_burden").score!;
    const low = dimension(evaluate({ currentMonthlyDebtPayments: 500_000 }), "obligation_burden").score!;

    expect(medium).toBeGreaterThanOrEqual(high);
    expect(low).toBeGreaterThanOrEqual(medium);
  });

  it("increasing down payment cannot worsen down-payment readiness", () => {
    const low = dimension(evaluate({ availableDownPayment: 40_000_000 }), "down_payment_readiness").score!;
    const medium = dimension(evaluate({ availableDownPayment: 80_000_000 }), "down_payment_readiness").score!;
    const high = dimension(evaluate({ availableDownPayment: 130_000_000 }), "down_payment_readiness").score!;

    expect(medium).toBeGreaterThanOrEqual(low);
    expect(high).toBeGreaterThanOrEqual(medium);
  });

  it("increasing target price with all else equal cannot improve target-fit score", () => {
    const lower = dimension(evaluate({ targetPropertyPrice: 240_000_000 }), "target_fit").score!;
    const middle = dimension(evaluate({ targetPropertyPrice: 300_000_000 }), "target_fit").score!;
    const higher = dimension(evaluate({ targetPropertyPrice: 450_000_000 }), "target_fit").score!;

    expect(middle).toBeLessThanOrEqual(lower);
    expect(higher).toBeLessThanOrEqual(middle);
  });

  it("improving documentation readiness cannot worsen its score", () => {
    const states = ["not_ready", "partial", "mostly_ready", "ready"] as const;
    const scores = states.map((documentationReadiness) => dimension(evaluate({ documentationReadiness }), "documentation_readiness").score!);

    expect(scores).toEqual([5, 10, 15, 20]);
  });

  it("stronger continuity categories cannot worsen continuity score", () => {
    const irregular = dimension(evaluate({ incomeContinuity: "irregular_or_recently_changed" }), "income_continuity").score!;
    const recent = dimension(evaluate({ incomeContinuity: "recent_under_6" }), "income_continuity").score!;
    const established = dimension(evaluate({ incomeContinuity: "established_6_to_12" }), "income_continuity").score!;
    const long = dimension(evaluate({ incomeContinuity: "established_12_plus" }), "income_continuity").score!;
    const variableLong = dimension(evaluate({ incomeContinuity: "variable_with_12_plus_history" }), "income_continuity").score!;

    expect(irregular).toBeLessThanOrEqual(recent);
    expect(recent).toBeLessThanOrEqual(established);
    expect(established).toBeLessThanOrEqual(long);
    expect(variableLong).toBe(established);
  });

  it("prioritizes the weakest actionable dimensions", () => {
    const result = evaluate({
      currentMonthlyDebtPayments: 4_500_000,
      availableDownPayment: 20_000_000,
      documentationReadiness: "not_ready",
      incomeContinuity: "recent_under_6",
      targetPropertyPrice: 600_000_000,
    });

    const firstThree = result.nextActions.map((action) => action.dimensionCode);
    expect(firstThree).toHaveLength(3);
    expect(firstThree).toContain("down_payment_readiness");
    expect(firstThree).toContain("obligation_burden");
    expect(firstThree).toContain("target_fit");
  });

  it("prioritizes missing information before pretending to have a complete score", () => {
    const result = evaluate({
      housingCategory: "unknown",
      incomeContinuity: "unknown",
      documentationReadiness: "unknown",
      planningFinancing: undefined,
    });

    expect(result.totalScore).toBeNull();
    expect(result.nextActions[0]?.dimensionCode).toBe("down_payment_readiness");
    expect(result.nextActions.every((action) => action.dimensionCode !== "obligation_burden")).toBe(true);
  });

  it("quantifies the down-payment gap when below the reference", () => {
    const result = evaluate({
      targetPropertyPrice: 300_000_000,
      availableDownPayment: 45_000_000,
    });
    const action = result.nextActions.find((item) => item.dimensionCode === "down_payment_readiness");

    expect(result.affordabilityFacts.minimumEquityReference).toBeCloseTo(90_000_000, 6);
    expect(action?.quantifiedGap).toBeCloseTo(45_000_000, 6);
  });

  it("returns balanced preparation bands instead of approval probabilities", () => {
    const perfect = evaluate({ targetPropertyPrice: 240_000_000, availableDownPayment: 120_000_000 });
    const weak = evaluate({
      currentMonthlyDebtPayments: 5_000_000,
      availableDownPayment: 10_000_000,
      targetPropertyPrice: 700_000_000,
      incomeContinuity: "irregular_or_recently_changed",
      documentationReadiness: "not_ready",
    });

    expect(perfect.band).toBe("well_prepared");
    expect(weak.band).toBe("foundation_needed");

    const humanCopy = [
      ...weak.dimensions.flatMap((item) => [
        item.label,
        item.explanation,
        item.nextAction ?? "",
        item.caveat,
      ]),
      ...weak.nextActions.flatMap((action) => [action.title, action.explanation]),
    ].join(" ");

    expect(humanCopy).not.toMatch(/probabilidad de aprobación|aprobado|preaprobado/i);
  });

  it("can calculate a complete index without identity or contact fields", () => {
    const result = evaluateHomeReadiness(baseInput);

    expect(result.indexStatus).toBe("complete");
    expect(result.totalScore).not.toBeNull();
    expect(Object.keys(baseInput)).not.toContain("name");
    expect(Object.keys(baseInput)).not.toContain("email");
    expect(Object.keys(baseInput)).not.toContain("phone");
    expect(Object.keys(baseInput)).not.toContain("idNumber");
  });

  it("rejects an invalid target price rather than manufacturing a score", () => {
    expect(() => evaluate({ targetPropertyPrice: 0 })).toThrow(HomeReadinessError);
    expect(() => evaluate({ targetPropertyPrice: Number.NaN })).toThrow(HomeReadinessError);
  });
});