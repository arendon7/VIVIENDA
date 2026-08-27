"use client";

import { useEffect, useRef, useState } from "react";
import { PrecisionBadge } from "@/components/vivienda/signature-components";
import {
  evaluateFinancingStructures,
  type ExplorePriority,
  type FinancingConstraintContext,
  type FinancingDenominationOption,
  type FinancingStructureOption,
  type FinancingStructuresResult,
  type OwnershipTimingPreference,
  type PaymentBehaviorPreference,
} from "@/domain/financing-structures/evaluator";
import styles from "./financing-structures.module.css";

type Props = {
  initialConstraintContext?: FinancingConstraintContext;
  embedded?: boolean;
  onBack?: () => void;
};

type Choice<T extends string> = { value: T; label: string; detail: string };

const ownershipChoices: Array<Choice<OwnershipTimingPreference>> = [
  {
    value: "title_from_purchase",
    label: "Quiero adquirir la propiedad desde la compra",
    detail: "Prefiero una estructura en la que el inmueble quede a mi nombre desde la adquisición.",
  },
  {
    value: "open_to_option_later_if_terms_fit",
    label: "Estoy abierto a una opción de adquisición posterior",
    detail: "Aceptaría comparar una estructura donde la entidad conserve la propiedad durante el contrato si las condiciones me sirven.",
  },
  {
    value: "no_strong_preference",
    label: "No tengo una preferencia fuerte",
    detail: "Quiero mantener crédito hipotecario y leasing abiertos para comparar.",
  },
  {
    value: "unknown",
    label: "Todavía no lo sé",
    detail: "Prefiero entender primero la diferencia antes de priorizar una estructura.",
  },
];

const paymentChoices: Array<Choice<PaymentBehaviorPreference>> = [
  {
    value: "nominal_peso_predictability",
    label: "Priorizo previsibilidad nominal en pesos",
    detail: "Quiero explorar primero estructuras cuya obligación pueda entenderse directamente en pesos bajo sus condiciones contractuales.",
  },
  {
    value: "open_to_inflation_linked_variation",
    label: "Estoy dispuesto a comparar UVR",
    detail: "Acepto evaluar una obligación ligada a UVR/IPC si una cotización concreta hace sentido para mi flujo de caja.",
  },
  {
    value: "compare_both",
    label: "Quiero comparar pesos y UVR",
    detail: "Prefiero mantener ambas denominaciones abiertas hasta ver condiciones comparables.",
  },
  {
    value: "unknown",
    label: "Todavía no lo sé",
    detail: "Quiero entender primero cómo cambia el comportamiento de la obligación.",
  },
];

const priorityLabel: Record<ExplorePriority, string> = {
  explore_first: "Explorar primero",
  compare: "Mantener para comparar",
  secondary: "Comparar después",
  needs_information: "Falta definir preferencia",
};

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
            <small>{choice.detail}</small>
          </span>
        </label>
      ))}
    </div>
  );
}

function OptionCard({
  option,
  kind,
}: {
  option: FinancingStructureOption | FinancingDenominationOption;
  kind: "structure" | "denomination";
}) {
  return (
    <article className={`surface ${styles.optionCard} ${option.priority === "explore_first" ? styles.optionCardPrimary : ""}`}>
      <div className={styles.optionHeader}>
        <div>
          <p className={styles.optionKind}>{kind === "structure" ? "Estructura contractual" : "Denominación"}</p>
          <h3>{option.title}</h3>
        </div>
        <span className={`${styles.priority} ${styles[`priority_${option.priority}`]}`}>{priorityLabel[option.priority]}</span>
      </div>

      <div className={styles.explanationBlock}>
        <span>Por qué queda en esta posición</span>
        <p>{option.explanation}</p>
      </div>

      <div className={styles.referenceBlock}>
        <span>Cómo funciona esta alternativa</span>
        <p>{option.referenceFact}</p>
      </div>

      <div className={styles.verifyBlock}>
        <strong>Qué debes verificar en una cotización real</strong>
        <ul>{option.factsToVerify.map((fact) => <li key={fact}>{fact}</li>)}</ul>
      </div>
    </article>
  );
}

