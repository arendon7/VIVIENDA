"use client";

import type {
  ExecutionIntentCode,
  ExecutionIntentResolution,
} from "@/domain/execution-intent/resolver";

export function ExecutionIntentPanel({
  resolution,
  onSelect,
  onClose,
}: {
  resolution: ExecutionIntentResolution;
  onSelect: (intentCode: ExecutionIntentCode) => void;
  onClose: () => void;
}) {
  return (
    <section
      className="surface result-frame"
      style={{ marginTop: 24 }}
      aria-labelledby="execution-intent-title"
      data-execution-intent-gate
    >
      <div className="section-header">
        <div>
          <p className="eyebrow">Cómo quieres avanzar · vista local</p>
          <h2 id="execution-intent-title">Elige cómo quieres preparar el siguiente paso.</h2>
          <p className="section-copy">
            La ruta ya está elegida. Ahora define cómo quieres organizarla antes de abrir el plan. Ninguna opción de esta vista crea un expediente, contrata un servicio ni ejecuta una actuación ante terceros.
          </p>
        </div>
      </div>

      <div className="extraction-list" style={{ marginTop: 20 }}>
        {resolution.options.map((option) => (
          <article
            className="extraction-row"
            key={option.code}
            data-execution-intent-option={option.code}
          >
            <div>
              <strong>{option.title}</strong>
              <p className="section-copy">{option.description}</p>
            </div>
            <div className="extraction-actions" style={{ alignItems: "stretch" }}>
              {option.requiresServiceAgreementBeforeRealService ? (
                <p className="field-hint">
                  Si esta modalidad se activa de forma real en el futuro, requerirá una aceptación de servicio separada antes de cualquier prestación profesional.
                </p>
              ) : null}
              {option.requiresDataAuthorizationBeforeEvidencePersistence ? (
                <p className="field-hint">
                  Guardar evidencia en un expediente real requerirá autorización de tratamiento de datos; elegir esta opción no la registra.
                </p>
              ) : null}
              <div className="actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => onSelect(option.code)}
                >
                  {option.title}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="surface-warning" style={{ marginTop: 20 }}>
        <strong>Esta elección solo organiza el plan.</strong>
        <p>
          No registra autorización de datos, aceptación contractual, poder, radicación, pago ni relación profesional.
        </p>
      </div>

      <div className="actions" style={{ marginTop: 20 }}>
        <button className="button button-secondary" type="button" onClick={onClose}>
          Volver a Mi Decisión
        </button>
      </div>
    </section>
  );
}
