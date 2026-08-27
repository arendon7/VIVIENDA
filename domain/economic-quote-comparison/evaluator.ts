import {
  type FinancingQuoteInput,
  type NormalizedQuote,
  normalizeFinancingQuote,
  normalizeFinancingQuotePair,
} from "../quote-normalization/evaluator";

export type EconomicComparisonPrecision = "C1" | "C2";

export type UvrScenario = {
  kind: "constant_annual_growth";
  annualGrowthRate: number;
};

export type LeasingOptionScenario = {
  exercise: boolean;
  timing?: "contract_end";
  percentageBase?: "property_value" | "financed_amount";
};

export type EconomicComparisonScenario = {
  scenarioId: string;
  uvrScenario?: UvrScenario;
  annualDiscountRate?: number;
  leasingOptions?: Record<string, LeasingOptionScenario>;
};

export type EconomicQuoteModelStatus =
  | "blocked_by_quote_readiness"
  | "missing_scenario_assumption"
  | "unsupported_payment_path"
  | "modeled";

export type EconomicIssueCode =
  | "quote_not_comparison_ready"
  | "uvr_scenario_missing"
  | "unsupported_payment_path"
  | "leasing_option_decision_missing"
  | "leasing_option_timing_missing"
  | "leasing_option_percentage_base_missing"
  | "leasing_option_value_missing";

export type EconomicIssue = {
  code: EconomicIssueCode;
  message: string;
};

export type ModeledEconomicPeriod = {
  month: number;
  baseOutflow: number;
  insuranceOutflow: number;
  purchaseOptionOutflow: number;
  totalOutflow: number;
  discountFactor: number | null;
  presentValueOutflow: number | null;
};

export type ModeledQuoteCashFlow = {
  quoteId: string;
  inputPrecision: "C1";
  outputPrecision: "C2";
  initialCashOutflow: number;
  recurringBaseOutflow: number;
  recurringInsuranceOutflow: number;
  purchaseOptionOutflow: number;
  nominalTotalOutflow: number;
  presentValueOutflow: number | null;
  fullAcquisition: boolean;
  periods: ModeledEconomicPeriod[];
  assumptions: {
    uvrAnnualGrowthRate: number | null;
    annualDiscountRate: number | null;
    insurancePath: "included_in_declared_payment" | "flat_declared_external_amount";
    leasingPurchaseOptionExercised: boolean | null;
  };
};

export type EconomicQuoteModel = {
  quoteId: string;
  inputPrecision: "C1";
  outputPrecision: "C2" | null;
  status: EconomicQuoteModelStatus;
  normalizedQuote: NormalizedQuote;
  issues: EconomicIssue[];
  cashFlow: ModeledQuoteCashFlow | null;
  boundaries: {
    isVerified: false;
    isScenarioModel: boolean;
    isMarketForecast: false;
    isEligibility: false;
    isApproval: false;
    isBankMatch: false;
    isLegalRecommendation: false;
    isGuaranteedSavings: false;
  };
};

export type EconomicPairStatus =
  | "blocked"
  | "modeled_not_rankable"
  | "nominally_comparable"
  | "present_value_comparable";

export type EconomicPairGateCode =
  | "quote_model_blocked"
  | "property_value_differs"
  | "financed_amount_differs"
  | "term_differs"
  | "discount_rate_missing"
  | "full_acquisition_not_equivalent";

export type EconomicMetricComparison = {
  quoteAValue: number | null;
  quoteBValue: number | null;
  absoluteDifference: number | null;
  isComparable: boolean;
  lowerQuoteId: string | null;
  tie: boolean;
};

