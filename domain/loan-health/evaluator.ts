import type {
  OpportunityPrecision,
  OpportunityRoute,
  OpportunityRouteCode,
  OpportunityRouterResult,
  PaymentState,
  ProductType,
} from "@/domain/opportunity/router";

export type LoanHealthDimensionCode =
  | "structure_understanding"
  | "prepayment"
  | "transfer"
  | "restructuring"
  | "consistency"
  | "procedural_state";

export type LoanHealthDimensionStatus =
  | "ready"
  | "explore"
  | "needs_data"
  | "seasonal"
  | "attention"
  | "professional_review"
  | "no_flag_reported"
  | "not_applicable";

export type LoanHealthDecisionState =
  | "professional_review_priority"
  | "attention_required"
  | "actionable_opportunity"
  | "improve_precision"
  | "no_priority_action_detected";

export type LoanHealthDimension = {
  code: LoanHealthDimensionCode;
  label: string;
  status: LoanHealthDimensionStatus;
  explanation: string;
  nextAction: string;
  sourceRouteCodes: OpportunityRouteCode[];
};

export type LoanHealthInput = {
  precision: OpportunityPrecision;
  productType: ProductType;
  paymentState: PaymentState;
  routerResult: OpportunityRouterResult;
};

export type LoanHealthResult = {
  precision: OpportunityPrecision;
  decisionState: LoanHealthDecisionState;
  headline: string;
  dimensions: LoanHealthDimension[];
  notices: string[];
};

const precisionRank: Record<OpportunityPrecision, number> = {
  C0: 0,
  C1: 1,
  C2: 2,
  C3: 3,
};

function findRoute(result: OpportunityRouterResult, code: OpportunityRouteCode): OpportunityRoute | undefined {
  return result.routes.find((route) => route.routeCode === code);
}

function higherPrecisionRoutes(
  precision: OpportunityPrecision,
  result: OpportunityRouterResult,
): OpportunityRoute[] {
  return result.routes.filter((route) => precisionRank[route.precision] > precisionRank[precision]);
}

function structureDimension(
  precision: OpportunityPrecision,
  routeSpecificPrecision: OpportunityRoute[],
): LoanHealthDimension {
  if (precision === "C0") {
    return {
      code: "structure_understanding",
      label: "Estructura del crédito",
      status: "needs_data",
      explanation: "Todavía estamos en orientación: faltan datos materiales para construir una lectura del crédito.",
      nextAction: "Completar un Quick Check con los datos mínimos del crédito.",
      sourceRouteCodes: [],
    };
  }

  if (precision === "C1" && routeSpecificPrecision.length > 0) {
    return {
      code: "structure_understanding",
      label: "Estructura del crédito",
      status: "explore",
      explanation: "La fotografía de origen sigue siendo C1 porque los datos fueron declarados. Una o más rutas tienen precisión superior por soporte específico de esa decisión, sin elevar las demás rutas ni verificar el documento.",
      nextAction: "Usar la precisión superior solo en la ruta que la obtuvo y conservar C1 para las demás decisiones hasta que tengan soporte propio.",
      sourceRouteCodes: routeSpecificPrecision.map((route) => route.routeCode),
    };
  }

  if (precision === "C1") {
    return {
      code: "structure_understanding",
      label: "Estructura del crédito",
      status: "needs_data",
      explanation: "Existe una primera fotografía declarada, pero todavía faltan datos confirmados para modelar decisiones con precisión C2.",
      nextAction: "Confirmar tasa, plazo/cuotas y sistema cuando el escenario lo requiera.",
      sourceRouteCodes: [],
    };
  }

  if (precision === "C2") {
    return {
      code: "structure_understanding",
      label: "Estructura del crédito",
      status: "ready",
      explanation: "Hay datos suficientes para una simulación modelada compatible. Esto todavía no equivale a verificación documental.",
      nextAction: "Usar el modelo para comparar acciones o verificar documentalmente los campos materiales.",
      sourceRouteCodes: [],
    };
  }

  return {
    code: "structure_understanding",
    label: "Estructura del crédito",
    status: "ready",
    explanation: "Los campos materiales del snapshot alcanzaron C3 mediante evidencia documental real y reconciliación completa.",
    nextAction: "Mantener la fecha de corte y provenance visibles al comparar nuevas decisiones.",
    sourceRouteCodes: [],
  };
}

