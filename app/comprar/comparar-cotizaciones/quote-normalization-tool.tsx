"use client";

import { useEffect, useRef, useState } from "react";
import { PrecisionBadge } from "@/components/vivienda/signature-components";
import {
  normalizeFinancingQuote,
  normalizeFinancingQuotePair,
  type FinancingQuoteInput,
  type InsuranceTreatment,
  type ModelingRequirement,
  type NormalizedQuote,
  type NormalizedQuotePair,
  type OneTimeCostsTreatment,
  type PrepaymentInformation,
  type QuoteAmortizationBehavior,
  type QuoteBasisDifference,
  type QuoteContractStructure,
  type QuoteDenomination,
  type QuoteFieldCode,
  type QuoteRateConvention,
  type QuoteReadiness,
} from "@/domain/quote-normalization/evaluator";
import styles from "./quote-normalization.module.css";

type QuoteSlot = "a" | "b";

type QuoteFormState = {
  providerName: string;
  quoteDate: string;
  validUntil: string;
  contractStructure: "" | QuoteContractStructure;
  denomination: "" | QuoteDenomination;
  propertyValue: string;
  financedAmount: string;
  quotedFinancingPercentage: string;
  termMonths: string;
  quotedRatePercent: string;
  rateConvention: "" | QuoteRateConvention;
  amortizationBehavior: "" | QuoteAmortizationBehavior;
  rateIndexOrReference: string;
  initialMonthlyPaymentOrCanon: string;
  insuranceTreatment: "" | InsuranceTreatment;
  monthlyInsuranceAmount: string;
  oneTimeCostsTreatment: "" | OneTimeCostsTreatment;
  oneTimeCostsTotal: string;
  totalCashRequiredAtClosing: string;
  prepaymentInformation: "" | PrepaymentInformation;
  prepaymentRulesText: string;
  leasingPurchaseOptionMode: "percentage" | "value";
  leasingPurchaseOptionPercentage: string;
  leasingPurchaseOptionValue: string;
  leasingPurchaseOptionTiming: string;
};

const emptyQuoteForm: QuoteFormState = {
  providerName: "",
  quoteDate: "",
  validUntil: "",
  contractStructure: "",
  denomination: "",
  propertyValue: "",
  financedAmount: "",
  quotedFinancingPercentage: "",
  termMonths: "",
  quotedRatePercent: "",
  rateConvention: "",
  amortizationBehavior: "",
  rateIndexOrReference: "",
  initialMonthlyPaymentOrCanon: "",
  insuranceTreatment: "",
  monthlyInsuranceAmount: "",
  oneTimeCostsTreatment: "",
  oneTimeCostsTotal: "",
  totalCashRequiredAtClosing: "",
  prepaymentInformation: "",
  prepaymentRulesText: "",
  leasingPurchaseOptionMode: "percentage",
  leasingPurchaseOptionPercentage: "",
  leasingPurchaseOptionValue: "",
  leasingPurchaseOptionTiming: "",
};

const fieldLabel: Record<QuoteFieldCode, string> = {
  provider_name: "Entidad o proveedor",
  quote_date: "Fecha de la cotización",
  contract_structure: "Estructura contractual",
  denomination: "Denominación en pesos o UVR",
  property_value: "Valor del inmueble",
  financed_amount: "Monto financiado",
  term_months: "Plazo",
  amortization_behavior: "Comportamiento de amortización o canon",
  quoted_rate_value: "Tasa declarada",
  rate_convention: "Convención de la tasa",
  initial_monthly_payment_or_canon: "Cuota o canon inicial",
  insurance_treatment: "Tratamiento de seguros",
  monthly_insurance_amount: "Valor mensual de seguros",
  one_time_costs_treatment: "Tratamiento de costos de una sola vez",
  one_time_costs_total: "Total de costos de una sola vez",
  total_cash_required_at_closing: "Efectivo total requerido al cierre",
  prepayment_information: "Información sobre prepago",
  prepayment_rules_text: "Reglas de prepago",
  rate_index_or_reference: "Referencia o índice de la cotización UVR",
  leasing_purchase_option: "Economía de la opción de compra del leasing",
  leasing_purchase_option_timing: "Momento de la opción de compra",
};

