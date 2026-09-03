import {
  evaluateOpportunityRoutes,
  type OpportunityRoute,
  type PaymentState,
  type ProductType,
} from "@/domain/opportunity/router";

export type InconsistencyKind =
  | "payment_allocation"
  | "contract_or_statement"
  | "rate_or_modality"
  | "insurance_or_fee"
  | "balance_or_term"
  | "annual_projection"
  | "missing_information"
  | "collection_charge"
  | "other";

export type EvidenceAvailability = "none" | "one_source" | "two_sources" | "unknown";
export type DifferenceSpecificity = "specific" | "unclear";

export type ReconciliationState =
  | "education_first"
  | "needs_information"
  | "difference_to_reconcile"
  | "possible_inconsistency"
  | "procedural_priority";

export type ReconciliationActionCode =
  | "understand_rule"
  | "request_information"
  | "compare_evidence"
  | "prepare_audit"
  | "verify_judicial_document";

export type ReconciliationEvidenceImportance =
  | "required_for_next_step"
  | "recommended"
  | "conditional";

export type InconsistencyReconciliationInput = {
  asOfDate: string;
  productType: ProductType;
  paymentState: PaymentState;
  kind: InconsistencyKind;
  evidenceAvailability: EvidenceAvailability;
  specificity: DifferenceSpecificity;
};

export type ReconciliationEvidenceItem = {
  code: string;
  label: string;
  importance: ReconciliationEvidenceImportance;
};

export type ReconciliationAction = {
  code: ReconciliationActionCode;
  title: string;
  explanation: string;
};

export type InconsistencyReconciliationResult = {
  precision: "C0";
  state: ReconciliationState;
  title: string;
  explanation: string;
  whatCouldExplainIt: string[];
  whatToCompare: string[];
  evidenceChecklist: ReconciliationEvidenceItem[];
  primaryAction: ReconciliationAction;
  opportunityRoutes: OpportunityRoute[];
  professionalReviewRecommended: boolean;
  legalConclusionAutomated: false;
  notices: string[];
};

const judicialState = (state: PaymentState) => state === "executive" || state === "embargo_or_auction";

const r7CompatibleKinds = new Set<InconsistencyKind>([
  "payment_allocation",
  "contract_or_statement",
  "rate_or_modality",
  "insurance_or_fee",
  "balance_or_term",
  "collection_charge",
]);

function evidenceFor(kind: InconsistencyKind): ReconciliationEvidenceItem[] {
  const base: ReconciliationEvidenceItem[] = [
    { code: "latest-statement", label: "Último extracto disponible", importance: "recommended" },
  ];

  switch (kind) {
    case "payment_allocation":
      return [
        { code: "applied-payment-statement", label: "Extracto donde se vea cómo se aplicó el pago", importance: "required_for_next_step" },
        { code: "payment-instruction", label: "Instrucción de pago o prepago, si existió", importance: "required_for_next_step" },
        { code: "transaction-receipt", label: "Comprobante de la transacción", importance: "recommended" },
        { code: "lender-response", label: "Respuesta o radicado previo de la entidad, si existe", importance: "conditional" },
      ];
    case "contract_or_statement":
      return [
        { code: "contract-condition", label: "Contrato, pagaré o condición comunicada que quieres contrastar", importance: "required_for_next_step" },
        { code: "comparison-statement", label: "Extracto o comunicación donde aparece la condición distinta", importance: "required_for_next_step" },
        { code: "lender-response", label: "Respuesta o radicado previo, si existe", importance: "conditional" },
      ];
    case "rate_or_modality":
      return [
        { code: "rate-source", label: "Documento donde conste la tasa o modalidad pactada/comunicada", importance: "required_for_next_step" },
        { code: "rate-statement", label: "Extracto donde aparezca la tasa o modalidad aplicada", importance: "required_for_next_step" },
        { code: "cutoff-date", label: "Fecha de corte de los documentos comparados", importance: "recommended" },
      ];
    case "insurance_or_fee":
      return [
        { code: "charge-statement", label: "Extracto donde aparezca el seguro, tarifa o cobro", importance: "required_for_next_step" },
        { code: "policy-or-contract", label: "Póliza, contrato o soporte que describa el concepto", importance: "recommended" },
        { code: "lender-explanation", label: "Explicación de la entidad sobre el concepto, si ya la pediste", importance: "conditional" },
      ];
    case "balance_or_term":
      return [
        { code: "balance-source-a", label: "Primer documento con saldo, plazo o cuotas restantes", importance: "required_for_next_step" },
        { code: "balance-source-b", label: "Segundo documento que parece contradecirlo", importance: "required_for_next_step" },
        { code: "matching-cutoff", label: "Fechas de corte comparables de ambas fuentes", importance: "required_for_next_step" },
      ];
    case "annual_projection":
      return [
        { code: "annual-projection", label: "Proyección anual recibida de la entidad", importance: "required_for_next_step" },
        { code: "actual-statement-history", label: "Extracto(s) o historia real del periodo que quieres contrastar", importance: "required_for_next_step" },
        { code: "projection-assumptions", label: "Supuestos o explicación asociados a la proyección", importance: "recommended" },
      ];
    case "missing_information":
      return [
        ...base,
        { code: "information-request", label: "Solicitud concreta de la información que necesitas", importance: "required_for_next_step" },
        { code: "lender-response", label: "Respuesta o radicado de la entidad, cuando exista", importance: "conditional" },
      ];
    case "collection_charge":
      return [
        { code: "collection-communication", label: "Comunicación donde aparezca el valor o concepto de cobranza", importance: "required_for_next_step" },
        { code: "statement-or-liquidation", label: "Extracto o liquidación de la obligación para contrastar el valor", importance: "required_for_next_step" },
        { code: "lender-response", label: "Explicación o radicado de la entidad, si existe", importance: "conditional" },
      ];
    case "other":
      return [
        ...base,
        { code: "comparison-source", label: "Documento o comunicación que permita describir la diferencia con precisión", importance: "required_for_next_step" },
      ];
  }
}

