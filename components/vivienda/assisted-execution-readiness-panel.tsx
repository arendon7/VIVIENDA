import type {
  AssistedExecutionReadiness,
  AssistedExecutionReadinessStepState,
} from "@/domain/assisted-execution/readiness";

const stepStateLabels: Record<AssistedExecutionReadinessStepState, string> = {
  next_real_step: "Primer paso real",
  blocked_until_previous: "Después del paso anterior",
};

export function AssistedExecutionReadinessPanel({
  readiness,
}: {
  readiness: AssistedExecutionReadiness;
}) {
  return (
    <section
      className="surface"
      style={{ marginTop: 24, padding: 20 }}
      aria-labelledby="assisted-readiness-title"
      data-assisted-execution-readiness={readiness.routeCode}
    >
      <div className="section-header">
        <div>
          <p className="eyebrow">Acompañamiento · preparación operativa</p>
          <h3 id="assisted-readiness-title">Qué tendría que ocurrir para iniciar este acompañamiento de verdad.</h3>
          <p className="section-copy">
            Elegiste revisar esta diferencia con acompañamiento. Esta vista solo muestra el orden y los controles que tendría el servicio; todavía no abre un expediente, no acepta condiciones y no guarda documentos.
          </p>
        </div>
        <span className="status-chip">Preparación pendiente</span>
      </div>

      <div className="surface-warning" role="status" style={{ marginTop: 18 }}>
        <strong>Ningún paso operativo ha ocurrido todavía.</strong>
        <p>
          No existe expediente real, autorización de datos registrada, servicio aceptado, evidencia persistida, poder ni revisión profesional completada.
        </p>
      </div>

      <div className="metric-grid" style={{ marginTop: 20 }} aria-label="Estado real del acompañamiento">
        <div><span className="metric-label">Expediente real</span><strong>No</strong></div>
        <div><span className="metric-label">Autorización de datos</span><strong>No</strong></div>
        <div><span className="metric-label">Servicio aceptado</span><strong>No</strong></div>
        <div><span className="metric-label">Revisión profesional completada</span><strong>No</strong></div>
      </div>

      <div style={{ marginTop: 26 }}>
        <p className="eyebrow">Orden de preparación</p>
        <div className="extraction-list" aria-label="Pasos para preparar el acompañamiento">
          {readiness.steps.map((step, index) => (
            <article
              className="extraction-row"
              key={step.eventType}
              aria-label={`Paso ${index + 1}: ${step.label}`}
              data-readiness-event={step.eventType}
            >
              <div>
                <div className="extraction-heading">
                  <strong>Paso {index + 1} · {step.label}</strong>
                  <span className="status-chip">{stepStateLabels[step.state]}</span>
                </div>
                <p className="field-hint">{step.purpose}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="surface" style={{ marginTop: 22, padding: 18 }}>
        <p className="eyebrow">Documentos que orientan la auditoría</p>
        <p className="field-hint">
          Esta lista viene de la ruta R7 actual. Mostrarla no significa que los documentos hayan sido cargados, conservados o verificados.
        </p>
        <ul>
          {readiness.evidenceChecklist.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>

      <div className="surface-warning" style={{ marginTop: 20 }}>
        <strong>Límites del acompañamiento mostrado</strong>
        <ul>{readiness.notices.map((notice) => <li key={notice}>{notice}</li>)}</ul>
      </div>
    </section>
  );
}
