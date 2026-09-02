import { ProductFooter, ProductHeader, ProductIntro } from "@/components/brand/ProductChrome";
import "./review.css";
import { StatementGuidedMortgageTwin } from "./statement-guided-mortgage-twin";

export default function VerificarPage() {
  return (
    <>
      <ProductHeader
        ariaLabel="Verificación del crédito"
        links={[{ href: "/revisar", label: "Volver al análisis" }]}
      />
      <main id="contenido" className="form-shell">
        <ProductIntro
          eyebrow="Mejorar precisión"
          statement="Un documento ayuda a entender mejor la situación; verificar exige reconciliar evidencia, no solo subir un archivo."
        />
        <StatementGuidedMortgageTwin />
      </main>
      <ProductFooter
        lines={[
          "Extracto como referencia local + Mortgage Twin C1.",
          "El archivo no se sube, no se procesa y no concede C3 en esta versión.",
        ]}
      />
    </>
  );
}
