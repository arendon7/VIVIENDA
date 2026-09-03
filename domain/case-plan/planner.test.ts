import { describe, expect, it } from "vitest";
import { evaluateOpportunityRoutes, type OpportunityRouterInput } from "../opportunity/router";
import { buildCasePlan, type CasePlan } from "./planner";

const base: OpportunityRouterInput = {
  asOfDate: "2026-08-25",
  precision: "C2",
  productType: "mortgage_housing",
  modality: "pesos",
  paymentState: "current",
};

function getRoute(input: OpportunityRouterInput, code: string) {
  const route = evaluateOpportunityRoutes(input).routes.find((item) => item.routeCode === code);
  if (!route) throw new Error(`Expected route ${code}`);
  return route;
}

function allTasks(plan: CasePlan) {
  return plan.phases.flatMap((phase) => phase.tasks);
}

describe("Case Plan Workspace v0.4", () => {
  it("always generates an explicitly local preview", () => {
    const route = getRoute(
      { ...base, extraPaymentCapacity: 300_000, wantsFinishSooner: true },
      "R1_PREPAGO_PLAZO",
    );

    const plan = buildCasePlan(route, base.asOfDate);
    expect(plan.mode).toBe("local_preview");
  });

  it("never generates a completed task without execution evidence", () => {
    const routes = evaluateOpportunityRoutes({
      ...base,
      extraPaymentCapacity: 300_000,
      wantsFinishSooner: true,
      hasBindingTransferOffer: true,
      unexplainedChargeOrAllocationIssue: true,
    }).routes;

    for (const route of routes) {
      const plan = buildCasePlan(route, base.asOfDate);
      expect(allTasks(plan).every((item) => item.state !== ("done" as never))).toBe(true);
    }
  });

  it("R1 preserves explicit evidence of the term-reduction instruction", () => {
    const route = getRoute(
      { ...base, extraPaymentCapacity: 300_000, wantsFinishSooner: true },
      "R1_PREPAGO_PLAZO",
    );
    const plan = buildCasePlan(route, base.asOfDate);

    expect(plan.evidenceChecklist.map((item) => item.label).join(" ")).toMatch(/instrucción de reducción de plazo/i);
    expect(allTasks(plan).map((item) => item.title).join(" ")).toMatch(/aplicar el abono a reducción de plazo/i);
  });

  it("R2 preserves explicit evidence of the installment-reduction instruction", () => {
    const route = getRoute(
      { ...base, extraPaymentCapacity: 300_000, wantsLowerPayment: true },
      "R2_PREPAGO_CUOTA",
    );
    const plan = buildCasePlan(route, base.asOfDate);

    expect(plan.evidenceChecklist.map((item) => item.label).join(" ")).toMatch(/instrucción de reducción de cuota/i);
    expect(allTasks(plan).map((item) => item.title).join(" ")).toMatch(/aplicar el abono a reducción de cuota/i);
  });

  it("R3 seasonal wait prepares the next Jan-Feb window and does not file now", () => {
    const route = getRoute(
      { ...base, materialEconomicChange: true },
      "R3_RESTRUCTURACION_546_20",
    );
    expect(route.status).toBe("seasonal_wait");

    const plan = buildCasePlan(route, "2026-08-25");
    expect(plan.nextEvent?.timingKind).toBe("calendar_window");
    expect(plan.nextEvent?.timingText).toBe("enero-febrero de 2027");
    expect(allTasks(plan).map((item) => item.title).join(" ")).not.toMatch(/radicar hoy/i);
    expect(plan.warnings.join(" ")).toMatch(/no afirma que pueda radicarse hoy/i);
  });

  it("planning an Article 20 route never upgrades its route status", () => {
    const route = getRoute(
      {
        ...base,
        asOfDate: "2027-01-15",
        materialEconomicChange: true,
      },
      "R3_RESTRUCTURACION_546_20",
    );
    expect(route.status).toBe("candidate");

    const plan = buildCasePlan(route, "2027-01-15");
    expect(plan.routeStatus).toBe("candidate");
    expect(plan.precision).toBe(route.precision);
  });

  it("R5 without binding offer keeps the ten-business-day clock inactive", () => {
    const route = getRoute(base, "R5_CESION_546_24");
    expect(route.status).toBe("candidate");

    const plan = buildCasePlan(route, base.asOfDate);
    expect(plan.nextEvent?.triggerEstablished).toBe(false);
    expect(plan.nextEvent?.timingText).toMatch(/no empieza hasta que exista y se entregue una oferta vinculante real/i);
    expect(plan.warnings.join(" ")).toMatch(/10 días hábiles.*todavía no está activo/i);
  });

  it("R5 with binding offer uses a relative ten-business-day clock, not a fabricated due date", () => {
    const route = getRoute(
      { ...base, hasBindingTransferOffer: true },
      "R5_CESION_546_24",
    );
    expect(route.status).toBe("eligible_now");

    const plan = buildCasePlan(route, base.asOfDate);
    expect(plan.nextEvent?.timingKind).toBe("relative_after_trigger");
    expect(plan.nextEvent?.triggerEstablished).toBe(false);
    expect(plan.nextEvent?.timingText).toMatch(/máximo 10 días hábiles después de la entrega comprobada/i);
    expect(plan.nextEvent?.timingText).toMatch(/no se calcula una fecha límite/i);
  });

  it("R7 keeps discrepancy separate from proven legal breach", () => {
    const route = getRoute(
      { ...base, unexplainedChargeOrAllocationIssue: true },
      "R7_RECLAMACION",
    );
    const plan = buildCasePlan(route, base.asOfDate);

    expect(plan.warnings.join(" ")).toMatch(/no equivale todavía a un incumplimiento jurídico probado/i);
    expect(plan.nextEvent?.timingText).toMatch(/no presume desde ahora una escalación/i);
  });

  it("R10 places professional review before strategy and generates no defense recipe", () => {
    const route = getRoute(
      { ...base, paymentState: "embargo_or_auction" },
      "R10_EXECUTIVE_DEFENSE",
    );
    const plan = buildCasePlan(route, base.asOfDate);

    const lawyerIndex = plan.phases.findIndex((item) => item.code === "lawyer");
    const strategyIndex = plan.phases.findIndex((item) => item.code === "strategy");
    expect(lawyerIndex).toBeGreaterThanOrEqual(0);
    expect(strategyIndex).toBeGreaterThan(lawyerIndex);
    expect(plan.nextEvent?.timingKind).toBe("professional_review");

    const taskText = allTasks(plan).map((item) => item.title).join(" ");
    expect(taskText).not.toMatch(/presentar excepción|interponer recurso|oponerse al remate/i);
  });

  it("unknown product creates a classification plan instead of an Article 20 filing plan", () => {
    const route = getRoute(
      { ...base, productType: "unknown" },
      "R3_RESTRUCTURACION_546_20",
    );
    const plan = buildCasePlan(route, base.asOfDate);

    expect(plan.title).toMatch(/clasificar el producto/i);
    expect(plan.objective).toMatch(/crédito hipotecario de vivienda, leasing habitacional u otro crédito/i);
    expect(allTasks(plan).map((item) => item.title).join(" ")).not.toMatch(/radicar.*artículo 20/i);
    expect(plan.warnings.join(" ")).toMatch(/no prepara todavía una solicitud del artículo 20/i);
  });

  it("does not mutate the original route status, precision or payload", () => {
    const route = getRoute(
      { ...base, hasBindingTransferOffer: true },
      "R5_CESION_546_24",
    );
    const before = JSON.stringify(route);

    const plan = buildCasePlan(route, base.asOfDate);

    expect(JSON.stringify(route)).toBe(before);
    expect(plan.routeStatus).toBe(route.status);
    expect(plan.precision).toBe(route.precision);
  });
});