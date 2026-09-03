import {
  calculateBuyerAffordability,
  type BuyerAffordabilityPrecision,
  type HousingCategory,
} from "@/domain/buyer-affordability/calculator";

export type IncomeContinuity =
  | "established_12_plus"
  | "established_6_to_12"
  | "variable_with_12_plus_history"
  | "recent_under_6"
  | "irregular_or_recently_changed"
  | "unknown";

export type DocumentationReadiness =
  | "ready"
  | "mostly_ready"
  | "partial"
  | "not_ready"
  | "unknown";

export type HomeReadinessDimensionCode =
  | "obligation_burden"
  | "down_payment_readiness"
  | "income_continuity"
  | "documentation_readiness"
  | "target_fit";

export type HomeReadinessDimensionStatus = "scored" | "needs_information";
export type HomeReadinessIndexStatus = "complete" | "incomplete";
export type HomeReadinessBand = "foundation_needed" | "developing" | "progressing" | "well_prepared";

export type HomeReadinessInput = {
  netHouseholdIncomeMonthly: number;
  currentMonthlyDebtPayments: number;
  availableDownPayment: number;
  targetPropertyPrice: number;
  housingCategory: HousingCategory;
  incomeContinuity: IncomeContinuity;
  documentationReadiness: DocumentationReadiness;
  planningFinancing?: {
    annualEffectiveRate: number;
    termMonths: number;
    monthlyNonCreditHousingCosts?: number;
  };
};

export type HomeReadinessDimension = {
  code: HomeReadinessDimensionCode;
  label: string;
  status: HomeReadinessDimensionStatus;
  score: number | null;
  maxScore: 20;
  reasonCodes: string[];
  facts: Array<{ label: string; value: string }>;
  explanation: string;
  nextAction: string | null;
  caveat: string;
};

export type HomeReadinessNextAction = {
  dimensionCode: HomeReadinessDimensionCode;
  title: string;
  explanation: string;
  quantifiedGap?: number;
};

export type HomeReadinessResult = {
  precision: "C1";
  underlyingAffordabilityPrecision: BuyerAffordabilityPrecision;
  indexStatus: HomeReadinessIndexStatus;
  totalScore: number | null;
  band: HomeReadinessBand | null;
  dimensions: HomeReadinessDimension[];
  missingInputs: string[];
  nextActions: HomeReadinessNextAction[];
  affordabilityFacts: {
    currentDebtRatio: number;
    planningHousingPaymentRoom: number;
    minimumEquityReference: number | null;
    downPaymentCoverage: number | null;
    modeledPropertyCeiling: number | null;
    targetFitRatio: number | null;
    bindingConstraint: "payment" | "down_payment" | "both" | null;
  };
  methodology: "home_readiness_v1_2026_08";
  boundaries: {
    isBureauScore: false;
    isBankScore: false;
    isApproval: false;
    isApprovalProbability: false;
    isMarketOffer: false;
  };
};

export type HomeReadinessErrorCode = "invalid_target_price";

export class HomeReadinessError extends Error {
  readonly code: HomeReadinessErrorCode;

  constructor(code: HomeReadinessErrorCode, message: string) {
    super(message);
    this.name = "HomeReadinessError";
    this.code = code;
  }
}

const MAX_DIMENSION_SCORE = 20 as const;

const DIMENSION_LABELS: Record<HomeReadinessDimensionCode, string> = {
  obligation_burden: "Carga actual de obligaciones",
  down_payment_readiness: "Preparación de cuota inicial",
  income_continuity: "Continuidad de ingresos",
  documentation_readiness: "Preparación documental",
  target_fit: "Encaje del objetivo",
};

const CONTINUITY_SCORES: Record<Exclude<IncomeContinuity, "unknown">, number> = {
  established_12_plus: 20,
  established_6_to_12: 15,
  variable_with_12_plus_history: 15,
  recent_under_6: 10,
  irregular_or_recently_changed: 5,
};

const CONTINUITY_LABELS: Record<IncomeContinuity, string> = {
  established_12_plus: "Historia continua de 12 meses o más",
  established_6_to_12: "Historia continua entre 6 y 12 meses",
  variable_with_12_plus_history: "Ingreso variable con historia de 12 meses o más",
  recent_under_6: "Ingreso o actividad reciente, menor a 6 meses",
  irregular_or_recently_changed: "Ingreso irregular o con cambio reciente importante",
  unknown: "Continuidad todavía no informada",
};

