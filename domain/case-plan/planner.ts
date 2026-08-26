import type {
  OpportunityRoute,
  OpportunityRouteCode,
  OpportunityRouteStatus,
} from "@/domain/opportunity/router";

export type CasePlanMode = "local_preview";
export type CasePlanPhaseState = "ready" | "blocked" | "conditional";
export type CasePlanTaskState = "todo" | "blocked" | "conditional";
export type CasePlanActor = "user" | "system" | "professional" | "bank_or_third_party";
export type CasePlanEvidenceKind = "known_required" | "recommended" | "conditional";
export type CasePlanTimingKind =
  | "calendar_window"
  | "relative_after_trigger"
  | "evidence_event"
  | "professional_review";

export type CasePlanTask = {
  code: string;
  title: string;
  actor: CasePlanActor;
  state: CasePlanTaskState;
  explanation?: string;
};

export type CasePlanPhase = {
  code: string;
  title: string;
  state: CasePlanPhaseState;
  tasks: CasePlanTask[];
};

export type CasePlanEvidenceItem = {
  label: string;
  kind: CasePlanEvidenceKind;
};

export type CasePlanEvent = {
  label: string;
  timingKind: CasePlanTimingKind;
  timingText: string;
  triggerEstablished: boolean;
};

export type CasePlan = {
  mode: CasePlanMode;
  routeCode: OpportunityRouteCode;
  routeStatus: OpportunityRouteStatus;
  precision: OpportunityRoute["precision"];
  title: string;
  objective: string;
  phases: CasePlanPhase[];
  evidenceChecklist: CasePlanEvidenceItem[];
  nextEvent: CasePlanEvent | null;
  warnings: string[];
};

function task(
  code: string,
  title: string,
  actor: CasePlanActor,
  state: CasePlanTaskState = "todo",
  explanation?: string,
): CasePlanTask {
  return {
    code,
    title,
    actor,
    state,
    ...(explanation ? { explanation } : {}),
  };
}

function phase(
  code: string,
  title: string,
  state: CasePlanPhaseState,
  tasks: CasePlanTask[],
): CasePlanPhase {
  return { code, title, state, tasks };
}

function evidence(
  label: string,
  kind: CasePlanEvidenceKind = "recommended",
): CasePlanEvidenceItem {
  return { label, kind };
}

function routeEvidence(route: OpportunityRoute): CasePlanEvidenceItem[] {
  return route.requiredEvidence.map((label) => evidence(label, "known_required"));
}

function dedupeEvidence(items: CasePlanEvidenceItem[]): CasePlanEvidenceItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.label.trim().toLocaleLowerCase("es-CO");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseYearMonth(asOfDate: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asOfDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || year < 2000 || year > 2200) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function nextArticle20Window(asOfDate: string): string {
  const parsed = parseYearMonth(asOfDate);
  if (!parsed) return "la próxima ventana enero-febrero";
  const year = parsed.month <= 2 ? parsed.year : parsed.year + 1;
  return `enero-febrero de ${year}`;
}

function classificationPlan(route: OpportunityRoute): CasePlan {
  return {
    mode: "local_preview",
    routeCode: route.routeCode,
    routeStatus: route.status,
    precision: route.precision,
    title: "Clasificar el producto antes de escoger una ruta jurídica",
    objective: "Determinar si el producto es crédito hipotecario de vivienda, leasing habitacional u otro crédito garantizado con hipoteca.",
    phases: [
      phase("classify-source", "Identificar el producto", "ready", [
        task("inspect-statement", "Revisar cómo denomina el producto el extracto disponible", "user"),
        task("inspect-purpose", "Confirmar la finalidad contractual del crédito", "user"),
      ]),
      phase("classify-router", "Volver a evaluar", "conditional", [
        task("rerun-router", "Reejecutar el Opportunity Router con el producto ya clasificado", "system", "conditional"),
      ]),
    ],
    evidenceChecklist: dedupeEvidence([
      ...routeEvidence(route),
      evidence("Extracto donde aparezca el nombre/tipo del producto"),
      evidence("Contrato o documento que permita identificar la finalidad del crédito", "conditional"),
    ]),
    nextEvent: {
      label: "Producto clasificado",
      timingKind: "evidence_event",
      timingText: "Cuando el extracto o contrato permita identificar la naturaleza del producto.",
      triggerEstablished: false,
    },
    warnings: [
      "Este plan no prepara todavía una solicitud del artículo 20.",
      "No saber el tipo de producto no equivale a necesitar representación jurídica.",
    ],
  };
}

