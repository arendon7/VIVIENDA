import { describe, expect, it } from "vitest";
import {
  reconcileInconsistency,
  type InconsistencyReconciliationInput,
} from "./reconciler";

const base: InconsistencyReconciliationInput = {
  asOfDate: "2026-08-26",
  productType: "mortgage_housing",
  paymentState: "current",
  kind: "payment_allocation",
  evidenceAvailability: "two_sources",
  specificity: "specific",
};

function evaluate(overrides: Partial<InconsistencyReconciliationInput> = {}) {
  return reconcileInconsistency({ ...base, ...overrides });
}

describe("Inconsistency Reconciliation v0.15", () => {
  it("treats annual projection variance as education first and never auto-activates R7", () => {
    const result = evaluate({ kind: "annual_projection" });

    expect(result.state).toBe("education_first");
    expect(result.primaryAction.code).toBe("understand_rule");
    expect(result.opportunityRoutes.some((route) => route.routeCode === "R7_RECLAMACION")).toBe(false);
    expect(result.notices.some((notice) => notice.includes("no activa R7 por sí sola"))).toBe(true);
  });

  it("routes missing information to a request before professional review", () => {
    const result = evaluate({ kind: "missing_information", evidenceAvailability: "none" });

    expect(result.state).toBe("needs_information");
    expect(result.primaryAction.code).toBe("request_information");
    expect(result.professionalReviewRecommended).toBe(false);
    expect(result.opportunityRoutes.some((route) => route.routeCode === "R7_RECLAMACION")).toBe(false);
  });

  it("does not treat a vague concern as R7 even when two sources are declared", () => {
    const result = evaluate({ specificity: "unclear" });

    expect(result.state).toBe("needs_information");
    expect(result.opportunityRoutes).toHaveLength(0);
  });

  it("screens a specific payment-allocation mismatch with two declared sources into R7", () => {
    const result = evaluate({ kind: "payment_allocation" });

    expect(result.state).toBe("possible_inconsistency");
    expect(result.primaryAction.code).toBe("prepare_audit");
    expect(result.opportunityRoutes.some((route) => route.routeCode === "R7_RECLAMACION")).toBe(true);
    expect(result.professionalReviewRecommended).toBe(true);
  });

  it("screens a specific contract/statement mismatch with two sources into R7", () => {
    const result = evaluate({ kind: "contract_or_statement" });

    expect(result.state).toBe("possible_inconsistency");
    expect(result.opportunityRoutes[0]?.routeCode).toBe("R7_RECLAMACION");
  });

  it("screens a specific rate/modality mismatch with two sources into R7", () => {
    const result = evaluate({ kind: "rate_or_modality" });

    expect(result.state).toBe("possible_inconsistency");
    expect(result.whatToCompare.join(" ").toLowerCase()).toContain("tasa/modalidad");
  });

  it("keeps an unfamiliar insurance or fee with only one source in evidence comparison", () => {
    const result = evaluate({
      kind: "insurance_or_fee",
      evidenceAvailability: "one_source",
    });

    expect(result.state).toBe("difference_to_reconcile");
    expect(result.primaryAction.code).toBe("compare_evidence");
    expect(result.professionalReviewRecommended).toBe(false);
    expect(result.opportunityRoutes).toHaveLength(0);
  });

  it("screens a specific balance/term mismatch only with two sources and preserves cutoff evidence", () => {
    const result = evaluate({ kind: "balance_or_term" });

    expect(result.state).toBe("possible_inconsistency");
    expect(result.evidenceChecklist.some((item) => item.code === "matching-cutoff" && item.importance === "required_for_next_step")).toBe(true);
  });

  it("keeps R10 primary when a judicial process and inconsistency coexist", () => {
    const result = evaluate({ paymentState: "executive" });

    expect(result.state).toBe("procedural_priority");
    expect(result.primaryAction.code).toBe("verify_judicial_document");
    expect(result.opportunityRoutes[0]?.routeCode).toBe("R10_EXECUTIVE_DEFENSE");
    expect(result.opportunityRoutes.some((route) => route.routeCode === "R7_RECLAMACION")).toBe(true);
  });

  it("treats embargo or auction state as procedural priority", () => {
    const result = evaluate({ paymentState: "embargo_or_auction", evidenceAvailability: "none" });

    expect(result.state).toBe("procedural_priority");
    expect(result.opportunityRoutes[0]?.routeCode).toBe("R10_EXECUTIVE_DEFENSE");
  });

  it("requires product classification before mortgage-specific escalation when product is unknown", () => {
    const result = evaluate({ productType: "unknown" });

    expect(result.state).toBe("needs_information");
    expect(result.primaryAction.code).toBe("request_information");
    expect(result.opportunityRoutes.some((route) => route.routeCode === "R7_RECLAMACION")).toBe(false);
    expect(result.notices.some((notice) => notice.includes("confirmar la naturaleza del producto"))).toBe(true);
  });

  it("allows factual leasing reconciliation without copying mortgage R7 or Article 20", () => {
    const result = evaluate({ productType: "housing_leasing", kind: "contract_or_statement" });

    expect(result.state).toBe("difference_to_reconcile");
    expect(result.opportunityRoutes).toHaveLength(0);
    expect(result.notices.some((notice) => notice.includes("no copia automáticamente"))).toBe(true);
    expect(JSON.stringify(result).toLowerCase()).not.toContain("artículo 20");
  });

  it("keeps a concrete collection charge separate from judicial state and may screen R7", () => {
    const result = evaluate({ kind: "collection_charge", paymentState: "collections" });

    expect(result.state).toBe("possible_inconsistency");
    expect(result.opportunityRoutes.some((route) => route.routeCode === "R10_EXECUTIVE_DEFENSE")).toBe(false);
    expect(result.opportunityRoutes.some((route) => route.routeCode === "R7_RECLAMACION")).toBe(true);
    expect(result.whatCouldExplainIt.join(" ").toLowerCase()).toContain("cobranza no equivale");
  });

  it("never upgrades declared two-source evidence beyond C0 or pretends C3", () => {
    const result = evaluate();

    expect(result.precision).toBe("C0");
    expect(result.notices.some((notice) => notice.includes("no concede C2 ni C3"))).toBe(true);
    expect(JSON.stringify(result)).not.toContain('"precision":"C3"');
  });

  it("contains no automatic illegality, fraud, bank-error or guaranteed recovery claim", () => {
    const samples = [
      evaluate(),
      evaluate({ kind: "rate_or_modality" }),
      evaluate({ kind: "insurance_or_fee" }),
      evaluate({ kind: "annual_projection" }),
      evaluate({ paymentState: "executive" }),
    ];

    for (const result of samples) {
      const serialized = JSON.stringify(result).toLowerCase();
      expect(serialized).not.toContain("esto es ilegal");
      expect(serialized).not.toContain("hubo fraude");
      expect(serialized).not.toContain("el banco se equivocó");
      expect(serialized).not.toContain("ganarás la reclamación");
      expect(serialized).not.toContain("te deben devolver");
      expect(result.legalConclusionAutomated).toBe(false);
    }
  });
});
