import { describe, expect, it } from "vitest";
import {
  appendCaseEvent,
  CaseStateError,
  replayCaseHistory,
  type CaseEvent,
  type CaseEventDraft,
} from "./machine";

const iso = "2026-08-26T05:30:00-05:00";

function base<T extends CaseEventDraft>(value: T): T {
  return value;
}

function created(caseId = "case-1"): CaseEventDraft {
  return base({
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

function auth(caseId = "case-1", key = "idem-auth"): CaseEventDraft {
  return base({
    eventId: `evt-${key}`,
    caseId,
    type: "DATA_AUTHORIZATION_RECORDED",
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "client" },
    idempotencyKey: key,
    payload: { consentVersion: "privacy-v1" },
  });
}

function attach(evidenceId = "statement-1"): CaseEventDraft {
  return base({
    eventId: `evt-attach-${evidenceId}`,
    caseId: "case-1",
    type: "EVIDENCE_ATTACHED",
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "client" },
    idempotencyKey: `idem-attach-${evidenceId}`,
    payload: { evidenceId, kind: "statement", label: "Extracto" },
  });
}

function resolution(withEvidence = true): CaseEventDraft {
  const common = {
    eventId: `evt-resolution-${withEvidence ? "proof" : "no-proof"}`,
    caseId: "case-1",
    type: "RESOLUTION_RECORDED" as const,
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "external_recorded" as const },
    idempotencyKey: `idem-resolution-${withEvidence ? "proof" : "no-proof"}`,
    payload: { outcome: "accepted" as const, summary: "Resultado comunicado." },
  };

  return withEvidence ? base({ ...common, evidenceRefs: ["resolution.pdf"] }) : base(common);
}

function outcome(withEvidence = true): CaseEventDraft {
  const common = {
    eventId: `evt-outcome-${withEvidence ? "proof" : "no-proof"}`,
    caseId: "case-1",
    type: "OUTCOME_VERIFIED" as const,
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "system" as const },
    idempotencyKey: `idem-outcome-${withEvidence ? "proof" : "no-proof"}`,
    payload: { verificationSummary: "Verificación documental posterior." },
  };

  return withEvidence ? base({ ...common, evidenceRefs: ["next-statement.pdf"] }) : base(common);
}

function append(history: readonly CaseEvent[], event: CaseEventDraft, expectedVersion = history.length) {
  return appendCaseEvent({ history, expectedVersion, event });
}

function started() {
  return append([], created()).history;
}

function withSubmission() {
  const history = started();
  return append(
    history,
    base({
      eventId: "evt-submission-client",
      caseId: "case-1",
      type: "SUBMISSION_RECORDED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "client" },
      idempotencyKey: "idem-submission-client",
      payload: { submittedBy: "client", channel: "PQR", reference: "RAD-123" },
    }),
  ).history;
}

