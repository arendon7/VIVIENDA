import { ProductFooter, ProductHeader, ProductIntro } from "@/components/brand/ProductChrome";
import { FinancingStructuresTool } from "./financing-structures-tool";

export default function FinancingStructuresPage() {
  return (
    <>
      <ProductHeader
        ariaLabel="Financiación para comprar vivienda"
        links={[
          { href: "/comprar/cuanto-puedo-comprar", label: "Cuánto puedo comprar" },
          { href: "/comprar/preparacion", label: "Mi preparación" },
          { href: "/comprar/comparar-cotizaciones", label: "Cotizaciones" },
          { href: "/revisar", label: "Ya tengo crédito" },
        ]}
      />
      <main id="contenido" className="shell">
        <ProductIntro
          eyebrow="Financia con Criterio"
          statement="No compares solo la cuota. Entiende cómo cambia la decisión con cada estructura."
        />
        <FinancingStructuresTool />
      </main>
      <ProductFooter
        lines={[
          "Explorador orientativo de estructuras de financiación.",
          "No es elegibilidad, preaprobación, aprobación, ranking de entidades ni cotización de mercado.",
        ]}
      />
    </>
  );
}
