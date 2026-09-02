import { BrandLogo } from "@/components/brand/BrandLogo";
import { FinancingStructuresTool } from "./financing-structures-tool";

export default function FinancingStructuresPage() {
  return (
    <>
      <header className="shell site-header cc-site-header">
        <a className="cc-brand-link" href="/" aria-label="Casa con Criterio · inicio">
          <BrandLogo width={230} priority />
        </a>
        <nav aria-label="Financiación para comprar vivienda">
          <a className="nav-link" href="/comprar/cuanto-puedo-comprar">Cuánto puedo comprar</a>
          <a className="nav-link" href="/comprar/preparacion">Mi preparación</a>
          <a className="nav-link" href="/comprar/comparar-cotizaciones">Cotizaciones</a>
          <a className="nav-link" href="/revisar">Ya tengo crédito</a>
        </nav>
      </header>
      <main id="contenido" className="shell">
        <section style={{ paddingTop: 28 }}>
          <p className="eyebrow">Financia con Criterio</p>
          <p className="cc-commercial-line" style={{ marginTop: 0, marginBottom: 20 }}>
            No compares solo la cuota. Entiende cómo cambia la decisión con cada estructura.
          </p>
        </section>
        <FinancingStructuresTool />
      </main>
      <footer className="shell site-footer cc-footer">
        <BrandLogo width={185} />
        <p>Explorador orientativo de estructuras de financiación.</p>
        <p>No es elegibilidad, preaprobación, aprobación, ranking de entidades ni cotización de mercado.</p>
      </footer>
    </>
  );
}
