"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PrecisionBadge } from "@/components/vivienda/signature-components";
import {
  evaluateHomeReadiness,
  HomeReadinessError,
  type DocumentationReadiness,
  type HomeReadinessDimension,
  type HomeReadinessResult,
  type IncomeContinuity,
} from "@/domain/home-readiness/evaluator";
import type { HousingCategory } from "@/domain/buyer-affordability/calculator";
import styles from "./home-readiness.module.css";

export type HomeReadinessInitialFacts = {
  netHouseholdIncomeMonthly: number;
  currentMonthlyDebtPayments: number;
  availableDownPayment: number;
  housingCategory: HousingCategory;
  planningFinancing?: {
    annualEffectiveRate: number;
    termMonths: number;
    monthlyNonCreditHousingCosts?: number;
  };
};

type Props = {
  initialFacts?: HomeReadinessInitialFacts;
  embedded?: boolean;
  onEditBase?: () => void;
};

type FlowStage = "basic" | "partial" | "continuity" | "documentation" | "financing" | "result";

type Choice<T extends string> = {
  value: T;
  label: string;
  detail?: string;
};

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat("es-CO", {
  style: "percent",
  maximumFractionDigits: 1,
});

const continuityChoices: Array<Choice<IncomeContinuity>> = [
  { value: "established_12_plus", label: "Tengo una historia comparable de 12 meses o más" },
  { value: "established_6_to_12", label: "Entre 6 y 12 meses" },
  { value: "variable_with_12_plus_history", label: "Mis ingresos varían, pero tengo 12 meses o más de historia" },
  { value: "recent_under_6", label: "Esta fuente de ingresos tiene menos de 6 meses" },
  { value: "irregular_or_recently_changed", label: "Cambió recientemente o todavía es irregular" },
  { value: "unknown", label: "No estoy seguro" },
];

const documentationChoices: Array<Choice<DocumentationReadiness>> = [
  { value: "ready", label: "Tengo organizados los soportes principales" },
  { value: "mostly_ready", label: "Tengo la mayoría" },
  { value: "partial", label: "Tengo algunos, pero faltan varios" },
  { value: "not_ready", label: "Todavía no los he organizado" },
  { value: "unknown", label: "No estoy seguro de qué necesitaría" },
];

const categoryChoices: Array<Choice<HousingCategory>> = [
  { value: "non_vis", label: "No VIS" },
  { value: "vis", label: "VIS" },
  { value: "unknown", label: "No estoy seguro" },
];

const bandLabel: Record<NonNullable<HomeReadinessResult["band"]>, string> = {
  foundation_needed: "Base por preparar",
  developing: "En construcción",
  progressing: "Buen avance",
  well_prepared: "Preparación sólida",
};

const bandExplanation: Record<NonNullable<HomeReadinessResult["band"]>, string> = {
  foundation_needed: "Hay varias piezas del plan que conviene fortalecer antes de tratar el objetivo como listo para ejecutar.",
  developing: "Ya tienes parte de la base; una o dos mejoras concretas pueden cambiar materialmente tu planificación.",
  progressing: "El plan tiene una base útil. Revisa las dimensiones más débiles antes de comparar opciones de financiación.",
  well_prepared: "Tus datos declarados forman un plan coherente bajo esta metodología. Eso no sustituye la evaluación de una entidad.",
};

function money(value: number) {
  return cop.format(Math.round(value));
}

function parseNumber(value: string) {
  if (value.trim() === "") return Number.NaN;
  return Number(value);
}

function RadioChoices<T extends string>({
  name,
  choices,
  value,
  onChange,
}: {
  name: string;
  choices: Array<Choice<T>>;
  value: T | null;
  onChange: (next: T) => void;
}) {
  return (
    <div className="choice-list">
      {choices.map((choice) => (
        <label className="radio-card" key={choice.value}>
          <input
            type="radio"
            name={name}
            value={choice.value}
            checked={value === choice.value}
            onChange={() => onChange(choice.value)}
          />
          <span>
            <strong>{choice.label}</strong>
            {choice.detail ? <small>{choice.detail}</small> : null}
          </span>
        </label>
      ))}
    </div>
  );
}

