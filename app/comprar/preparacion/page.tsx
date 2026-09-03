import { HomeReadinessTool } from "./home-readiness-tool";

export default function HomeReadinessPage() {
  return (
    <>
      <header className="shell site-header">
        <a className="brand" href="/">VIVIENDA</a>
        <nav aria-label="Preparación para comprar vivienda">
          <a className="nav-link" href="/comprar/cuanto-puedo-comprar">Cuánto puedo comprar</a>
          <a className="nav-link" href="/comprar/financiacion">Explorar financiación</a>
          <a className="nav-link" href="/revisar">Revisar mi crédito</a>
        </nav>
      </header>
      <main id="contenido" className="shell">
        <HomeReadinessTool />
      </main>
      <footer className="shell site-footer">
        VIVIENDA · Índice orientativo de preparación. No es DataCrédito, score bancario, preaprobación ni probabilidad de aprobación.
      </footer>
    </>
  );
}
