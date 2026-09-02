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
      ? "Mi Situación usa datos que transcribiste mirando un extracto local. Casa con Criterio no leyó, extrajo ni verificó el archivo."
      : "Esta previsualización usa valores simulados confirmados dentro de una demostración. Sirve para validar la experiencia, pero no convierte la simulación en verificación documental.";

  const provenance = verified
    ? {
        source: `Documento revisado${documentName ? ` · ${documentName}` : ""}`,
        sourceClass: "document" as const,
        status: "verified" as const,
      }
    : declared
      ? {
          source: "Datos transcritos por ti desde un extracto local",
          sourceClass: "user" as const,
          status: "current" as const,
        }
      : {
          source: "Valores de demostración confirmados manualmente",
          sourceClass: "calculation" as const,
          status: "current" as const,
        };

  return (
    <>
      <section className="surface result-frame" aria-labelledby="mortgage-twin-title">
        <div className="section-header">
          <div>
            <p className="eyebrow">Mi Situación{declared ? " · lectura guiada" : ""}</p>
            <h2 id="mortgage-twin-title" className="cc-display">{title}</h2>
            <p className="section-copy">{explanation}</p>
          </div>
          <PrecisionBadge level={precision} />
        </div>

        {!verified ? (
          <div className="surface-warning" role="status">
            <strong>{declared ? "Datos declarados, no C3." : "Vista previa, no C3."}</strong>
            {declared ? (
              <>
                <p>Datos transcritos por ti desde un extracto local. Casa con Criterio no leyó ni verificó el archivo.</p>
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
          start={verified ? "Estado verificado" : declared ? "Situación declarada" : "Estado reconciliado en demo"}
          action="Comparar decisión"
          outcome="Nueva trayectoria"
        />

        <div style={{ marginTop: 28 }}>
          <SourceFreshness
            source={provenance.source}
            sourceClass={provenance.sourceClass}
            cutoff={data.cutoff}
            status={provenance.status}
          >
            {verified ? (
              <p>C3 describe la evidencia del crédito; no equivale a aprobación bancaria ni garantiza una decisión futura.</p>
            ) : declared ? (
              <p>La referencia local ayudó a transcribir los campos, pero no constituye evidencia procesada por Casa con Criterio.</p>
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
            <p>Este dato no es necesario para construir la fotografía base y seguirá separado hasta que exista información suficiente.</p>
          </div>
        )}
      </section>

      {showOpportunities ? <OpportunityWorkspace precision={precision} /> : null}
    </>
  );
}