const readinessCopy: Record<QuoteReadiness, { eyebrow: string; title: string; body: string }> = {
  incomplete: {
    eyebrow: "Faltan datos estructurales",
    title: "Todavía no podemos describir bien esta cotización",
    body: "Completa primero la estructura, denominación, monto, plazo y cuota o canon inicial. No convertimos esos vacíos en supuestos.",
  },
  structurally_ready: {
    eyebrow: "Estructura identificada",
    title: "Ya entendemos la estructura; aún faltan datos materiales",
    body: "La oferta se puede revisar a nivel estructural, pero todavía no tiene la base suficiente para alimentar una comparación económica posterior.",
  },
  comparison_input_ready: {
    eyebrow: "Base material suficiente",
    title: "La cotización ya tiene los datos materiales para la siguiente etapa",
    body: "Esto significa que la entrada está suficientemente completa para una futura modelación. No significa que sea mejor, más barata, aprobada ni verificada.",
  },
};

const requirementLabel: Record<ModelingRequirement, string> = {
  uvr_path_or_verified_schedule: "Definir una trayectoria de UVR o usar un cronograma verificado antes de proyectar valores en pesos.",
  leasing_purchase_option_economics: "Incorporar la economía de la opción de compra del leasing en cualquier comparación de costo.",
  normalize_rate_conventions: "Convertir las tasas a una convención comparable antes de contrastarlas.",
  normalize_insurance_treatment: "Poner seguros incluidos y excluidos sobre la misma base.",
  normalize_one_time_costs: "Normalizar los costos de una sola vez antes de calcular costo económico.",
  normalize_financed_amount_or_equity: "Normalizar el monto financiado o el aporte de capital para evitar atribuir a la tasa diferencias que vienen del efectivo aportado.",
  normalize_term_or_compare_multiple_horizons: "Normalizar el plazo o comparar horizontes comunes.",
  quote_validity_alignment: "Alinear fecha y vigencia de las cotizaciones antes de interpretar una diferencia comercial.",
};

const differenceLabel: Record<QuoteBasisDifference["code"], string> = {
  provider: "Entidad o proveedor",
  quote_date: "Fecha de cotización",
  validity: "Vigencia",
  contract_structure: "Estructura contractual",
  denomination: "Denominación",
  property_value: "Valor del inmueble",
  financed_amount: "Monto financiado",
  financing_percentage: "Porcentaje financiado derivado",
  term: "Plazo",
  rate_convention: "Convención de tasa",
  amortization_behavior: "Comportamiento de amortización",
  insurance_treatment: "Tratamiento de seguros",
  cash_required: "Efectivo requerido al cierre",
  leasing_purchase_option: "Opción de compra del leasing",
};

const structureLabel: Record<QuoteContractStructure, string> = {
  mortgage_credit: "Crédito hipotecario",
  housing_leasing: "Leasing habitacional",
};

function readNumber(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error("Revisa los campos numéricos: hay un valor que no se puede interpretar.");
  return value;
}

