import type {
  OpportunityPrecision,
  OpportunityRouteCode,
  OpportunityRouteStatus,
} from "@/domain/opportunity/router";

export type CaseTrack = "self_service" | "assisted" | "legal";
export type CaseActorKind = "client" | "lawyer" | "admin" | "system" | "external_recorded";

export type CaseActor = {
  kind: CaseActorKind;
  actorId?: string;
};

export type CaseStage =
  | "draft"
  | "collecting_evidence"
  | "ready_for_review"
  | "under_review"
  | "ready_to_prepare"
  | "preparing_submission"
  | "submitted"
  | "awaiting_response"
  | "response_received"
  | "response_under_review"
  | "negotiating"
  | "escalation_review"
  | "resolved_unverified"
  | "resolved_verified"
  | "closed"
  | "cancelled";

export type CaseEventType =
  | "CASE_CREATED"
  | "DATA_AUTHORIZATION_RECORDED"
  | "EVIDENCE_REQUESTED"
  | "EVIDENCE_ATTACHED"
  | "EVIDENCE_VERIFIED"
  | "PROFESSIONAL_REVIEW_REQUESTED"
  | "PROFESSIONAL_REVIEW_COMPLETED"
  | "SERVICE_AGREEMENT_ACCEPTED"
  | "EXTRAJUDICIAL_AUTHORITY_VERIFIED"
  | "JUDICIAL_POWER_VERIFIED"
  | "SUBMISSION_PREPARED"
  | "SUBMISSION_RECORDED"
  | "RESPONSE_RECORDED"
  | "RESPONSE_REVIEW_COMPLETED"
  | "NEGOTIATION_STARTED"
  | "ESCALATION_REVIEW_STARTED"
  | "RESOLUTION_RECORDED"
  | "OUTCOME_VERIFIED"
  | "CASE_CLOSED"
  | "CASE_REOPENED"
  | "CASE_CANCELLED";

type EventDraftBase<TType extends CaseEventType, TPayload extends object> = {
  eventId: string;
  caseId: string;
  type: TType;
  occurredAt: string;
  recordedAt: string;
  actor: CaseActor;
  idempotencyKey: string;
  evidenceRefs?: string[];
  payload: TPayload;
};

export type CaseCreatedDraft = EventDraftBase<
  "CASE_CREATED",
  {
    routeCode: OpportunityRouteCode;
    routeStatus: OpportunityRouteStatus;
    precision: OpportunityPrecision;
    track: CaseTrack;
  }
>;

export type CaseEventDraft =
  | CaseCreatedDraft
  | EventDraftBase<"DATA_AUTHORIZATION_RECORDED", { consentVersion: string }>
  | EventDraftBase<"EVIDENCE_REQUESTED", { requestCode: string; label: string }>
  | EventDraftBase<"EVIDENCE_ATTACHED", { evidenceId: string; kind: string; label: string }>
  | EventDraftBase<"EVIDENCE_VERIFIED", { evidenceId: string; note?: string }>
  | EventDraftBase<"PROFESSIONAL_REVIEW_REQUESTED", { reason: string }>
  | EventDraftBase<"PROFESSIONAL_REVIEW_COMPLETED", { summary: string }>
  | EventDraftBase<"SERVICE_AGREEMENT_ACCEPTED", { agreementVersion: string }>
  | EventDraftBase<"EXTRAJUDICIAL_AUTHORITY_VERIFIED", { scope: string }>
  | EventDraftBase<"JUDICIAL_POWER_VERIFIED", { scope: string }>
  | EventDraftBase<"SUBMISSION_PREPARED", { submissionKind: string }>
  | EventDraftBase<
      "SUBMISSION_RECORDED",
      {
        submittedBy: "client" | "representative";
        channel: string;
        reference?: string;
      }
    >
  | EventDraftBase<"RESPONSE_RECORDED", { source: string; reference?: string }>
  | EventDraftBase<
      "RESPONSE_REVIEW_COMPLETED",
      {
        disposition: "accepted" | "partial" | "rejected" | "unclear";
        summary: string;
      }
    >
  | EventDraftBase<"NEGOTIATION_STARTED", { reason: string }>
  | EventDraftBase<"ESCALATION_REVIEW_STARTED", { reason: string }>
  | EventDraftBase<
      "RESOLUTION_RECORDED",
      {
        outcome: "accepted" | "partial" | "rejected" | "other";
        summary: string;
      }
    >
  | EventDraftBase<"OUTCOME_VERIFIED", { verificationSummary: string }>
  | EventDraftBase<"CASE_CLOSED", { reason: string }>
  | EventDraftBase<"CASE_REOPENED", { reason: string }>
  | EventDraftBase<"CASE_CANCELLED", { reason: string }>;

