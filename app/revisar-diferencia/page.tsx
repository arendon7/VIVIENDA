import { BrandLogo } from "@/components/brand/BrandLogo";
import { ReconciliationTool } from "./reconciliation-tool";

export default function ReconciliationPage() {
  return (
    <>
      <header className="shell site-header cc-site-header">
        <a className="cc-brand-link" href="/" aria-label="Casa con Criterio · inicio">
          <BrandLogo width={230} priority />
        </a>
        <nav aria-label="Revisión de diferencias">
          <a className="nav-link" href="/revisar">Revisar crédito</a>
          <a className="nav-link" href="/ayuda">Dificultad para pagar</a>
          <a className="nav-link" href="/mi-vivienda">Mi Vivienda · preview</a>
        </nav>
      </header>
      <main id="contenido">
        <section className="shell" style={{ paddingTop: 28 }}>
          <p className="eyebrow">Resolver con evidencia</p>
          <p className="cc-commercial-line" style={{ marginTop: 0, marginBottom: 20 }}>
            Si algo no cuadra, separa primero lo esperado, lo informado y lo efectivamente aplicado.
          </p>
        </section>
        <ReconciliationTool />
      </main>
      <footer className="shell site-footer cc-footer">
        <BrandLogo width={185} />
        <p>Reconciliación preliminar C0.</p>
        <p>No concluye error, ilegalidad ni derecho a devolución sin evidencia verificada.</p>
      </footer>
    </>
  );
}
