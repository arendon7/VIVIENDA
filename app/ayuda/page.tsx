import { BrandLogo } from "@/components/brand/BrandLogo";
import { PaymentPressureTool } from "./payment-pressure-tool";

export default function PaymentPressurePage() {
  return (
    <>
      <header className="shell site-header cc-site-header">
        <a className="cc-brand-link" href="/" aria-label="Casa con Criterio · inicio">
          <BrandLogo width={230} priority />
        </a>
        <nav aria-label="Ayuda con pagos">
          <a className="nav-link" href="/revisar">Revisar crédito</a>
          <a className="nav-link" href="/mi-vivienda">Mi Vivienda · preview</a>
        </nav>
      </header>
      <main id="contenido">
        <section className="shell" style={{ paddingTop: 28 }}>
          <p className="eyebrow">Resolver con Criterio</p>
          <p className="cc-commercial-line" style={{ marginTop: 0, marginBottom: 20 }}>
            Si pagar se está volviendo difícil, la prioridad cambia: primero entiende la urgencia y protege tus opciones.
          </p>
        </section>
        <PaymentPressureTool />
      </main>
      <footer className="shell site-footer cc-footer">
        <BrandLogo width={185} />
        <p>Orientación inicial sobre presión de pago.</p>
        <p>No calcula términos procesales ni sustituye revisión profesional cuando corresponde.</p>
      </footer>
    </>
  );
}