export type CaseEvent = CaseEventDraft & { sequence: number };

export type CaseOrigin = {
  routeCode: OpportunityRouteCode;
  routeStatus: OpportunityRouteStatus;
  precision: OpportunityPrecision;
  track: CaseTrack;
};

export type CaseCapabilities = {
  dataAuthorizationRecorded: boolean;
  serviceAgreementAccepted: boolean;
  extrajudicialAuthorityVerified: boolean;
  judicialPowerVerified: boolean;
  professionalReviewRequested: boolean;
  professionalReviewCompleted: boolean;
  submissionPrepared: boolean;
  submissionRecorded: boolean;
  responseRecorded: boolean;
  responseReviewCompleted: boolean;
  negotiationStarted: boolean;
  escalationReviewStarted: boolean;
  resolutionRecorded: boolean;
  outcomeVerified: boolean;
};

export type CaseProjection = {
  caseId: string;
  version: number;
  stage: CaseStage;
  origin: CaseOrigin;
  createdAt: string;
  lastRecordedAt: string;
  capabilities: CaseCapabilities;
  attachedEvidenceIds: string[];
  verifiedEvidenceIds: string[];
  lastSubmissionReference: string | null;
  lastResponseReference: string | null;
  terminalReason: string | null;
};

export type AppendCaseEventInput = {
  history: readonly CaseEvent[];
  expectedVersion: number;
  event: CaseEventDraft;
};

export type AppendCaseEventResult = {
  history: CaseEvent[];
  projection: CaseProjection;
  appended: boolean;
  reason?: "duplicate_idempotency_key";
};

export type CaseStateErrorCode =
  | "case_not_created"
  | "case_already_created"
  | "case_id_mismatch"
  | "invalid_sequence"
  | "invalid_event_identity"
  | "invalid_timestamp"
  | "invalid_actor"
  | "invalid_transition"
  | "missing_data_authorization"
  | "missing_evidence"
  | "missing_attached_evidence"
  | "missing_professional_review_request"
  | "missing_extrajudicial_authority"
  | "missing_submission"
  | "missing_response"
  | "missing_resolution"
  | "outcome_not_verified"
  | "version_conflict";

export class CaseStateError extends Error {
  readonly code: CaseStateErrorCode;

  constructor(code: CaseStateErrorCode, message: string) {
    super(message);
    this.name = "CaseStateError";
    this.code = code;
  }
}

function assertNonBlank(value: string, code: CaseStateErrorCode, label: string) {
  if (value.trim() === "") {
    throw new CaseStateError(code, `${label} no puede estar vacío.`);
  }
}

function assertTimestamp(value: string, label: string) {
  if (Number.isNaN(Date.parse(value))) {
    throw new CaseStateError("invalid_timestamp", `${label} debe ser una fecha/hora válida.`);
  }
}

function hasEvidence(event: Pick<CaseEventDraft, "evidenceRefs">): boolean {
  return (event.evidenceRefs ?? []).some((ref) => ref.trim() !== "");
}

function hasExternalReference(event: CaseEventDraft): boolean {
  if (event.type === "SUBMISSION_RECORDED" || event.type === "RESPONSE_RECORDED") {
    return typeof event.payload.reference === "string" && event.payload.reference.trim() !== "";
  }
  return false;
}

function assertEvidenceOrReference(event: CaseEventDraft, message: string) {
  if (!hasEvidence(event) && !hasExternalReference(event)) {
    throw new CaseStateError("missing_evidence", message);
  }
}

function actorAllowed(actor: CaseActorKind, allowed: readonly CaseActorKind[]) {
  return allowed.includes(actor);
}

function assertActor(event: CaseEventDraft, allowed: readonly CaseActorKind[], message: string) {
  if (!actorAllowed(event.actor.kind, allowed)) {
    throw new CaseStateError("invalid_actor", message);
  }
}

