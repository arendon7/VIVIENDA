"use client";

import { useMemo, useState } from "react";
import { CasePlanWorkspace } from "@/components/vivienda/case-plan-workspace";
import {
  evaluateOpportunityRoutes,
  type OpportunityPrecision,
  type OpportunityRouteCode,
  type PaymentState,
  type ProductType,
} from "@/domain/opportunity/router";

type Goal = "finish_sooner" | "lower_payment" | "explore";

const productLabels: Record<ProductType, string> = {
  mortgage_housing: "Crédito hipotecario de vivienda",
  housing_leasing: "Leasing habitacional",
  other_secured_credit: "Otro crédito con hipoteca como garantía",
  unknown: "No estoy seguro",
};

const paymentStateLabels: Record<PaymentState, string> = {
  current: "Al día",
  early_arrears: "Mora temprana",
  collections: "Cobranza",
  prelegal: "Prejurídico",
  executive: "Proceso ejecutivo",
  embargo_or_auction: "Embargo, secuestro o remate",
  unknown: "No estoy seguro",
};

const statusLabels = {
  eligible_now: "Se puede activar ahora",
  candidate: "Vale la pena evaluar",
  seasonal_wait: "Ventana especial cerrada",
  not_recommended: "No recomendado",
  legal_review: "Revisión jurídica necesaria",
} as const;

const reasonLabels: Record<string, string> = {
  covered_housing_mortgage: "El producto fue clasificado como crédito hipotecario de vivienda.",
  positive_extra_principal: "Declaraste capacidad para hacer un abono adicional a capital.",
  goal_finish_sooner: "Tu objetivo declarado es terminar antes.",
  goal_lower_payment: "Tu objetivo declarado es bajar la cuota.",
  article20_window_open: "La fecha de evaluación está dentro de enero-febrero.",
  article20_window_closed: "La ventana especial enero-febrero no está abierta en esta fecha.",
  material_economic_change_reported: "Reportaste un cambio material en tu capacidad real de pago.",
  post_restructure_first_installment_ratio_available: "Tenemos ingreso familiar y primera cuota propuesta para validar la estructura.",
  proposed_first_installment_above_40_percent: "La primera cuota propuesta supera el 40% del ingreso familiar acreditado.",
  binding_transfer_offer_available: "Declaraste que ya existe una oferta vinculante de un nuevo acreedor.",
  binding_transfer_offer_missing: "Todavía no existe una oferta vinculante declarada.",
  unexplained_charge_or_allocation_issue: "Reportaste un cobro o aplicación de abono que requiere auditoría.",
  material_document_or_contract_conflict: "Existe un conflicto material entre documento, contrato o datos del caso.",
  executive_proceeding_reported: "Reportaste un proceso ejecutivo en curso.",
  embargo_or_auction_reported: "Reportaste embargo, secuestro o remate.",
  housing_regime_not_established: "Todavía no está confirmado que el producto pertenezca al régimen especial de vivienda.",
};

function bogotaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function optionalPositive(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export function OpportunityWorkspace({ precision }: { precision: OpportunityPrecision }) {
  const [productType, setProductType] = useState<ProductType>("unknown");
  const [goal, setGoal] = useState<Goal>("explore");
  const [extraPayment, setExtraPayment] = useState("");
  const [materialEconomicChange, setMaterialEconomicChange] = useState(false);
  const [familyIncome, setFamilyIncome] = useState("");
  const [proposedInstallment, setProposedInstallment] = useState("");
  const [bindingOffer, setBindingOffer] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentState>("current");
  const [auditIssue, setAuditIssue] = useState(false);
  const [selectedRouteCode, setSelectedRouteCode] = useState<OpportunityRouteCode | null>(null);
  const asOfDate = bogotaToday();

  const result = useMemo(() => {
    const extraPaymentCapacity = optionalPositive(extraPayment);
    const currentAccreditedFamilyIncome = optionalPositive(familyIncome);
    const proposedRestructuredFirstInstallment = optionalPositive(proposedInstallment);

    return evaluateOpportunityRoutes({
      asOfDate,
      precision,
      productType,
      modality: "unknown",
      paymentState,
      wantsFinishSooner: goal === "finish_sooner",
      wantsLowerPayment: goal === "lower_payment",
      materialEconomicChange,
      hasBindingTransferOffer: bindingOffer,
      unexplainedChargeOrAllocationIssue: auditIssue,
      ...(extraPaymentCapacity !== undefined ? { extraPaymentCapacity } : {}),
      ...(currentAccreditedFamilyIncome !== undefined ? { currentAccreditedFamilyIncome } : {}),
      ...(proposedRestructuredFirstInstallment !== undefined ? { proposedRestructuredFirstInstallment } : {}),
    });
  }, [
    asOfDate,
    auditIssue,
    bindingOffer,
    extraPayment,
    familyIncome,
    goal,
    materialEconomicChange,
    paymentState,
    precision,
    productType,
    proposedInstallment,
  ]);

  const selectedRoute = selectedRouteCode
    ? result.routes.find((route) => route.routeCode === selectedRouteCode) ?? null
    : null;

  return (
    <section className="surface form-card" style={{ marginTop: 20 }} aria-labelledby="opportunity-workspace-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">Opportunity Router · v0.3</p>
          <h2 id="opportunity-workspace-title">Convierte el Mortgage Twin en próximas decisiones posibles.</h2>
          <p className="section-copy">
            Esta capa ordena rutas, no aprueba solicitudes. La prioridad depende de tus hechos y objetivos; no de qué servicio genere más honorarios.
          </p>
        </div>
        <span className="status-chip">{precision} · evidencia actual</span>
      </div>

      <div className="privacy-panel" style={{ marginTop: 20 }}>
        <strong>Cómo leer este resultado</strong>
        <ul>
          <li><strong>Se puede activar ahora</strong> significa que el siguiente paso procedimental está disponible con los datos declarados; no significa aprobación bancaria.</li>
          <li><strong>Vale la pena evaluar</strong> significa que falta evidencia o una condición externa.</li>
          <li><strong>Revisión jurídica necesaria</strong> bloquea conclusiones automáticas y prioriza revisión humana.</li>
        </ul>
      </div>

      <div className="field-group" style={{ marginTop: 24 }}>
        <span className="field-label">1. ¿Qué tipo de producto es?</span>
        <div className="choice-list">
          {(Object.keys(productLabels) as ProductType[]).map((value) => (
            <label className="radio-card" key={value}>
              <input
                type="radio"
                name="router-product"
                checked={productType === value}
                onChange={() => setProductType(value)}
              />
              <span>{productLabels[value]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field-group">
        <span className="field-label">2. ¿Cuál es tu objetivo principal?</span>
        <div className="choice-list">
          <label className="radio-card">
            <input type="radio" name="router-goal" checked={goal === "finish_sooner"} onChange={() => setGoal("finish_sooner")} />
            <span>Terminar antes</span>
          </label>
          <label className="radio-card">
            <input type="radio" name="router-goal" checked={goal === "lower_payment"} onChange={() => setGoal("lower_payment")} />
            <span>Bajar la cuota</span>
          </label>
          <label className="radio-card">
            <input type="radio" name="router-goal" checked={goal === "explore"} onChange={() => setGoal("explore")} />
            <span>Quiero comparar opciones</span>
          </label>
        </div>
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="router-extra-payment">3. ¿Cuánto capital adicional podrías aportar?</label>
        <span className="field-hint" id="router-extra-payment-hint">Déjalo vacío si no planeas hacer abonos adicionales. El capital que aportes nunca se presenta como ahorro creado por VIVIENDA.</span>
        <input
          className="field-control"
          id="router-extra-payment"
          inputMode="numeric"
          min="1"
          type="number"
          aria-describedby="router-extra-payment-hint"
          placeholder="300000"
          value={extraPayment}
          onChange={(event) => setExtraPayment(event.target.value)}
        />
      </div>

      <fieldset className="field-group">
        <legend className="field-label">4. ¿Tu capacidad real de pago cambió materialmente?</legend>
        <label className="confirm-control">
          <input type="checkbox" checked={materialEconomicChange} onChange={(event) => setMaterialEconomicChange(event.target.checked)} />
          <span>Sí, quiero que el router evalúe la ruta de reestructuración.</span>
        </label>
      </fieldset>

      {materialEconomicChange ? (
        <div className="surface-warning" style={{ marginTop: 14 }}>
          <strong>El 40% no se usa como detector automático de ilegalidad.</strong>
          <p>Estos dos datos sirven para revisar la primera cuota propuesta después de una eventual reestructuración, conforme al rulebook actual.</p>
          <div className="field-group" style={{ marginTop: 16 }}>
            <label className="field-label" htmlFor="router-family-income">Ingreso familiar actualmente acreditable</label>
            <input className="field-control" id="router-family-income" inputMode="numeric" min="1" type="number" placeholder="5000000" value={familyIncome} onChange={(event) => setFamilyIncome(event.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="router-proposed-installment">Primera cuota que propondrías después de reestructurar</label>
            <input className="field-control" id="router-proposed-installment" inputMode="numeric" min="1" type="number" placeholder="1900000" value={proposedInstallment} onChange={(event) => setProposedInstallment(event.target.value)} />
          </div>
        </div>
      ) : null}

      <fieldset className="field-group">
        <legend className="field-label">5. ¿Ya tienes una oferta vinculante de otro acreedor?</legend>
        <label className="confirm-control">
          <input type="checkbox" checked={bindingOffer} onChange={(event) => setBindingOffer(event.target.checked)} />
          <span>Sí, ya existe una oferta vinculante real.</span>
        </label>
      </fieldset>

      <div className="field-group">
        <label className="field-label" htmlFor="router-payment-state">6. ¿Cuál es el estado de pago/cobranza?</label>
        <select className="field-control" id="router-payment-state" value={paymentState} onChange={(event) => setPaymentState(event.target.value as PaymentState)}>
          {(Object.keys(paymentStateLabels) as PaymentState[]).map((value) => (
            <option value={value} key={value}>{paymentStateLabels[value]}</option>
          ))}
        </select>
      </div>

      <fieldset className="field-group">
        <legend className="field-label">7. ¿Detectaste un cobro, diferencia o aplicación de abono que no entiendes?</legend>
        <label className="confirm-control">
          <input type="checkbox" checked={auditIssue} onChange={(event) => setAuditIssue(event.target.checked)} />
          <span>Sí, quiero priorizar auditoría/reclamación.</span>
        </label>
      </fieldset>

      <div style={{ marginTop: 30 }} aria-live="polite">
        <div className="section-header">
          <div>
            <p className="eyebrow">Resultado de routing · {asOfDate}</p>
            <h3>{result.primaryRoute ? "Tu ruta prioritaria cambió con tus respuestas." : "Todavía falta clasificar el caso."}</h3>
          </div>
        </div>

        {result.notices.length > 0 ? (
          <div className="surface-warning">
            <strong>Antes de concluir</strong>
            <ul>
              {result.notices.map((notice) => <li key={notice}>{notice}</li>)}
            </ul>
          </div>
        ) : null}

        {result.routes.length === 0 ? (
          <div className="surface-warning">
            <strong>No hay una ruta personalizada todavía.</strong>
            <p>Clasifica el producto y añade únicamente los hechos que conozcas. El router no inventa condiciones faltantes.</p>
          </div>
        ) : (
          <div className="extraction-list" style={{ marginTop: 18 }}>
            {result.routes.map((routeItem, index) => (
              <article className="extraction-row" key={routeItem.routeCode} aria-label={`${index === 0 ? "Ruta prioritaria" : "Ruta alternativa"}: ${routeItem.title}`}>
                <div>
                  <div className="extraction-heading">
                    <strong>{index === 0 ? "Prioridad 1 · " : "Alternativa · "}{routeItem.title}</strong>
                    <span className="status-chip">{statusLabels[routeItem.status]}</span>
                    {routeItem.humanReviewRequired ? <span className="material-chip">Revisión humana</span> : null}
                  </div>
                  <p className="field-hint">{routeItem.routeCode} · precisión {routeItem.precision}</p>
                </div>

                <div className="extraction-actions" style={{ alignItems: "stretch" }}>
                  <div>
                    <strong>Por qué aparece</strong>
                    <ul>
                      {routeItem.reasonCodes.map((code) => <li key={code}>{reasonLabels[code] ?? "Existe una condición relevante para esta ruta."}</li>)}
                    </ul>
                  </div>

                  {routeItem.blockers.length > 0 ? (
                    <div>
                      <strong>Qué falta o bloquea</strong>
                      <ul>{routeItem.blockers.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                  ) : null}

                  {routeItem.requiredEvidence.length > 0 ? (
                    <div>
                      <strong>Evidencia útil</strong>
                      <ul>{routeItem.requiredEvidence.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                  ) : null}

                  <div className="result-callout" style={{ marginTop: 0 }}>
                    <strong>Siguiente paso</strong>
                    <p className="section-copy">{routeItem.nextAction}</p>
                  </div>

                  {routeItem.caveat ? (
                    <div className="surface-warning" style={{ marginTop: 0 }}>
                      <strong>Qué no significa</strong>
                      <p>{routeItem.caveat}</p>
                    </div>
                  ) : null}

                  <details>
                    <summary>Ver fundamento de esta ruta</summary>
                    <ul>{routeItem.legalBasis.map((item) => <li key={item}>{item}</li>)}</ul>
                  </details>

                  <div className="actions">
                    <button
                      className="button button-primary"
                      type="button"
                      aria-pressed={selectedRouteCode === routeItem.routeCode}
                      onClick={() => setSelectedRouteCode(routeItem.routeCode)}
                    >
                      Preparar esta ruta
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {selectedRoute ? (
        <CasePlanWorkspace
          route={selectedRoute}
          asOfDate={asOfDate}
          onClose={() => setSelectedRouteCode(null)}
        />
      ) : null}
    </section>
  );
}