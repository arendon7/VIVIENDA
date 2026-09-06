"use client";

import { useState } from "react";
import { CaseTimelinePreview } from "@/components/vivienda/case-timeline-preview";
import { ExecutionIntentPanel } from "@/components/vivienda/execution-intent-panel";
import { buildCasePlan, type CasePlanActor, type CasePlanPhaseState, type CasePlanTaskState } from "@/domain/case-plan/planner";
import { buildDecisionActionProfile } from "@/domain/decision-object/action-profile";
import {
  resolveExecutionIntents,
  selectExecutionIntent,
  type ExecutionIntentCode,
  type ExecutionIntentSelection,
} from "@/domain/execution-intent/resolver";
import type { OpportunityRoute } from "@/domain/opportunity/router";

const actorLabels: Record<CasePlanActor, string> = {
  user: "Tú",
  system: "Casa con Criterio",
  professional: "Profesional",
  bank_or_third_party: "Banco / tercero",
};

const phaseStateLabels: Record<CasePlanPhaseState, string> = {
  ready: "Se puede preparar",
  blocked: "Tiene bloqueos",
  conditional: "Depende de un evento",
};

const taskStateLabels: Record<CasePlanTaskState, string> = {
  todo: "Por hacer",
  blocked: "Bloqueada",
  conditional: "Condicional",
};

const routeStatusLabels: Record<OpportunityRoute["status"], string> = {
  eligible_now: "Se puede activar ahora",
  candidate: "Vale la pena evaluar",
  seasonal_wait: "Preparación estacional",
  not_recommended: "No recomendada",
  legal_review: "Revisión jurídica",
};

const trackLabels: Record<ExecutionIntentSelection["caseTrack"], string> = {
  self_service: "Autogestión",
  assisted: "Acompañamiento",
  legal: "Revisión profesional",
};