function prepaymentDimension(input: LoanHealthInput): LoanHealthDimension {
  const routes = [
    findRoute(input.routerResult, "R1_PREPAGO_PLAZO"),
    findRoute(input.routerResult, "R2_PREPAGO_CUOTA"),
  ].filter((route): route is OpportunityRoute => Boolean(route));

  if (input.productType === "unknown") {
    return {
      code: "prepayment",
      label: "Prepago",
      status: "needs_data",
      explanation: "Primero necesitamos confirmar la naturaleza del producto antes de aplicar la ruta especial de prepago de vivienda.",
      nextAction: "Clasificar el producto con contrato o extracto.",
      sourceRouteCodes: [],
    };
  }

  if (input.productType !== "mortgage_housing") {
    return {
      code: "prepayment",
      label: "Prepago",
      status: "not_applicable",
      explanation: "El rulebook actual no activó la ruta de prepago hipotecario de vivienda para este tipo de producto.",
      nextAction: "Usar la regla contractual aplicable al producto antes de recomendar una acción.",
      sourceRouteCodes: [],
    };
  }

  if (routes.length === 0) {
    return {
      code: "prepayment",
      label: "Prepago",
      status: "explore",
      explanation: "No hay una ruta de prepago activada con los datos actuales. Puede explorarse si contemplas un abono adicional.",
      nextAction: "Indicar si existe capacidad o intención de realizar un abono adicional.",
      sourceRouteCodes: [],
    };
  }

  const ready = routes.some((route) => route.status === "eligible_now" && route.blockers.length === 0);

  return {
    code: "prepayment",
    label: "Prepago",
    status: ready ? "ready" : "explore",
    explanation: ready
      ? "Existe al menos una ruta de prepago accionable con los datos actuales; reducción de plazo y reducción de cuota siguen siendo decisiones distintas y pueden tener precisiones diferentes."
      : "Existe una ruta de prepago, pero todavía hay bloqueos de precisión o información antes de cuantificar correctamente el efecto.",
    nextAction: ready
      ? "Comparar los dos objetivos y cuantificar por separado cualquier alternativa que todavía no tenga un modelo compatible."
      : "Resolver los bloqueos del modelo antes de mostrar un beneficio monetario exacto.",
    sourceRouteCodes: routes.map((route) => route.routeCode),
  };
}

function transferDimension(input: LoanHealthInput): LoanHealthDimension {
  const route = findRoute(input.routerResult, "R5_CESION_546_24");

  if (!route) {
    return {
      code: "transfer",
      label: "Traslado / compra de cartera",
      status: input.productType === "unknown" ? "needs_data" : "not_applicable",
      explanation: input.productType === "unknown"
        ? "Falta clasificar el producto antes de evaluar esta ruta."
        : "El rulebook actual no activó una ruta de cesión para este producto.",
      nextAction: input.productType === "unknown"
        ? "Clasificar el producto."
        : "No mostrar matching bancario para esta dimensión.",
      sourceRouteCodes: [],
    };
  }

  const ready = route.status === "eligible_now" && route.blockers.length === 0;

  return {
    code: "transfer",
    label: "Traslado / compra de cartera",
    status: ready ? "ready" : "explore",
    explanation: ready
      ? "Existe una oferta vinculante reportada que permite preparar el siguiente paso de la ruta de cesión."
      : "La ruta merece comparación, pero todavía no existe una base para presentarla como compatibilidad, oferta o aprobación bancaria.",
    nextAction: route.nextAction,
    sourceRouteCodes: [route.routeCode],
  };
}

function restructuringDimension(input: LoanHealthInput): LoanHealthDimension {
  const route = findRoute(input.routerResult, "R3_RESTRUCTURACION_546_20");

  if (!route) {
    return {
      code: "restructuring",
      label: "Reestructuración anual",
      status: input.productType === "unknown" ? "needs_data" : "not_applicable",
      explanation: input.productType === "unknown"
        ? "Falta clasificar el producto antes de evaluar la ruta especial."
        : "La ruta especial del artículo 20 no fue activada para este producto en el rulebook actual.",
      nextAction: input.productType === "unknown" ? "Clasificar el producto." : "No forzar esta ruta fuera de su ámbito.",
      sourceRouteCodes: [],
    };
  }

  const statusMap: Record<OpportunityRoute["status"], LoanHealthDimensionStatus> = {
    eligible_now: route.blockers.length === 0 ? "ready" : "explore",
    candidate: "explore",
    seasonal_wait: "seasonal",
    not_recommended: "not_applicable",
    legal_review: "professional_review",
  };

  return {
    code: "restructuring",
    label: "Reestructuración anual",
    status: statusMap[route.status],
    explanation: route.caveat ?? "La dimensión conserva el estado y límites definidos por el Opportunity Router.",
    nextAction: route.nextAction,
    sourceRouteCodes: [route.routeCode],
  };
}

function consistencyDimension(input: LoanHealthInput): LoanHealthDimension {
  const route = findRoute(input.routerResult, "R7_RECLAMACION");

  if (!route) {
    return {
      code: "consistency",
      label: "Consistencia / cobros",
      status: "no_flag_reported",
      explanation: "En los hechos evaluados no se reportó una discrepancia concreta. Esto no demuestra que toda la liquidación o actuación de la entidad sea correcta.",
      nextAction: "Si aparece un cobro, aplicación de pago o documento inconsistente, registrarlo con evidencia concreta.",
      sourceRouteCodes: [],
    };
  }

  return {
    code: "consistency",
    label: "Consistencia / cobros",
    status: "attention",
    explanation: route.caveat ?? "Existe una diferencia reportada que merece revisión; todavía no equivale a incumplimiento jurídico demostrado.",
    nextAction: route.nextAction,
    sourceRouteCodes: [route.routeCode],
  };
}

