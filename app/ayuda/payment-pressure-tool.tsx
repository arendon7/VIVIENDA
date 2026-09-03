"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PrecisionBadge } from "@/components/vivienda/signature-components";
import {
  evaluatePaymentPressure,
  type NextPaymentOutlook,
  type PaymentPressureChange,
  type PaymentPressureResult,
  type PaymentPressureUrgency,
} from "@/domain/payment-pressure/triage";
import type { PaymentState, ProductType } from "@/domain/opportunity/router";
import { colombiaTodayIso } from "@/domain/time/colombia-date";
import styles from "./payment-pressure.module.css";

type InconsistencyChoice = "none" | "charge" | "contract";

type Choice<T extends string> = { value: T; label: string; detail?: string };

const productChoices: Array<Choice<Extract<ProductType, "mortgage_housing" | "housing_leasing" | "unknown">>> = [
  { value: "mortgage_housing", label: "Crédito hipotecario de vivienda" },
  { value: "housing_leasing", label: "Leasing habitacional" },
  { value: "unknown", label: "No estoy seguro" },
];

const paymentChoices: Array<Choice<PaymentState>> = [
  { value: "current", label: "Estoy al día" },
  { value: "early_arrears", label: "Me atrasé recientemente" },
  { value: "collections", label: "Ya me están contactando para cobrar" },
  { value: "prelegal", label: "Me informaron que está en cobro prejurídico / prelegal" },
  { value: "executive", label: "Recibí un documento de juzgado o sé que hay un proceso judicial" },
  { value: "embargo_or_auction", label: "Conozco un embargo, secuestro, remate u otra actuación avanzada" },
  { value: "unknown", label: "No sé en qué etapa estoy" },
];

const changeChoices: Array<Choice<PaymentPressureChange>> = [
  { value: "yes", label: "Sí" },
  { value: "no", label: "No" },
  { value: "unknown", label: "No estoy seguro" },
];

const outlookChoices: Array<Choice<NextPaymentOutlook>> = [
  { value: "can_pay", label: "Puedo pagarla" },
  { value: "at_risk", label: "Está en riesgo" },
  { value: "cannot_pay", label: "No puedo pagarla completa" },
  { value: "unknown", label: "No estoy seguro" },
];

const inconsistencyChoices: Array<Choice<InconsistencyChoice>> = [
  { value: "none", label: "No, solo quiero resolver la presión de pago" },
  { value: "charge", label: "Hay un cobro o aplicación de pago que no entiendo" },
  { value: "contract", label: "Un extracto o condición parece no coincidir con lo pactado" },
];

const urgencyLabel: Record<PaymentPressureUrgency, string> = {
  preventive: "Prevención",
  prompt_action: "Actuar pronto",
  professional_review: "Revisar una diferencia",
  procedural_urgency: "Revisión prioritaria",
  needs_information: "Falta ubicar la etapa",
};

const routeStatusLabel = {
  eligible_now: "Se puede preparar ahora",
  candidate: "Vale la pena evaluar",
  seasonal_wait: "Preparar para su ventana",
  legal_review: "Requiere revisión profesional",
  not_recommended: "No es la ruta prioritaria",
} as const;

const productLabel: Record<string, string> = {
  mortgage_housing: "Crédito hipotecario de vivienda",
  housing_leasing: "Leasing habitacional",
  unknown: "No confirmado",
};

const paymentLabel: Record<PaymentState, string> = Object.fromEntries(paymentChoices.map((choice) => [choice.value, choice.label])) as Record<PaymentState, string>;
const changeLabel: Record<PaymentPressureChange, string> = Object.fromEntries(changeChoices.map((choice) => [choice.value, choice.label])) as Record<PaymentPressureChange, string>;
const outlookLabel: Record<NextPaymentOutlook, string> = Object.fromEntries(outlookChoices.map((choice) => [choice.value, choice.label])) as Record<NextPaymentOutlook, string>;

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

