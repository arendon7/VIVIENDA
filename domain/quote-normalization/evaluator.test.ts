import { describe, expect, it } from "vitest";
import {
  normalizeFinancingQuote,
  normalizeFinancingQuotePair,
  type FinancingQuoteInput,
} from "./evaluator";

function mortgageQuote(overrides: Partial<FinancingQuoteInput> = {}): FinancingQuoteInput {
  return {
    quoteId: "quote-a",
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
    termMonths: 240,
    quotedRateValue: 0.11,
    rateConvention: "effective_annual",
    initialMonthlyPaymentOrCanon: 3_600_000,
    insuranceTreatment: "excluded_from_initial_payment",
    monthlyInsuranceAmount: 180_000,
    oneTimeCostsTreatment: "total_only",
    oneTimeCostsTotal: 4_000_000,
    totalCashRequiredAtClosing: 154_000_000,
    prepaymentInformation: "stated_unrestricted",
    ...overrides,
  };
}

function leasingQuote(overrides: Partial<FinancingQuoteInput> = {}): FinancingQuoteInput {
  return {
    quoteId: "quote-b",
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
    termMonths: 240,
    quotedRateValue: 0.11,
    rateConvention: "effective_annual",
    initialMonthlyPaymentOrCanon: 3_600_000,
    insuranceTreatment: "excluded_from_initial_payment",
    monthlyInsuranceAmount: 180_000,
    oneTimeCostsTreatment: "total_only",
    oneTimeCostsTotal: 4_000_000,
    totalCashRequiredAtClosing: 154_000_000,
    prepaymentInformation: "stated_unrestricted",
    leasingPurchaseOptionPercentage: 0.1,
    leasingPurchaseOptionTiming: "Al finalizar el contrato",
    ...overrides,
  };
}

function withoutFields(
  quote: FinancingQuoteInput,
  ...fields: Array<keyof FinancingQuoteInput>
): FinancingQuoteInput {
  const copy: Record<string, unknown> = { ...quote };
  for (const field of fields) delete copy[field];
  return copy as unknown as FinancingQuoteInput;
}

