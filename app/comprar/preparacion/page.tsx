import { BrandLogo } from "@/components/brand/BrandLogo";
import { HomeReadinessTool } from "./home-readiness-tool";

export default function HomeReadinessPage() {
  return (
    <>
      <header className="shell site-header cc-site-header">
        <a className="cc-brand-link" href="/" aria-label="Casa con Criterio · inicio">
          <BrandLogo width={230} priority />
        </a>
        <nav aria-label="Preparación para comprar vivienda">
          <a className="nav-link" href="/comprar/cuanto-puedo-comprar">Cuánto puedo comprar</a>
          <a className="nav-link" href="/comprar/financiacion">Explorar financiación</a>
          <a className="nav-link" href="/revisar">Ya tengo crédito</a>
        </nav>
      </header>
      <main id="contenido" className="shell">
        <section style={{ paddingTop: 28 }}>
          <p className="eyebrow">Comprar con Criterio</p>
          <p className="cc-commercial-line" style={{ marginTop: 0, marginBottom: 20 }}>
            Antes de buscar una aprobación, entiende qué tan preparada está tu decisión de compra.
          </p>
        </section>
        <HomeReadinessTool />
      </main>
      <footer className="shell site-footer cc-footer">
        <BrandLogo width={185} />
        <p>Índice orientativo de preparación.</p>
        <p>No es DataCrédito, score bancario, preaprobación ni probabilidad de aprobación.</p>
      </footer>
    </>
  );
}
