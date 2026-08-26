export type HousingCategory = "vis" | "non_vis" | "unknown";
export type BuyerFinancingMode = "pesos_fixed_constant";
export type BuyerAffordabilityPrecision = "C1" | "C2";
export type BindingConstraint = "payment" | "down_payment" | "both";

export type BuyerAffordabilityInput = {
  netHouseholdIncomeMonthly: number;
  currentMonthlyDebtPayments: number;
  availableDownPayment: number;
  housingCategory: HousingCategory;
  accreditableFamilyIncomeMonthly?: number;
  financing?: {
    mode: BuyerFinancingMode;
    annualEffectiveRate: number;
    termMonths: number;
    monthlyNonCreditHousingCosts?: number;
  };
};

export type BuyerHousingScenario = {
  housingCategory: Exclude<HousingCategory, "unknown">;
  maxLtv: number;
  minimumEquityRatio: number;
  propertyCeilingFromDownPayment: number;
  modeledPrincipal?: number;
  propertyCeilingFromCreditAndCash?: number;
  modeledPropertyCeiling?: number;
  bindingConstraint?: BindingConstraint;
};

export type BuyerAffordabilityResult = {
  precision: BuyerAffordabilityPrecision;
  planning: {
    currentDebtRatio: number;
    planningTotalDebtRatio: number;
    planningTotalDebtPaymentCap: number;
    planningHousingPaymentRoom: number;
  };
  regulatory: {
    asOfDate: "2026-08-26";
    firstInstallmentRatio: number;
    maxLtvVis: number;
    maxLtvNonVis: number;
    incomeBasis: "not_supplied" | "accreditable_family_declared";
    firstInstallmentCeiling?: number;
  };
  financing?: {
    mode: BuyerFinancingMode;
    annualEffectiveRate: number;
    monthlyRate: number;
    termMonths: number;
    monthlyNonCreditHousingCosts: number;
    nonCreditHousingCostsOmitted: boolean;
    modeledCreditPaymentBudget: number;
  };
  scenarios: BuyerHousingScenario[];
  methodology: {
    planning: "buyer_planning_benchmark_v1_2026_08";
    regulatory: "colombia_housing_regulatory_reference_2026_08";
    financing?: "pesos_fixed_constant_affordability_v1";
  };
  notices: string[];
};

export type BuyerAffordabilityErrorCode =
  | "invalid_net_income"
  | "invalid_debt_payments"
  | "invalid_down_payment"
  | "invalid_accreditable_income"
  | "invalid_rate"
  | "unsupported_term"
  | "invalid_non_credit_costs";

export class BuyerAffordabilityError extends Error {
  readonly code: BuyerAffordabilityErrorCode;

  constructor(code: BuyerAffordabilityErrorCode, message: string) {
    super(message);
    this.name = "BuyerAffordabilityError";
    this.code = code;
  }
}

export const BUYER_AFFORDABILITY_CONSTANTS = {
  planningTotalDebtRatio: 0.30,
  regulatoryFirstInstallmentRatio: 0.40,
  maxLtvNonVis: 0.70,
  maxLtvVis: 0.80,
  minimumModeledTermMonths: 60,
  maximumModeledTermMonths: 360,
} as const;

function assertFinite(value: number, code: BuyerAffordabilityErrorCode, message: string) {
  if (!Number.isFinite(value)) throw new BuyerAffordabilityError(code, message);
}

