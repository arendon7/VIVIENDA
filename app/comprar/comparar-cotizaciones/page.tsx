import { QuoteNormalizationTool } from "./quote-normalization-tool";

export default function QuoteNormalizationPage() {
  return (
    <>
      <header className="shell site-header">
        <a className="brand" href="/">VIVIENDA</a>
        <nav aria-label="Comparación de cotizaciones de financiación">
          <a className="nav-link" href="/comprar/cuanto-puedo-comprar">Cuánto puedo comprar</a>
          <a className="nav-link" href="/comprar/preparacion">Mi preparación</a>
          <a className="nav-link" href="/comprar/financiacion">Estructuras</a>
          <a className="nav-link" href="/revisar">Revisar mi crédito</a>
        </nav>
      </header>
      <main id="contenido" className="shell">
        <QuoteNormalizationTool />
      </main>
      <footer className="shell site-footer">
        VIVIENDA · Cotizaciones declaradas C1 y escenarios económicos modelados C2. No es verificación documental, recomendación de banco, predicción de UVR, elegibilidad, preaprobación ni aprobación.
      </footer>
    </>
  );
}
