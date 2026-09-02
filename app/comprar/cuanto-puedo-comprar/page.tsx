import { BrandLogo } from "@/components/brand/BrandLogo";
import { AffordabilityTool } from "./affordability-tool";

export default function BuyerAffordabilityPage() {
  return (
    <>
      <header className="shell site-header cc-site-header">
        <a className="cc-brand-link" href="/" aria-label="Casa con Criterio · inicio">
          <BrandLogo width={230} priority />
        </a>
        <nav aria-label="Comprar vivienda">
          <a className="nav-link" href="/comprar/preparacion">Mi preparación</a>
          <a className="nav-link" href="/comprar/financiacion">Financiación</a>
          <a className="nav-link" href="/revisar">Ya tengo crédito</a>
        </nav>
      </header>
      <main id="contenido">
        <section className="shell" style={{ paddingTop: 28 }}>
          <p className="eyebrow">Comprar con Criterio</p>
          <p className="cc-commercial-line" style={{ marginTop: 0, marginBottom: 20 }}>
            Primero calcula cuánto puedes sostener. Después mira cuánto te prestan.
          </p>
        </section>
        <AffordabilityTool />
      </main>
      <footer className="shell site-footer cc-footer">
        <BrandLogo width={185} />
        <p>Planificación y simulación con supuestos explícitos.</p>
        <p>No es una oferta ni aprobación de crédito.</p>
      </footer>
    </>
  );
}