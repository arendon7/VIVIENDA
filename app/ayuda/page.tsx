import { PaymentPressureTool } from "./payment-pressure-tool";

export default function PaymentPressurePage() {
  return (
    <>
      <header className="shell site-header">
        <a className="brand" href="/">VIVIENDA</a>
        <nav aria-label="Ayuda con pagos">
          <a className="nav-link" href="/revisar">Revisar crédito</a>
          <a className="nav-link" href="/mi-vivienda">Mi Vivienda · preview</a>
        </nav>
      </header>
      <main id="contenido">
        <PaymentPressureTool />
      </main>
      <footer className="shell site-footer">
        VIVIENDA · Orientación inicial sobre presión de pago. No calcula términos procesales ni sustituye revisión profesional cuando corresponde.
      </footer>
    </>
  );
}