function proceduralDimension(paymentState: PaymentState): LoanHealthDimension {
  switch (paymentState) {
    case "current":
      return {
        code: "procedural_state",
        label: "Mora / proceso",
        status: "no_flag_reported",
        explanation: "El estado informado es al día; no se reportó una etapa de mora o proceso en este snapshot.",
        nextAction: "Actualizar este dato si cambia la situación de pago o recibes una comunicación formal.",
        sourceRouteCodes: [],
      };
    case "early_arrears":
    case "collections":
    case "prelegal":
      return {
        code: "procedural_state",
        label: "Mora / proceso",
        status: "attention",
        explanation: "El estado informado requiere atención temprana; Loan Health no calcula términos ni asume que ya exista un proceso judicial.",
        nextAction: "Organizar comunicaciones, saldo de mora y capacidad de pago para definir la siguiente ruta.",
        sourceRouteCodes: [],
      };
    case "executive":
    case "embargo_or_auction":
      return {
        code: "procedural_state",
        label: "Mora / proceso",
        status: "professional_review",
        explanation: "Se reportó una actuación judicial o medida que debe priorizar revisión profesional sobre optimización ordinaria.",
        nextAction: "Revisar el expediente y fechas relevantes con un profesional antes de ejecutar otra estrategia.",
        sourceRouteCodes: ["R10_EXECUTIVE_DEFENSE"],
      };
    case "unknown":
      return {
        code: "procedural_state",
        label: "Mora / proceso",
        status: "needs_data",
        explanation: "No conocemos todavía el estado de pago o cobranza.",
        nextAction: "Confirmar si la obligación está al día, en mora, cobranza o proceso.",
        sourceRouteCodes: [],
      };
  }
}

function overallDecisionState(
  precision: OpportunityPrecision,
  dimensions: LoanHealthDimension[],
): { decisionState: LoanHealthDecisionState; headline: string } {
  if (dimensions.some((dimension) => dimension.status === "professional_review")) {
    return {
      decisionState: "professional_review_priority",
      headline: "Hay una situación que debe revisarse profesionalmente antes de priorizar optimizaciones ordinarias.",
    };
  }

  if (dimensions.some((dimension) => dimension.status === "attention")) {
    return {
      decisionState: "attention_required",
      headline: "Hay un asunto concreto que merece atención antes de asumir que el crédito está funcionando como esperas.",
    };
  }

  const actionableCodes: LoanHealthDimensionCode[] = ["prepayment", "transfer", "restructuring"];
  if (dimensions.some((dimension) => actionableCodes.includes(dimension.code) && dimension.status === "ready")) {
    return {
      decisionState: "actionable_opportunity",
      headline: "Existe al menos una acción concreta que puedes comparar con los datos actuales.",
    };
  }

  if (precision === "C0" || precision === "C1") {
    return {
      decisionState: "improve_precision",
      headline: "La siguiente mejora de valor es aumentar la precisión antes de tomar una decisión material.",
    };
  }

  return {
    decisionState: "no_priority_action_detected",
    headline: "No detectamos una acción prioritaria con los hechos evaluados; esto no equivale a certificar que el crédito esté libre de problemas.",
  };
}

export function evaluateLoanHealth(input: LoanHealthInput): LoanHealthResult {
  const routeSpecificPrecision = higherPrecisionRoutes(input.precision, input.routerResult);
  const dimensions = [
    structureDimension(input.precision, routeSpecificPrecision),
    prepaymentDimension(input),
    transferDimension(input),
    restructuringDimension(input),
    consistencyDimension(input),
    proceduralDimension(input.paymentState),
  ];

  const overall = overallDecisionState(input.precision, dimensions);
  const routeSpecificNotice = routeSpecificPrecision.length > 0
    ? `La fuente base permanece en ${input.precision}. ${routeSpecificPrecision.map((route) => `${route.routeCode} ${route.precision}`).join(" · ")} tiene precisión superior solo dentro de su propia ruta; esto no verifica el documento ni eleva las demás decisiones.`
    : null;

  return {
    precision: input.precision,
    decisionState: overall.decisionState,
    headline: overall.headline,
    dimensions,
    notices: [
      "Loan Health v0.21 es una evaluación cualitativa de decisiones, no un score crediticio ni de riesgo.",
      "Las rutas conservan la precisión y el fundamento del Opportunity Router; esta capa no crea nuevas conclusiones jurídicas.",
      ...(routeSpecificNotice ? [routeSpecificNotice] : []),
    ],
  };
}
