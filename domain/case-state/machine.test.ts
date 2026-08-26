import { describe, expect, it } from "vitest";
import {
  appendCaseEvent,
  CaseStateError,
  replayCaseHistory,
  type CaseEvent,
  type CaseEventDraft,
} from "./machine";

const iso = "2026-08-26T05:30:00-05:00";

function created(caseId = "case-1"): CaseEventDraft {
  return {
    eventId: `evt-created-${caseId}`,
    caseId,
    type: "CASE_CREATED",
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "system" },
    idempotencyKey: `idem-created-${caseId}`,
    payload: {
      routeCode: "R1_PREPAGO_PLAZO",
      routeStatus: "eligible_now",
      precision: "C2",
      track: "self_service",
    },
  };
}

function event<T extends CaseEventDraft>(value: T): T {
  return value;
}

function append(history: readonly CaseEvent[], draft: CaseEventDraft, expectedVersion = history.length) {
  return appendCaseEvent({ history, expectedVersion, event: draft });
}

function withCreated(caseId = "case-1") {
  return append([], created(caseId)).history;
}

function dataAuthorization(caseId = "case-1", key = "idem-data-auth"): CaseEventDraft {
  return event({
    eventId: `evt-data-auth-${key}`,
    caseId,
    type: "DATA_AUTHORIZATION_RECORDED",
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "client" },
    idempotencyKey: key,
    payload: { consentVersion: "privacy-v1" },
  });
}

function attachedEvidence(caseId = "case-1", evidenceId = "statement-1"): CaseEventDraft {
  return event({
    eventId: `evt-attach-${evidenceId}`,
    caseId,
    type: "EVIDENCE_ATTACHED",
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "client" },
    idempotencyKey: `idem-attach-${evidenceId}`,
    payload: { evidenceId, kind: "statement", label: "Extracto hipotecario" },
  });
}

function resolution(caseId = "case-1"): CaseEventDraft {
  return event({
    eventId: "evt-resolution",
    caseId,
    type: "RESOLUTION_RECORDED",
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "external_recorded" },
    idempotencyKey: "idem-resolution",
    evidenceRefs: ["bank-response.pdf"],
    payload: { outcome: "accepted", summary: "Resultado comunicado por la entidad." },
  });
}

function outcomeVerified(caseId = "case-1"): CaseEventDraft {
  return event({
    eventId: "evt-outcome-verified",
    caseId,
    type: "OUTCOME_VERIFIED",
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "system" },
    idempotencyKey: "idem-outcome-verified",
    evidenceRefs: ["next-statement.pdf"],
    payload: { verificationSummary: "El extracto posterior refleja el efecto registrado." },
  });
}