function dimensionStatus(dimension: HomeReadinessDimension) {
  if (dimension.status === "needs_information") return "Falta información";
  return `${dimension.score ?? 0}/20`;
}

function DimensionCard({ dimension }: { dimension: HomeReadinessDimension }) {
  const scorePercent = dimension.score === null ? 0 : (dimension.score / dimension.maxScore) * 100;

  return (
    <article className={`surface ${styles.dimensionCard}`}>
      <div className={styles.dimensionHeader}>
        <div>
          <span className={styles.dimensionMax}>20 puntos máx.</span>
          <h3>{dimension.label}</h3>
        </div>
        <strong className={dimension.status === "needs_information" ? styles.missingScore : styles.dimensionScore}>
          {dimensionStatus(dimension)}
        </strong>
      </div>
      {dimension.status === "scored" ? (
        <div
          className={styles.dimensionTrack}
          role="progressbar"
          aria-label={`${dimension.label}: ${dimension.score} de 20`}
          aria-valuemin={0}
          aria-valuemax={20}
          aria-valuenow={dimension.score ?? 0}
        >
          <span style={{ width: `${scorePercent}%` }} />
        </div>
      ) : null}
      <dl className={styles.dimensionFacts}>
        {dimension.facts.map((fact) => (
          <div key={`${dimension.code}-${fact.label}`}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
      <p>{dimension.explanation}</p>
      {dimension.nextAction ? <p className={styles.dimensionAction}><strong>Siguiente acción:</strong> {dimension.nextAction}</p> : null}
      <p className={styles.caveat}>{dimension.caveat}</p>
    </article>
  );
}

export function HomeReadinessTool({ initialFacts, embedded = false, onEditBase }: Props) {
  const [stage, setStage] = useState<FlowStage>("basic");
  const [income, setIncome] = useState(initialFacts ? String(initialFacts.netHouseholdIncomeMonthly) : "");
  const [debts, setDebts] = useState(initialFacts ? String(initialFacts.currentMonthlyDebtPayments) : "0");
  const [downPayment, setDownPayment] = useState(initialFacts ? String(initialFacts.availableDownPayment) : "0");
  const [targetPrice, setTargetPrice] = useState("");
  const [category, setCategory] = useState<HousingCategory>(initialFacts?.housingCategory ?? "unknown");
  const [continuity, setContinuity] = useState<IncomeContinuity | null>(null);
  const [documentation, setDocumentation] = useState<DocumentationReadiness | null>(null);
  const [ratePercent, setRatePercent] = useState(initialFacts?.planningFinancing ? String(initialFacts.planningFinancing.annualEffectiveRate * 100) : "");
  const [termYears, setTermYears] = useState(initialFacts?.planningFinancing ? String(initialFacts.planningFinancing.termMonths / 12) : "20");
  const [otherHousingCosts, setOtherHousingCosts] = useState(initialFacts?.planningFinancing?.monthlyNonCreditHousingCosts === undefined ? "" : String(initialFacts.planningFinancing.monthlyNonCreditHousingCosts));
  const [result, setResult] = useState<HomeReadinessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  const hasPrefilledBase = initialFacts !== undefined;
  const knownCategoryFromContext = hasPrefilledBase && initialFacts.housingCategory !== "unknown";
  const hasPrefilledFinancing = initialFacts?.planningFinancing !== undefined;

  const financialInput = useMemo(() => ({
    netHouseholdIncomeMonthly: parseNumber(income),
    currentMonthlyDebtPayments: parseNumber(debts),
    availableDownPayment: parseNumber(downPayment),
    targetPropertyPrice: parseNumber(targetPrice),
    housingCategory: category,
  }), [category, debts, downPayment, income, targetPrice]);

  useEffect(() => {
    if ((stage === "partial" || stage === "result") && result) resultHeadingRef.current?.focus();
  }, [result, stage]);

  function validateBase() {
    if (!Number.isFinite(financialInput.netHouseholdIncomeMonthly) || financialInput.netHouseholdIncomeMonthly <= 0) {
      return "Ingresa un ingreso mensual del hogar mayor que cero.";
    }
    if (!Number.isFinite(financialInput.currentMonthlyDebtPayments) || financialInput.currentMonthlyDebtPayments < 0) {
      return "Las cuotas mensuales de otras deudas no pueden ser negativas.";
    }
    if (!Number.isFinite(financialInput.availableDownPayment) || financialInput.availableDownPayment < 0) {
      return "La cuota inicial disponible no puede ser negativa.";
    }
    if (!Number.isFinite(financialInput.targetPropertyPrice) || financialInput.targetPropertyPrice <= 0) {
      return "Ingresa un precio objetivo de vivienda mayor que cero.";
    }
    return null;
  }

  function financingInput() {
    const rate = Number(ratePercent);
    const years = Number(termYears);
    const monthlyCosts = otherHousingCosts.trim() === "" ? undefined : Number(otherHousingCosts);

    if (!Number.isFinite(rate) || rate <= 0) return { error: "Ingresa una tasa EA mayor que cero para completar el encaje del objetivo." } as const;
    if (!Number.isInteger(years) || years < 5 || years > 30) return { error: "Usa un plazo entero entre 5 y 30 años." } as const;
    if (monthlyCosts !== undefined && (!Number.isFinite(monthlyCosts) || monthlyCosts < 0)) return { error: "Los costos mensuales adicionales no pueden ser negativos." } as const;

    return {
      value: {
        annualEffectiveRate: rate / 100,
        termMonths: years * 12,
        ...(monthlyCosts === undefined ? {} : { monthlyNonCreditHousingCosts: monthlyCosts }),
      },
    } as const;
  }

  function runEvaluation(args: {
    continuityValue: IncomeContinuity;
    documentationValue: DocumentationReadiness;
    includeFinancing: boolean;
  }) {
    const baseError = validateBase();
    if (baseError) {
      setError(baseError);
      return null;
    }

    let planningFinancing: ReturnType<typeof financingInput>["value"] | undefined;
    if (args.includeFinancing) {
      const financing = financingInput();
      if ("error" in financing) {
        setError(financing.error);
        return null;
      }
      planningFinancing = financing.value;
    }

    try {
      const next = evaluateHomeReadiness({
        ...financialInput,
        incomeContinuity: args.continuityValue,
        documentationReadiness: args.documentationValue,
        ...(planningFinancing === undefined ? {} : { planningFinancing }),
      });
      setResult(next);
      setError(null);
      return next;
    } catch (cause) {
      if (cause instanceof HomeReadinessError) setError(cause.message);
      else setError("No pudimos construir este perfil. Revisa los datos e inténtalo de nuevo.");
      return null;
    }
  }

  function showPartial() {
    const includeContextFinancing = hasPrefilledFinancing;
    const next = runEvaluation({
      continuityValue: "unknown",
      documentationValue: "unknown",
      includeFinancing: includeContextFinancing,
    });
    if (next) setStage("partial");
  }

  function startCompletion() {
    setError(null);
    setStage("continuity");
  }

  function saveContinuity() {
    if (!continuity) {
      setError("Selecciona la opción que mejor describa la continuidad de tus ingresos.");
      return;
    }
    setError(null);
    setStage("documentation");
  }

  function saveDocumentation() {
    if (!documentation) {
      setError("Selecciona el estado que mejor describa tus soportes actuales.");
      return;
    }
    setError(null);
    setStage("financing");
  }

  function completeWithScenario() {
    if (!continuity || !documentation) return;
    const next = runEvaluation({
      continuityValue: continuity,
      documentationValue: documentation,
      includeFinancing: true,
    });
    if (next) setStage("result");
  }

  function completeWithoutScenario() {
    if (!continuity || !documentation) return;
    const next = runEvaluation({
      continuityValue: continuity,
      documentationValue: documentation,
      includeFinancing: false,
    });
    if (next) setStage("result");
  }

  function editBase() {
    setError(null);
    setResult(null);
    if (embedded && onEditBase) {
      onEditBase();
      return;
    }
    setStage("basic");
  }

  function editContinuity() {
    setError(null);
    setStage("continuity");
  }

  function editDocumentation() {
    setError(null);
    setStage("documentation");
  }

  function editFinancing() {
    setError(null);
    setStage("financing");
  }

  const formStep = stage === "continuity" ? 1 : stage === "documentation" ? 2 : stage === "financing" ? 3 : null;
  const resultIsComplete = result?.indexStatus === "complete" && result.totalScore !== null && result.band !== null;

  return (
    <div className={`${styles.tool} ${embedded ? styles.embedded : ""}`}>
      {!embedded ? (
        <section className={styles.intro}>
          <p className="eyebrow">Preparación para comprar</p>
          <h1>¿Qué tan preparado está hoy tu plan de compra?</h1>
          <p className="lede">Construye un perfil explicable en cinco dimensiones y descubre qué conviene mejorar primero, sin presentarlo como una supuesta calificación bancaria.</p>
          <p className="trust-line">No necesitas nombre, cédula, correo, teléfono ni consulta a centrales para ver tu preparación.</p>
        </section>
      ) : null}

      {stage === "basic" ? (
        <section className={`surface ${styles.formCard}`} aria-labelledby="readiness-basic-heading">
          <div className={styles.formHeader}>
            <PrecisionBadge level="C1" />
            <div>
              <p className="eyebrow">Punto de partida</p>
              <h2 id="readiness-basic-heading">{hasPrefilledBase ? "Completa solo lo que todavía no sabemos" : "Cuéntanos el plan que estás evaluando"}</h2>
            </div>
          </div>

          {hasPrefilledBase ? (
            <div className={styles.prefillPanel} aria-label="Datos reutilizados del cálculo de capacidad">
              <strong>Reutilizamos tu cálculo anterior</strong>
              <dl>
                <div><dt>Ingreso neto del hogar</dt><dd>{money(financialInput.netHouseholdIncomeMonthly)}</dd></div>
                <div><dt>Otras cuotas mensuales</dt><dd>{money(financialInput.currentMonthlyDebtPayments)}</dd></div>
                <div><dt>Cuota inicial</dt><dd>{money(financialInput.availableDownPayment)}</dd></div>
                <div><dt>Categoría</dt><dd>{category === "vis" ? "VIS" : category === "non_vis" ? "No VIS" : "No confirmada"}</dd></div>
              </dl>
              <p>No enviamos estos valores por la URL ni te pedimos escribirlos de nuevo.</p>
            </div>
          ) : null}

          <div className={styles.fields}>
            {!hasPrefilledBase ? (
              <>
                <div className="field-group">
                  <label className="field-label" htmlFor="readiness-income">Ingreso neto mensual del hogar</label>
                  <span className="field-hint" id="readiness-income-hint">Valor aproximado después de descuentos.</span>
                  <input className="field-control" id="readiness-income" type="number" min="1" inputMode="numeric" aria-describedby="readiness-income-hint readiness-error" value={income} onChange={(event) => setIncome(event.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="readiness-debts">Cuotas mensuales de otras deudas</label>
                  <span className="field-hint" id="readiness-debts-hint">Obligaciones recurrentes actuales.</span>
                  <input className="field-control" id="readiness-debts" type="number" min="0" inputMode="numeric" aria-describedby="readiness-debts-hint readiness-error" value={debts} onChange={(event) => setDebts(event.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="readiness-down">Cuota inicial disponible</label>
                  <span className="field-hint" id="readiness-down-hint">Recursos que destinarías al precio; no descontamos costos de cierre en esta versión.</span>
                  <input className="field-control" id="readiness-down" type="number" min="0" inputMode="numeric" aria-describedby="readiness-down-hint readiness-error" value={downPayment} onChange={(event) => setDownPayment(event.target.value)} />
                </div>
              </>
            ) : null}

            <div className="field-group">
              <label className="field-label" htmlFor="readiness-target">Precio de la vivienda que tienes en mente</label>
              <span className="field-hint" id="readiness-target-hint">No tiene que ser definitivo. Lo usamos para medir el encaje de tu objetivo.</span>
              <input className="field-control" id="readiness-target" type="number" min="1" inputMode="numeric" placeholder="350000000" aria-describedby="readiness-target-hint readiness-error" value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} />
            </div>

            {!knownCategoryFromContext ? (
              <fieldset className="field-group">
                <legend className="field-label">¿El objetivo sería VIS?</legend>
                <p className="field-hint">Si todavía no lo sabes, no elegimos una referencia por ti.</p>
                <RadioChoices name="readiness-category" choices={categoryChoices} value={category} onChange={setCategory} />
              </fieldset>
            ) : null}
          </div>

          {error ? <p className={styles.error} id="readiness-error" role="alert">{error}</p> : <span className="sr-only" id="readiness-error">Sin errores</span>}

          <div className={styles.formActions}>
            <button className="button button-primary" type="button" onClick={showPartial}>Ver mi punto de partida</button>
            {embedded && onEditBase ? <button className="button button-secondary" type="button" onClick={onEditBase}>Editar cálculo anterior</button> : null}
          </div>
        </section>
      ) : null}

      {stage === "continuity" || stage === "documentation" || stage === "financing" ? (
        <section className={`surface ${styles.formCard}`} aria-labelledby="readiness-step-heading">
          <div className="progress-label">Paso {formStep} de 3 para completar el índice</div>
          <div className="progress-track" role="progressbar" aria-label="Progreso para completar preparación" aria-valuemin={1} aria-valuemax={3} aria-valuenow={formStep ?? 1} aria-valuetext={`Paso ${formStep} de 3`}>
            <div className="progress-fill" style={{ width: `${((formStep ?? 1) / 3) * 100}%` }} />
          </div>

          {stage === "continuity" ? (
            <fieldset className={styles.question}>
              <legend id="readiness-step-heading">¿Qué describe mejor la continuidad de los ingresos que usarías para comprar?</legend>
              <p>No calificamos mejor a una persona por ser asalariada ni peor por ser independiente. Aquí miramos continuidad declarada, no tipo de ocupación.</p>
              <RadioChoices name="readiness-continuity" choices={continuityChoices} value={continuity} onChange={setContinuity} />
            </fieldset>
          ) : null}

          {stage === "documentation" ? (
            <fieldset className={styles.question}>
              <legend id="readiness-step-heading">¿Qué tan organizados están hoy los soportes de los datos que estás usando para planear?</legend>
              <p>Por ejemplo: soportes de ingresos, movimientos o certificaciones cuando correspondan y estados de obligaciones actuales. Los requisitos exactos dependen después de cada entidad.</p>
              <RadioChoices name="readiness-documentation" choices={documentationChoices} value={documentation} onChange={setDocumentation} />
            </fieldset>
          ) : null}

          {stage === "financing" ? (
            <div className={styles.question}>
              <h2 id="readiness-step-heading">Para medir el encaje de tu objetivo necesitamos un escenario que tú elijas.</h2>
              <p>Casa con Criterio no inserta una tasa de mercado ni supone una oferta bancaria. Usa una tasa y plazo que quieras probar.</p>
              {hasPrefilledFinancing ? <p className={styles.contextHint}>Ya cargamos el escenario que modelaste antes. Puedes usarlo o editarlo.</p> : null}
              <div className={styles.fields}>
                <div className="field-group">
                  <label className="field-label" htmlFor="readiness-rate">Tasa efectiva anual del escenario (%)</label>
                  <input className="field-control" id="readiness-rate" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="11.7" value={ratePercent} onChange={(event) => setRatePercent(event.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="readiness-term">Plazo del escenario (años)</label>
                  <input className="field-control" id="readiness-term" type="number" min="5" max="30" step="1" inputMode="numeric" value={termYears} onChange={(event) => setTermYears(event.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="readiness-costs">Otros costos mensuales de vivienda (opcional)</label>
                  <span className="field-hint">Administración u otros costos recurrentes que quieras reservar.</span>
                  <input className="field-control" id="readiness-costs" type="number" min="0" inputMode="numeric" placeholder="300000" value={otherHousingCosts} onChange={(event) => setOtherHousingCosts(event.target.value)} />
                </div>
              </div>
            </div>
          ) : null}

          {error ? <p className={styles.error} role="alert">{error}</p> : null}

          <div className={styles.formActions}>
            {stage === "continuity" ? (
              <>
                <button className="button button-secondary" type="button" onClick={() => setStage("partial")}>Volver al perfil parcial</button>
                <button className="button button-primary" type="button" onClick={saveContinuity}>Continuar</button>
              </>
            ) : null}
            {stage === "documentation" ? (
              <>
                <button className="button button-secondary" type="button" onClick={() => setStage("continuity")}>Anterior</button>
                <button className="button button-primary" type="button" onClick={saveDocumentation}>Continuar</button>
              </>
            ) : null}
            {stage === "financing" ? (
              <>
                <button className="button button-secondary" type="button" onClick={() => setStage("documentation")}>Anterior</button>
                <button className="button button-primary" type="button" onClick={completeWithScenario}>Usar este escenario y completar el índice</button>
                <button className="button button-quiet" type="button" onClick={completeWithoutScenario}>Todavía no tengo un escenario</button>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {(stage === "partial" || stage === "result") && result ? (
        <div className={styles.results} aria-live="polite">
          <section className={`surface ${styles.resultHero}`} aria-labelledby="readiness-result-heading">
            <div className={styles.resultTopline}>
              <PrecisionBadge level="C1" />
              <span>{resultIsComplete ? "Índice completo" : "Perfil parcial"}</span>
            </div>
            {resultIsComplete ? (
              <>
                <p className={styles.indexBoundary}>Índice orientativo propio de Casa con Criterio</p>
                <h2 ref={resultHeadingRef} tabIndex={-1} id="readiness-result-heading">{bandLabel[result.band!]}</h2>
                <div className={styles.scoreBlock}>
                  <strong>{result.totalScore}</strong><span>/100</span>
                </div>
                <p className="section-copy">{bandExplanation[result.band!]}</p>
                <p className={styles.boundaryLine}>No es DataCrédito, una calificación bancaria, una preaprobación ni una probabilidad de aprobación.</p>
              </>
            ) : (
              <>
                <h2 ref={resultHeadingRef} tabIndex={-1} id="readiness-result-heading">Perfil incompleto</h2>
                <p className="section-copy">Ya podemos leer algunas dimensiones, pero faltan datos para construir un total honesto.</p>
                <p className={styles.boundaryLine}>No completamos los datos faltantes con supuestos para fabricar un puntaje.</p>
              </>
            )}
          </section>

          <section className={styles.section} aria-labelledby="dimensions-heading">
            <div className={styles.sectionHeading}>
              <div>
                <p className="eyebrow">Cinco dimensiones</p>
                <h2 id="dimensions-heading">Mira de dónde sale cada lectura.</h2>
                <p className="section-copy">Cada dimensión vale máximo 20 puntos. No hay multiplicadores ocultos.</p>
              </div>
            </div>
            <div className={styles.dimensionGrid}>
              {result.dimensions.map((item) => <DimensionCard dimension={item} key={item.code} />)}
            </div>
          </section>

          {result.nextActions.length > 0 ? (
            <section className={styles.section} aria-labelledby="actions-heading">
              <div className={styles.sectionHeading}>
                <div>
                  <p className="eyebrow">Siguiente mejor acción</p>
                  <h2 id="actions-heading">{resultIsComplete ? "Lo que más limita tu preparación hoy" : "Qué completar o mejorar primero"}</h2>
                </div>
              </div>
              <div className={styles.actionGrid}>
                {result.nextActions.map((action, index) => (
                  <article className={`surface ${styles.actionCard}`} key={`${action.dimensionCode}-${index}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <h3>{action.title}</h3>
                    <p>{action.explanation}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className={`surface ${styles.factsPanel}`} aria-labelledby="facts-heading">
            <div>
              <p className="eyebrow">Capacidad y objetivo</p>
              <h2 id="facts-heading">Los cálculos base se muestran aparte del índice.</h2>
              <p className="section-copy">Estos datos provienen del mismo cálculo de capacidad de compra; el índice no vuelve a contarlos como dimensiones adicionales.</p>
            </div>
            <dl>
              <div><dt>Carga actual declarada</dt><dd>{percent.format(result.affordabilityFacts.currentDebtRatio)}</dd></div>
              <div><dt>Espacio mensual de planificación</dt><dd>{money(result.affordabilityFacts.planningHousingPaymentRoom)}</dd></div>
              <div><dt>Precio objetivo</dt><dd>{money(financialInput.targetPropertyPrice)}</dd></div>
              <div><dt>Cuota inicial disponible</dt><dd>{money(financialInput.availableDownPayment)}</dd></div>
              {result.affordabilityFacts.minimumEquityReference !== null ? <div><dt>Referencia mínima de aporte propio</dt><dd>{money(result.affordabilityFacts.minimumEquityReference)}</dd></div> : null}
              {result.affordabilityFacts.modeledPropertyCeiling !== null ? <div><dt>Techo modelado</dt><dd>{money(result.affordabilityFacts.modeledPropertyCeiling)}</dd></div> : null}
              {result.affordabilityFacts.bindingConstraint ? <div><dt>Límite dominante</dt><dd>{result.affordabilityFacts.bindingConstraint === "payment" ? "Capacidad mensual" : result.affordabilityFacts.bindingConstraint === "down_payment" ? "Cuota inicial" : "Ambos"}</dd></div> : null}
            </dl>
          </section>

          {!resultIsComplete && result.missingInputs.length > 0 ? (
            <section className={`surface ${styles.missingPanel}`} aria-labelledby="missing-heading">
              <div>
                <p className="eyebrow">Para completar el total</p>
                <h2 id="missing-heading">Faltan datos; no los estimamos por ti.</h2>
              </div>
              <ul>
                {result.missingInputs.includes("housing_category_for_down_payment") || result.missingInputs.includes("housing_category_for_target_fit") ? <li>Confirmar si el objetivo se analizará como VIS o No VIS.</li> : null}
                {result.missingInputs.includes("income_continuity") ? <li>Describir la continuidad de los ingresos.</li> : null}
                {result.missingInputs.includes("documentation_readiness") ? <li>Indicar qué tan organizados están los soportes.</li> : null}
                {result.missingInputs.includes("planning_rate_and_term") ? <li>Aportar una tasa EA y plazo de planificación para medir el encaje del objetivo.</li> : null}
              </ul>
            </section>
          ) : null}

          <section className={styles.boundary} aria-label="Límites del Índice de Preparación Hipotecaria">
            <strong>Índice orientativo propio de Casa con Criterio.</strong>
            <p>No es DataCrédito, una calificación bancaria, una preaprobación, elegibilidad bancaria ni probabilidad de aprobación. No consulta centrales de riesgo ni usa una tasa de mercado automática.</p>
            <p>La metodología usa cinco dimensiones transparentes de 20 puntos. Los datos son declarados por ti y el total permanece C1, incluso cuando el escenario financiero base usa tasa y plazo aportados por ti.</p>
          </section>

          <div className={styles.endActions}>
            {stage === "partial" ? <button className="button button-primary" type="button" onClick={startCompletion}>Completar mi preparación</button> : null}
            <button className="button button-secondary" type="button" onClick={editBase}>{embedded ? "Editar datos base" : "Editar datos base"}</button>
            {stage === "result" ? (
              <>
                <button className="button button-secondary" type="button" onClick={editContinuity}>Cambiar continuidad</button>
                <button className="button button-secondary" type="button" onClick={editDocumentation}>Cambiar preparación documental</button>
                <button className="button button-secondary" type="button" onClick={editFinancing}>Probar otro escenario</button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
