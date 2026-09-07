import type { AssistedEvidenceReadiness } from "@/domain/assisted-execution/evidence-readiness";

export type AssistedIntakeGateStatus =
  | "local_preparation_required"
  | "platform_activation_required"
  | "real_case_required"
  | "data_authorization_required"
  | "service_agreement_required"
  | "secure_upload_ready";

export type AssistedIntakeBlockerCode =
  | "evidence_inventory_not_ready"
  | "authenticated_identity_unavailable"
  | "case_persistence_unavailable"
  | "secure_storage_unavailable"
  | "rate_limit_unavailable"
  | "trusted_origin_unavailable"
  | "real_case_missing"
  | "data_authorization_missing"
  | "service_agreement_missing";

export type AssistedIntakePlatformCapabilities = {
  authenticatedIdentityAvailable: boolean;
  casePersistenceAvailable: boolean;
  secureStorageAvailable: boolean;
  rateLimitAvailable: boolean;
  trustedOriginAvailable: boolean;
};

export type AssistedIntakeCaseFacts = {
  realCaseCreated: boolean;
  dataAuthorizationRecorded: boolean;
  serviceAgreementAccepted: boolean;
};

export type AssistedIntakeGate = {
  mode: "provider_ready_contract";
  surface: "local_preview";
  routeCode: "R7_RECLAMACION";
  serviceCode: "MORTGAGE_AUDIT_R7_V1";
  status: AssistedIntakeGateStatus;
  evidenceInventoryReady: boolean;
  platformReady: boolean;
  realCaseCreated: boolean;
  dataAuthorizationRecorded: boolean;
  serviceAgreementAccepted: boolean;
  secureUploadMayBeOffered: boolean;
  blockers: AssistedIntakeBlockerCode[];
  nextRequirement: string;
  occursInThisPreview: false;
  truthBoundary: {
    inventoryReadyIsNotEvidenceReceived: true;
    gateReadyIsNotUpload: true;
    gateReadyIsNotPersistence: true;
    gateReadyIsNotVerification: true;
    gateReadyIsNotProfessionalReview: true;
    serviceAgreementIsNotAuthority: true;
  };
};

const PREVIEW_PLATFORM: AssistedIntakePlatformCapabilities = {
  authenticatedIdentityAvailable: false,
  casePersistenceAvailable: false,
  secureStorageAvailable: false,
  rateLimitAvailable: false,
  trustedOriginAvailable: false,
};

const PREVIEW_CASE: AssistedIntakeCaseFacts = {
  realCaseCreated: false,
  dataAuthorizationRecorded: false,
  serviceAgreementAccepted: false,
};

function platformBlockers(
  platform: AssistedIntakePlatformCapabilities,
): AssistedIntakeBlockerCode[] {
  const blockers: AssistedIntakeBlockerCode[] = [];
  if (!platform.authenticatedIdentityAvailable) blockers.push("authenticated_identity_unavailable");
  if (!platform.casePersistenceAvailable) blockers.push("case_persistence_unavailable");
  if (!platform.secureStorageAvailable) blockers.push("secure_storage_unavailable");
  if (!platform.rateLimitAvailable) blockers.push("rate_limit_unavailable");
  if (!platform.trustedOriginAvailable) blockers.push("trusted_origin_unavailable");
  return blockers;
}

function statusFor(
  evidenceInventoryReady: boolean,
  platformReady: boolean,
  facts: AssistedIntakeCaseFacts,
): AssistedIntakeGateStatus {
  if (!evidenceInventoryReady) return "local_preparation_required";
  if (!platformReady) return "platform_activation_required";
  if (!facts.realCaseCreated) return "real_case_required";
  if (!facts.dataAuthorizationRecorded) return "data_authorization_required";
  if (!facts.serviceAgreementAccepted) return "service_agreement_required";
  return "secure_upload_ready";
}

function nextRequirementFor(status: AssistedIntakeGateStatus): string {
  switch (status) {
    case "local_preparation_required":
      return "Termina el inventario local de soportes antes de preparar cualquier ingreso documental.";
    case "platform_activation_required":
      return "La carga segura requiere identidad autenticada, persistencia de expediente, almacenamiento, rate limiting y trusted origin configurados del lado servidor.";
    case "real_case_required":
      return "Debe existir un expediente real y trazable antes de recibir evidencia documental.";
    case "data_authorization_required":
      return "Debe registrarse la autorización de tratamiento de datos antes de conservar evidencia.";
    case "service_agreement_required":
      return "Debe aceptarse explícitamente el alcance del servicio de auditoría antes del ingreso asistido de evidencia.";
    case "secure_upload_ready":
      return "El contrato permite ofrecer un ingreso documental seguro; esto todavía no significa que un archivo haya sido cargado, persistido o verificado.";
  }
}

export function buildAssistedIntakeGate(
  evidence: AssistedEvidenceReadiness,
  platform: AssistedIntakePlatformCapabilities,
  facts: AssistedIntakeCaseFacts,
): AssistedIntakeGate {
  const evidenceInventoryReady = evidence.preparationState === "declared_ready_for_future_intake";
  const missingPlatformCapabilities = platformBlockers(platform);
  const platformReady = missingPlatformCapabilities.length === 0;
  const blockers: AssistedIntakeBlockerCode[] = [];

  if (!evidenceInventoryReady) blockers.push("evidence_inventory_not_ready");
  blockers.push(...missingPlatformCapabilities);
  if (!facts.realCaseCreated) blockers.push("real_case_missing");
  if (!facts.dataAuthorizationRecorded) blockers.push("data_authorization_missing");
  if (!facts.serviceAgreementAccepted) blockers.push("service_agreement_missing");

  const status = statusFor(evidenceInventoryReady, platformReady, facts);

  return {
    mode: "provider_ready_contract",
    surface: "local_preview",
    routeCode: evidence.routeCode,
    serviceCode: evidence.serviceCode,
    status,
    evidenceInventoryReady,
    platformReady,
    realCaseCreated: facts.realCaseCreated,
    dataAuthorizationRecorded: facts.dataAuthorizationRecorded,
    serviceAgreementAccepted: facts.serviceAgreementAccepted,
    secureUploadMayBeOffered: status === "secure_upload_ready",
    blockers,
    nextRequirement: nextRequirementFor(status),
    occursInThisPreview: false,
    truthBoundary: {
      inventoryReadyIsNotEvidenceReceived: true,
      gateReadyIsNotUpload: true,
      gateReadyIsNotPersistence: true,
      gateReadyIsNotVerification: true,
      gateReadyIsNotProfessionalReview: true,
      serviceAgreementIsNotAuthority: true,
    },
  };
}

export function buildPreviewAssistedIntakeGate(
  evidence: AssistedEvidenceReadiness,
): AssistedIntakeGate {
  return buildAssistedIntakeGate(evidence, PREVIEW_PLATFORM, PREVIEW_CASE);
}
