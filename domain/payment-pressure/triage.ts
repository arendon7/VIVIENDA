import {
  evaluateOpportunityRoutes,
  type OpportunityRoute,
  type PaymentState,
  type ProductType,
} from "@/domain/opportunity/router";

export type PaymentPressureChange = "yes" | "no" | "unknown";
export type NextPaymentOutlook = "can_pay" | "at_risk" | "cannot_pay" | "unknown";

export type PaymentPressureInput = {
  asOfDate: string;
  productType: ProductType;
  paymentState: PaymentState;
  materialEconomicChange: PaymentPressureChange;
  nextPaymentOutlook: NextPaymentOutlook;
  statementOrContractConflict?: boolean;
  unexplainedChargeOrAllocationIssue?: boolean;
};

export type PaymentPressureUrgency =
  | "preventive"
  | "prompt_action"
  | "professional_review"
  | "procedural_urgency"
  | "needs_information";

export type PaymentPressureActionCode =
  | "classify_state"
  | "contact_lender"
  | "gather_evidence"
  | "professional_review";

export type PaymentPressureEvidence = {
  code: string;
  label: string;
  importance: "required_for_next_step" | "recommended" | "conditional";
};

export type PaymentPressureResult = {
  urgency: PaymentPressureUrgency;
  title: string;
  explanation: string;
  primaryAction: {
    code: PaymentPressureActionCode;
    title: string;
    explanation: string;
  };
  evidenceChecklist: PaymentPressureEvidence[];
  opportunityRoutes: OpportunityRoute[];
  professionalReviewRecommended: boolean;
  legalStrategyAutomated: false;
  notices: string[];
};

function isJudicial(state: PaymentState) {
  return state === "executive" || state === "embargo_or_auction";
}

function isCollectionStage(state: PaymentState) {
  return state === "early_arrears" || state === "collections" || state === "prelegal";
}

function hasInconsistency(input: PaymentPressureInput) {
  return input.statementOrContractConflict === true || input.unexplainedChargeOrAllocationIssue === true;
}

function dedupeEvidence(items: PaymentPressureEvidence[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.code)) return false;
    seen.add(item.code);
    return true;
  });
}

function routeEvidence(routes: OpportunityRoute[]): PaymentPressureEvidence[] {
  return routes.flatMap((route) => route.requiredEvidence.map((label, index) => ({
    code: `route-${route.routeCode.toLowerCase()}-${index}`,
    label,
    importance: route.routeCode === "R10_EXECUTIVE_DEFENSE"
      ? "required_for_next_step" as const
      : "conditional" as const,
  })));
}

function relevantRoutes(input: PaymentPressureInput): { routes: OpportunityRoute[]; notices: string[] } {
  const router = evaluateOpportunityRoutes({
    asOfDate: input.asOfDate,
    precision: "C0",
    productType: input.productType,
    modality: "unknown",
    paymentState: input.paymentState,
    ...(input.materialEconomicChange === "yes" ? { materialEconomicChange: true } : {}),
    ...(input.statementOrContractConflict === undefined
      ? {}
      : { statementOrContractConflict: input.statementOrContractConflict }),
    ...(input.unexplainedChargeOrAllocationIssue === undefined
      ? {}
      : { unexplainedChargeOrAllocationIssue: input.unexplainedChargeOrAllocationIssue }),
  });

  const routes = router.routes.filter((route) => {
    if (route.routeCode === "R10_EXECUTIVE_DEFENSE") return true;
    if (route.routeCode === "R7_RECLAMACION") return true;
    if (route.routeCode === "R3_RESTRUCTURACION_546_20") {
      return input.materialEconomicChange === "yes" && input.productType === "mortgage_housing";
    }
    return false;
  });

  return { routes, notices: router.notices };
}

