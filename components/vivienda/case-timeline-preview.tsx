"use client";

import { useMemo, useState } from "react";
import {
  appendCaseEvent,
  replayCaseHistory,
  type CaseActorKind,
  type CaseEvent,
  type CaseEventDraft,
  type CaseStage,
  type CaseTrack,
} from "@/domain/case-state/machine";
import type { OpportunityRoute } from "@/domain/opportunity/router";

const actorLabels: Record<CaseActorKind, string> = {
  client: "Cliente",
  lawyer: "Abogado",
  admin: "Administración",
  system: "Casa con Criterio",
  external_recorded: "Tercero registrado",
};

const stageLabels: Record<CaseStage, string> = {
  draft: "Borrador",
  collecting_evidence: "Recopilando evidencia",
  ready_for_review: "Listo para revisión",
  under_review: "En revisión",
  ready_to_prepare: "Listo para preparar",
  preparing_submission: "Preparando solicitud",
  awaiting_response: "Esperando respuesta",
  response_received: "Respuesta recibida",
  response_under_review: "Respuesta en revisión",
  response_reviewed: "Respuesta revisada",
  negotiating: "Negociación",
  escalation_review: "Revisión de escalamiento",
  resolved_unverified: "Resultado sin verificar",
  resolved_verified: "Resultado verificado",
  closed: "Cerrado",
  cancelled: "Cancelado",
};

const routeStatusLabels: Record<OpportunityRoute["status"], string> = {
  eligible_now: "Se puede activar ahora",
  candidate: "Vale la pena evaluar",
  seasonal_wait: "Preparación estacional",
  not_recommended: "No recomendada",
  legal_review: "Revisión jurídica",
};

const trackLabels: Record<CaseTrack, string> = {
  self_service: "Autogestión",
  assisted: "Acompañamiento",
  legal: "Revisión jurídica",
};

const eventLabels: Record<CaseEvent["type"], string> = {
  CASE_CREATED: "Expediente local creado",
  DATA_AUTHORIZATION_RECORDED: "Autorización de datos registrada",
  EVIDENCE_REQUESTED: "Evidencia solicitada",
  EVIDENCE_ATTACHED: "Evidencia adjunta",
  EVIDENCE_VERIFIED: "Evidencia verificada",
  PROFESSIONAL_REVIEW_REQUESTED: "Revisión profesional solicitada",
  PROFESSIONAL_REVIEW_COMPLETED: "Revisión profesional completada",
  SERVICE_AGREEMENT_ACCEPTED: "Servicio aceptado",
  EXTRAJUDICIAL_AUTHORITY_VERIFIED: "Facultad extrajudicial verificada",
  JUDICIAL_POWER_VERIFIED: "Poder judicial verificado",
  SUBMISSION_PREPARED: "Solicitud preparada",
  SUBMISSION_RECORDED: "Radicación registrada",
  RESPONSE_RECORDED: "Respuesta registrada",
  RESPONSE_REVIEW_STARTED: "Revisión de respuesta iniciada",
  RESPONSE_REVIEW_COMPLETED: "Revisión de respuesta completada",
  NEGOTIATION_STARTED: "Negociación iniciada",
  ESCALATION_REVIEW_STARTED: "Revisión de escalamiento iniciada",
  RESOLUTION_RECORDED: "Resultado registrado",
  OUTCOME_VERIFIED: "Resultado verificado",
  CASE_CLOSED: "Expediente cerrado",
  CASE_REOPENED: "Expediente reabierto",
  CASE_CANCELLED: "Expediente cancelado",
};

function trackFor(route: OpportunityRoute): CaseTrack {
  return route.humanReviewRequired || route.status === "legal_review" ? "legal" : "self_service";
}

function fixedTimestamp(asOfDate: string) {
  return `${asOfDate}T12:00:00-05:00`;
}

function startHistory(route: OpportunityRoute, asOfDate: string): CaseEvent[] {
  const caseId = `demo-${route.routeCode.toLowerCase()}`;
  const timestamp = fixedTimestamp(asOfDate);
  return appendCaseEvent({
    history: [],
    expectedVersion: 0,
    event: {
      eventId: `${caseId}-evt-1`,
      caseId,
      type: "CASE_CREATED",
      occurredAt: timestamp,
      recordedAt: timestamp,
      actor: { kind: "system" },
      idempotencyKey: `${caseId}-create`,
      payload: {
        routeCode: route.routeCode,
        routeStatus: route.status,
        precision: route.precision,
        track: trackFor(route),
      },
    },
  }).history;
}

