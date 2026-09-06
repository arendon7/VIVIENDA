import {
  buildMortgageAuditBlueprint,
  buildMortgageAuditBlueprintForGovernedRoute,
  type MortgageAuditExecutionBlueprint,
} from "@/domain/assisted-execution/mortgage-audit";
import type { CaseEventType } from "@/domain/case-state/machine";
import type { ExecutionIntentSelection } from "@/domain/execution-intent/resolver";
import type { OpportunityRoute, OpportunityRouterResult } from "@/domain/opportunity/router";

export type AssistedExecutionReadinessStepState =
  | "next_real_step"
  | "blocked_until_previous";

export type AssistedExecutionReadinessStep = {
  eventType: CaseEventType;
  label: string;
  purpose: string;
  state: AssistedExecutionReadinessStepState;
  occursInThisPreview: false;
};

export type AssistedExecutionReadiness = {
  mode: "local_preview";
  serviceCode: MortgageAuditExecutionBlueprint["serviceCode"];
  routeCode: MortgageAuditExecutionBlueprint["routeCode"];
  intentCode: "assisted_mortgage_audit";
  caseTrack: "assisted";
  status: "setup_required";
  realCaseCreated: false;
  dataAuthorizationRecorded: false;
  serviceAgreementAccepted: false;
  evidencePersisted: false;
  evidenceVerified: false;
  professionalReviewRequested: false;
  professionalReviewCompleted: false;
  externalExecutionOccurred: false;
  extrajudicialAuthorityGranted: false;
  judicialPowerGranted: false;
  requiresDataAuthorization: true;
  requiresServiceAgreement: true;
  requiresVerifiedEvidenceBeforeReview: true;
  evidenceChecklist: string[];
  steps: AssistedExecutionReadinessStep[];
  notices: string[];
};

export type AssistedExecutionReadinessErrorCode =
  | "unsupported_execution_intent"
  | "selection_route_mismatch"
  | "selection_track_mismatch";

export class AssistedExecutionReadinessError extends Error {
  readonly code: AssistedExecutionReadinessErrorCode;

  constructor(code: AssistedExecutionReadinessErrorCode, message: string) {
    super(message);
    this.name = "AssistedExecutionReadinessError";
    this.code = code;
  }
}

const stepLabels: Partial<Record<CaseEventType, string>> = {
  CASE_CREATED: "Abrir el expediente de acompañamiento",
  DATA_AUTHORIZATION_RECORDED: "Registrar autorización de datos",
  SERVICE_AGREEMENT_ACCEPTED: "Aceptar el alcance del servicio",
  EVIDENCE_REQUESTED: "Definir la evidencia necesaria",
  EVIDENCE_ATTACHED: "Incorporar la evidencia autorizada",
  EVIDENCE_VERIFIED: "Verificar la evidencia",
  PROFESSIONAL_REVIEW_REQUESTED: "Solicitar la revisión profesional",
  PROFESSIONAL_REVIEW_COMPLETED: "Completar la revisión profesional",
};

const stepPurposes: Partial<Record<CaseEventType, string>> = {
  CASE_CREATED: "Crear un espacio trazable para esta auditoría sin afirmar todavía contratación, poder ni radicación.",
  DATA_AUTHORIZATION_RECORDED: "Registrar la autorización necesaria antes de conservar evidencia documental.",
  SERVICE_AGREEMENT_ACCEPTED: "Registrar de forma separada la aceptación del alcance del servicio; esto no concede facultad para representar.",
  EVIDENCE_REQUESTED: "Precisar únicamente los documentos necesarios para entender la diferencia reportada.",
  EVIDENCE_ATTACHED: "Incorporar documentos solo después de que exista autorización para conservarlos.",
  EVIDENCE_VERIFIED: "Confirmar que la evidencia corresponde al hecho concreto que se analizará.",
  PROFESSIONAL_REVIEW_REQUESTED: "Solicitar la revisión profesional una vez exista un paquete de evidencia verificado.",
  PROFESSIONAL_REVIEW_COMPLETED: "Registrar la revisión profesional con hechos, evidencia, incertidumbres y siguiente ruta.",
};

