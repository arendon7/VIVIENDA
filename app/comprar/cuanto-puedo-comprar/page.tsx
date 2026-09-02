import { ProductFooter, ProductHeader, ProductIntro } from "@/components/brand/ProductChrome";
import { AffordabilityTool } from "./affordability-tool";

export default function BuyerAffordabilityPage() {
  return (
    <>
      <ProductHeader
        ariaLabel="Comprar vivienda"
        links={[
          { href: "/comprar/preparacion", label: "Mi preparación" },
          { href: "/comprar/financiacion", label: "Financiación" },
          { href: "/revisar", label: "Ya tengo crédito" },
        ]}
      />
      <main id="contenido">
        <ProductIntro
          shell
          eyebrow="Comprar con Criterio"
          statement="Primero calcula cuánto puedes sostener. Después mira cuánto te prestan."
        />
        <AffordabilityTool />
      </main>
      <ProductFooter
        lines={[
          "Planificación y simulación con supuestos explícitos.",
          "No es una oferta ni aprobación de crédito.",
        ]}
      />
    </>
  );
}