export type EconomicQuotePairComparison = {
  scenarioId: string;
  status: EconomicPairStatus;
  quoteA: EconomicQuoteModel;
  quoteB: EconomicQuoteModel;
  normalizedPairReadiness: ReturnType<typeof normalizeFinancingQuotePair>["readiness"];
  nominalGateIssues: EconomicPairGateCode[];
  presentValueGateIssues: EconomicPairGateCode[];
  nominal: EconomicMetricComparison;
  presentValue: EconomicMetricComparison;
  boundaries: {
    isVerified: false;
    isScenarioModel: true;
    isMarketForecast: false;
    isEligibility: false;
    isApproval: false;
    isBankMatch: false;
    isLegalRecommendation: false;
    isGuaranteedSavings: false;
    hasBestBank: false;
  };
};

export class InvalidEconomicScenarioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidEconomicScenarioError";
  }
}

const MONEY_TOLERANCE = 1;

function hasNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function requireFiniteAboveMinusOne(name: string, value: number | undefined) {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value <= -1) {
    throw new InvalidEconomicScenarioError(`${name} must be finite and greater than -1.`);
  }
}

function validateScenario(scenario: EconomicComparisonScenario) {
  if (!scenario.scenarioId.trim()) {
    throw new InvalidEconomicScenarioError("scenarioId must not be empty.");
  }
  requireFiniteAboveMinusOne("uvrScenario.annualGrowthRate", scenario.uvrScenario?.annualGrowthRate);
  requireFiniteAboveMinusOne("annualDiscountRate", scenario.annualDiscountRate);
}

