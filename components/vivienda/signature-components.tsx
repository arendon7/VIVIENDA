import type { ReactNode } from "react";

export type PrecisionLevel = "C0" | "C1" | "C2" | "C3";

const precisionLabels: Record<PrecisionLevel, string> = {
  C0: "Orientación",
  C1: "Estimación",
  C2: "Simulación modelada",
  C3: "Verificado documentalmente",
};

export function PrecisionBadge({ level }: { level: PrecisionLevel }) {
  return (
    <span className="precision-badge" aria-label={`Nivel de precisión: ${precisionLabels[level]}`}>
      {level} · {precisionLabels[level]}
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
      <dd>{value}</dd>
      {detail ? <div className="instrument-meta">{detail}</div> : null}
    </div>
  );
}

export function SourceFreshness({
  source,
  cutoff,
  children,
}: {
  source: string;
  cutoff: string;
  children?: ReactNode;
}) {
  return (
    <aside className="evidence-rail" aria-label="Fuente y vigencia">
      <strong>Fuente y vigencia</strong>
      <p>{source}</p>
      <p>Corte: {cutoff}</p>
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
          <strong>{row.value}</strong>
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
          <h2 id="decision-title" style={{ marginTop: 14 }}>{title}</h2>
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
        <h3>Puedes gestionar el siguiente paso con tu entidad.</h3>
        <p className="section-copy">Te mostraremos qué solicitar y qué evidencia conservar. No necesitas contratar acompañamiento para usar esta ruta.</p>
        <a className="button button-secondary" href="#diy">Ver pasos</a>
      </article>
      <article className="surface choice-card">
        <p className="eyebrow">Acompañamiento</p>
        <h3>Podemos ayudarte a verificar y ejecutar la decisión.</h3>
        <p className="section-copy">Primero confirmamos los datos del crédito. Una gestión de terceros sigue sujeta a sus propias decisiones y políticas.</p>
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
          <p className="eyebrow">Mortgage Twin</p>
          <h2 id="twin-title">Tu crédito, entendido como un sistema vivo.</h2>
          <p className="section-copy">Este ejemplo muestra cómo se organizará la información cuando el extracto haya sido revisado y conciliado.</p>
        </div>
        <PrecisionBadge level="C3" />
      </div>
      <dl className="twin-facts">
        <FinancialNumber label="Saldo" value="$180.000.000" />
        <FinancialNumber label="Cuota" value="$2.100.000" />
        <FinancialNumber label="Tasa" value="11,7 % EA" />
        <FinancialNumber label="Plazo restante" value="17 años" />
      </dl>
      <ScenarioPath start="Estado verificado" action="Decisión" outcome="Nueva trayectoria" />
    </section>
  );
}
