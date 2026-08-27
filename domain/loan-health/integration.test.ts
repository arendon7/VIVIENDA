import { describe, expect, it } from "vitest";
import type { OpportunityRouterInput } from "@/domain/opportunity/router";
import { evaluateIntegratedOpportunityRoutes } from "./integration";

const base: OpportunityRouterInput = {
  asOfDate: "2026-08-27",
  precision: "C1",
  productType: "mortgage_housing",
  modality: "pesos",
  paymentState: "current",
  extraPaymentCapacity: 500_000,
  wantsFinishSooner: true,
};

const noModels = {
  prepaymentTermScenario: "not_modeled" as const,
  prepaymentPaymentScenario: "not_modeled" as const,
};

function route(result: ReturnType<typeof evaluateIntegratedOpportunityRoutes>, code: string) {
  return result.routes.find((item) => item.routeCode === code);
}

describe("Loan Health route-model integration v0.22", () => {
  it("returns the ordinary C1 router result when no model was constructed", () => {
    const result = evaluateIntegratedOpportunityRoutes(base, noModels);

    expect(route(result, "R1_PREPAGO_PLAZO")?.precision).toBe("C1");
    expect(route(result, "R1_PREPAGO_PLAZO")?.blockers.join(" ")).toMatch(/modelo C2\/C3/i);
    expect(route(result, "R2_PREPAGO_CUOTA")?.precision).toBe("C1");
  });

  it("promotes only R1 when only the matching term-prepayment model was constructed", () => {
    const result = evaluateIntegratedOpportunityRoutes(base, {
      prepaymentTermScenario: "modeled_c2",
      prepaymentPaymentScenario: "not_modeled",
    });

    expect(route(result, "R1_PREPAGO_PLAZO")?.precision).toBe("C2");
    expect(route(result, "R1_PREPAGO_PLAZO")?.blockers).toEqual([]);
    expect(route(result, "R2_PREPAGO_CUOTA")?.precision).toBe("C1");
    expect(route(result, "R2_PREPAGO_CUOTA")?.blockers.length).toBeGreaterThan(0);
    expect(route(result, "R3_RESTRUCTURACION_546_20")?.precision).toBe("C1");
    expect(route(result, "R5_CESION_546_24")?.precision).toBe("C1");
  });

  it("promotes only R2 when only the lower-payment model was constructed", () => {
    const result = evaluateIntegratedOpportunityRoutes(
      { ...base, wantsFinishSooner: false, wantsLowerPayment: true },
      {
        prepaymentTermScenario: "not_modeled",
        prepaymentPaymentScenario: "modeled_c2",
      },
    );

    expect(route(result, "R1_PREPAGO_PLAZO")?.precision).toBe("C1");
    expect(route(result, "R2_PREPAGO_CUOTA")?.precision).toBe("C2");
    expect(route(result, "R2_PREPAGO_CUOTA")?.blockers).toEqual([]);
    expect(route(result, "R3_RESTRUCTURACION_546_20")?.precision).toBe("C1");
    expect(route(result, "R5_CESION_546_24")?.precision).toBe("C1");
  });

  it("promotes R1 and R2 together when the same choice comparison modeled both", () => {
    const result = evaluateIntegratedOpportunityRoutes(base, {
      prepaymentTermScenario: "modeled_c2",
      prepaymentPaymentScenario: "modeled_c2",
    });

    expect(route(result, "R1_PREPAGO_PLAZO")?.precision).toBe("C2");
    expect(route(result, "R2_PREPAGO_CUOTA")?.precision).toBe("C2");
    expect(route(result, "R1_PREPAGO_PLAZO")?.blockers).toEqual([]);
    expect(route(result, "R2_PREPAGO_CUOTA")?.blockers).toEqual([]);
    expect(route(result, "R3_RESTRUCTURACION_546_20")?.precision).toBe("C1");
    expect(route(result, "R5_CESION_546_24")?.precision).toBe("C1");
  });

  it("preserves route order and priorities while replacing local precision", () => {
    const declared = evaluateIntegratedOpportunityRoutes(base, noModels);
    const modeled = evaluateIntegratedOpportunityRoutes(base, {
      prepaymentTermScenario: "modeled_c2",
      prepaymentPaymentScenario: "modeled_c2",
    });

    expect(modeled.routes.map((item) => item.routeCode)).toEqual(declared.routes.map((item) => item.routeCode));
    expect(modeled.routes.map((item) => item.priority)).toEqual(declared.routes.map((item) => item.priority));
  });

  it("points primaryRoute to the integrated C2 object when that route is primary", () => {
    const termResult = evaluateIntegratedOpportunityRoutes(base, {
      prepaymentTermScenario: "modeled_c2",
      prepaymentPaymentScenario: "not_modeled",
    });

    expect(termResult.primaryRoute?.routeCode).toBe("R1_PREPAGO_PLAZO");
    expect(termResult.primaryRoute?.precision).toBe("C2");
    expect(termResult.primaryRoute).toBe(route(termResult, "R1_PREPAGO_PLAZO"));

    const paymentResult = evaluateIntegratedOpportunityRoutes(
      { ...base, wantsFinishSooner: false, wantsLowerPayment: true },
      {
        prepaymentTermScenario: "not_modeled",
        prepaymentPaymentScenario: "modeled_c2",
      },
    );

    expect(paymentResult.primaryRoute?.routeCode).toBe("R2_PREPAGO_CUOTA");
    expect(paymentResult.primaryRoute?.precision).toBe("C2");
    expect(paymentResult.primaryRoute).toBe(route(paymentResult, "R2_PREPAGO_CUOTA"));
  });

  it("fails closed for C0 even if modeled context is incorrectly supplied", () => {
    const result = evaluateIntegratedOpportunityRoutes(
      { ...base, precision: "C0" },
      {
        prepaymentTermScenario: "modeled_c2",
        prepaymentPaymentScenario: "modeled_c2",
      },
    );

    expect(route(result, "R1_PREPAGO_PLAZO")?.precision).toBe("C0");
    expect(route(result, "R2_PREPAGO_CUOTA")?.precision).toBe("C0");
  });

  it("does not downgrade globally modeled or verified router inputs", () => {
    const c2 = evaluateIntegratedOpportunityRoutes(
      { ...base, precision: "C2" },
      {
        prepaymentTermScenario: "modeled_c2",
        prepaymentPaymentScenario: "modeled_c2",
      },
    );
    const c3 = evaluateIntegratedOpportunityRoutes(
      { ...base, precision: "C3" },
      {
        prepaymentTermScenario: "modeled_c2",
        prepaymentPaymentScenario: "modeled_c2",
      },
    );

    expect(route(c2, "R1_PREPAGO_PLAZO")?.precision).toBe("C2");
    expect(route(c2, "R2_PREPAGO_CUOTA")?.precision).toBe("C2");
    expect(route(c3, "R1_PREPAGO_PLAZO")?.precision).toBe("C3");
    expect(route(c3, "R2_PREPAGO_CUOTA")?.precision).toBe("C3");
  });

  it("cannot manufacture modeled routes when the product does not expose them", () => {
    const result = evaluateIntegratedOpportunityRoutes(
      { ...base, productType: "housing_leasing" },
      {
        prepaymentTermScenario: "modeled_c2",
        prepaymentPaymentScenario: "modeled_c2",
      },
    );

    expect(route(result, "R1_PREPAGO_PLAZO")).toBeUndefined();
    expect(route(result, "R2_PREPAGO_CUOTA")).toBeUndefined();
  });

  it("does not promote unrelated attention or professional-review routes", () => {
    const result = evaluateIntegratedOpportunityRoutes(
      {
        ...base,
        unexplainedChargeOrAllocationIssue: true,
        paymentState: "executive",
      },
      {
        prepaymentTermScenario: "modeled_c2",
        prepaymentPaymentScenario: "modeled_c2",
      },
    );

    expect(route(result, "R7_RECLAMACION")?.precision).toBe("C1");
    expect(route(result, "R10_EXECUTIVE_DEFENSE")?.precision).toBe("C1");
    expect(result.primaryRoute?.routeCode).toBe("R10_EXECUTIVE_DEFENSE");
  });
});
