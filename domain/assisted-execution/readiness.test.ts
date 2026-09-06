import { describe, expect, it } from "vitest";
import { buildDecisionActionProfile } from "@/domain/decision-object/action-profile";
import {
  resolveExecutionIntents,
  selectExecutionIntent,
  type ExecutionIntentSelection,
} from "@/domain/execution-intent/resolver";
import {
  evaluateOpportunityRoutes,
  type OpportunityRouterInput,
} from "@/domain/opportunity/router";
import {
  AssistedExecutionReadinessError,
  buildAssistedExecutionReadiness,
} from "./readiness";

const base: OpportunityRouterInput = {
  asOfDate: "2026-09-06",
  precision: "C1",
  productType: "mortgage_housing",
  modality: "pesos",
  paymentState: "current",
  unexplainedChargeOrAllocationIssue: true,
};

function assistedSelection(overrides: Partial<OpportunityRouterInput> = {}) {
  const routerResult = evaluateOpportunityRoutes({ ...base, ...overrides });
  const r7 = routerResult.routes.find((route) => route.routeCode === "R7_RECLAMACION");
  if (!r7) throw new Error("R7 expected in fixture");
  const resolution = resolveExecutionIntents(r7, buildDecisionActionProfile(r7, base.asOfDate));
  const selection = selectExecutionIntent(resolution, "assisted_mortgage_audit");
  return { routerResult, selection };
}

describe("Assisted execution readiness v0.23.9", () => {
  it("derives the R7 assisted setup sequence from the canonical mortgage audit blueprint", () => {
    const { routerResult, selection } = assistedSelection();
    const readiness = buildAssistedExecutionReadiness(selection, routerResult, base.asOfDate);

    expect(readiness.serviceCode).toBe("MORTGAGE_AUDIT_R7_V1");
    expect(readiness.routeCode).toBe("R7_RECLAMACION");
    expect(readiness.intentCode).toBe("assisted_mortgage_audit");
    expect(readiness.caseTrack).toBe("assisted");
    expect(readiness.status).toBe("setup_required");
    expect(readiness.steps.map((step) => step.eventType)).toEqual([
      "CASE_CREATED",
      "DATA_AUTHORIZATION_RECORDED",
      "SERVICE_AGREEMENT_ACCEPTED",
      "EVIDENCE_REQUESTED",
      "EVIDENCE_ATTACHED",
      "EVIDENCE_VERIFIED",
      "PROFESSIONAL_REVIEW_REQUESTED",
      "PROFESSIONAL_REVIEW_COMPLETED",
    ]);
    expect(readiness.steps[0]?.state).toBe("next_real_step");
    expect(readiness.steps.slice(1).every((step) => step.state === "blocked_until_previous")).toBe(true);
    expect(readiness.steps.every((step) => step.occursInThisPreview === false)).toBe(true);
  });

  it("does not grant case creation, consent, contracting, authority, evidence verification or review", () => {
    const { routerResult, selection } = assistedSelection();
    const readiness = buildAssistedExecutionReadiness(selection, routerResult, base.asOfDate);

    expect(readiness.realCaseCreated).toBe(false);
    expect(readiness.dataAuthorizationRecorded).toBe(false);
    expect(readiness.serviceAgreementAccepted).toBe(false);
    expect(readiness.evidencePersisted).toBe(false);
    expect(readiness.evidenceVerified).toBe(false);
    expect(readiness.professionalReviewRequested).toBe(false);
    expect(readiness.professionalReviewCompleted).toBe(false);
    expect(readiness.externalExecutionOccurred).toBe(false);
    expect(readiness.extrajudicialAuthorityGranted).toBe(false);
    expect(readiness.judicialPowerGranted).toBe(false);
  });

  it("preserves the blueprint requirements and evidence checklist", () => {
    const { routerResult, selection } = assistedSelection();
    const readiness = buildAssistedExecutionReadiness(selection, routerResult, base.asOfDate);

    expect(readiness.requiresDataAuthorization).toBe(true);
    expect(readiness.requiresServiceAgreement).toBe(true);
    expect(readiness.requiresVerifiedEvidenceBeforeReview).toBe(true);
    expect(readiness.evidenceChecklist.length).toBeGreaterThan(0);
    expect(readiness.evidenceChecklist.join(" | ").toLowerCase()).toContain("extracto");
  });

  it("rejects self-service and legal intents instead of manufacturing assisted readiness", () => {
    const { routerResult } = assistedSelection();
    const r7 = routerResult.routes.find((route) => route.routeCode === "R7_RECLAMACION");
    if (!r7) throw new Error("R7 expected in fixture");
    const resolution = resolveExecutionIntents(r7, buildDecisionActionProfile(r7, base.asOfDate));
    const selfSelection = selectExecutionIntent(resolution, "prepare_self");

    expect(() => buildAssistedExecutionReadiness(selfSelection, routerResult, base.asOfDate)).toThrowError(AssistedExecutionReadinessError);
    try {
      buildAssistedExecutionReadiness(selfSelection, routerResult, base.asOfDate);
    } catch (error) {
      expect((error as AssistedExecutionReadinessError).code).toBe("unsupported_execution_intent");
    }
  });

  it("fails closed when a higher-priority R10 route appears", () => {
    const { selection } = assistedSelection();
    const rerouted = evaluateOpportunityRoutes({
      ...base,
      paymentState: "executive",
    });
    expect(rerouted.primaryRoute?.routeCode).toBe("R10_EXECUTIVE_DEFENSE");

    expect(() => buildAssistedExecutionReadiness(selection, rerouted, base.asOfDate)).toThrowError(/R10/);
  });

  it("rejects a forged assisted selection with the wrong route or track", () => {
    const { routerResult, selection } = assistedSelection();

    const wrongRoute: ExecutionIntentSelection = {
      ...selection,
      routeCode: "R1_PREPAGO_PLAZO",
    };
    expect(() => buildAssistedExecutionReadiness(wrongRoute, routerResult, base.asOfDate)).toThrowError(AssistedExecutionReadinessError);

    const wrongTrack: ExecutionIntentSelection = {
      ...selection,
      caseTrack: "legal",
    };
    try {
      buildAssistedExecutionReadiness(wrongTrack, routerResult, base.asOfDate);
    } catch (error) {
      expect((error as AssistedExecutionReadinessError).code).toBe("selection_track_mismatch");
    }
  });
});
