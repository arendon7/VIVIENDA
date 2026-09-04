import type { ReactNode } from "react";

export type PrecisionLevel = "C0" | "C1" | "C2" | "C3";
export type StatusTone = "neutral" | "info" | "opportunity" | "positive" | "attention" | "professional";
export type SourceClass = "user" | "document" | "public" | "partner" | "calculation";
export type SourceStatus = "current" | "stale" | "needs_refresh" | "verified";

const precisionLabels: Record<PrecisionLevel, string> = {
  C0: "Orientación",
  C1: "Estimación",
  C2: "Simulación modelada",
  C3: "Verificado documentalmente",
};

const sourceClassLabels: Record<SourceClass, string> = {
  user: "Declarado por el usuario",
  document: "Documento",
  public: "Fuente pública",
  partner: "Fuente de un tercero",
  calculation: "Cálculo o modelo",
};

const sourceStatusLabels: Record<SourceStatus, string> = {
  current: "Vigente para esta lectura",
  stale: "Puede estar desactualizada",
  needs_refresh: "Requiere actualización",
  verified: "Verificada para este uso",
};

function sourceStatusTone(status: SourceStatus): StatusTone {
  if (status === "verified") return "positive";
  if (status === "stale") return "attention";
  if (status === "needs_refresh") return "opportunity";
  return "info";
}

export function PrecisionBadge({ level }: { level: PrecisionLevel }) {
  return (
    <span
      className="precision-badge cc-precision-badge"
      data-precision={level}
      aria-label={`Nivel de precisión: ${precisionLabels[level]}`}
    >
      {level} · {precisionLabels[level]}
    </span>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
  ariaLabel,
}: {
  children: ReactNode;
  tone?: StatusTone;
  ariaLabel?: string;
}) {
  return (
    <span className="cc-chip cc-status-badge" data-tone={tone} aria-label={ariaLabel}>
      {children}
    </span>
  );
}

export function FinancialNumber({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd className="cc-number">{value}</dd>
      {detail ? <div className="instrument-meta">{detail}</div> : null}
    </div>
  );
}

export function SourceFreshness({
  source,
  sourceClass,
  cutoff,
  status,
  children,
}: {
  source: string;
  sourceClass: SourceClass;
  cutoff: string;
  status: SourceStatus;
  children?: ReactNode;
}) {
  return (
    <aside className="evidence-rail" aria-label="Fuente y vigencia">
      <div className="cc-provenance-heading">
        <strong>Fuente y vigencia</strong>
        <StatusBadge tone={sourceStatusTone(status)}>{sourceStatusLabels[status]}</StatusBadge>
      </div>
      <dl className="cc-provenance-list">
        <div><dt>Fuente</dt><dd>{source}</dd></div>
        <div><dt>Clase</dt><dd>{sourceClassLabels[sourceClass]}</dd></div>
        <div><dt>Corte</dt><dd>{cutoff}</dd></div>
      </dl>
      {children}
    </aside>
  );
}

export function ScenarioPath({
  start = "Hoy",
  action = "Decisión",
  outcome = "Nueva trayectoria",
}: {
  start?: string;
  action?: string;
  outcome?: string;
}) {
  return (
    <div>
      <div className="path-preview" aria-hidden="true">
        <span className="path-node active" />
        <span className="path-line" />
        <span className="path-node active" />
        <span className="path-line" />
        <span className="path-node positive" />
      </div>
      <ol className="sr-only">
        <li>{start}</li>
        <li>{action}</li>
        <li>{outcome}</li>
      </ol>
      <div className="path-labels" aria-hidden="true">
        <span>{start}</span>
        <span>{action}</span>
        <span>{outcome}</span>
      </div>
    </div>
  );
}

export type BenefitRow = {
  label: string;
  value: string;
  kind?: "neutral" | "positive";
};

export function BenefitBreakdown({ rows }: { rows: BenefitRow[] }) {
  return (
    <div className="ledger" aria-label="Desglose del efecto económico">
      {rows.map((row) => (
        <div className={`ledger-row ${row.kind === "positive" ? "positive" : ""}`} key={row.label}>
          <span>{row.label}</span>
          <strong className="cc-number">{row.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function DecisionResult({
  title,
  explanation,
  precision,
  facts,
  evidence,
  children,
}: {
  title: string;
  explanation: string;
  precision: PrecisionLevel;
  facts: Array<{ label: string; value: string; detail?: string }>;
  evidence?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="surface result-frame" aria-labelledby="decision-title">
      <div className="result-grid">
        <div>
          <PrecisionBadge level={precision} />
          <h2 id="decision-title" className="cc-display" style={{ marginTop: 14 }}>{title}</h2>
          <p className="section-copy">{explanation}</p>
          <dl className="fact-grid">
            {facts.map((fact) => <FinancialNumber key={fact.label} {...fact} />)}
          </dl>
          {children}
        </div>
        {evidence}
      </div>
    </section>
  );
}

export function DiyAssistedChoice() {
  return (
    <div className="choice-grid" aria-label="Siguientes opciones">
      <article className="surface choice-card">
        <p className="eyebrow">Hazlo directamente</p>
        <h3 className="cc-display">Puedes gestionar el siguiente paso con tu entidad.</h3>
        <p className="section-copy">Te mostraremos qué solicitar y qué evidencia conservar. No necesitas contratar acompañamiento para usar esta ruta.</p>
        <a className="button button-secondary" href="/revisar">Preparar mi ruta</a>
      </article>
      <article className="surface choice-card">
        <p className="eyebrow">Acompañamiento · vista previa</p>
        <h3 className="cc-display">La ruta asistida aparece solo cuando realmente aporta.</h3>
        <p className="section-copy">Esta Beta todavía no activa contratación ni ejecución asistida. Antes de cualquier gestión habría que confirmar los datos del crédito y separar lo que depende de terceros.</p>
        <a className="button button-primary" href="/revisar">Mejorar precisión</a>
      </article>
    </div>
  );
}

export function MortgageTwinSnapshot() {
  return (
    <section className="surface result-frame" aria-labelledby="twin-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">Mi Situación</p>
          <h2 id="twin-title" className="cc-display">Tu crédito, organizado para entender dónde estás y qué puedes decidir.</h2>
          <p className="section-copy">Esta es una vista conceptual del producto. C3 solo aparecerá cuando los campos materiales provengan realmente del documento y hayan sido reconciliados.</p>
        </div>
        <StatusBadge tone="neutral" ariaLabel="Vista conceptual no verificada">
          Vista conceptual · no verificada
        </StatusBadge>
      </div>
      <dl className="twin-facts">
        <FinancialNumber label="Saldo" value="$180.000.000" />
        <FinancialNumber label="Cuota" value="$2.100.000" />
        <FinancialNumber label="Tasa" value="11,7 % EA" />
        <FinancialNumber label="Plazo restante" value="17 años" />
      </dl>
      <ScenarioPath start="Estado de ejemplo" action="Decisión" outcome="Nueva trayectoria" />
    </section>
  );
}
