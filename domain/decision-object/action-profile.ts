import { buildCasePlan, type CasePlan } from "@/domain/case-plan/planner";
import type {
  OpportunityRoute,
  OpportunityRouteCode,
  OpportunityRouterResult,
} from "@/domain/opportunity/router";

export type DecisionEffectKind =
  | "shorten_term"
  | "lower_payment"
  | "restructure_payment_capacity"
  | "transfer_creditor"
  | "clarify_or_correct_inconsistency"
  | "protect_legal_position";

export type DecisionSelfServiceAvailability =
  | "available"
  | "preparation_only"
  | "not_appropriate";

export type DecisionAssistedAvailability =
  | "mortgage_audit_preview"
  | "not_productized";

export type DecisionProfessionalReview = "required" | "not_required";

export type DecisionServicePricingState =
  | "not_applicable"
  | "not_quoted_preview"
  | "not_available_in_preview";

export type DecisionUserCapitalRequirement =
  | "required_for_execution"
  | "not_required_by_route";

export type DecisionActionEffort = {
  userTaskCount: number;
  professionalTaskCount: number;
  thirdPartyTaskCount: number;
  conditionalTaskCount: number;
  evidenceItemCount: number;
  externalTriggerCount: number;
};

export type DecisionActionCost = {
  userCapitalRequirement: DecisionUserCapitalRequirement;
  assistedServicePricing: DecisionServicePricingState;
  externalCosts: "not_modeled";
};

export type DecisionActionAvailability = {
  selfService: DecisionSelfServiceAvailability;
  assisted: DecisionAssistedAvailability;
  professionalReview: DecisionProfessionalReview;
};

export type DecisionActionProfile = {
  routeCode: OpportunityRouteCode;
  effectKind: DecisionEffectKind;
  effectLabel: string;
  precision: OpportunityRoute["precision"];
  effort: DecisionActionEffort;
  cost: DecisionActionCost;
  availability: DecisionActionAvailability;
  disclosures: string[];
};

const effectByRoute: Record<OpportunityRouteCode, { kind: DecisionEffectKind; label: string }> = {
  R1_PREPAGO_PLAZO: {
    kind: "shorten_term",
    label: "Buscar una reducción del plazo restante mediante capital adicional.",
  },
  R2_PREPAGO_CUOTA: {
    kind: "lower_payment",
    label: "Buscar una reducción de la cuota mediante capital adicional.",
  },
  R3_RESTRUCTURACION_546_20: {
    kind: "restructure_payment_capacity",
    label: "Preparar una estructura de pago más sostenible cuando la ruta y la evidencia lo permitan.",
  },
  R5_CESION_546_24: {
    kind: "transfer_creditor",
    label: "Preparar o activar una cesión hacia otro acreedor cuando exista la base necesaria.",
  },
  R7_RECLAMACION: {
    kind: "clarify_or_correct_inconsistency",
    label: "Aclarar, documentar o corregir una diferencia concreta antes de decidir una reclamación posterior.",
  },
  R10_EXECUTIVE_DEFENSE: {
    kind: "protect_legal_position",
    label: "Priorizar la revisión jurídica del proceso antes de continuar con optimizaciones ordinarias.",
  },
};

function countPlanEffort(plan: CasePlan): DecisionActionEffort {
  const tasks = plan.phases.flatMap((phase) => phase.tasks);

  return {
    userTaskCount: tasks.filter((item) => item.actor === "user").length,
    professionalTaskCount: tasks.filter((item) => item.actor === "professional").length,
    thirdPartyTaskCount: tasks.filter((item) => item.actor === "bank_or_third_party").length,
    conditionalTaskCount: tasks.filter((item) => item.state === "conditional").length,
    evidenceItemCount: plan.evidenceChecklist.length,
    externalTriggerCount: plan.nextEvent && !plan.nextEvent.triggerEstablished ? 1 : 0,
  };
}

function selfServiceAvailability(route: OpportunityRoute): DecisionSelfServiceAvailability {
  if (route.status === "legal_review" || route.routeCode === "R10_EXECUTIVE_DEFENSE") {
    return "not_appropriate";
  }

  if (route.routeCode === "R1_PREPAGO_PLAZO" || route.routeCode === "R2_PREPAGO_CUOTA") {
    return "available";
  }

  return "preparation_only";
}

function assistedAvailability(route: OpportunityRoute): DecisionAssistedAvailability {
  return route.routeCode === "R7_RECLAMACION"
    ? "mortgage_audit_preview"
    : "not_productized";
}

function servicePricing(route: OpportunityRoute): DecisionServicePricingState {
  if (route.routeCode === "R7_RECLAMACION") return "not_quoted_preview";
  if (route.routeCode === "R1_PREPAGO_PLAZO" || route.routeCode === "R2_PREPAGO_CUOTA") {
    return "not_applicable";
  }
  return "not_available_in_preview";
}

function userCapitalRequirement(route: OpportunityRoute): DecisionUserCapitalRequirement {
  return route.routeCode === "R1_PREPAGO_PLAZO" || route.routeCode === "R2_PREPAGO_CUOTA"
    ? "required_for_execution"
    : "not_required_by_route";
}

function disclosures(route: OpportunityRoute): string[] {
  const items = [
    "El efecto descrito es el objetivo de la ruta, no un resultado garantizado.",
    "Los costos de bancos, terceros, impuestos, trámites o profesionales no se estiman si no existe una fuente concreta que los soporte.",
  ];

  if (route.routeCode === "R1_PREPAGO_PLAZO" || route.routeCode === "R2_PREPAGO_CUOTA") {
    items.push("El capital adicional lo aporta el usuario; no es una tarifa ni ahorro creado por Casa con Criterio.");
  }

  if (route.routeCode === "R7_RECLAMACION") {
    items.push("La Auditoría Hipotecaria asistida existe como blueprint de preview; su precio final, SLA, pago y contratación productiva no están activos.");
  }

  if (route.routeCode === "R10_EXECUTIVE_DEFENSE") {
    items.push("La necesidad de revisión profesional no significa que exista aquí un servicio jurídico contratado o una representación activa.");
  }

  return items;
}

export function buildDecisionActionProfile(
  route: OpportunityRoute,
  asOfDate: string,
): DecisionActionProfile {
  const plan = buildCasePlan(route, asOfDate);
  const effect = effectByRoute[route.routeCode];

  return {
    routeCode: route.routeCode,
    effectKind: effect.kind,
    effectLabel: effect.label,
    precision: route.precision,
    effort: countPlanEffort(plan),
    cost: {
      userCapitalRequirement: userCapitalRequirement(route),
      assistedServicePricing: servicePricing(route),
      externalCosts: "not_modeled",
    },
    availability: {
      selfService: selfServiceAvailability(route),
      assisted: assistedAvailability(route),
      professionalReview: route.humanReviewRequired ? "required" : "not_required",
    },
    disclosures: disclosures(route),
  };
}

export function buildDecisionActionProfiles(
  routerResult: OpportunityRouterResult,
): DecisionActionProfile[] {
  return routerResult.routes.map((route) => buildDecisionActionProfile(route, routerResult.asOfDate));
}
