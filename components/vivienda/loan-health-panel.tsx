import { PrecisionBadge } from "@/components/vivienda/signature-components";
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
  not_applicable: "No aplica en este rulebook",
};

function statusClass(status: LoanHealthDimensionStatus) {
  if (status === "attention") return styles.attention;
  if (status === "professional_review") return styles.professional;
  if (status === "ready") return styles.ready;
  return styles.neutral;
}

export function LoanHealthPanel({ result }: { result: LoanHealthResult }) {
  return (
    <section className={`surface ${styles.panel}`} aria-labelledby="loan-health-title">
      <div className={styles.header}>
        <div>
          <p className="eyebrow">Loan Health V1 · cualitativo</p>
          <h2 id="loan-health-title">{result.headline}</h2>
          <p className="section-copy">
            No es un score crediticio ni de riesgo. Resume qué entendemos, qué merece atención y qué acción puede compararse con la evidencia disponible.
          </p>
        </div>
        <PrecisionBadge level={result.precision} />
      </div>

      <div className={styles.list}>
        {result.dimensions.map((dimension) => (
          <article className={styles.dimension} key={dimension.code}>
            <div className={styles.dimensionHeader}>
              <h3>{dimension.label}</h3>
              <span className={`${styles.status} ${statusClass(dimension.status)}`}>
                {statusLabels[dimension.status]}
              </span>
            </div>
            <p>{dimension.explanation}</p>
            <div className={styles.nextAction}>
              <strong>Siguiente acción</strong>
              <span>{dimension.nextAction}</span>
            </div>
            {dimension.sourceRouteCodes.length > 0 ? (
              <div className={styles.sourceRoutes}>
                Fuente de decisión: {dimension.sourceRouteCodes.join(" · ")}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <div className={styles.notices} aria-label="Límites de Loan Health">
        {result.notices.map((notice) => <p key={notice}>{notice}</p>)}
      </div>
    </section>
  );
}
