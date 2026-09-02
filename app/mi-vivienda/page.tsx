import { ProductFooter, ProductHeader } from "@/components/brand/ProductChrome";
import { LoanHealthPanel } from "@/components/vivienda/loan-health-panel";
import {
  FinancialNumber,
  PrecisionBadge,
  SourceFreshness,
} from "@/components/vivienda/signature-components";
import { evaluateLoanHealth } from "@/domain/loan-health/evaluator";
import {
  evaluateOpportunityRoutes,
  type OpportunityRouterInput,
} from "@/domain/opportunity/router";
import styles from "./mi-vivienda.module.css";

const demoRouterInput: OpportunityRouterInput = {
  asOfDate: "2026-08-26",
  precision: "C2",
  productType: "mortgage_housing",
  modality: "pesos",
  paymentState: "current",
  extraPaymentCapacity: 500_000,
  wantsFinishSooner: true,
};

const demoLoanHealth = evaluateLoanHealth({
  precision: demoRouterInput.precision,
  productType: demoRouterInput.productType,
  paymentState: demoRouterInput.paymentState,
  routerResult: evaluateOpportunityRoutes(demoRouterInput),
});

export default function MiViviendaPage() {
  return (
    <>
      <ProductHeader
        ariaLabel="Mi Vivienda"
        links={[
          { href: "/revisar", label: "Revisar crédito" },
          { href: "/verificar", label: "Verificar" },
        ]}
      />

      <main id="contenido" className={`shell ${styles.main}`}>
        <section className={styles.previewNotice} aria-label="Estado de esta vista">
          <strong>Preview de producto · sin cuenta ni persistencia activa</strong>
          <span>Los valores visibles son de demostración. Esta superficie no afirma que haya datos guardados, sincronizados ni verificados.</span>
        </section>

        <section className={styles.hero} aria-labelledby="mi-vivienda-title">
          <div>
            <p className="eyebrow">Mi Vivienda</p>
            <h1 id="mi-vivienda-title" className={`${styles.title} cc-display`}>Tu crédito, tus decisiones y lo que falta verificar.</h1>
            <p className="lede">
              Un lugar para entender el estado actual, comparar acciones y avanzar con más precisión sin confundir simulación, oferta externa o conclusión jurídica.
            </p>
          </div>
          <div className={`surface ${styles.currentState}`}>
            <div className={styles.stateHeader}>
              <div>
                <p className="instrument-label">Estado de precisión del ejemplo</p>
                <strong className={styles.stateTitle}>Simulación modelada</strong>
              </div>
              <PrecisionBadge level="C2" />
            </div>
            <p className="section-copy">
              Hay suficiente información confirmada para modelar el escenario soportado. Verificar documentalmente sigue siendo un paso distinto y necesario para C3.
            </p>
            <a className="button button-primary" href="/revisar">Comparar una decisión</a>
          </div>
        </section>

        <section className={styles.grid} aria-labelledby="twin-heading">
          <article className={`surface ${styles.twin}`}>
            <div className={styles.sectionHeading}>
              <div>
                <p className="eyebrow">Mi Situación · Mortgage Twin</p>
                <h2 id="twin-heading" className="cc-display">Estado actual conocido</h2>
              </div>
              <span className={styles.demoTag}>Datos de ejemplo</span>
            </div>

            <dl className={styles.facts}>
              <FinancialNumber label="Saldo" value="$180.000.000" detail="Declarado / ejemplo" />
              <FinancialNumber label="Cuota" value="$2.100.000" detail="Declarado / ejemplo" />
              <FinancialNumber label="Modalidad" value="Pesos" detail="Confirmada para la simulación" />
              <FinancialNumber label="Plazo restante" value="17 años" detail="Confirmado para la demo" />
              <FinancialNumber label="Tasa" value="11,7 % EA" detail="Confirmada para la demo" />
              <FinancialNumber label="Sistema" value="Cuota constante" detail="Caso soportado en C2" />
            </dl>

            <SourceFreshness
              source="Valores de demostración del Warm Path"
              sourceClass="calculation"
              cutoff="Preview v0.11"
              status="current"
            >
              <p>La superficie conserva provenance explícito. No representa un crédito real guardado ni verificado documentalmente.</p>
            </SourceFreshness>
          </article>

          <aside className={`surface ${styles.nextAction}`} aria-labelledby="next-action-heading">
            <p className="eyebrow">Siguiente mejor acción</p>
            <h2 id="next-action-heading" className="cc-display">Compara el prepago antes de buscar una solución externa.</h2>
            <p className="section-copy">
              El ejemplo ya tiene precisión C2 para el motor soportado y declara capacidad de abono. Primero conviene comparar reducción de plazo frente a reducción de cuota.
            </p>
            <ol className={styles.steps}>
              <li><span>1</span><div><strong>Simular</strong><p>Comparar la misma aportación bajo dos objetivos distintos.</p></div></li>
              <li><span>2</span><div><strong>Entender el efecto</strong><p>Separar capital aportado por ti de intereses futuros modelados.</p></div></li>
              <li><span>3</span><div><strong>Verificar si hace falta</strong><p>Subir a C3 antes de una decisión que requiera precisión documental.</p></div></li>
            </ol>
            <a className="button button-primary" href="/revisar">Simular prepago</a>
          </aside>
        </section>

        <section className={styles.section} aria-label="Loan Health">
          <LoanHealthPanel result={demoLoanHealth} />
        </section>

        <section className={styles.section} aria-labelledby="precision-heading">
          <div className={`surface ${styles.precisionPanel}`}>
            <div className={styles.sectionHeading}>
              <div>
                <p className="eyebrow">Ruta de precisión</p>
                <h2 id="precision-heading" className="cc-display">Más datos no siempre significa más verdad.</h2>
              </div>
            </div>
            <ol className={styles.precisionPath}>
              <li><PrecisionBadge level="C1" /><strong>Declarado</strong><span>Primera lectura con datos del usuario.</span></li>
              <li className={styles.activePrecision}><PrecisionBadge level="C2" /><strong>Modelado</strong><span>Supuestos suficientes para el motor compatible.</span></li>
              <li><PrecisionBadge level="C3" /><strong>Verificado</strong><span>Solo con evidencia documental real y reconciliada.</span></li>
            </ol>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="workspace-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">Workspace</p>
              <h2 id="workspace-heading" className="cc-display">El resto aparece cuando aporta a una decisión.</h2>
            </div>
          </div>
          <div className={styles.workspaceGrid}>
            <article className={`surface ${styles.workspaceItem}`}><strong>Simulaciones</strong><p>Escenarios comparables con supuestos visibles.</p><a href="/revisar">Abrir simulador</a></article>
            <article className={`surface ${styles.workspaceItem}`}><strong>Documentos</strong><p>La infraestructura segura existe provider-ready, pero el vault persistente aún no está activo.</p><a href="/verificar">Ver flujo de verificación</a></article>
            <article className={`surface ${styles.workspaceItem}`}><strong>Casos</strong><p>Un Case solo debe existir después de elegir una ejecución real; preparar una ruta no crea representación ni radicación.</p><span>Se habilitará en contexto</span></article>
          </div>
        </section>

        <section className={styles.endState}>
          <div>
            <p className="eyebrow">Continuar</p>
            <h2 className="cc-display">¿Quieres trabajar sobre un crédito real?</h2>
            <p className="section-copy">Empieza por el Quick Check. La primera lectura no requiere cédula, teléfono, correo ni extracto.</p>
          </div>
          <a className="button button-primary" href="/revisar">Revisar mi crédito</a>
        </section>
      </main>

      <ProductFooter
        lines={[
          "Mi Vivienda · preview de producto con precisión explícita.",
          "Simulaciones, Loan Health y rutas sin confundir orientación, oferta ni verificación.",
        ]}
      />
    </>
  );
}
