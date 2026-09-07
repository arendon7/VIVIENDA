import { describe, expect, it } from "vitest";
import type { AssistedEvidenceReadiness } from "@/domain/assisted-execution/evidence-readiness";
import {
  buildAssistedIntakeGate,
  buildPreviewAssistedIntakeGate,
  type AssistedIntakeCaseFacts,
  type AssistedIntakePlatformCapabilities,
} from "@/domain/assisted-execution/intake-gate";

function evidence(
  preparationState: AssistedEvidenceReadiness["preparationState"],
): AssistedEvidenceReadiness {
  return {
    mode: "local_preview",
    routeCode: "R7_RECLAMACION",
    serviceCode: "MORTGAGE_AUDIT_R7_V1",
    inventoryStatus: preparationState === "declared_ready_for_future_intake" ? "inventory_complete" : "in_progress",
    preparationState,
    items: [],
    summary: {
      totalItems: 0,
      declaredItems: 0,
      availableItems: 0,
      missingItems: 0,
      undeclaredItems: 0,
      currentItems: 0,
      currentMissingItems: 0,
      currentUndeclaredItems: 0,
      conditionalItems: 0,
    },
    nextAction: "",
    truthBoundary: {
      userDeclarationIsNotUpload: true,
      userDeclarationIsNotPersistence: true,
      userDeclarationIsNotVerification: true,
      inventoryDoesNotCreateCase: true,
      inventoryDoesNotRequestProfessionalReview: true,
    },
    notices: [],
  };
}

const platformReady: AssistedIntakePlatformCapabilities = {
  authenticatedIdentityAvailable: true,
  casePersistenceAvailable: true,
  secureStorageAvailable: true,
  rateLimitAvailable: true,
  trustedOriginAvailable: true,
};

const caseReady: AssistedIntakeCaseFacts = {
  realCaseCreated: true,
  dataAuthorizationRecorded: true,
  serviceAgreementAccepted: true,
};

describe("Assisted Intake Gate v0.23.11", () => {
  it("keeps secure upload blocked while the local evidence inventory is incomplete", () => {
    const gate = buildAssistedIntakeGate(evidence("needs_classification"), platformReady, caseReady);

    expect(gate.status).toBe("local_preparation_required");
    expect(gate.secureUploadMayBeOffered).toBe(false);
    expect(gate.blockers).toContain("evidence_inventory_not_ready");
  });

  it("fails closed in the current preview even when the user reports every current support available", () => {
    const gate = buildPreviewAssistedIntakeGate(evidence("declared_ready_for_future_intake"));

    expect(gate.status).toBe("platform_activation_required");
    expect(gate.evidenceInventoryReady).toBe(true);
    expect(gate.platformReady).toBe(false);
    expect(gate.realCaseCreated).toBe(false);
    expect(gate.dataAuthorizationRecorded).toBe(false);
    expect(gate.serviceAgreementAccepted).toBe(false);
    expect(gate.secureUploadMayBeOffered).toBe(false);
    expect(gate.blockers).toEqual(expect.arrayContaining([
      "authenticated_identity_unavailable",
      "case_persistence_unavailable",
      "secure_storage_unavailable",
      "rate_limit_unavailable",
      "trusted_origin_unavailable",
    ]));
  });

  it("requires a real case after platform capabilities are available", () => {
    const gate = buildAssistedIntakeGate(
      evidence("declared_ready_for_future_intake"),
      platformReady,
      { ...caseReady, realCaseCreated: false },
    );

    expect(gate.status).toBe("real_case_required");
    expect(gate.secureUploadMayBeOffered).toBe(false);
  });

  it("requires data authorization after a real case exists", () => {
    const gate = buildAssistedIntakeGate(
      evidence("declared_ready_for_future_intake"),
      platformReady,
      { ...caseReady, dataAuthorizationRecorded: false },
    );

    expect(gate.status).toBe("data_authorization_required");
    expect(gate.secureUploadMayBeOffered).toBe(false);
  });

  it("requires explicit service scope acceptance after data authorization", () => {
    const gate = buildAssistedIntakeGate(
      evidence("declared_ready_for_future_intake"),
      platformReady,
      { ...caseReady, serviceAgreementAccepted: false },
    );

    expect(gate.status).toBe("service_agreement_required");
    expect(gate.secureUploadMayBeOffered).toBe(false);
  });

  it("only allows offering secure upload when every precondition is explicitly true", () => {
    const gate = buildAssistedIntakeGate(
      evidence("declared_ready_for_future_intake"),
      platformReady,
      caseReady,
    );

    expect(gate.status).toBe("secure_upload_ready");
    expect(gate.blockers).toEqual([]);
    expect(gate.secureUploadMayBeOffered).toBe(true);
    expect(gate.occursInThisPreview).toBe(false);
    expect(gate.truthBoundary).toEqual({
      inventoryReadyIsNotEvidenceReceived: true,
      gateReadyIsNotUpload: true,
      gateReadyIsNotPersistence: true,
      gateReadyIsNotVerification: true,
      gateReadyIsNotProfessionalReview: true,
      serviceAgreementIsNotAuthority: true,
    });
  });
});
