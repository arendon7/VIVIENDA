import { PrecisionBadge } from "@/components/vivienda/signature-components";
import { buildMortgageAuditBlueprint } from "@/domain/assisted-execution/mortgage-audit";
import {
  evaluateOpportunityRoutes,
  type OpportunityRouterInput,
} from "@/domain/opportunity/router";
import styles from "./auditoria.module.css";

const demoInput: OpportunityRouterInput = {
  asOfDate: "2026-08-26",
  precision: "C2",
  productType: "mortgage_housing",
  modality: "pesos",
  paymentState: "current",
  unexplainedChargeOrAllocationIssue: true,
};

const demoBlueprint = buildMortgageAuditBlueprint(
  evaluateOpportunityRoutes(demoInput),
  demoInput.asOfDate,
);

const findingLabels = {
  explained: "La diferencia puede explicarse con la evidencia",
  needs_more_evidence: "Falta evidencia para concluir",
  possible_inconsistency: "Hay una diferencia que merece actuación o revisión",
  route_change_required: "Los hechos obligan a re-rutear antes de seguir",
};

export default function AuditoriaHipotecariaPage() {
  return (
    <>
      <header className="shell site-header">
        <a className="brand" href="/">VIVIENDA</a>
        <nav aria-label="Auditoría Hipotecaria">
          <a className="nav-link" href="/mi-vivienda">Mi Vivienda</a>
          <a className="nav-link" href="/verificar">Extracto como guía</a>
        </nav>
      </header>

      <main id="contenido" className={`shell ${styles.main}`}>
        <section className={styles.previewNotice} aria-label="Estado de esta ruta">
          <strong>Preview de servicio asistido · no contratado</strong>
          <span>No crea poder, representación, reclamación ni radicación. El flujo productivo de contratación/pago todavía no está activo.</span>
        </section>

        <section className={styles.hero}>
          <div>
            <p className="eyebrow">Auditoría Hipotecaria · R7</p>
            <h1>Entiende una diferencia concreta antes de escalar.</h1>
            <p className="lede">
              Esta preview muestra cómo se organizaría la evidencia, qué tendría que verificar una revisión profesional y cómo se decidiría si basta una explicación, falta información o existe una inconsistencia que merece actuación.
            </p>
            <div className="actions">
              <a className="button button-primary" href="#evidence-heading">Ver qué evidencia preparar</a>
              <a className="button button-secondary" href="/mi-vivienda">Volver a Mi Vivienda</a>
            </div>
          </div>

          <aside className={`surface ${styles.routeState}`} aria-label="Estado del ejemplo">
            <div className={styles.routeHeader}>
              <div>
                <p className="instrument-label">Ruta de origen</p>
                <strong>R7 · Auditoría / posible reclamación</strong>
              </div>
              <PrecisionBadge level={demoBlueprint.precision} />
            </div>
            <dl className={styles.routeFacts}>
              <div><dt>Track</dt><dd>Assisted</dd></div>
              <div><dt>Revisión profesional</dt><dd>Requerida</dd></div>
              <div><dt>Facultad extrajudicial</dt><dd>No concedida</dd></div>
              <div><dt>Poder judicial</dt><dd>No concedido</dd></div>
            </dl>
          </aside>
        </section>

        <section className={styles.section} aria-labelledby="trigger-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">Cuándo aparece</p>
              <h2 id="trigger-heading">Primero debe existir un hecho concreto.</h2>
              <p className="section-copy">Una sospecha general no se convierte en reclamación. R7 nace cuando el router identifica una diferencia específica que puede documentarse.</p>
            </div>
          </div>
          <div className={styles.triggerGrid}>
            <article className="surface"><strong>Cobro no explicado</strong><p>Un concepto o valor necesita conciliación.</p></article>
            <article className="surface"><strong>Aplicación de un abono</strong><p>El resultado observado no coincide con la instrucción reportada.</p></article>
            <article className="surface"><strong>Documento vs. condición</strong><p>Existe una diferencia material entre fuentes relevantes.</p></article>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="evidence-heading">
          <div className={`surface ${styles.evidencePanel}`}>
            <div className={styles.sectionHeading}>
              <div>
                <p className="eyebrow">Evidencia</p>
                <h2 id="evidence-heading">Pedimos lo necesario para aislar la diferencia.</h2>
              </div>
            </div>
            <ul className={styles.checklist}>
              {demoBlueprint.evidenceChecklist.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <p className={styles.boundaryNote}>Esta fase no exige cédula, poder judicial o documentos de proceso si no son necesarios para el hecho revisado.</p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="process-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">Proceso previsto</p>
              <h2 id="process-heading">Una auditoría real tendría que avanzar por evidencia, no por promesas.</h2>
            </div>
          </div>
          <ol className={styles.phaseList}>
            {demoBlueprint.casePlan.phases.map((phase, index) => (
              <li className="surface" key={phase.code}>
                <span className={styles.phaseIndex}>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{phase.title}</h3>
                  <ul>
                    {phase.tasks.map((task) => <li key={task.code}>{task.title}</li>)}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="result-heading">
          <div className={`surface ${styles.resultPanel}`}>
            <div className={styles.sectionHeading}>
              <div>
                <p className="eyebrow">Resultado profesional previsto</p>
                <h2 id="result-heading">Una revisión profesional no necesita “encontrar algo ilegal” para ser útil.</h2>
                <p className="section-copy">El entregable previsto separaría hechos, evidencia, incertidumbre y siguiente ruta. Estos son los únicos estados contemplados en esta preview v0.12.</p>
              </div>
            </div>
            <div className={styles.findingGrid}>
              {demoBlueprint.allowedFindingStatuses.map((status) => (
                <article key={status}>
                  <code>{status}</code>
                  <strong>{findingLabels[status]}</strong>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="events-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">Ejecución segura</p>
              <h2 id="events-heading">Qué tendría que ocurrir para que el servicio sea real.</h2>
            </div>
          </div>
          <ol className={styles.eventList}>
            {demoBlueprint.executionSteps.map((step, index) => (
              <li key={step.eventType}>
                <span>{index + 1}</span>
                <div><strong>{step.eventType}</strong><p>{step.purpose}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.boundaries} aria-labelledby="boundaries-heading">
          <div>
            <p className="eyebrow">Límites</p>
            <h2 id="boundaries-heading">Aceptar una auditoría no equivale a contratar representación.</h2>
          </div>
          <ul>
            <li>No concede facultad extrajudicial.</li>
            <li>No concede poder judicial.</li>
            <li>No registra una reclamación como radicada.</li>
            <li>No garantiza ahorro, corrección o resultado.</li>
            <li>Si aparece un proceso ejecutivo, el sistema debe re-rutear a R10 antes de continuar.</li>
          </ul>
        </section>

        <section className={styles.endState}>
          <div>
            <p className="eyebrow">Primer paso</p>
            <h2>Empieza por preparar la evidencia, no por firmar un poder.</h2>
            <p className="section-copy">La ruta productiva futura pedirá autorización y acuerdo de servicio antes de persistir evidencia o iniciar revisión profesional.</p>
          </div>
          <a className="button button-primary" href="#evidence-heading">Ver qué evidencia preparar</a>
        </section>
      </main>

      <footer className="shell site-footer">
        VIVIENDA · Auditoría Hipotecaria v0.12 · Preview sin contratación ni representación activa.
      </footer>
    </>
  );
}