function monthlyRateFromAnnual(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

function buildIssue(code: EconomicIssueCode, message: string): EconomicIssue {
  return { code, message };
}

function blockedModel(
  input: FinancingQuoteInput,
  normalizedQuote: NormalizedQuote,
  status: Exclude<EconomicQuoteModelStatus, "modeled">,
  issues: EconomicIssue[],
): EconomicQuoteModel {
  return {
    quoteId: input.quoteId,
    inputPrecision: "C1",
    outputPrecision: null,
    status,
    normalizedQuote,
    issues,
    cashFlow: null,
    boundaries: {
      isVerified: false,
      isScenarioModel: false,
      isMarketForecast: false,
      isEligibility: false,
      isApproval: false,
      isBankMatch: false,
      isLegalRecommendation: false,
      isGuaranteedSavings: false,
    },
  };
}

function resolveLeasingPurchaseOption(
  input: FinancingQuoteInput,
  scenario: EconomicComparisonScenario,
): { issue: EconomicIssue | null; exercise: boolean; value: number; fullAcquisition: boolean } {
  if (input.contractStructure !== "housing_leasing") {
    return { issue: null, exercise: false, value: 0, fullAcquisition: true };
  }

  const optionScenario = scenario.leasingOptions?.[input.quoteId];
  if (!optionScenario) {
    return {
      issue: buildIssue(
        "leasing_option_decision_missing",
        "Falta definir si la opción de compra del leasing se ejerce en este escenario.",
      ),
      exercise: false,
      value: 0,
      fullAcquisition: false,
    };
  }

  if (!optionScenario.exercise) {
    return { issue: null, exercise: false, value: 0, fullAcquisition: false };
  }

  if (optionScenario.timing !== "contract_end") {
    return {
      issue: buildIssue(
        "leasing_option_timing_missing",
        "v0.19 requiere confirmar que la opción de compra se modela al final del contrato.",
      ),
      exercise: true,
      value: 0,
      fullAcquisition: false,
    };
  }

  if (hasNumber(input.leasingPurchaseOptionValue)) {
    return {
      issue: null,
      exercise: true,
      value: input.leasingPurchaseOptionValue,
      fullAcquisition: true,
    };
  }

  if (hasNumber(input.leasingPurchaseOptionPercentage)) {
    if (!optionScenario.percentageBase) {
      return {
        issue: buildIssue(
          "leasing_option_percentage_base_missing",
          "La opción de compra está expresada como porcentaje y requiere una base explícita.",
        ),
        exercise: true,
        value: 0,
        fullAcquisition: false,
      };
    }

    const base =
      optionScenario.percentageBase === "property_value"
        ? input.propertyValue
        : input.financedAmount;

    if (!hasNumber(base)) {
      return {
        issue: buildIssue(
          "leasing_option_value_missing",
          "No existe el valor base necesario para calcular la opción de compra porcentual.",
        ),
        exercise: true,
        value: 0,
        fullAcquisition: false,
      };
    }

    return {
      issue: null,
      exercise: true,
      value: input.leasingPurchaseOptionPercentage * base,
      fullAcquisition: true,
    };
  }

  return {
    issue: buildIssue(
      "leasing_option_value_missing",
      "La cotización de leasing no contiene una opción de compra utilizable por el modelo.",
    ),
    exercise: true,
    value: 0,
    fullAcquisition: false,
  };
}

function recurringInsuranceOutflow(input: FinancingQuoteInput): {
  monthlyAmount: number;
  assumption: ModeledQuoteCashFlow["assumptions"]["insurancePath"];
} {
  if (input.insuranceTreatment === "included_in_initial_payment") {
    return { monthlyAmount: 0, assumption: "included_in_declared_payment" };
  }

  return {
    monthlyAmount: input.monthlyInsuranceAmount ?? 0,
    assumption: "flat_declared_external_amount",
  };
}

function baseOutflowAtMonth(
  input: FinancingQuoteInput,
  scenario: EconomicComparisonScenario,
  month: number,
): number | EconomicIssue {
  const initial = input.initialMonthlyPaymentOrCanon!;

  if (
    input.denomination === "pesos" &&
    input.amortizationBehavior === "constant_nominal_payment"
  ) {
    return initial;
  }

  if (
    input.denomination === "uvr" &&
    input.amortizationBehavior === "uvr_linked_payment"
  ) {
    if (!scenario.uvrScenario) {
      return buildIssue(
        "uvr_scenario_missing",
        "La cotización UVR requiere una trayectoria de escenario explícita antes de proyectar desembolsos.",
      );
    }

    const monthlyGrowth = monthlyRateFromAnnual(scenario.uvrScenario.annualGrowthRate);
    return initial * Math.pow(1 + monthlyGrowth, month - 1);
  }

  return buildIssue(
    "unsupported_payment_path",
    "El comportamiento de cuota/canon declarado no tiene un modelo de flujo gobernado en v0.19.",
  );
}

export function modelEconomicQuote(
  input: FinancingQuoteInput,
  scenario: EconomicComparisonScenario,
): EconomicQuoteModel {
  validateScenario(scenario);
  const normalizedQuote = normalizeFinancingQuote(input);

  if (normalizedQuote.readiness !== "comparison_input_ready") {
    return blockedModel(
      input,
      normalizedQuote,
      "blocked_by_quote_readiness",
      [
        buildIssue(
          "quote_not_comparison_ready",
          "La cotización todavía no tiene todos los datos materiales exigidos por Quote Normalization v0.18.",
        ),
      ],
    );
  }

  const option = resolveLeasingPurchaseOption(input, scenario);
  if (option.issue) {
    return blockedModel(
      input,
      normalizedQuote,
      "missing_scenario_assumption",
      [option.issue],
    );
  }

  const firstBaseOutflow = baseOutflowAtMonth(input, scenario, 1);
  if (typeof firstBaseOutflow !== "number") {
    const status: EconomicQuoteModelStatus =
      firstBaseOutflow.code === "uvr_scenario_missing"
        ? "missing_scenario_assumption"
        : "unsupported_payment_path";
    return blockedModel(input, normalizedQuote, status, [firstBaseOutflow]);
  }

  const insurance = recurringInsuranceOutflow(input);
  const monthlyDiscountRate =
    scenario.annualDiscountRate === undefined
      ? null
      : monthlyRateFromAnnual(scenario.annualDiscountRate);

  const periods: ModeledEconomicPeriod[] = [];
  let recurringBaseTotal = 0;
  let recurringInsuranceTotal = 0;
  let purchaseOptionTotal = 0;
  let presentValuePeriodsTotal = 0;

  for (let month = 1; month <= input.termMonths!; month += 1) {
    const base = baseOutflowAtMonth(input, scenario, month);
    if (typeof base !== "number") {
      return blockedModel(input, normalizedQuote, "unsupported_payment_path", [base]);
    }

    const purchaseOptionOutflow =
      input.contractStructure === "housing_leasing" &&
      option.exercise &&
      month === input.termMonths
        ? option.value
        : 0;
    const totalOutflow = base + insurance.monthlyAmount + purchaseOptionOutflow;
    const discountFactor =
      monthlyDiscountRate === null ? null : Math.pow(1 + monthlyDiscountRate, month);
    const presentValueOutflow =
      discountFactor === null ? null : totalOutflow / discountFactor;

    recurringBaseTotal += base;
    recurringInsuranceTotal += insurance.monthlyAmount;
    purchaseOptionTotal += purchaseOptionOutflow;
    if (presentValueOutflow !== null) presentValuePeriodsTotal += presentValueOutflow;

    periods.push({
      month,
      baseOutflow: base,
      insuranceOutflow: insurance.monthlyAmount,
      purchaseOptionOutflow,
      totalOutflow,
      discountFactor,
      presentValueOutflow,
    });
  }

  const initialCashOutflow = input.totalCashRequiredAtClosing!;
  const nominalTotalOutflow =
    initialCashOutflow + recurringBaseTotal + recurringInsuranceTotal + purchaseOptionTotal;
  const presentValueOutflow =
    monthlyDiscountRate === null
      ? null
      : initialCashOutflow + presentValuePeriodsTotal;

  return {
    quoteId: input.quoteId,
    inputPrecision: "C1",
    outputPrecision: "C2",
    status: "modeled",
    normalizedQuote,
    issues: [],
    cashFlow: {
      quoteId: input.quoteId,
      inputPrecision: "C1",
      outputPrecision: "C2",
      initialCashOutflow,
      recurringBaseOutflow: recurringBaseTotal,
      recurringInsuranceOutflow: recurringInsuranceTotal,
      purchaseOptionOutflow: purchaseOptionTotal,
      nominalTotalOutflow,
      presentValueOutflow,
      fullAcquisition: option.fullAcquisition,
      periods,
      assumptions: {
        uvrAnnualGrowthRate:
          input.denomination === "uvr"
            ? scenario.uvrScenario?.annualGrowthRate ?? null
            : null,
        annualDiscountRate: scenario.annualDiscountRate ?? null,
        insurancePath: insurance.assumption,
        leasingPurchaseOptionExercised:
          input.contractStructure === "housing_leasing" ? option.exercise : null,
      },
    },
    boundaries: {
      isVerified: false,
      isScenarioModel: true,
      isMarketForecast: false,
      isEligibility: false,
      isApproval: false,
      isBankMatch: false,
      isLegalRecommendation: false,
      isGuaranteedSavings: false,
    },
  };
}

function sameMoney(a: number | undefined, b: number | undefined): boolean {
  if (!hasNumber(a) || !hasNumber(b)) return false;
  return Math.abs(a - b) <= MONEY_TOLERANCE;
}

function metricComparison(
  quoteAId: string,
  quoteBId: string,
  quoteAValue: number | null,
  quoteBValue: number | null,
  isComparable: boolean,
): EconomicMetricComparison {
  if (quoteAValue === null || quoteBValue === null) {
    return {
      quoteAValue,
      quoteBValue,
      absoluteDifference: null,
      isComparable: false,
      lowerQuoteId: null,
      tie: false,
    };
  }

  const absoluteDifference = Math.abs(quoteAValue - quoteBValue);
  const tie = isComparable && absoluteDifference <= MONEY_TOLERANCE;
  const lowerQuoteId =
    !isComparable || tie
      ? null
      : quoteAValue < quoteBValue
        ? quoteAId
        : quoteBId;

  return {
    quoteAValue,
    quoteBValue,
    absoluteDifference,
    isComparable,
    lowerQuoteId,
    tie,
  };
}

export function compareEconomicQuotePair(
  quoteAInput: FinancingQuoteInput,
  quoteBInput: FinancingQuoteInput,
  scenario: EconomicComparisonScenario,
): EconomicQuotePairComparison {
  validateScenario(scenario);

  const normalizedPair = normalizeFinancingQuotePair(quoteAInput, quoteBInput);
  const quoteA = modelEconomicQuote(quoteAInput, scenario);
  const quoteB = modelEconomicQuote(quoteBInput, scenario);

  const bothModeled =
    quoteA.status === "modeled" &&
    quoteB.status === "modeled" &&
    quoteA.cashFlow !== null &&
    quoteB.cashFlow !== null;

  const samePropertyValue = sameMoney(quoteAInput.propertyValue, quoteBInput.propertyValue);
  const sameFinancedAmount = sameMoney(quoteAInput.financedAmount, quoteBInput.financedAmount);
  const sameTerm = quoteAInput.termMonths === quoteBInput.termMonths;
  const fullAcquisitionEquivalent =
    bothModeled &&
    quoteA.cashFlow!.fullAcquisition &&
    quoteB.cashFlow!.fullAcquisition;

  const nominalGateIssues: EconomicPairGateCode[] = [];
  const pvGateIssues: EconomicPairGateCode[] = [];

  if (!bothModeled) {
    nominalGateIssues.push("quote_model_blocked");
    pvGateIssues.push("quote_model_blocked");
  }
  if (!samePropertyValue) {
    nominalGateIssues.push("property_value_differs");
    pvGateIssues.push("property_value_differs");
  }
  if (!sameFinancedAmount) nominalGateIssues.push("financed_amount_differs");
  if (!sameTerm) nominalGateIssues.push("term_differs");
  if (scenario.annualDiscountRate === undefined) pvGateIssues.push("discount_rate_missing");
  if (!fullAcquisitionEquivalent) {
    nominalGateIssues.push("full_acquisition_not_equivalent");
    pvGateIssues.push("full_acquisition_not_equivalent");
  }

  const nominalComparable = nominalGateIssues.length === 0;
  const presentValueComparable = pvGateIssues.length === 0;

  const nominal = metricComparison(
    quoteAInput.quoteId,
    quoteBInput.quoteId,
    quoteA.cashFlow?.nominalTotalOutflow ?? null,
    quoteB.cashFlow?.nominalTotalOutflow ?? null,
    nominalComparable,
  );
  const presentValue = metricComparison(
    quoteAInput.quoteId,
    quoteBInput.quoteId,
    quoteA.cashFlow?.presentValueOutflow ?? null,
    quoteB.cashFlow?.presentValueOutflow ?? null,
    presentValueComparable,
  );

  const status: EconomicPairStatus = !bothModeled
    ? "blocked"
    : presentValueComparable
      ? "present_value_comparable"
      : nominalComparable
        ? "nominally_comparable"
        : "modeled_not_rankable";

  return {
    scenarioId: scenario.scenarioId,
    status,
    quoteA,
    quoteB,
    normalizedPairReadiness: normalizedPair.readiness,
    nominalGateIssues,
    presentValueGateIssues: pvGateIssues,
    nominal,
    presentValue,
    boundaries: {
      isVerified: false,
      isScenarioModel: true,
      isMarketForecast: false,
      isEligibility: false,
      isApproval: false,
      isBankMatch: false,
      isLegalRecommendation: false,
      isGuaranteedSavings: false,
      hasBestBank: false,
    },
  };
}
