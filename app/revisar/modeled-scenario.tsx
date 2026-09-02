"use client";

import { useMemo, useState } from "react";
import {
  BenefitBreakdown,
  DecisionResult,
  ScenarioPath,
  SourceFreshness,
} from "@/components/vivienda/signature-components";
import { compareConstantPaymentPrepayment } from "@/domain/finance/prepayment";

type Modality = "pesos" | "uvr" | "unknown";
type System = "constant-payment" | "other" | "unknown";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function formatCop(value: number) {
  return cop.format(Math.round(value));
}

function formatMonths(months: number) {
  if (months < 12) return `${months} meses`;
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  if (remainder === 0) return `${years} ${years === 1 ? "año" : "años"}`;
  return `${years} ${years === 1 ? "año" : "años"} y ${remainder} meses`;
}

export function ModeledScenario({
  balance,
  declaredInstallment,
  modality,
  approximateYears,
  onBack,
}: {
  balance: number;
  declaredInstallment: number;
  modality: Modality;
  approximateYears: number;
  onBack: () => void;
}) {
  const approximateMonths = Number.isFinite(approximateYears) && approximateYears > 0
    ? Math.max(1, Math.round(approximateYears * 12))
    : null;

  const [annualRatePct, setAnnualRatePct] = useState("");
  const [remainingMonths, setRemainingMonths] = useState("");
  const [system, setSystem] = useState<System>("unknown");
  const [monthlyExtra, setMonthlyExtra] = useState("200000");

  const hasExplicitRate = annualRatePct.trim().length > 0;
  const hasExplicitMonths = remainingMonths.trim().length > 0;
  const rate = hasExplicitRate ? Number(annualRatePct) / 100 : Number.NaN;
  const months = hasExplicitMonths ? Number(remainingMonths) : Number.NaN;
  const extra = Number(monthlyExtra);

  const canModel =
    modality === "pesos" &&
    system === "constant-payment" &&
    hasExplicitRate &&
    hasExplicitMonths &&
    Number.isFinite(balance) && balance > 0 &&
    Number.isFinite(rate) && rate >= 0 && rate < 1 &&
    Number.isInteger(months) && months > 0 &&
    Number.isFinite(extra) && extra > 0;

  const comparison = useMemo(() => {
    if (!canModel) return null;
    try {
      return compareConstantPaymentPrepayment({
        principal: balance,
        annualEffectiveRate: rate,
        remainingMonths: months,
        recurringExtraPrincipal: extra,
      });
    } catch {
      return null;
    }
  }, [balance, canModel, extra, months, rate]);

  const paymentDifference = comparison && declaredInstallment > 0
    ? Math.abs(comparison.baseline.contractualPayment - declaredInstallment)
    : null;

  return (
    <div>
      <button className="button button-quiet" type="button" onClick={onBack}>← Volver a mi primera lectura</button>

      <section className="surface form-card" style={{ marginTop: 20 }} aria-labelledby="model-title">
        <p className="eyebrow">Subir a C2 · Simulación modelada</p>
        <h1 id="model-title" style={{ fontSize: "clamp(32px, 6vw, 46px)" }}>Añade solo los datos que cambian la matemática.</h1>
        <p className="section-copy">No pedimos identidad. Para modelar un crédito en pesos con cuota constante necesitamos tasa EA, cuotas restantes confirmadas y el aporte adicional que quieres probar.</p>

        {modality !== "pesos" ? (
          <div className="result-callout" role="status">
            <strong>No vamos a forzar una fórmula de pesos.</strong>
            <p className="section-copy">Tu modalidad está marcada como {modality === "uvr" ? "UVR" : "no confirmada"}. Una proyección en pesos requeriría datos adicionales y, para UVR, supuestos explícitos sobre su trayectoria futura.</p>
          </div>
        ) : null}

        <div className="field-group">
          <label className="field-label" htmlFor="annual-rate">Tasa efectiva anual del crédito</label>
          <span className="field-hint" id="annual-rate-hint">Ejemplo: escribe 12 para 12 % EA. No uses la tasa mensual. Si tu tasa real fuera 0 %, escribe 0 explícitamente.</span>
          <input className="field-control" id="annual-rate" type="number" min="0" max="99.99" step="0.01" inputMode="decimal" aria-describedby="annual-rate-hint" value={annualRatePct} onChange={(event) => setAnnualRatePct(event.target.value)} />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="remaining-months">Número de cuotas que te faltan</label>
          <span className="field-hint" id="remaining-months-hint">{approximateMonths ? `Antes indicaste aproximadamente ${approximateYears} años (~${approximateMonths} cuotas). Confirma aquí el número de cuotas para usarlo en el modelo.` : "Confirma el número de cuotas, no solo los años aproximados."}</span>
          <input className="field-control" id="remaining-months" type="number" min="1" step="1" inputMode="numeric" aria-describedby="remaining-months-hint" placeholder={approximateMonths ? String(approximateMonths) : undefined} value={remainingMonths} onChange={(event) => setRemainingMonths(event.target.value)} />
        </div>

        <fieldset className="field-group">
          <legend className="field-label">Sistema de amortización</legend>
          <p className="field-hint">El modelo C2 de este primer slice soporta cuota constante en pesos. Si no estás seguro, no inventamos el resultado.</p>
          <div className="choice-list">
            <label className="radio-card">
              <input type="radio" name="system" checked={system === "constant-payment"} onChange={() => setSystem("constant-payment")} />
              <span>Cuota constante en pesos</span>
            </label>
            <label className="radio-card">
              <input type="radio" name="system" checked={system === "other"} onChange={() => setSystem("other")} />
              <span>Otro sistema</span>
            </label>
            <label className="radio-card">
              <input type="radio" name="system" checked={system === "unknown"} onChange={() => setSystem("unknown")} />
              <span>No estoy seguro</span>
            </label>
          </div>
        </fieldset>

        <div className="field-group">
          <label className="field-label" htmlFor="monthly-extra">Abono adicional mensual que quieres probar</label>
          <span className="field-hint" id="monthly-extra-hint">Este dinero lo aportarías tú; nunca lo contaremos como “ahorro generado por VIVIENDA”.</span>
          <input className="field-control" id="monthly-extra" type="number" min="1" step="10000" inputMode="numeric" aria-describedby="monthly-extra-hint" value={monthlyExtra} onChange={(event) => setMonthlyExtra(event.target.value)} />
        </div>
      </section>

      {!comparison && modality === "pesos" ? (
        <div className="surface form-card" style={{ marginTop: 16 }} role="status">
          <strong>Completa tasa, cuotas y sistema compatible para activar el modelo.</strong>
          <p className="section-copy">Si tu sistema es distinto o no lo conoces, el siguiente paso correcto es usar tu extracto como guía para confirmar datos; no aproximar una anualidad como si fuera universal.</p>
        </div>
      ) : null}

      {comparison ? (
        <div aria-live="polite" style={{ marginTop: 20 }}>
          <DecisionResult
            title={`Con ${formatCop(extra)} adicionales al mes, el modelo termina ${formatMonths(comparison.termReductionMonths)} antes.`}
            explanation="Esta es una simulación nominal C2 basada en los datos que declaraste y confirmaste para el modelo. Mantiene la cuota financiera modelada y aplica el monto adicional a capital cada periodo. No incluye seguros, mora, cargos ni una eventual mecánica distinta de tu entidad."
            precision="C2"
            facts={[
              { label: "Cuota financiera modelada", value: formatCop(comparison.baseline.contractualPayment), detail: `${annualRatePct} % EA` },
              { label: "Plazo base", value: `${comparison.baseline.payoffMonth} cuotas` },
              { label: "Plazo del escenario", value: `${comparison.scenario.payoffMonth} cuotas` },
              { label: "Reducción modelada", value: `${comparison.termReductionMonths} cuotas` },
            ]}
            evidence={
              <SourceFreshness source="Datos declarados + motor de amortización VIVIENDA" cutoff="Esta sesión">
                <p>Valores nominales proyectados. C2 significa modelo suficiente, no verificación contractual ni aprobación bancaria.</p>
                {paymentDifference !== null ? <p>La cuota financiera calculada difiere de tu cuota declarada en aproximadamente {formatCop(paymentDifference)}; seguros u otros componentes pueden explicar parte de la diferencia.</p> : null}
              </SourceFreshness>
            }
          >
            <div className="demo-scenario">
              <p className="eyebrow">Trayectoria</p>
              <ScenarioPath
                start={`${comparison.baseline.payoffMonth} cuotas`}
                action={`+${formatCop(extra)}/mes`}
                outcome={`${comparison.scenario.payoffMonth} cuotas`}
              />
              <BenefitBreakdown rows={[
                { label: "Capital adicional que aportarías durante el escenario", value: formatCop(comparison.userExtraPrincipal) },
                { label: "Intereses futuros nominales que el modelo estima que dejarían de causarse", value: formatCop(comparison.interestAvoided), kind: "positive" },
                { label: "Valor atribuible a VIVIENDA en esta simulación self-service", value: formatCop(0) },
              ]} />
              <div className="actions">
                <a className="button button-primary" href="/verificar">Usar mi extracto como guía</a>
                <button className="button button-secondary" type="button" onClick={onBack}>Cambiar mis datos</button>
              </div>
              <p className="field-hint">En esta versión, el extracto se usa como referencia local y tú transcribes los campos. C3 sigue reservado para evidencia realmente derivada y reconciliada.</p>
            </div>
          </DecisionResult>
        </div>
      ) : null}
    </div>
  );
}