function prepaymentPlan(route: OpportunityRoute, reduce: "term" | "payment"): CasePlan {
  const reduceTerm = reduce === "term";
  const objective = reduceTerm
    ? "Aplicar capital adicional para reducir el plazo restante, si el usuario mantiene ese objetivo."
    : "Aplicar capital adicional para reducir la cuota, si el usuario mantiene ese objetivo.";
  const instruction = reduceTerm
    ? "Dejar explícita la instrucción de aplicar el abono a reducción de plazo"
    : "Dejar explícita la instrucción de aplicar el abono a reducción de cuota";

  return {
    mode: "local_preview",
    routeCode: route.routeCode,
    routeStatus: route.status,
    precision: route.precision,
    title: reduceTerm ? "Plan de abono para reducir plazo" : "Plan de abono para reducir cuota",
    objective,
    phases: [
      phase("compare", "Comparar antes de ejecutar", "ready", [
        task("review-model", "Revisar el escenario modelado, sus supuestos y la fuente del capital adicional", "system"),
        task("compare-objectives", "Comparar reducción de plazo frente a reducción de cuota", "user"),
      ]),
      phase("decide", "Definir la instrucción", "ready", [
        task("confirm-amount", "Confirmar monto y frecuencia del capital adicional", "user"),
        task("confirm-application", instruction, "user"),
      ]),
      phase("execute", "Ejecutar con el banco", "conditional", [
        task("make-prepayment", "Realizar el abono únicamente cuando el usuario decida ejecutarlo", "user", "conditional"),
        task("preserve-proof", "Conservar comprobante e instrucción de aplicación", "user", "conditional"),
      ]),
      phase("verify", "Verificar el efecto real", "conditional", [
        task("review-next-statement", "Comparar el siguiente extracto con la instrucción dada", "system", "conditional"),
      ]),
    ],
    evidenceChecklist: dedupeEvidence([
      ...routeEvidence(route),
      evidence("Extracto actual"),
      evidence("Escenario/simulación usada para decidir"),
      evidence(`Prueba de la instrucción de ${reduceTerm ? "reducción de plazo" : "reducción de cuota"}`, "conditional"),
      evidence("Comprobante del abono", "conditional"),
      evidence("Extracto posterior al abono", "conditional"),
    ]),
    nextEvent: {
      label: "Verificación posterior al abono",
      timingKind: "evidence_event",
      timingText: "Cuando exista un abono real y llegue el siguiente extracto del crédito.",
      triggerEstablished: false,
    },
    warnings: [
      "El capital adicional es aportado por el usuario y no se contabiliza como valor creado por VIVIENDA.",
      "El plan no afirma que el abono ya fue realizado ni que el banco ya aplicó la instrucción.",
    ],
  };
}

