import { AffordabilityTool } from "./affordability-tool";

export default function BuyerAffordabilityPage() {
  return (
    <>
      <header className="shell site-header">
        <a className="brand" href="/">VIVIENDA</a>
        <nav aria-label="Comprar vivienda">
          <a className="nav-link" href="/revisar">Ya tengo crédito</a>
          <a className="nav-link" href="/">Inicio</a>
        </nav>
      </header>
      <main id="contenido">
        <AffordabilityTool />
      </main>
      <footer className="shell site-footer">
        VIVIENDA · Planificación y simulación con supuestos explícitos. No es una oferta ni aprobación de crédito.
      </footer>
    </>
  );
}