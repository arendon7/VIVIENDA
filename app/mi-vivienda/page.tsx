import {
  FinancialNumber,
  PrecisionBadge,
  SourceFreshness,
} from "@/components/vivienda/signature-components";
import styles from "./mi-vivienda.module.css";

const opportunities = [
  {
    label: "Prepago",
    status: "Listo para simular",
    title: "Compara qué pasa si aportas capital adicional.",
    copy: "El motor puede modelar reducción de plazo para el caso soportado en pesos y cuota constante cuando confirmas tasa y cuotas restantes.",
    href: "/revisar",
    action: "Simular escenario",
  },
  {
    label: "Precisión",
    status: "Requiere documento",
    title: "Verifica los datos materiales del crédito.",
    copy: "Para llegar a C3 necesitamos información derivada de documento y reconciliación completa; una confirmación manual no basta.",
    href: "/verificar",
    action: "Revisar un extracto",
  },
  {
    label: "Mercado",
    status: "Falta referencia externa",
    title: "Compra de cartera merece comparación, no una promesa.",
    copy: "Todavía no hay adapter bancario ni tasa externa activa. La oportunidad se mantiene como ruta futura, no como oferta o aprobación.",
  },
];

export default function MiViviendaPage() {
  return (
    <>
      <header className="shell site-header">
        <a className="brand" href="/">VIVIENDA</a>
        <nav aria-label="Mi Vivienda">
          <a className="nav-link" href="/revisar">Revisar crédito</a>
          <a className="nav-link" href="/verificar">Verificar</a>
        </nav>
      </header>

      <main id="contenido" className={`shell ${styles.main}`}>
        <section className={styles.previewNotice} aria-label="Estado de esta vista">
          <strong>Preview de producto · sin cuenta ni persistencia activa</strong>
          <span>Los valores visibles son de demostración. Esta superficie no afirma que haya datos guardados, sincronizados ni verificados.</span>
        </section>

        <section className={styles.hero} aria-labelledby="mi-vivienda-title">
          <div>
            <p className="eyebrow">Mi Vivienda</p>
            <h1 id="mi-vivienda-title" className={styles.title}>Tu crédito, tus decisiones y lo que falta verificar.</h1>
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
              Hay suficiente información confirmada para modelar un escenario compatible, pero todavía no para afirmar un estado documental C3.
            </p>
            <a className="button button-primary" href="/verificar">Subir de precisión</a>
          </div>
        </section>

        <section className={styles.grid} aria-labelledby="twin-heading">
          <article className={`surface ${styles.twin}`}>
            <div className={styles.sectionHeading}>
              <div>
                <p className="eyebrow">Mortgage Twin</p>
                <h2 id="twin-heading">Estado actual conocido</h2>
              </div>
              <span className={styles.demoTag}>Datos de ejemplo</span>
            </div>

            <dl className={styles.facts}>
              <FinancialNumber label="Saldo" value="$180.000.000" detail="Declarado / ejemplo" />
              <FinancialNumber label="Cuota" value="$2.100.000" detail="Declarado / ejemplo" />
              <FinancialNumber label="Modalidad" value="Pesos" detail="Confirmado para la simulación" />
              <FinancialNumber label="Plazo restante" value="17 años" detail="Aproximado" />
            </dl>

            <SourceFreshness source="Valores de demostración del Warm Path" cutoff="Preview v0.10">
              <p>La superficie conserva provenance explícito. No representa un crédito real guardado.</p>
            </SourceFreshness>
          </article>

          <aside className={`surface ${styles.nextAction}`} aria-labelledby="next-action-heading">
            <p className="eyebrow">Siguiente mejor acción</p>
            <h2 id="next-action-heading">Verificar antes de comparar decisiones externas.</h2>
            <p className="section-copy">
              El salto útil ahora no es inventar una tasa de mercado: es confirmar documentalmente los campos que cambian el análisis.
            </p>
            <ol className={styles.steps}>
              <li><span>1</span><div><strong>Revisar extracto</strong><p>Confirmar saldo, tasa, modalidad, cuotas y sistema.</p></div></li>
              <li><span>2</span><div><strong>Reconciliar</strong><p>Resolver faltantes o diferencias antes de elevar precisión.</p></div></li>
              <li><span>3</span><div><strong>Comparar acciones</strong><p>Solo después, priorizar prepago, transferencia u otra ruta.</p></div></li>
            </ol>
            <a className="button button-primary" href="/verificar">Verificar mi crédito</a>
          </aside>
        </section>

        <section className={styles.section} aria-labelledby="opportunities-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">Oportunidades</p>
              <h2 id="opportunities-heading">Acciones, no un score decorativo.</h2>
              <p className="section-copy">v0.10 prioriza estados explicables hasta que Loan Health tenga metodología y test vectors propios.</p>
            </div>
          </div>

          <div className={styles.opportunityGrid}>
            {opportunities.map((opportunity) => (
              <article className={`surface ${styles.opportunity}`} key={opportunity.label}>
                <div className={styles.opportunityMeta}>
                  <span>{opportunity.label}</span>
                  <strong>{opportunity.status}</strong>
                </div>
                <h3>{opportunity.title}</h3>
                <p className="section-copy">{opportunity.copy}</p>
                {opportunity.href ? (
                  <a className="button button-secondary" href={opportunity.href}>{opportunity.action}</a>
                ) : (
                  <span className={styles.noAction}>Sin CTA hasta tener datos externos verificables</span>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="precision-heading">
          <div className={`surface ${styles.precisionPanel}`}>
            <div className={styles.sectionHeading}>
              <div>
                <p className="eyebrow">Ruta de precisión</p>
                <h2 id="precision-heading">Más datos no siempre significa más verdad.</h2>
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
              <h2 id="workspace-heading">El resto aparece cuando aporta a una decisión.</h2>
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
            <h2>¿Quieres trabajar sobre un crédito real?</h2>
            <p className="section-copy">Empieza por el Quick Check. La primera lectura no requiere cédula, teléfono, correo ni extracto.</p>
          </div>
          <a className="button button-primary" href="/revisar">Revisar mi crédito</a>
        </section>
      </main>

      <footer className="shell site-footer">
        VIVIENDA · Preview v0.10 · Información, simulaciones y rutas con niveles de precisión explícitos.
      </footer>
    </>
  );
}
