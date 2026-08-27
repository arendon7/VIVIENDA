import { FinancingStructuresTool } from "./financing-structures-tool";

export default function FinancingStructuresPage() {
  return (
    <>
      <header className="shell site-header">
        <a className="brand" href="/">VIVIENDA</a>
        <nav aria-label="Financiación para comprar vivienda">
          <a className="nav-link" href="/comprar/cuanto-puedo-comprar">Cuánto puedo comprar</a>
          <a className="nav-link" href="/comprar/preparacion">Mi preparación</a>
          <a className="nav-link" href="/revisar">Revisar mi crédito</a>
        </nav>
      </header>
      <main id="contenido" className="shell">
        <FinancingStructuresTool />
      </main>
      <footer className="shell site-footer">
        VIVIENDA · Explorador orientativo de estructuras. No es elegibilidad, preaprobación, aprobación, ranking de entidades ni cotización de mercado.
      </footer>
    </>
  );
}
