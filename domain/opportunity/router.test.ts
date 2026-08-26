import { describe, expect, it } from "vitest";
import { evaluateOpportunityRoutes, type OpportunityRouterInput } from "./router";

const base: OpportunityRouterInput = {
  asOfDate: "2026-08-25",
  precision: "C1",
  productType: "mortgage_housing",
  modality: "pesos",
  paymentState: "current",
};

function route(input: OpportunityRouterInput, code: string) {
  return evaluateOpportunityRoutes(input).routes.find((item) => item.routeCode === code);
}

describe("opportunity router v0.3", () => {
  it("keeps Article 20 in seasonal wait outside January-February", () => {
    const result = route(
      { ...base, materialEconomicChange: true },
      "R3_RESTRUCTURACION_546_20",
    );

    expect(result?.status).toBe("seasonal_wait");
    expect(result?.reasonCodes).toContain("article20_window_closed");
  });

  it("opens Article 20 readiness in January when material facts support the proposal", () => {
    const result = route(
      {
        ...base,
        asOfDate: "2027-01-15",
        materialEconomicChange: true,
        currentAccreditedFamilyIncome: 5_000_000,
        proposedRestructuredFirstInstallment: 1_900_000,
      },
      "R3_RESTRUCTURACION_546_20",
    );

    expect(result?.status).toBe("eligible_now");
    expect(result?.reasonCodes).toContain("article20_window_open");
  });

  it("uses 40 percent only to validate the proposed first post-restructure installment", () => {
    const result = route(
      {
        ...base,
        asOfDate: "2027-02-10",
        materialEconomicChange: true,
        currentAccreditedFamilyIncome: 5_000_000,
        proposedRestructuredFirstInstallment: 2_100_000,
      },
      "R3_RESTRUCTURACION_546_20",
    );

    expect(result?.status).toBe("candidate");
    expect(result?.reasonCodes).toContain("proposed_first_installment_above_40_percent");
    expect(result?.blockers.join(" ")).toMatch(/primera cuota propuesta supera el 40%/i);
    expect(result?.caveat).toMatch(/no convierte una cuota vigente/i);
  });

  it("never invents a current-installment 40 percent violation trigger", () => {
    const result = evaluateOpportunityRoutes({
      ...base,
      materialEconomicChange: false,
      currentAccreditedFamilyIncome: 2_000_000,
    });

    const art20 = result.routes.find((item) => item.routeCode === "R3_RESTRUCTURACION_546_20");
    expect(art20?.reasonCodes).not.toContain("current_installment_above_40_percent");
    expect(art20?.status).toBe("seasonal_wait");
  });

  it("surfaces both statutory prepayment choices when extra principal is positive", () => {
    const result = evaluateOpportunityRoutes({
      ...base,
      extraPaymentCapacity: 300_000,
    });

    expect(result.routes.some((item) => item.routeCode === "R1_PREPAGO_PLAZO")).toBe(true);
    expect(result.routes.some((item) => item.routeCode === "R2_PREPAGO_CUOTA")).toBe(true);
  });

  it("prioritizes term reduction when the user's stated goal is to finish sooner", () => {
    const result = evaluateOpportunityRoutes({
      ...base,
      extraPaymentCapacity: 300_000,
      wantsFinishSooner: true,
    });

    const term = result.routes.find((item) => item.routeCode === "R1_PREPAGO_PLAZO");
    const payment = result.routes.find((item) => item.routeCode === "R2_PREPAGO_CUOTA");
    expect(term?.priority).toBeGreaterThan(payment?.priority ?? 0);
  });

  it("prioritizes payment reduction when the user's stated goal is lower payment", () => {
    const result = evaluateOpportunityRoutes({
      ...base,
      extraPaymentCapacity: 300_000,
      wantsLowerPayment: true,
    });

    const term = result.routes.find((item) => item.routeCode === "R1_PREPAGO_PLAZO");
    const payment = result.routes.find((item) => item.routeCode === "R2_PREPAGO_CUOTA");
    expect(payment?.priority).toBeGreaterThan(term?.priority ?? 0);
  });

  it("activates the Article 24 procedural step only when a binding offer exists", () => {
    const candidate = route(base, "R5_CESION_546_24");
    const ready = route(
      { ...base, hasBindingTransferOffer: true },
      "R5_CESION_546_24",
    );

    expect(candidate?.status).toBe("candidate");
    expect(candidate?.blockers.join(" ")).toMatch(/oferta vinculante/i);
    expect(ready?.status).toBe("eligible_now");
    expect(ready?.legalBasis.join(" ")).toMatch(/10 días hábiles/i);
    expect(ready?.nextAction).toMatch(/máximo de 10 días hábiles/i);
  });

  it("makes executive or embargo state the primary route and requires human review", () => {
    const result = evaluateOpportunityRoutes({
      ...base,
      paymentState: "embargo_or_auction",
      extraPaymentCapacity: 500_000,
      hasBindingTransferOffer: true,
    });

    expect(result.primaryRoute?.routeCode).toBe("R10_EXECUTIVE_DEFENSE");
    expect(result.primaryRoute?.status).toBe("legal_review");
    expect(result.primaryRoute?.humanReviewRequired).toBe(true);
  });

  it("puts a concrete audit/claim issue above ordinary optimization", () => {
    const result = evaluateOpportunityRoutes({
      ...base,
      extraPaymentCapacity: 500_000,
      unexplainedChargeOrAllocationIssue: true,
    });

    expect(result.primaryRoute?.routeCode).toBe("R7_RECLAMACION");
    expect(result.primaryRoute?.humanReviewRequired).toBe(true);
  });

  it("does not silently apply special mortgage rights to other secured credit", () => {
    const result = evaluateOpportunityRoutes({
      ...base,
      productType: "other_secured_credit",
      extraPaymentCapacity: 500_000,
      hasBindingTransferOffer: true,
    });

    expect(result.routes.some((item) => item.routeCode === "R1_PREPAGO_PLAZO")).toBe(false);
    expect(result.routes.some((item) => item.routeCode === "R5_CESION_546_24")).toBe(false);
    const art20 = result.routes.find((item) => item.routeCode === "R3_RESTRUCTURACION_546_20");
    expect(art20?.status).toBe("legal_review");
    expect(art20?.humanReviewRequired).toBe(true);
    expect(result.notices.join(" ")).toMatch(/hipoteca como garantía no demuestra/i);
  });

  it("treats an unknown product as a classification task, not automatic legal escalation", () => {
    const result = evaluateOpportunityRoutes({
      ...base,
      productType: "unknown",
    });

    const art20 = result.routes.find((item) => item.routeCode === "R3_RESTRUCTURACION_546_20");
    expect(art20?.status).toBe("candidate");
    expect(art20?.humanReviewRequired).toBe(false);
    expect(art20?.title).toMatch(/clasificar el producto/i);
    expect(result.notices.join(" ")).toMatch(/no obliga a escalar/i);
  });

  it("allows C1 routing but blocks exact monetary claims in prepayment routes", () => {
    const result = route(
      { ...base, extraPaymentCapacity: 250_000, wantsFinishSooner: true },
      "R1_PREPAGO_PLAZO",
    );

    expect(result?.status).toBe("eligible_now");
    expect(result?.blockers.join(" ")).toMatch(/beneficio monetario exacto requiere un modelo C2\/C3/i);
    expect(result?.precision).toBe("C1");
  });

  it("keeps bank-specific requirements out of canonical output", () => {
    const serialized = JSON.stringify(evaluateOpportunityRoutes(base)).toLowerCase();
    expect(serialized).not.toContain("bancolombia");
    expect(serialized).not.toContain("davivienda");
    expect(serialized).not.toContain("bbva");
    expect(serialized).not.toContain("caja social");
    expect(serialized).not.toContain("fna");
  });
});