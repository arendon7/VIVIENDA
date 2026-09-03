export type OpportunityPrecision = "C0" | "C1" | "C2" | "C3";

export type ProductType =
  | "mortgage_housing"
  | "housing_leasing"
  | "other_secured_credit"
  | "unknown";

export type Modality = "pesos" | "uvr" | "unknown";

export type PaymentState =
  | "current"
  | "early_arrears"
  | "collections"
  | "prelegal"
  | "executive"
  | "embargo_or_auction"
  | "unknown";

export type OpportunityRouteCode =
  | "R1_PREPAGO_PLAZO"
  | "R2_PREPAGO_CUOTA"
  | "R3_RESTRUCTURACION_546_20"
  | "R5_CESION_546_24"
  | "R7_RECLAMACION"
  | "R10_EXECUTIVE_DEFENSE";

export type OpportunityRouteStatus =
  | "eligible_now"
  | "candidate"
  | "seasonal_wait"
  | "not_recommended"
  | "legal_review";

export type OpportunityRouterInput = {
  asOfDate: string;
  precision: OpportunityPrecision;
  productType: ProductType;
  modality: Modality;
  extraPaymentCapacity?: number;
  wantsLowerPayment?: boolean;
  wantsFinishSooner?: boolean;
  hasBindingTransferOffer?: boolean;
  paymentState: PaymentState;
  materialEconomicChange?: boolean;
  currentAccreditedFamilyIncome?: number;
  proposedRestructuredFirstInstallment?: number;
  statementOrContractConflict?: boolean;
  unexplainedChargeOrAllocationIssue?: boolean;
};

export type OpportunityRoute = {
  routeCode: OpportunityRouteCode;
  title: string;
  status: OpportunityRouteStatus;
  priority: number;
  reasonCodes: string[];
  blockers: string[];
  requiredEvidence: string[];
  legalBasis: string[];
  humanReviewRequired: boolean;
  nextAction: string;
  precision: OpportunityPrecision;
  caveat?: string;
};

export type OpportunityRouterResult = {
  asOfDate: string;
  routes: OpportunityRoute[];
  primaryRoute: OpportunityRoute | null;
  notices: string[];
};

const coveredMortgage = (productType: ProductType) => productType === "mortgage_housing";
const distressRequiresLawyer = (paymentState: PaymentState) =>
  paymentState === "executive" || paymentState === "embargo_or_auction";

function monthFromIsoDate(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;

  return month;
}