function blankCapabilities(): CaseCapabilities {
  return {
    dataAuthorizationRecorded: false,
    serviceAgreementAccepted: false,
    extrajudicialAuthorityVerified: false,
    judicialPowerVerified: false,
    professionalReviewRequested: false,
    professionalReviewCompleted: false,
    submissionPrepared: false,
    submissionRecorded: false,
    responseRecorded: false,
    responseReviewCompleted: false,
    negotiationStarted: false,
    escalationReviewStarted: false,
    resolutionRecorded: false,
    outcomeVerified: false,
  };
}

function inferActiveStage(projection: CaseProjection): CaseStage {
  const c = projection.capabilities;
  if (c.outcomeVerified) return "resolved_verified";
  if (c.resolutionRecorded) return "resolved_unverified";
  if (c.escalationReviewStarted) return "escalation_review";
  if (c.negotiationStarted) return "negotiating";
  if (c.responseRecorded) return c.responseReviewCompleted ? "response_received" : "response_under_review";
  if (c.submissionRecorded) return "awaiting_response";
  if (c.submissionPrepared) return "preparing_submission";
  if (c.professionalReviewCompleted) return "ready_to_prepare";
  if (c.professionalReviewRequested) return "under_review";
  if (projection.verifiedEvidenceIds.length > 0) return "ready_for_review";
  if (projection.attachedEvidenceIds.length > 0) return "collecting_evidence";
  return "draft";
}

function cloneDraft(event: CaseEventDraft): CaseEventDraft {
  return {
    ...event,
    actor: { ...event.actor },
    payload: { ...event.payload },
    ...(event.evidenceRefs ? { evidenceRefs: [...event.evidenceRefs] } : {}),
  } as CaseEventDraft;
}

function validateDraftIdentity(event: CaseEventDraft) {
  assertNonBlank(event.eventId, "invalid_event_identity", "eventId");
  assertNonBlank(event.caseId, "invalid_event_identity", "caseId");
  assertNonBlank(event.idempotencyKey, "invalid_event_identity", "idempotencyKey");
  assertTimestamp(event.occurredAt, "occurredAt");
  assertTimestamp(event.recordedAt, "recordedAt");
}

function assertHistoryOpen(projection: CaseProjection, event: CaseEventDraft) {
  if (projection.stage !== "closed" && projection.stage !== "cancelled") return;
  if (event.type === "CASE_REOPENED") return;
  throw new CaseStateError(
    "invalid_transition",
    "El expediente está cerrado/cancelado; debe reabrirse antes de registrar eventos operativos.",
  );
}