function capabilityLabel(active: boolean) {
  return active ? "Sí" : "No";
}

export function CaseTimelinePreview({ route, asOfDate }: { route: OpportunityRoute; asOfDate: string }) {
  const [history, setHistory] = useState<CaseEvent[]>(() => startHistory(route, asOfDate));
  const projection = useMemo(() => replayCaseHistory(history), [history]);
  const caseId = projection.caseId;
  const timestamp = fixedTimestamp(asOfDate);

  function appendDemo(event: CaseEventDraft) {
    const result = appendCaseEvent({
      history,
      expectedVersion: history.length,
      event,
    });
    setHistory(result.history);
  }

  function nextIdentity(slug: string) {
    const sequence = history.length + 1;
    return {
      eventId: `${caseId}-evt-${sequence}-${slug}`,
      idempotencyKey: `${caseId}-${sequence}-${slug}`,
    };
  }

  function simulateDataAuthorization() {
    const identity = nextIdentity("data-auth");
    appendDemo({
      ...identity,
      caseId,
      type: "DATA_AUTHORIZATION_RECORDED",
      occurredAt: timestamp,
      recordedAt: timestamp,
      actor: { kind: "client" },
      payload: { consentVersion: "demo-privacy-v1" },
    });
  }

  function simulateEvidence() {
    const identity = nextIdentity("statement");
    appendDemo({
      ...identity,
      caseId,
      type: "EVIDENCE_ATTACHED",
      occurredAt: timestamp,
      recordedAt: timestamp,
      actor: { kind: "client" },
      payload: {
        evidenceId: "demo-statement-1",
        kind: "statement",
        label: "Extracto hipotecario de demostración",
      },
    });
  }

  function simulateReviewRequest() {
    const identity = nextIdentity("review-request");
    appendDemo({
      ...identity,
      caseId,
      type: "PROFESSIONAL_REVIEW_REQUESTED",
      occurredAt: timestamp,
      recordedAt: timestamp,
      actor: { kind: "system" },
      payload: { reason: "La ruta actual exige o recomienda revisión humana." },
    });
  }

  function simulateServiceAcceptance() {
    const identity = nextIdentity("service");
    appendDemo({
      ...identity,
      caseId,
      type: "SERVICE_AGREEMENT_ACCEPTED",
      occurredAt: timestamp,
      recordedAt: timestamp,
      actor: { kind: "client" },
      payload: { agreementVersion: "demo-services-v1" },
    });
  }

  function simulateExtrajudicialAuthority() {
    const identity = nextIdentity("authority");
    appendDemo({
      ...identity,
      caseId,
      type: "EXTRAJUDICIAL_AUTHORITY_VERIFIED",
      occurredAt: timestamp,
      recordedAt: timestamp,
      actor: { kind: "admin" },
      evidenceRefs: ["demo://authorization-extrajudicial"],
      payload: { scope: "Demostración de facultad extrajudicial para gestión ante entidad." },
    });
  }

  const c = projection.capabilities;

  return (
    <section className="surface result-frame" style={{ marginTop: 24 }} aria-labelledby="case-timeline-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">Historial del expediente · demostración local</p>
          <h3 id="case-timeline-title">Así se reconstruiría el expediente a partir de hechos registrados.</h3>
          <p className="section-copy">
            Los eventos de este panel son simulados y viven solo en esta sesión. Sirven para mostrar cómo cambia el estado del expediente sin reescribir hechos anteriores; no crean un expediente real.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="status-chip">Versión {projection.version}</span>
          <span className="status-chip">{stageLabels[projection.stage]}</span>
          <span className="material-chip">SIMULADO</span>
        </div>
      </div>

      <div className="surface-warning" style={{ marginTop: 18 }}>
        <strong>No es una radicación ni una aceptación contractual real.</strong>
        <p>
          Esta demostración no guarda documentos, no contacta bancos, no otorga poder y no registra actuaciones fuera de esta vista local.
        </p>
      </div>

      <div
        className="surface"
        style={{ marginTop: 20, padding: 20 }}
        data-case-origin
        data-route-code={projection.origin.routeCode}
        data-route-status={projection.origin.routeStatus}
        data-track={projection.origin.track}
      >
        <p className="eyebrow">Punto de partida</p>
        <div className="metric-grid">
          <div><span className="metric-label">Opción</span><strong>{route.title}</strong></div>
          <div><span className="metric-label">Estado de la opción</span><strong>{routeStatusLabels[projection.origin.routeStatus]}</strong></div>
          <div><span className="metric-label">Precisión</span><strong>{projection.origin.precision}</strong></div>
          <div><span className="metric-label">Tipo de acompañamiento</span><strong>{trackLabels[projection.origin.track]}</strong></div>
        </div>
      </div>

      <div className="surface" style={{ marginTop: 20, padding: 20 }} aria-label="Capacidades separadas del expediente">
        <p className="eyebrow">Qué está realmente habilitado</p>
        <div className="metric-grid">
          <div><span className="metric-label">Autorización de datos</span><strong>{capabilityLabel(c.dataAuthorizationRecorded)}</strong></div>
          <div><span className="metric-label">Servicio aceptado</span><strong>{capabilityLabel(c.serviceAgreementAccepted)}</strong></div>
          <div><span className="metric-label">Facultad extrajudicial</span><strong>{capabilityLabel(c.extrajudicialAuthorityVerified)}</strong></div>
          <div><span className="metric-label">Poder judicial</span><strong>{capabilityLabel(c.judicialPowerVerified)}</strong></div>
          <div><span className="metric-label">Revisión profesional</span><strong>{capabilityLabel(c.professionalReviewCompleted)}</strong></div>
          <div><span className="metric-label">Radicación real</span><strong>{capabilityLabel(c.submissionRecorded)}</strong></div>
          <div><span className="metric-label">Respuesta real</span><strong>{capabilityLabel(c.responseRecorded)}</strong></div>
          <div><span className="metric-label">Resultado verificado</span><strong>{capabilityLabel(c.outcomeVerified)}</strong></div>
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <p className="eyebrow">Probar eventos seguros en esta demostración</p>
        <div className="actions" style={{ flexWrap: "wrap" }}>
          {!c.dataAuthorizationRecorded ? (
            <button className="button button-secondary" type="button" onClick={simulateDataAuthorization}>
              Simular autorización de datos
            </button>
          ) : null}
          {c.dataAuthorizationRecorded && projection.attachedEvidenceIds.length === 0 ? (
            <button className="button button-secondary" type="button" onClick={simulateEvidence}>
              Simular carga de extracto
            </button>
          ) : null}
          {route.humanReviewRequired && !c.professionalReviewRequested ? (
            <button className="button button-secondary" type="button" onClick={simulateReviewRequest}>
              Simular solicitud de revisión
            </button>
          ) : null}
          {projection.origin.track !== "self_service" && !c.serviceAgreementAccepted ? (
            <button className="button button-secondary" type="button" onClick={simulateServiceAcceptance}>
              Simular aceptación del servicio
            </button>
          ) : null}
          {c.serviceAgreementAccepted && !c.extrajudicialAuthorityVerified ? (
            <button className="button button-secondary" type="button" onClick={simulateExtrajudicialAuthority}>
              Simular verificación extrajudicial
            </button>
          ) : null}
        </div>
        {c.professionalReviewRequested && !c.professionalReviewCompleted ? (
          <p className="field-hint" style={{ marginTop: 12 }}>
            La revisión fue solicitada, pero esta demostración no puede marcarla automáticamente como completada: debe completarla un profesional autorizado.
          </p>
        ) : null}
      </div>

      <div style={{ marginTop: 28 }}>
        <p className="eyebrow">Historial de hechos</p>
        <div className="extraction-list" aria-label="Historial local del expediente">
          {[...history].reverse().map((item) => (
            <article
              className="extraction-row"
              key={item.eventId}
              aria-label={`Evento ${item.sequence}: ${eventLabels[item.type]}`}
              data-event-type={item.type}
              data-idempotency-key={item.idempotencyKey}
            >
              <div>
                <div className="extraction-heading">
                  <strong>#{item.sequence} · {eventLabels[item.type]}</strong>
                  <span className="material-chip">{actorLabels[item.actor.kind]}</span>
                </div>
              </div>
              <div className="extraction-actions">
                <p className="field-hint">Evidencias relacionadas: {item.evidenceRefs?.length ?? 0}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