function positive(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function routePrecision(input: OpportunityRouterInput): OpportunityPrecision {
  return input.precision === "C0" ? "C0" : input.precision;
}

function buildExecutiveDefense(input: OpportunityRouterInput): OpportunityRoute | null {
  if (!distressRequiresLawyer(input.paymentState)) return null;

  return {
    routeCode: "R10_EXECUTIVE_DEFENSE",
    title: "Revisión jurídica prioritaria del proceso",
    status: "legal_review",
    priority: 100,
    reasonCodes: [
      input.paymentState === "embargo_or_auction" ? "embargo_or_auction_reported" : "executive_proceeding_reported",
    ],
    blockers: ["La estrategia procesal no puede automatizarse con estos datos."],
    requiredEvidence: [
      "Demanda o mandamiento de pago si está disponible",
      "Últimos extractos y comunicaciones de cobranza",
      "Estado procesal y fechas relevantes",
    ],
    legalBasis: ["Revisión jurídica individual; el router no emite estrategia procesal automática."],
    humanReviewRequired: true,
    nextAction: "Priorizar revisión por abogado antes de ejecutar una estrategia de optimización ordinaria.",
    precision: routePrecision(input),
    caveat: "Las demás oportunidades pueden seguir existiendo, pero no sustituyen la defensa o revisión del proceso en curso.",
  };
}

function buildClaim(input: OpportunityRouterInput): OpportunityRoute | null {
  const conflict = input.statementOrContractConflict === true;
  const allocationIssue = input.unexplainedChargeOrAllocationIssue === true;
  if (!conflict && !allocationIssue) return null;

  const reasonCodes = [
    ...(conflict ? ["material_document_or_contract_conflict"] : []),
    ...(allocationIssue ? ["unexplained_charge_or_allocation_issue"] : []),
  ];

  return {
    routeCode: "R7_RECLAMACION",
    title: "Auditar y documentar una posible reclamación",
    status: "candidate",
    priority: distressRequiresLawyer(input.paymentState) ? 90 : 95,
    reasonCodes,
    blockers: input.precision === "C0" ? ["Falta un caso/documento concreto para una reclamación personalizada."] : [],
    requiredEvidence: [
      "Documento o movimiento donde aparece la diferencia",
      "Instrucción dada al banco, si existió",
      "Respuesta o radicado previo, si existe",
    ],
    legalBasis: ["Ley 546 de 1999, art. 21 — deber de información en créditos de vivienda."],
    humanReviewRequired: true,
    nextAction: "Organizar la evidencia y definir si procede solicitud de información, corrección o reclamación formal.",
    precision: routePrecision(input),
    caveat: "Detectar una inconsistencia no equivale por sí solo a demostrar un incumplimiento jurídico.",
  };
}

function buildArticle20(input: OpportunityRouterInput): OpportunityRoute | null {
  if (!coveredMortgage(input.productType)) {
    if (input.productType === "unknown") {
      return {
        routeCode: "R3_RESTRUCTURACION_546_20",
        title: "Primero necesitamos clasificar el producto",
        status: "candidate",
        priority: 20,
        reasonCodes: ["housing_regime_not_established"],
        blockers: ["Todavía no sabemos si el producto es un crédito hipotecario individual de vivienda cubierto por Ley 546."],
        requiredEvidence: ["Contrato o extracto que permita identificar la finalidad y naturaleza del crédito"],
        legalBasis: ["Ley 546 de 1999, arts. 1, 17 y 20 — la clasificación del producto precede al uso de la ruta especial."],
        humanReviewRequired: false,
        nextAction: "Confirmar primero la naturaleza del producto; la incertidumbre por sí sola no requiere escalar el caso a abogado.",
        precision: routePrecision(input),
        caveat: "No saber todavía qué producto tienes no confirma ni descarta que el régimen especial de vivienda aplique.",
      };
    }

    if (input.productType === "other_secured_credit") {
      return {
        routeCode: "R3_RESTRUCTURACION_546_20",
        title: "Revisar si el crédito realmente pertenece al régimen especial de vivienda",
        status: "legal_review",
        priority: 35,
        reasonCodes: ["housing_regime_not_established"],
        blockers: ["Una hipoteca como garantía no demuestra que la finalidad del crédito sea financiación individual de vivienda bajo Ley 546."],
        requiredEvidence: ["Contrato, pagaré y/o extracto que permita clasificar la finalidad y naturaleza del crédito"],
        legalBasis: ["Ley 546 de 1999, arts. 1, 17 y 20."],
        humanReviewRequired: true,
        nextAction: "Revisar la naturaleza contractual antes de invocar la ruta especial del artículo 20.",
        precision: routePrecision(input),
      };
    }

    return null;
  }

  const month = monthFromIsoDate(input.asOfDate);
  const windowOpen = month === 1 || month === 2;
  const economicChange = input.materialEconomicChange === true;
  const income = input.currentAccreditedFamilyIncome;
  const proposed = input.proposedRestructuredFirstInstallment;
  const hasIncome = positive(income);
  const hasProposed = positive(proposed);
  const firstInstallmentRatio = hasIncome && hasProposed ? proposed / income : null;
  const exceedsCurrentCap = firstInstallmentRatio !== null && firstInstallmentRatio > 0.4;
  const complex = distressRequiresLawyer(input.paymentState) || input.statementOrContractConflict === true;

  const blockers: string[] = [];
  const evidence: string[] = [];

  if (!economicChange) {
    evidence.push("Información que permita entender la capacidad real de pago actual y si cambió materialmente");
  }
  if (!hasIncome) {
    evidence.push("Ingreso familiar actualmente acreditable para la estructuración de la propuesta");
  }
  if (!hasProposed) {
    evidence.push("Primera cuota propuesta después de una eventual reestructuración");
  }
  if (exceedsCurrentCap) {
    blockers.push("La primera cuota propuesta supera el 40% del ingreso familiar acreditado y debe rediseñarse.");
  }

  let status: OpportunityRouteStatus = "candidate";
  let priority = 65;

  if (complex) {
    status = "legal_review";
    priority = distressRequiresLawyer(input.paymentState) ? 85 : 80;
  } else if (!windowOpen) {
    status = "seasonal_wait";
    priority = 30;
  } else if (economicChange && hasIncome && hasProposed && !exceedsCurrentCap) {
    status = "eligible_now";
    priority = 85;
  }

  const reasonCodes = [
    windowOpen ? "article20_window_open" : "article20_window_closed",
    ...(economicChange ? ["material_economic_change_reported"] : []),
    ...(firstInstallmentRatio !== null ? ["post_restructure_first_installment_ratio_available"] : []),
    ...(exceedsCurrentCap ? ["proposed_first_installment_above_40_percent"] : []),
  ];

  return {
    routeCode: "R3_RESTRUCTURACION_546_20",
    title: windowOpen ? "Evaluar reestructuración anual del artículo 20" : "Preparar la próxima ventana del artículo 20",
    status,
    priority,
    reasonCodes,
    blockers,
    requiredEvidence: evidence,
    legalBasis: [
      "Ley 546 de 1999, art. 20.",
      "Sentencia C-955 de 2000 — reestructuración solicitada en los dos primeros meses debe aceptarse si existen condiciones objetivas.",
      "Decreto 583 de 2025 — primera cuota hasta 40% de ingresos familiares; C-955 extiende 'primera cuota' a la primera post-reestructuración.",
    ],
    humanReviewRequired: complex,
    nextAction: windowOpen
      ? "Completar evidencia de capacidad de pago y estructurar una solicitud sin asumir aprobación automática."
      : "Conservar/organizar evidencia y revisar alternativas disponibles durante todo el año; reabrir esta ruta en enero-febrero.",
    precision: routePrecision(input),
    caveat: "El 40% no convierte una cuota vigente superior a ese porcentaje en una infracción automática; aquí se usa para validar la primera cuota de la reestructuración propuesta.",
  };
}

function buildPrepaymentTerm(input: OpportunityRouterInput): OpportunityRoute | null {
  if (!coveredMortgage(input.productType) || !positive(input.extraPaymentCapacity)) return null;

  return {
    routeCode: "R1_PREPAGO_PLAZO",
    title: "Usar abonos adicionales para reducir plazo",
    status: "eligible_now",
    priority: input.wantsFinishSooner ? 72 : input.wantsLowerPayment ? 48 : 60,
    reasonCodes: ["covered_housing_mortgage", "positive_extra_principal", ...(input.wantsFinishSooner ? ["goal_finish_sooner"] : [])],
    blockers: input.precision === "C1" || input.precision === "C0"
      ? ["El beneficio monetario exacto requiere un modelo C2/C3 compatible con tasa, plazo y sistema confirmados."]
      : [],
    requiredEvidence: [],
    legalBasis: ["Ley 546 de 1999, art. 17.8 — prepago total/parcial sin penalidad; en prepago parcial el deudor elige reducir cuota o plazo."],
    humanReviewRequired: input.unexplainedChargeOrAllocationIssue === true,
    nextAction: "Comparar el escenario de reducción de plazo y conservar evidencia de la instrucción dada al banco.",
    precision: routePrecision(input),
    caveat: "El capital adicional proviene del usuario; VIVIENDA no lo contabiliza como ahorro creado por el servicio.",
  };
}

function buildPrepaymentPayment(input: OpportunityRouterInput): OpportunityRoute | null {
  if (!coveredMortgage(input.productType) || !positive(input.extraPaymentCapacity)) return null;

  return {
    routeCode: "R2_PREPAGO_CUOTA",
    title: "Usar abonos adicionales para reducir cuota",
    status: "eligible_now",
    priority: input.wantsLowerPayment ? 72 : input.wantsFinishSooner ? 48 : 58,
    reasonCodes: ["covered_housing_mortgage", "positive_extra_principal", ...(input.wantsLowerPayment ? ["goal_lower_payment"] : [])],
    blockers: input.precision === "C1" || input.precision === "C0"
      ? ["El nuevo valor exacto de cuota requiere un modelo compatible con datos confirmados."]
      : [],
    requiredEvidence: [],
    legalBasis: ["Ley 546 de 1999, art. 17.8 — prepago total/parcial sin penalidad; en prepago parcial el deudor elige reducir cuota o plazo."],
    humanReviewRequired: input.unexplainedChargeOrAllocationIssue === true,
    nextAction: "Comparar reducción de cuota frente a reducción de plazo antes de impartir la instrucción.",
    precision: routePrecision(input),
    caveat: "Reducir cuota y reducir plazo persiguen objetivos distintos; el router no presupone cuál es mejor para ti.",
  };
}

function buildAssignment(input: OpportunityRouterInput): OpportunityRoute | null {
  if (!coveredMortgage(input.productType)) return null;

  const bindingOffer = input.hasBindingTransferOffer === true;

  return {
    routeCode: "R5_CESION_546_24",
    title: bindingOffer ? "Activar la cesión con oferta vinculante" : "Comparar una posible cesión o traslado de cartera",
    status: bindingOffer ? "eligible_now" : "candidate",
    priority: bindingOffer ? 78 : 45,
    reasonCodes: ["covered_housing_mortgage", bindingOffer ? "binding_transfer_offer_available" : "binding_transfer_offer_missing"],
    blockers: bindingOffer ? [] : ["Para activar el paso estatutario de autorización se necesita una oferta vinculante del nuevo acreedor."],
    requiredEvidence: bindingOffer
      ? ["Oferta vinculante del nuevo acreedor", "Prueba de entrega/radicación al acreedor actual"]
      : ["Cotizaciones/ofertas comparables de potenciales nuevos acreedores"],
    legalBasis: ["Ley 546 de 1999, art. 24 — cesión a petición del deudor; con oferta vinculante entregada, autorización en máximo 10 días hábiles."],
    humanReviewRequired: false,
    nextAction: bindingOffer
      ? "Radicar la oferta vinculante con trazabilidad de fecha. Desde su entrega al acreedor actual, controlar el plazo legal máximo de 10 días hábiles para la autorización."
      : "Obtener y comparar una oferta real antes de presentar esta ruta como transferencia lista para ejecutar.",
    precision: routePrecision(input),
    caveat: "Los 10 días hábiles no son el tiempo para que un nuevo banco apruebe el crédito; cuentan después de entregar la oferta vinculante al acreedor actual.",
  };
}

export function evaluateOpportunityRoutes(input: OpportunityRouterInput): OpportunityRouterResult {
  const notices: string[] = [];
  const month = monthFromIsoDate(input.asOfDate);

  if (month === null) {
    notices.push("La fecha de evaluación no tiene formato ISO YYYY-MM-DD; las reglas estacionales no pueden considerarse verificadas.");
  }

  if (input.productType === "housing_leasing") {
    notices.push("Leasing habitacional requiere reglas operativas específicas; este router no copia procedimientos hipotecarios que no estén expresamente soportados.");
  }

  if (input.productType === "other_secured_credit") {
    notices.push("Tener una hipoteca como garantía no demuestra por sí solo que el crédito sea financiación individual de vivienda bajo Ley 546.");
  }

  if (input.productType === "unknown") {
    notices.push("No saber todavía el tipo de producto no obliga a escalar el caso: primero hay que clasificarlo con el extracto o contrato disponible.");
  }

  const routes = [
    buildExecutiveDefense(input),
    buildClaim(input),
    buildArticle20(input),
    buildAssignment(input),
    buildPrepaymentTerm(input),
    buildPrepaymentPayment(input),
  ]
    .filter((route): route is OpportunityRoute => route !== null)
    .sort((a, b) => b.priority - a.priority || a.routeCode.localeCompare(b.routeCode));

  return {
    asOfDate: input.asOfDate,
    routes,
    primaryRoute: routes[0] ?? null,
    notices,
  };
}