function validateAgainstProjection(projection: CaseProjection | null, event: CaseEventDraft) {
  validateDraftIdentity(event);

  if (event.type === "CASE_CREATED") {
    if (projection !== null) {
      throw new CaseStateError("case_already_created", "CASE_CREATED solo puede existir una vez.");
    }
    assertActor(event, ["client", "admin", "system"], "CASE_CREATED no puede provenir de un tercero externo.");
    return;
  }

  if (projection === null) {
    throw new CaseStateError("case_not_created", "CASE_CREATED debe ser el primer evento.");
  }

  if (event.caseId !== projection.caseId) {
    throw new CaseStateError("case_id_mismatch", "Todos los eventos deben pertenecer al mismo caseId.");
  }

  assertHistoryOpen(projection, event);

  switch (event.type) {
    case "DATA_AUTHORIZATION_RECORDED":
      assertActor(event, ["client", "admin"], "La autorización de datos debe provenir del cliente o ser registrada por administración.");
      assertNonBlank(event.payload.consentVersion, "invalid_transition", "consentVersion");
      break;

    case "EVIDENCE_REQUESTED":
      assertActor(event, ["client", "lawyer", "admin", "system"], "Actor no permitido para solicitar evidencia.");
      assertNonBlank(event.payload.requestCode, "invalid_transition", "requestCode");
      assertNonBlank(event.payload.label, "invalid_transition", "label");
      break;

    case "EVIDENCE_ATTACHED":
      if (!projection.capabilities.dataAuthorizationRecorded) {
        throw new CaseStateError(
          "missing_data_authorization",
          "No se puede persistir evidencia antes de registrar la autorización de tratamiento de datos.",
        );
      }
      assertActor(event, ["client", "lawyer", "admin"], "La evidencia persistida debe atribuirse a una persona/rol autorizado.");
      assertNonBlank(event.payload.evidenceId, "invalid_transition", "evidenceId");
      assertNonBlank(event.payload.label, "invalid_transition", "label");
      break;

    case "EVIDENCE_VERIFIED":
      assertActor(event, ["lawyer", "admin"], "La verificación de evidencia en v0.5 requiere abogado o administración.");
      if (!projection.attachedEvidenceIds.includes(event.payload.evidenceId)) {
        throw new CaseStateError("missing_attached_evidence", "La evidencia debe estar adjunta antes de verificarse.");
      }
      break;

    case "PROFESSIONAL_REVIEW_REQUESTED":
      assertActor(event, ["client", "lawyer", "admin", "system"], "Actor no permitido para solicitar revisión profesional.");
      break;

    case "PROFESSIONAL_REVIEW_COMPLETED":
      assertActor(event, ["lawyer"], "Solo un actor lawyer puede registrar una revisión profesional completada.");
      if (!projection.capabilities.professionalReviewRequested) {
        throw new CaseStateError(
          "missing_professional_review_request",
          "Debe existir una solicitud de revisión profesional antes de completarla.",
        );
      }
      assertNonBlank(event.payload.summary, "invalid_transition", "summary");
      break;

    case "SERVICE_AGREEMENT_ACCEPTED":
      assertActor(event, ["client", "admin"], "La aceptación del servicio debe atribuirse al cliente o ser registrada por administración.");
      assertNonBlank(event.payload.agreementVersion, "invalid_transition", "agreementVersion");
      break;

    case "EXTRAJUDICIAL_AUTHORITY_VERIFIED":
      assertActor(event, ["lawyer", "admin"], "La verificación de facultad extrajudicial requiere abogado o administración.");
      if (!hasEvidence(event)) {
        throw new CaseStateError("missing_evidence", "La facultad extrajudicial verificada debe conservar evidencia.");
      }
      break;

    case "JUDICIAL_POWER_VERIFIED":
      assertActor(event, ["lawyer", "admin"], "La verificación de poder judicial requiere abogado o administración.");
      if (!hasEvidence(event)) {
        throw new CaseStateError("missing_evidence", "El poder judicial verificado debe conservar evidencia.");
      }
      break;

    case "SUBMISSION_PREPARED":
      assertActor(event, ["client", "lawyer", "admin", "system"], "Actor no permitido para preparar una solicitud.");
      assertNonBlank(event.payload.submissionKind, "invalid_transition", "submissionKind");
      break;

    case "SUBMISSION_RECORDED":
      assertActor(event, ["client", "lawyer", "admin"], "El sistema no puede inventar una radicación externa.");
      assertEvidenceOrReference(event, "La radicación real requiere evidencia o una referencia verificable.");
      if (event.payload.submittedBy === "representative" && !projection.capabilities.extrajudicialAuthorityVerified) {
        throw new CaseStateError(
          "missing_extrajudicial_authority",
          "Una radicación atribuida a representante requiere facultad extrajudicial previamente verificada.",
        );
      }
      break;

    case "RESPONSE_RECORDED":
      assertActor(event, ["client", "lawyer", "admin", "external_recorded"], "El sistema no puede fabricar una respuesta externa.");
      assertEvidenceOrReference(event, "La respuesta real requiere evidencia o una referencia verificable.");
      if (!projection.capabilities.submissionRecorded) {
        throw new CaseStateError("missing_submission", "Debe existir una radicación registrada antes de asociar una respuesta a esta secuencia.");
      }
      break;

    case "RESPONSE_REVIEW_COMPLETED":
      assertActor(event, ["lawyer"], "Solo un abogado puede registrar la revisión jurídica de una respuesta como completada.");
      if (!projection.capabilities.responseRecorded) {
        throw new CaseStateError("missing_response", "Debe existir una respuesta registrada antes de completar su revisión.");
      }
      break;

    case "NEGOTIATION_STARTED":
      assertActor(event, ["client", "lawyer", "admin"], "Actor no permitido para iniciar negociación.");
      if (!projection.capabilities.responseRecorded) {
        throw new CaseStateError("missing_response", "La negociación v0.5 parte de una respuesta real previamente registrada.");
      }
      break;

    case "ESCALATION_REVIEW_STARTED":
      assertActor(event, ["lawyer", "admin"], "La revisión de escalamiento no puede ser iniciada autónomamente por el sistema.");
      break;

    case "RESOLUTION_RECORDED":
      assertActor(event, ["client", "lawyer", "admin", "external_recorded"], "El sistema no puede inventar una resolución externa.");
      if (!hasEvidence(event)) {
        throw new CaseStateError("missing_evidence", "Registrar un resultado requiere evidencia del resultado comunicado u observado.");
      }
      break;

    case "OUTCOME_VERIFIED":
      assertActor(event, ["client", "lawyer", "admin", "system"], "Actor no permitido para verificar el efecto documental del resultado.");
      if (!projection.capabilities.resolutionRecorded) {
        throw new CaseStateError("missing_resolution", "Debe existir un resultado registrado antes de verificar su efecto.");
      }
      if (!hasEvidence(event)) {
        throw new CaseStateError("missing_evidence", "Verificar el resultado requiere evidencia posterior suficiente.");
      }
      break;

    case "CASE_CLOSED":
      assertActor(event, ["client", "lawyer", "admin"], "Actor no permitido para cerrar el expediente.");
      if (!projection.capabilities.outcomeVerified) {
        throw new CaseStateError(
          "outcome_not_verified",
          "CASE_CLOSED se reserva para expedientes con resultado verificado; usa CASE_CANCELLED para terminar sin resultado verificado.",
        );
      }
      break;

    case "CASE_REOPENED":
      assertActor(event, ["client", "lawyer", "admin"], "Actor no permitido para reabrir el expediente.");
      if (projection.stage !== "closed" && projection.stage !== "cancelled") {
        throw new CaseStateError("invalid_transition", "Solo un expediente cerrado o cancelado puede reabrirse.");
      }
      break;

    case "CASE_CANCELLED":
      assertActor(event, ["client", "lawyer", "admin"], "Actor no permitido para cancelar el expediente.");
      break;
  }
}