function urgencyFor(input: PaymentPressureInput, routes: OpportunityRoute[]): PaymentPressureUrgency {
  if (isJudicial(input.paymentState)) return "procedural_urgency";
  if (routes.some((route) => route.routeCode === "R7_RECLAMACION")) return "professional_review";
  if (isCollectionStage(input.paymentState)) return "prompt_action";
  if (input.paymentState === "unknown") return "needs_information";
  return "preventive";
}

function copyFor(urgency: PaymentPressureUrgency, input: PaymentPressureInput) {
  switch (urgency) {
    case "procedural_urgency":
      return {
        title: input.paymentState === "embargo_or_auction"
          ? "Reportaste una actuación judicial avanzada: primero hay que verificar el expediente."
          : "Reportaste un proceso judicial: la prioridad es revisar documentos reales.",
        explanation: "No calculamos términos ni estrategia desde este formulario. Una cobranza y un proceso judicial son estados distintos; aquí el estado judicial fue reportado expresamente.",
        action: {
          code: "professional_review" as const,
          title: "Preparar revisión jurídica prioritaria",
          explanation: "Reúne la comunicación judicial disponible y solicita revisión profesional antes de ejecutar una estrategia ordinaria de optimización o negociación.",
        },
      };
    case "professional_review":
      return {
        title: "Además de la presión de pago, reportaste una diferencia que conviene documentar.",
        explanation: "Una inconsistencia reportada no prueba por sí sola un incumplimiento. Primero hay que aislar el dato, cobro o aplicación y contrastarlo con evidencia.",
        action: {
          code: "gather_evidence" as const,
          title: "Aislar y documentar la diferencia",
          explanation: "Reúne el extracto o documento donde aparece la diferencia. Después podrá definirse si basta una solicitud de información/corrección o si procede revisión profesional.",
        },
      };
    case "prompt_action":
      return {
        title: input.paymentState === "early_arrears"
          ? "Hay mora temprana reportada: conviene actuar pronto."
          : "Hay cobranza reportada: conviene ordenar la situación y actuar pronto.",
        explanation: input.paymentState === "prelegal"
          ? "El cobro prejurídico/prelegal es extraprocesal; no lo tratamos como una demanda presentada."
          : input.paymentState === "collections"
            ? "Una gestión de cobranza no demuestra por sí sola que exista un proceso judicial."
            : "Actuar temprano permite entender alternativas y evidencia antes de que la situación escale.",
        action: {
          code: "contact_lender" as const,
          title: "Entender alternativas con tu entidad",
          explanation: "Contacta a la entidad para conocer las alternativas disponibles, conserva la respuesta y no asumas que una propuesta de modificación debe ser aceptada.",
        },
      };
    case "needs_information":
      return {
        title: "Primero necesitamos ubicar en qué estado está la obligación.",
        explanation: "No saber si existe mora, cobranza o proceso judicial impide asignar una urgencia fiable. El último extracto o una comunicación reciente suele permitir clasificar mejor el estado.",
        action: {
          code: "classify_state" as const,
          title: "Confirmar el estado antes de decidir",
          explanation: "Busca el último extracto y la comunicación más reciente de la entidad o gestor de cobranza. No necesitas contratar abogado solo porque todavía no conozcas la etapa.",
        },
      };
    case "preventive": {
      const pressureReported = input.materialEconomicChange === "yes"
        || input.nextPaymentOutlook === "at_risk"
        || input.nextPaymentOutlook === "cannot_pay";
      return pressureReported
        ? {
            title: "Aún no reportas mora: este es el mejor momento para actuar preventivamente.",
            explanation: "La presión financiera merece atención, pero con estos datos no hay una urgencia judicial reportada. La prioridad es entender capacidad de pago y alternativas antes de incumplir.",
            action: {
              code: "contact_lender" as const,
              title: "Preparar una conversación temprana con tu entidad",
              explanation: "Organiza tu situación de ingresos/gastos, consulta las alternativas disponibles y conserva cualquier respuesta. No asumimos aprobación de una modificación.",
            },
          }
        : {
            title: "No reportas mora ni riesgo inmediato con estos datos.",
            explanation: "No vemos una señal que justifique urgencia. Puedes conservar claridad sobre el estado del crédito y volver a evaluar si cambia tu capacidad de pago.",
            action: {
              code: "gather_evidence" as const,
              title: "Mantener tu información actualizada",
              explanation: "Conserva el último extracto y revisa cualquier cambio material en cuota, ingresos o estado de pago antes de asumir que existe un problema.",
            },
          };
    }
  }
}

