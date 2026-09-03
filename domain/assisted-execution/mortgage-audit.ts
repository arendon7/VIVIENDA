import type { CaseActorKind, CaseEventType, CaseTrack } from "@/domain/case-state/machine";
import { buildCasePlan, type CasePlan } from "@/domain/case-plan/planner";
import type {
  OpportunityPrecision,
  OpportunityRoute,
  OpportunityRouterResult,
} from "@/domain/opportunity/router";

export type MortgageAuditFindingStatus =
  | "explained"
  | "needs_more_evidence"
  | "possible_inconsistency"
  | "route_change_required";

export type MortgageAuditExecutionStep = {
  eventType: CaseEventType;
  actorKinds: CaseActorKind[];
  purpose: string;
};

export type MortgageAuditExecutionBlueprint = {
  serviceCode: "MORTGAGE_AUDIT_R7_V1";
  routeCode: "R7_RECLAMACION";
  routeStatus: OpportunityRoute["status"];
  precision: OpportunityPrecision;
  caseTrack: CaseTrack;
  requiresDataAuthorization: true;
  requiresServiceAgreement: true;
  requiresVerifiedEvidenceBeforeReview: true;
  grantsExtrajudicialAuthority: false;
  grantsJudicialPower: false;
  professionalReviewRequired: true;
  completionMarker: "PROFESSIONAL_REVIEW_COMPLETED";
  casePlan: CasePlan;
  evidenceChecklist: string[];
  executionSteps: MortgageAuditExecutionStep[];
  allowedFindingStatuses: MortgageAuditFindingStatus[];
  notices: string[];
};

export type MortgageAuditBlueprintErrorCode =
  | "r7_not_available"
  | "higher_priority_route_requires_reroute";

export class MortgageAuditBlueprintError extends Error {
  readonly code: MortgageAuditBlueprintErrorCode;

  constructor(code: MortgageAuditBlueprintErrorCode, message: string) {
    super(message);
    this.name = "MortgageAuditBlueprintError";
    this.code = code;
  }
}

const executionSteps: MortgageAuditExecutionStep[] = [
  {
    eventType: "CASE_CREATED",
    actorKinds: ["client", "admin", "system"],
    purpose: "Crear un expediente assisted con origen R7 sin afirmar todavía contratación, poder o radicación.",
  },
  {
    eventType: "DATA_AUTHORIZATION_RECORDED",
    actorKinds: ["client", "admin"],
    purpose: "Registrar autorización de tratamiento antes de persistir evidencia documental.",
  },
  {
    eventType: "SERVICE_AGREEMENT_ACCEPTED",
    actorKinds: ["client", "admin"],
    purpose: "Registrar aceptación explícita del alcance de auditoría; no concede facultad para representar.",
  },
  {
    eventType: "EVIDENCE_REQUESTED",
    actorKinds: ["client", "lawyer", "admin", "system"],
    purpose: "Solicitar únicamente la evidencia necesaria para aislar la diferencia reportada.",
  },
  {
    eventType: "EVIDENCE_ATTACHED",
    actorKinds: ["client", "lawyer", "admin"],
    purpose: "Adjuntar evidencia una vez exista autorización de datos.",
  },
  {
    eventType: "EVIDENCE_VERIFIED",
    actorKinds: ["lawyer", "admin"],
    purpose: "Confirmar que el documento/evidencia corresponde al hecho que se analizará.",
  },
  {
    eventType: "PROFESSIONAL_REVIEW_REQUESTED",
    actorKinds: ["client", "lawyer", "admin", "system"],
    purpose: "Abrir formalmente la fase de revisión profesional sobre el paquete verificado.",
  },
  {
    eventType: "PROFESSIONAL_REVIEW_COMPLETED",
    actorKinds: ["lawyer"],
    purpose: "Entregar una revisión profesional con hechos, evidencia, incertidumbres y siguiente ruta.",
  },
];

const allowedFindingStatuses: MortgageAuditFindingStatus[] = [
  "explained",
  "needs_more_evidence",
  "possible_inconsistency",
  "route_change_required",
];

function findR7(result: OpportunityRouterResult): OpportunityRoute | undefined {
  return result.routes.find((route) => route.routeCode === "R7_RECLAMACION");
}

export function buildMortgageAuditBlueprint(
  routerResult: OpportunityRouterResult,
  asOfDate: string,
): MortgageAuditExecutionBlueprint {
  if (routerResult.primaryRoute?.routeCode === "R10_EXECUTIVE_DEFENSE") {
    throw new MortgageAuditBlueprintError(
      "higher_priority_route_requires_reroute",
      "Existe una ruta procesal prioritaria R10; no se debe continuar una auditoría R7 ordinaria sin re-rutear el caso.",
    );
  }

  const route = findR7(routerResult);
  if (!route) {
    throw new MortgageAuditBlueprintError(
      "r7_not_available",
      "La Auditoría Hipotecaria v0.12 requiere una inconsistencia concreta clasificada por R7.",
    );
  }

  const casePlan = buildCasePlan(route, asOfDate);

  return {
    serviceCode: "MORTGAGE_AUDIT_R7_V1",
    routeCode: "R7_RECLAMACION",
    routeStatus: route.status,
    precision: route.precision,
    caseTrack: "assisted",
    requiresDataAuthorization: true,
    requiresServiceAgreement: true,
    requiresVerifiedEvidenceBeforeReview: true,
    grantsExtrajudicialAuthority: false,
    grantsJudicialPower: false,
    professionalReviewRequired: true,
    completionMarker: "PROFESSIONAL_REVIEW_COMPLETED",
    casePlan,
    evidenceChecklist: casePlan.evidenceChecklist.map((item) => item.label),
    executionSteps: executionSteps.map((step) => ({
      ...step,
      actorKinds: [...step.actorKinds],
    })),
    allowedFindingStatuses: [...allowedFindingStatuses],
    notices: [
      "La auditoría puede explicar una diferencia o concluir que falta evidencia; no necesita producir una reclamación para generar valor.",
      "Aceptar el servicio no concede facultad extrajudicial ni poder judicial.",
      "Cualquier radicación posterior debe registrarse únicamente cuando exista una actuación real y evidencia/referencia verificable.",
    ],
  };
}