function initialProjection(event: CaseEvent): CaseProjection {
  if (event.type !== "CASE_CREATED") {
    throw new CaseStateError("case_not_created", "CASE_CREATED debe iniciar la proyección.");
  }

  return {
    caseId: event.caseId,
    version: event.sequence,
    stage: "draft",
    origin: {
      routeCode: event.payload.routeCode,
      routeStatus: event.payload.routeStatus,
      precision: event.payload.precision,
      track: event.payload.track,
    },
    createdAt: event.occurredAt,
    lastRecordedAt: event.recordedAt,
    capabilities: blankCapabilities(),
    attachedEvidenceIds: [],
    verifiedEvidenceIds: [],
    lastSubmissionReference: null,
    lastResponseReference: null,
    terminalReason: null,
  };
}

function applyEvent(current: CaseProjection | null, event: CaseEvent): CaseProjection {
  if (current === null) return initialProjection(event);

  const capabilities = { ...current.capabilities };
  let attachedEvidenceIds = [...current.attachedEvidenceIds];
  let verifiedEvidenceIds = [...current.verifiedEvidenceIds];
  let lastSubmissionReference = current.lastSubmissionReference;
  let lastResponseReference = current.lastResponseReference;
  let terminalReason = current.terminalReason;
  let terminalStage: CaseStage | null = null;

  switch (event.type) {
    case "DATA_AUTHORIZATION_RECORDED":
      capabilities.dataAuthorizationRecorded = true;
      break;
    case "EVIDENCE_ATTACHED":
      if (!attachedEvidenceIds.includes(event.payload.evidenceId)) {
        attachedEvidenceIds = [...attachedEvidenceIds, event.payload.evidenceId];
      }
      break;
    case "EVIDENCE_VERIFIED":
      if (!verifiedEvidenceIds.includes(event.payload.evidenceId)) {
        verifiedEvidenceIds = [...verifiedEvidenceIds, event.payload.evidenceId];
      }
      break;
    case "PROFESSIONAL_REVIEW_REQUESTED":
      capabilities.professionalReviewRequested = true;
      break;
    case "PROFESSIONAL_REVIEW_COMPLETED":
      capabilities.professionalReviewCompleted = true;
      break;
    case "SERVICE_AGREEMENT_ACCEPTED":
      capabilities.serviceAgreementAccepted = true;
      break;
    case "EXTRAJUDICIAL_AUTHORITY_VERIFIED":
      capabilities.extrajudicialAuthorityVerified = true;
      break;
    case "JUDICIAL_POWER_VERIFIED":
      capabilities.judicialPowerVerified = true;
      break;
    case "SUBMISSION_PREPARED":
      capabilities.submissionPrepared = true;
      break;
    case "SUBMISSION_RECORDED":
      capabilities.submissionRecorded = true;
      lastSubmissionReference = event.payload.reference?.trim() || null;
      break;
    case "RESPONSE_RECORDED":
      capabilities.responseRecorded = true;
      lastResponseReference = event.payload.reference?.trim() || null;
      break;
    case "RESPONSE_REVIEW_COMPLETED":
      capabilities.responseReviewCompleted = true;
      break;
    case "NEGOTIATION_STARTED":
      capabilities.negotiationStarted = true;
      break;
    case "ESCALATION_REVIEW_STARTED":
      capabilities.escalationReviewStarted = true;
      break;
    case "RESOLUTION_RECORDED":
      capabilities.resolutionRecorded = true;
      break;
    case "OUTCOME_VERIFIED":
      capabilities.outcomeVerified = true;
      break;
    case "CASE_CLOSED":
      terminalStage = "closed";
      terminalReason = event.payload.reason;
      break;
    case "CASE_CANCELLED":
      terminalStage = "cancelled";
      terminalReason = event.payload.reason;
      break;
    case "CASE_REOPENED":
      terminalReason = null;
      break;
    case "CASE_CREATED":
    case "EVIDENCE_REQUESTED":
      break;
  }

  const nextBase: CaseProjection = {
    ...current,
    version: event.sequence,
    lastRecordedAt: event.recordedAt,
    capabilities,
    attachedEvidenceIds,
    verifiedEvidenceIds,
    lastSubmissionReference,
    lastResponseReference,
    terminalReason,
  };

  if (terminalStage) return { ...nextBase, stage: terminalStage };
  if (event.type === "CASE_REOPENED") return { ...nextBase, stage: inferActiveStage(nextBase) };

  return { ...nextBase, stage: inferActiveStage(nextBase) };
}

