import { ProductFooter, ProductHeader, ProductIntro } from "@/components/brand/ProductChrome";
import { PaymentPressureTool } from "./payment-pressure-tool";

export default function PaymentPressurePage() {
  return (
    <>
      <ProductHeader
        ariaLabel="Ayuda con pagos"
        links={[
          { href: "/revisar", label: "Revisar crédito" },
          { href: "/mi-vivienda", label: "Mi Vivienda" },
        ]}
      />
      <main id="contenido">
        <ProductIntro
          shell
          eyebrow="Resolver con Criterio"
          statement="Si pagar se está volviendo difícil, la prioridad cambia: primero entiende la urgencia y protege tus opciones."
        />
        <PaymentPressureTool />
      </main>
      <ProductFooter
        lines={[
          "Orientación inicial sobre presión de pago.",
          "No calcula términos procesales ni sustituye revisión profesional cuando corresponde.",
        ]}
      />
    </>
  );
}