function labelFor(eventType: CaseEventType): string {
  return stepLabels[eventType] ?? "Registrar el siguiente hecho del expediente";
}

function purposeFor(eventType: CaseEventType): string {
  return stepPurposes[eventType] ?? "Registrar el siguiente paso real con trazabilidad suficiente.";
}

function assertSelection(selection: ExecutionIntentSelection) {
  if (selection.intentCode !== "assisted_mortgage_audit") {
    throw new AssistedExecutionReadinessError(
      "unsupported_execution_intent",
      "Esta preparación asistida solo aplica a la modalidad de Auditoría Hipotecaria R7 definida para esta versión.",
    );
  }

  if (selection.routeCode !== "R7_RECLAMACION") {
    throw new AssistedExecutionReadinessError(
      "selection_route_mismatch",
      "La modalidad asistida de Auditoría Hipotecaria debe conservar origen R7.",
    );
  }

  if (selection.caseTrack !== "assisted") {
    throw new AssistedExecutionReadinessError(
      "selection_track_mismatch",
      "La modalidad de Auditoría Hipotecaria debe conservar el track assisted.",
    );
  }
}

function fromBlueprint(
  selection: ExecutionIntentSelection,
  blueprint: MortgageAuditExecutionBlueprint,
): AssistedExecutionReadiness {
  assertSelection(selection);

  if (blueprint.routeCode !== selection.routeCode) {
    throw new AssistedExecutionReadinessError(
      "selection_route_mismatch",
      "El blueprint asistido debe pertenecer a la misma ruta seleccionada.",
    );
  }

  const steps = blueprint.executionSteps.map((step, index): AssistedExecutionReadinessStep => ({
    eventType: step.eventType,
    label: labelFor(step.eventType),
    purpose: purposeFor(step.eventType),
    state: index === 0 ? "next_real_step" : "blocked_until_previous",
    occursInThisPreview: false,
  }));

  return {
    mode: "local_preview",
    serviceCode: blueprint.serviceCode,
    routeCode: blueprint.routeCode,
    intentCode: "assisted_mortgage_audit",
    caseTrack: "assisted",
    status: "setup_required",
    realCaseCreated: false,
    dataAuthorizationRecorded: false,
    serviceAgreementAccepted: false,
    evidencePersisted: false,
    evidenceVerified: false,
    professionalReviewRequested: false,
    professionalReviewCompleted: false,
    externalExecutionOccurred: false,
    extrajudicialAuthorityGranted: false,
    judicialPowerGranted: false,
    requiresDataAuthorization: blueprint.requiresDataAuthorization,
    requiresServiceAgreement: blueprint.requiresServiceAgreement,
    requiresVerifiedEvidenceBeforeReview: blueprint.requiresVerifiedEvidenceBeforeReview,
    evidenceChecklist: [...blueprint.evidenceChecklist],
    steps,
    notices: [
      "Elegir acompañamiento solo prepara esta ruta. Todavía no existe un expediente real, contrato, cobro ni actuación externa.",
      ...blueprint.notices,
    ],
  };
}

export function buildAssistedExecutionReadiness(
  selection: ExecutionIntentSelection,
  routerResult: OpportunityRouterResult,
  asOfDate: string,
): AssistedExecutionReadiness {
  assertSelection(selection);
  return fromBlueprint(selection, buildMortgageAuditBlueprint(routerResult, asOfDate));
}

export function buildAssistedExecutionReadinessForGovernedRoute(
  selection: ExecutionIntentSelection,
  governedRoute: OpportunityRoute,
  asOfDate: string,
): AssistedExecutionReadiness {
  assertSelection(selection);

  if (governedRoute.routeCode !== selection.routeCode) {
    throw new AssistedExecutionReadinessError(
      "selection_route_mismatch",
      "La ruta gobernante debe coincidir con la modalidad asistida seleccionada.",
    );
  }

  return fromBlueprint(
    selection,
    buildMortgageAuditBlueprintForGovernedRoute(governedRoute, asOfDate),
  );
}
