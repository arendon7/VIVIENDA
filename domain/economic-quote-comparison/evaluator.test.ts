import { describe, expect, it } from "vitest";
import type { FinancingQuoteInput } from "../quote-normalization/evaluator";
import {
  InvalidEconomicScenarioError,
  compareEconomicQuotePair,
  modelEconomicQuote,
  type EconomicComparisonScenario,
} from "./evaluator";

function mortgage(overrides: Partial<FinancingQuoteInput> = {}): FinancingQuoteInput {
  return {
    quoteId: "A",
    source: "user_declared",
    providerName: "Entidad A",
    quoteDate: "2026-08-20",
    validUntil: "2026-09-20",
    contractStructure: "mortgage_credit",
    denomination: "pesos",
    amortizationBehavior: "constant_nominal_payment",
    propertyValue: 500_000_000,
    financedAmount: 350_000_000,
    quotedFinancingPercentage: 0.7,
    termMonths: 12,
    quotedRateValue: 0.11,
    rateConvention: "effective_annual",
    initialMonthlyPaymentOrCanon: 3_000_000,
    insuranceTreatment: "included_in_initial_payment",
    oneTimeCostsTreatment: "stated_none",
    totalCashRequiredAtClosing: 150_000_000,
    prepaymentInformation: "stated_unrestricted",
    ...overrides,
  };
}

function leasing(overrides: Partial<FinancingQuoteInput> = {}): FinancingQuoteInput {
  return {
    quoteId: "B",
    source: "user_declared",
    providerName: "Entidad B",
    quoteDate: "2026-08-20",
    validUntil: "2026-09-20",
    contractStructure: "housing_leasing",
    denomination: "pesos",
    amortizationBehavior: "constant_nominal_payment",
    propertyValue: 500_000_000,
    financedAmount: 350_000_000,
    quotedFinancingPercentage: 0.7,
    termMonths: 12,
    quotedRateValue: 0.105,
    rateConvention: "effective_annual",
    initialMonthlyPaymentOrCanon: 2_900_000,
    insuranceTreatment: "included_in_initial_payment",
    oneTimeCostsTreatment: "stated_none",
    totalCashRequiredAtClosing: 150_000_000,
    prepaymentInformation: "stated_unrestricted",
    leasingPurchaseOptionValue: 10_000_000,
    leasingPurchaseOptionTiming: "Al finalizar el contrato",
    ...overrides,
  };
}

const baseScenario: EconomicComparisonScenario = {
  scenarioId: "base",
};

function expectClose(actual: number, expected: number, tolerance = 0.01) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

