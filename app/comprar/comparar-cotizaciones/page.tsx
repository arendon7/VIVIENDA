import { BrandLogo } from "@/components/brand/BrandLogo";
import { QuoteNormalizationTool } from "./quote-normalization-tool";

export default function QuoteNormalizationPage() {
  return (
    <>
      <header className="shell site-header cc-site-header">
        <a className="cc-brand-link" href="/" aria-label="Casa con Criterio · inicio">
          <BrandLogo width={230} priority />
        </a>
        <nav aria-label="Comparación de cotizaciones de financiación">
          <a className="nav-link" href="/comprar/cuanto-puedo-comprar">Cuánto puedo comprar</a>
          <a className="nav-link" href="/comprar/preparacion">Mi preparación</a>
          <a className="nav-link" href="/comprar/financiacion">Estructuras</a>
          <a className="nav-link" href="/revisar">Ya tengo crédito</a>
        </nav>
      </header>
      <main id="contenido" className="shell">
        <section style={{ paddingTop: 28 }}>
          <p className="eyebrow">Compara con Criterio</p>
          <p className="cc-commercial-line" style={{ marginTop: 0, marginBottom: 20 }}>
            Una tasa menor no siempre gana. Pon las cotizaciones en las mismas reglas antes de elegir.
          </p>
        </section>
        <QuoteNormalizationTool />
      </main>
      <footer className="shell site-footer cc-footer">
        <BrandLogo width={185} />
        <p>Cotizaciones declaradas C1 y escenarios económicos modelados C2.</p>
        <p>No es verificación documental, recomendación de banco, predicción de UVR, elegibilidad, preaprobación ni aprobación.</p>
      </footer>
    </>
  );
}