export function PaymentPressureTool() {
  const [step, setStep] = useState(0);
  const [productType, setProductType] = useState<Extract<ProductType, "mortgage_housing" | "housing_leasing" | "unknown"> | null>(null);
  const [paymentState, setPaymentState] = useState<PaymentState | null>(null);
  const [economicChange, setEconomicChange] = useState<PaymentPressureChange | null>(null);
  const [outlook, setOutlook] = useState<NextPaymentOutlook | null>(null);
  const [inconsistency, setInconsistency] = useState<InconsistencyChoice | null>(null);
  const [result, setResult] = useState<PaymentPressureResult | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  const steps = 5;
  const progress = Math.round(((step + 1) / steps) * 100);

  const canContinue = useMemo(() => {
    if (step === 0) return productType !== null;
    if (step === 1) return paymentState !== null;
    if (step === 2) return economicChange !== null;
    if (step === 3) return outlook !== null;
    return inconsistency !== null;
  }, [economicChange, inconsistency, outlook, paymentState, productType, step]);

  useEffect(() => {
    if (result) resultHeadingRef.current?.focus();
  }, [result]);

  function next() {
    if (!canContinue) return;
    if (step < steps - 1) {
      setStep((current) => current + 1);
      return;
    }
    if (!productType || !paymentState || !economicChange || !outlook || !inconsistency) return;

    setResult(evaluatePaymentPressure({
      asOfDate: colombiaTodayIso(),
      productType,
      paymentState,
      materialEconomicChange: economicChange,
      nextPaymentOutlook: outlook,
      ...(inconsistency === "charge" ? { unexplainedChargeOrAllocationIssue: true } : {}),
      ...(inconsistency === "contract" ? { statementOrContractConflict: true } : {}),
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
    setProductType(null);
    setPaymentState(null);
    setEconomicChange(null);
    setOutlook(null);
    setInconsistency(null);
  }

  if (result && productType && paymentState && economicChange && outlook && inconsistency) {
    const hasR7 = result.opportunityRoutes.some((route) => route.routeCode === "R7_RECLAMACION");
    const isJudicial = result.urgency === "procedural_urgency";
    const isCollections = paymentState === "collections" || paymentState === "prelegal";

    return (
      <div className={`shell ${styles.page}`}>
        <section className={styles.introCompact}>
          <button className="button button-quiet" type="button" onClick={back}>← Editar respuestas</button>
          <p className="eyebrow">Resultado preliminar</p>
          <div className={styles.urgencyLine}>
            <PrecisionBadge level="C0" />
            <span className={`${styles.urgencyBadge} ${styles[result.urgency]}`}>{urgencyLabel[result.urgency]}</span>
          </div>
          <h1 ref={resultHeadingRef} tabIndex={-1}>{result.title}</h1>
          <p className="lede">{result.explanation}</p>
        </section>

        <section className={styles.resultGrid} aria-label="Resumen del triage">
          <article className={`surface ${styles.knownFacts}`}>
            <p className="eyebrow">Lo que sabemos</p>
            <h2>Estado declarado</h2>
            <dl>
              <div><dt>Producto</dt><dd>{productLabel[productType]}</dd></div>
              <div><dt>Etapa</dt><dd>{paymentLabel[paymentState]}</dd></div>
              <div><dt>Cambio de capacidad</dt><dd>{changeLabel[economicChange]}</dd></div>
              <div><dt>Próxima cuota</dt><dd>{outlookLabel[outlook]}</dd></div>
              <div><dt>Diferencia adicional</dt><dd>{inconsistency === "none" ? "No reportada" : inconsistency === "charge" ? "Cobro/aplicación por entender" : "Condición/documento por contrastar"}</dd></div>
            </dl>
          </article>

          <article className={`surface ${styles.primaryAction}`}>
            <p className="eyebrow">Siguiente mejor acción</p>
            <h2>{result.primaryAction.title}</h2>
            <p className="section-copy">{result.primaryAction.explanation}</p>
            {isJudicial ? (
              <a className="button button-primary" href="#evidencia">Ver qué documentos preparar</a>
            ) : hasR7 && !isJudicial ? (
              <a className="button button-primary" href="/auditoria-hipotecaria">Revisar la diferencia</a>
            ) : null}
          </article>
        </section>

        <section className={styles.section} id="evidencia" aria-labelledby="evidence-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">Evidencia</p>
              <h2 id="evidence-heading">Qué conviene tener a la mano</h2>
              <p className="section-copy">No necesitas subir estos documentos para obtener este resultado. La lista cambia según la etapa que reportaste.</p>
            </div>
          </div>
          <div className={styles.evidenceList}>
            {result.evidenceChecklist.map((item) => (
              <div className={`surface ${styles.evidenceItem}`} key={item.code}>
                <span className={styles.evidenceMarker} aria-hidden="true" />
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.importance === "required_for_next_step" ? "Necesario para el siguiente paso" : item.importance === "recommended" ? "Recomendado" : "Solo si exploras esa ruta"}</small>
                </div>
              </div>
            ))}
          </div>
        </section>

        {result.opportunityRoutes.length > 0 ? (
          <section className={styles.section} aria-labelledby="routes-heading">
            <div className={styles.sectionHeading}>
              <div>
                <p className="eyebrow">Rutas que aparecen por tus respuestas</p>
                <h2 id="routes-heading">No todas tienen la misma prioridad.</h2>
                <p className="section-copy">Mostramos únicamente rutas producidas por el motor de reglas existente. Un resultado candidato no equivale a aprobación ni a resultado jurídico.</p>
              </div>
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
                  {route.blockers.length > 0 ? (
                    <div className={styles.blockers}>
                      <strong>Antes de avanzar</strong>
                      <ul>{route.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
                    </div>
                  ) : null}
                  {route.caveat ? <p className={styles.caveat}>{route.caveat}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {isCollections ? (
          <section className={`surface ${styles.collectionInfo}`} aria-labelledby="collection-heading">
            <div>
              <p className="eyebrow">Cobranza</p>
              <h2 id="collection-heading">Cobranza no es lo mismo que proceso judicial.</h2>
              <p className="section-copy">La cobranza puede ser prejudicial, antes de una demanda. Las prácticas de contacto tienen reglas sobre canales autorizados, horarios y periodicidad; este triage no concluye una infracción solo con tu declaración.</p>
            </div>
            <div className={styles.collectionChecklist}>
              <strong>Si la forma de contacto te preocupa</strong>
              <span>Conserva canal, fecha, hora, remitente y contenido de la comunicación.</span>
            </div>
          </section>
        ) : null}

        <section className={styles.boundary} aria-label="Límites de este resultado">
          <strong>Este resultado orienta, no decide por un juez, banco o abogado.</strong>
          <p>No calcula términos procesales, no genera una defensa y no garantiza reestructuración. Si reportaste un proceso judicial, el siguiente paso requiere documentos reales y revisión profesional.</p>
          {productType === "housing_leasing" ? <p>Leasing habitacional requiere reglas propias; no aplicamos automáticamente procedimientos del crédito hipotecario.</p> : null}
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
        <p className="eyebrow">Dificultad para pagar</p>
        <h1>Entiende qué tan urgente es y qué puedes hacer ahora.</h1>
        <p className="lede">Ubicamos la etapa, separamos presión financiera de proceso judicial y te mostramos qué evidencia y siguiente acción tienen sentido.</p>
        <p className="trust-line">No necesitas nombre, cédula, correo, teléfono ni documentos para obtener el primer resultado.</p>
      </section>

      <section className={`surface ${styles.formCard}`} aria-labelledby="pressure-question">
        <div className="progress-label">Paso {step + 1} de {steps}</div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Progreso del diagnóstico"
          aria-valuemin={1}
          aria-valuemax={steps}
          aria-valuenow={step + 1}
          aria-valuetext={`Paso ${step + 1} de ${steps}`}
        >
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {step === 0 ? (
          <fieldset className={styles.question}>
            <legend id="pressure-question">¿Qué tipo de financiación tienes?</legend>
            <p>No necesitamos saber la entidad todavía.</p>
            <RadioChoices name="pressure-product" choices={productChoices} value={productType} onChange={setProductType} />
          </fieldset>
        ) : null}

        {step === 1 ? (
          <fieldset className={styles.question}>
            <legend id="pressure-question">¿Cuál describe mejor lo que está pasando hoy?</legend>
            <p>Selecciona proceso judicial solo si recibiste un documento de juzgado o sabes que existe un proceso; una llamada de cobranza no basta.</p>
            <RadioChoices name="pressure-state" choices={paymentChoices} value={paymentState} onChange={setPaymentState} />
          </fieldset>
        ) : null}

        {step === 2 ? (
          <fieldset className={styles.question}>
            <legend id="pressure-question">¿Cambió de forma importante tu capacidad de pago?</legend>
            <p>Por ejemplo: reducción de ingresos, cambio relevante del hogar o una nueva carga económica. No necesitamos documentos todavía.</p>
            <RadioChoices name="pressure-change" choices={changeChoices} value={economicChange} onChange={setEconomicChange} />
          </fieldset>
        ) : null}

        {step === 3 ? (
          <fieldset className={styles.question}>
            <legend id="pressure-question">Pensando en la próxima cuota, ¿cómo estás?</legend>
            <p>Esto nos ayuda a distinguir prevención de una situación que ya requiere acción cercana.</p>
            <RadioChoices name="pressure-outlook" choices={outlookChoices} value={outlook} onChange={setOutlook} />
          </fieldset>
        ) : null}

        {step === 4 ? (
          <fieldset className={styles.question}>
            <legend id="pressure-question">Además de la dificultad de pago, ¿hay algo que no te cuadra?</legend>
            <p>No inferimos una irregularidad por el solo hecho de que la cuota sea alta o exista mora.</p>
            <RadioChoices name="pressure-inconsistency" choices={inconsistencyChoices} value={inconsistency} onChange={setInconsistency} />
          </fieldset>
        ) : null}

        <div className="form-nav">
          {step > 0 ? <button className="button button-secondary" type="button" onClick={back}>Anterior</button> : <a className="button button-secondary" href="/">Salir</a>}
          <button className="button button-primary" type="button" disabled={!canContinue} aria-disabled={!canContinue} onClick={next}>{step === steps - 1 ? "Ver qué hacer ahora" : "Continuar"}</button>
        </div>
      </section>
    </div>
  );
}