function explanationFor(kind: InconsistencyKind): { alternatives: string[]; compare: string[] } {
  switch (kind) {
    case "payment_allocation":
      return {
        alternatives: [
          "Una cuota ordinaria puede distribuirse entre capital, intereses y seguros.",
          "Si había mora, la aplicación puede involucrar componentes adicionales y cuotas vencidas.",
          "Una instrucción expresa de prepago cambia qué evidencia debe contrastarse.",
        ],
        compare: ["Instrucción/comprobante del pago", "Extracto donde se vea la aplicación efectiva"],
      };
    case "contract_or_statement":
      return {
        alternatives: [
          "Los documentos pueden referirse a periodos o condiciones distintas.",
          "Una modificación válida puede haber sido comunicada en otro soporte que todavía no estás comparando.",
        ],
        compare: ["Condición pactada o comunicada", "Condición reflejada en el extracto o comunicación posterior"],
      };
    case "rate_or_modality":
      return {
        alternatives: [
          "La tasa puede estar expresada con convenciones diferentes si no se comparan bases equivalentes.",
          "En obligaciones UVR, el valor en pesos también depende de la unidad aplicable al periodo.",
        ],
        compare: ["Tasa/modalidad pactada o comunicada", "Tasa/modalidad aplicada en el mismo periodo comparable"],
      };
    case "insurance_or_fee":
      return {
        alternatives: [
          "El concepto puede corresponder a un seguro o costo previsto pero no identificado todavía.",
          "Que un cobro resulte desconocido no demuestra por sí solo que sea improcedente.",
        ],
        compare: ["Concepto discriminado en el extracto", "Contrato, póliza o soporte que explique su origen"],
      };
    case "balance_or_term":
      return {
        alternatives: [
          "Dos saldos pueden ser distintos si tienen fechas de corte diferentes.",
          "Un pago, prepago, mora o movimiento entre cortes puede modificar saldo y plazo restante.",
        ],
        compare: ["Saldo/plazo de la primera fuente", "Saldo/plazo de la segunda fuente con fecha de corte comparable"],
      };
    case "annual_projection":
      return {
        alternatives: [
          "La proyección anual usa supuestos y no es una garantía de la trayectoria real.",
          "Cambios en las variables o en el comportamiento del crédito pueden producir diferencias frente a la proyección.",
        ],
        compare: ["Supuestos y cifras de la proyección anual", "Comportamiento real del crédito durante el mismo periodo"],
      };
    case "missing_information":
      return {
        alternatives: [
          "La información puede existir en otro documento o canal que todavía no tienes.",
          "Primero conviene pedir el dato concreto y conservar trazabilidad de la solicitud.",
        ],
        compare: ["Información que necesitas", "Documento o respuesta donde la entidad la suministre o explique"],
      };
    case "collection_charge":
      return {
        alternatives: [
          "El valor puede incluir conceptos de mora o cobranza que deben identificarse por separado.",
          "Cobranza no equivale por sí sola a proceso judicial ni demuestra una irregularidad.",
        ],
        compare: ["Comunicación de cobranza", "Extracto/liquidación y explicación del concepto"],
      };
    case "other":
      return {
        alternatives: ["Todavía no hay una categoría suficientemente concreta para inferir qué regla o documento explica la diferencia."],
        compare: ["La fuente donde aparece lo esperado", "La fuente donde aparece lo que realmente ocurrió"],
      };
  }
}

function actionFor(state: ReconciliationState): ReconciliationAction {
  switch (state) {
    case "education_first":
      return {
        code: "understand_rule",
        title: "Entender primero qué significa la diferencia",
        explanation: "Contrasta los supuestos de la proyección con el comportamiento real antes de tratar la variación como una inconsistencia.",
      };
    case "needs_information":
      return {
        code: "request_information",
        title: "Conseguir la información que falta",
        explanation: "Formula una pregunta concreta, conserva el radicado y reúne al menos la fuente que permita ubicar exactamente la diferencia.",
      };
    case "difference_to_reconcile":
      return {
        code: "compare_evidence",
        title: "Comparar las fuentes antes de escalar",
        explanation: "Ya hay una diferencia concreta, pero todavía falta una comparación suficiente para llamarla posible inconsistencia.",
      };
    case "possible_inconsistency":
      return {
        code: "prepare_audit",
        title: "Preparar una auditoría de la diferencia",
        explanation: "La comparación que reportas justifica revisar evidencia real y determinar si corresponde explicación, corrección o reclamación.",
      };
    case "procedural_priority":
      return {
        code: "verify_judicial_document",
        title: "Verificar primero el documento judicial",
        explanation: "El estado judicial reportado tiene prioridad. No calculamos términos ni estrategia procesal desde este formulario.",
      };
  }
}