const DOCUMENTATION_SCORES: Record<Exclude<DocumentationReadiness, "unknown">, number> = {
  ready: 20,
  mostly_ready: 15,
  partial: 10,
  not_ready: 5,
};

const DOCUMENTATION_LABELS: Record<DocumentationReadiness, string> = {
  ready: "Soportes principales organizados",
  mostly_ready: "La mayoría de soportes están disponibles",
  partial: "Hay soportes, pero faltan varios",
  not_ready: "Los soportes todavía no están organizados",
  unknown: "Preparación documental todavía no informada",
};

const ACTION_TIE_BREAK: Record<HomeReadinessDimensionCode, number> = {
  down_payment_readiness: 0,
  obligation_burden: 1,
  documentation_readiness: 2,
  target_fit: 3,
  income_continuity: 4,
};

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function money(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function scoreObligationBurden(ratio: number): number {
  if (ratio <= 0.10) return 20;
  if (ratio <= 0.20) return 15;
  if (ratio <= 0.30) return 10;
  if (ratio <= 0.40) return 5;
  return 0;
}

function scoreCoverage(coverage: number): number {
  if (coverage >= 1.25) return 20;
  if (coverage >= 1.00) return 15;
  if (coverage >= 0.75) return 10;
  if (coverage >= 0.50) return 5;
  return 0;
}

function scoreTargetFit(ratio: number): number {
  if (ratio <= 0.80) return 20;
  if (ratio <= 0.90) return 15;
  if (ratio <= 1.00) return 10;
  if (ratio <= 1.10) return 5;
  return 0;
}

function bandFor(score: number): HomeReadinessBand {
  if (score <= 39) return "foundation_needed";
  if (score <= 59) return "developing";
  if (score <= 79) return "progressing";
  return "well_prepared";
}

function scoredDimension(args: {
  code: HomeReadinessDimensionCode;
  score: number;
  reasonCodes: string[];
  facts: Array<{ label: string; value: string }>;
  explanation: string;
  nextAction: string | null;
  caveat: string;
}): HomeReadinessDimension {
  return {
    code: args.code,
    label: DIMENSION_LABELS[args.code],
    status: "scored",
    score: args.score,
    maxScore: MAX_DIMENSION_SCORE,
    reasonCodes: args.reasonCodes,
    facts: args.facts,
    explanation: args.explanation,
    nextAction: args.nextAction,
    caveat: args.caveat,
  };
}

function incompleteDimension(args: {
  code: HomeReadinessDimensionCode;
  reasonCodes: string[];
  facts: Array<{ label: string; value: string }>;
  explanation: string;
  nextAction: string;
  caveat: string;
}): HomeReadinessDimension {
  return {
    code: args.code,
    label: DIMENSION_LABELS[args.code],
    status: "needs_information",
    score: null,
    maxScore: MAX_DIMENSION_SCORE,
    reasonCodes: args.reasonCodes,
    facts: args.facts,
    explanation: args.explanation,
    nextAction: args.nextAction,
    caveat: args.caveat,
  };
}

function buildNextAction(
  dimension: HomeReadinessDimension,
  minimumEquityReference: number | null,
  availableDownPayment: number,
): HomeReadinessNextAction | null {
  if (dimension.status === "scored" && dimension.score === 20) return null;

  switch (dimension.code) {
    case "down_payment_readiness": {
      if (dimension.status === "needs_information") {
        return {
          dimensionCode: dimension.code,
          title: "Confirmar la categoría de vivienda objetivo",
          explanation: "Necesitamos saber si el objetivo es VIS o no VIS para usar la referencia de equity correcta sin adivinarla.",
        };
      }
      const gap = minimumEquityReference === null
        ? undefined
        : Math.max(0, minimumEquityReference - availableDownPayment);
      return {
        dimensionCode: dimension.code,
        title: gap && gap > 0 ? "Cerrar la brecha de cuota inicial" : "Crear más holgura de cuota inicial",
        explanation: gap && gap > 0
          ? `La referencia mínima del escenario está ${money(gap)} por encima de la cuota inicial que declaraste. Puedes aumentar ahorro o revisar un objetivo de menor precio.`
          : "Ya cubres la referencia mínima declarada. Una mayor holgura puede evitar que todo el efectivo disponible quede comprometido en la compra.",
        ...(gap && gap > 0 ? { quantifiedGap: gap } : {}),
      };
    }
    case "obligation_burden":
      return {
        dimensionCode: dimension.code,
        title: "Reducir o programar obligaciones recurrentes",
        explanation: "Revisa qué cuotas actuales pueden terminar o reducirse antes de comprar y vuelve a calcular el plan con ese cambio concreto. Reducir deuda no equivale a aprobación bancaria.",
      };
    case "documentation_readiness":
      return {
        dimensionCode: dimension.code,
        title: dimension.status === "needs_information" ? "Revisar qué soportes tienes" : "Organizar soportes antes de comparar entidades",
        explanation: "Organiza evidencia apropiada para tus ingresos y obligaciones. La suficiencia final dependerá del producto y de la entidad que realmente evalúe una solicitud.",
      };
    case "target_fit":
      return {
        dimensionCode: dimension.code,
        title: dimension.status === "needs_information" ? "Completar el escenario del objetivo" : "Ajustar el objetivo o sus supuestos",
        explanation: dimension.status === "needs_information"
          ? "Para puntuar el encaje necesitamos categoría conocida, tasa EA y plazo aportados por ti; VIVIENDA no inserta una tasa de mercado silenciosamente."
          : "Compara un precio objetivo menor, una cuota inicial mayor o un escenario de tasa/plazo que tú suministres. El modelo no sustituye esos datos por una supuesta oferta de mercado.",
      };
    case "income_continuity":
      return {
        dimensionCode: dimension.code,
        title: dimension.status === "needs_information" ? "Describir la continuidad real de tus ingresos" : "Documentar la historia real de ingresos",
        explanation: "Usa una historia realista y verificable. VIVIENDA no penaliza por ser independiente o tener ingresos variables; importa la continuidad que puedas describir y soportar.",
      };
  }
}

export function evaluateHomeReadiness(input: HomeReadinessInput): HomeReadinessResult {
  if (!Number.isFinite(input.targetPropertyPrice) || input.targetPropertyPrice <= 0) {
    throw new HomeReadinessError("invalid_target_price", "El precio objetivo debe ser un número finito mayor que cero.");
  }

  const affordability = calculateBuyerAffordability({
    netHouseholdIncomeMonthly: input.netHouseholdIncomeMonthly,
    currentMonthlyDebtPayments: input.currentMonthlyDebtPayments,
    availableDownPayment: input.availableDownPayment,
    housingCategory: input.housingCategory,
    ...(input.planningFinancing
      ? {
          financing: {
            mode: "pesos_fixed_constant" as const,
            annualEffectiveRate: input.planningFinancing.annualEffectiveRate,
            termMonths: input.planningFinancing.termMonths,
            ...(input.planningFinancing.monthlyNonCreditHousingCosts === undefined
              ? {}
              : { monthlyNonCreditHousingCosts: input.planningFinancing.monthlyNonCreditHousingCosts }),
          },
        }
      : {}),
  });

  const dimensions: HomeReadinessDimension[] = [];
  const missingInputs: string[] = [];

  const obligationScore = scoreObligationBurden(affordability.planning.currentDebtRatio);
  dimensions.push(scoredDimension({
    code: "obligation_burden",
    score: obligationScore,
    reasonCodes: [`current_debt_ratio_${obligationScore}`],
    facts: [
      { label: "Carga de deuda declarada", value: pct(affordability.planning.currentDebtRatio) },
      { label: "Cuotas actuales", value: money(input.currentMonthlyDebtPayments) },
    ],
    explanation: "Esta dimensión mira solo las obligaciones recurrentes que ya existen antes de la compra.",
    nextAction: obligationScore < 20 ? "Revisar obligaciones que puedan reducirse o terminar antes de comprar." : null,
    caveat: "Las bandas son una heurística de planificación de VIVIENDA, no reglas de aprobación bancaria.",
  }));

  const selectedScenario = input.housingCategory === "unknown"
    ? null
    : affordability.scenarios.find((scenario) => scenario.housingCategory === input.housingCategory) ?? null;

  let minimumEquityReference: number | null = null;
  let downPaymentCoverage: number | null = null;

  if (!selectedScenario) {
    missingInputs.push("housing_category_for_down_payment");
    dimensions.push(incompleteDimension({
      code: "down_payment_readiness",
      reasonCodes: ["housing_category_unknown"],
      facts: [{ label: "Cuota inicial disponible", value: money(input.availableDownPayment) }],
      explanation: "Sin categoría de vivienda no elegimos entre referencias VIS y no VIS para puntuar esta dimensión.",
      nextAction: "Confirmar si el objetivo se analizará como VIS o no VIS.",
      caveat: "VIVIENDA no usa la alternativa más favorable ni la más conservadora de forma silenciosa.",
    }));
  } else {
    minimumEquityReference = input.targetPropertyPrice * selectedScenario.minimumEquityRatio;
    downPaymentCoverage = minimumEquityReference === 0 ? 1 : input.availableDownPayment / minimumEquityReference;
    const score = scoreCoverage(downPaymentCoverage);
    dimensions.push(scoredDimension({
      code: "down_payment_readiness",
      score,
      reasonCodes: [`down_payment_coverage_${score}`, `housing_category_${input.housingCategory}`],
      facts: [
        { label: "Cuota inicial disponible", value: money(input.availableDownPayment) },
        { label: "Referencia mínima de equity", value: money(minimumEquityReference) },
        { label: "Cobertura de la referencia", value: pct(downPaymentCoverage) },
      ],
      explanation: "Compara tu cuota inicial con la referencia mínima de equity del escenario, sin asumir que una entidad financiará automáticamente el máximo LTV.",
      nextAction: score < 20 ? "Aumentar cuota inicial o revisar el precio objetivo para crear más holgura." : null,
      caveat: "La referencia de equity no incluye costos de cierre y no es garantía de porcentaje financiado.",
    }));
  }

  if (input.incomeContinuity === "unknown") {
    missingInputs.push("income_continuity");
    dimensions.push(incompleteDimension({
      code: "income_continuity",
      reasonCodes: ["income_continuity_unknown"],
      facts: [{ label: "Continuidad", value: CONTINUITY_LABELS.unknown }],
      explanation: "No asignamos cero a un dato desconocido. Falta describir la historia real de ingresos.",
      nextAction: "Indicar cuánto tiempo de historia comparable puedes describir para tus ingresos actuales.",
      caveat: "La categoría laboral no se puntúa; una persona independiente o con ingreso variable puede obtener la misma valoración de continuidad.",
    }));
  } else {
    const score = CONTINUITY_SCORES[input.incomeContinuity];
    dimensions.push(scoredDimension({
      code: "income_continuity",
      score,
      reasonCodes: [`income_continuity_${input.incomeContinuity}`],
      facts: [{ label: "Historia declarada", value: CONTINUITY_LABELS[input.incomeContinuity] }],
      explanation: "Describe la continuidad de la historia de ingresos, no el prestigio ni el tipo de ocupación.",
      nextAction: score < 20 ? "Mantener y organizar una historia de ingresos comparable y verificable." : null,
      caveat: "No representa un requisito mínimo de antigüedad de una entidad específica.",
    }));
  }

  if (input.documentationReadiness === "unknown") {
    missingInputs.push("documentation_readiness");
    dimensions.push(incompleteDimension({
      code: "documentation_readiness",
      reasonCodes: ["documentation_readiness_unknown"],
      facts: [{ label: "Soportes", value: DOCUMENTATION_LABELS.unknown }],
      explanation: "No suponemos que los documentos estén completos ni incompletos sin tu declaración.",
      nextAction: "Revisar qué soportes de ingresos y obligaciones ya tienes organizados.",
      caveat: "v0.16 no certifica suficiencia documental para una entidad específica.",
    }));
  } else {
    const score = DOCUMENTATION_SCORES[input.documentationReadiness];
    dimensions.push(scoredDimension({
      code: "documentation_readiness",
      score,
      reasonCodes: [`documentation_readiness_${input.documentationReadiness}`],
      facts: [{ label: "Estado declarado", value: DOCUMENTATION_LABELS[input.documentationReadiness] }],
      explanation: "Mide qué tan organizada está la evidencia que soporta los datos usados en tu planificación.",
      nextAction: score < 20 ? "Completar y ordenar soportes apropiados para tus ingresos y obligaciones." : null,
      caveat: "Los documentos concretos dependen del producto y de la entidad; este índice no reemplaza su checklist.",
    }));
  }

  let modeledPropertyCeiling: number | null = null;
  let targetFitRatio: number | null = null;
  let bindingConstraint: "payment" | "down_payment" | "both" | null = null;

  if (!selectedScenario) {
    missingInputs.push("housing_category_for_target_fit");
    dimensions.push(incompleteDimension({
      code: "target_fit",
      reasonCodes: ["housing_category_unknown"],
      facts: [{ label: "Precio objetivo", value: money(input.targetPropertyPrice) }],
      explanation: "El encaje necesita una categoría concreta para escoger el escenario comparable.",
      nextAction: "Confirmar la categoría de vivienda y completar el escenario de financiación.",
      caveat: "No mezclamos VIS y no VIS en un único score.",
    }));
  } else if (!input.planningFinancing || affordability.precision !== "C2" || selectedScenario.modeledPropertyCeiling === undefined) {
    missingInputs.push("planning_rate_and_term");
    dimensions.push(incompleteDimension({
      code: "target_fit",
      reasonCodes: ["planning_financing_missing"],
      facts: [{ label: "Precio objetivo", value: money(input.targetPropertyPrice) }],
      explanation: "Sin tasa EA y plazo suministrados por ti no calculamos un techo modelado para puntuar el encaje del objetivo.",
      nextAction: "Añadir una tasa EA y plazo de planificación que quieras probar.",
      caveat: "VIVIENDA no inserta una tasa de mercado ni una supuesta oferta bancaria de forma silenciosa.",
    }));
  } else {
    modeledPropertyCeiling = selectedScenario.modeledPropertyCeiling;
    bindingConstraint = selectedScenario.bindingConstraint ?? null;
    targetFitRatio = modeledPropertyCeiling <= 0 ? Number.POSITIVE_INFINITY : input.targetPropertyPrice / modeledPropertyCeiling;
    const score = scoreTargetFit(targetFitRatio);
    dimensions.push(scoredDimension({
      code: "target_fit",
      score,
      reasonCodes: [`target_fit_${score}`, ...(bindingConstraint ? [`binding_${bindingConstraint}`] : [])],
      facts: [
        { label: "Precio objetivo", value: money(input.targetPropertyPrice) },
        { label: "Techo modelado del escenario", value: money(modeledPropertyCeiling) },
        { label: "Relación objetivo / techo", value: Number.isFinite(targetFitRatio) ? pct(targetFitRatio) : "Sin capacidad modelada" },
      ],
      explanation: "Compara tu objetivo con el techo modelado por Buyer Affordability usando los supuestos de tasa/plazo que tú aportaste.",
      nextAction: score < 20 ? "Revisar precio objetivo, cuota inicial o un escenario de financiación que tú suministres." : null,
      caveat: "El techo modelado no es una oferta, preaprobación ni promesa de financiación.",
    }));
  }

  const complete = dimensions.every((dimension) => dimension.status === "scored");
  const totalScore = complete
    ? dimensions.reduce((sum, dimension) => sum + (dimension.score ?? 0), 0)
    : null;

  const nextActions = dimensions
    .filter((dimension) => dimension.status === "needs_information" || (dimension.score ?? 20) < 20)
    .sort((a, b) => {
      const aScore = a.status === "needs_information" ? -1 : (a.score ?? 0);
      const bScore = b.status === "needs_information" ? -1 : (b.score ?? 0);
      return aScore - bScore || ACTION_TIE_BREAK[a.code] - ACTION_TIE_BREAK[b.code];
    })
    .map((dimension) => buildNextAction(dimension, minimumEquityReference, input.availableDownPayment))
    .filter((action): action is HomeReadinessNextAction => action !== null)
    .slice(0, 3);

  return {
    precision: "C1",
    underlyingAffordabilityPrecision: affordability.precision,
    indexStatus: complete ? "complete" : "incomplete",
    totalScore,
    band: totalScore === null ? null : bandFor(totalScore),
    dimensions,
    missingInputs: [...new Set(missingInputs)],
    nextActions,
    affordabilityFacts: {
      currentDebtRatio: affordability.planning.currentDebtRatio,
      planningHousingPaymentRoom: affordability.planning.planningHousingPaymentRoom,
      minimumEquityReference,
      downPaymentCoverage,
      modeledPropertyCeiling,
      targetFitRatio,
      bindingConstraint,
    },
    methodology: "home_readiness_v1_2026_08",
    boundaries: {
      isBureauScore: false,
      isBankScore: false,
      isApproval: false,
      isApprovalProbability: false,
      isMarketOffer: false,
    },
  };
}