function validateInput(input: BuyerAffordabilityInput) {
  assertFinite(input.netHouseholdIncomeMonthly, "invalid_net_income", "El ingreso neto mensual debe ser finito.");
  if (input.netHouseholdIncomeMonthly <= 0) {
    throw new BuyerAffordabilityError("invalid_net_income", "El ingreso neto mensual debe ser mayor que cero.");
  }

  assertFinite(input.currentMonthlyDebtPayments, "invalid_debt_payments", "Las cuotas actuales deben ser finitas.");
  if (input.currentMonthlyDebtPayments < 0) {
    throw new BuyerAffordabilityError("invalid_debt_payments", "Las cuotas actuales no pueden ser negativas.");
  }

  assertFinite(input.availableDownPayment, "invalid_down_payment", "La cuota inicial disponible debe ser finita.");
  if (input.availableDownPayment < 0) {
    throw new BuyerAffordabilityError("invalid_down_payment", "La cuota inicial disponible no puede ser negativa.");
  }

  if (input.accreditableFamilyIncomeMonthly !== undefined) {
    assertFinite(input.accreditableFamilyIncomeMonthly, "invalid_accreditable_income", "El ingreso familiar acreditable debe ser finito.");
    if (input.accreditableFamilyIncomeMonthly <= 0) {
      throw new BuyerAffordabilityError("invalid_accreditable_income", "El ingreso familiar acreditable debe ser mayor que cero.");
    }
  }

  if (!input.financing) return;

  assertFinite(input.financing.annualEffectiveRate, "invalid_rate", "La tasa EA debe ser finita.");
  if (input.financing.annualEffectiveRate < 0) {
    throw new BuyerAffordabilityError("invalid_rate", "La tasa EA no puede ser negativa.");
  }

  if (
    !Number.isInteger(input.financing.termMonths)
    || input.financing.termMonths < BUYER_AFFORDABILITY_CONSTANTS.minimumModeledTermMonths
    || input.financing.termMonths > BUYER_AFFORDABILITY_CONSTANTS.maximumModeledTermMonths
  ) {
    throw new BuyerAffordabilityError(
      "unsupported_term",
      `v0.13 modela únicamente plazos enteros entre ${BUYER_AFFORDABILITY_CONSTANTS.minimumModeledTermMonths} y ${BUYER_AFFORDABILITY_CONSTANTS.maximumModeledTermMonths} meses.`,
    );
  }

  if (input.financing.monthlyNonCreditHousingCosts !== undefined) {
    assertFinite(input.financing.monthlyNonCreditHousingCosts, "invalid_non_credit_costs", "Los costos mensuales no crediticios deben ser finitos.");
    if (input.financing.monthlyNonCreditHousingCosts < 0) {
      throw new BuyerAffordabilityError("invalid_non_credit_costs", "Los costos mensuales no crediticios no pueden ser negativos.");
    }
  }
}

function maxLtvFor(category: Exclude<HousingCategory, "unknown">): number {
  return category === "vis"
    ? BUYER_AFFORDABILITY_CONSTANTS.maxLtvVis
    : BUYER_AFFORDABILITY_CONSTANTS.maxLtvNonVis;
}

function categoriesFor(category: HousingCategory): Array<Exclude<HousingCategory, "unknown">> {
  return category === "unknown" ? ["non_vis", "vis"] : [category];
}

function monthlyRateFromEA(annualEffectiveRate: number): number {
  if (annualEffectiveRate === 0) return 0;
  return (1 + annualEffectiveRate) ** (1 / 12) - 1;
}

function principalFromPayment(payment: number, monthlyRate: number, termMonths: number): number {
  if (payment <= 0) return 0;
  if (monthlyRate === 0) return payment * termMonths;
  return payment * (1 - (1 + monthlyRate) ** (-termMonths)) / monthlyRate;
}

function bindingConstraint(creditAndCashCeiling: number, downPaymentCeiling: number): BindingConstraint {
  const scale = Math.max(1, Math.abs(creditAndCashCeiling), Math.abs(downPaymentCeiling));
  if (Math.abs(creditAndCashCeiling - downPaymentCeiling) <= scale * 1e-12) return "both";
  return creditAndCashCeiling < downPaymentCeiling ? "payment" : "down_payment";
}