function ResultView({
  result,
  onEdit,
  embedded,
  onBack,
}: {
  result: FinancingStructuresResult;
  onEdit: () => void;
  embedded: boolean;
  onBack: (() => void) | undefined;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className={styles.results}>
      <section className={`surface ${styles.resultHero}`}>
        <div className={styles.resultTopline}>
          <PrecisionBadge level={result.precision} />
          <span>Orientación por preferencias declaradas</span>
        </div>
        <p className="eyebrow">Estructuras para explorar</p>
        <h2 ref={headingRef} tabIndex={-1}>Tu siguiente comparación ya puede ser más precisa</h2>
        <p className="section-copy">
          Separamos la forma contractual de la financiación y el comportamiento de la obligación para que sepas qué preguntar y qué alternativas vale la pena mantener abiertas.
        </p>
        <p className={styles.boundaryLine}>
          Esto orienta tu búsqueda. No es elegibilidad, preaprobación, aprobación, probabilidad de aprobación, ranking de entidades ni cotización de mercado.
        </p>
      </section>

      {result.contextNotices.length > 0 ? (
        <section className={styles.contextSection} aria-labelledby="financing-context-heading">
          <p className="eyebrow">Contexto de tu plan</p>
          <h2 id="financing-context-heading">Una restricción del cálculo cambia qué debes preguntar</h2>
          <div className={styles.noticeGrid}>
            {result.contextNotices.map((notice) => (
              <article className={styles.contextNotice} key={notice.code}>
                <strong>{notice.code === "down_payment_constraint" ? "Cuota inicial" : "Capacidad mensual"}</strong>
                <p>{notice.text}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby="contract-structure-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className="eyebrow">Eje 1</p>
            <h2 id="contract-structure-heading">Primero: compara la estructura contractual</h2>
          </div>
          <p>No son dos niveles de aprobación. Son formas distintas de estructurar la relación sobre el inmueble.</p>
        </div>
        <div className={styles.optionGrid}>
          {result.structureOptions.map((option) => <OptionCard option={option} kind="structure" key={option.code} />)}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="denomination-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className="eyebrow">Eje 2</p>
            <h2 id="denomination-heading">Segundo: compara cómo puede comportarse la obligación</h2>
          </div>
          <p>Pesos y UVR necesitan condiciones reales comparables antes de concluir cuál resulta más conveniente para ti.</p>
        </div>
        <div className={styles.optionGrid}>
          {result.denominationOptions.map((option) => <OptionCard option={option} kind="denomination" key={option.code} />)}
        </div>
      </section>

      <section className={`surface ${styles.quotePanel}`} aria-labelledby="quote-checklist-heading">
        <div>
          <p className="eyebrow">Siguiente nivel de precisión</p>
          <h2 id="quote-checklist-heading">Cuando tengas una cotización, compárala con datos completos</h2>
          <p className="section-copy">
            Una comparación económica real necesita condiciones comerciales de la misma fecha y con suficiente detalle. Guárdalas completas; no basta con mirar una tasa o una cuota aislada.
          </p>
        </div>
        <details className={styles.checklist}>
          <summary>Ver los {result.quoteChecklist.length} datos que conviene conservar</summary>
          <ol>{result.quoteChecklist.map((item) => <li key={item}>{item}</li>)}</ol>
        </details>
        <p className={styles.futureBoundary}>
          La comparación de cotizaciones reales será una capa separada para no mezclar preferencias con precios, costos o decisiones de una entidad.
        </p>
      </section>

      <section className={styles.truthBoundary} aria-label="Límites de este resultado">
        <strong>Qué sí hizo este explorador</strong>
        <p>Ordenó alternativas según dos preferencias que declaraste y te mostró qué información falta verificar.</p>
        <strong>Qué no hizo</strong>
        <p>No consultó bancos, centrales de riesgo, tasas de mercado, ofertas ni políticas de aprobación.</p>
      </section>

      <div className={styles.actions}>
        <button className="button button-secondary" type="button" onClick={onEdit}>Cambiar mis preferencias</button>
        {embedded && onBack ? (
          <button className="button button-secondary" type="button" onClick={onBack}>Volver a mi preparación</button>
        ) : (
          <a className="button button-secondary" href="/comprar/preparacion">Volver a preparación</a>
        )}
      </div>
    </div>
  );
}

export function FinancingStructuresTool({ initialConstraintContext, embedded = false, onBack }: Props) {
  const [ownershipPreference, setOwnershipPreference] = useState<OwnershipTimingPreference | null>(null);
  const [paymentPreference, setPaymentPreference] = useState<PaymentBehaviorPreference | null>(null);
  const [result, setResult] = useState<FinancingStructuresResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!ownershipPreference || !paymentPreference) {
      setError("Responde las dos preguntas para ordenar las estructuras sin adivinar tus preferencias.");
      return;
    }

    setResult(evaluateFinancingStructures({
      ownershipTimingPreference: ownershipPreference,
      paymentBehaviorPreference: paymentPreference,
      ...(initialConstraintContext ? { constraintContext: initialConstraintContext } : {}),
    }));
    setError(null);
  }

  function edit() {
    setResult(null);
    setError(null);
  }

  if (result) {
    return <ResultView result={result} onEdit={edit} embedded={embedded} onBack={onBack} />;
  }

  return (
    <div className={`${styles.tool} ${embedded ? styles.embedded : ""}`}>
      {!embedded ? (
        <section className={styles.intro}>
          <p className="eyebrow">Financiación para comprar</p>
          <h1>Entiende qué estructuras vale la pena comparar</h1>
          <p className="lede">Dos decisiones simples te ayudan a ordenar crédito hipotecario, leasing, pesos y UVR antes de mirar entidades o cotizaciones.</p>
          <p className="trust-line">No necesitas nombre, cédula, correo, teléfono ni consulta a centrales para usar este explorador.</p>
        </section>
      ) : null}

      <section className={`surface ${styles.formCard}`} aria-labelledby="financing-structure-form-heading">
        <div className={styles.formHeader}>
          <PrecisionBadge level="C1" />
          <div>
            <p className="eyebrow">Preferencias de estructura</p>
            <h2 id="financing-structure-form-heading">Primero ordenemos la búsqueda, no los bancos</h2>
            <p>Estas respuestas no evalúan tu capacidad de aprobación. Solo definen qué estructuras conviene explorar o mantener abiertas.</p>
          </div>
        </div>

        <fieldset className={styles.question}>
          <legend>¿Qué es más importante para ti respecto a la propiedad?</legend>
          <p>La diferencia principal aquí es cuándo y bajo qué estructura se adquiere la propiedad del inmueble.</p>
          <RadioChoices
            name="ownership-preference"
            choices={ownershipChoices}
            value={ownershipPreference}
            onChange={(next) => {
              setOwnershipPreference(next);
              setError(null);
            }}
          />
        </fieldset>

        <fieldset className={styles.question}>
          <legend>¿Cómo prefieres evaluar el comportamiento de la obligación?</legend>
          <p>No estamos comparando todavía tasas ni costos. Solo tu tolerancia a distintas formas de expresar y comportar la obligación.</p>
          <RadioChoices
            name="payment-preference"
            choices={paymentChoices}
            value={paymentPreference}
            onChange={(next) => {
              setPaymentPreference(next);
              setError(null);
            }}
          />
        </fieldset>

        {initialConstraintContext && initialConstraintContext !== "unknown" ? (
          <p className={styles.contextHint}>Usaremos también la restricción principal detectada en tu cálculo anterior para decirte qué dato conviene exigir en cada cotización. No reutilizamos montos ni los enviamos por URL.</p>
        ) : null}

        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        <div className={styles.formActions}>
          <button className="button button-primary" type="button" onClick={submit}>Ver qué estructuras explorar</button>
          {embedded && onBack ? <button className="button button-secondary" type="button" onClick={onBack}>Volver a mi preparación</button> : null}
        </div>
      </section>

      <section className={styles.preResultBoundary}>
        <strong>Antes de continuar</strong>
        <p>Que una alternativa aparezca primero significa que está más alineada con la preferencia que declaraste. No significa que sea más barata, que una entidad te la ofrezca o que vaya a aprobarla.</p>
      </section>
    </div>
  );
}
