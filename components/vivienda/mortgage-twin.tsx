import {
  FinancialNumber,
  PrecisionBadge,
  ScenarioPath,
  SourceFreshness,
} from "@/components/vivienda/signature-components";
import { OpportunityWorkspace } from "@/components/vivienda/opportunity-workspace";
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

type MortgageTwinMode = "declared" | "preview" | "verified";

const precisionByMode: Record<MortgageTwinMode, "C1" | "C2" | "C3"> = {
  declared: "C1",
  preview: "C2",
  verified: "C3",
};

export function MortgageTwin({
  data,
  mode,
  documentName,
  showOpportunities = true,
}: {
  data: MortgageTwinData;
  mode: MortgageTwinMode;
  documentName?: string | undefined;
  showOpportunities?: boolean;
}) {
  const verified = mode === "verified";
  const declared = mode === "declared";
  const precision = precisionByMode[mode];

  const title = verified
    ? "Tu crédito verificado, organizado para decidir."
    : declared
      ? "Ya organizamos la fotografía que transcribiste de tu extracto."
      : "Así quedará tu crédito cuando la evidencia sea verificable.";

  const explanation = verified
    ? "Los campos materiales fueron derivados de evidencia documental y reconciliados antes de construir esta representación."
    : declared
      ? "Este Mortgage Twin usa datos que transcribiste mirando un extracto local. VIVIENDA no leyó, extrajo ni verificó el archivo."
      : "Esta previsualización usa valores simulados confirmados dentro de una demostración. Sirve para validar la experiencia, pero no convierte la simulación en verificación documental.";

  return (
    <>
      <section className="surface result-frame" aria-labelledby="mortgage-twin-title">
        <div className="section-header">
          <div>
            <p className="eyebrow">Mortgage Twin{declared ? " guiado" : ""}</p>
            <h2 id="mortgage-twin-title">{title}</h2>
            <p className="section-copy">{explanation}</p>
          </div>
          <PrecisionBadge level={precision} />
        </div>

        {!verified ? (
          <div className="surface-warning" role="status">
            <strong>{declared ? "Datos declarados, no C3." : "Preview, no C3."}</strong>
            {declared ? (
              <>
                <p>Datos transcritos por ti desde un extracto local. VIVIENDA no leyó ni verificó el archivo.</p>
                <p>C3 requiere evidencia realmente derivada del documento y reconciliación completa.</p>
              </>
            ) : (
              <p>El archivo seleccionado no fue leído por este prototipo. C3 requiere valores realmente derivados del documento, sin conflictos materiales y confirmados después de la extracción.</p>
            )}
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
          start={verified ? "Estado verificado" : declared ? "Snapshot declarado" : "Estado reconciliado en demo"}
          action="Comparar decisión"
          outcome="Nueva trayectoria"
        />

        <div style={{ marginTop: 28 }}>
          <SourceFreshness
            source={
              verified
                ? `Documento revisado${documentName ? ` · ${documentName}` : ""}`
                : declared
                  ? "Datos transcritos por ti desde un extracto local"
                  : "Valores de demostración confirmados manualmente"
            }
            cutoff={data.cutoff}
          >
            {verified ? (
              <p>C3 describe la evidencia del crédito; no equivale a aprobación bancaria ni garantiza una decisión futura.</p>
            ) : declared ? (
              <p>La referencia local ayudó a transcribir los campos, pero no constituye evidencia procesada por VIVIENDA.</p>
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
            <p>Este dato es no material para construir el snapshot base y seguirá separado hasta que exista información suficiente.</p>
          </div>
        )}
      </section>

      {showOpportunities ? <OpportunityWorkspace precision={precision} /> : null}
    </>
  );
}