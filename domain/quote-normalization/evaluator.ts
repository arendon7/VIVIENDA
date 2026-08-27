export type PrecisionLevel = "C1";

export type QuoteEvidenceSource = "user_declared";
export type QuoteContractStructure = "mortgage_credit" | "housing_leasing";
export type QuoteDenomination = "pesos" | "uvr";
export type QuoteRateConvention =
  | "effective_annual"
  | "nominal_annual_monthly"
  | "monthly_effective"
  | "other"
  | "unknown";
export type QuoteAmortizationBehavior =
  | "constant_nominal_payment"
  | "constant_principal"
  | "uvr_linked_payment"
  | "other"
  | "unknown";
export type InsuranceTreatment =
  | "included_in_initial_payment"
  | "excluded_from_initial_payment"
  | "partially_included"
  | "unknown";
export type OneTimeCostsTreatment = "itemized" | "total_only" | "stated_none" | "unknown";
export type PrepaymentInformation = "rules_supplied" | "stated_unrestricted" | "unknown";

export type FinancingQuoteInput = {
  quoteId: string;
  source: QuoteEvidenceSource;
  providerName?: string;
  quoteDate?: string;
  validUntil?: string;
  contractStructure?: QuoteContractStructure;
  denomination?: QuoteDenomination;
  amortizationBehavior?: QuoteAmortizationBehavior;
  amortizationLabel?: string;
  propertyValue?: number;
  financedAmount?: number;
  quotedFinancingPercentage?: number;
  termMonths?: number;
  quotedRateValue?: number;
  rateConvention?: QuoteRateConvention;
  rateIndexOrReference?: string;
  initialMonthlyPaymentOrCanon?: number;
  insuranceTreatment?: InsuranceTreatment;
  monthlyInsuranceAmount?: number;
  oneTimeCostsTreatment?: OneTimeCostsTreatment;
  oneTimeCostsTotal?: number;
  totalCashRequiredAtClosing?: number;
  prepaymentInformation?: PrepaymentInformation;
  prepaymentRulesText?: string;
  leasingPurchaseOptionValue?: number;
  leasingPurchaseOptionPercentage?: number;
  leasingPurchaseOptionTiming?: string;
  notes?: string;
};

export type QuoteReadiness = "incomplete" | "structurally_ready" | "comparison_input_ready";

export type QuoteFieldCode =
  | "provider_name"
  | "quote_date"
  | "contract_structure"
  | "denomination"
  | "property_value"
  | "financed_amount"
  | "term_months"
  | "amortization_behavior"
  | "quoted_rate_value"
  | "rate_convention"
  | "initial_monthly_payment_or_canon"
  | "insurance_treatment"
  | "monthly_insurance_amount"
  | "one_time_costs_treatment"
  | "one_time_costs_total"
  | "total_cash_required_at_closing"
  | "prepayment_information"
  | "prepayment_rules_text"
  | "rate_index_or_reference"
  | "leasing_purchase_option"
  | "leasing_purchase_option_timing";

export type QuoteWarningCode =
  | "validity_date_missing"
  | "quote_may_be_expired"
  | "financing_percentage_mismatch"
  | "financing_percentage_not_derivable"
  | "rate_convention_other"
  | "amortization_behavior_other"
  | "insurance_amount_without_exclusion"
  | "leasing_option_fields_on_mortgage"
  | "uvr_reference_missing";

export type QuoteWarning = {
  code: QuoteWarningCode;
  message: string;
};

export type NormalizedQuote = {
  quoteId: string;
  precision: PrecisionLevel;
  source: QuoteEvidenceSource;
  readiness: QuoteReadiness;
  missingStructuralFields: QuoteFieldCode[];
  missingComparisonFields: QuoteFieldCode[];
  warnings: QuoteWarning[];
  derived: {
    financingPercentage: number | null;
  };
  boundaries: {
    isVerified: false;
    isEconomicComparison: false;
    isCostRanking: false;
    isEligibility: false;
    isApproval: false;
    isBankMatch: false;
  };
};

export type QuotePairReadiness =
  | "blocked_by_missing_data"
  | "ready_for_structural_comparison"
  | "ready_for_future_economic_model";

export type QuoteBasisDifferenceCode =
  | "provider"
  | "quote_date"
  | "validity"
  | "contract_structure"
  | "denomination"
  | "property_value"
  | "financed_amount"
  | "financing_percentage"
  | "term"
  | "rate_convention"
  | "amortization_behavior"
  | "insurance_treatment"
  | "cash_required"
  | "leasing_purchase_option";

