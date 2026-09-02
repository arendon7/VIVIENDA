import { PrecisionBadge, StatusBadge, type StatusTone } from "@/components/vivienda/signature-components";
import type {
  LoanHealthDimensionStatus,
  LoanHealthResult,
} from "@/domain/loan-health/evaluator";
import styles from "./loan-health-panel.module.css";

const statusLabels: Record<LoanHealthDimensionStatus, string> = {
  ready: "Lista para comparar",
  explore: "Explorar",
  needs_data: "Faltan datos",
  seasonal: "Ventana estacional",
  attention: "Requiere atención",
  professional_review: "Revisión profesional",
  no_flag_reported: "Sin alerta reportada",
  not_applicable: "No aplica en esta evaluación",
};

function statusTone(status: LoanHealthDimensionStatus): StatusTone {
  if (status === "attention") return "attention";
  if (status === "professional_review") return "professional";
  if (status === "ready") return "positive";
  if (status === "explore" || status === "seasonal") return "opportunity";
  if (status === "needs_data") return "info";
  return "neutral";
}

export function LoanHealthPanel({ result }: { result: LoanHealthResult }) {
  return (
    <section className={`surface ${styles.panel}`} aria-labelledby="loan-health-title">
      <div className={styles.header}>
        <div>
          <p className="eyebrow">Mi Situación · estado de decisión</p>
          <h2 id="loan-health-title" className="cc-display">{result.headline}</h2>
          <p className="section-copy">
            No es un score crediticio ni de riesgo. Resume qué entendemos, qué merece atención y qué acción puede compararse con la evidencia disponible.
          </p>
        </div>
        <PrecisionBadge level={result.precision} />
      </div>

      <div className={styles.list}>
        {result.dimensions.map((dimension) => (
          <article
            className={styles.dimension}
            key={dimension.code}
            data-loan-health-dimension={dimension.code}
            data-source-route-codes={dimension.sourceRouteCodes.join(",")}
          >
            <div className={styles.dimensionHeader}>
              <h3 className="cc-display">{dimension.label}</h3>
              <StatusBadge
                tone={statusTone(dimension.status)}
                ariaLabel={`${dimension.label}: ${statusLabels[dimension.status]}`}
              >
                {statusLabels[dimension.status]}
              </StatusBadge>
            </div>
            <p>{dimension.explanation}</p>
            <div className={styles.nextAction}>
              <strong>Siguiente acción</strong>
              <span>{dimension.nextAction}</span>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.notices} aria-label="Límites de esta lectura">
        {result.notices.map((notice) => <p key={notice}>{notice}</p>)}
      </div>
    </section>
  );
}
