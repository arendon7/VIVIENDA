"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PrecisionBadge } from "@/components/vivienda/signature-components";
import {
  compareEconomicQuotePair,
  type EconomicComparisonScenario,
  type EconomicPairGateCode,
  type EconomicQuoteModel,
  type EconomicQuotePairComparison,
  type LeasingOptionScenario,
} from "@/domain/economic-quote-comparison/evaluator";
import type { FinancingQuoteInput } from "@/domain/quote-normalization/evaluator";
import styles from "./economic-comparison.module.css";

type Props = {
  quoteA: FinancingQuoteInput;
  quoteB: FinancingQuoteInput;
  onBack: () => void;
  onEditA: () => void;
  onEditB: () => void;
};

type LeasingChoice = "" | "exercise" | "no_exercise";
type PercentageBase = "" | "property_value" | "financed_amount";

type ScenarioFormState = {
  uvrAnnualGrowthPercent: string;
  usePresentValue: boolean;
  annualDiscountPercent: string;
  leasingChoiceA: LeasingChoice;
  leasingChoiceB: LeasingChoice;
  leasingBaseA: PercentageBase;
  leasingBaseB: PercentageBase;
};

const initialScenarioForm: ScenarioFormState = {
  uvrAnnualGrowthPercent: "",
  usePresentValue: false,
  annualDiscountPercent: "",
  leasingChoiceA: "",
  leasingChoiceB: "",
  leasingBaseA: "",
  leasingBaseB: "",
};

const gateCopy: Record<EconomicPairGateCode, string> = {
  quote_model_blocked: "Al menos una cotización no pudo convertirse en un flujo gobernado con los datos y supuestos actuales.",
  property_value_differs: "Las cotizaciones parten de valores de inmueble distintos.",
  financed_amount_differs: "Los montos financiados son distintos; el desembolso inicial cambia la base económica.",
  term_differs: "Los plazos contractuales son distintos.",
  discount_rate_missing: "No definiste una tasa anual de comparación para valorar desembolsos en fechas distintas.",
  full_acquisition_not_equivalent: "Los dos caminos no terminan en una adquisición equivalente bajo este escenario.",
};

function money(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value);
}