export function calculateBuyerAffordability(input: BuyerAffordabilityInput): BuyerAffordabilityResult {
  validateInput(input);

  const constants = BUYER_AFFORDABILITY_CONSTANTS;
  const currentDebtRatio = input.currentMonthlyDebtPayments / input.netHouseholdIncomeMonthly;
  const planningTotalDebtPaymentCap = input.netHouseholdIncomeMonthly * constants.planningTotalDebtRatio;
  const planningHousingPaymentRoom = Math.max(0, planningTotalDebtPaymentCap - input.currentMonthlyDebtPayments);

  const firstInstallmentCeiling = input.accreditableFamilyIncomeMonthly === undefined
    ? undefined
    : input.accreditableFamilyIncomeMonthly * constants.regulatoryFirstInstallmentRatio;

  const baseScenarios = categoriesFor(input.housingCategory).map((housingCategory): BuyerHousingScenario => {
    const maxLtv = maxLtvFor(housingCategory);
    const minimumEquityRatio = 1 - maxLtv;
    return {
      housingCategory,
      maxLtv,
      minimumEquityRatio,
      propertyCeilingFromDownPayment: input.availableDownPayment / minimumEquityRatio,
    };
  });

  const regulatory = {
    asOfDate: "2026-08-26" as const,
    firstInstallmentRatio: constants.regulatoryFirstInstallmentRatio,
    maxLtvVis: constants.maxLtvVis,
    maxLtvNonVis: constants.maxLtvNonVis,
    incomeBasis: input.accreditableFamilyIncomeMonthly === undefined
      ? "not_supplied" as const
      : "accreditable_family_declared" as const,
    ...(firstInstallmentCeiling === undefined ? {} : { firstInstallmentCeiling }),
  };

  const planning = {
    currentDebtRatio,
    planningTotalDebtRatio: constants.planningTotalDebtRatio,
    planningTotalDebtPaymentCap,
    planningHousingPaymentRoom,
  };

  if (!input.financing) {
    return {
      precision: "C1",
      planning,
      regulatory,
      scenarios: baseScenarios,
      methodology: {
        planning: "buyer_planning_benchmark_v1_2026_08",
        regulatory: "colombia_housing_regulatory_reference_2026_08",
      },
      notices: [
        "El 30% es un benchmark de planificación de endeudamiento total, no una regla de aprobación bancaria.",
        "El 40% es un límite regulatorio de primera cuota cuando se usa ingreso familiar acreditable; no es una recomendación de sostenibilidad.",
        "Sin tasa y plazo confirmados no calculamos un principal derivado de la cuota.",
      ],
    };
  }

  const nonCreditHousingCostsOmitted = input.financing.monthlyNonCreditHousingCosts === undefined;
  const monthlyNonCreditHousingCosts = input.financing.monthlyNonCreditHousingCosts ?? 0;
  const planningCreditPaymentBudget = Math.max(0, planningHousingPaymentRoom - monthlyNonCreditHousingCosts);
  const modeledCreditPaymentBudget = firstInstallmentCeiling === undefined
    ? planningCreditPaymentBudget
    : Math.min(planningCreditPaymentBudget, firstInstallmentCeiling);
  const monthlyRate = monthlyRateFromEA(input.financing.annualEffectiveRate);
  const modeledPrincipal = principalFromPayment(
    modeledCreditPaymentBudget,
    monthlyRate,
    input.financing.termMonths,
  );

  const scenarios = baseScenarios.map((scenario): BuyerHousingScenario => {
    // Payment capacity constrains the modeled principal. The buyer may use more equity than
    // the regulatory minimum, so we must not divide the principal by max LTV as if every
    // purchase were financed exactly at that maximum. The cash available can be added to
    // the modeled principal, and the LTV rule remains an independent structural ceiling.
    const propertyCeilingFromCreditAndCash = modeledPrincipal + input.availableDownPayment;
    const modeledPropertyCeiling = Math.min(
      propertyCeilingFromCreditAndCash,
      scenario.propertyCeilingFromDownPayment,
    );
    return {
      ...scenario,
      modeledPrincipal,
      propertyCeilingFromCreditAndCash,
      modeledPropertyCeiling,
      bindingConstraint: bindingConstraint(
        propertyCeilingFromCreditAndCash,
        scenario.propertyCeilingFromDownPayment,
      ),
    };
  });

  return {
    precision: "C2",
    planning,
    regulatory,
    financing: {
      mode: input.financing.mode,
      annualEffectiveRate: input.financing.annualEffectiveRate,
      monthlyRate,
      termMonths: input.financing.termMonths,
      monthlyNonCreditHousingCosts,
      nonCreditHousingCostsOmitted,
      modeledCreditPaymentBudget,
    },
    scenarios,
    methodology: {
      planning: "buyer_planning_benchmark_v1_2026_08",
      regulatory: "colombia_housing_regulatory_reference_2026_08",
      financing: "pesos_fixed_constant_affordability_v1",
    },
    notices: [
      "El escenario C2 usa una tasa y plazo suministrados/confirmados; no es una oferta ni aprobación bancaria.",
      "Los máximos LTV son referencias regulatorias y una entidad puede financiar un porcentaje menor.",
      "El techo por crédito y efectivo suma el principal modelado y la cuota inicial disponible; no incluye costos de cierre ni otros usos del efectivo.",
      nonCreditHousingCostsOmitted
        ? "No se informaron costos mensuales no crediticios; el escenario no representa el costo total de tener vivienda."
        : "Los costos mensuales no crediticios declarados reducen el presupuesto destinado al crédito.",
    ],
  };
}