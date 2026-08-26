import { describe, expect, it } from "vitest";
import { evaluateOpportunityRoutes, type OpportunityRouterInput } from "@/domain/opportunity/router";
import {
  buildMortgageAuditBlueprint,
  MortgageAuditBlueprintError,
} from "./mortgage-audit";

const base: OpportunityRouterInput = {
  asOfDate: "2026-08-26",
  precision: "C2",
  productType: "mortgage_housing",
  modality: "pesos",
  paymentState: "current",
};

function routes(overrides: Partial<OpportunityRouterInput> = {}) {
  return evaluateOpportunityRoutes({ ...base, ...overrides });
}

describe("Mortgage Audit assisted blueprint v0.12", () => {
  it("builds only from a concrete R7 inconsistency", () => {
    const routerResult = routes({ unexplainedChargeOrAllocationIssue: true });
    const blueprint = buildMortgageAuditBlueprint(routerResult, base.asOfDate);

    expect(blueprint.serviceCode).toBe("MORTGAGE_AUDIT_R7_V1");
    expect(blueprint.routeCode).toBe("R7_RECLAMACION");
    expect(blueprint.caseTrack).toBe("assisted");
    expect(blueprint.professionalReviewRequired).toBe(true);
    expect(blueprint.casePlan.routeCode).toBe("R7_RECLAMACION");
  });

  it("rejects a generic audit when R7 is not present", () => {
    const routerResult = routes();

    expect(() => buildMortgageAuditBlueprint(routerResult, base.asOfDate)).toThrowError(MortgageAuditBlueprintError);
    try {
      buildMortgageAuditBlueprint(routerResult, base.asOfDate);
    } catch (error) {
      expect(error).toBeInstanceOf(MortgageAuditBlueprintError);
      expect((error as MortgageAuditBlueprintError).code).toBe("r7_not_available");
    }
  });

  it("refuses ordinary R7 execution when R10 is the higher-priority route", () => {
    const routerResult = routes({
      unexplainedChargeOrAllocationIssue: true,
      paymentState: "executive",
    });

    expect(routerResult.primaryRoute?.routeCode).toBe("R10_EXECUTIVE_DEFENSE");

    try {
      buildMortgageAuditBlueprint(routerResult, base.asOfDate);
      throw new Error("Expected blueprint construction to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(MortgageAuditBlueprintError);
      expect((error as MortgageAuditBlueprintError).code).toBe("higher_priority_route_requires_reroute");
    }
  });

  it("separates service acceptance from authority and power", () => {
    const blueprint = buildMortgageAuditBlueprint(
      routes({ statementOrContractConflict: true }),
      base.asOfDate,
    );

    expect(blueprint.requiresDataAuthorization).toBe(true);
    expect(blueprint.requiresServiceAgreement).toBe(true);
    expect(blueprint.grantsExtrajudicialAuthority).toBe(false);
    expect(blueprint.grantsJudicialPower).toBe(false);
  });

  it("requires verified evidence before professional review in the blueprint", () => {
    const blueprint = buildMortgageAuditBlueprint(
      routes({ unexplainedChargeOrAllocationIssue: true }),
      base.asOfDate,
    );
    const sequence = blueprint.executionSteps.map((step) => step.eventType);

    expect(sequence).toEqual([
      "CASE_CREATED",
      "DATA_AUTHORIZATION_RECORDED",
      "SERVICE_AGREEMENT_ACCEPTED",
      "EVIDENCE_REQUESTED",
      "EVIDENCE_ATTACHED",
      "EVIDENCE_VERIFIED",
      "PROFESSIONAL_REVIEW_REQUESTED",
      "PROFESSIONAL_REVIEW_COMPLETED",
    ]);
    expect(blueprint.requiresVerifiedEvidenceBeforeReview).toBe(true);
    expect(sequence).not.toContain("SUBMISSION_RECORDED");
  });

  it("inherits the R7 evidence checklist instead of inventing unrelated identity requirements", () => {
    const blueprint = buildMortgageAuditBlueprint(
      routes({ unexplainedChargeOrAllocationIssue: true }),
      base.asOfDate,
    );
    const joined = blueprint.evidenceChecklist.join(" | ").toLowerCase();

    expect(joined).toContain("diferencia");
    expect(joined).toContain("extracto");
    expect(joined).not.toContain("cédula");
    expect(joined).not.toContain("poder judicial");
  });

  it("allows non-accusatory findings and no automatic illegality status", () => {
    const blueprint = buildMortgageAuditBlueprint(
      routes({ statementOrContractConflict: true }),
      base.asOfDate,
    );

    expect(blueprint.allowedFindingStatuses).toEqual([
      "explained",
      "needs_more_evidence",
      "possible_inconsistency",
      "route_change_required",
    ]);
    expect(JSON.stringify(blueprint.allowedFindingStatuses)).not.toContain("illegal");
  });
});
