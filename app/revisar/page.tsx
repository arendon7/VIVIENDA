import { BrandLogo } from "@/components/brand/BrandLogo";
import { QuickCheck } from "./quick-check";

export default function RevisarPage() {
  return (
    <>
      <header className="shell site-header cc-site-header">
        <a className="cc-brand-link" href="/" aria-label="Casa con Criterio · inicio">
          <BrandLogo width={230} priority />
        </a>
        <a className="nav-link" href="/">Volver al inicio</a>
      </header>
      <main id="contenido" className="form-shell">
        <p className="eyebrow">Radar Vivienda · primera lectura</p>
        <p className="cc-commercial-line" style={{ marginTop: 0, marginBottom: 24 }}>
          Conoce tus números antes de decidir qué hacer con ellos.
        </p>
        <QuickCheck />
      </main>
    </>
  );
}
