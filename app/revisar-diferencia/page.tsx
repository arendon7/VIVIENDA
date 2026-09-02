import { ProductFooter, ProductHeader, ProductIntro } from "@/components/brand/ProductChrome";
import { ReconciliationTool } from "./reconciliation-tool";

export default function ReconciliationPage() {
  return (
    <>
      <ProductHeader
        ariaLabel="Revisión de diferencias"
        links={[
          { href: "/revisar", label: "Revisar crédito" },
          { href: "/ayuda", label: "Dificultad para pagar" },
          { href: "/mi-vivienda", label: "Mi Vivienda · vista previa" },
        ]}
      />
      <main id="contenido">
        <ProductIntro
          shell
          eyebrow="Resolver con evidencia"
          statement="Si algo no cuadra, separa primero lo esperado, lo informado y lo efectivamente aplicado."
        />
        <ReconciliationTool />
      </main>
      <ProductFooter
        lines={[
          "Reconciliación preliminar C0.",
          "No concluye error, ilegalidad ni derecho a devolución sin evidencia verificada.",
        ]}
      />
    </>
  );
}