function article20Plan(route: OpportunityRoute, asOfDate: string): CasePlan {
  if (route.reasonCodes.includes("housing_regime_not_established")) {
    return classificationPlan(route);
  }

  if (route.status === "legal_review") {
    return {
      mode: "local_preview",
      routeCode: route.routeCode,
      routeStatus: route.status,
      precision: route.precision,
      title: "Plan de revisión jurídica antes de estructurar la reestructuración",
      objective: "Resolver primero el factor jurídico o documental que impide automatizar la ruta del artículo 20.",
      phases: [
        phase("collect", "Reunir contexto", "ready", [
          task("collect-route-evidence", "Reunir los documentos y hechos que originaron el bloqueo", "user"),
        ]),
        phase("professional-review", "Revisión profesional", "ready", [
          task("lawyer-review", "Revisar el caso antes de definir estrategia o solicitud", "professional"),
        ]),
        phase("prepare-after-review", "Preparar ruta, si procede", "conditional", [
          task("prepare-request-after-review", "Estructurar la solicitud solo después de la revisión profesional", "professional", "conditional"),
        ]),
      ],
      evidenceChecklist: dedupeEvidence([
        ...routeEvidence(route),
        evidence("Extractos y contrato relevantes"),
        evidence("Documentos del proceso/cobranza si existen", "conditional"),
      ]),
      nextEvent: {
        label: "Revisión profesional del caso",
        timingKind: "professional_review",
        timingText: "Antes de definir una estrategia de reestructuración o actuación procesal.",
        triggerEstablished: false,
      },
      warnings: ["El plan no genera una estrategia jurídica automática ni presume que la reestructuración será aceptada."],
    };
  }

  if (route.status === "seasonal_wait") {
    const window = nextArticle20Window(asOfDate);
    return {
      mode: "local_preview",
      routeCode: route.routeCode,
      routeStatus: route.status,
      precision: route.precision,
      title: "Plan de preparación para la próxima ventana del artículo 20",
      objective: "Llegar a la próxima ventana enero-febrero con la capacidad de pago y la propuesta suficientemente documentadas.",
      phases: [
        phase("capacity", "Preparar evidencia de capacidad de pago", "ready", [
          task("collect-income", "Organizar evidencia del ingreso familiar actualmente acreditable", "user"),
          task("document-change", "Documentar el cambio material de capacidad de pago, si existe", "user"),
        ]),
        phase("proposal", "Diseñar una propuesta sostenible", "ready", [
          task("design-first-payment", "Definir una primera cuota post-reestructuración coherente con la evidencia disponible", "system"),
          task("validate-proposal", "Revisar blockers y datos faltantes antes de preparar una solicitud", "system"),
        ]),
        phase("window", `Reabrir la ruta en ${window}`, "conditional", [
          task("recheck-window", "Reevaluar la ruta al abrir la ventana especial", "system", "conditional"),
          task("prepare-filing", "Preparar radicación solo si las condiciones de ese momento lo soportan", "user", "conditional"),
        ]),
      ],
      evidenceChecklist: dedupeEvidence([
        ...routeEvidence(route),
        evidence("Soportes del ingreso familiar"),
        evidence("Soportes del cambio de capacidad de pago", "recommended"),
        evidence("Propuesta de primera cuota post-reestructuración", "recommended"),
      ]),
      nextEvent: {
        label: "Próxima ventana especial del artículo 20",
        timingKind: "calendar_window",
        timingText: window,
        triggerEstablished: true,
      },
      warnings: [
        "La ventana futura no es una cita ni una aprobación garantizada.",
        "Este plan no afirma que pueda radicarse hoy bajo la ventana especial.",
      ],
    };
  }

  return {
    mode: "local_preview",
    routeCode: route.routeCode,
    routeStatus: route.status,
    precision: route.precision,
    title: "Plan de preparación de reestructuración del artículo 20",
    objective: "Completar evidencia, validar la estructura propuesta y preparar una solicitud sin convertir readiness en aprobación.",
    phases: [
      phase("complete-evidence", "Completar condiciones y evidencia", route.blockers.length > 0 ? "blocked" : "ready", [
        task("resolve-blockers", "Resolver blockers materiales de la ruta", "user", route.blockers.length > 0 ? "blocked" : "todo"),
        task("complete-capacity", "Completar evidencia de capacidad real de pago", "user"),
      ]),
      phase("validate", "Validar propuesta", "ready", [
        task("validate-first-installment", "Revisar la primera cuota propuesta y demás supuestos", "system"),
      ]),
      phase("prepare", "Preparar solicitud", "conditional", [
        task("prepare-request", "Preparar documento de solicitud solo cuando los datos materiales estén completos", "user", "conditional"),
      ]),
      phase("file", "Radicar y conservar evidencia", "conditional", [
        task("file-request", "Radicar por el canal que corresponda y conservar el número/constancia real", "user", "conditional"),
      ]),
      phase("response", "Analizar respuesta real", "conditional", [
        task("review-response", "Analizar la respuesta cuando exista; no anticipar aceptación o rechazo", "system", "conditional"),
      ]),
    ],
    evidenceChecklist: dedupeEvidence([
      ...routeEvidence(route),
      evidence("Soportes del ingreso familiar"),
      evidence("Soportes del cambio de capacidad de pago", "recommended"),
      evidence("Constancia de radicación", "conditional"),
      evidence("Respuesta del banco", "conditional"),
    ]),
    nextEvent: {
      label: "Respuesta posterior a una radicación real",
      timingKind: "relative_after_trigger",
      timingText: "El seguimiento comienza únicamente después de que exista una radicación comprobable.",
      triggerEstablished: false,
    },
    warnings: ["Generar este plan no convierte la ruta en aprobación ni acredita por sí mismo todas las condiciones objetivas."],
  };
}