describe("Case State Machine v0.5", () => {
  it("requires CASE_CREATED as the first event", () => {
    expect(() => append([], dataAuthorization())).toThrowError(CaseStateError);
    try {
      append([], dataAuthorization());
    } catch (error) {
      expect((error as CaseStateError).code).toBe("case_not_created");
    }
  });

  it("allows CASE_CREATED only once", () => {
    const history = withCreated();
    expect(() => append(history, { ...created(), eventId: "evt-created-2", idempotencyKey: "idem-created-2" })).toThrowError(
      /solo puede existir una vez/i,
    );
  });

  it("rejects events belonging to another caseId", () => {
    const history = withCreated();
    expect(() => append(history, dataAuthorization("case-2"))).toThrowError(/mismo caseId/i);
  });

  it("requires strictly consecutive persisted sequences on replay", () => {
    const history = withCreated();
    const corrupt = [{ ...history[0]!, sequence: 2 }];
    expect(() => replayCaseHistory(corrupt)).toThrowError(/secuencia inválida/i);
  });

  it("replays deterministically", () => {
    let history = withCreated();
    history = append(history, dataAuthorization()).history;
    history = append(history, attachedEvidence()).history;

    expect(replayCaseHistory(history)).toEqual(replayCaseHistory(history));
  });

  it("uses expectedVersion to reject lost updates", () => {
    const history = withCreated();
    expect(() => append(history, dataAuthorization(), 0)).toThrowError(/expectedVersion 0/i);
  });

  it("deduplicates retries by idempotencyKey even when expectedVersion is stale", () => {
    let history = withCreated();
    const first = append(history, dataAuthorization(), history.length);
    history = first.history;

    const retry = append(history, dataAuthorization(), 1);
    expect(retry.appended).toBe(false);
    expect(retry.reason).toBe("duplicate_idempotency_key");
    expect(retry.history).toHaveLength(2);
  });

  it("does not mutate the input history when appending", () => {
    const history = withCreated();
    const snapshot = JSON.stringify(history);
    const result = append(history, dataAuthorization());

    expect(JSON.stringify(history)).toBe(snapshot);
    expect(result.history).not.toBe(history);
    expect(result.history).toHaveLength(history.length + 1);
  });

  it("requires data authorization before persisted evidence", () => {
    const history = withCreated();
    expect(() => append(history, attachedEvidence())).toThrowError(/autorización de tratamiento de datos/i);
  });

  it("allows evidence after data authorization and derives collecting_evidence", () => {
    let history = withCreated();
    history = append(history, dataAuthorization()).history;
    const result = append(history, attachedEvidence());

    expect(result.projection.capabilities.dataAuthorizationRecorded).toBe(true);
    expect(result.projection.attachedEvidenceIds).toContain("statement-1");
    expect(result.projection.stage).toBe("collecting_evidence");
  });

  it("requires evidence to be attached before it can be verified", () => {
    let history = withCreated();
    history = append(history, dataAuthorization()).history;

    const verifyDraft = event({
      eventId: "evt-verify-missing",
      caseId: "case-1",
      type: "EVIDENCE_VERIFIED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "lawyer" },
      idempotencyKey: "idem-verify-missing",
      payload: { evidenceId: "missing" },
    });

    expect(() => append(history, verifyDraft)).toThrowError(/adjunta antes de verificarse/i);
  });

  it("does not let the system impersonate a professional evidence verifier", () => {
    let history = withCreated();
    history = append(history, dataAuthorization()).history;
    history = append(history, attachedEvidence()).history;

    const verifyDraft = event({
      eventId: "evt-verify-system",
      caseId: "case-1",
      type: "EVIDENCE_VERIFIED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "system" },
      idempotencyKey: "idem-verify-system",
      payload: { evidenceId: "statement-1" },
    });

    expect(() => append(history, verifyDraft)).toThrowError(/requiere abogado o administración/i);
  });

  it("requires a professional review request and lawyer actor before completing legal review", () => {
    const history = withCreated();
    const completed = event({
      eventId: "evt-review-completed",
      caseId: "case-1",
      type: "PROFESSIONAL_REVIEW_COMPLETED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "lawyer" },
      idempotencyKey: "idem-review-completed",
      payload: { summary: "Revisión jurídica individual completada." },
    });

    expect(() => append(history, completed)).toThrowError(/solicitud de revisión profesional/i);

    const requested = event({
      eventId: "evt-review-requested",
      caseId: "case-1",
      type: "PROFESSIONAL_REVIEW_REQUESTED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "system" },
      idempotencyKey: "idem-review-requested",
      payload: { reason: "Ruta R10 requiere revisión humana." },
    });
    const requestedHistory = append(history, requested).history;
    const wrongActor = { ...completed, actor: { kind: "system" as const }, idempotencyKey: "idem-review-wrong", eventId: "evt-review-wrong" };

    expect(() => append(requestedHistory, wrongActor)).toThrowError(/solo un actor lawyer/i);
    expect(append(requestedHistory, completed).projection.capabilities.professionalReviewCompleted).toBe(true);
  });

  it("keeps service acceptance separate from both kinds of authority", () => {
    let history = withCreated();
    history = append(
      history,
      event({
        eventId: "evt-service",
        caseId: "case-1",
        type: "SERVICE_AGREEMENT_ACCEPTED",
        occurredAt: iso,
        recordedAt: iso,
        actor: { kind: "client" },
        idempotencyKey: "idem-service",
        payload: { agreementVersion: "services-v1" },
      }),
    ).history;

    const projection = replayCaseHistory(history);
    expect(projection.capabilities.serviceAgreementAccepted).toBe(true);
    expect(projection.capabilities.extrajudicialAuthorityVerified).toBe(false);
    expect(projection.capabilities.judicialPowerVerified).toBe(false);
  });

  it("keeps extrajudicial authority separate from judicial power", () => {
    let history = withCreated();
    history = append(
      history,
      event({
        eventId: "evt-extra-authority",
        caseId: "case-1",
        type: "EXTRAJUDICIAL_AUTHORITY_VERIFIED",
        occurredAt: iso,
        recordedAt: iso,
        actor: { kind: "admin" },
        idempotencyKey: "idem-extra-authority",
        evidenceRefs: ["authorization.pdf"],
        payload: { scope: "Gestión extrajudicial ante entidad financiera." },
      }),
    ).history;

    const projection = replayCaseHistory(history);
    expect(projection.capabilities.extrajudicialAuthorityVerified).toBe(true);
    expect(projection.capabilities.judicialPowerVerified).toBe(false);
  });

  it("requires evidence when verifying extrajudicial or judicial authority", () => {
    const history = withCreated();
    const extra = event({
      eventId: "evt-extra-no-proof",
      caseId: "case-1",
      type: "EXTRAJUDICIAL_AUTHORITY_VERIFIED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "admin" },
      idempotencyKey: "idem-extra-no-proof",
      payload: { scope: "Banco" },
    });
    const judicial = event({
      eventId: "evt-judicial-no-proof",
      caseId: "case-1",
      type: "JUDICIAL_POWER_VERIFIED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "lawyer" },
      idempotencyKey: "idem-judicial-no-proof",
      payload: { scope: "Proceso" },
    });

    expect(() => append(history, extra)).toThrowError(/conservar evidencia/i);
    expect(() => append(history, judicial)).toThrowError(/conservar evidencia/i);
  });

  it("requires extrajudicial authority before recording a representative submission", () => {
    const history = withCreated();
    const submission = event({
      eventId: "evt-submission-rep",
      caseId: "case-1",
      type: "SUBMISSION_RECORDED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "lawyer" },
      idempotencyKey: "idem-submission-rep",
      evidenceRefs: ["filing-proof.pdf"],
      payload: { submittedBy: "representative", channel: "PQR" },
    });

    expect(() => append(history, submission)).toThrowError(/facultad extrajudicial/i);
  });

  it("requires evidence or a real reference to record a submission", () => {
    const history = withCreated();
    const submission = event({
      eventId: "evt-submission-no-proof",
      caseId: "case-1",
      type: "SUBMISSION_RECORDED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "client" },
      idempotencyKey: "idem-submission-no-proof",
      payload: { submittedBy: "client", channel: "PQR" },
    });

    expect(() => append(history, submission)).toThrowError(/requiere evidencia o una referencia/i);
  });

  it("records a client submission with a real reference without granting representative authority", () => {
    const history = withCreated();
    const result = append(
      history,
      event({
        eventId: "evt-submission-client",
        caseId: "case-1",
        type: "SUBMISSION_RECORDED",
        occurredAt: iso,
        recordedAt: iso,
        actor: { kind: "client" },
        idempotencyKey: "idem-submission-client",
        payload: { submittedBy: "client", channel: "PQR", reference: "RAD-123" },
      }),
    );

    expect(result.projection.capabilities.submissionRecorded).toBe(true);
    expect(result.projection.lastSubmissionReference).toBe("RAD-123");
    expect(result.projection.capabilities.extrajudicialAuthorityVerified).toBe(false);
  });

  it("requires a recorded submission before a response", () => {
    const history = withCreated();
    const response = event({
      eventId: "evt-response",
      caseId: "case-1",
      type: "RESPONSE_RECORDED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "external_recorded" },
      idempotencyKey: "idem-response",
      evidenceRefs: ["response.pdf"],
      payload: { source: "Banco" },
    });

    expect(() => append(history, response)).toThrowError(/radicación registrada/i);
  });

  it("does not allow system to invent an external response", () => {
    let history = withCreated();
    history = append(
      history,
      event({
        eventId: "evt-submission-client-2",
        caseId: "case-1",
        type: "SUBMISSION_RECORDED",
        occurredAt: iso,
        recordedAt: iso,
        actor: { kind: "client" },
        idempotencyKey: "idem-submission-client-2",
        payload: { submittedBy: "client", channel: "PQR", reference: "RAD-456" },
      }),
    ).history;

    const response = event({
      eventId: "evt-response-system",
      caseId: "case-1",
      type: "RESPONSE_RECORDED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "system" },
      idempotencyKey: "idem-response-system",
      evidenceRefs: ["response.pdf"],
      payload: { source: "Banco" },
    });

    expect(() => append(history, response)).toThrowError(/no puede fabricar una respuesta/i);
  });

  it("requires evidence to record a resolution", () => {
    const history = withCreated();
    expect(() => append(history, { ...resolution(), evidenceRefs: undefined } as CaseEventDraft)).toThrowError(
      /requiere evidencia/i,
    );
  });

  it("requires a recorded resolution and posterior evidence before outcome verification", () => {
    const history = withCreated();
    expect(() => append(history, outcomeVerified())).toThrowError(/resultado registrado/i);

    const resolvedHistory = append(history, resolution()).history;
    const noEvidence = { ...outcomeVerified(), evidenceRefs: undefined } as CaseEventDraft;
    expect(() => append(resolvedHistory, noEvidence)).toThrowError(/evidencia posterior/i);
  });

  it("reserves CASE_CLOSED for a verified outcome", () => {
    const history = withCreated();
    const close = event({
      eventId: "evt-close",
      caseId: "case-1",
      type: "CASE_CLOSED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "client" },
      idempotencyKey: "idem-close",
      payload: { reason: "Caso finalizado." },
    });

    expect(() => append(history, close)).toThrowError(/resultado verificado/i);
  });

  it("blocks ordinary events after close and reopens without losing history", () => {
    let history = withCreated();
    history = append(history, resolution()).history;
    history = append(history, outcomeVerified()).history;
    history = append(
      history,
      event({
        eventId: "evt-close-verified",
        caseId: "case-1",
        type: "CASE_CLOSED",
        occurredAt: iso,
        recordedAt: iso,
        actor: { kind: "admin" },
        idempotencyKey: "idem-close-verified",
        payload: { reason: "Resultado verificado y expediente cerrado." },
      }),
    ).history;

    expect(replayCaseHistory(history).stage).toBe("closed");
    expect(() => append(history, dataAuthorization("case-1", "idem-auth-after-close"))).toThrowError(/debe reabrirse/i);

    const reopened = append(
      history,
      event({
        eventId: "evt-reopen",
        caseId: "case-1",
        type: "CASE_REOPENED",
        occurredAt: iso,
        recordedAt: iso,
        actor: { kind: "client" },
        idempotencyKey: "idem-reopen",
        payload: { reason: "Apareció nueva evidencia." },
      }),
    );

    expect(reopened.history).toHaveLength(history.length + 1);
    expect(reopened.projection.capabilities.outcomeVerified).toBe(true);
    expect(reopened.projection.stage).toBe("resolved_verified");
    expect(reopened.projection.terminalReason).toBeNull();
  });

  it("uses cancellation to terminate without claiming a resolution", () => {
    const history = withCreated();
    const result = append(
      history,
      event({
        eventId: "evt-cancel",
        caseId: "case-1",
        type: "CASE_CANCELLED",
        occurredAt: iso,
        recordedAt: iso,
        actor: { kind: "client" },
        idempotencyKey: "idem-cancel",
        payload: { reason: "El usuario decidió no continuar." },
      }),
    );

    expect(result.projection.stage).toBe("cancelled");
    expect(result.projection.capabilities.resolutionRecorded).toBe(false);
    expect(result.projection.capabilities.outcomeVerified).toBe(false);
  });

  it("preserves origin route, status and precision across all later events", () => {
    let history = withCreated();
    history = append(history, dataAuthorization()).history;
    history = append(history, attachedEvidence()).history;
    history = append(history, resolution()).history;
    history = append(history, outcomeVerified()).history;

    const origin = replayCaseHistory(history).origin;
    expect(origin).toEqual({
      routeCode: "R1_PREPAGO_PLAZO",
      routeStatus: "eligible_now",
      precision: "C2",
      track: "self_service",
    });
  });
});