import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  BenefitBreakdown,
  DecisionResult,
  DiyAssistedChoice,
  MortgageTwinSnapshot,
  ScenarioPath,
  SourceFreshness,
} from "@/components/vivienda/signature-components";

const facts = [
  { label: "Saldo aproximado", value: "$180.000.000" },
  { label: "Cuota aproximada", value: "$2.100.000" },
  { label: "Plazo restante", value: "17 años" },
  { label: "Modalidad", value: "Pesos", detail: "Dato de ejemplo" },
];

const radarDimensions = [
  ["Financiación", "Entiende las condiciones de tu crédito y qué variables realmente mueven el resultado."],
  ["Liquidez", "Compara cuánto flujo mensual puedes liberar y qué sacrificas a cambio."],
  ["Protección", "Identifica inconsistencias o situaciones que merecen revisión antes de optimizar."],
  ["Optimización", "Explora decisiones sobre cuota, plazo, intereses y capital con supuestos visibles."],
] as const;

export default function HomePage() {
  return (
    <>
      <header className="shell site-header cc-site-header">
        <a className="cc-brand-link" href="/" aria-label="Casa con Criterio · inicio">
          <BrandLogo width={260} priority />
        </a>
        <nav className="cc-main-nav" aria-label="Principal">
          <a className="nav-link" href="#radar">Radar Vivienda</a>
          <a className="nav-link" href="/mi-vivienda">Mi Situación</a>
          <a className="nav-link" href="/comparar-ofertas">Comparar</a>
          <a className="nav-link" href="/comprar/cuanto-puedo-comprar">Comprar</a>
          <a className="nav-link" href="/ayuda">Resolver</a>
        </nav>
        <a className="button button-primary cc-header-cta" href="/revisar">Revisar mi vivienda</a>
      </header>

      <main id="contenido">
        <section className="cc-hero-shell">
          <div className="shell hero cc-hero">
            <div>
              <p className="eyebrow">Inteligencia para las decisiones de tu vivienda</p>
              <h1 className="cc-display">Tu vivienda <span className="cc-accent-italic">merece criterio.</span></h1>
              <p className="cc-commercial-line">Conoce las reglas. Haz las cuentas. Decide con criterio.</p>
              <p className="lede">
                Entiende cómo está funcionando tu crédito, descubre oportunidades y compara qué cambia en cuota, plazo, intereses y liquidez antes de decidir.
              </p>
              <div className="actions">
                <a className="button button-primary" href="/revisar">Encender mi Radar</a>
                <a className="button button-secondary" href="/mi-vivienda">Ver Mi Vivienda</a>
              </div>
              <p className="trust-line">Empieza sin cédula, teléfono ni credenciales bancarias. Los resultados iniciales muestran su nivel de precisión y los supuestos utilizados.</p>
            </div>

            <aside className="surface hero-instrument cc-panorama" aria-label="Panorama de ejemplo">
              <p className="instrument-label">Tu panorama actual · ejemplo</p>
              <div className="cc-panorama-row"><span>Saldo</span><strong>$205.348.120</strong></div>
              <div className="cc-panorama-row"><span>Tasa E.A.</span><strong>11,74%</strong></div>
              <div className="cc-panorama-row"><span>Plazo restante</span><strong>147 meses</strong></div>
              <div className="cc-panorama-row"><span>Cuota</span><strong>$2.319.800</strong></div>
              <ScenarioPath start="Hoy" action="Comparar" outcome="Decidir" />
            </aside>
          </div>
        </section>

        <section className="shell section" id="radar" aria-labelledby="radar-heading">
          <div className="section-header">
            <div>
              <p className="eyebrow">Radar Vivienda</p>
              <h2 id="radar-heading" className="cc-display">¿Qué oportunidad hay escondida en tus números?</h2>
              <p className="section-copy">No buscamos vender una respuesta única. Revisamos tu situación en cuatro dimensiones y te mostramos qué merece ser explorado, qué falta por verificar y qué puede cambiar.</p>
            </div>
          </div>
          <div className="grid-3 cc-radar-grid">
            {radarDimensions.map(([title, copy], index) => (
              <article className="surface feature cc-radar-card" key={title}>
                <span className="feature-index">0{index + 1}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="shell section" aria-label="Ejemplo comercial de escenarios">
          <div className="surface cc-scenario-spotlight">
            <div>
              <p className="eyebrow">El mismo abono. Dos decisiones.</p>
              <h2 className="cc-display">¿Qué quieres que cambie?</h2>
              <p className="section-copy">En un escenario modelado, un mismo abono puede liberar flujo mensual o reducir tiempo e intereses. El valor está en comparar antes de escoger.</p>
              <p className="cc-model-note">Ejemplo ilustrativo. No es una promesa de ahorro ni una recomendación personalizada.</p>
            </div>
            <div className="cc-scenario-comparison" aria-label="Comparación ilustrativa">
              <div className="cc-scenario-card">
                <span>Reducir cuota</span>
                <strong>−$232.000</strong>
                <small>cada mes</small>
              </div>
              <div className="cc-scenario-divider">VS</div>
              <div className="cc-scenario-card cc-scenario-card--accent">
                <span>Reducir plazo</span>
                <strong>−39</strong>
                <small>meses</small>
              </div>
            </div>
          </div>
        </section>

        <section className="shell section" id="como-funciona">
          <div className="section-header">
            <div>
              <p className="eyebrow">Conoce las reglas. Haz las cuentas.</p>
              <h2 className="cc-display">Primero entendemos. Después decidimos si vale la pena profundizar.</h2>
            </div>
          </div>
          <div className="grid-3">
            <article className="surface feature"><span className="feature-index">01</span><h3>Describe tu situación</h3><p>Con pocos datos aproximados obtenemos una primera lectura sin pedir identidad ni teléfono.</p></article>
            <article className="surface feature"><span className="feature-index">02</span><h3>Compara caminos</h3><p>Separamos el efecto de tus propios abonos, la tasa, el plazo y las demás variables relevantes.</p></article>
            <article className="surface feature"><span className="feature-index">03</span><h3>Decide con criterio</h3><p>Mostramos consecuencias, precisión, fuentes y siguiente paso. Si puedes hacerlo directamente, también debe quedar visible.</p></article>
          </div>
        </section>

        <section className="shell section" aria-labelledby="buyer-path-heading">
          <div className="surface choice-card cc-choice-card">
            <p className="eyebrow">Comprar con Criterio</p>
            <h2 id="buyer-path-heading" className="cc-display">Primero calcula cuánto puedes sostener. Después mira cuánto te prestan.</h2>
            <p className="section-copy">Estima un rango sostenible, revisa tu preparación y compara estructuras de financiación antes de comprometerte.</p>
            <div className="actions">
              <a className="button button-secondary" href="/comprar/cuanto-puedo-comprar">Calcular mi rango</a>
              <a className="button button-quiet" href="/comprar/preparacion">Conocer mi preparación</a>
            </div>
          </div>
        </section>

        <section className="shell section" aria-labelledby="difference-path-heading">
          <div className="surface choice-card cc-choice-card">
            <p className="eyebrow">Resolver con evidencia</p>
            <h2 id="difference-path-heading" className="cc-display">Si algo no cuadra, los números deberían poder explicarlo.</h2>
            <p className="section-copy">Aísla qué esperabas, qué aparece distinto y qué fuentes deberías comparar. El primer resultado no presupone que la entidad haya cometido un error.</p>
            <div className="actions">
              <a className="button button-secondary" href="/revisar-diferencia">Revisar una diferencia</a>
            </div>
          </div>
        </section>

        <section className="shell section" aria-label="Ejemplo de resultado">
          <DecisionResult
            title="Vemos una oportunidad que vale la pena simular."
            explanation="Con estos datos aproximados, un abono adicional podría reducir el costo financiero futuro. Todavía no conocemos la tasa ni el sistema exacto de amortización, por lo que este ejemplo mantiene precisión C1."
            precision="C1"
            facts={facts}
            evidence={<SourceFreshness source="Datos ingresados por el usuario" cutoff="Ejemplo de producto"><p>Para pasar a C2/C3 necesitamos datos suficientes del crédito y, para C3, conciliación documental.</p></SourceFreshness>}
          >
            <div className="demo-scenario">
              <p className="eyebrow">Haz las cuentas</p>
              <ScenarioPath start="Crédito actual" action="Aportas capital adicional" outcome="Menos intereses futuros modelados" />
              <BenefitBreakdown rows={[
                { label: "Capital adicional que aportarías", value: "$25.200.000" },
                { label: "Intereses futuros que el modelo estima que dejarían de causarse", value: "$46.700.000", kind: "positive" },
                { label: "Valor atribuible a Casa con Criterio en este escenario", value: "$0" },
              ]} />
            </div>
          </DecisionResult>
        </section>

        <section className="shell section">
          <DiyAssistedChoice />
        </section>

        <section className="shell section">
          <MortgageTwinSnapshot />
        </section>

        <section className="cc-closing-band">
          <div className="shell cc-closing-band__inner">
            <div>
              <p className="eyebrow cc-eyebrow-reverse">Casa con Criterio</p>
              <h2>Decidir con criterio cambia tu futuro financiero.</h2>
              <p>Empieza por entender tu situación y comparar lo que realmente cambia.</p>
            </div>
            <a className="button cc-button cc-button--accent" href="/revisar">Revisar mi vivienda</a>
          </div>
        </section>
      </main>

      <footer className="shell site-footer cc-footer">
        <BrandLogo width={220} />
        <p>Perspectiva. Información. Decisiones.</p>
        <p>Resultados y simulaciones con nivel de precisión, fuentes y supuestos visibles.</p>
      </footer>
    </>
  );
}
