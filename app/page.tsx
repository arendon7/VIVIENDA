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

export default function HomePage() {
  return (
    <>
      <header className="shell site-header">
        <a className="brand" href="/">VIVIENDA</a>
        <nav aria-label="Principal">
          <a className="nav-link" href="#como-funciona">Cómo funciona</a>
          <a className="nav-link" href="/comprar/cuanto-puedo-comprar">Comprar vivienda</a>
          <a className="nav-link" href="/ayuda">Tengo un problema</a>
          <a className="nav-link" href="/mi-vivienda">Mi Vivienda · preview</a>
        </nav>
      </header>

      <main id="contenido">
        <section className="shell hero">
          <div>
            <p className="eyebrow">Ya tengo crédito de vivienda</p>
            <h1>¿Estás pagando tu vivienda de la mejor manera disponible?</h1>
            <p className="lede">
              Entiende tu crédito, prueba escenarios y distingue qué puedes hacer directamente de lo que realmente requiere acompañamiento.
            </p>
            <div className="actions">
              <a className="button button-primary" href="/revisar">Revisar mi crédito</a>
              <a className="button button-secondary" href="/mi-vivienda">Ver Mi Vivienda · preview</a>
            </div>
            <p className="trust-line">No necesitas cédula, teléfono ni extracto para empezar. Si todavía no tienes crédito, la ruta de compra usa un cálculo separado y no desplaza este análisis.</p>
            <p className="trust-line"><a href="/ayuda">¿Te está costando pagar o ya te están cobrando? Ubica primero qué tan urgente es →</a></p>
          </div>

          <aside className="surface hero-instrument" aria-label="Ejemplo de análisis">
            <p className="instrument-label">Una decisión cambia la trayectoria</p>
            <div className="instrument-value">17 años</div>
            <p className="instrument-meta">Plazo restante de ejemplo. No es una recomendación ni un cálculo personalizado.</p>
            <ScenarioPath start="Hoy" action="Simular" outcome="Comparar" />
          </aside>
        </section>

        <section className="shell section" id="como-funciona">
          <div className="section-header">
            <div>
              <p className="eyebrow">Valor antes de pedir datos</p>
              <h2>Primero entendemos. Después decidimos si vale la pena profundizar.</h2>
            </div>
          </div>
          <div className="grid-3">
            <article className="surface feature"><span className="feature-index">01</span><h3>Describe tu crédito</h3><p>Con pocos datos aproximados obtenemos una primera lectura sin pedir identidad ni teléfono.</p></article>
            <article className="surface feature"><span className="feature-index">02</span><h3>Compara decisiones</h3><p>Separamos el efecto de tus propios abonos, la tasa, el plazo y otras variables relevantes.</p></article>
            <article className="surface feature"><span className="feature-index">03</span><h3>Elige cómo actuar</h3><p>Si puedes hacerlo directamente, te lo decimos. Si necesitas precisión o defensa, el siguiente paso cambia.</p></article>
          </div>
        </section>

        <section className="shell section" aria-labelledby="buyer-path-heading">
          <div className="surface choice-card">
            <p className="eyebrow">Todavía no tengo crédito</p>
            <h2 id="buyer-path-heading">¿Estás planeando comprar vivienda?</h2>
            <p className="section-copy">Calcula una referencia de cuota e inicial antes de comparar financiación. El primer resultado no pide nombre, teléfono, correo ni score.</p>
            <div className="actions">
              <a className="button button-secondary" href="/comprar/cuanto-puedo-comprar">Calcular cuánto puedo planear</a>
            </div>
          </div>
        </section>

        <section className="shell section" aria-labelledby="difference-path-heading">
          <div className="surface choice-card">
            <p className="eyebrow">Algo no me cuadra</p>
            <h2 id="difference-path-heading">¿Hay un cobro, tasa, saldo o movimiento que no entiendes?</h2>
            <p className="section-copy">Aísla qué esperabas, qué aparece distinto y qué fuentes deberías comparar. El primer resultado es C0 y no presupone que la entidad haya cometido un error.</p>
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
              <p className="eyebrow">Cómo explicaremos el efecto</p>
              <ScenarioPath start="Crédito actual" action="Aportas capital adicional" outcome="Menos intereses futuros modelados" />
              <BenefitBreakdown rows={[
                { label: "Capital adicional que aportarías", value: "$25.200.000" },
                { label: "Intereses futuros que el modelo estima que dejarían de causarse", value: "$46.700.000", kind: "positive" },
                { label: "Valor atribuible a VIVIENDA en este escenario", value: "$0" },
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
      </main>

      <footer className="shell site-footer">
        VIVIENDA · Información, simulaciones y acompañamiento con niveles de precisión explícitos.
      </footer>
    </>
  );
}