describe("Quote Normalization v0.18", () => {
  it("treats missing material fields as readiness state instead of throwing", () => {
    const result = normalizeFinancingQuote({ quoteId: "partial", source: "user_declared" });

    expect(result.readiness).toBe("incomplete");
    expect(result.missingStructuralFields).toEqual([
      "contract_structure",
      "denomination",
      "financed_amount",
      "term_months",
      "initial_monthly_payment_or_canon",
    ]);
  });

  it("does not expose a misleading completeness percentage", () => {
    const result = normalizeFinancingQuote({ quoteId: "partial", source: "user_declared" });

    expect(result).not.toHaveProperty("completenessPercentage");
    expect(result).not.toHaveProperty("score");
  });

  it("marks a quote structurally ready when structural facts exist but comparison facts are missing", () => {
    const result = normalizeFinancingQuote({
      quoteId: "structural",
      source: "user_declared",
      contractStructure: "mortgage_credit",
      denomination: "pesos",
      financedAmount: 300_000_000,
      termMonths: 180,
      initialMonthlyPaymentOrCanon: 3_000_000,
    });

    expect(result.readiness).toBe("structurally_ready");
    expect(result.missingStructuralFields).toEqual([]);
    expect(result.missingComparisonFields).toContain("provider_name");
    expect(result.missingComparisonFields).toContain("quoted_rate_value");
  });

  it("marks a complete mortgage quote comparison-input ready without leasing option fields", () => {
    const result = normalizeFinancingQuote(mortgageQuote());

    expect(result.readiness).toBe("comparison_input_ready");
    expect(result.missingComparisonFields).toEqual([]);
    expect(result.missingComparisonFields).not.toContain("leasing_purchase_option");
  });

  it("requires leasing purchase-option economics for comparison-input readiness", () => {
    const result = normalizeFinancingQuote(
      withoutFields(
        leasingQuote(),
        "leasingPurchaseOptionPercentage",
        "leasingPurchaseOptionValue",
        "leasingPurchaseOptionTiming",
      ),
    );

    expect(result.readiness).toBe("structurally_ready");
    expect(result.missingComparisonFields).toContain("leasing_purchase_option");
    expect(result.missingComparisonFields).toContain("leasing_purchase_option_timing");
  });

  it("accepts a leasing quote with purchase-option value instead of percentage", () => {
    const result = normalizeFinancingQuote(
      withoutFields(leasingQuote({ leasingPurchaseOptionValue: 35_000_000 }), "leasingPurchaseOptionPercentage"),
    );

    expect(result.readiness).toBe("comparison_input_ready");
  });

  it("requires the quoted reference basis for a UVR quote", () => {
    const result = normalizeFinancingQuote(
      mortgageQuote({ denomination: "uvr", amortizationBehavior: "uvr_linked_payment" }),
    );

    expect(result.readiness).toBe("structurally_ready");
    expect(result.missingComparisonFields).toContain("rate_index_or_reference");
    expect(result.warnings.map((warning) => warning.code)).toContain("uvr_reference_missing");
  });

  it("can mark a UVR quote comparison-input ready when its quoted basis is supplied", () => {
    const result = normalizeFinancingQuote(
      mortgageQuote({
        denomination: "uvr",
        amortizationBehavior: "uvr_linked_payment",
        rateIndexOrReference: "UVR + tasa declarada en la cotización",
      }),
    );

    expect(result.readiness).toBe("comparison_input_ready");
  });

  it("keeps manually entered quote data at C1 and unverified", () => {
    const result = normalizeFinancingQuote(mortgageQuote());

    expect(result.precision).toBe("C1");
    expect(result.source).toBe("user_declared");
    expect(result.boundaries.isVerified).toBe(false);
  });

  it("derives financing percentage from property value and financed amount", () => {
    const result = normalizeFinancingQuote(mortgageQuote());

    expect(result.derived.financingPercentage).toBeCloseTo(0.7, 10);
  });

  it("flags but does not overwrite an inconsistent quoted financing percentage", () => {
    const result = normalizeFinancingQuote(mortgageQuote({ quotedFinancingPercentage: 0.8 }));

    expect(result.derived.financingPercentage).toBeCloseTo(0.7, 10);
    expect(result.warnings.map((warning) => warning.code)).toContain("financing_percentage_mismatch");
  });

  it("uses the financing-percentage tolerance only as a consistency tolerance", () => {
    const result = normalizeFinancingQuote(mortgageQuote({ quotedFinancingPercentage: 0.704 }));

    expect(result.warnings.map((warning) => warning.code)).not.toContain("financing_percentage_mismatch");
  });

  it("treats a missing validity date as warning rather than structural blocker", () => {
    const result = normalizeFinancingQuote(withoutFields(mortgageQuote(), "validUntil"));

    expect(result.readiness).toBe("comparison_input_ready");
    expect(result.warnings.map((warning) => warning.code)).toContain("validity_date_missing");
  });

  it("does not use the system clock to infer quote expiry", () => {
    const result = normalizeFinancingQuote(
      mortgageQuote({ quoteDate: "2020-01-01", validUntil: "2020-01-31" }),
    );

    expect(result.warnings.map((warning) => warning.code)).not.toContain("quote_may_be_expired");
  });

  it("only flags expiry against an explicit evaluation date", () => {
    const result = normalizeFinancingQuote(
      mortgageQuote({ quoteDate: "2026-08-01", validUntil: "2026-08-15" }),
      { evaluationDate: "2026-08-20" },
    );

    expect(result.warnings.map((warning) => warning.code)).toContain("quote_may_be_expired");
  });

  it("rejects malformed calendar dates", () => {
    expect(() => normalizeFinancingQuote(mortgageQuote({ quoteDate: "2026-02-30" }))).toThrow(
      "quoteDate must use a valid YYYY-MM-DD date",
    );
  });

  it("rejects a validity date earlier than quote date", () => {
    expect(() =>
      normalizeFinancingQuote(mortgageQuote({ quoteDate: "2026-08-20", validUntil: "2026-08-19" })),
    ).toThrow("validUntil cannot be earlier than quoteDate");
  });

  it("requires monthly insurance amount when insurance is not fully included", () => {
    const result = normalizeFinancingQuote(withoutFields(mortgageQuote(), "monthlyInsuranceAmount"));

    expect(result.readiness).toBe("structurally_ready");
    expect(result.missingComparisonFields).toContain("monthly_insurance_amount");
  });

  it("requires one-time cost total when one-time costs are declared as itemized or total-only", () => {
    const result = normalizeFinancingQuote(withoutFields(mortgageQuote(), "oneTimeCostsTotal"));

    expect(result.missingComparisonFields).toContain("one_time_costs_total");
  });

  it("does not require a cost total when the quote explicitly states no one-time costs", () => {
    const result = normalizeFinancingQuote(
      withoutFields(mortgageQuote({ oneTimeCostsTreatment: "stated_none" }), "oneTimeCostsTotal"),
    );

    expect(result.readiness).toBe("comparison_input_ready");
    expect(result.missingComparisonFields).not.toContain("one_time_costs_total");
  });

  it("requires rule text when prepayment information says rules were supplied", () => {
    const result = normalizeFinancingQuote(
      withoutFields(mortgageQuote({ prepaymentInformation: "rules_supplied" }), "prepaymentRulesText"),
    );

    expect(result.missingComparisonFields).toContain("prepayment_rules_text");
  });

  it("warns when leasing-option fields appear on a mortgage quote without treating them as required", () => {
    const result = normalizeFinancingQuote(
      mortgageQuote({ leasingPurchaseOptionPercentage: 0.1, leasingPurchaseOptionTiming: "Final" }),
    );

    expect(result.readiness).toBe("comparison_input_ready");
    expect(result.warnings.map((warning) => warning.code)).toContain("leasing_option_fields_on_mortgage");
  });

  it("flags when financing percentage cannot be derived from a partial basis", () => {
    const result = normalizeFinancingQuote(withoutFields(mortgageQuote(), "propertyValue"));

    expect(result.derived.financingPercentage).toBeNull();
    expect(result.warnings.map((warning) => warning.code)).toContain("financing_percentage_not_derivable");
  });

  it("blocks pair readiness when either quote lacks structural data", () => {
    const pair = normalizeFinancingQuotePair(
      { quoteId: "a", source: "user_declared" },
      mortgageQuote({ quoteId: "b" }),
    );

    expect(pair.readiness).toBe("blocked_by_missing_data");
    expect(pair.boundaries.hasWinner).toBe(false);
  });

  it("allows structural comparison when both quotes are structurally ready but not comparison-input ready", () => {
    const partialA = withoutFields(mortgageQuote(), "providerName");
    const partialB = withoutFields(mortgageQuote({ quoteId: "b" }), "providerName");
    const pair = normalizeFinancingQuotePair(partialA, partialB);

    expect(pair.readiness).toBe("ready_for_structural_comparison");
  });

  it("marks two complete quotes ready only for a future economic model", () => {
    const pair = normalizeFinancingQuotePair(mortgageQuote(), mortgageQuote({ quoteId: "b" }));

    expect(pair.readiness).toBe("ready_for_future_economic_model");
    expect(pair.boundaries).toEqual({
      hasWinner: false,
      hasSavingsCalculation: false,
      hasTotalCostProjection: false,
    });
  });

  it("surfaces different financed amounts and requires equity normalization", () => {
    const pair = normalizeFinancingQuotePair(
      mortgageQuote(),
      mortgageQuote({ quoteId: "b", financedAmount: 300_000_000, quotedFinancingPercentage: 0.6 }),
    );

    expect(pair.basisDifferences.map((difference) => difference.code)).toContain("financed_amount");
    expect(pair.basisDifferences.map((difference) => difference.code)).toContain("financing_percentage");
    expect(pair.modelingRequirements).toContain("normalize_financed_amount_or_equity");
  });

  it("requires an explicit UVR path or verified schedule before future peso-cost modeling", () => {
    const pair = normalizeFinancingQuotePair(
      mortgageQuote(),
      mortgageQuote({
        quoteId: "uvr",
        denomination: "uvr",
        amortizationBehavior: "uvr_linked_payment",
        rateIndexOrReference: "UVR + tasa declarada",
      }),
    );

    expect(pair.basisDifferences.map((difference) => difference.code)).toContain("denomination");
    expect(pair.modelingRequirements).toContain("uvr_path_or_verified_schedule");
  });

  it("requires purchase-option economics to be modeled when leasing is part of the pair", () => {
    const pair = normalizeFinancingQuotePair(mortgageQuote(), leasingQuote());

    expect(pair.basisDifferences.map((difference) => difference.code)).toContain("contract_structure");
    expect(pair.modelingRequirements).toContain("leasing_purchase_option_economics");
  });

  it("requires rate-convention normalization when conventions differ", () => {
    const pair = normalizeFinancingQuotePair(
      mortgageQuote(),
      mortgageQuote({ quoteId: "b", rateConvention: "monthly_effective" }),
    );

    expect(pair.basisDifferences.map((difference) => difference.code)).toContain("rate_convention");
    expect(pair.modelingRequirements).toContain("normalize_rate_conventions");
  });

  it("does not invent modeling requirements for two identical complete peso mortgage quotes", () => {
    const pair = normalizeFinancingQuotePair(mortgageQuote(), mortgageQuote({ quoteId: "b" }));

    expect(pair.modelingRequirements).toEqual([]);
  });

  it("surfaces term and quote-date differences instead of ranking headline payments", () => {
    const pair = normalizeFinancingQuotePair(
      mortgageQuote(),
      mortgageQuote({ quoteId: "b", termMonths: 180, quoteDate: "2026-08-21", validUntil: "2026-09-21" }),
    );

    expect(pair.basisDifferences.map((difference) => difference.code)).toEqual(
      expect.arrayContaining(["quote_date", "validity", "term"]),
    );
    expect(pair.modelingRequirements).toEqual(
      expect.arrayContaining(["normalize_term_or_compare_multiple_horizons", "quote_validity_alignment"]),
    );
  });

  it("never exposes winner, savings or total-cost outputs", () => {
    const pair = normalizeFinancingQuotePair(mortgageQuote(), leasingQuote());
    const serialized = JSON.stringify(pair).toLowerCase();

    expect(pair.boundaries.hasWinner).toBe(false);
    expect(pair.boundaries.hasSavingsCalculation).toBe(false);
    expect(pair.boundaries.hasTotalCostProjection).toBe(false);
    expect(serialized).not.toContain("bestquote");
    expect(serialized).not.toContain("cheapestquote");
    expect(serialized).not.toContain("recommendedlender");
  });

  it("keeps underwriting and bank matching outside the result boundary", () => {
    const result = normalizeFinancingQuote(mortgageQuote());

    expect(result.boundaries.isEligibility).toBe(false);
    expect(result.boundaries.isApproval).toBe(false);
    expect(result.boundaries.isBankMatch).toBe(false);
    expect(result.boundaries.isCostRanking).toBe(false);
    expect(result.boundaries.isEconomicComparison).toBe(false);
  });

  it("rejects negative monetary values and rates", () => {
    expect(() => normalizeFinancingQuote(mortgageQuote({ financedAmount: -1 }))).toThrow();
    expect(() => normalizeFinancingQuote(mortgageQuote({ quotedRateValue: -0.01 }))).toThrow();
    expect(() => normalizeFinancingQuote(mortgageQuote({ totalCashRequiredAtClosing: -1 }))).toThrow();
  });

  it("rejects invalid terms and out-of-range percentages", () => {
    expect(() => normalizeFinancingQuote(mortgageQuote({ termMonths: 0 }))).toThrow(
      "termMonths must be a positive integer",
    );
    expect(() => normalizeFinancingQuote(mortgageQuote({ termMonths: 12.5 }))).toThrow(
      "termMonths must be a positive integer",
    );
    expect(() => normalizeFinancingQuote(mortgageQuote({ quotedFinancingPercentage: 1.1 }))).toThrow();
  });

  it("does not return user identity fields from quote normalization", () => {
    const result = normalizeFinancingQuote(mortgageQuote());

    expect(result).not.toHaveProperty("name");
    expect(result).not.toHaveProperty("email");
    expect(result).not.toHaveProperty("phone");
    expect(result).not.toHaveProperty("documentNumber");
  });
});
