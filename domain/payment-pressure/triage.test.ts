import { describe, expect, it } from "vitest";
import { evaluatePaymentPressure, type PaymentPressureInput } from "./triage";

const base: PaymentPressureInput = {
  asOfDate: "2026-08-26",
  productType: "mortgage_housing",
  paymentState: "current",
  materialEconomicChange: "no",
  nextPaymentOutlook: "can_pay",
};

function evaluate(overrides: Partial<PaymentPressureInput> = {}) {
  return evaluatePaymentPressure({ ...base, ...overrides });
}

describe("Payment Pressure triage v0.14", () => {
  it("keeps current but at-risk borrower in preventive state without legal escalation", () => {
    const result = evaluate({ nextPaymentOutlook: "at_risk", materialEconomicChange: "yes" });

    expect(result.urgency).toBe("preventive");
    expect(result.primaryAction.code).toBe("contact_lender");
    expect(result.professionalReviewRecommended).toBe(false);
    expect(result.legalStrategyAutomated).toBe(false);
    expect(result.title.toLowerCase()).not.toContain("demanda");
  });

  it("classifies early arrears as prompt action, not procedural urgency", () => {
    const result = evaluate({ paymentState: "early_arrears", nextPaymentOutlook: "cannot_pay" });

    expect(result.urgency).toBe("prompt_action");
    expect(result.primaryAction.code).toBe("contact_lender");
    expect(result.professionalReviewRecommended).toBe(false);
  });

  it("keeps collections extrajudicial unless a judicial state is separately reported", () => {
    const result = evaluate({ paymentState: "collections", nextPaymentOutlook: "cannot_pay" });

    expect(result.urgency).toBe("prompt_action");
    expect(result.opportunityRoutes.some((route) => route.routeCode === "R10_EXECUTIVE_DEFENSE")).toBe(false);
    expect(result.explanation).toContain("no demuestra por sí sola");
    expect(result.notices.some((notice) => notice.includes("no se trata como proceso judicial"))).toBe(true);
  });

  it("keeps prelegal collection out of procedural urgency", () => {
    const result = evaluate({ paymentState: "prelegal" });

    expect(result.urgency).toBe("prompt_action");
    expect(result.explanation).toContain("extraprocesal");
    expect(result.professionalReviewRecommended).toBe(false);
  });

  it("makes reported executive process procedurally urgent and routes to R10", () => {
    const result = evaluate({ paymentState: "executive" });

    expect(result.urgency).toBe("procedural_urgency");
    expect(result.primaryAction.code).toBe("professional_review");
    expect(result.professionalReviewRecommended).toBe(true);
    expect(result.opportunityRoutes[0]?.routeCode).toBe("R10_EXECUTIVE_DEFENSE");
    expect(result.evidenceChecklist.some((item) => item.code === "court-document" && item.importance === "required_for_next_step")).toBe(true);
    expect(result.notices.some((notice) => notice.includes("No calculamos términos procesales"))).toBe(true);
  });

  it("treats embargo or auction report as procedural urgency", () => {
    const result = evaluate({ paymentState: "embargo_or_auction" });

    expect(result.urgency).toBe("procedural_urgency");
    expect(result.opportunityRoutes[0]?.routeCode).toBe("R10_EXECUTIVE_DEFENSE");
    expect(result.title.toLowerCase()).toContain("judicial");
  });

  it("asks for classification when payment state is unknown", () => {
    const result = evaluate({ paymentState: "unknown", nextPaymentOutlook: "unknown" });

    expect(result.urgency).toBe("needs_information");
    expect(result.primaryAction.code).toBe("classify_state");
    expect(result.evidenceChecklist.find((item) => item.code === "latest-statement")?.importance).toBe("required_for_next_step");
    expect(result.professionalReviewRecommended).toBe(false);
  });

  it("routes a separately reported inconsistency to professional-review triage without declaring illegality", () => {
    const result = evaluate({
      paymentState: "current",
      statementOrContractConflict: true,
    });

    expect(result.urgency).toBe("professional_review");
    expect(result.opportunityRoutes.some((route) => route.routeCode === "R7_RECLAMACION")).toBe(true);
    expect(result.primaryAction.code).toBe("gather_evidence");
    expect(result.explanation).toContain("no prueba por sí sola");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("ilegal");
  });

  it("keeps R10 consequence above R7 when both judicial state and inconsistency are reported", () => {
    const result = evaluate({
      paymentState: "executive",
      statementOrContractConflict: true,
    });

    expect(result.urgency).toBe("procedural_urgency");
    expect(result.opportunityRoutes[0]?.routeCode).toBe("R10_EXECUTIVE_DEFENSE");
    expect(result.opportunityRoutes.some((route) => route.routeCode === "R7_RECLAMACION")).toBe(true);
    expect(result.primaryAction.code).toBe("professional_review");
  });

  it("surfaces Article 20 only through the existing router when mortgage + material change support screening", () => {
    const result = evaluate({
      paymentState: "current",
      materialEconomicChange: "yes",
      nextPaymentOutlook: "at_risk",
    });

    const article20 = result.opportunityRoutes.find((route) => route.routeCode === "R3_RESTRUCTURACION_546_20");
    expect(article20).toBeDefined();
    expect(article20?.status).toBe("seasonal_wait");
    expect(result.urgency).toBe("preventive");
  });

  it("does not copy mortgage Article 20 procedure into housing leasing", () => {
    const result = evaluate({
      productType: "housing_leasing",
      paymentState: "current",
      materialEconomicChange: "yes",
      nextPaymentOutlook: "at_risk",
    });

    expect(result.opportunityRoutes.some((route) => route.routeCode === "R3_RESTRUCTURACION_546_20")).toBe(false);
    expect(result.notices.some((notice) => notice.includes("Leasing habitacional requiere reglas propias"))).toBe(true);
  });

  it("contains no automated procedural deadline, countdown or guaranteed restructuring claim", () => {
    const result = evaluate({ paymentState: "executive", materialEconomicChange: "yes" });
    const serialized = JSON.stringify(result).toLowerCase();

    expect(serialized).not.toContain("countdown");
    expect(serialized).not.toContain("vence en");
    expect(serialized).not.toContain("debe aceptar");
    expect(result.legalStrategyAutomated).toBe(false);
  });
});