describe("Case State Machine v0.5", () => {
  it("enforces CASE_CREATED first, unique and caseId-consistent", () => {
    expect(() => append([], auth())).toThrowError(CaseStateError);

    const history = started();
    expect(() => append(history, { ...created(), eventId: "evt-create-2", idempotencyKey: "idem-create-2" })).toThrowError(
      /solo puede existir una vez/i,
    );
    expect(() => append(history, auth("case-2"))).toThrowError(/mismo caseId/i);
  });

  it("enforces monotonic sequence and deterministic replay", () => {
    let history = started();
    history = append(history, auth()).history;

    expect(replayCaseHistory(history)).toEqual(replayCaseHistory(history));
    expect(() => replayCaseHistory([{ ...history[0]!, sequence: 2 }, history[1]!])).toThrowError(/secuencia inválida/i);
  });

  it("uses optimistic concurrency and idempotency without mutating history", () => {
    const history = started();
    expect(() => append(history, auth(), 0)).toThrowError(/expectedVersion 0/i);

    const snapshot = JSON.stringify(history);
    const first = append(history, auth());
    expect(JSON.stringify(history)).toBe(snapshot);
    expect(first.history).not.toBe(history);

    const retry = append(first.history, auth(), 1);
    expect(retry.appended).toBe(false);
    expect(retry.reason).toBe("duplicate_idempotency_key");
    expect(retry.history).toHaveLength(2);
  });

  it("requires data authorization before persisted evidence", () => {
    expect(() => append(started(), attach())).toThrowError(/autorización de tratamiento de datos/i);

    let history = started();
    history = append(history, auth()).history;
    const result = append(history, attach());
    expect(result.projection.stage).toBe("collecting_evidence");
    expect(result.projection.attachedEvidenceIds).toEqual(["statement-1"]);
  });

  it("requires attached evidence and human verification role before EVIDENCE_VERIFIED", () => {
    let history = started();
    history = append(history, auth()).history;

    const missing = base({
      eventId: "evt-verify-missing",
      caseId: "case-1",
      type: "EVIDENCE_VERIFIED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "lawyer" },
      idempotencyKey: "idem-verify-missing",
      payload: { evidenceId: "statement-1" },
    });
    expect(() => append(history, missing)).toThrowError(/adjunta antes de verificarse/i);

    history = append(history, attach()).history;
    const systemAttempt = { ...missing, eventId: "evt-verify-system", idempotencyKey: "idem-verify-system", actor: { kind: "system" as const } };
    expect(() => append(history, systemAttempt)).toThrowError(/requiere abogado o administración/i);

    const verified = append(history, { ...missing, eventId: "evt-verify-lawyer", idempotencyKey: "idem-verify-lawyer" });
    expect(verified.projection.stage).toBe("ready_for_review");
  });

  it("requires review request plus lawyer actor for completed professional review", () => {
    const completed = base({
      eventId: "evt-review-done",
      caseId: "case-1",
      type: "PROFESSIONAL_REVIEW_COMPLETED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "lawyer" },
      idempotencyKey: "idem-review-done",
      payload: { summary: "Revisión jurídica completada." },
    });
    expect(() => append(started(), completed)).toThrowError(/solicitud de revisión profesional/i);

    const requested = base({
      eventId: "evt-review-request",
      caseId: "case-1",
      type: "PROFESSIONAL_REVIEW_REQUESTED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "system" },
      idempotencyKey: "idem-review-request",
      payload: { reason: "Ruta requiere revisión humana." },
    });
    const history = append(started(), requested).history;
    expect(() => append(history, { ...completed, actor: { kind: "system" }, eventId: "evt-review-system", idempotencyKey: "idem-review-system" })).toThrowError(
      /solo un actor lawyer/i,
    );
    expect(append(history, completed).projection.stage).toBe("ready_to_prepare");
  });

  it("keeps service, extrajudicial authority and judicial power independent", () => {
    let history = started();
    history = append(
      history,
      base({
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

    history = append(
      history,
      base({
        eventId: "evt-extra",
        caseId: "case-1",
        type: "EXTRAJUDICIAL_AUTHORITY_VERIFIED",
        occurredAt: iso,
        recordedAt: iso,
        actor: { kind: "admin" },
        idempotencyKey: "idem-extra",
        evidenceRefs: ["authorization.pdf"],
        payload: { scope: "Gestión ante banco" },
      }),
    ).history;

    projection = replayCaseHistory(history);
    expect(projection.capabilities.extrajudicialAuthorityVerified).toBe(true);
    expect(projection.capabilities.judicialPowerVerified).toBe(false);
  });

  it("requires evidence before verifying extrajudicial or judicial authority", () => {
    const extra = base({
      eventId: "evt-extra-no-proof",
      caseId: "case-1",
      type: "EXTRAJUDICIAL_AUTHORITY_VERIFIED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "admin" },
      idempotencyKey: "idem-extra-no-proof",
      payload: { scope: "Banco" },
    });
    const judicial = base({
      eventId: "evt-judicial-no-proof",
      caseId: "case-1",
      type: "JUDICIAL_POWER_VERIFIED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "lawyer" },
      idempotencyKey: "idem-judicial-no-proof",
      payload: { scope: "Proceso" },
    });

    expect(() => append(started(), extra)).toThrowError(/conservar evidencia/i);
    expect(() => append(started(), judicial)).toThrowError(/conservar evidencia/i);
  });

  it("requires authority for representative filing and proof for every real submission", () => {
    const representative = base({
      eventId: "evt-rep-file",
      caseId: "case-1",
      type: "SUBMISSION_RECORDED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "lawyer" },
      idempotencyKey: "idem-rep-file",
      evidenceRefs: ["filing.pdf"],
      payload: { submittedBy: "representative", channel: "PQR" },
    });
    expect(() => append(started(), representative)).toThrowError(/facultad extrajudicial/i);

    const noProof = base({
      eventId: "evt-client-file-no-proof",
      caseId: "case-1",
      type: "SUBMISSION_RECORDED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "client" },
      idempotencyKey: "idem-client-file-no-proof",
      payload: { submittedBy: "client", channel: "PQR" },
    });
    expect(() => append(started(), noProof)).toThrowError(/evidencia o una referencia/i);

    const clientResult = append(started(), {
      ...noProof,
      eventId: "evt-client-file",
      idempotencyKey: "idem-client-file",
      payload: { submittedBy: "client", channel: "PQR", reference: "RAD-123" },
    });
    expect(clientResult.projection.lastSubmissionReference).toBe("RAD-123");
    expect(clientResult.projection.capabilities.extrajudicialAuthorityVerified).toBe(false);
  });

  it("requires submission before response and forbids system-fabricated responses", () => {
    const response = base({
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
    expect(() => append(started(), response)).toThrowError(/radicación registrada/i);

    const history = withSubmission();
    expect(() => append(history, { ...response, actor: { kind: "system" }, eventId: "evt-system-response", idempotencyKey: "idem-system-response" })).toThrowError(
      /no puede fabricar una respuesta/i,
    );
    expect(append(history, response).projection.capabilities.responseRecorded).toBe(true);
  });

  it("requires lawyer actor to complete response review", () => {
    let history = withSubmission();
    history = append(
      history,
      base({
        eventId: "evt-response-2",
        caseId: "case-1",
        type: "RESPONSE_RECORDED",
        occurredAt: iso,
        recordedAt: iso,
        actor: { kind: "external_recorded" },
        idempotencyKey: "idem-response-2",
        evidenceRefs: ["response-2.pdf"],
        payload: { source: "Banco" },
      }),
    ).history;

    const review = base({
      eventId: "evt-response-review",
      caseId: "case-1",
      type: "RESPONSE_REVIEW_COMPLETED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "lawyer" },
      idempotencyKey: "idem-response-review",
      payload: { disposition: "unclear", summary: "Requiere análisis adicional." },
    });
    expect(() => append(history, { ...review, actor: { kind: "system" }, eventId: "evt-response-review-system", idempotencyKey: "idem-response-review-system" })).toThrowError(
      /solo un abogado/i,
    );
    expect(append(history, review).projection.capabilities.responseReviewCompleted).toBe(true);
  });

  it("requires evidence for resolution and posterior evidence for outcome verification", () => {
    expect(() => append(started(), resolution(false))).toThrowError(/requiere evidencia/i);
    expect(() => append(started(), outcome())).toThrowError(/resultado registrado/i);

    const resolved = append(started(), resolution()).history;
    expect(() => append(resolved, outcome(false))).toThrowError(/evidencia posterior/i);
    expect(append(resolved, outcome()).projection.stage).toBe("resolved_verified");
  });

  it("reserves close for verified outcomes and cancellation for abandonment", () => {
    const close = base({
      eventId: "evt-close",
      caseId: "case-1",
      type: "CASE_CLOSED",
      occurredAt: iso,
      recordedAt: iso,
      actor: { kind: "client" },
      idempotencyKey: "idem-close",
      payload: { reason: "Finalizado" },
    });
    expect(() => append(started(), close)).toThrowError(/resultado verificado/i);

    const cancelled = append(
      started(),
      base({
        eventId: "evt-cancel",
        caseId: "case-1",
        type: "CASE_CANCELLED",
        occurredAt: iso,
        recordedAt: iso,
        actor: { kind: "client" },
        idempotencyKey: "idem-cancel",
        payload: { reason: "No continuar" },
      }),
    );
    expect(cancelled.projection.stage).toBe("cancelled");
    expect(cancelled.projection.capabilities.resolutionRecorded).toBe(false);
  });

  it("blocks ordinary events after terminal state and reopens without losing history", () => {
    let history = started();
    history = append(history, resolution()).history;
    history = append(history, outcome()).history;
    history = append(
      history,
      base({
        eventId: "evt-close-ok",
        caseId: "case-1",
        type: "CASE_CLOSED",
        occurredAt: iso,
        recordedAt: iso,
        actor: { kind: "admin" },
        idempotencyKey: "idem-close-ok",
        payload: { reason: "Resultado verificado" },
      }),
    ).history;

    expect(replayCaseHistory(history).stage).toBe("closed");
    expect(() => append(history, auth("case-1", "idem-auth-after-close"))).toThrowError(/debe reabrirse/i);

    const reopened = append(
      history,
      base({
        eventId: "evt-reopen",
        caseId: "case-1",
        type: "CASE_REOPENED",
        occurredAt: iso,
        recordedAt: iso,
        actor: { kind: "client" },
        idempotencyKey: "idem-reopen",
        payload: { reason: "Nueva evidencia" },
      }),
    );
    expect(reopened.history).toHaveLength(history.length + 1);
    expect(reopened.projection.stage).toBe("resolved_verified");
    expect(reopened.projection.terminalReason).toBeNull();
  });

  it("preserves route/status/precision/track origin through replay", () => {
    let history = started();
    history = append(history, auth()).history;
    history = append(history, attach()).history;
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