function assignmentPlan(route: OpportunityRoute): CasePlan {
  const bindingOffer = route.reasonCodes.includes("binding_transfer_offer_available");

  if (!bindingOffer) {
    return {
      mode: "local_preview",
      routeCode: route.routeCode,
      routeStatus: route.status,
      precision: route.precision,
      title: "Plan para obtener y comparar una oferta vinculante",
      objective: "Comparar alternativas reales antes de activar el paso procedimental del artículo 24.",
      phases: [
        phase("compare", "Obtener alternativas", "ready", [
          task("request-offers", "Solicitar propuestas comparables a potenciales nuevos acreedores", "user"),
          task("compare-offers", "Comparar tasa, plazo, cuota, seguros y costos soportados por cada propuesta", "system"),
        ]),
        phase("binding-offer", "Obtener oferta vinculante", "conditional", [
          task("underwriting", "Completar el proceso de evaluación del potencial nuevo acreedor", "bank_or_third_party", "conditional"),
          task("receive-binding-offer", "Conservar la oferta vinculante real cuando exista", "user", "conditional"),
        ]),
        phase("article24", "Activar artículo 24", "blocked", [
          task("deliver-offer", "Entregar la oferta vinculante al acreedor actual", "user", "blocked"),
        ]),
      ],
      evidenceChecklist: dedupeEvidence([
        ...routeEvidence(route),
        evidence("Propuestas comparables de potenciales acreedores"),
        evidence("Oferta vinculante del nuevo acreedor", "conditional"),
      ]),
      nextEvent: {
        label: "Oferta vinculante disponible",
        timingKind: "evidence_event",
        timingText: "El reloj del artículo 24 no empieza hasta que exista y se entregue una oferta vinculante real.",
        triggerEstablished: false,
      },
      warnings: [
        "El plazo máximo de 10 días hábiles de autorización todavía no está activo.",
        "La evaluación del nuevo acreedor es una decisión de tercero y no está aprobada por generar este plan.",
      ],
    };
  }

  return {
    mode: "local_preview",
    routeCode: route.routeCode,
    routeStatus: route.status,
    precision: route.precision,
    title: "Plan para activar la cesión del artículo 24",
    objective: "Entregar una oferta vinculante real con trazabilidad y controlar el término solo después de la entrega efectiva.",
    phases: [
      phase("validate-offer", "Validar la oferta", "ready", [
        task("review-offer", "Revisar identidad del nuevo acreedor, fecha y términos materiales de la oferta", "user"),
      ]),
      phase("deliver", "Entregar al acreedor actual", "ready", [
        task("deliver-binding-offer", "Radicar/entregar la oferta vinculante por el canal aplicable", "user"),
        task("preserve-delivery", "Conservar prueba real de fecha y entrega", "user"),
      ]),
      phase("clock", "Controlar el término", "conditional", [
        task("start-clock", "Iniciar el control de máximo 10 días hábiles únicamente desde la entrega comprobada", "system", "conditional"),
      ]),
      phase("response", "Revisar resultado", "conditional", [
        task("review-authorization", "Revisar autorización, negativa o demora cuando exista una respuesta real", "system", "conditional"),
        task("escalate-exception", "Escalar a revisión profesional si hay negativa, demora o conflicto material", "professional", "conditional"),
      ]),
    ],
    evidenceChecklist: dedupeEvidence([
      ...routeEvidence(route),
      evidence("Oferta vinculante del nuevo acreedor", "known_required"),
      evidence("Prueba de entrega/radicación al acreedor actual", "known_required"),
      evidence("Respuesta o autorización del acreedor actual", "conditional"),
    ]),
    nextEvent: {
      label: "Término máximo de autorización del artículo 24",
      timingKind: "relative_after_trigger",
      timingText: "Máximo 10 días hábiles después de la entrega comprobada de la oferta vinculante. Sin fecha real de entrega no se calcula una fecha límite.",
      triggerEstablished: false,
    },
    warnings: [
      "El reloj no se considera iniciado por seleccionar esta ruta o generar el plan.",
      "Los 10 días hábiles no corresponden al tiempo de aprobación del nuevo acreedor.",
    ],
  };
}