function stateTitle(state: ReconciliationState): string {
  switch (state) {
    case "education_first": return "La diferencia puede tener una explicación estructural antes de ser un problema.";
    case "needs_information": return "Todavía falta información para aislar una inconsistencia concreta.";
    case "difference_to_reconcile": return "Ya identificaste qué comparar; ahora falta reconciliar las fuentes.";
    case "possible_inconsistency": return "Hay una diferencia concreta que vale la pena auditar con evidencia real.";
    case "procedural_priority": return "Reportaste un estado judicial: ese documento tiene prioridad sobre la reconciliación ordinaria.";
  }
}

export function reconcileInconsistency(input: InconsistencyReconciliationInput): InconsistencyReconciliationResult {
  const notices: string[] = [];
  const judicial = judicialState(input.paymentState);
  const specific = input.specificity === "specific";
  const twoSources = input.evidenceAvailability === "two_sources";
  const mortgage = input.productType === "mortgage_housing";
  const r7EligibleContext = mortgage && specific && twoSources && r7CompatibleKinds.has(input.kind);

  const router = evaluateOpportunityRoutes({
    asOfDate: input.asOfDate,
    precision: "C0",
    productType: input.productType,
    modality: "unknown",
    paymentState: input.paymentState,
    ...(r7EligibleContext && (input.kind === "payment_allocation" || input.kind === "collection_charge")
      ? { unexplainedChargeOrAllocationIssue: true }
      : {}),
    ...(r7EligibleContext && !["payment_allocation", "collection_charge"].includes(input.kind)
      ? { statementOrContractConflict: true }
      : {}),
  });

  const relevantRoutes = router.routes.filter((route) => route.routeCode === "R10_EXECUTIVE_DEFENSE" || route.routeCode === "R7_RECLAMACION");
  const hasR7 = relevantRoutes.some((route) => route.routeCode === "R7_RECLAMACION");

  let state: ReconciliationState;
  if (judicial) state = "procedural_priority";
  else if (input.productType === "unknown") state = "needs_information";
  else if (input.kind === "annual_projection") state = "education_first";
  else if (input.kind === "missing_information" || input.specificity === "unclear" || input.evidenceAvailability === "none" || input.evidenceAvailability === "unknown") state = "needs_information";
  else if (hasR7) state = "possible_inconsistency";
  else state = "difference_to_reconcile";

  if (input.productType === "unknown") {
    notices.push("Primero conviene confirmar la naturaleza del producto antes de invocar reglas especiales del crédito hipotecario de vivienda.");
  }
  if (input.productType === "housing_leasing") {
    notices.push("La diferencia puede reconciliarse, pero v0.15 no copia automáticamente al leasing procedimientos jurídicos propios del crédito hipotecario.");
  }
  if (input.kind === "annual_projection") {
    notices.push("Una variación frente a la proyección anual no activa R7 por sí sola; primero se comparan supuestos y comportamiento real.");
  }
  if (input.evidenceAvailability === "two_sources") {
    notices.push("Tener dos fuentes declaradas mejora la comparación, pero no concede C2 ni C3: la evidencia todavía no ha sido procesada ni reconciliada documentalmente.");
  }

  const explanation = explanationFor(input.kind);

  return {
    precision: "C0",
    state,
    title: stateTitle(state),
    explanation: state === "possible_inconsistency"
      ? "Tu descripción es específica y dices tener dos fuentes para contrastar. Eso justifica una revisión de evidencia, no una conclusión automática contra la entidad."
      : state === "procedural_priority"
        ? "La posible diferencia puede seguir siendo relevante, pero no reemplaza la revisión del proceso o actuación judicial que reportaste."
        : state === "education_first"
          ? "Antes de escalar, separa una variación explicable por supuestos de una contradicción real entre documentos comparables."
          : state === "difference_to_reconcile"
            ? "La diferencia está suficientemente ubicada para comparar, pero todavía no reúne el contexto que v0.15 exige para activar R7."
            : "Primero necesitamos convertir la preocupación en una comparación factual y trazable.",
    whatCouldExplainIt: explanation.alternatives,
    whatToCompare: explanation.compare,
    evidenceChecklist: evidenceFor(input.kind),
    primaryAction: actionFor(state),
    opportunityRoutes: relevantRoutes,
    professionalReviewRecommended: state === "possible_inconsistency" || state === "procedural_priority",
    legalConclusionAutomated: false,
    notices: [...router.notices.filter((notice) => input.productType !== "mortgage_housing"), ...notices],
  };
}
