import {
  buildDecisionActionProfiles,
  type DecisionActionProfile,
} from "@/domain/decision-object/action-profile";
import type {
  OpportunityPrecision,
  OpportunityRoute,
  OpportunityRouteCode,
  OpportunityRouteStatus,
  OpportunityRouterResult,
} from "@/domain/opportunity/router";

export type DecisionObjectMode = "local_preview";
export type DecisionKind = "mortgage_route_selection";
export type DecisionState =
  | "insufficient_options"
  | "ready_for_choice"
  | "selection_recorded_local"
  | "professional_review_required";

export type DecisionOption = {
  routeCode: OpportunityRouteCode;
  title: string;
  status: OpportunityRouteStatus;
  precision: OpportunityPrecision;
  humanReviewRequired: boolean;
  blockers: string[];
  requiredEvidence: string[];
  nextAction: string;
  caveat?: string;
};

export type DecisionTruthBoundary = {
  precisionIsNotApproval: true;
  thirdPartyDecisionOccurred: false;
  executionOccurred: false;
  guaranteedOutcome: false;
};

export type DecisionObject = {
  mode: DecisionObjectMode;
  kind: DecisionKind;
  asOfDate: string;
  state: DecisionState;
  options: DecisionOption[];
  actionProfiles: DecisionActionProfile[];
  primaryRouteCode: OpportunityRouteCode | null;
  selectedRouteCode: OpportunityRouteCode | null;
  governingRouteCode: OpportunityRouteCode | null;
  decisionPrecision: OpportunityPrecision | null;
  requiresProfessionalReview: boolean;
  warnings: string[];
  truthBoundary: DecisionTruthBoundary;
};

export type DecisionObjectInput = {
  routerResult: OpportunityRouterResult;
  selectedRouteCode?: OpportunityRouteCode;
};

export type DecisionBrief = {
  mode: DecisionObjectMode;
  title: string;
  statusLabel: string;
  summary: string;
  optionSummaries: string[];
  verificationNeeds: string[];
  nextAction: string | null;
  disclosures: string[];
};

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const normalized = item.trim().toLocaleLowerCase("es-CO");
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function optionFromRoute(route: OpportunityRoute): DecisionOption {
  return {
    routeCode: route.routeCode,
    title: route.title,
    status: route.status,
    precision: route.precision,
    humanReviewRequired: route.humanReviewRequired,
    blockers: [...route.blockers],
    requiredEvidence: [...route.requiredEvidence],
    nextAction: route.nextAction,
    ...(route.caveat ? { caveat: route.caveat } : {}),
  };
}

function findRoute(result: OpportunityRouterResult, code: OpportunityRouteCode | undefined): OpportunityRoute | null {
  if (!code) return null;
  return result.routes.find((route) => route.routeCode === code) ?? null;
}

function executiveDefense(result: OpportunityRouterResult): OpportunityRoute | null {
  return result.routes.find(
    (route) => route.routeCode === "R10_EXECUTIVE_DEFENSE" && route.status === "legal_review",
  ) ?? null;
}

function stateFor(
  result: OpportunityRouterResult,
  selected: OpportunityRoute | null,
  governing: OpportunityRoute | null,
): DecisionState {
  if (result.routes.length === 0) return "insufficient_options";

  if (
    governing?.routeCode === "R10_EXECUTIVE_DEFENSE" ||
    governing?.status === "legal_review" ||
    governing?.humanReviewRequired === true
  ) {
    return "professional_review_required";
  }

  return selected ? "selection_recorded_local" : "ready_for_choice";
}

export function createDecisionObject(input: DecisionObjectInput): DecisionObject {
  const { routerResult } = input;
  const selected = findRoute(routerResult, input.selectedRouteCode);

  if (input.selectedRouteCode && !selected) {
    throw new Error("decision-selection-not-in-current-router-result");
  }

  const defense = executiveDefense(routerResult);
  const primary = routerResult.primaryRoute
    ? findRoute(routerResult, routerResult.primaryRoute.routeCode)
    : null;
  const governing = defense ?? selected ?? primary;
  const state = stateFor(routerResult, selected, governing);

  const routeWarnings = governing
    ? [
        ...governing.blockers,
        ...(governing.caveat ? [governing.caveat] : []),
      ]
    : [];

  const warnings = dedupe([
    ...routerResult.notices,
    ...routeWarnings,
    ...(defense && selected && selected.routeCode !== defense.routeCode
      ? ["La preferencia seleccionada no desplaza la revisión jurídica prioritaria del proceso reportado."]
      : []),
  ]);

  return {
    mode: "local_preview",
    kind: "mortgage_route_selection",
    asOfDate: routerResult.asOfDate,
    state,
    options: routerResult.routes.map(optionFromRoute),
    actionProfiles: buildDecisionActionProfiles(routerResult),
    primaryRouteCode: primary?.routeCode ?? null,
    selectedRouteCode: selected?.routeCode ?? null,
    governingRouteCode: governing?.routeCode ?? null,
    decisionPrecision: governing?.precision ?? null,
    requiresProfessionalReview: state === "professional_review_required",
    warnings,
    truthBoundary: {
      precisionIsNotApproval: true,
      thirdPartyDecisionOccurred: false,
      executionOccurred: false,
      guaranteedOutcome: false,
    },
  };
}

function statusLabel(state: DecisionState): string {
  switch (state) {
    case "insufficient_options":
      return "Falta información para estructurar opciones";
    case "ready_for_choice":
      return "Opciones listas para revisar";
    case "selection_recorded_local":
      return "Preferencia registrada en esta vista previa";
    case "professional_review_required":
      return "Revisión profesional prioritaria";
  }
}

function routeForDecision(decision: DecisionObject): DecisionOption | null {
  if (!decision.governingRouteCode) return null;
  return decision.options.find((option) => option.routeCode === decision.governingRouteCode) ?? null;
}

export function createDecisionBrief(decision: DecisionObject): DecisionBrief {
  const governing = routeForDecision(decision);
  const verificationNeeds = governing
    ? dedupe([...governing.blockers, ...governing.requiredEvidence])
    : [];

  let summary = "Todavía no existe una ruta suficientemente estructurada para preparar una decisión.";
  if (decision.state === "professional_review_required" && governing) {
    summary = `La ruta que gobierna el siguiente paso es “${governing.title}”. Antes de ejecutar una optimización ordinaria, el caso requiere la revisión indicada por esta ruta.`;
  } else if (decision.state === "selection_recorded_local" && governing) {
    summary = `Has marcado “${governing.title}” como tu preferencia en esta vista previa. La selección organiza el siguiente paso; no ejecuta una instrucción ni crea una decisión de un tercero.`;
  } else if (decision.state === "ready_for_choice" && governing) {
    summary = `La ruta prioritaria actual es “${governing.title}”, pero la comparación sigue abierta para que el usuario decida qué objetivo perseguir.`;
  }

  return {
    mode: "local_preview",
    title: "Mi Decisión",
    statusLabel: statusLabel(decision.state),
    summary,
    optionSummaries: decision.options.map(
      (option) => `${option.title} · ${option.precision} · ${option.status}`,
    ),
    verificationNeeds,
    nextAction: governing?.nextAction ?? null,
    disclosures: [
      "La precisión C0–C3 describe la evidencia o modelación disponible para cada ruta; no una aprobación bancaria ni una decisión de un tercero.",
      "Esta vista previa no realiza pagos, no imparte instrucciones al banco y no crea representación profesional.",
      "Una simulación C2 puede apoyar una decisión, pero no constituye ahorro garantizado ni verificación contractual.",
    ],
  };
}