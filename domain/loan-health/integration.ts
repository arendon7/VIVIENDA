import {
  evaluateOpportunityRoutes,
  type OpportunityRoute,
  type OpportunityRouterInput,
  type OpportunityRouterResult,
} from "@/domain/opportunity/router";

export type DecisionModelContext = {
  prepaymentTermScenario: "not_modeled" | "modeled_c2";
};

function routeByCode(result: OpportunityRouterResult, code: OpportunityRoute["routeCode"]): OpportunityRoute | undefined {
  return result.routes.find((route) => route.routeCode === code);
}

export function evaluateIntegratedOpportunityRoutes(
  input: OpportunityRouterInput,
  modelContext: DecisionModelContext,
): OpportunityRouterResult {
  const baseResult = evaluateOpportunityRoutes(input);

  if (modelContext.prepaymentTermScenario !== "modeled_c2" || input.precision !== "C1") {
    return baseResult;
  }

  const baseTermRoute = routeByCode(baseResult, "R1_PREPAGO_PLAZO");
  if (!baseTermRoute) return baseResult;

  const modeledResult = evaluateOpportunityRoutes({ ...input, precision: "C2" });
  const modeledTermRoute = routeByCode(modeledResult, "R1_PREPAGO_PLAZO");
  if (!modeledTermRoute) return baseResult;

  const routes = baseResult.routes.map((route) =>
    route.routeCode === "R1_PREPAGO_PLAZO" ? modeledTermRoute : route,
  );

  const primaryRoute = baseResult.primaryRoute?.routeCode === "R1_PREPAGO_PLAZO"
    ? modeledTermRoute
    : baseResult.primaryRoute;

  return {
    ...baseResult,
    routes,
    primaryRoute,
  };
}
