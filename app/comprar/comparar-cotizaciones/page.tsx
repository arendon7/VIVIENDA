import { ProductFooter, ProductHeader, ProductIntro } from "@/components/brand/ProductChrome";
import { QuoteNormalizationTool } from "./quote-normalization-tool";

export default function QuoteNormalizationPage() {
  return (
    <>
      <ProductHeader
        ariaLabel="Comparación de cotizaciones de financiación"
        links={[
          { href: "/comprar/cuanto-puedo-comprar", label: "Cuánto puedo comprar" },
          { href: "/comprar/preparacion", label: "Mi preparación" },
          { href: "/comprar/financiacion", label: "Estructuras" },
          { href: "/revisar", label: "Ya tengo crédito" },
        ]}
      />
      <main id="contenido" className="shell">
        <ProductIntro
          eyebrow="Compara con Criterio"
          statement="Una tasa menor no siempre gana. Pon las cotizaciones en las mismas reglas antes de elegir."
        />
        <QuoteNormalizationTool />
      </main>
      <ProductFooter
        lines={[
          "Cotizaciones declaradas C1 y escenarios económicos modelados C2.",
          "No es verificación documental, recomendación de banco, predicción de UVR, elegibilidad, preaprobación ni aprobación.",
        ]}
      />
    </>
  );
}
