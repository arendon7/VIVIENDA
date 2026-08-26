import { QuickCheck } from "./quick-check";

export default function RevisarPage() {
  return (
    <>
      <header className="shell site-header">
        <a className="brand" href="/">VIVIENDA</a>
        <a className="nav-link" href="/">Volver al inicio</a>
      </header>
      <main id="contenido" className="form-shell">
        <QuickCheck />
      </main>
    </>
  );
}
