import { ProductFooter, ProductHeader, ProductIntro } from "@/components/brand/ProductChrome";
import { HomeReadinessTool } from "./home-readiness-tool";

export default function HomeReadinessPage() {
  return (
    <>
      <ProductHeader
        ariaLabel="Preparación para comprar vivienda"
        links={[
          { href: "/comprar/cuanto-puedo-comprar", label: "Cuánto puedo comprar" },
          { href: "/comprar/financiacion", label: "Explorar financiación" },
          { href: "/revisar", label: "Ya tengo crédito" },
        ]}
      />
      <main id="contenido" className="shell">
        <ProductIntro
          eyebrow="Comprar con Criterio"
          statement="Antes de buscar una aprobación, entiende qué tan preparada está tu decisión de compra."
        />
        <HomeReadinessTool />
      </main>
      <ProductFooter
        lines={[
          "Índice orientativo de preparación.",
          "No reemplaza un score de central de riesgo, una preaprobación ni una decisión de una entidad financiera.",
        ]}
      />
    </>
  );
}
