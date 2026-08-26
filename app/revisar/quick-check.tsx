"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DecisionResult, SourceFreshness } from "@/components/vivienda/signature-components";
import { ModeledScenario } from "./modeled-scenario";

type Product = "hipotecario" | "leasing" | "unknown";
type Modality = "pesos" | "uvr" | "unknown";

type Answers = {
  product: Product;
  modality: Modality;
  balance: string;
  installment: string;
  years: string;
};

const initialAnswers: Answers = {
  product: "unknown",
  modality: "unknown",
  balance: "",
  installment: "",
  years: "",
};

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function money(raw: string) {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? cop.format(value) : "Sin confirmar";
}

const productLabel: Record<Product, string> = {
  hipotecario: "Crédito hipotecario",
  leasing: "Leasing habitacional",
  unknown: "No estoy seguro",
};

const modalityLabel: Record<Modality, string> = {
  pesos: "Pesos",
  uvr: "UVR",
  unknown: "No estoy seguro",
};

export function QuickCheck() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [showResult, setShowResult] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const steps = 5;
  const progress = Math.round(((step + 1) / steps) * 100);

  useEffect(() => {
    if (showResult && !showModel) resultRef.current?.focus();
  }, [showModel, showResult]);

  const canContinue = useMemo(() => {
    if (step === 2) return Number(answers.balance) > 0;
    if (step === 3) return Number(answers.installment) > 0;
    if (step === 4) return Number(answers.years) > 0;
    return true;
  }, [answers, step]);

  function next() {
    if (!canContinue) return;
    if (step === steps - 1) {
      setShowResult(true);
      return;
    }
    setStep((current) => current + 1);
  }

  function back() {
    if (showModel) {
      setShowModel(false);
      return;
    }
    if (showResult) {
      setShowResult(false);
      return;
    }
    setStep((current) => Math.max(0, current - 1));
  }

  if (showModel) {
    return (
      <ModeledScenario
        balance={Number(answers.balance)}
        declaredInstallment={Number(answers.installment)}
        modality={answers.modality}
        approximateYears={Number(answers.years)}
        onBack={back}
      />
    );
  }

  if (showResult) {
    const facts = [
      { label: "Producto", value: productLabel[answers.product] },
      { label: "Modalidad", value: modalityLabel[answers.modality] },
      { label: "Saldo aproximado", value: money(answers.balance) },
      { label: "Cuota aproximada", value: money(answers.installment) },
      { label: "Plazo restante", value: `${answers.years} años` },
    ];

    return (
      <div
        ref={resultRef}
        tabIndex={-1}
        aria-live="polite"
        aria-labelledby="decision-title"
      >
        <button className="button button-quiet" type="button" onClick={back}>← Editar respuestas</button>
        <div style={{ marginTop: 20 }}>
          <DecisionResult
            title="Ya podemos construir una primera fotografía de tu crédito."
            explanation="Con saldo, cuota y plazo podemos organizar el crédito y decidir qué información falta. Todavía no conocemos tu tasa ni sistema exacto de amortización, así que no mostramos un supuesto ahorro preciso. El siguiente nivel es simular con más datos o verificar tu extracto."
            precision="C1"
            facts={facts}
            evidence={
              <SourceFreshness source="Datos declarados en este quick check" cutoff="Esta sesión">
                <p>No hemos consultado centrales, bancos ni terceros. Este resultado no es una aprobación ni una oferta.</p>
              </SourceFreshness>
            }
          >
            <div className="result-callout">
              <strong>Siguiente decisión útil</strong>
              <p className="section-copy">Podemos añadir tasa y sistema de amortización para pasar a una simulación modelada, o revisar un extracto si quieres mayor precisión.</p>
            </div>
            <div className="actions">
              <button className="button button-primary" type="button" onClick={() => setShowModel(true)}>Continuar con más precisión</button>
              <a className="button button-secondary" href="/">Volver al inicio</a>
            </div>
          </DecisionResult>
        </div>
      </div>
    );
  }

  return (
    <section className="surface form-card" aria-labelledby="quick-check-title">
      <div className="progress-label">Paso {step + 1} de {steps}</div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Progreso del Quick Check"
        aria-valuemin={1}
        aria-valuemax={steps}
        aria-valuenow={step + 1}
        aria-valuetext={`Paso ${step + 1} de ${steps}`}
      >
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="eyebrow" style={{ marginTop: 28 }}>Quick Check</p>
      <h1 id="quick-check-title" style={{ fontSize: "clamp(32px, 6vw, 46px)" }}>Cuéntanos lo mínimo para entender tu crédito.</h1>
      <p className="section-copy">Puedes usar valores aproximados. No necesitamos cédula, teléfono, correo ni extracto en esta etapa.</p>

      {step === 0 ? (
        <fieldset className="field-group">
          <legend className="field-label">¿Qué producto tienes?</legend>
          <div className="choice-list">
            {(["hipotecario", "leasing", "unknown"] as Product[]).map((value) => (
              <label className="radio-card" key={value}>
                <input type="radio" name="product" value={value} checked={answers.product === value} onChange={() => setAnswers({ ...answers, product: value })} />
                <span>{productLabel[value]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === 1 ? (
        <fieldset className="field-group">
          <legend className="field-label">¿Tu crédito está en pesos o UVR?</legend>
          <p className="field-hint">Si no lo sabes, continúa. La precisión bajará hasta que podamos confirmarlo.</p>
          <div className="choice-list">
            {(["pesos", "uvr", "unknown"] as Modality[]).map((value) => (
              <label className="radio-card" key={value}>
                <input type="radio" name="modality" value={value} checked={answers.modality === value} onChange={() => setAnswers({ ...answers, modality: value })} />
                <span>{modalityLabel[value]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === 2 ? (
        <div className="field-group">
          <label className="field-label" htmlFor="balance">¿Cuánto capital debes aproximadamente?</label>
          <span className="field-hint" id="balance-hint">Usa el saldo de capital si lo conoces. No incluyas puntos ni comas.</span>
          <input className="field-control" id="balance" inputMode="numeric" min="1" type="number" aria-describedby="balance-hint" placeholder="180000000" value={answers.balance} onChange={(event) => setAnswers({ ...answers, balance: event.target.value })} />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="field-group">
          <label className="field-label" htmlFor="installment">¿Cuánto pagas aproximadamente cada mes?</label>
          <span className="field-hint" id="installment-hint">Si la cuota cambia, usa la más reciente como aproximación.</span>
          <input className="field-control" id="installment" inputMode="numeric" min="1" type="number" aria-describedby="installment-hint" placeholder="2100000" value={answers.installment} onChange={(event) => setAnswers({ ...answers, installment: event.target.value })} />
        </div>
      ) : null}

      {step === 4 ? (
        <div className="field-group">
          <label className="field-label" htmlFor="years">¿Cuántos años te faltan aproximadamente?</label>
          <span className="field-hint" id="years-hint">Puedes redondear. Después podremos usar el número exacto de cuotas.</span>
          <input className="field-control" id="years" inputMode="decimal" min="0.1" step="0.1" type="number" aria-describedby="years-hint" placeholder="17" value={answers.years} onChange={(event) => setAnswers({ ...answers, years: event.target.value })} />
        </div>
      ) : null}

      <div className="form-nav">
        {step > 0 ? <button className="button button-secondary" type="button" onClick={back}>Anterior</button> : <a className="button button-secondary" href="/">Salir</a>}
        <button className="button button-primary" type="button" disabled={!canContinue} aria-disabled={!canContinue} onClick={next}>{step === steps - 1 ? "Ver mi primera lectura" : "Continuar"}</button>
      </div>
    </section>
  );
}