function buildQuoteInput(slot: QuoteSlot, state: QuoteFormState): FinancingQuoteInput {
  const input: FinancingQuoteInput = {
    quoteId: slot === "a" ? "quote-a" : "quote-b",
    source: "user_declared",
  };

  if (state.providerName.trim()) input.providerName = state.providerName.trim();
  if (state.quoteDate) input.quoteDate = state.quoteDate;
  if (state.validUntil) input.validUntil = state.validUntil;
  if (state.contractStructure) input.contractStructure = state.contractStructure;
  if (state.denomination) input.denomination = state.denomination;

  const propertyValue = readNumber(state.propertyValue);
  const financedAmount = readNumber(state.financedAmount);
  const quotedFinancingPercentage = readNumber(state.quotedFinancingPercentage);
  const termMonths = readNumber(state.termMonths);
  const quotedRatePercent = readNumber(state.quotedRatePercent);
  const initialPayment = readNumber(state.initialMonthlyPaymentOrCanon);
  const cashAtClosing = readNumber(state.totalCashRequiredAtClosing);

  if (propertyValue !== undefined) input.propertyValue = propertyValue;
  if (financedAmount !== undefined) input.financedAmount = financedAmount;
  if (quotedFinancingPercentage !== undefined) input.quotedFinancingPercentage = quotedFinancingPercentage / 100;
  if (termMonths !== undefined) input.termMonths = termMonths;
  if (quotedRatePercent !== undefined) input.quotedRateValue = quotedRatePercent / 100;
  if (initialPayment !== undefined) input.initialMonthlyPaymentOrCanon = initialPayment;
  if (cashAtClosing !== undefined) input.totalCashRequiredAtClosing = cashAtClosing;

  if (state.rateConvention) input.rateConvention = state.rateConvention;
  if (state.amortizationBehavior) input.amortizationBehavior = state.amortizationBehavior;
  if (state.denomination === "uvr" && state.rateIndexOrReference.trim()) {
    input.rateIndexOrReference = state.rateIndexOrReference.trim();
  }

  if (state.insuranceTreatment) {
    input.insuranceTreatment = state.insuranceTreatment;
    if (state.insuranceTreatment !== "included_in_initial_payment") {
      const monthlyInsurance = readNumber(state.monthlyInsuranceAmount);
      if (monthlyInsurance !== undefined) input.monthlyInsuranceAmount = monthlyInsurance;
    }
  }

  if (state.oneTimeCostsTreatment) {
    input.oneTimeCostsTreatment = state.oneTimeCostsTreatment;
    if (state.oneTimeCostsTreatment === "itemized" || state.oneTimeCostsTreatment === "total_only") {
      const oneTimeCosts = readNumber(state.oneTimeCostsTotal);
      if (oneTimeCosts !== undefined) input.oneTimeCostsTotal = oneTimeCosts;
    }
  }

  if (state.prepaymentInformation) {
    input.prepaymentInformation = state.prepaymentInformation;
    if (state.prepaymentInformation === "rules_supplied" && state.prepaymentRulesText.trim()) {
      input.prepaymentRulesText = state.prepaymentRulesText.trim();
    }
  }

  if (state.contractStructure === "housing_leasing") {
    if (state.leasingPurchaseOptionMode === "percentage") {
      const purchaseOptionPercentage = readNumber(state.leasingPurchaseOptionPercentage);
      if (purchaseOptionPercentage !== undefined) input.leasingPurchaseOptionPercentage = purchaseOptionPercentage / 100;
    } else {
      const purchaseOptionValue = readNumber(state.leasingPurchaseOptionValue);
      if (purchaseOptionValue !== undefined) input.leasingPurchaseOptionValue = purchaseOptionValue;
    }
    if (state.leasingPurchaseOptionTiming.trim()) {
      input.leasingPurchaseOptionTiming = state.leasingPurchaseOptionTiming.trim();
    }
  }

  return input;
}

