import type { CaseTrack } from "@/domain/case-state/machine";
import type { DecisionActionProfile } from "@/domain/decision-object/action-profile";
import type { OpportunityRoute, OpportunityRouteCode } from "@/domain/opportunity/router";

export type ExecutionIntentCode =
  | "prepare_self"
  | "assisted_mortgage_audit"
  | "professional_review";

export type ExecutionIntentOption = {
  code: ExecutionIntentCode;
  routeCode: OpportunityRouteCode;
  caseTrack: CaseTrack;
  title: string;
  description: string;
  createsCase: false;
  executesExternally: false;
  grantsAuthority: false;
  requiresServiceAgreementBeforeRealService: boolean;
  requiresDataAuthorizationBeforeEvidencePersistence: boolean;
};

export type ExecutionIntentResolution = {
  mode: "local_preview";
  routeCode: OpportunityRouteCode;
  options: ExecutionIntentOption[];
  requiresExplicitUserChoice: true;
  selectedIntent: null;
};

export type ExecutionIntentSelection = {
  mode: "local_preview";
  routeCode: OpportunityRouteCode;
  intentCode: ExecutionIntentCode;
  caseTrack: CaseTrack;
  createsCase: false;
  executesExternally: false;
  grantsAuthority: false;
  serviceAgreementAccepted: false;
  dataAuthorizationRecorded: false;
  professionalEngagementCreated: false;
};

export class ExecutionIntentError extends Error {
  readonly code:
    | "profile_route_mismatch"
    | "no_supported_execution_intent"
    | "execution_intent_not_available";

  constructor(
    code: ExecutionIntentError["code"],
    message: string,
  ) {
    super(message);
    this.name = "ExecutionIntentError";
    this.code = code;
  }
}

function selfPreparationOption(routeCode: OpportunityRouteCode): ExecutionIntentOption {
  return {
    code: "prepare_self",
    routeCode,
    caseTrack: "self_service",
    title: "Prepararlo por mi cuenta",
    description: "Organiza pasos y documentos para que tú realices las actuaciones que correspondan. Esta vista no envía ni ejecuta nada ante terceros.",
    createsCase: false,
    executesExternally: false,
    grantsAuthority: false,
    requiresServiceAgreementBeforeRealService: false,
    requiresDataAuthorizationBeforeEvidencePersistence: true,
  };
}

function assistedAuditOption(routeCode: OpportunityRouteCode): ExecutionIntentOption {
  return {
    code: "assisted_mortgage_audit",
    routeCode,
    caseTrack: "assisted",
    title: "Revisarlo con acompañamiento",
    description: "Usa la modalidad de Auditoría Hipotecaria definida para esta demostración. Elegirla aquí no contrata el servicio, no cobra y no abre un expediente real.",
    createsCase: false,
    executesExternally: false,
    grantsAuthority: false,
    requiresServiceAgreementBeforeRealService: true,
    requiresDataAuthorizationBeforeEvidencePersistence: true,
  };
}

function professionalReviewOption(routeCode: OpportunityRouteCode): ExecutionIntentOption {
  return {
    code: "professional_review",
    routeCode,
    caseTrack: "legal",
    title: "Preparar revisión profesional",
    description: "Organiza la información para revisión profesional prioritaria. Esta elección no contrata abogado, no concede poder y no define una estrategia jurídica.",
    createsCase: false,
    executesExternally: false,
    grantsAuthority: false,
    requiresServiceAgreementBeforeRealService: false,
    requiresDataAuthorizationBeforeEvidencePersistence: true,
  };
}

export function resolveExecutionIntents(
  route: OpportunityRoute,
  actionProfile: DecisionActionProfile,
): ExecutionIntentResolution {
  if (route.routeCode !== actionProfile.routeCode) {
    throw new ExecutionIntentError(
      "profile_route_mismatch",
      "El perfil de acción debe pertenecer a la misma ruta que se quiere ejecutar.",
    );
  }

  const options: ExecutionIntentOption[] = [];

  if (actionProfile.availability.selfService !== "not_appropriate") {
    options.push(selfPreparationOption(route.routeCode));
  }

  if (
    route.routeCode === "R7_RECLAMACION"
    && actionProfile.availability.assisted === "mortgage_audit_preview"
  ) {
    options.push(assistedAuditOption(route.routeCode));
  }

  if (
    actionProfile.availability.selfService === "not_appropriate"
    && actionProfile.availability.professionalReview === "required"
  ) {
    options.push(professionalReviewOption(route.routeCode));
  }

  if (options.length === 0) {
    throw new ExecutionIntentError(
      "no_supported_execution_intent",
      "La ruta actual no tiene una modalidad de ejecución soportada por esta versión.",
    );
  }

  return {
    mode: "local_preview",
    routeCode: route.routeCode,
    options,
    requiresExplicitUserChoice: true,
    selectedIntent: null,
  };
}

export function selectExecutionIntent(
  resolution: ExecutionIntentResolution,
  intentCode: ExecutionIntentCode,
): ExecutionIntentSelection {
  const option = resolution.options.find((item) => item.code === intentCode);

  if (!option) {
    throw new ExecutionIntentError(
      "execution_intent_not_available",
      "La modalidad elegida no está disponible para la ruta actual.",
    );
  }

  return {
    mode: "local_preview",
    routeCode: resolution.routeCode,
    intentCode: option.code,
    caseTrack: option.caseTrack,
    createsCase: false,
    executesExternally: false,
    grantsAuthority: false,
    serviceAgreementAccepted: false,
    dataAuthorizationRecorded: false,
    professionalEngagementCreated: false,
  };
}
