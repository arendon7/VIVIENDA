import {
  evaluateOpportunityRoutes,
  type OpportunityRoute,
  type OpportunityRouterInput,
  type OpportunityRouterResult,
} from "@/domain/opportunity/router";

export type DecisionModelContext = {
  prepaymentTermScenario: "not_modeled" | "modeled_c2";
  prepaymentPaymentScenario: "not_modeled" | "modeled_c2";
};

function routeByCode(result: OpportunityRouterResult, code: OpportunityRoute["routeCode"]): OpportunityRoute | undefined {
  return result.routes.find((route) => route.routeCode === code);
}

export function evaluateIntegratedOpportunityRoutes(
  input: OpportunityRouterInput,
  modelContext: DecisionModelContext,
): OpportunityRouterResult {
  const baseResult = evaluateOpportunityRoutes(input);

  if (input.precision !== "C1") {
    return baseResult;
  }

  const modeledCodes: OpportunityRoute["routeCode"][] = [
    ...(modelContext.prepaymentTermScenario === "modeled_c2" ? ["R1_PREPAGO_PLAZO" as const] : []),
    ...(modelContext.prepaymentPaymentScenario === "modeled_c2" ? ["R2_PREPAGO_CUOTA" as const] : []),
  ];

  if (modeledCodes.length === 0) {
    return baseResult;
  }

  const modeledResult = evaluateOpportunityRoutes({ ...input, precision: "C2" });
  const replacements = new Map<OpportunityRoute["routeCode"], OpportunityRoute>();

  for (const code of modeledCodes) {
    const baseRoute = routeByCode(baseResult, code);
    const modeledRoute = routeByCode(modeledResult, code);
    if (baseRoute && modeledRoute) replacements.set(code, modeledRoute);
  }

  if (replacements.size === 0) {
    return baseResult;
  }

  const routes = baseResult.routes.map((route) => replacements.get(route.routeCode) ?? route);
  const primaryRoute = baseResult.primaryRoute
    ? replacements.get(baseResult.primaryRoute.routeCode) ?? baseResult.primaryRoute
    : null;

  return {
    ...baseResult,
    routes,
    primaryRoute,
  };
}
