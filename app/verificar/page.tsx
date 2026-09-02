import { BrandLogo } from "@/components/brand/BrandLogo";
import "./review.css";
import { StatementGuidedMortgageTwin } from "./statement-guided-mortgage-twin";

export default function VerificarPage() {
  return (
    <>
      <header className="shell site-header cc-site-header">
        <a className="cc-brand-link" href="/" aria-label="Casa con Criterio · inicio">
          <BrandLogo width={230} priority />
        </a>
        <a className="nav-link" href="/revisar">Volver al análisis</a>
      </header>
      <main id="contenido" className="form-shell">
        <p className="eyebrow">Mejorar precisión</p>
        <p className="cc-commercial-line" style={{ marginTop: 0, marginBottom: 24 }}>
          Un documento ayuda a entender mejor la situación; verificar exige reconciliar evidencia, no solo subir un archivo.
        </p>
        <StatementGuidedMortgageTwin />
      </main>
      <footer className="shell site-footer cc-footer">
        <BrandLogo width={185} />
        <p>Extracto como referencia local + Mortgage Twin C1.</p>
        <p>El archivo no se sube, no se procesa y no concede C3 en esta versión.</p>
      </footer>
    </>
  );
}
