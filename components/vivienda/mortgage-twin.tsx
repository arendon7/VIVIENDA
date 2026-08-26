import {
  FinancialNumber,
  PrecisionBadge,
  ScenarioPath,
  SourceFreshness,
} from "@/components/vivienda/signature-components";
import type { MortgageTwinData } from "@/domain/verification/reconciliation";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function formatBalance(raw: string) {
  const value = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(value) && value > 0 ? cop.format(value) : raw;
}

export function MortgageTwin({
  data,
  mode,
  documentName,
}: {
  data: MortgageTwinData;
  mode: "preview" | "verified";
  documentName?: string | undefined;
}) {
  const verified = mode === "verified";

  return (
    <section className="surface result-frame" aria-labelledby="mortgage-twin-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">Mortgage Twin</p>
          <h2 id="mortgage-twin-title">
            {verified ? "Tu crédito verificado, organizado para decidir." : "Así quedará tu crédito cuando la evidencia sea verificable."}
          </h2>
          <p className="section-copy">
            {verified
              ? "Los campos materiales fueron derivados de evidencia documental y reconciliados antes de construir esta representación."
              : "Esta previsualización usa los valores simulados que acabas de confirmar. Sirve para validar la experiencia, pero no convierte la simulación en verificación documental."}
          </p>
        </div>
        <PrecisionBadge level={verified ? "C3" : "C2"} />
      </div>

      {!verified ? (
        <div className="surface-warning" role="status">
          <strong>Preview, no C3.</strong>
          <p>El archivo seleccionado no fue leído por este prototipo. C3 requiere valores realmente derivados del documento, sin conflictos materiales y confirmados después de la extracción.</p>
        </div>
      ) : null}

      <dl className="twin-facts" style={{ marginTop: 24 }}>
        <FinancialNumber label="Saldo de capital" value={formatBalance(data.balance)} />
        <FinancialNumber label="Fecha de corte" value={data.cutoff} />
        <FinancialNumber label="Modalidad" value={data.modality} />
        <FinancialNumber label="Tasa" value={data.rate} />
        <FinancialNumber label="Cuotas restantes" value={data.remaining} />
        <FinancialNumber label="Sistema" value={data.system} />
      </dl>

      <ScenarioPath
        start={verified ? "Estado verificado" : "Estado reconciliado en demo"}
        action="Comparar decisión"
        outcome="Nueva trayectoria"
      />

      <div style={{ marginTop: 28 }}>
        <SourceFreshness
          source={
            verified
              ? `Documento revisado${documentName ? ` · ${documentName}` : ""}`
              : "Valores de demostración confirmados manualmente"
          }
          cutoff={data.cutoff}
        >
          {verified ? (
            <p>C3 describe la evidencia del crédito; no equivale a aprobación bancaria ni garantiza una decisión futura.</p>
          ) : (
            <p>El nombre del archivo permanece local en este prototipo y no constituye evidencia procesada.</p>
          )}
        </SourceFreshness>
      </div>

      {data.insurance ? (
        <div className="result-callout">
          <strong>Seguros/costos identificados</strong>
          <p className="section-copy">{data.insurance}</p>
        </div>
      ) : (
        <div className="surface-warning" style={{ marginTop: 18 }}>
          <strong>Seguros/costos todavía no confirmados.</strong>
          <p>Este dato es no material para construir el snapshot base, pero seguirá separado hasta que exista evidencia suficiente.</p>
        </div>
      )}
    </section>
  );
}
