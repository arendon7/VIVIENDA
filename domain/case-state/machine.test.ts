import { describe, expect, it } from "vitest";
import {
  appendCaseEvent,
  CaseStateError,
  replayCaseHistory,
  type CaseEvent,
  type CaseEventDraft,
} from "./machine";

const iso = "2026-08-26T06:00:00-05:00";

function draft<T extends CaseEventDraft>(value: T): T {
  return value;
}

function created(caseId = "case-1"): CaseEventDraft {
  return draft({
    eventId: `evt-create-${caseId}`,
    caseId,
    type: "CASE_CREATED",
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "system" },
    idempotencyKey: `idem-create-${caseId}`,
    payload: {
      routeCode: "R1_PREPAGO_PLAZO",
      routeStatus: "eligible_now",
      precision: "C2",
      track: "self_service",
    },
  });
}

function append(history: readonly CaseEvent[], event: CaseEventDraft, expectedVersion = history.length) {
  return appendCaseEvent({ history, expectedVersion, event });
}

function started() {
  return append([], created()).history;
}

function authorization(key = "idem-auth"): CaseEventDraft {
  return draft({
    eventId: `evt-${key}`,
    caseId: "case-1",
    type: "DATA_AUTHORIZATION_RECORDED",
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "client" },
    idempotencyKey: key,
    payload: { consentVersion: "privacy-v1" },
  });
}

function evidence(evidenceId = "statement-1"): CaseEventDraft {
  return draft({
    eventId: `evt-evidence-${evidenceId}`,
    caseId: "case-1",
    type: "EVIDENCE_ATTACHED",
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "client" },
    idempotencyKey: `idem-evidence-${evidenceId}`,
    payload: { evidenceId, kind: "statement", label: "Extracto" },
  });
}

function clientSubmission(reference = "RAD-123"): CaseEventDraft {
  return draft({
    eventId: `evt-submission-${reference}`,
    caseId: "case-1",
    type: "SUBMISSION_RECORDED",
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "client" },
    idempotencyKey: `idem-submission-${reference}`,
    payload: { submittedBy: "client", channel: "PQR", reference },
  });
}

function bankResponse(reference = "RESP-123"): CaseEventDraft {
  return draft({
    eventId: `evt-response-${reference}`,
    caseId: "case-1",
    type: "RESPONSE_RECORDED",
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "external_recorded" },
    idempotencyKey: `idem-response-${reference}`,
    evidenceRefs: ["response.pdf"],
    payload: { source: "Banco", reference },
  });
}

function responseReviewStarted(): CaseEventDraft {
  return draft({
    eventId: "evt-response-review-start",
    caseId: "case-1",
    type: "RESPONSE_REVIEW_STARTED",
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "lawyer" },
    idempotencyKey: "idem-response-review-start",
    payload: { reason: "Analizar alcance jurídico y operativo de la respuesta." },
  });
}

function responseReviewCompleted(): CaseEventDraft {
  return draft({
    eventId: "evt-response-review-complete",
    caseId: "case-1",
    type: "RESPONSE_REVIEW_COMPLETED",
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "lawyer" },
    idempotencyKey: "idem-response-review-complete",
    payload: { disposition: "unclear", summary: "La respuesta requiere siguiente decisión." },
  });
}

function resolution(withEvidence = true): CaseEventDraft {
  const common = {
    eventId: `evt-resolution-${withEvidence ? "proof" : "none"}`,
    caseId: "case-1",
    type: "RESOLUTION_RECORDED" as const,
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "external_recorded" as const },
    idempotencyKey: `idem-resolution-${withEvidence ? "proof" : "none"}`,
    payload: { outcome: "accepted" as const, summary: "Resultado comunicado." },
  };
  return withEvidence ? draft({ ...common, evidenceRefs: ["resolution.pdf"] }) : draft(common);
}

function outcome(withEvidence = true): CaseEventDraft {
  const common = {
    eventId: `evt-outcome-${withEvidence ? "proof" : "none"}`,
    caseId: "case-1",
    type: "OUTCOME_VERIFIED" as const,
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "system" as const },
    idempotencyKey: `idem-outcome-${withEvidence ? "proof" : "none"}`,
    payload: { verificationSummary: "Extracto posterior confirma el efecto." },
  };
  return withEvidence ? draft({ ...common, evidenceRefs: ["next-statement.pdf"] }) : draft(common);
}

