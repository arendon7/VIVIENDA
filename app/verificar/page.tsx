import "./review.css";
import { StatementGuidedMortgageTwin } from "./statement-guided-mortgage-twin";

export default function VerificarPage() {
  return (
    <>
      <header className="shell site-header">
        <a className="brand" href="/">VIVIENDA</a>
        <a className="nav-link" href="/revisar">Volver al análisis</a>
      </header>
      <main id="contenido" className="form-shell">
        <StatementGuidedMortgageTwin />
      </main>
      <footer className="shell site-footer">
        VIVIENDA · Extracto como referencia local + Mortgage Twin C1. El archivo no se sube, no se procesa y no concede C3 en esta versión.
      </footer>
    </>
  );
}