function claimPlan(route: OpportunityRoute): CasePlan {
  return {
    mode: "local_preview",
    routeCode: route.routeCode,
    routeStatus: route.status,
    precision: route.precision,
    title: "Plan de auditoría y posible reclamación",
    objective: "Aislar una diferencia concreta, construir evidencia y decidir el primer escrito adecuado antes de escalar.",
    phases: [
      phase("isolate", "Aislar la diferencia", "ready", [
        task("identify-discrepancy", "Describir exactamente qué cobro, dato o aplicación no coincide", "user"),
        task("compare-source", "Comparar la diferencia con contrato, extracto e instrucción disponible", "system"),
      ]),
      phase("evidence", "Construir paquete de evidencia", "ready", [
        task("collect-proof", "Reunir soportes del hecho y comunicaciones existentes", "user"),
      ]),
      phase("choose-request", "Elegir el primer paso", "conditional", [
        task("choose-information-or-claim", "Definir si corresponde solicitud de información/corrección o reclamación jurídica", "professional", "conditional"),
      ]),
      phase("response", "Esperar y analizar evidencia nueva", "conditional", [
        task("review-real-response", "Analizar la respuesta real antes de decidir una escalación", "system", "conditional"),
      ]),
    ],
    evidenceChecklist: dedupeEvidence([
      ...routeEvidence(route),
      evidence("Extracto o movimiento donde aparece la diferencia"),
      evidence("Contrato o condición relevante", "recommended"),
      evidence("Radicados/respuestas anteriores", "conditional"),
    ]),
    nextEvent: {
      label: "Respuesta a la primera actuación elegida",
      timingKind: "evidence_event",
      timingText: "La siguiente decisión depende de la respuesta real; el plan no presume desde ahora una escalación.",
      triggerEstablished: false,
    },
    warnings: ["Una inconsistencia detectada no equivale todavía a un incumplimiento jurídico probado."],
  };
}

function executivePlan(route: OpportunityRoute): CasePlan {
  return {
    mode: "local_preview",
    routeCode: route.routeCode,
    routeStatus: route.status,
    precision: route.precision,
    title: "Plan de preparación para revisión jurídica prioritaria",
    objective: "Organizar evidencia y fechas del proceso para que un profesional determine la estrategia, sin automatizar una defensa.",
    phases: [
      phase("collect", "Reunir documentos del proceso", "ready", [
        task("collect-court-docs", "Reunir demanda, mandamiento de pago, medidas y comunicaciones disponibles", "user"),
        task("record-dates", "Registrar fechas exactamente como aparecen en la evidencia", "user"),
      ]),
      phase("lawyer", "Revisión profesional", "ready", [
        task("lawyer-evaluate", "Revisar urgencia, estado procesal y opciones jurídicas", "professional"),
      ]),
      phase("strategy", "Definir estrategia", "conditional", [
        task("professional-strategy", "Definir cualquier defensa o actuación únicamente después de revisión profesional", "professional", "conditional"),
      ]),
    ],
    evidenceChecklist: dedupeEvidence([
      ...routeEvidence(route),
      evidence("Demanda y/o mandamiento de pago si están disponibles", "known_required"),
      evidence("Providencias o medidas cautelares conocidas", "recommended"),
      evidence("Constancias de notificación y fechas procesales", "recommended"),
    ]),
    nextEvent: {
      label: "Revisión jurídica prioritaria",
      timingKind: "professional_review",
      timingText: "Debe ocurrir antes de que el sistema sugiera cualquier estrategia procesal.",
      triggerEstablished: false,
    },
    warnings: [
      "Este plan no contiene excepciones, recursos ni instrucciones procesales automáticas.",
      "Las fechas críticas deben derivarse de evidencia procesal real, no de supuestos del sistema.",
    ],
  };
}

export function buildCasePlan(route: OpportunityRoute, asOfDate: string): CasePlan {
  switch (route.routeCode) {
    case "R1_PREPAGO_PLAZO":
      return prepaymentPlan(route, "term");
    case "R2_PREPAGO_CUOTA":
      return prepaymentPlan(route, "payment");
    case "R3_RESTRUCTURACION_546_20":
      return article20Plan(route, asOfDate);
    case "R5_CESION_546_24":
      return assignmentPlan(route);
    case "R7_RECLAMACION":
      return claimPlan(route);
    case "R10_EXECUTIVE_DEFENSE":
      return executivePlan(route);
  }
}
