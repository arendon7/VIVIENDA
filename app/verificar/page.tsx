import { DocumentReviewDemo } from "./review-demo";

export default function VerificarPage() {
  return (
    <>
      <header className="shell site-header">
        <a className="brand" href="/">VIVIENDA</a>
        <a className="nav-link" href="/revisar">Volver al análisis</a>
      </header>
      <main id="contenido" className="form-shell">
        <DocumentReviewDemo />
      </main>
    </>
  );
}
