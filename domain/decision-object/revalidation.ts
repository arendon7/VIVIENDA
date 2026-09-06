import type {
  OpportunityPrecision,
  OpportunityRouteCode,
  OpportunityRouteStatus,
  OpportunityRouterResult,
} from "@/domain/opportunity/router";
import {
  createDecisionObject,
  type DecisionObject,
  type DecisionOption,
} from "./evaluator";

export type DecisionBasisSnapshot = {
  selectedRouteCode: OpportunityRouteCode;
  governingRouteCode: OpportunityRouteCode;
  governingStatus: OpportunityRouteStatus;
  governingPrecision: OpportunityPrecision;
  governingHumanReviewRequired: boolean;
  governingBlockers: string[];
  governingRequiredEvidence: string[];
  governingNextAction: string;
  governingCaveat: string | null;
};

export type DecisionRevalidationReason =
  | "selected_route_removed"
  | "governing_route_changed"
  | "precision_changed"
  | "status_changed"
  | "professional_review_changed"
  | "blockers_changed"
  | "required_evidence_changed"
  | "next_action_changed"
  | "caveat_changed";

export type DecisionRevalidationResult =
  | {
      status: "current";
      reasons: [];
      previous: DecisionBasisSnapshot;
      current: DecisionBasisSnapshot;
      decision: DecisionObject;
    }
  | {
      status: "review_required";
      reasons: DecisionRevalidationReason[];
      previous: DecisionBasisSnapshot;
      current: DecisionBasisSnapshot;
      decision: DecisionObject;
    }
  | {
      status: "selection_invalid";
      reasons: ["selected_route_removed"];
      previous: DecisionBasisSnapshot;
      current: null;
      decision: null;
    };

function governingOption(decision: DecisionObject): DecisionOption | null {
  if (!decision.governingRouteCode) return null;
  return decision.options.find((option) => option.routeCode === decision.governingRouteCode) ?? null;
}

function canonicalItems(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "es-CO", { sensitivity: "base" }));
}

function sameItems(left: string[], right: string[]): boolean {
  const normalizedLeft = canonicalItems(left);
  const normalizedRight = canonicalItems(right);
  return normalizedLeft.length === normalizedRight.length
    && normalizedLeft.every((item, index) => item === normalizedRight[index]);
}

export function captureDecisionBasis(decision: DecisionObject): DecisionBasisSnapshot {
  if (!decision.selectedRouteCode) {
    throw new Error("decision-basis-requires-selected-route");
  }

  const governing = governingOption(decision);
  if (!governing) {
    throw new Error("decision-basis-requires-governing-route");
  }

  return {
    selectedRouteCode: decision.selectedRouteCode,
    governingRouteCode: governing.routeCode,
    governingStatus: governing.status,
    governingPrecision: governing.precision,
    governingHumanReviewRequired: governing.humanReviewRequired,
    governingBlockers: canonicalItems(governing.blockers),
    governingRequiredEvidence: canonicalItems(governing.requiredEvidence),
    governingNextAction: governing.nextAction.trim(),
    governingCaveat: governing.caveat?.trim() ?? null,
  };
}

export function revalidateDecisionBasis(
  previous: DecisionBasisSnapshot,
  routerResult: OpportunityRouterResult,
): DecisionRevalidationResult {
  const selectedStillExists = routerResult.routes.some(
    (route) => route.routeCode === previous.selectedRouteCode,
  );

  if (!selectedStillExists) {
    return {
      status: "selection_invalid",
      reasons: ["selected_route_removed"],
      previous,
      current: null,
      decision: null,
    };
  }

  const decision = createDecisionObject({
    routerResult,
    selectedRouteCode: previous.selectedRouteCode,
  });
  const current = captureDecisionBasis(decision);
  const reasons: DecisionRevalidationReason[] = [];

  if (current.governingRouteCode !== previous.governingRouteCode) {
    reasons.push("governing_route_changed");
  }
  if (current.governingPrecision !== previous.governingPrecision) {
    reasons.push("precision_changed");
  }
  if (current.governingStatus !== previous.governingStatus) {
    reasons.push("status_changed");
  }
  if (current.governingHumanReviewRequired !== previous.governingHumanReviewRequired) {
    reasons.push("professional_review_changed");
  }
  if (!sameItems(current.governingBlockers, previous.governingBlockers)) {
    reasons.push("blockers_changed");
  }
  if (!sameItems(current.governingRequiredEvidence, previous.governingRequiredEvidence)) {
    reasons.push("required_evidence_changed");
  }
  if (current.governingNextAction !== previous.governingNextAction) {
    reasons.push("next_action_changed");
  }
  if (current.governingCaveat !== previous.governingCaveat) {
    reasons.push("caveat_changed");
  }

  if (reasons.length === 0) {
    return {
      status: "current",
      reasons: [],
      previous,
      current,
      decision,
    };
  }

  return {
    status: "review_required",
    reasons,
    previous,
    current,
    decision,
  };
}