describe("Scenario-Based Economic Quote Comparison v0.19", () => {
  it("blocks a quote that is not comparison-input ready in v0.18", () => {
    const result = modelEconomicQuote(
      mortgage({ totalCashRequiredAtClosing: undefined }),
      baseScenario,
    );

    expect(result.status).toBe("blocked_by_quote_readiness");
    expect(result.outputPrecision).toBeNull();
    expect(result.cashFlow).toBeNull();
    expect(result.issues.map((item) => item.code)).toContain("quote_not_comparison_ready");
  });

  it("keeps declared quote input at C1 and modeled output at C2 without verification", () => {
    const result = modelEconomicQuote(mortgage(), baseScenario);

    expect(result.status).toBe("modeled");
    expect(result.inputPrecision).toBe("C1");
    expect(result.outputPrecision).toBe("C2");
    expect(result.normalizedQuote.precision).toBe("C1");
    expect(result.boundaries.isVerified).toBe(false);
    expect(result.boundaries.isScenarioModel).toBe(true);
  });

  it("models pesos plus constant nominal payment as a flat declared base path", () => {
    const result = modelEconomicQuote(
      mortgage({ initialMonthlyPaymentOrCanon: 2_500_000, termMonths: 3 }),
      baseScenario,
    );

    expect(result.cashFlow?.periods.map((item) => item.baseOutflow)).toEqual([
      2_500_000,
      2_500_000,
      2_500_000,
    ]);
  });

  it("blocks UVR modeling when no UVR scenario was supplied", () => {
    const result = modelEconomicQuote(
      mortgage({
        denomination: "uvr",
        amortizationBehavior: "uvr_linked_payment",
        rateIndexOrReference: "UVR + tasa declarada",
      }),
      baseScenario,
    );

    expect(result.status).toBe("missing_scenario_assumption");
    expect(result.issues.map((item) => item.code)).toContain("uvr_scenario_missing");
  });

  it("compounds a UVR-linked payment path from an explicit annual scenario", () => {
    const annualGrowthRate = 0.12;
    const monthlyGrowth = Math.pow(1 + annualGrowthRate, 1 / 12) - 1;
    const result = modelEconomicQuote(
      mortgage({
        denomination: "uvr",
        amortizationBehavior: "uvr_linked_payment",
        rateIndexOrReference: "UVR + tasa declarada",
        initialMonthlyPaymentOrCanon: 3_000_000,
        termMonths: 3,
      }),
      {
        scenarioId: "uvr-12",
        uvrScenario: { kind: "constant_annual_growth", annualGrowthRate },
      },
    );

    expectClose(result.cashFlow!.periods[0].baseOutflow, 3_000_000);
    expectClose(result.cashFlow!.periods[1].baseOutflow, 3_000_000 * (1 + monthlyGrowth));
    expectClose(
      result.cashFlow!.periods[2].baseOutflow,
      3_000_000 * Math.pow(1 + monthlyGrowth, 2),
    );
    expect(result.cashFlow?.assumptions.uvrAnnualGrowthRate).toBe(0.12);
    expect(result.boundaries.isMarketForecast).toBe(false);
  });

  it("adds excluded insurance exactly once", () => {
    const result = modelEconomicQuote(
      mortgage({
        termMonths: 2,
        insuranceTreatment: "excluded_from_initial_payment",
        monthlyInsuranceAmount: 150_000,
      }),
      baseScenario,
    );

    expect(result.cashFlow?.recurringInsuranceOutflow).toBe(300_000);
    expect(result.cashFlow?.periods[0].insuranceOutflow).toBe(150_000);
  });

  it("does not double count insurance marked as included in the declared payment", () => {
    const result = modelEconomicQuote(
      mortgage({
        termMonths: 2,
        insuranceTreatment: "included_in_initial_payment",
        monthlyInsuranceAmount: 150_000,
      }),
      baseScenario,
    );

    expect(result.cashFlow?.recurringInsuranceOutflow).toBe(0);
    expect(result.normalizedQuote.warnings.map((item) => item.code)).toContain(
      "insurance_amount_without_exclusion",
    );
  });

  it("adds only the declared external amount for partially included insurance", () => {
    const result = modelEconomicQuote(
      mortgage({
        termMonths: 2,
        insuranceTreatment: "partially_included",
        monthlyInsuranceAmount: 80_000,
      }),
      baseScenario,
    );

    expect(result.cashFlow?.recurringInsuranceOutflow).toBe(160_000);
  });

  it("uses total cash required at closing as the month-zero outflow", () => {
    const result = modelEconomicQuote(
      mortgage({ totalCashRequiredAtClosing: 175_000_000 }),
      baseScenario,
    );

    expect(result.cashFlow?.initialCashOutflow).toBe(175_000_000);
  });

  it("does not add one-time costs a second time on top of total closing cash", () => {
    const result = modelEconomicQuote(
      mortgage({
        termMonths: 1,
        initialMonthlyPaymentOrCanon: 3_000_000,
        totalCashRequiredAtClosing: 155_000_000,
        oneTimeCostsTreatment: "total_only",
        oneTimeCostsTotal: 5_000_000,
      }),
      baseScenario,
    );

    expect(result.cashFlow?.nominalTotalOutflow).toBe(158_000_000);
  });

  it("never creates a purchase-option cash flow for a mortgage", () => {
    const result = modelEconomicQuote(
      mortgage({
        leasingPurchaseOptionValue: 99_000_000,
        leasingPurchaseOptionTiming: "fin",
      }),
      baseScenario,
    );

    expect(result.cashFlow?.purchaseOptionOutflow).toBe(0);
    expect(result.cashFlow?.fullAcquisition).toBe(true);
  });

  it("adds an absolute leasing purchase option at contract end when explicitly exercised", () => {
    const result = modelEconomicQuote(leasing({ termMonths: 2 }), {
      scenarioId: "leasing-exercise",
      leasingOptions: {
        B: { exercise: true, timing: "contract_end" },
      },
    });

    expect(result.status).toBe("modeled");
    expect(result.cashFlow?.periods[0].purchaseOptionOutflow).toBe(0);
    expect(result.cashFlow?.periods[1].purchaseOptionOutflow).toBe(10_000_000);
    expect(result.cashFlow?.purchaseOptionOutflow).toBe(10_000_000);
    expect(result.cashFlow?.fullAcquisition).toBe(true);
  });

  it("requires an explicit percentage base for a percentage leasing option", () => {
    const result = modelEconomicQuote(
      leasing({
        leasingPurchaseOptionValue: undefined,
        leasingPurchaseOptionPercentage: 0.1,
      }),
      {
        scenarioId: "leasing-percent",
        leasingOptions: {
          B: { exercise: true, timing: "contract_end" },
        },
      },
    );

    expect(result.status).toBe("missing_scenario_assumption");
    expect(result.issues.map((item) => item.code)).toContain(
      "leasing_option_percentage_base_missing",
    );
  });

  it("uses property value exactly when selected as the leasing percentage base", () => {
    const result = modelEconomicQuote(
      leasing({
        termMonths: 1,
        propertyValue: 500_000_000,
        financedAmount: 350_000_000,
        leasingPurchaseOptionValue: undefined,
        leasingPurchaseOptionPercentage: 0.1,
      }),
      {
        scenarioId: "leasing-property-base",
        leasingOptions: {
          B: {
            exercise: true,
            timing: "contract_end",
            percentageBase: "property_value",
          },
        },
      },
    );

    expect(result.cashFlow?.purchaseOptionOutflow).toBe(50_000_000);
  });

  it("uses financed amount exactly when selected as the leasing percentage base", () => {
    const result = modelEconomicQuote(
      leasing({
        termMonths: 1,
        propertyValue: 500_000_000,
        financedAmount: 350_000_000,
        leasingPurchaseOptionValue: undefined,
        leasingPurchaseOptionPercentage: 0.1,
      }),
      {
        scenarioId: "leasing-financed-base",
        leasingOptions: {
          B: {
            exercise: true,
            timing: "contract_end",
            percentageBase: "financed_amount",
          },
        },
      },
    );

    expect(result.cashFlow?.purchaseOptionOutflow).toBe(35_000_000);
  });

  it("does not flatten a constant-principal path into a constant payment", () => {
    const result = modelEconomicQuote(
      mortgage({ amortizationBehavior: "constant_principal" }),
      baseScenario,
    );

    expect(result.status).toBe("unsupported_payment_path");
    expect(result.cashFlow).toBeNull();
  });

  it("blocks other payment behavior instead of guessing a path", () => {
    const result = modelEconomicQuote(
      mortgage({ amortizationBehavior: "other", amortizationLabel: "Especial" }),
      baseScenario,
    );

    expect(result.status).toBe("unsupported_payment_path");
  });

  it("makes nominal total equal month zero plus every modeled period", () => {
    const result = modelEconomicQuote(
      mortgage({
        termMonths: 2,
        initialMonthlyPaymentOrCanon: 3_000_000,
        insuranceTreatment: "excluded_from_initial_payment",
        monthlyInsuranceAmount: 100_000,
        totalCashRequiredAtClosing: 150_000_000,
      }),
      baseScenario,
    );

    const summedPeriods = result.cashFlow!.periods.reduce(
      (sum, period) => sum + period.totalOutflow,
      0,
    );
    expect(result.cashFlow!.nominalTotalOutflow).toBe(
      result.cashFlow!.initialCashOutflow + summedPeriods,
    );
  });

  it("discounts future outflows from an explicitly supplied annual comparison rate", () => {
    const annualDiscountRate = 0.12;
    const monthlyDiscount = Math.pow(1 + annualDiscountRate, 1 / 12) - 1;
    const result = modelEconomicQuote(
      mortgage({
        termMonths: 1,
        initialMonthlyPaymentOrCanon: 12_000_000,
        totalCashRequiredAtClosing: 100_000_000,
      }),
      { scenarioId: "discounted", annualDiscountRate },
    );

    const expected = 100_000_000 + 12_000_000 / (1 + monthlyDiscount);
    expectClose(result.cashFlow!.presentValueOutflow!, expected);
  });

  it("returns no present-value metric when no discount rate was supplied", () => {
    const result = modelEconomicQuote(mortgage(), baseScenario);
    expect(result.cashFlow?.presentValueOutflow).toBeNull();
    expect(result.cashFlow?.periods[0].discountFactor).toBeNull();
  });

  it("models two different-property quotes but blocks both ranking metrics", () => {
    const result = compareEconomicQuotePair(
      mortgage({ quoteId: "A", propertyValue: 500_000_000 }),
      mortgage({
        quoteId: "B",
        providerName: "Entidad B",
        propertyValue: 510_000_000,
        financedAmount: 357_000_000,
        quotedFinancingPercentage: 0.7,
        totalCashRequiredAtClosing: 153_000_000,
      }),
      { scenarioId: "different-properties", annualDiscountRate: 0.1 },
    );

    expect(result.status).toBe("modeled_not_rankable");
    expect(result.nominalGateIssues).toContain("property_value_differs");
    expect(result.presentValueGateIssues).toContain("property_value_differs");
    expect(result.nominal.lowerQuoteId).toBeNull();
    expect(result.presentValue.lowerQuoteId).toBeNull();
  });

  it("blocks nominal ranking when financed amounts differ", () => {
    const result = compareEconomicQuotePair(
      mortgage({ quoteId: "A" }),
      mortgage({
        quoteId: "B",
        providerName: "Entidad B",
        financedAmount: 325_000_000,
        quotedFinancingPercentage: 0.65,
        totalCashRequiredAtClosing: 175_000_000,
      }),
      baseScenario,
    );

    expect(result.nominal.isComparable).toBe(false);
    expect(result.nominalGateIssues).toContain("financed_amount_differs");
    expect(result.status).toBe("modeled_not_rankable");
  });

  it("allows present-value comparison with different financed amounts when property basis is the same", () => {
    const result = compareEconomicQuotePair(
      mortgage({ quoteId: "A", initialMonthlyPaymentOrCanon: 3_000_000 }),
      mortgage({
        quoteId: "B",
        providerName: "Entidad B",
        financedAmount: 325_000_000,
        quotedFinancingPercentage: 0.65,
        totalCashRequiredAtClosing: 175_000_000,
        initialMonthlyPaymentOrCanon: 2_700_000,
      }),
      { scenarioId: "pv-equity", annualDiscountRate: 0.1 },
    );

    expect(result.presentValue.isComparable).toBe(true);
    expect(result.status).toBe("present_value_comparable");
    expect(result.presentValue.lowerQuoteId).not.toBeNull();
    expect(result.nominal.isComparable).toBe(false);
  });

  it("blocks nominal ranking when contractual terms differ", () => {
    const result = compareEconomicQuotePair(
      mortgage({ quoteId: "A", termMonths: 12 }),
      mortgage({ quoteId: "B", providerName: "Entidad B", termMonths: 18 }),
      baseScenario,
    );

    expect(result.nominalGateIssues).toContain("term_differs");
    expect(result.nominal.isComparable).toBe(false);
  });

  it("allows present-value comparison across different full contractual terms with an explicit discount rate", () => {
    const result = compareEconomicQuotePair(
      mortgage({ quoteId: "A", termMonths: 12, initialMonthlyPaymentOrCanon: 3_000_000 }),
      mortgage({
        quoteId: "B",
        providerName: "Entidad B",
        termMonths: 18,
        initialMonthlyPaymentOrCanon: 2_100_000,
      }),
      { scenarioId: "pv-terms", annualDiscountRate: 0.1 },
    );

    expect(result.presentValue.isComparable).toBe(true);
    expect(result.status).toBe("present_value_comparable");
  });

  it("models leasing without exercise but blocks acquisition-equivalent ranking against a mortgage", () => {
    const result = compareEconomicQuotePair(
      mortgage({ quoteId: "A" }),
      leasing(),
      {
        scenarioId: "lease-no-exercise",
        leasingOptions: { B: { exercise: false } },
      },
    );

    expect(result.quoteB.status).toBe("modeled");
    expect(result.quoteB.cashFlow?.fullAcquisition).toBe(false);
    expect(result.status).toBe("modeled_not_rankable");
    expect(result.nominalGateIssues).toContain("full_acquisition_not_equivalent");
  });

  it("can compare mortgage and leasing nominally when full acquisition and nominal gates are explicit", () => {
    const result = compareEconomicQuotePair(
      mortgage({ quoteId: "A", initialMonthlyPaymentOrCanon: 3_000_000 }),
      leasing({ initialMonthlyPaymentOrCanon: 2_000_000, leasingPurchaseOptionValue: 10_000_000 }),
      {
        scenarioId: "cross-structure",
        leasingOptions: {
          B: { exercise: true, timing: "contract_end" },
        },
      },
    );

    expect(result.status).toBe("nominally_comparable");
    expect(result.nominal.isComparable).toBe(true);
    expect(result.nominal.lowerQuoteId).toBe("B");
    expect(result.boundaries.isLegalRecommendation).toBe(false);
  });

  it("may return modeled totals without a rankable pair", () => {
    const result = compareEconomicQuotePair(
      mortgage({ quoteId: "A", financedAmount: 350_000_000 }),
      mortgage({
        quoteId: "B",
        providerName: "Entidad B",
        financedAmount: 300_000_000,
        quotedFinancingPercentage: 0.6,
        totalCashRequiredAtClosing: 200_000_000,
      }),
      baseScenario,
    );

    expect(result.quoteA.cashFlow?.nominalTotalOutflow).toBeTypeOf("number");
    expect(result.quoteB.cashFlow?.nominalTotalOutflow).toBeTypeOf("number");
    expect(result.status).toBe("modeled_not_rankable");
  });

  it("uses lowerQuoteId for a nominal metric and never creates a generic winner field", () => {
    const result = compareEconomicQuotePair(
      mortgage({ quoteId: "A", initialMonthlyPaymentOrCanon: 3_000_000 }),
      mortgage({
        quoteId: "B",
        providerName: "Entidad B",
        initialMonthlyPaymentOrCanon: 2_900_000,
      }),
      baseScenario,
    );

    expect(result.nominal.lowerQuoteId).toBe("B");
    expect("winner" in result).toBe(false);
    expect("bestBank" in result).toBe(false);
  });

  it("uses lowerQuoteId for a present-value metric without calling it a recommendation", () => {
    const result = compareEconomicQuotePair(
      mortgage({ quoteId: "A", initialMonthlyPaymentOrCanon: 3_000_000 }),
      mortgage({
        quoteId: "B",
        providerName: "Entidad B",
        initialMonthlyPaymentOrCanon: 2_900_000,
      }),
      { scenarioId: "pv", annualDiscountRate: 0.1 },
    );

    expect(result.presentValue.lowerQuoteId).toBe("B");
    expect(result.boundaries.isLegalRecommendation).toBe(false);
    expect(result.boundaries.hasBestBank).toBe(false);
  });

  it("treats metric differences within COP 1 as a tie", () => {
    const result = compareEconomicQuotePair(
      mortgage({ quoteId: "A", termMonths: 1, initialMonthlyPaymentOrCanon: 3_000_000 }),
      mortgage({
        quoteId: "B",
        providerName: "Entidad B",
        termMonths: 1,
        initialMonthlyPaymentOrCanon: 3_000_000.5,
      }),
      baseScenario,
    );

    expect(result.nominal.isComparable).toBe(true);
    expect(result.nominal.tie).toBe(true);
    expect(result.nominal.lowerQuoteId).toBeNull();
  });

  it("preserves quote validity warnings without asserting offer availability", () => {
    const result = modelEconomicQuote(
      mortgage({ validUntil: undefined }),
      baseScenario,
    );

    expect(result.normalizedQuote.warnings.map((item) => item.code)).toContain(
      "validity_date_missing",
    );
    expect(result.boundaries.isMarketForecast).toBe(false);
  });

  it("keeps approval, eligibility, matching and guaranteed-savings boundaries false", () => {
    const result = compareEconomicQuotePair(
      mortgage({ quoteId: "A" }),
      mortgage({ quoteId: "B", providerName: "Entidad B" }),
      baseScenario,
    );

    expect(result.boundaries.isEligibility).toBe(false);
    expect(result.boundaries.isApproval).toBe(false);
    expect(result.boundaries.isBankMatch).toBe(false);
    expect(result.boundaries.isGuaranteedSavings).toBe(false);
    expect(result.boundaries.hasBestBank).toBe(false);
  });

  it("rejects an empty scenario id", () => {
    expect(() => modelEconomicQuote(mortgage(), { scenarioId: "   " })).toThrow(
      InvalidEconomicScenarioError,
    );
  });

  it("rejects impossible annual UVR and discount factors", () => {
    expect(() =>
      modelEconomicQuote(
        mortgage({
          denomination: "uvr",
          amortizationBehavior: "uvr_linked_payment",
          rateIndexOrReference: "UVR",
        }),
        {
          scenarioId: "bad-uvr",
          uvrScenario: { kind: "constant_annual_growth", annualGrowthRate: -1 },
        },
      ),
    ).toThrow(InvalidEconomicScenarioError);

    expect(() =>
      modelEconomicQuote(mortgage(), {
        scenarioId: "bad-discount",
        annualDiscountRate: -1,
      }),
    ).toThrow(InvalidEconomicScenarioError);
  });
});