export function CasePlanWorkspace({
  route,
  asOfDate,
  onClose,
}: {
  route: OpportunityRoute;
  asOfDate: string;
  onClose: () => void;
}) {
  const actionProfile = buildDecisionActionProfile(route, asOfDate);
  const executionResolution = resolveExecutionIntents(route, actionProfile);
  const [executionSelection, setExecutionSelection] = useState<ExecutionIntentSelection | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const plan = buildCasePlan(route, asOfDate);

  function chooseExecutionIntent(intentCode: ExecutionIntentCode) {
    setExecutionSelection(selectExecutionIntent(executionResolution, intentCode));
    setShowTimeline(false);
  }

  if (!executionSelection) {
    return (
      <ExecutionIntentPanel
        resolution={executionResolution}
        onSelect={chooseExecutionIntent}
        onClose={onClose}
      />
    );
  }

  const selectedOption = executionResolution.options.find(
    (option) => option.code === executionSelection.intentCode,
  );

  return (
    <section className="surface result-frame" style={{ marginTop: 24 }} aria-labelledby="case-plan-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">Plan de acción · vista local</p>
          <h2 id="case-plan-title">{plan.title}</h2>
          <p className="section-copy">{plan.objective}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="status-chip">{routeStatusLabels[plan.routeStatus]}</span>
          <span className="status-chip">{plan.precision} · precisión heredada</span>
          <span className="material-chip">{trackLabels[executionSelection.caseTrack]}</span>
        </div>
      </div>

      <div className="result-callout" style={{ marginTop: 18 }} data-selected-execution-intent={executionSelection.intentCode}>
        <strong>Forma elegida para organizar este plan</strong>
        <p className="section-copy">{selectedOption?.title ?? trackLabels[executionSelection.caseTrack]}.</p>
        <p className="field-hint">
          Esta elección sigue siendo local: no crea expediente, no registra autorización, no contrata un servicio y no ejecuta actuaciones ante terceros.
        </p>
      </div>

      <div className="surface-warning" role="status" style={{ marginTop: 20 }}>
        <strong>Vista local de planificación.</strong>
        <p>Este plan todavía no crea un expediente ni guarda tu información. Si sales o recargas, esta selección puede perderse.</p>
      </div>

      <div className="result-callout" style={{ marginTop: 18 }}>
        <strong>Próximo evento relevante</strong>
        {plan.nextEvent ? (
          <>
            <p className="section-copy">{plan.nextEvent.label}</p>
            <p className="field-hint">{plan.nextEvent.timingText}</p>
            {!plan.nextEvent.triggerEstablished ? (
              <p className="field-hint"><strong>El evento que inicia el plazo todavía no está acreditado.</strong> No mostramos una fecha límite inventada.</p>
            ) : null}
          </>
        ) : (
          <p className="section-copy">No hay un evento temporal definido con la evidencia actual.</p>
        )}
      </div>

      <div style={{ marginTop: 28 }}>
        <p className="eyebrow">Fases del plan</p>
        <div className="extraction-list">
          {plan.phases.map((phase, phaseIndex) => (
            <article className="extraction-row" key={phase.code} aria-label={`Fase ${phaseIndex + 1}: ${phase.title}`}>
              <div>
                <div className="extraction-heading">
                  <strong>Fase {phaseIndex + 1} · {phase.title}</strong>
                  <span className="status-chip">{phaseStateLabels[phase.state]}</span>
                </div>
              </div>

              <div className="extraction-actions" style={{ alignItems: "stretch" }}>
                {phase.tasks.map((item) => (
                  <div className="surface" key={item.code} style={{ padding: 16 }}>
                    <div className="extraction-heading">
                      <strong>{item.title}</strong>
                      <span className="material-chip">{actorLabels[item.actor]}</span>
                      <span className="status-chip">{taskStateLabels[item.state]}</span>
                    </div>
                    {item.explanation ? <p className="field-hint">{item.explanation}</p> : null}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="surface" style={{ marginTop: 24, padding: 20 }}>
        <p className="eyebrow">Evidencia y documentos</p>
        <h3>Qué conviene tener a mano</h3>
        <p className="field-hint">Esta lista no significa que los documentos estén cargados o guardados en Casa con Criterio.</p>
        <ul>
          {plan.evidenceChecklist.map((item) => (
            <li key={`${item.kind}-${item.label}`}>
              <strong>{item.kind === "known_required" ? "Requerido por esta opción" : item.kind === "conditional" ? "Si ocurre el evento" : "Recomendado"}:</strong> {item.label}
            </li>
          ))}
        </ul>
      </div>

      {plan.warnings.length > 0 ? (
        <div className="surface-warning" style={{ marginTop: 20 }}>
          <strong>Límites de este plan</strong>
          <ul>{plan.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </div>
      ) : null}

      <div className="surface" style={{ marginTop: 24, padding: 20 }}>
        <p className="eyebrow">Cómo seguiría este plan</p>
        <h3>Ver cómo podría convertirse en un expediente trazable.</h3>
        <p className="field-hint">
          El historial usa eventos locales simulados para demostrar trazabilidad, versionado y capacidades separadas sin reescribir eventos anteriores. No persiste datos ni ejecuta actuaciones reales.
        </p>
        <div className="actions" style={{ marginTop: 16 }}>
          <button className="button button-secondary" type="button" onClick={() => setShowTimeline((value) => !value)}>
            {showTimeline ? "Ocultar expediente local" : "Ver expediente local de demostración"}
          </button>
        </div>
      </div>

      {showTimeline ? (
        <CaseTimelinePreview
          route={route}
          asOfDate={asOfDate}
          caseTrack={executionSelection.caseTrack}
        />
      ) : null}

      <div className="actions" style={{ marginTop: 24 }}>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => {
            setExecutionSelection(null);
            setShowTimeline(false);
          }}
        >
          Cambiar forma de avanzar
        </button>
        <button className="button button-secondary" type="button" onClick={onClose}>Volver a oportunidades</button>
      </div>
    </section>
  );
}