function replayInternal(history: readonly CaseEvent[]): CaseProjection | null {
  let projection: CaseProjection | null = null;

  for (let index = 0; index < history.length; index += 1) {
    const event = history[index];
    if (!event) continue;

    const expectedSequence = index + 1;
    if (event.sequence !== expectedSequence) {
      throw new CaseStateError(
        "invalid_sequence",
        `Secuencia inválida: se esperaba ${expectedSequence} y llegó ${event.sequence}.`,
      );
    }

    validateAgainstProjection(projection, event);
    projection = applyEvent(projection, event);
  }

  return projection;
}

export function replayCaseHistory(history: readonly CaseEvent[]): CaseProjection {
  const projection = replayInternal(history);
  if (projection === null) {
    throw new CaseStateError("case_not_created", "No existe CASE_CREATED en un historial vacío.");
  }
  return projection;
}

export function appendCaseEvent(input: AppendCaseEventInput): AppendCaseEventResult {
  const duplicate = input.history.find((item) => item.idempotencyKey === input.event.idempotencyKey);
  if (duplicate) {
    const projection = replayCaseHistory(input.history);
    return {
      history: input.history.map((event) => clonePersistedEvent(event)),
      projection,
      appended: false,
      reason: "duplicate_idempotency_key",
    };
  }

  if (input.expectedVersion !== input.history.length) {
    throw new CaseStateError(
      "version_conflict",
      `expectedVersion ${input.expectedVersion} no coincide con la versión actual ${input.history.length}.`,
    );
  }

  const currentProjection = input.history.length === 0 ? null : replayCaseHistory(input.history);
  validateAgainstProjection(currentProjection, input.event);

  const persisted = {
    ...cloneDraft(input.event),
    sequence: input.history.length + 1,
  } as CaseEvent;

  const history = [...input.history.map((event) => clonePersistedEvent(event)), persisted];
  const projection = replayCaseHistory(history);

  return { history, projection, appended: true };
}

function clonePersistedEvent(event: CaseEvent): CaseEvent {
  return {
    ...cloneDraft(event),
    sequence: event.sequence,
  } as CaseEvent;
}