export type QuoteBasisDifference = {
  code: QuoteBasisDifferenceCode;
  quoteAValue: string | number | null;
  quoteBValue: string | number | null;
};

export type ModelingRequirement =
  | "uvr_path_or_verified_schedule"
  | "leasing_purchase_option_economics"
  | "normalize_rate_conventions"
  | "normalize_insurance_treatment"
  | "normalize_one_time_costs"
  | "normalize_financed_amount_or_equity"
  | "normalize_term_or_compare_multiple_horizons"
  | "quote_validity_alignment";

export type NormalizedQuotePair = {
  readiness: QuotePairReadiness;
  quoteA: NormalizedQuote;
  quoteB: NormalizedQuote;
  basisDifferences: QuoteBasisDifference[];
  modelingRequirements: ModelingRequirement[];
  boundaries: {
    hasWinner: false;
    hasSavingsCalculation: false;
    hasTotalCostProjection: false;
  };
};

export type NormalizeQuoteOptions = {
  evaluationDate?: string;
};

const FINANCING_PERCENTAGE_TOLERANCE = 0.005;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function validateDate(label: string, value: string | undefined): void {
  if (value !== undefined && !isValidIsoDate(value)) {
    throw new Error(`${label} must use a valid YYYY-MM-DD date`);
  }
}

function validateNonNegative(label: string, value: number | undefined): void {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
    throw new Error(`${label} must be a finite non-negative number`);
  }
}

function validatePercentage(label: string, value: number | undefined): void {
  if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > 1)) {
    throw new Error(`${label} must be between 0 and 1`);
  }
}

function validateQuote(input: FinancingQuoteInput, options: NormalizeQuoteOptions): void {
  if (!hasText(input.quoteId)) throw new Error("quoteId is required");
  if (input.source !== "user_declared") throw new Error("v0.18 only accepts user_declared quote data");

  validateDate("quoteDate", input.quoteDate);
  validateDate("validUntil", input.validUntil);
  validateDate("evaluationDate", options.evaluationDate);

  if (input.quoteDate && input.validUntil && input.validUntil < input.quoteDate) {
    throw new Error("validUntil cannot be earlier than quoteDate");
  }

  const monetaryFields: Array<[string, number | undefined]> = [
    ["propertyValue", input.propertyValue],
    ["financedAmount", input.financedAmount],
    ["initialMonthlyPaymentOrCanon", input.initialMonthlyPaymentOrCanon],
    ["monthlyInsuranceAmount", input.monthlyInsuranceAmount],
    ["oneTimeCostsTotal", input.oneTimeCostsTotal],
    ["totalCashRequiredAtClosing", input.totalCashRequiredAtClosing],
    ["leasingPurchaseOptionValue", input.leasingPurchaseOptionValue],
  ];
  for (const [label, value] of monetaryFields) validateNonNegative(label, value);

  validatePercentage("quotedFinancingPercentage", input.quotedFinancingPercentage);
  validatePercentage("leasingPurchaseOptionPercentage", input.leasingPurchaseOptionPercentage);
  validateNonNegative("quotedRateValue", input.quotedRateValue);

  if (input.termMonths !== undefined && (!Number.isInteger(input.termMonths) || input.termMonths <= 0)) {
    throw new Error("termMonths must be a positive integer");
  }
}

function deriveFinancingPercentage(input: FinancingQuoteInput): number | null {
  if (!hasNumber(input.propertyValue) || input.propertyValue <= 0 || !hasNumber(input.financedAmount)) {
    return null;
  }
  return input.financedAmount / input.propertyValue;
}

function pushMissing(list: QuoteFieldCode[], code: QuoteFieldCode, condition: boolean): void {
  if (condition && !list.includes(code)) list.push(code);
}

function getMissingStructuralFields(input: FinancingQuoteInput): QuoteFieldCode[] {
  const missing: QuoteFieldCode[] = [];
  pushMissing(missing, "contract_structure", input.contractStructure === undefined);
  pushMissing(missing, "denomination", input.denomination === undefined);
  pushMissing(missing, "financed_amount", !hasNumber(input.financedAmount));
  pushMissing(missing, "term_months", !hasNumber(input.termMonths));
  pushMissing(missing, "initial_monthly_payment_or_canon", !hasNumber(input.initialMonthlyPaymentOrCanon));
  return missing;
}

