import { ProductHeader, ProductIntro } from "@/components/brand/ProductChrome";
import { QuickCheck } from "./quick-check";

export default function RevisarPage() {
  return (
    <>
      <ProductHeader
        ariaLabel="Análisis de crédito"
        links={[{ href: "/", label: "Volver al inicio" }]}
      />
      <main id="contenido" className="form-shell">
        <ProductIntro
          eyebrow="Radar Vivienda · primera lectura"
          statement="Conoce tus números antes de decidir qué hacer con ellos."
        />
        <QuickCheck />
      </main>
    </>
  );
}