function evidenceFor(input: PaymentPressureInput, urgency: PaymentPressureUrgency, routes: OpportunityRoute[]) {
  const evidence: PaymentPressureEvidence[] = [
    {
      code: "latest-statement",
      label: "Último extracto disponible del crédito o leasing",
      importance: urgency === "needs_information" ? "required_for_next_step" : "recommended",
    },
  ];

  if (input.paymentState !== "current") {
    evidence.push({
      code: "latest-status-communication",
      label: "Comunicación reciente sobre mora, cobranza o estado de la obligación",
      importance: isJudicial(input.paymentState) ? "required_for_next_step" : "recommended",
    });
  }

  if (input.materialEconomicChange === "yes") {
    evidence.push({
      code: "capacity-change-context",
      label: "Información que permita entender cómo cambió la capacidad real de pago del hogar",
      importance: "recommended",
    });
  }

  if (input.paymentState === "collections" || input.paymentState === "prelegal") {
    evidence.push({
      code: "collection-communication",
      label: "Comunicación de cobranza con remitente, fecha y valor solicitado",
      importance: "recommended",
    });
  }

  if (isJudicial(input.paymentState)) {
    evidence.push(
      {
        code: "court-document",
        label: "Demanda, mandamiento de pago o comunicación judicial disponible",
        importance: "required_for_next_step",
      },
      {
        code: "notification-evidence",
        label: "Constancia o documento de notificación/comunicación recibido",
        importance: "required_for_next_step",
      },
    );
  }

  if (hasInconsistency(input)) {
    evidence.push({
      code: "inconsistency-source",
      label: "Extracto, movimiento, contrato o instrucción donde aparece la diferencia reportada",
      importance: "required_for_next_step",
    });
  }

  return dedupeEvidence([...evidence, ...routeEvidence(routes)]);
}

export function evaluatePaymentPressure(input: PaymentPressureInput): PaymentPressureResult {
  const { routes, notices: routerNotices } = relevantRoutes(input);
  const urgency = urgencyFor(input, routes);
  const copy = copyFor(urgency, input);

  const notices = [...routerNotices];

  if (input.paymentState === "collections" || input.paymentState === "prelegal") {
    notices.push("Cobranza/prelegal reportada no se trata como proceso judicial sin evidencia de una demanda o actuación judicial.");
    notices.push("Las prácticas de cobranza están sujetas a reglas de canales, horario y periodicidad; este triage no concluye automáticamente que una práctica específica las haya infringido.");
  }

  if (input.productType === "housing_leasing") {
    notices.push("Leasing habitacional requiere reglas propias; v0.14 no copia procedimientos hipotecarios de Ley 546 al leasing.");
  }

  if (input.materialEconomicChange === "unknown") {
    notices.push("No confirmamos un cambio material de capacidad de pago; por eso no activamos esa condición como hecho en el Opportunity Router.");
  }

  if (isJudicial(input.paymentState)) {
    notices.push("No calculamos términos procesales ni estrategia jurídica a partir de fechas declaradas por el usuario.");
  }

  return {
    urgency,
    title: copy.title,
    explanation: copy.explanation,
    primaryAction: copy.action,
    evidenceChecklist: evidenceFor(input, urgency, routes),
    opportunityRoutes: routes,
    professionalReviewRecommended: urgency === "procedural_urgency" || urgency === "professional_review",
    legalStrategyAutomated: false,
    notices,
  };
}