function getMissingComparisonFields(input: FinancingQuoteInput): QuoteFieldCode[] {
  const missing: QuoteFieldCode[] = [];

  pushMissing(missing, "provider_name", !hasText(input.providerName));
  pushMissing(missing, "quote_date", !hasText(input.quoteDate));
  for (const code of getMissingStructuralFields(input)) pushMissing(missing, code, true);

  pushMissing(missing, "property_value", !hasNumber(input.propertyValue));
  pushMissing(
    missing,
    "amortization_behavior",
    input.amortizationBehavior === undefined || input.amortizationBehavior === "unknown",
  );
  pushMissing(missing, "quoted_rate_value", !hasNumber(input.quotedRateValue));
  pushMissing(missing, "rate_convention", input.rateConvention === undefined || input.rateConvention === "unknown");
  pushMissing(
    missing,
    "insurance_treatment",
    input.insuranceTreatment === undefined || input.insuranceTreatment === "unknown",
  );
  pushMissing(
    missing,
    "one_time_costs_treatment",
    input.oneTimeCostsTreatment === undefined || input.oneTimeCostsTreatment === "unknown",
  );
  pushMissing(missing, "total_cash_required_at_closing", !hasNumber(input.totalCashRequiredAtClosing));
  pushMissing(
    missing,
    "prepayment_information",
    input.prepaymentInformation === undefined || input.prepaymentInformation === "unknown",
  );

  if (
    input.insuranceTreatment === "excluded_from_initial_payment" ||
    input.insuranceTreatment === "partially_included"
  ) {
    pushMissing(missing, "monthly_insurance_amount", !hasNumber(input.monthlyInsuranceAmount));
  }

  if (input.oneTimeCostsTreatment === "itemized" || input.oneTimeCostsTreatment === "total_only") {
    pushMissing(missing, "one_time_costs_total", !hasNumber(input.oneTimeCostsTotal));
  }

  if (input.prepaymentInformation === "rules_supplied") {
    pushMissing(missing, "prepayment_rules_text", !hasText(input.prepaymentRulesText));
  }

  if (input.denomination === "uvr") {
    pushMissing(missing, "rate_index_or_reference", !hasText(input.rateIndexOrReference));
  }

  if (input.contractStructure === "housing_leasing") {
    const hasPurchaseOption =
      hasNumber(input.leasingPurchaseOptionValue) || hasNumber(input.leasingPurchaseOptionPercentage);
    pushMissing(missing, "leasing_purchase_option", !hasPurchaseOption);
    pushMissing(missing, "leasing_purchase_option_timing", !hasText(input.leasingPurchaseOptionTiming));
  }

  return missing;
}

function buildWarnings(
  input: FinancingQuoteInput,
  derivedFinancingPercentage: number | null,
  options: NormalizeQuoteOptions,
): QuoteWarning[] {
  const warnings: QuoteWarning[] = [];
  const add = (code: QuoteWarningCode, message: string) => warnings.push({ code, message });

  if (!input.validUntil) {
    add("validity_date_missing", "La cotización no tiene una fecha de vigencia declarada.");
  } else if (options.evaluationDate && input.validUntil < options.evaluationDate) {
    add("quote_may_be_expired", "La vigencia declarada termina antes de la fecha de evaluación suministrada.");
  }

  if (
    hasNumber(input.quotedFinancingPercentage) &&
    derivedFinancingPercentage !== null &&
    Math.abs(input.quotedFinancingPercentage - derivedFinancingPercentage) > FINANCING_PERCENTAGE_TOLERANCE
  ) {
    add(
      "financing_percentage_mismatch",
      "El porcentaje de financiación declarado difiere del porcentaje derivado de valor del inmueble y monto financiado.",
    );
  }

  const oneFinancingBasisPresent = hasNumber(input.propertyValue) !== hasNumber(input.financedAmount);
  if (oneFinancingBasisPresent || (hasNumber(input.propertyValue) && input.propertyValue <= 0)) {
    add(
      "financing_percentage_not_derivable",
      "No es posible derivar un porcentaje de financiación con la información declarada.",
    );
  }

  if (input.rateConvention === "other") {
    add("rate_convention_other", "La convención de tasa requiere interpretación antes de una comparación económica.");
  }

  if (input.amortizationBehavior === "other") {
    add(
      "amortization_behavior_other",
      "El comportamiento de amortización/canon requiere interpretación antes de proyectar flujos.",
    );
  }

  if (
    input.insuranceTreatment === "included_in_initial_payment" &&
    hasNumber(input.monthlyInsuranceAmount)
  ) {
    add(
      "insurance_amount_without_exclusion",
      "Se declaró un seguro mensual separado aunque la cuota inicial fue marcada como incluyendo el seguro; debe verificarse para evitar doble conteo.",
    );
  }

  const hasLeasingOptionFields =
    hasNumber(input.leasingPurchaseOptionValue) ||
    hasNumber(input.leasingPurchaseOptionPercentage) ||
    hasText(input.leasingPurchaseOptionTiming);
  if (input.contractStructure === "mortgage_credit" && hasLeasingOptionFields) {
    add(
      "leasing_option_fields_on_mortgage",
      "Se declararon datos de opción de compra en una cotización marcada como crédito hipotecario.",
    );
  }

  if (input.denomination === "uvr" && !hasText(input.rateIndexOrReference)) {
    add(
      "uvr_reference_missing",
      "La cotización UVR no declara el índice o referencia de tasa necesario para interpretar correctamente su base.",
    );
  }

  return warnings;
}