function parsePercent(raw: string, label: string): number {
  if (!raw.trim()) throw new Error(`Completa ${label}.`);
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Revisa ${label}: el valor no se puede interpretar.`);
  return value / 100;
}

function quoteLabel(input: FinancingQuoteInput, fallback: string): string {
  return input.providerName?.trim() || fallback;
}

function structureLabel(input: FinancingQuoteInput): string {
  const structure = input.contractStructure === "housing_leasing" ? "Leasing habitacional" : "Crédito hipotecario";
  return `${structure} · ${input.denomination?.toUpperCase() ?? "sin denominación"}`;
}

function leasingNeedsPercentageBase(input: FinancingQuoteInput): boolean {
  return (
    input.contractStructure === "housing_leasing" &&
    input.leasingPurchaseOptionValue === undefined &&
    input.leasingPurchaseOptionPercentage !== undefined
  );
}

function buildLeasingOption(
  input: FinancingQuoteInput,
  choice: LeasingChoice,
  base: PercentageBase,
): LeasingOptionScenario | null {
  if (input.contractStructure !== "housing_leasing") return null;
  if (!choice) throw new Error(`Define si ejercerás la opción de compra de ${quoteLabel(input, input.quoteId)}.`);
  if (choice === "no_exercise") return { exercise: false };

  if (leasingNeedsPercentageBase(input) && !base) {
    throw new Error(`Define la base porcentual de la opción de compra de ${quoteLabel(input, input.quoteId)}.`);
  }

  const result: LeasingOptionScenario = {
    exercise: true,
    timing: "contract_end",
  };
  if (base) result.percentageBase = base;
  return result;
}

function ModelCard({ model, input, fallback }: { model: EconomicQuoteModel; input: FinancingQuoteInput; fallback: string }) {
  const label = quoteLabel(input, fallback);

  if (!model.cashFlow) {
    return (
      <article className={styles.quoteCard}>
        <p className="eyebrow">{label}</p>
        <h3>No pudimos modelar este flujo</h3>
        <p>{structureLabel(input)}</p>
        <ul className={styles.issueList}>
          {model.issues.map((issue) => <li key={issue.code}>{issue.message}</li>)}
        </ul>
      </article>
    );
  }

  const flow = model.cashFlow;
  return (
    <article className={styles.quoteCard}>
      <div className={styles.quoteTopline}>
        <span>{label}</span>
        <span>{structureLabel(input)}</span>
      </div>
      <div className={styles.metricGrid}>
        <div><span>Efectivo al cierre</span><strong>{money(flow.initialCashOutflow)}</strong></div>
        <div><span>Cuotas/cánones modelados</span><strong>{money(flow.recurringBaseOutflow)}</strong></div>
        <div><span>Seguros externos modelados</span><strong>{money(flow.recurringInsuranceOutflow)}</strong></div>
        <div><span>Opción de compra</span><strong>{money(flow.purchaseOptionOutflow)}</strong></div>
        <div className={styles.metricEmphasis}><span>Desembolso nominal modelado</span><strong>{money(flow.nominalTotalOutflow)}</strong></div>
        {flow.presentValueOutflow !== null ? (
          <div className={styles.metricEmphasis}><span>Valor presente modelado</span><strong>{money(flow.presentValueOutflow)}</strong></div>
        ) : null}
      </div>
      <p className={styles.cardFootnote}>Plazo declarado: {input.termMonths} meses · {flow.fullAcquisition ? "adquisición completa incluida en el escenario" : "sin adquisición completa en el escenario"}.</p>
    </article>
  );
}

function MetricComparison({
  title,
  result,
  gateIssues,
  quoteA,
  quoteB,
  emptyCopy,
}: {
  title: string;
  result: EconomicQuotePairComparison["nominal"];
  gateIssues: EconomicPairGateCode[];
  quoteA: FinancingQuoteInput;
  quoteB: FinancingQuoteInput;
  emptyCopy?: string;
}) {
  return (
    <section className={styles.metricSection}>
      <h3>{result.isComparable ? title : emptyCopy ?? `No rankeamos ${title.toLowerCase()}`}</h3>
      {result.isComparable ? (
        result.tie ? (
          <p>La diferencia está dentro de COP 1; tratamos el resultado como empate técnico.</p>
        ) : (
          <div className={styles.metricResult}>
            <strong>{result.lowerQuoteId === quoteA.quoteId ? quoteLabel(quoteA, "Cotización A") : quoteLabel(quoteB, "Cotización B")}</strong>
            <span>Diferencia modelada: {money(result.absoluteDifference ?? 0)}</span>
          </div>
        )
      ) : (
        <ul className={styles.issueList}>
          {gateIssues.map((issue) => <li key={issue}>{gateCopy[issue]}</li>)}
        </ul>
      )}
    </section>
  );
}

export function EconomicComparisonPanel({ quoteA, quoteB, onBack, onEditA, onEditB }: Props) {
  const [form, setForm] = useState<ScenarioFormState>(initialScenarioForm);
  const [result, setResult] = useState<EconomicQuotePairComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  const needsUvrScenario = quoteA.denomination === "uvr" || quoteB.denomination === "uvr";
  const hasLeasing = quoteA.contractStructure === "housing_leasing" || quoteB.contractStructure === "housing_leasing";
  const structuresDiffer = quoteA.contractStructure !== quoteB.contractStructure;

  useEffect(() => {
    if (result) resultHeadingRef.current?.focus();
  }, [result]);

  const scenarioSummary = useMemo(() => {
    if (!result) return null;
    return {
      uvr: result.quoteA.cashFlow?.assumptions.uvrAnnualGrowthRate ?? result.quoteB.cashFlow?.assumptions.uvrAnnualGrowthRate ?? null,
      discount: result.quoteA.cashFlow?.assumptions.annualDiscountRate ?? result.quoteB.cashFlow?.assumptions.annualDiscountRate ?? null,
    };
  }, [result]);

  function update<K extends keyof ScenarioFormState>(key: K, value: ScenarioFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function runScenario() {
    try {
      const scenario: EconomicComparisonScenario = { scenarioId: "interactive-v0.19" };

      if (needsUvrScenario) {
        scenario.uvrScenario = {
          kind: "constant_annual_growth",
          annualGrowthRate: parsePercent(form.uvrAnnualGrowthPercent, "la variación anual de UVR"),
        };
      }

      if (form.usePresentValue) {
        scenario.annualDiscountRate = parsePercent(form.annualDiscountPercent, "la tasa anual de comparación");
      }

      const leasingOptions: Record<string, LeasingOptionScenario> = {};
      const optionA = buildLeasingOption(quoteA, form.leasingChoiceA, form.leasingBaseA);
      const optionB = buildLeasingOption(quoteB, form.leasingChoiceB, form.leasingBaseB);
      if (optionA) leasingOptions[quoteA.quoteId] = optionA;
      if (optionB) leasingOptions[quoteB.quoteId] = optionB;
      if (Object.keys(leasingOptions).length > 0) scenario.leasingOptions = leasingOptions;

      setResult(compareEconomicQuotePair(quoteA, quoteB, scenario));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos construir el escenario con estos supuestos.");
    }
  }

  if (result) {
    const title = result.status === "blocked"
      ? "Todavía falta una condición para modelar ambos flujos"
      : result.status === "modeled_not_rankable"
        ? "Ya modelamos los flujos, pero no sería responsable rankearlos"
        : result.status === "nominally_comparable"
          ? "Los desembolsos nominales ya están sobre una base comparable"
          : "También puedes comparar el valor presente de los desembolsos";

    return (
      <div className={styles.panel}>
        <section className={`surface ${styles.resultHero}`}>
          <div className={styles.resultTopline}>
            <PrecisionBadge level="C2" />
            <span>C1 declarado → C2 modelado · no verificado</span>
          </div>
          <p className="eyebrow">Resultado de escenario</p>
          <h2 ref={resultHeadingRef} tabIndex={-1}>{title}</h2>
          <p>Los números siguientes dependen de las cotizaciones que digitaste y de los supuestos visibles de este escenario.</p>
        </section>

        <div className={styles.quoteGrid}>
          <ModelCard model={result.quoteA} input={quoteA} fallback="Cotización A" />
          <ModelCard model={result.quoteB} input={quoteB} fallback="Cotización B" />
        </div>

        {scenarioSummary?.uvr !== null ? (
          <section className={`surface ${styles.assumptionPanel}`} aria-labelledby="uvr-scenario-heading">
            <p className="eyebrow">Sensibilidad UVR</p>
            <h2 id="uvr-scenario-heading">UVR usada en este escenario: {percent(scenarioSummary.uvr)}</h2>
            <p>Es un supuesto elegido para esta simulación, no una proyección oficial. <strong>Si la UVR cambia, este resultado cambia.</strong></p>
          </section>
        ) : null}

        <section className={`surface ${styles.comparisonPanel}`} aria-labelledby="comparison-metrics-heading">
          <p className="eyebrow">Comparabilidad</p>
          <h2 id="comparison-metrics-heading">Qué métrica podemos comparar responsablemente</h2>
          <MetricComparison
            title="Menor desembolso nominal modelado bajo este escenario"
            result={result.nominal}
            gateIssues={result.nominalGateIssues}
            quoteA={quoteA}
            quoteB={quoteB}
            emptyCopy="No rankeamos el desembolso nominal"
          />
          {scenarioSummary?.discount !== null ? (
            <MetricComparison
              title="Menor valor presente de desembolsos bajo tu tasa de comparación"
              result={result.presentValue}
              gateIssues={result.presentValueGateIssues}
              quoteA={quoteA}
              quoteB={quoteB}
              emptyCopy="No rankeamos el valor presente"
            />
          ) : (
            <section className={styles.metricSection}>
              <h3>No calculamos valor presente</h3>
              <p>No definiste una tasa de comparación para valorar desembolsos que ocurren en fechas distintas.</p>
            </section>
          )}
        </section>

        {scenarioSummary?.discount !== null ? (
          <section className={styles.inlineAssumption}>
            <strong>Tasa anual de comparación: {percent(scenarioSummary.discount)}</strong>
            <p>Es un supuesto para valorar el dinero en el tiempo; no es la tasa del banco ni una recomendación de mercado.</p>
          </section>
        ) : null}

        {structuresDiffer ? (
          <section className={styles.structuralCaveat}>
            <strong>Crédito y leasing no se reducen a este número.</strong>
            <p>El momento de adquisición y las características contractuales/jurídicas son distintas y no quedan reducidas a este indicador de flujo de caja.</p>
          </section>
        ) : null}

        <details className={styles.explainability}>
          <summary>Cómo se construyó este escenario</summary>
          <ol>
            <li>El efectivo al cierre viene del total declarado en cada cotización.</li>
            <li>Los costos de una sola vez no se suman otra vez sobre ese total.</li>
            <li>En pesos con cuota nominal constante usamos la cuota/canon declarado como base recurrente.</li>
            <li>Solo añadimos seguro por fuera cuando la cotización lo declara excluido o parcialmente excluido.</li>
            <li>En UVR usamos únicamente la trayectoria de sensibilidad que elegiste.</li>
            <li>La opción de compra del leasing entra solo bajo tu decisión explícita.</li>
            <li>El valor presente existe únicamente si definiste una tasa de comparación.</li>
          </ol>
        </details>

        <section className={styles.truthBoundary} aria-label="Límites del escenario económico">
          <strong>Qué sí hizo</strong>
          <p>Transformó datos declarados y supuestos explícitos en flujos C2 y aplicó gates de comparabilidad.</p>
          <strong>Qué no hizo</strong>
          <p>No verificó la cotización, no predijo UVR, no eligió el mejor banco, no evaluó aprobación y no garantiza ahorro.</p>
        </section>

        <div className={styles.actions}>
          <button className="button button-primary" type="button" onClick={() => setResult(null)}>Cambiar supuestos</button>
          <button className="button button-secondary" type="button" onClick={onEditA}>Editar cotización A</button>
          <button className="button button-secondary" type="button" onClick={onEditB}>Editar cotización B</button>
          <button className="button button-secondary" type="button" onClick={onBack}>Volver a la base de cotizaciones</button>
        </div>
      </div>
    );
  }

  function LeasingScenarioBlock({ input, slot }: { input: FinancingQuoteInput; slot: "A" | "B" }) {
    if (input.contractStructure !== "housing_leasing") return null;
    const choiceKey = slot === "A" ? "leasingChoiceA" : "leasingChoiceB";
    const baseKey = slot === "A" ? "leasingBaseA" : "leasingBaseB";
    const choice = form[choiceKey];
    const base = form[baseKey];

    return (
      <fieldset className={styles.choiceBlock}>
        <legend>¿Cómo quieres tratar la opción de compra de {quoteLabel(input, `Cotización ${slot}`)}?</legend>
        <label>
          <input type="radio" name={`leasing-${slot}`} checked={choice === "exercise"} onChange={() => update(choiceKey, "exercise")} />
          <span><strong>Sí, incluir la opción de compra al final</strong><small>Modela un camino de adquisición completa.</small></span>
        </label>
        <label>
          <input type="radio" name={`leasing-${slot}`} checked={choice === "no_exercise"} onChange={() => update(choiceKey, "no_exercise")} />
          <span><strong>No, modelar solo los cánones</strong><small>El resultado no será equivalente a adquirir el inmueble.</small></span>
        </label>
        {choice === "exercise" && leasingNeedsPercentageBase(input) ? (
          <div className={styles.nestedField}>
            <label htmlFor={`leasing-base-${slot}`}>¿Sobre qué base está expresado el porcentaje?</label>
            <select id={`leasing-base-${slot}`} value={base} onChange={(event) => update(baseKey, event.target.value as PercentageBase)}>
              <option value="">Selecciona la base declarada</option>
              <option value="property_value">Valor del inmueble</option>
              <option value="financed_amount">Monto financiado</option>
            </select>
          </div>
        ) : null}
      </fieldset>
    );
  }

  return (
    <div className={styles.panel}>
      <section className={`surface ${styles.formHero}`}>
        <div className={styles.resultTopline}>
          <PrecisionBadge level="C2" />
          <span>Supuestos visibles · resultado de escenario</span>
        </div>
        <p className="eyebrow">Escenario económico</p>
        <h2>Compara flujos bajo supuestos que puedes ver y cambiar</h2>
        <p>Usamos las dos cotizaciones que acabas de estructurar. Los datos siguen siendo C1 declarados; el nuevo resultado será un cálculo C2, no una verificación.</p>
      </section>

      <section className={`surface ${styles.scenarioForm}`} aria-labelledby="scenario-inputs-heading">
        <h2 id="scenario-inputs-heading">Supuestos del escenario</h2>

        {needsUvrScenario ? (
          <div className={styles.fieldBlock}>
            <label htmlFor="uvr-growth">¿Qué variación anual de UVR quieres probar?</label>
            <div className={styles.inputSuffix}>
              <input id="uvr-growth" type="number" step="0.01" inputMode="decimal" value={form.uvrAnnualGrowthPercent} onChange={(event) => update("uvrAnnualGrowthPercent", event.target.value)} />
              <span>% anual</span>
            </div>
            <small>Es un supuesto de sensibilidad, no una predicción. Si la UVR cambia, este resultado cambia.</small>
          </div>
        ) : null}

        {hasLeasing ? (
          <div className={styles.leasingGrid}>
            <LeasingScenarioBlock input={quoteA} slot="A" />
            <LeasingScenarioBlock input={quoteB} slot="B" />
          </div>
        ) : null}

        <fieldset className={styles.choiceBlock}>
          <legend>¿Quieres comparar también el valor del dinero en el tiempo?</legend>
          <label>
            <input type="radio" name="pv-choice" checked={!form.usePresentValue} onChange={() => update("usePresentValue", false)} />
            <span><strong>No por ahora</strong><small>Verás desembolsos nominales y los gates de comparabilidad.</small></span>
          </label>
          <label>
            <input type="radio" name="pv-choice" checked={form.usePresentValue} onChange={() => update("usePresentValue", true)} />
            <span><strong>Sí, usar una tasa de comparación</strong><small>Permite valorar hoy pagos que ocurren en momentos distintos.</small></span>
          </label>
        </fieldset>

        {form.usePresentValue ? (
          <div className={styles.fieldBlock}>
            <label htmlFor="discount-rate">Tasa anual de comparación</label>
            <div className={styles.inputSuffix}>
              <input id="discount-rate" type="number" step="0.01" inputMode="decimal" value={form.annualDiscountPercent} onChange={(event) => update("annualDiscountPercent", event.target.value)} />
              <span>% anual</span>
            </div>
            <small>Es tu supuesto para valorar hoy desembolsos que ocurren en fechas distintas. No es la tasa del banco ni una recomendación de mercado.</small>
          </div>
        ) : null}

        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        <div className={styles.actions}>
          <button className="button button-primary" type="button" onClick={runScenario}>Modelar este escenario</button>
          <button className="button button-secondary" type="button" onClick={onBack}>Volver a la base de cotizaciones</button>
        </div>
      </section>

      <section className={styles.preBoundary}>
        <strong>Antes de continuar</strong>
        <p>Una diferencia modelada no es ahorro garantizado ni una recomendación. Cambiar los supuestos puede cambiar el resultado.</p>
      </section>
    </div>
  );
}
