import { describe, expect, it } from "vitest";
import type { OpportunityRoute } from "@/domain/opportunity/router";
import { buildMortgageAuditBlueprintForGovernedRoute } from "./mortgage-audit";
import { buildAssistedEvidenceReadiness } from "./evidence-readiness";

function r7Route(overrides: Partial<OpportunityRoute> = {}): OpportunityRoute {
  return {
    routeCode: "R7_RECLAMACION",
    title: "Auditar una diferencia concreta",
    status: "candidate",
    priority: 70,
    reasonCodes: ["user_requested_claim_audit"],
    blockers: [],
    requiredEvidence: ["Movimiento específico que presenta la diferencia"],
    legalBasis: [],
    humanReviewRequired: true,
    nextAction: "Reunir evidencia y revisar la diferencia.",
    precision: "C1",
    ...overrides,
  };
}

describe("Assisted Evidence Readiness v0.23.10", () => {
  it("starts with every evidence item undeclared and no operational capability implied", () => {
    const blueprint = buildMortgageAuditBlueprintForGovernedRoute(r7Route(), "2026-09-07");
    const readiness = buildAssistedEvidenceReadiness(blueprint);

    expect(readiness.inventoryStatus).toBe("not_started");
    expect(readiness.preparationState).toBe("needs_classification");
    expect(readiness.summary.declaredItems).toBe(0);
    expect(readiness.items.length).toBeGreaterThan(0);
    expect(readiness.items.every((item) => item.declaration === "not_declared")).toBe(true);
    expect(readiness.items.every((item) => !item.uploaded && !item.persisted && !item.verified)).toBe(true);
    expect(readiness.truthBoundary.userDeclarationIsNotVerification).toBe(true);
    expect(readiness.truthBoundary.inventoryDoesNotCreateCase).toBe(true);
  });

  it("treats user availability as a local declaration, never as upload, persistence or verification", () => {
    const blueprint = buildMortgageAuditBlueprintForGovernedRoute(r7Route(), "2026-09-07");
    const first = blueprint.casePlan.evidenceChecklist[0];
    expect(first).toBeDefined();

    const readiness = buildAssistedEvidenceReadiness(blueprint, [
      { label: first!.label, declaration: "user_reports_available" },
    ]);
    const item = readiness.items.find((candidate) => candidate.label === first!.label);

    expect(item?.declaration).toBe("user_reports_available");
    expect(item?.uploaded).toBe(false);
    expect(item?.persisted).toBe(false);
    expect(item?.verified).toBe(false);
    expect(readiness.inventoryStatus).toBe("in_progress");
  });

  it("reports collection needed when a current non-conditional support is missing", () => {
    const blueprint = buildMortgageAuditBlueprintForGovernedRoute(r7Route(), "2026-09-07");
    const declarations = blueprint.casePlan.evidenceChecklist
      .filter((item) => item.kind !== "conditional")
      .map((item) => ({
        label: item.label,
        declaration: "user_reports_available" as const,
      }));
    const firstCurrent = blueprint.casePlan.evidenceChecklist.find((item) => item.kind !== "conditional");
    expect(firstCurrent).toBeDefined();
    const patched = declarations.map((item) => item.label === firstCurrent!.label
      ? { ...item, declaration: "user_reports_missing" as const }
      : item);

    const readiness = buildAssistedEvidenceReadiness(blueprint, patched);

    expect(readiness.preparationState).toBe("needs_collection");
    expect(readiness.summary.currentMissingItems).toBe(1);
    expect(readiness.nextAction).toMatch(/Reúne/i);
  });

  it("can become locally ready for future intake only after every current support is declared available", () => {
    const blueprint = buildMortgageAuditBlueprintForGovernedRoute(r7Route(), "2026-09-07");
    const declarations = blueprint.casePlan.evidenceChecklist
      .filter((item) => item.kind !== "conditional")
      .map((item) => ({
        label: item.label,
        declaration: "user_reports_available" as const,
      }));

    const readiness = buildAssistedEvidenceReadiness(blueprint, declarations);

    expect(readiness.preparationState).toBe("declared_ready_for_future_intake");
    expect(readiness.summary.currentMissingItems).toBe(0);
    expect(readiness.summary.currentUndeclaredItems).toBe(0);
    expect(readiness.nextAction).toMatch(/futuro ingreso documental/i);
    expect(readiness.items.every((item) => !item.persisted && !item.verified)).toBe(true);
  });

  it("does not let conditional evidence block current preparation when the triggering event does not yet exist", () => {
    const blueprint = buildMortgageAuditBlueprintForGovernedRoute(r7Route(), "2026-09-07");
    const currentDeclarations = blueprint.casePlan.evidenceChecklist
      .filter((item) => item.kind !== "conditional")
      .map((item) => ({ label: item.label, declaration: "user_reports_available" as const }));
    const conditional = blueprint.casePlan.evidenceChecklist.find((item) => item.kind === "conditional");
    expect(conditional).toBeDefined();

    const readiness = buildAssistedEvidenceReadiness(blueprint, currentDeclarations);

    expect(readiness.preparationState).toBe("declared_ready_for_future_intake");
    expect(readiness.items.find((item) => item.label === conditional!.label)?.declaration).toBe("not_declared");
    expect(readiness.summary.conditionalItems).toBeGreaterThan(0);
  });

  it("ignores declarations for evidence labels outside the canonical R7 checklist", () => {
    const blueprint = buildMortgageAuditBlueprintForGovernedRoute(r7Route(), "2026-09-07");
    const readiness = buildAssistedEvidenceReadiness(blueprint, [
      { label: "Cédula inventada por el consumidor", declaration: "user_reports_available" },
    ]);

    expect(readiness.items.some((item) => /Cédula inventada/.test(item.label))).toBe(false);
    expect(readiness.summary.declaredItems).toBe(0);
  });
});