export function normalizeFinancingQuote(
  input: FinancingQuoteInput,
  options: NormalizeQuoteOptions = {},
): NormalizedQuote {
  validateQuote(input, options);

  const missingStructuralFields = getMissingStructuralFields(input);
  const missingComparisonFields = getMissingComparisonFields(input);
  const financingPercentage = deriveFinancingPercentage(input);
  const warnings = buildWarnings(input, financingPercentage, options);

  const readiness: QuoteReadiness =
    missingStructuralFields.length > 0
      ? "incomplete"
      : missingComparisonFields.length > 0
        ? "structurally_ready"
        : "comparison_input_ready";

  return {
    quoteId: input.quoteId,
    precision: "C1",
    source: "user_declared",
    readiness,
    missingStructuralFields,
    missingComparisonFields,
    warnings,
    derived: { financingPercentage },
    boundaries: {
      isVerified: false,
      isEconomicComparison: false,
      isCostRanking: false,
      isEligibility: false,
      isApproval: false,
      isBankMatch: false,
    },
  };
}

function comparableValue(value: string | number | undefined): string | number | null {
  if (value === undefined) return null;
  return typeof value === "string" ? value.trim() || null : value;
}

function effectiveFinancingPercentage(input: FinancingQuoteInput, normalized: NormalizedQuote): number | null {
  return normalized.derived.financingPercentage ?? input.quotedFinancingPercentage ?? null;
}

function purchaseOptionSignature(input: FinancingQuoteInput): string | null {
  const value = hasNumber(input.leasingPurchaseOptionValue) ? input.leasingPurchaseOptionValue : null;
  const percentage = hasNumber(input.leasingPurchaseOptionPercentage)
    ? input.leasingPurchaseOptionPercentage
    : null;
  const timing = hasText(input.leasingPurchaseOptionTiming) ? input.leasingPurchaseOptionTiming!.trim() : null;
  if (value === null && percentage === null && timing === null) return null;
  return JSON.stringify({ value, percentage, timing });
}

function valuesDiffer(a: string | number | null, b: string | number | null): boolean {
  return a !== b;
}

function financingPercentagesDiffer(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a !== b;
  return Math.abs(a - b) > FINANCING_PERCENTAGE_TOLERANCE;
}