function money(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatBasisValue(code: QuoteBasisDifference["code"], value: string | number | null): string {
  if (value === null) return "No declarado";
  if (typeof value === "string") {
    if (code === "contract_structure") {
      return value === "mortgage_credit" ? "Crédito hipotecario" : value === "housing_leasing" ? "Leasing habitacional" : value;
    }
    if (code === "denomination") return value.toUpperCase();
    return value.replaceAll("_", " ");
  }
  if (code === "property_value" || code === "financed_amount" || code === "cash_required" || code === "leasing_purchase_option") {
    return money(value);
  }
  if (code === "financing_percentage") return `${(value * 100).toFixed(1)}%`;
  if (code === "term") return `${value} meses`;
  return String(value);
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function ChoiceFieldset({
  legend,
  name,
  value,
  choices,
  onChange,
}: {
  legend: string;
  name: string;
  value: string;
  choices: Array<{ value: string; label: string; detail: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className={styles.choiceFieldset}>
      <legend>{legend}</legend>
      <div className={styles.choiceGrid}>
        {choices.map((choice) => (
          <label className={styles.choiceCard} key={choice.value}>
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
    </fieldset>
  );
}

function QuoteForm({
  slot,
  state,
  onStateChange,
  onSubmit,
  error,
  onCancel,
  editing,
}: {
  slot: QuoteSlot;
  state: QuoteFormState;
  onStateChange: (next: QuoteFormState) => void;
  onSubmit: () => void;
  error: string | null;
  onCancel?: () => void;
  editing: boolean;
}) {
  const prefix = slot === "a" ? "quote-a" : "quote-b";
  const update = <K extends keyof QuoteFormState>(key: K, value: QuoteFormState[K]) => {
    onStateChange({ ...state, [key]: value });
  };

  return (
    <section className={`surface ${styles.formCard}`} aria-labelledby={`${prefix}-form-heading`}>
      <div className={styles.formHeader}>
        <PrecisionBadge level="C1" />
        <div>
          <p className="eyebrow">Cotización {slot === "a" ? "A" : "B"} · datos declarados</p>
          <h2 id={`${prefix}-form-heading`}>{editing ? "Revisa los datos de esta cotización" : "Pasa la cotización a una estructura común"}</h2>
          <p>No necesitas completar campos que no aparecen en tu oferta. El resultado te dirá cuáles faltan y cuáles son materiales.</p>
        </div>
      </div>

      <section className={styles.formSection} aria-labelledby={`${prefix}-identity-heading`}>
        <div className={styles.sectionHeading}>
          <span>1</span>
          <div>
            <h3 id={`${prefix}-identity-heading`}>Identificación y vigencia</h3>
            <p>Ubica de quién es la oferta y a qué fecha corresponde.</p>
          </div>
        </div>
        <div className={styles.fieldGrid}>
          <Field label="Entidad o proveedor">
            <input value={state.providerName} onChange={(event) => update("providerName", event.target.value)} placeholder="Ej. Entidad A" />
          </Field>
          <Field label="Fecha de la cotización">
            <input type="date" value={state.quoteDate} onChange={(event) => update("quoteDate", event.target.value)} />
          </Field>
          <Field label="Vigente hasta" hint="Déjalo vacío si la oferta no lo dice.">
            <input type="date" value={state.validUntil} onChange={(event) => update("validUntil", event.target.value)} />
          </Field>
        </div>
      </section>

      <section className={styles.formSection} aria-labelledby={`${prefix}-basis-heading`}>
        <div className={styles.sectionHeading}>
          <span>2</span>
          <div>
            <h3 id={`${prefix}-basis-heading`}>Base de financiación</h3>
            <p>Estos datos definen la estructura mínima antes de hablar de costo.</p>
          </div>
        </div>

        <ChoiceFieldset
          legend="¿Qué estructura declara la cotización?"
          name={`${prefix}-structure`}
          value={state.contractStructure}
          choices={[
            { value: "mortgage_credit", label: "Crédito hipotecario", detail: "El inmueble se adquiere bajo una obligación garantizada con hipoteca." },
            { value: "housing_leasing", label: "Leasing habitacional", detail: "La estructura incorpora cánones y una opción de adquisición según el contrato." },
          ]}
          onChange={(value) => update("contractStructure", value as QuoteContractStructure)}
        />

        <ChoiceFieldset
          legend="¿La obligación está expresada en pesos o UVR?"
          name={`${prefix}-denomination`}
          value={state.denomination}
          choices={[
            { value: "pesos", label: "Pesos", detail: "La obligación se expresa nominalmente en COP bajo las condiciones declaradas." },
            { value: "uvr", label: "UVR", detail: "La obligación incorpora una unidad indexada y necesita su referencia para modelarse correctamente." },
          ]}
          onChange={(value) => update("denomination", value as QuoteDenomination)}
        />

        <div className={styles.fieldGrid}>
          <Field label="Valor del inmueble (COP)">
            <input type="number" min="0" inputMode="decimal" value={state.propertyValue} onChange={(event) => update("propertyValue", event.target.value)} />
          </Field>
          <Field label="Monto financiado (COP)">
            <input type="number" min="0" inputMode="decimal" value={state.financedAmount} onChange={(event) => update("financedAmount", event.target.value)} />
          </Field>
          <Field label="Porcentaje financiado declarado (%)" hint="Opcional. Lo contrastamos con valor del inmueble y monto financiado.">
            <input type="number" min="0" max="100" step="0.01" inputMode="decimal" value={state.quotedFinancingPercentage} onChange={(event) => update("quotedFinancingPercentage", event.target.value)} />
          </Field>
          <Field label="Plazo (meses)">
            <input type="number" min="1" step="1" inputMode="numeric" value={state.termMonths} onChange={(event) => update("termMonths", event.target.value)} />
          </Field>
          <Field label={state.contractStructure === "housing_leasing" ? "Canon inicial (COP/mes)" : "Cuota inicial del crédito (COP/mes)"}>
            <input type="number" min="0" inputMode="decimal" value={state.initialMonthlyPaymentOrCanon} onChange={(event) => update("initialMonthlyPaymentOrCanon", event.target.value)} />
          </Field>
        </div>
      </section>

      <section className={styles.formSection} aria-labelledby={`${prefix}-rate-heading`}>
        <div className={styles.sectionHeading}>
          <span>3</span>
          <div>
            <h3 id={`${prefix}-rate-heading`}>Tasa y comportamiento</h3>
            <p>No convertimos ni comparamos tasas todavía. Primero conservamos la convención con la que fue cotizada.</p>
          </div>
        </div>
        <div className={styles.fieldGrid}>
          <Field label="Tasa declarada (%)" hint="Escribe el número como aparece, por ejemplo 11 para 11%.">
            <input type="number" min="0" step="0.0001" inputMode="decimal" value={state.quotedRatePercent} onChange={(event) => update("quotedRatePercent", event.target.value)} />
          </Field>
          <Field label="Convención de tasa">
            <select value={state.rateConvention} onChange={(event) => update("rateConvention", event.target.value as QuoteFormState["rateConvention"])}>
              <option value="">Selecciona si la conoces</option>
              <option value="effective_annual">Efectiva anual (EA)</option>
              <option value="nominal_annual_monthly">Nominal anual mes vencido</option>
              <option value="monthly_effective">Efectiva mensual</option>
              <option value="other">Otra</option>
              <option value="unknown">No sé</option>
            </select>
          </Field>
          <Field label="Comportamiento de cuota o canon">
            <select value={state.amortizationBehavior} onChange={(event) => update("amortizationBehavior", event.target.value as QuoteFormState["amortizationBehavior"])}>
              <option value="">Selecciona si lo conoces</option>
              <option value="constant_nominal_payment">Cuota nominal constante</option>
              <option value="constant_principal">Abono a capital constante</option>
              <option value="uvr_linked_payment">Comportamiento ligado a UVR</option>
              <option value="other">Otro</option>
              <option value="unknown">No sé</option>
            </select>
          </Field>
          {state.denomination === "uvr" ? (
            <Field label="Referencia o índice indicado en la cotización UVR" hint="Transcribe la referencia sin interpretarla.">
              <input value={state.rateIndexOrReference} onChange={(event) => update("rateIndexOrReference", event.target.value)} placeholder="Ej. UVR + tasa indicada en la oferta" />
            </Field>
          ) : null}
        </div>
      </section>

      <section className={styles.formSection} aria-labelledby={`${prefix}-cost-heading`}>
        <div className={styles.sectionHeading}>
          <span>4</span>
          <div>
            <h3 id={`${prefix}-cost-heading`}>Seguros, cierre y condiciones</h3>
            <p>Una cuota baja puede significar algo distinto si excluye seguros, exige más efectivo o usa otra opción de compra.</p>
          </div>
        </div>
        <div className={styles.fieldGrid}>
          <Field label="¿Cómo trata la cotización los seguros?">
            <select value={state.insuranceTreatment} onChange={(event) => update("insuranceTreatment", event.target.value as QuoteFormState["insuranceTreatment"])}>
              <option value="">Selecciona</option>
              <option value="included_in_initial_payment">Incluidos en la cuota/canon declarado</option>
              <option value="excluded_from_initial_payment">Excluidos de la cuota/canon declarado</option>
              <option value="partially_included">Parcialmente incluidos</option>
              <option value="unknown">No sé</option>
            </select>
          </Field>
          {state.insuranceTreatment === "excluded_from_initial_payment" || state.insuranceTreatment === "partially_included" ? (
            <Field label="Seguros mensuales adicionales (COP)">
              <input type="number" min="0" inputMode="decimal" value={state.monthlyInsuranceAmount} onChange={(event) => update("monthlyInsuranceAmount", event.target.value)} />
            </Field>
          ) : null}
          <Field label="¿Cómo aparecen los costos de una sola vez?">
            <select value={state.oneTimeCostsTreatment} onChange={(event) => update("oneTimeCostsTreatment", event.target.value as QuoteFormState["oneTimeCostsTreatment"])}>
              <option value="">Selecciona</option>
              <option value="itemized">Desglosados</option>
              <option value="total_only">Solo total</option>
              <option value="stated_none">La cotización declara que no hay</option>
              <option value="unknown">No sé</option>
            </select>
          </Field>
          {state.oneTimeCostsTreatment === "itemized" || state.oneTimeCostsTreatment === "total_only" ? (
            <Field label="Total de costos de una sola vez (COP)">
              <input type="number" min="0" inputMode="decimal" value={state.oneTimeCostsTotal} onChange={(event) => update("oneTimeCostsTotal", event.target.value)} />
            </Field>
          ) : null}
          <Field label="Efectivo total requerido al cierre (COP)" hint="Incluye el total que la oferta exige tener disponible para cerrar, según lo declarado.">
            <input type="number" min="0" inputMode="decimal" value={state.totalCashRequiredAtClosing} onChange={(event) => update("totalCashRequiredAtClosing", event.target.value)} />
          </Field>
          <Field label="Información de prepago">
            <select value={state.prepaymentInformation} onChange={(event) => update("prepaymentInformation", event.target.value as QuoteFormState["prepaymentInformation"])}>
              <option value="">Selecciona</option>
              <option value="stated_unrestricted">La cotización lo declara sin restricciones</option>
              <option value="rules_supplied">La cotización trae reglas específicas</option>
              <option value="unknown">No sé</option>
            </select>
          </Field>
          {state.prepaymentInformation === "rules_supplied" ? (
            <Field label="Reglas de prepago" hint="Transcribe o resume únicamente lo que dice la cotización.">
              <textarea rows={3} value={state.prepaymentRulesText} onChange={(event) => update("prepaymentRulesText", event.target.value)} />
            </Field>
          ) : null}
        </div>

        {state.contractStructure === "housing_leasing" ? (
          <div className={styles.conditionalPanel}>
            <div>
              <strong>Opción de compra del leasing</strong>
              <p>Este dato cambia la economía total del contrato y no puede omitirse en una comparación posterior.</p>
            </div>
            <div className={styles.modeToggle} role="group" aria-label="Forma de expresar la opción de compra">
              <button type="button" aria-pressed={state.leasingPurchaseOptionMode === "percentage"} onClick={() => update("leasingPurchaseOptionMode", "percentage")}>Porcentaje</button>
              <button type="button" aria-pressed={state.leasingPurchaseOptionMode === "value"} onClick={() => update("leasingPurchaseOptionMode", "value")}>Valor COP</button>
            </div>
            <div className={styles.fieldGrid}>
              {state.leasingPurchaseOptionMode === "percentage" ? (
                <Field label="Opción de compra (%)">
                  <input type="number" min="0" max="100" step="0.01" inputMode="decimal" value={state.leasingPurchaseOptionPercentage} onChange={(event) => update("leasingPurchaseOptionPercentage", event.target.value)} />
                </Field>
              ) : (
                <Field label="Opción de compra (COP)">
                  <input type="number" min="0" inputMode="decimal" value={state.leasingPurchaseOptionValue} onChange={(event) => update("leasingPurchaseOptionValue", event.target.value)} />
                </Field>
              )}
              <Field label="¿Cuándo se ejerce o paga la opción?">
                <input value={state.leasingPurchaseOptionTiming} onChange={(event) => update("leasingPurchaseOptionTiming", event.target.value)} placeholder="Ej. al finalizar el contrato" />
              </Field>
            </div>
          </div>
        ) : null}
      </section>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      <div className={styles.formActions}>
        <button className="button button-primary" type="button" onClick={onSubmit}>Revisar esta cotización</button>
        {onCancel ? <button className="button button-secondary" type="button" onClick={onCancel}>Volver al resultado</button> : null}
      </div>
    </section>
  );
}

function QuoteStatusCard({ label, result }: { label: string; result: NormalizedQuote }) {
  const copy = readinessCopy[result.readiness];
  return (
    <article className={styles.statusCard}>
      <div className={styles.statusTopline}>
        <strong>{label}</strong>
        <span>{copy.eyebrow}</span>
      </div>
      <p>{copy.title}</p>
    </article>
  );
}

function MissingList({ title, fields }: { title: string; fields: QuoteFieldCode[] }) {
  if (fields.length === 0) return null;
  return (
    <section className={styles.missingBlock}>
      <h3>{title}</h3>
      <ul>{fields.map((field) => <li key={field}>{fieldLabel[field]}</li>)}</ul>
    </section>
  );
}

function SingleQuoteResult({
  label,
  result,
  onEdit,
  onAddSecond,
}: {
  label: string;
  result: NormalizedQuote;
  onEdit: () => void;
  onAddSecond?: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const copy = readinessCopy[result.readiness];

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className={styles.results}>
      <section className={`surface ${styles.resultHero}`}>
        <div className={styles.resultTopline}>
          <PrecisionBadge level={result.precision} />
          <span>{label} · información declarada y no verificada</span>
        </div>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 ref={headingRef} tabIndex={-1}>{copy.title}</h2>
        <p className="section-copy">{copy.body}</p>
        {result.derived.financingPercentage !== null ? (
          <div className={styles.derivedFact}>
            <span>Porcentaje financiado derivado</span>
            <strong>{(result.derived.financingPercentage * 100).toFixed(1)}%</strong>
            <small>Calculado únicamente con valor del inmueble y monto financiado que declaraste.</small>
          </div>
        ) : null}
      </section>

      <div className={styles.resultGrid}>
        <MissingList title="Falta para describir la estructura" fields={result.missingStructuralFields} />
        <MissingList title="Falta antes de una futura modelación" fields={result.missingComparisonFields} />
      </div>

      {result.warnings.length > 0 ? (
        <section className={`surface ${styles.warningPanel}`} aria-labelledby={`${result.quoteId}-warnings-heading`}>
          <p className="eyebrow">Revisiones de consistencia</p>
          <h2 id={`${result.quoteId}-warnings-heading`}>Hay datos que conviene confirmar</h2>
          <ul>{result.warnings.map((warning) => <li key={warning.code}>{warning.message}</li>)}</ul>
        </section>
      ) : null}

      <section className={styles.truthBoundary} aria-label="Límites del diagnóstico de cotización">
        <strong>Qué sí hizo esta revisión</strong>
        <p>Organizó datos declarados, detectó vacíos materiales y realizó verificaciones mecánicas de consistencia.</p>
        <strong>Qué no hizo</strong>
        <p>No verificó documentos, no calculó costo total ni ahorro, no eligió ganador y no evaluó aprobación o elegibilidad.</p>
      </section>

      <div className={styles.actions}>
        <button className="button button-secondary" type="button" onClick={onEdit}>Editar esta cotización</button>
        {onAddSecond ? <button className="button button-primary" type="button" onClick={onAddSecond}>Añadir otra cotización</button> : null}
        <a className="button button-secondary" href="/comprar/financiacion">Volver al explorador de financiación</a>
      </div>
    </div>
  );
}

function PairResult({
  pair,
  onEditA,
  onEditB,
}: {
  pair: NormalizedQuotePair;
  onEditA: () => void;
  onEditB: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const pairMessage = pair.readiness === "blocked_by_missing_data"
    ? "Al menos una cotización todavía no tiene datos estructurales suficientes."
    : pair.readiness === "ready_for_structural_comparison"
      ? "Ya podemos identificar diferencias de estructura, pero todavía faltan datos materiales antes de cualquier modelación económica."
      : "Las dos cotizaciones tienen una base material suficiente para pasar, en una capa posterior, a una modelación económica normalizada.";

  return (
    <div className={styles.results}>
      <section className={`surface ${styles.resultHero}`}>
        <div className={styles.resultTopline}>
          <PrecisionBadge level="C1" />
          <span>Dos cotizaciones declaradas · sin verificación documental</span>
        </div>
        <p className="eyebrow">Base de comparación</p>
        <h2 ref={headingRef} tabIndex={-1}>Ahora sabemos qué no es directamente comparable</h2>
        <p className="section-copy">{pairMessage}</p>
        <p className={styles.boundaryLine}>Todavía no calculamos cuál es más barata, cuál gana, cuánto ahorrarías ni cuánto costará cada alternativa en el tiempo.</p>
      </section>

      <div className={styles.statusGrid}>
        <QuoteStatusCard label="Cotización A" result={pair.quoteA} />
        <QuoteStatusCard label="Cotización B" result={pair.quoteB} />
      </div>

      <section className={styles.pairSection} aria-labelledby="basis-differences-heading">
        <div className={styles.pairHeading}>
          <div>
            <p className="eyebrow">Diferencias de base</p>
            <h2 id="basis-differences-heading">Antes de mirar un número ganador, alinea estas diferencias</h2>
          </div>
          <p>Una diferencia aquí puede explicar por qué dos cuotas o tasas no significan lo mismo.</p>
        </div>
        {pair.basisDifferences.length > 0 ? (
          <div className={styles.differenceList}>
            {pair.basisDifferences.map((difference) => (
              <article className={`surface ${styles.differenceCard}`} key={difference.code}>
                <h3>{differenceLabel[difference.code]}</h3>
                <div className={styles.differenceValues}>
                  <div><span>Cotización A</span><strong>{formatBasisValue(difference.code, difference.quoteAValue)}</strong></div>
                  <div><span>Cotización B</span><strong>{formatBasisValue(difference.code, difference.quoteBValue)}</strong></div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyDifference}>No detectamos diferencias en las bases estructurales que compara v0.18. Esto todavía no demuestra igualdad de costo.</div>
        )}
      </section>

      <section className={`surface ${styles.requirementsPanel}`} aria-labelledby="modeling-requirements-heading">
        <p className="eyebrow">Siguiente capa</p>
        <h2 id="modeling-requirements-heading">Qué deberá normalizar un futuro modelo económico</h2>
        {pair.modelingRequirements.length > 0 ? (
          <ul>{pair.modelingRequirements.map((requirement) => <li key={requirement}>{requirementLabel[requirement]}</li>)}</ul>
        ) : (
          <p>Con las bases declaradas no aparecen requisitos adicionales de normalización estructural. Aun así, falta un modelo de flujos y costo total antes de concluir cuál conviene.</p>
        )}
      </section>

      <section className={styles.truthBoundary} aria-label="Límites de la comparación de cotizaciones">
        <strong>Qué sí compara v0.18</strong>
        <p>Completitud material, consistencia básica y diferencias de base declaradas.</p>
        <strong>Qué no compara todavía</strong>
        <p>Costo total, valor presente, ahorro, riesgo económico, conveniencia individual, aprobación o ranking de entidades.</p>
      </section>

      <div className={styles.actions}>
        <button className="button button-secondary" type="button" onClick={onEditA}>Editar cotización A</button>
        <button className="button button-secondary" type="button" onClick={onEditB}>Editar cotización B</button>
        <a className="button button-secondary" href="/comprar/financiacion">Volver al explorador de financiación</a>
      </div>
    </div>
  );
}

export function QuoteNormalizationTool() {
  const [quoteAForm, setQuoteAForm] = useState<QuoteFormState>({ ...emptyQuoteForm });
  const [quoteBForm, setQuoteBForm] = useState<QuoteFormState>({ ...emptyQuoteForm });
  const [quoteAInput, setQuoteAInput] = useState<FinancingQuoteInput | null>(null);
  const [quoteBInput, setQuoteBInput] = useState<FinancingQuoteInput | null>(null);
  const [quoteAResult, setQuoteAResult] = useState<NormalizedQuote | null>(null);
  const [quoteBResult, setQuoteBResult] = useState<NormalizedQuote | null>(null);
  const [activeSlot, setActiveSlot] = useState<QuoteSlot>("a");
  const [formError, setFormError] = useState<string | null>(null);

  function submit(slot: QuoteSlot) {
    try {
      const form = slot === "a" ? quoteAForm : quoteBForm;
      const input = buildQuoteInput(slot, form);
      const result = normalizeFinancingQuote(input);
      if (slot === "a") {
        setQuoteAInput(input);
        setQuoteAResult(result);
      } else {
        setQuoteBInput(input);
        setQuoteBResult(result);
      }
      setFormError(null);
      setActiveSlot(null as never);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No pudimos interpretar un dato de la cotización.");
    }
  }

  function edit(slot: QuoteSlot) {
    setFormError(null);
    setActiveSlot(slot);
  }

  function cancelEdit() {
    setFormError(null);
    setActiveSlot(null as never);
  }

  const pair = quoteAInput && quoteBInput ? normalizeFinancingQuotePair(quoteAInput, quoteBInput) : null;
  const isEditingExisting = activeSlot === "a" ? quoteAResult !== null : activeSlot === "b" ? quoteBResult !== null : false;

  return (
    <div className={styles.tool}>
      <section className={styles.intro}>
        <p className="eyebrow">Cotizaciones de financiación</p>
        <h1>Pon tu cotización sobre una base comparable</h1>
        <p className="lede">No basta con mirar la tasa o la cuota. Primero identifica estructura, plazo, seguros, costos de cierre, efectivo requerido y condiciones que cambian el significado económico de la oferta.</p>
        <p className="trust-line">La información se evalúa como declarada por ti. En esta versión no subes documentos, no consultamos centrales y no guardamos tu cotización.</p>
      </section>

      {activeSlot === "b" && quoteAResult ? (
        <div className={styles.savedQuoteBanner}>
          <QuoteStatusCard label="Cotización A conservada en esta pantalla" result={quoteAResult} />
        </div>
      ) : null}

      {activeSlot === "a" ? (
        <QuoteForm
          slot="a"
          state={quoteAForm}
          onStateChange={(next) => {
            setQuoteAForm(next);
            setFormError(null);
          }}
          onSubmit={() => submit("a")}
          error={formError}
          editing={isEditingExisting}
          {...(quoteAResult ? { onCancel: cancelEdit } : {})}
        />
      ) : activeSlot === "b" ? (
        <QuoteForm
          slot="b"
          state={quoteBForm}
          onStateChange={(next) => {
            setQuoteBForm(next);
            setFormError(null);
          }}
          onSubmit={() => submit("b")}
          error={formError}
          editing={isEditingExisting}
          {...(quoteBResult ? { onCancel: cancelEdit } : {})}
        />
      ) : pair ? (
        <PairResult pair={pair} onEditA={() => edit("a")} onEditB={() => edit("b")} />
      ) : quoteAResult ? (
        <SingleQuoteResult
          label="Cotización A"
          result={quoteAResult}
          onEdit={() => edit("a")}
          onAddSecond={() => {
            setFormError(null);
            setActiveSlot("b");
          }}
        />
      ) : null}

      <section className={styles.preResultBoundary}>
        <strong>Importante</strong>
        <p>Que una cotización tenga todos los datos materiales no significa que sea más conveniente. Solo significa que deja de faltar información básica para una modelación posterior.</p>
      </section>
    </div>
  );
}
