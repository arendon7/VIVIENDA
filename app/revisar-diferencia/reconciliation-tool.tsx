"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PrecisionBadge, SourceFreshness } from "@/components/vivienda/signature-components";
import {
  reconcileInconsistency,
  type DifferenceSpecificity,
  type EvidenceAvailability,
  type InconsistencyKind,
  type InconsistencyReconciliationResult,
  type ReconciliationState,
} from "@/domain/inconsistency-reconciliation/reconciler";
import type { PaymentState, ProductType } from "@/domain/opportunity/router";
import styles from "./reconciliation.module.css";

type Choice<T extends string> = { value: T; label: string; detail?: string };

type ConsumerProduct = Extract<ProductType, "mortgage_housing" | "housing_leasing" | "unknown">;
type JudicialBoundaryState = Extract<PaymentState, "current" | "collections" | "prelegal" | "executive" | "embargo_or_auction" | "unknown">;

const kindChoices: Array<Choice<InconsistencyKind>> = [
  { value: "payment_allocation", label: "Hice un pago o abono y no entiendo cómo lo aplicaron" },
  { value: "contract_or_statement", label: "El extracto parece decir algo distinto a lo pactado" },
  { value: "rate_or_modality", label: "La tasa o modalidad no coincide con lo que esperaba" },
  { value: "insurance_or_fee", label: "Hay un seguro, tarifa o cobro que no identifico" },
  { value: "balance_or_term", label: "El saldo, plazo o cuotas restantes no me cuadran" },
  { value: "annual_projection", label: "La proyección anual no coincide con lo que realmente ocurrió" },
  { value: "missing_information", label: "Me falta información que la entidad no me ha aclarado" },
  { value: "collection_charge", label: "Hay un valor de cobranza que no entiendo" },
  { value: "other", label: "Es otra diferencia" },
];

const specificityChoices: Array<Choice<DifferenceSpecificity>> = [
  { value: "specific", label: "Sí, puedo señalar la diferencia concreta" },
  { value: "unclear", label: "No todavía; sé que algo no me cuadra" },
];

const evidenceChoices: Array<Choice<EvidenceAvailability>> = [
  { value: "none", label: "No tengo ningún soporte a la mano" },
  { value: "one_source", label: "Tengo una sola fuente", detail: "Por ejemplo: un extracto, contrato o comunicación." },
  { value: "two_sources", label: "Tengo dos fuentes para contrastar", detail: "Por ejemplo: contrato + extracto, o instrucción de pago + extracto." },
  { value: "unknown", label: "No sé qué documentos sirven" },
];

const productChoices: Array<Choice<ConsumerProduct>> = [
  { value: "mortgage_housing", label: "Crédito hipotecario de vivienda" },
  { value: "housing_leasing", label: "Leasing habitacional" },
  { value: "unknown", label: "No estoy seguro" },
];

const judicialChoices: Array<Choice<JudicialBoundaryState>> = [
  { value: "current", label: "No; no conozco un proceso judicial" },
  { value: "collections", label: "Solo tengo cobranza o comunicaciones de cobro" },
  { value: "prelegal", label: "Me hablaron de cobro prejurídico / prelegal" },
  { value: "executive", label: "Sí; recibí un documento de juzgado o sé que hay un proceso" },
  { value: "embargo_or_auction", label: "Sí; conozco embargo, secuestro, remate u otra actuación avanzada" },
  { value: "unknown", label: "No estoy seguro" },
];

const stateLabel: Record<ReconciliationState, string> = {
  education_first: "Entender antes de escalar",
  needs_information: "Falta información",
  difference_to_reconcile: "Comparar fuentes",
  possible_inconsistency: "Vale la pena auditar",
  procedural_priority: "Revisión prioritaria",
};

const routeStatusLabel = {
  eligible_now: "Se puede preparar ahora",
  candidate: "Vale la pena evaluar",
  seasonal_wait: "Preparar para su ventana",
  legal_review: "Requiere revisión profesional",
  not_recommended: "No es la ruta prioritaria",
} as const;

const kindLabel = Object.fromEntries(kindChoices.map((choice) => [choice.value, choice.label])) as Record<InconsistencyKind, string>;
const specificityLabel: Record<DifferenceSpecificity, string> = {
  specific: "Diferencia concreta",
  unclear: "Todavía no está aislada",
};
const evidenceLabel: Record<EvidenceAvailability, string> = {
  none: "Sin soporte a la mano",
  one_source: "Una fuente",
  two_sources: "Dos fuentes declaradas",
  unknown: "No sabe qué comparar",
};
const productLabel: Record<ConsumerProduct, string> = {
  mortgage_housing: "Crédito hipotecario de vivienda",
  housing_leasing: "Leasing habitacional",
  unknown: "No confirmado",
};
const judicialLabel = Object.fromEntries(judicialChoices.map((choice) => [choice.value, choice.label])) as Record<JudicialBoundaryState, string>;

function todayLocalIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function actionForDisplay(result: InconsistencyReconciliationResult, productType: ConsumerProduct) {
  if (productType === "unknown" && result.state !== "procedural_priority") {
    return {
      title: "Confirmar qué tipo de financiación tienes",
      explanation: "Busca en tu extracto o contrato si se trata de crédito hipotecario de vivienda, leasing habitacional u otro producto. Esa clasificación cambia las reglas que pueden aplicar.",
    };
  }
  return result.primaryAction;
}

export function ReconciliationTool() {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<InconsistencyKind | null>(null);
  const [specificity, setSpecificity] = useState<DifferenceSpecificity | null>(null);
  const [evidence, setEvidence] = useState<EvidenceAvailability | null>(null);
  const [productType, setProductType] = useState<ConsumerProduct | null>(null);
  const [paymentState, setPaymentState] = useState<JudicialBoundaryState | null>(null);
  const [result, setResult] = useState<InconsistencyReconciliationResult | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  const steps = 5;
  const progress = Math.round(((step + 1) / steps) * 100);

  const canContinue = useMemo(() => {
    if (step === 0) return kind !== null;
    if (step === 1) return specificity !== null;
    if (step === 2) return evidence !== null;
    if (step === 3) return productType !== null;
    return paymentState !== null;
  }, [evidence, kind, paymentState, productType, specificity, step]);

  useEffect(() => {
    if (result) resultHeadingRef.current?.focus();
  }, [result]);

  function next() {
    if (!canContinue) return;
    if (step < steps - 1) {
      setStep((current) => current + 1);
      return;
    }
    if (!kind || !specificity || !evidence || !productType || !paymentState) return;

    setResult(reconcileInconsistency({
      asOfDate: todayLocalIso(),
      kind,
      specificity,
      evidenceAvailability: evidence,
      productType,
      paymentState,
    }));
  }

  function back() {
    if (result) {
      setResult(null);
      return;
    }
    setStep((current) => Math.max(0, current - 1));
  }

  function restart() {
    setResult(null);
    setStep(0);
    setKind(null);
    setSpecificity(null);
    setEvidence(null);
    setProductType(null);
    setPaymentState(null);
  }

  if (result && kind && specificity && evidence && productType && paymentState) {
    const hasR7 = result.opportunityRoutes.some((route) => route.routeCode === "R7_RECLAMACION");
    const hasR10 = result.opportunityRoutes.some((route) => route.routeCode === "R10_EXECUTIVE_DEFENSE");
    const displayAction = actionForDisplay(result, productType);
    const sourceA = result.whatToCompare[0] ?? "Primera fuente relevante";
    const sourceB = result.whatToCompare[1] ?? "Segunda fuente relevante";

    return (
      <div className={`shell ${styles.page}`}>
        <section className={styles.introCompact}>
          <button className="button button-quiet" type="button" onClick={back}>← Editar respuestas</button>
          <p className="eyebrow">Resultado preliminar</p>
          <div className={styles.stateLine}>
            <PrecisionBadge level="C0" />
            <span className={`${styles.stateBadge} ${styles[result.state]}`}>{stateLabel[result.state]}</span>
          </div>
          <h1 ref={resultHeadingRef} tabIndex={-1}>{result.title}</h1>
          <p className="lede">{result.explanation}</p>
        </section>

        <section className={styles.summaryGrid} aria-label="Resumen de la diferencia">
          <article className={`surface ${styles.reported}`}>
            <p className="eyebrow">Qué reportaste</p>
            <h2>La diferencia, todavía en nivel C0</h2>
            <dl>
              <div><dt>Qué no cuadra</dt><dd>{kindLabel[kind]}</dd></div>
              <div><dt>Precisión del relato</dt><dd>{specificityLabel[specificity]}</dd></div>
              <div><dt>Fuentes disponibles</dt><dd>{evidenceLabel[evidence]}</dd></div>
              <div><dt>Producto</dt><dd>{productLabel[productType]}</dd></div>
              <div><dt>Estado judicial declarado</dt><dd>{judicialLabel[paymentState]}</dd></div>
            </dl>
          </article>

          <article className={`surface ${styles.actionCard}`}>
            <p className="eyebrow">Siguiente mejor acción</p>
            <h2>{displayAction.title}</h2>
            <p className="section-copy">{displayAction.explanation}</p>
            {hasR10 ? (
              <a className="button button-primary" href="/verificar">Revisar el documento judicial</a>
            ) : hasR7 ? (
              <a className="button button-primary" href="/auditoria-hipotecaria">Auditar la diferencia</a>
            ) : null}
          </article>
        </section>

        <section className={styles.section} aria-labelledby="possible-explanations-heading">
          <div className={styles.sectionHeading}>
            <p className="eyebrow">Antes de concluir</p>
            <h2 id="possible-explanations-heading">Qué podría explicar la diferencia</h2>
            <p className="section-copy">Estas son hipótesis de reconciliación, no conclusiones a favor de la entidad ni contra ella.</p>
          </div>
          <div className={styles.explanationGrid}>
            <article className={`surface ${styles.explanationCard}`}>
              <strong>Explicaciones que conviene descartar o confirmar</strong>
              <ul>{result.whatCouldExplainIt.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
            <article className={`surface ${styles.explanationCard}`}>
              <strong>Regla de lectura</strong>
              <p className="section-copy">Una diferencia entre dos cifras no basta por sí sola. Primero deben ser comparables en concepto, periodo, fecha de corte y fuente.</p>
            </article>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="compare-heading">
          <div className={styles.sectionHeading}>
            <p className="eyebrow">Reconciliación</p>
            <h2 id="compare-heading">Qué comparar exactamente</h2>
            <p className="section-copy">La utilidad de este diagnóstico está en convertir “algo está mal” en dos fuentes concretas que puedan contrastarse.</p>
          </div>
          <div className={styles.compareWrap}>
            <article className={`surface ${styles.compareCard}`}>
              <span>Fuente A · esperado / comunicado</span>
              <strong>{sourceA}</strong>
            </article>
            <span className={styles.compareVs} aria-hidden="true">VS</span>
            <article className={`surface ${styles.compareCard}`}>
              <span>Fuente B · aplicado / observado</span>
              <strong>{sourceB}</strong>
            </article>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="reconciliation-evidence-heading">
          <div className={styles.sectionHeading}>
            <p className="eyebrow">Evidencia</p>
            <h2 id="reconciliation-evidence-heading">Qué conviene tener a la mano</h2>
            <p className="section-copy">No tienes que subir documentos para este resultado. Si luego profundizas, estas son las fuentes que permiten comprobar la diferencia.</p>
          </div>
          <div className={styles.evidenceList}>
            {result.evidenceChecklist.map((item) => (
              <div className={`surface ${styles.evidenceItem}`} key={item.code}>
                <span className={styles.evidenceMarker} aria-hidden="true" />
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.importance === "required_for_next_step" ? "Necesario para el siguiente paso" : item.importance === "recommended" ? "Recomendado" : "Solo si aplica"}</small>
                </div>
              </div>
            ))}
          </div>
        </section>

        {result.opportunityRoutes.length > 0 ? (
          <section className={styles.section} aria-labelledby="reconciliation-routes-heading">
            <div className={styles.sectionHeading}>
              <p className="eyebrow">Ruta contextual</p>
              <h2 id="reconciliation-routes-heading">Lo que el motor permite evaluar</h2>
              <p className="section-copy">Solo aparecen R7 o R10 cuando tus respuestas cumplen sus condiciones. Una ruta candidata no equivale a una infracción probada ni a un resultado garantizado.</p>
            </div>
            <div className={styles.routeGrid}>
              {result.opportunityRoutes.map((route) => (
                <article className={`surface ${styles.routeCard}`} key={route.routeCode}>
                  <div className={styles.routeMeta}>
                    <strong>{routeStatusLabel[route.status]}</strong>
                    <span>{route.precision}</span>
                  </div>
                  <h3>{route.title}</h3>
                  <p>{route.nextAction}</p>
                  {route.caveat ? <p className={styles.caveat}>{route.caveat}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {result.notices.length > 0 ? (
          <section className={styles.section} aria-labelledby="reconciliation-notices-heading">
            <div className={styles.sectionHeading}>
              <p className="eyebrow">Límites del contexto</p>
              <h2 id="reconciliation-notices-heading">Qué todavía no podemos asumir</h2>
            </div>
            <div className={styles.notices}>
              {result.notices.map((notice) => <p className={styles.notice} key={notice}>{notice}</p>)}
            </div>
          </section>
        ) : null}

        <div className={styles.sourceBlock}>
          <SourceFreshness
            source="Información de crédito de vivienda + deber de información"
            sourceClass="public"
            cutoff="26 ago 2026"
            status="current"
          >
            <p>Los extractos permiten contrastar campos como tasa, saldo, plazo/cuotas y discriminación del pago. Una diferencia exige comparar fuentes equivalentes antes de concluir que existe un error.</p>
          </SourceFreshness>
        </div>

        <section className={styles.boundary} aria-label="Límites de este resultado">
          <strong>Este resultado no concluye que exista un error, ilegalidad, fraude o devolución a tu favor.</strong>
          <p>Es orientación C0 basada en tus respuestas. Incluso si declaraste dos fuentes, Casa con Criterio todavía no ha leído ni reconciliado esos documentos y no concede C2 ni C3 desde este flujo.</p>
          {hasR10 ? <p>Si reportaste un proceso judicial, este flujo tampoco calcula términos ni genera una estrategia de defensa.</p> : null}
        </section>

        <div className={styles.endActions}>
          <button className="button button-secondary" type="button" onClick={restart}>Empezar de nuevo</button>
          <a className="button button-secondary" href="/">Volver al inicio</a>
        </div>
      </div>
    );
  }

  return (
    <div className={`shell ${styles.page}`}>
      <section className={styles.intro}>
        <p className="eyebrow">Algo no me cuadra</p>
        <h1>Algo no te cuadra en tu crédito. Aislemos exactamente qué es.</h1>
        <p className="lede">Convierte una preocupación difusa en una comparación concreta: qué esperabas, qué aparece distinto, qué fuentes sirven y cuál es el siguiente paso razonable.</p>
        <p className="trust-line">No necesitas nombre, cédula, correo, teléfono ni documentos para obtener el primer resultado.</p>
      </section>

      <section className={`surface ${styles.formCard}`} aria-labelledby="reconciliation-question">
        <div className="progress-label">Paso {step + 1} de {steps}</div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Progreso de la revisión de diferencia"
          aria-valuemin={1}
          aria-valuemax={steps}
          aria-valuenow={step + 1}
          aria-valuetext={`Paso ${step + 1} de ${steps}`}
        >
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {step === 0 ? (
          <fieldset className={styles.question}>
            <legend id="reconciliation-question">¿Qué es lo que no te cuadra?</legend>
            <p>Elige el punto más cercano. No necesitas afirmar que la entidad se equivocó.</p>
            <RadioChoices name="reconciliation-kind" choices={kindChoices} value={kind} onChange={setKind} />
          </fieldset>
        ) : null}

        {step === 1 ? (
          <fieldset className={styles.question}>
            <legend id="reconciliation-question">¿Puedes señalar exactamente qué esperabas y qué aparece distinto?</legend>
            <p>La diferencia debe poder describirse como hechos o documentos comparables, no como una conclusión jurídica.</p>
            <RadioChoices name="reconciliation-specificity" choices={specificityChoices} value={specificity} onChange={setSpecificity} />
          </fieldset>
        ) : null}

        {step === 2 ? (
          <fieldset className={styles.question}>
            <legend id="reconciliation-question">¿Qué puedes comparar hoy?</legend>
            <p>Dos fuentes declaradas mejoran la orientación, pero no convierten este resultado en una auditoría documental.</p>
            <RadioChoices name="reconciliation-evidence" choices={evidenceChoices} value={evidence} onChange={setEvidence} />
          </fieldset>
        ) : null}

        {step === 3 ? (
          <fieldset className={styles.question}>
            <legend id="reconciliation-question">¿Qué tipo de financiación es?</legend>
            <p>Necesitamos esta clasificación para no aplicar reglas hipotecarias a productos distintos.</p>
            <RadioChoices name="reconciliation-product" choices={productChoices} value={productType} onChange={setProductType} />
          </fieldset>
        ) : null}

        {step === 4 ? (
          <fieldset className={styles.question}>
            <legend id="reconciliation-question">¿Hay hoy algún proceso o actuación judicial que conozcas?</legend>
            <p>Una comunicación de cobranza o cobro prejurídico no equivale por sí sola a un proceso judicial.</p>
            <RadioChoices name="reconciliation-judicial" choices={judicialChoices} value={paymentState} onChange={setPaymentState} />
          </fieldset>
        ) : null}

        <div className="form-nav">
          {step > 0 ? <button className="button button-secondary" type="button" onClick={back}>Anterior</button> : <a className="button button-secondary" href="/">Salir</a>}
          <button className="button button-primary" type="button" disabled={!canContinue} aria-disabled={!canContinue} onClick={next}>{step === steps - 1 ? "Revisar la diferencia" : "Continuar"}</button>
        </div>
      </section>
    </div>
  );
}