function buildBasisDifferences(
  quoteAInput: FinancingQuoteInput,
  quoteBInput: FinancingQuoteInput,
  quoteA: NormalizedQuote,
  quoteB: NormalizedQuote,
): QuoteBasisDifference[] {
  const differences: QuoteBasisDifference[] = [];
  const add = (
    code: QuoteBasisDifferenceCode,
    quoteAValue: string | number | null,
    quoteBValue: string | number | null,
    differs = valuesDiffer(quoteAValue, quoteBValue),
  ) => {
    if (differs) differences.push({ code, quoteAValue, quoteBValue });
  };

  add("provider", comparableValue(quoteAInput.providerName), comparableValue(quoteBInput.providerName));
  add("quote_date", comparableValue(quoteAInput.quoteDate), comparableValue(quoteBInput.quoteDate));
  add("validity", comparableValue(quoteAInput.validUntil), comparableValue(quoteBInput.validUntil));
  add(
    "contract_structure",
    comparableValue(quoteAInput.contractStructure),
    comparableValue(quoteBInput.contractStructure),
  );
  add("denomination", comparableValue(quoteAInput.denomination), comparableValue(quoteBInput.denomination));
  add("property_value", comparableValue(quoteAInput.propertyValue), comparableValue(quoteBInput.propertyValue));
  add("financed_amount", comparableValue(quoteAInput.financedAmount), comparableValue(quoteBInput.financedAmount));

  const financingPercentageA = effectiveFinancingPercentage(quoteAInput, quoteA);
  const financingPercentageB = effectiveFinancingPercentage(quoteBInput, quoteB);
  add(
    "financing_percentage",
    financingPercentageA,
    financingPercentageB,
    financingPercentagesDiffer(financingPercentageA, financingPercentageB),
  );

  add("term", comparableValue(quoteAInput.termMonths), comparableValue(quoteBInput.termMonths));
  add(
    "rate_convention",
    comparableValue(quoteAInput.rateConvention),
    comparableValue(quoteBInput.rateConvention),
  );
  add(
    "amortization_behavior",
    comparableValue(quoteAInput.amortizationBehavior),
    comparableValue(quoteBInput.amortizationBehavior),
  );
  add(
    "insurance_treatment",
    comparableValue(quoteAInput.insuranceTreatment),
    comparableValue(quoteBInput.insuranceTreatment),
  );
  add(
    "cash_required",
    comparableValue(quoteAInput.totalCashRequiredAtClosing),
    comparableValue(quoteBInput.totalCashRequiredAtClosing),
  );
  add(
    "leasing_purchase_option",
    purchaseOptionSignature(quoteAInput),
    purchaseOptionSignature(quoteBInput),
  );

  return differences;
}

function buildModelingRequirements(
  quoteAInput: FinancingQuoteInput,
  quoteBInput: FinancingQuoteInput,
  basisDifferences: QuoteBasisDifference[],
): ModelingRequirement[] {
  const requirements: ModelingRequirement[] = [];
  const add = (requirement: ModelingRequirement, condition: boolean) => {
    if (condition && !requirements.includes(requirement)) requirements.push(requirement);
  };
  const hasDifference = (code: QuoteBasisDifferenceCode) => basisDifferences.some((item) => item.code === code);

  add(
    "uvr_path_or_verified_schedule",
    quoteAInput.denomination === "uvr" || quoteBInput.denomination === "uvr",
  );
  add(
    "leasing_purchase_option_economics",
    quoteAInput.contractStructure === "housing_leasing" || quoteBInput.contractStructure === "housing_leasing",
  );
  add(
    "normalize_rate_conventions",
    hasDifference("rate_convention") ||
      quoteAInput.rateConvention === "other" ||
      quoteBInput.rateConvention === "other",
  );
  add(
    "normalize_insurance_treatment",
    hasDifference("insurance_treatment") ||
      quoteAInput.insuranceTreatment === "partially_included" ||
      quoteBInput.insuranceTreatment === "partially_included",
  );
  add(
    "normalize_one_time_costs",
    quoteAInput.oneTimeCostsTreatment !== quoteBInput.oneTimeCostsTreatment ||
      quoteAInput.oneTimeCostsTotal !== quoteBInput.oneTimeCostsTotal,
  );
  add(
    "normalize_financed_amount_or_equity",
    hasDifference("financed_amount") || hasDifference("financing_percentage") || hasDifference("property_value"),
  );
  add("normalize_term_or_compare_multiple_horizons", hasDifference("term"));
  add("quote_validity_alignment", hasDifference("quote_date") || hasDifference("validity"));

  return requirements;
}

export function normalizeFinancingQuotePair(
  quoteAInput: FinancingQuoteInput,
  quoteBInput: FinancingQuoteInput,
  options: NormalizeQuoteOptions = {},
): NormalizedQuotePair {
  const quoteA = normalizeFinancingQuote(quoteAInput, options);
  const quoteB = normalizeFinancingQuote(quoteBInput, options);
  const basisDifferences = buildBasisDifferences(quoteAInput, quoteBInput, quoteA, quoteB);
  const modelingRequirements = buildModelingRequirements(quoteAInput, quoteBInput, basisDifferences);

  const readiness: QuotePairReadiness =
    quoteA.readiness === "incomplete" || quoteB.readiness === "incomplete"
      ? "blocked_by_missing_data"
      : quoteA.readiness === "comparison_input_ready" && quoteB.readiness === "comparison_input_ready"
        ? "ready_for_future_economic_model"
        : "ready_for_structural_comparison";

  return {
    readiness,
    quoteA,
    quoteB,
    basisDifferences,
    modelingRequirements,
    boundaries: {
      hasWinner: false,
      hasSavingsCalculation: false,
      hasTotalCostProjection: false,
    },
  };
}