describe("Case State Machine v0.5", () => {
  it("enforces creation identity, sequence, concurrency, idempotency and immutable append", () => {
    expect(() => append([], authorization())).toThrowError(CaseStateError);

    const history = started();
    expect(() => append(history, { ...created(), eventId: "evt-create-2", idempotencyKey: "idem-create-2" })).toThrowError(/solo puede existir una vez/i);
    expect(() => append(history, { ...authorization(), caseId: "case-2" })).toThrowError(/mismo caseId/i);
    expect(() => replayCaseHistory([{ ...history[0]!, sequence: 2 }])).toThrowError(/secuencia inválida/i);
    expect(() => append(history, authorization(), 0)).toThrowError(/expectedVersion 0/i);

    const snapshot = JSON.stringify(history);
    const first = append(history, authorization());
    expect(JSON.stringify(history)).toBe(snapshot);
    expect(first.history).not.toBe(history);

    const retry = append(first.history, authorization(), 1);
    expect(retry.appended).toBe(false);
    expect(retry.reason).toBe("duplicate_idempotency_key");
    expect(retry.history).toHaveLength(2);
    expect(replayCaseHistory(first.history)).toEqual(replayCaseHistory(first.history));
  });

  it("requires data authorization before evidence and human role before verification", () => {
    expect(() => append(started(), evidence())).toThrowError(/autorización de tratamiento de datos/i);

    let history = append(started(), authorization()).history;
    history = append(history, evidence()).history;
    expect(replayCaseHistory(history).stage).toBe("collecting_evidence");

    const verify = draft({
      eventId: "evt-verify",
      caseId: "case-1",
      type: "EVIDENCE_VERIFIED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "lawyer" },
      idempotencyKey: "idem-verify",
      payload: { evidenceId: "statement-1" },
    });

    expect(() => append(history, { ...verify, actor: { kind: "system" }, eventId: "evt-verify-system", idempotencyKey: "idem-verify-system" })).toThrowError(/requiere abogado o administración/i);
    expect(append(history, verify).projection.stage).toBe("ready_for_review");
  });

  it("requires an explicit professional review request and lawyer completion", () => {
    const completed = draft({
      eventId: "evt-prof-complete",
      caseId: "case-1",
      type: "PROFESSIONAL_REVIEW_COMPLETED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "lawyer" },
      idempotencyKey: "idem-prof-complete",
      payload: { summary: "Revisión individual completada." },
    });
    expect(() => append(started(), completed)).toThrowError(/solicitud de revisión profesional/i);

    const requested = draft({
      eventId: "evt-prof-request",
      caseId: "case-1",
      type: "PROFESSIONAL_REVIEW_REQUESTED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "system" },
      idempotencyKey: "idem-prof-request",
      payload: { reason: "Ruta requiere revisión humana." },
    });
    const history = append(started(), requested).history;
    expect(replayCaseHistory(history).stage).toBe("under_review");
    expect(() => append(history, { ...completed, actor: { kind: "system" }, eventId: "evt-prof-system", idempotencyKey: "idem-prof-system" })).toThrowError(/solo un actor lawyer/i);
    expect(append(history, completed).projection.stage).toBe("ready_to_prepare");
  });

  it("keeps service acceptance, extrajudicial authority and judicial power independent", () => {
    let history = started();
    history = append(
      history,
      draft({
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

    let projection = replayCaseHistory(history);
    expect(projection.capabilities.serviceAgreementAccepted).toBe(true);
    expect(projection.capabilities.extrajudicialAuthorityVerified).toBe(false);
    expect(projection.capabilities.judicialPowerVerified).toBe(false);

    const authority = draft({
      eventId: "evt-authority",
      caseId: "case-1",
      type: "EXTRAJUDICIAL_AUTHORITY_VERIFIED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "admin" },
      idempotencyKey: "idem-authority",
      evidenceRefs: ["authorization.pdf"],
      payload: { scope: "Gestión ante banco" },
    });
    history = append(history, authority).history;
    projection = replayCaseHistory(history);
    expect(projection.capabilities.extrajudicialAuthorityVerified).toBe(true);
    expect(projection.capabilities.judicialPowerVerified).toBe(false);

    expect(() => append(started(), { ...authority, evidenceRefs: [], eventId: "evt-authority-no-proof", idempotencyKey: "idem-authority-no-proof" })).toThrowError(/conservar evidencia/i);
  });

  it("requires proof for filing and authority when a representative files", () => {
    const noProof = draft({
      eventId: "evt-file-no-proof",
      caseId: "case-1",
      type: "SUBMISSION_RECORDED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "client" },
      idempotencyKey: "idem-file-no-proof",
      payload: { submittedBy: "client", channel: "PQR" },
    });
    expect(() => append(started(), noProof)).toThrowError(/evidencia o una referencia/i);

    const representative = draft({
      eventId: "evt-file-representative",
      caseId: "case-1",
      type: "SUBMISSION_RECORDED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "lawyer" },
      idempotencyKey: "idem-file-representative",
      evidenceRefs: ["filing.pdf"],
      payload: { submittedBy: "representative", channel: "PQR" },
    });
    expect(() => append(started(), representative)).toThrowError(/facultad extrajudicial/i);

    const client = append(started(), clientSubmission());
    expect(client.projection.stage).toBe("awaiting_response");
    expect(client.projection.lastSubmissionReference).toBe("RAD-123");
    expect(client.projection.capabilities.extrajudicialAuthorityVerified).toBe(false);
  });

  it("requires a real submission before response and prevents system-fabricated external responses", () => {
    expect(() => append(started(), bankResponse())).toThrowError(/radicación registrada/i);

    const filed = append(started(), clientSubmission()).history;
    const systemResponse = { ...bankResponse(), actor: { kind: "system" as const }, eventId: "evt-response-system", idempotencyKey: "idem-response-system" };
    expect(() => append(filed, systemResponse)).toThrowError(/no puede fabricar una respuesta/i);

    const received = append(filed, bankResponse());
    expect(received.projection.stage).toBe("response_received");
    expect(received.projection.capabilities.responseRecorded).toBe(true);
  });

  it("keeps response review lifecycle monotonic and auditable", () => {
    let history = append(started(), clientSubmission()).history;
    history = append(history, bankResponse()).history;
    expect(replayCaseHistory(history).stage).toBe("response_received");

    expect(() => append(history, responseReviewCompleted())).toThrowError(/inicio de revisión de respuesta/i);
    expect(() => append(history, { ...responseReviewStarted(), actor: { kind: "system" }, eventId: "evt-review-start-system", idempotencyKey: "idem-review-start-system" })).toThrowError(/solo un abogado puede iniciar/i);

    history = append(history, responseReviewStarted()).history;
    let projection = replayCaseHistory(history);
    expect(projection.stage).toBe("response_under_review");
    expect(projection.capabilities.responseReviewStarted).toBe(true);
    expect(projection.capabilities.responseReviewCompleted).toBe(false);

    expect(() => append(history, { ...responseReviewCompleted(), actor: { kind: "system" }, eventId: "evt-review-complete-system", idempotencyKey: "idem-review-complete-system" })).toThrowError(/solo un abogado/i);

    history = append(history, responseReviewCompleted()).history;
    projection = replayCaseHistory(history);
    expect(projection.stage).toBe("response_reviewed");
    expect(projection.capabilities.responseReviewCompleted).toBe(true);
  });

  it("requires evidence for result, posterior evidence for verification, and verified outcome for close", () => {
    expect(() => append(started(), resolution(false))).toThrowError(/requiere evidencia/i);
    expect(() => append(started(), outcome())).toThrowError(/resultado registrado/i);

    let history = append(started(), resolution()).history;
    expect(replayCaseHistory(history).stage).toBe("resolved_unverified");
    expect(() => append(history, outcome(false))).toThrowError(/evidencia posterior/i);

    const close = draft({
      eventId: "evt-close",
      caseId: "case-1",
      type: "CASE_CLOSED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "admin" },
      idempotencyKey: "idem-close",
      payload: { reason: "Resultado verificado." },
    });
    expect(() => append(history, close)).toThrowError(/resultado verificado/i);

    history = append(history, outcome()).history;
    expect(replayCaseHistory(history).stage).toBe("resolved_verified");
    expect(append(history, close).projection.stage).toBe("closed");
  });

  it("uses cancellation without claiming resolution and reopens terminal cases without losing history", () => {
    const cancelled = append(
      started(),
      draft({
        eventId: "evt-cancel",
        caseId: "case-1",
        type: "CASE_CANCELLED",
        occurredAt: iso,
        recordedAt: iso,
        actor: { kind: "client" },
        idempotencyKey: "idem-cancel",
        payload: { reason: "No continuar." },
      }),
    );
    expect(cancelled.projection.stage).toBe("cancelled");
    expect(cancelled.projection.capabilities.resolutionRecorded).toBe(false);
    expect(() => append(cancelled.history, authorization("idem-after-cancel"))).toThrowError(/debe reabrirse/i);

    const reopened = append(
      cancelled.history,
      draft({
        eventId: "evt-reopen",
        caseId: "case-1",
        type: "CASE_REOPENED",
        occurredAt: iso,
        recordedAt: iso,
        actor: { kind: "client" },
        idempotencyKey: "idem-reopen",
        payload: { reason: "Retomar el caso." },
      }),
    );
    expect(reopened.history).toHaveLength(cancelled.history.length + 1);
    expect(reopened.projection.stage).toBe("draft");
    expect(reopened.projection.terminalReason).toBeNull();
  });

  it("preserves immutable case origin across later events", () => {
    let history = started();
    history = append(history, authorization()).history;
    history = append(history, evidence()).history;
    history = append(history, resolution()).history;
    history = append(history, outcome()).history;

    expect(replayCaseHistory(history).origin).toEqual({
      routeCode: "R1_PREPAGO_PLAZO",
      routeStatus: "eligible_now",
      precision: "C2",
      track: "self_service",
    });
  });
});
