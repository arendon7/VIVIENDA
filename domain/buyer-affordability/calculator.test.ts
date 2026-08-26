import { describe, expect, it } from "vitest";
import vectors from "@/fixtures/buyer-affordability-golden-vectors.json";
import {
  BuyerAffordabilityError,
  calculateBuyerAffordability,
  type BuyerAffordabilityInput,
  type BuyerHousingScenario,
} from "./calculator";

function close(actual: number, expected: number, relativeTolerance = 1e-10) {
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(scale * relativeTolerance);
}

function scenario(result: ReturnType<typeof calculateBuyerAffordability>, category: "vis" | "non_vis"): BuyerHousingScenario {
  const match = result.scenarios.find((item) => item.housingCategory === category);
  if (!match) throw new Error(`Missing ${category} scenario`);
  return match;
}

function vector(id: string) {
  const match = vectors.find((item) => item.id === id);
  if (!match) throw new Error(`Missing vector ${id}`);
  return match;
}

describe("Buyer affordability v0.13", () => {
  it("reproduces C1 basic planning vector without inventing payment-derived principal", () => {
    const fixture = vector("c1-basic-non-vis");
    const result = calculateBuyerAffordability(fixture.input as BuyerAffordabilityInput);
    const expected = fixture.expected as Record<string, number | string>;

    expect(result.precision).toBe("C1");
    close(result.planning.currentDebtRatio, Number(expected.currentDebtRatio));
    close(result.planning.planningTotalDebtPaymentCap, Number(expected.planningTotalDebtPaymentCap));
    close(result.planning.planningHousingPaymentRoom, Number(expected.planningHousingPaymentRoom));
    close(scenario(result, "non_vis").propertyCeilingFromDownPayment, Number(expected.propertyCeilingFromDownPayment));
    expect(result.financing).toBeUndefined();
    expect(scenario(result, "non_vis").modeledPrincipal).toBeUndefined();
  });

  it("floors planning housing room at zero when existing debts exhaust the benchmark", () => {
    const fixture = vector("c1-existing-debt-exhausts-planning-room");
    const result = calculateBuyerAffordability(fixture.input as BuyerAffordabilityInput);

    expect(result.planning.currentDebtRatio).toBe(0.4);
    expect(result.planning.planningHousingPaymentRoom).toBe(0);
  });

  it("reproduces the C2 payment-binding vector without forcing financing to equal max LTV", () => {
    const fixture = vector("c2-payment-binding-with-non-credit-costs");
    const result = calculateBuyerAffordability(fixture.input as BuyerAffordabilityInput);
    const expected = fixture.expected as Record<string, number | string>;
    const nonVis = scenario(result, "non_vis");

    expect(result.precision).toBe("C2");
    expect(result.regulatory.incomeBasis).toBe("accreditable_family_declared");
    close(result.regulatory.firstInstallmentCeiling ?? -1, Number(expected.regulatoryFirstInstallmentCeiling));
    close(result.financing?.modeledCreditPaymentBudget ?? -1, Number(expected.modeledCreditPaymentBudget));
    close(result.financing?.monthlyRate ?? -1, Number(expected.monthlyRate));
    close(nonVis.modeledPrincipal ?? -1, Number(expected.modeledPrincipal));
    close(nonVis.propertyCeilingFromCreditAndCash ?? -1, Number(expected.propertyCeilingFromCreditAndCash));
    close(nonVis.propertyCeilingFromDownPayment, Number(expected.propertyCeilingFromDownPayment));
    close(nonVis.modeledPropertyCeiling ?? -1, Number(expected.modeledPropertyCeiling));
    expect(nonVis.bindingConstraint).toBe("payment");
    expect(result.financing?.monthlyNonCreditHousingCosts).toBe(300_000);
    expect(result.financing?.nonCreditHousingCostsOmitted).toBe(false);
  });

  it("detects down payment as the binding constraint when cash is tighter", () => {
    const fixture = vector("c2-down-payment-binding");
    const result = calculateBuyerAffordability(fixture.input as BuyerAffordabilityInput);
    const expected = fixture.expected as Record<string, number | string>;
    const nonVis = scenario(result, "non_vis");

    close(nonVis.modeledPrincipal ?? -1, Number(expected.modeledPrincipal));
    close(nonVis.propertyCeilingFromCreditAndCash ?? -1, Number(expected.propertyCeilingFromCreditAndCash));
    close(nonVis.modeledPropertyCeiling ?? -1, Number(expected.modeledPropertyCeiling));
    expect(nonVis.bindingConstraint).toBe("down_payment");
  });

  it("keeps VIS and non-VIS as separate references when category is unknown", () => {
    const fixture = vector("c2-unknown-category-keeps-two-scenarios");
    const result = calculateBuyerAffordability(fixture.input as BuyerAffordabilityInput);
    const expected = fixture.expected as Record<string, number | string>;
    const nonVis = scenario(result, "non_vis");
    const vis = scenario(result, "vis");

    expect(result.scenarios).toHaveLength(2);
    close(result.financing?.modeledCreditPaymentBudget ?? -1, Number(expected.modeledCreditPaymentBudget));
    close(nonVis.propertyCeilingFromCreditAndCash ?? -1, Number(expected.propertyCeilingFromCreditAndCash));
    close(vis.propertyCeilingFromCreditAndCash ?? -1, Number(expected.propertyCeilingFromCreditAndCash));
    close(nonVis.modeledPropertyCeiling ?? -1, Number(expected.nonVisModeledPropertyCeiling));
    close(vis.modeledPropertyCeiling ?? -1, Number(expected.visModeledPropertyCeiling));
    expect(nonVis.bindingConstraint).toBe("down_payment");
    expect(vis.bindingConstraint).toBe("payment");
    expect(result.financing?.nonCreditHousingCostsOmitted).toBe(true);
  });

  it("lets extra equity increase property value instead of assuming exact max LTV", () => {
    const result = calculateBuyerAffordability({
      netHouseholdIncomeMonthly: 10_000_000,
      currentMonthlyDebtPayments: 1_000_000,
      availableDownPayment: 100_000_000,
      housingCategory: "non_vis",
      financing: {
        mode: "pesos_fixed_constant",
        annualEffectiveRate: 0.117,
        termMonths: 240,
        monthlyNonCreditHousingCosts: 300_000,
      },
    });
    const nonVis = scenario(result, "non_vis");

    expect(nonVis.propertyCeilingFromCreditAndCash).toBeCloseTo(
      (nonVis.modeledPrincipal ?? 0) + 100_000_000,
      6,
    );
    expect(nonVis.modeledPropertyCeiling).toBeGreaterThan((nonVis.modeledPrincipal ?? 0) / 0.70);
    expect(nonVis.bindingConstraint).toBe("payment");
  });

  it("keeps the 40% regulatory ceiling separate and lets it bind only when accreditable income is supplied", () => {
    const fixture = vector("c2-regulatory-ceiling-can-bind-separately");
    const result = calculateBuyerAffordability(fixture.input as BuyerAffordabilityInput);
    const expected = fixture.expected as Record<string, number | string>;
    const nonVis = scenario(result, "non_vis");

    close(result.planning.planningHousingPaymentRoom, Number(expected.planningHousingPaymentRoom));
    close(result.regulatory.firstInstallmentCeiling ?? -1, Number(expected.regulatoryFirstInstallmentCeiling));
    close(result.financing?.modeledCreditPaymentBudget ?? -1, Number(expected.modeledCreditPaymentBudget));
    close(nonVis.modeledPrincipal ?? -1, Number(expected.modeledPrincipal));
    close(nonVis.propertyCeilingFromCreditAndCash ?? -1, Number(expected.propertyCeilingFromCreditAndCash));
    close(nonVis.modeledPropertyCeiling ?? -1, Number(expected.modeledPropertyCeiling));
    expect(nonVis.bindingConstraint).toBe("payment");
    expect(result.planning.planningTotalDebtRatio).toBe(0.30);
    expect(result.regulatory.firstInstallmentRatio).toBe(0.40);
  });

  it("does not compute a regulatory-income ceiling when accreditable income was not supplied", () => {
    const result = calculateBuyerAffordability({
      netHouseholdIncomeMonthly: 8_000_000,
      currentMonthlyDebtPayments: 500_000,
      availableDownPayment: 80_000_000,
      housingCategory: "non_vis",
    });

    expect(result.regulatory.incomeBasis).toBe("not_supplied");
    expect(result.regulatory.firstInstallmentCeiling).toBeUndefined();
  });

  it("uses the zero-rate formula only when zero is explicitly supplied", () => {
    const result = calculateBuyerAffordability({
      netHouseholdIncomeMonthly: 10_000_000,
      currentMonthlyDebtPayments: 0,
      availableDownPayment: 1_000_000_000,
      housingCategory: "non_vis",
      financing: {
        mode: "pesos_fixed_constant",
        annualEffectiveRate: 0,
        termMonths: 120,
        monthlyNonCreditHousingCosts: 0,
      },
    });

    expect(result.financing?.monthlyRate).toBe(0);
    expect(scenario(result, "non_vis").modeledPrincipal).toBe(3_000_000 * 120);
  });

  it("rejects invalid money inputs and unsupported terms", () => {
    expect(() => calculateBuyerAffordability({
      netHouseholdIncomeMonthly: 0,
      currentMonthlyDebtPayments: 0,
      availableDownPayment: 0,
      housingCategory: "unknown",
    })).toThrowError(BuyerAffordabilityError);

    expect(() => calculateBuyerAffordability({
      netHouseholdIncomeMonthly: 5_000_000,
      currentMonthlyDebtPayments: -1,
      availableDownPayment: 0,
      housingCategory: "unknown",
    })).toThrowError(BuyerAffordabilityError);

    try {
      calculateBuyerAffordability({
        netHouseholdIncomeMonthly: 5_000_000,
        currentMonthlyDebtPayments: 0,
        availableDownPayment: 0,
        housingCategory: "non_vis",
        financing: {
          mode: "pesos_fixed_constant",
          annualEffectiveRate: 0.1,
          termMonths: 48,
        },
      });
      throw new Error("Expected unsupported term");
    } catch (error) {
      expect(error).toBeInstanceOf(BuyerAffordabilityError);
      expect((error as BuyerAffordabilityError).code).toBe("unsupported_term");
    }
  });

  it("contains no approval, score or bank-matching output field", () => {
    const result = calculateBuyerAffordability({
      netHouseholdIncomeMonthly: 10_000_000,
      currentMonthlyDebtPayments: 1_000_000,
      availableDownPayment: 100_000_000,
      housingCategory: "non_vis",
      financing: {
        mode: "pesos_fixed_constant",
        annualEffectiveRate: 0.117,
        termMonths: 240,
      },
    });
    const keys = JSON.stringify(result).toLowerCase();

    expect(keys).not.toContain("approval");
    expect(keys).not.toContain("probability");
    expect(keys).not.toContain("score");
    expect(keys).not.toContain("bankmatch");
  });
});