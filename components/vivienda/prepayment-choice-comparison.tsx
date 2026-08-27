"use client";

import { useState } from "react";
import {
  compareImmediatePartialPrepaymentChoices,
  type ImmediatePrepaymentChoiceComparison,
} from "@/domain/finance/prepayment";

export type PrepaymentChoiceModelInput = {
  principal: number;
  annualEffectiveRate: number;
  remainingMonths: number;
};

type PrepaymentChoiceComparisonProps = {
  modelInput: PrepaymentChoiceModelInput;
  onModeledChange: (modeled: boolean) => void;
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

export function PrepaymentChoiceComparison({
  modelInput,
  onModeledChange,
}: PrepaymentChoiceComparisonProps) {
  const [lumpSum, setLumpSum] = useState("");
  const [result, setResult] = useState<ImmediatePrepaymentChoiceComparison | null>(null);
  const [error, setError] = useState<string | null>(null);

  function invalidate() {
    setResult(null);
    setError(null);
    onModeledChange(false);
  }

  function modelChoices() {
    setResult(null);
    setError(null);
    onModeledChange(false);

    const amount = Number(lumpSum);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Define un abono único mayor que cero.");
      return;
    }

    if (amount >= modelInput.principal) {
      setError("Este comparador es para abonos parciales. El monto debe ser menor que el saldo de capital modelado.");
      return;
    }

    try {
      const comparison = compareImmediatePartialPrepaymentChoices({
        ...modelInput,
        lumpSumAmount: amount,
      });
      setResult(comparison);
      onModeledChange(true);
    } catch {
      setError("No pudimos construir esta comparación con los datos actuales. Revisa el monto e intenta de nuevo.");
    }
  }

  return (
    <section className="surface guided-model" style={{ marginTop: 24 }} aria-labelledby="prepayment-choice-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">Comparador de prepago · v0.22</p>
          <h3 id="prepayment-choice-title">Compara el mismo abono parcial: reducir plazo vs. reducir cuota.</h3>
          <p className="section-copy">
            Usamos exactamente el mismo abono único en las dos alternativas. Solo cambia la instrucción sobre qué conservar: la cuota financiera modelada o el plazo restante.
          </p>
        </div>
        {result ? <span className="material-chip">R1 + R2 · C2 modelado</span> : null}
      </div>

      <div className="privacy-panel" style={{ marginTop: 18 }}>
        <strong>Supuesto explícito de esta comparación</strong>
        <ul>
          <li>El abono se aplica directamente a capital antes de la siguiente cuota.</li>
          <li>Se conserva la misma tasa EA y el mismo sistema de cuota constante en pesos.</li>
          <li>Reducir plazo conserva la cuota financiera modelada y recalcula cuándo termina el crédito.</li>
          <li>Reducir cuota conserva el número de cuotas restantes y recalcula la cuota financiera.</li>
        </ul>
      </div>

      <div className="field-group" style={{ marginTop: 20 }}>
        <label className="field-label" htmlFor="prepayment-choice-lump-sum">Abono único que quieres comparar (COP)</label>
        <span className="field-hint" id="prepayment-choice-lump-sum-hint">
          Es capital que aportarías tú. No lo tratamos como ahorro generado por VIVIENDA y no lo mezclamos con el escenario de aportes mensuales.
        </span>
        <input
          className="field-control"
          id="prepayment-choice-lump-sum"
          type="number"
          inputMode="numeric"
          min="1"
          step="10000"
          max={Math.max(1, Math.floor(modelInput.principal - 1))}
          aria-describedby="prepayment-choice-lump-sum-hint"
          value={lumpSum}
          onChange={(event) => {
            setLumpSum(event.target.value);
            invalidate();
          }}
        />
      </div>

      {error ? <p className="field-error" role="alert">{error}</p> : null}

      <div className="actions">
        <button className="button button-primary" type="button" onClick={modelChoices}>
          Comparar reducir plazo vs. reducir cuota
        </button>
      </div>

      {result ? (
        <div style={{ marginTop: 24 }} aria-live="polite">
          <div className="result-callout" style={{ marginTop: 0 }}>
            <strong>Mismo punto de partida</strong>
            <p className="section-copy">
              Abono único: {cop.format(result.lumpSumAmount)} · saldo modelado después del abono: {cop.format(result.principalAfterPrepayment)} · cuota financiera base: {cop.format(result.baseline.contractualPayment)}.
            </p>
          </div>

          <div className="guided-grid" style={{ marginTop: 18 }}>
            <article className="surface" aria-labelledby="reduce-term-title">
              <p className="eyebrow">Opción A · R1 · C2</p>
              <h4 id="reduce-term-title">Reducir plazo</h4>
              <p className="section-copy">Conserva la cuota financiera modelada y usa el menor saldo para terminar antes.</p>
              <dl className="guided-context-grid">
                <div><dt>Cuota financiera modelada</dt><dd>{cop.format(result.reduceTerm.scheduledPayment)}</dd></div>
                <div><dt>Plazo resultante</dt><dd>{result.reduceTerm.payoffMonth} cuotas</dd></div>
                <div><dt>Reducción de plazo</dt><dd>{result.reduceTerm.termReductionMonths} cuotas</dd></div>
                <div><dt>Interés nominal futuro evitado</dt><dd>{cop.format(result.reduceTerm.interestAvoided)}</dd></div>
              </dl>
            </article>

            <article className="surface" aria-labelledby="reduce-payment-title">
              <p className="eyebrow">Opción B · R2 · C2</p>
              <h4 id="reduce-payment-title">Reducir cuota</h4>
              <p className="section-copy">Conserva el plazo restante y recalcula la cuota financiera sobre el menor saldo.</p>
              <dl className="guided-context-grid">
                <div><dt>Nueva cuota financiera modelada</dt><dd>{cop.format(result.reducePayment.scheduledPayment)}</dd></div>
                <div><dt>Reducción mensual modelada</dt><dd>{cop.format(result.reducePayment.paymentReduction)}</dd></div>
                <div><dt>Reducción porcentual</dt><dd>{percent.format(result.reducePayment.paymentReductionPercent)}</dd></div>
                <div><dt>Plazo modelado</dt><dd>{result.reducePayment.payoffMonth} cuotas</dd></div>
                <div><dt>Interés nominal futuro evitado</dt><dd>{cop.format(result.reducePayment.interestAvoided)}</dd></div>
              </dl>
            </article>
          </div>

          <div className="surface-warning" style={{ marginTop: 18 }}>
            <strong>La comparación no elige por ti.</strong>
            <p>
              Menor interés nominal futuro, menor cuota mensual y terminar antes son objetivos distintos. Estas cifras son una simulación C2 con datos declarados; no son ahorro garantizado, liquidación del banco ni verificación contractual. Seguros, cargos, fechas operativas y reglas específicas de aplicación deben confirmarse antes de impartir una instrucción real.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
