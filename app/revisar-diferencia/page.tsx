import { ReconciliationTool } from "./reconciliation-tool";

export default function ReconciliationPage() {
  return (
    <>
      <header className="shell site-header">
        <a className="brand" href="/">VIVIENDA</a>
        <nav aria-label="Revisión de diferencias">
          <a className="nav-link" href="/revisar">Revisar crédito</a>
          <a className="nav-link" href="/ayuda">Dificultad para pagar</a>
          <a className="nav-link" href="/mi-vivienda">Mi Vivienda · preview</a>
        </nav>
      </header>
      <main id="contenido">
        <ReconciliationTool />
      </main>
      <footer className="shell site-footer">
        VIVIENDA · Reconciliación preliminar C0. No concluye error, ilegalidad ni derecho a devolución sin evidencia verificada.
      </footer>
    </>
  );
}
