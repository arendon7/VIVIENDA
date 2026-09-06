import {
  createDecisionBrief,
  type DecisionObject,
} from "@/domain/decision-object/evaluator";

const statusLabels = {
  eligible_now: "Se puede activar ahora",
  candidate: "Vale la pena evaluar",
  seasonal_wait: "Depende de una ventana",
  not_recommended: "No recomendado",
  legal_review: "Revisión profesional necesaria",
} as const;

export function DecisionBriefPanel({ decision }: { decision: DecisionObject }) {
  const brief = createDecisionBrief(decision);
  const governing = decision.governingRouteCode
    ? decision.options.find((option) => option.routeCode === decision.governingRouteCode) ?? null
    : null;

  return (
    <section
      className="surface form-card"
      style={{ marginTop: 30 }}
      aria-labelledby="decision-brief-title"
      aria-live="polite"
      data-decision-state={decision.state}
    >
      <div className="section-header">
        <div>
          <p className="eyebrow">Mi Decisión · vista previa local</p>
          <h3 id="decision-brief-title">{brief.statusLabel}</h3>
          <p className="section-copy">{brief.summary}</p>
        </div>
        <div className="actions" aria-label="Estado de Mi Decisión">
          {decision.decisionPrecision ? (
            <span className="status-chip">{decision.decisionPrecision} · ruta que gobierna</span>
          ) : null}
          {decision.requiresProfessionalReview ? (
            <span className="material-chip">Revisión profesional</span>
          ) : null}
        </div>
      </div>

      {governing ? (
        <div className="result-callout" style={{ marginTop: 18 }}>
          <strong>Qué gobierna el siguiente paso</strong>
          <p className="section-copy">
            {governing.title} · {statusLabels[governing.status]} · precisión {governing.precision}.
          </p>
          {brief.nextAction ? <p className="section-copy">{brief.nextAction}</p> : null}
        </div>
      ) : null}

      {decision.options.length > 0 ? (
        <div style={{ marginTop: 20 }}>
          <strong>Opciones que siguen sobre la mesa</strong>
          <div className="extraction-list" style={{ marginTop: 12 }}>
            {decision.options.map((option) => (
              <div className="extraction-row" key={option.routeCode} data-decision-option={option.routeCode}>
                <div>
                  <strong>{option.title}</strong>
                  <p className="field-hint">
                    {statusLabels[option.status]} · precisión {option.precision}
                    {decision.selectedRouteCode === option.routeCode ? " · preferencia actual" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {brief.verificationNeeds.length > 0 ? (
        <div className="surface-warning" style={{ marginTop: 18 }}>
          <strong>Qué falta verificar o resolver</strong>
          <ul>
            {brief.verificationNeeds.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}

      {decision.warnings.length > 0 ? (
        <div style={{ marginTop: 18 }}>
          <strong>Advertencias de esta decisión</strong>
          <ul>
            {decision.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      ) : null}

      <details style={{ marginTop: 18 }}>
        <summary>Qué significa —y qué no significa— esta vista</summary>
        <ul>
          {brief.disclosures.map((disclosure) => <li key={disclosure}>{disclosure}</li>)}
        </ul>
      </details>
    </section>
  );
}
