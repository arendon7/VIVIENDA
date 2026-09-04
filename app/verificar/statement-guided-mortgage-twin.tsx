"use client";

import { useMemo, useRef, useState } from "react";
import { MortgageTwin } from "@/components/vivienda/mortgage-twin";
import { OpportunityWorkspace } from "@/components/vivienda/opportunity-workspace";
import { PrecisionBadge } from "@/components/vivienda/signature-components";
import { compareConstantPaymentPrepayment } from "@/domain/finance/prepayment";
import {
  evaluateStatementGuidedIntake,
  type LocalStatementFileDescriptor,
  type StatementGuidedAmortizationSystem,
  type StatementGuidedFields,
  type StatementGuidedIssueCode,
  type StatementGuidedModality,
  type StatementGuidedProductType,
} from "@/domain/statement-guided-intake/evaluator";
import type { MortgageTwinData } from "@/domain/verification/reconciliation";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const productLabels: Record<Exclude<StatementGuidedProductType, "unknown">, string> = {
  mortgage_housing: "Crédito hipotecario de vivienda",
  housing_leasing: "Leasing habitacional",
};

const modalityLabels: Record<Exclude<StatementGuidedModality, "unknown">, string> = {
  pesos: "Pesos",
  uvr: "UVR",
};

const systemLabels: Record<StatementGuidedAmortizationSystem, string> = {
  constant_payment_pesos: "Cuota constante en pesos",
  other: "Otro sistema",
  unknown: "No estoy seguro",
};

const issueCopy: Partial<Record<StatementGuidedIssueCode, string>> = {
  product_type_missing: "Confirma qué producto aparece en el extracto.",
  cutoff_date_missing: "Transcribe la fecha de corte del extracto.",
  cutoff_date_invalid: "Revisa la fecha de corte: no pudimos interpretarla.",
  cutoff_date_in_future: "La fecha de corte no puede ser posterior a la fecha de esta evaluación.",
  modality_missing: "Confirma si la obligación está en pesos o UVR.",
  principal_balance_missing: "Transcribe el saldo de capital pendiente.",
  principal_balance_invalid: "El saldo de capital debe ser mayor que cero.",
  current_total_payment_invalid: "El pago total, si lo incluyes, debe ser mayor que cero.",
  monthly_insurance_or_costs_invalid: "Seguros o costos mensuales no pueden ser negativos.",
  annual_effective_rate_missing: "Falta la tasa efectiva anual (EA) para este modelo.",
  annual_effective_rate_invalid: "La tasa EA no tiene un valor válido para el modelo.",
  remaining_installments_missing: "Falta el número exacto de cuotas restantes.",
  remaining_installments_invalid: "Las cuotas restantes deben ser un número entero mayor que cero.",
  amortization_system_missing: "Falta confirmar el sistema de amortización.",
  unsupported_amortization_system: "Este primer modelo no soporta el sistema de amortización indicado.",
};

type FormState = {
  institutionName: string;
  productType: StatementGuidedProductType;
  cutoffDate: string;
  modality: StatementGuidedModality;
  principalBalance: string;
  currentTotalPayment: string;
  annualEffectiveRatePercent: string;
  remainingInstallments: string;
  amortizationSystem: StatementGuidedAmortizationSystem;
  monthlyInsuranceOrCosts: string;
};

const initialForm: FormState = {
  institutionName: "",
  productType: "unknown",
  cutoffDate: "",
  modality: "unknown",
  principalBalance: "",
  currentTotalPayment: "",
  annualEffectiveRatePercent: "",
  remainingInstallments: "",
  amortizationSystem: "unknown",
  monthlyInsuranceOrCosts: "",
};

function bogotaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function optionalNumber(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function buildFields(form: FormState): StatementGuidedFields {
  const fields: StatementGuidedFields = {
    productType: form.productType,
    modality: form.modality,
    amortizationSystem: form.amortizationSystem,
  };

  if (form.institutionName.trim()) fields.institutionName = form.institutionName.trim();
  if (form.cutoffDate) fields.cutoffDate = form.cutoffDate;

  const principalBalance = optionalNumber(form.principalBalance);
  const currentTotalPayment = optionalNumber(form.currentTotalPayment);
  const annualRatePercent = optionalNumber(form.annualEffectiveRatePercent);
  const remainingInstallments = optionalNumber(form.remainingInstallments);
  const insurance = optionalNumber(form.monthlyInsuranceOrCosts);

  if (principalBalance !== undefined) fields.principalBalance = principalBalance;
  if (currentTotalPayment !== undefined) fields.currentTotalPayment = currentTotalPayment;
  if (annualRatePercent !== undefined) fields.annualEffectiveRate = annualRatePercent / 100;
  if (remainingInstallments !== undefined) fields.remainingInstallments = remainingInstallments;
  if (insurance !== undefined) fields.monthlyInsuranceOrCosts = insurance;

  return fields;
}

function mortgageTwinData(
  snapshot: NonNullable<ReturnType<typeof evaluateStatementGuidedIntake>["snapshot"]>,
): MortgageTwinData {
  return {
    balance: String(snapshot.principalBalance),
    cutoff: snapshot.cutoffDate,
    modality: modalityLabels[snapshot.modality],
    rate: snapshot.annualEffectiveRate !== undefined
      ? `${(snapshot.annualEffectiveRate * 100).toLocaleString("es-CO", { maximumFractionDigits: 4 })} % EA`
      : "Sin confirmar",
    remaining: snapshot.remainingInstallments !== undefined ? String(snapshot.remainingInstallments) : "Sin confirmar",
    system: snapshot.amortizationSystem ? systemLabels[snapshot.amortizationSystem] : "Sin confirmar",
    ...(snapshot.monthlyInsuranceOrCosts !== undefined
      ? { insurance: `${cop.format(snapshot.monthlyInsuranceOrCosts)} / mes transcritos` }
      : {}),
  };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="field-group guided-field">
      <span className="field-label">{label}</span>
      {hint ? <span className="field-hint">{hint}</span> : null}
      {children}
    </label>
  );
}

export function StatementGuidedMortgageTwin() {
  const [localFile, setLocalFile] = useState<LocalStatementFileDescriptor | null>(null);
  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [monthlyExtra, setMonthlyExtra] = useState("");
  const [modelResult, setModelResult] = useState<ReturnType<typeof compareConstantPaymentPrepayment> | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [showOpportunities, setShowOpportunities] = useState(false);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const opportunityRef = useRef<HTMLDivElement>(null);
  const asOfDate = bogotaToday();

  const assessment = useMemo(
    () => evaluateStatementGuidedIntake({
      asOfDate,
      ...(localFile ? { localStatement: localFile } : {}),
      fields: buildFields(form),
    }),
    [asOfDate, form, localFile],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSubmitted(false);
    setModelResult(null);
    setModelError(null);
    setShowOpportunities(false);
  }

  function selectFile(file: File | undefined) {
    setFileError(null);
    setSubmitted(false);
    setModelResult(null);
    setModelError(null);
    setShowOpportunities(false);

    if (!file) {
      setLocalFile(null);
      setLocalFileName(null);
      return;
    }

    const descriptor: LocalStatementFileDescriptor = {
      mimeType: file.type,
      byteSize: file.size,
    };

    const fileAssessment = evaluateStatementGuidedIntake({
      asOfDate,
      localStatement: descriptor,
      fields: {},
    });

    if (fileAssessment.localReferenceReadiness !== "local_statement_selected") {
      setLocalFile(null);
      setLocalFileName(null);
      const code = fileAssessment.issues.find((item) => item.blocks === "local_reference")?.code;
      setFileError(
        code === "unsupported_local_file_type"
          ? "Usa un archivo PDF, JPG o PNG."
          : code === "local_file_too_large"
            ? "El archivo supera 15 MB. Usa una versión más liviana para esta etapa local."
            : "No pudimos usar este archivo local. Selecciona un PDF, JPG o PNG válido.",
      );
      return;
    }

    setLocalFile(descriptor);
    setLocalFileName(file.name);
    setForm(initialForm);
  }

  function buildSnapshot() {
    setSubmitted(true);
    setModelResult(null);
    setModelError(null);
    setShowOpportunities(false);
    queueMicrotask(() => resultHeadingRef.current?.focus());
  }

  function modelPrepayment() {
    setModelResult(null);
    setModelError(null);
    setShowOpportunities(false);
    const extra = Number(monthlyExtra);
    if (!Number.isFinite(extra) || extra <= 0) {
      setModelError("Define un abono adicional mensual mayor que cero.");
      return;
    }
    const input = assessment.constantPaymentPesosModelInput;
    if (!input) {
      setModelError("Completa primero los datos que habilitan el modelo de cuota constante en pesos.");
      return;
    }
    try {
      setModelResult(compareConstantPaymentPrepayment({
        principal: input.principal,
        annualEffectiveRate: input.annualEffectiveRate,
        remainingMonths: input.remainingMonths,
        recurringExtraPrincipal: extra,
      }));
    } catch {
      setModelError("No pudimos construir este escenario con los datos actuales. Revisa los campos del modelo.");
    }
  }

  function openOpportunities() {
    setShowOpportunities(true);
    queueMicrotask(() => opportunityRef.current?.focus());
  }

  const snapshotIssues = assessment.issues.filter((item) => item.blocks === "snapshot");
  const modelIssues = assessment.issues.filter((item) => item.blocks === "model");
  const contextIssues = assessment.issues.filter((item) => item.blocks === "context");
  const snapshot = assessment.snapshot;

  return (
    <div className="guided-tool">
      <section className="surface form-card" aria-labelledby="guided-title">
        <p className="eyebrow">Tu extracto como guía</p>
        <h1 id="guided-title" style={{ fontSize: "clamp(32px, 6vw, 46px)" }}>
          Construye una fotografía más precisa de tu crédito con tu extracto a la vista.
        </h1>
        <p className="section-copy">
          Selecciona un extracto reciente para tenerlo como referencia local y transcribe solo los datos que cambian el análisis. En esta versión Casa con Criterio no sube, lee ni procesa el archivo.
        </p>

        <div className="privacy-panel">
          <strong>Antes de seleccionar tu extracto</strong>
          <ul>
            <li>Usa, idealmente, un extracto reciente de tu crédito hipotecario o leasing habitacional.</li>
            <li>Nunca pedimos contraseña, token ni clave bancaria.</li>
            <li>El archivo permanece local: no lo enviamos a nuestro servidor en esta versión.</li>
            <li>No usamos OCR ni simulamos haber leído el documento.</li>
            <li>Tú mirarás el extracto y transcribirás los campos relevantes.</li>
            <li>Mi Situación seguirá siendo C1; C3 requiere evidencia realmente derivada y reconciliada.</li>
          </ul>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="statement-file">Seleccionar extracto local</label>
          <span className="field-hint" id="statement-file-hint">PDF, JPG o PNG, máximo 15 MB. Se usa solo como referencia durante esta pantalla.</span>
          <input
            className="field-control"
            id="statement-file"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            aria-describedby={`statement-file-hint${fileError ? " statement-file-error" : ""}`}
            aria-invalid={fileError ? "true" : undefined}
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          {fileError ? <p className="field-error" id="statement-file-error" role="alert">{fileError}</p> : null}
        </div>
      </section>

      {localFile && localFileName ? (
        <>
          <section className="surface guided-form" aria-labelledby="guided-form-title">
            <div className="document-file-chip" aria-label="Referencia local seleccionada">
              <strong>Referencia local seleccionada:</strong> <span>{localFileName}</span>
            </div>
            <p className="field-hint guided-local-note">El nombre se muestra solo en esta sesión. No forma parte de Mi Situación ni de analítica genérica.</p>

            <div className="section-header guided-form-header">
              <div>
                <p className="eyebrow">Transcripción guiada</p>
                <h2 id="guided-form-title">Mira tu extracto y completa solo lo que puedas identificar con seguridad.</h2>
                <p className="section-copy">No hay valores precargados ni una extracción simulada. Si un dato no está claro, conserva la incertidumbre.</p>
              </div>
              <PrecisionBadge level="C1" />
            </div>

            <section className="guided-section" aria-labelledby="guided-identify-title">
              <div className="guided-section-heading">
                <span>1</span>
                <div>
                  <h3 id="guided-identify-title">Ubica qué producto y periodo estás viendo</h3>
                  <p>Clasifica lo que realmente aparece en el documento.</p>
                </div>
              </div>
              <div className="guided-grid">
                <Field label="Entidad o institución" hint="Opcional. Se muestra como contexto y no cambia la precisión.">
                  <input className="field-control" value={form.institutionName} onChange={(event) => update("institutionName", event.target.value)} />
                </Field>
                <Field label="Fecha de corte del extracto">
                  <input className="field-control" type="date" value={form.cutoffDate} onChange={(event) => update("cutoffDate", event.target.value)} />
                </Field>
              </div>

              <fieldset className="field-group">
                <legend className="field-label">¿Qué producto aparece en tu extracto?</legend>
                <div className="choice-list">
                  <label className="radio-card"><input type="radio" name="guided-product" checked={form.productType === "mortgage_housing"} onChange={() => update("productType", "mortgage_housing")} /><span>Crédito hipotecario de vivienda</span></label>
                  <label className="radio-card"><input type="radio" name="guided-product" checked={form.productType === "housing_leasing"} onChange={() => update("productType", "housing_leasing")} /><span>Leasing habitacional</span></label>
                  <label className="radio-card"><input type="radio" name="guided-product" checked={form.productType === "unknown"} onChange={() => update("productType", "unknown")} /><span>No estoy seguro</span></label>
                </div>
              </fieldset>

              <fieldset className="field-group">
                <legend className="field-label">¿La obligación está en pesos o UVR?</legend>
                <div className="choice-list">
                  <label className="radio-card"><input type="radio" name="guided-modality" checked={form.modality === "pesos"} onChange={() => update("modality", "pesos")} /><span>Pesos</span></label>
                  <label className="radio-card"><input type="radio" name="guided-modality" checked={form.modality === "uvr"} onChange={() => update("modality", "uvr")} /><span>UVR</span></label>
                  <label className="radio-card"><input type="radio" name="guided-modality" checked={form.modality === "unknown"} onChange={() => update("modality", "unknown")} /><span>No estoy seguro</span></label>
                </div>
                <p className="field-hint">Si el documento no te permite saberlo con seguridad, conserva “No estoy seguro”.</p>
              </fieldset>
            </section>

            <section className="guided-section" aria-labelledby="guided-snapshot-title">
              <div className="guided-section-heading">
                <span>2</span>
                <div>
                  <h3 id="guided-snapshot-title">Transcribe la fotografía financiera</h3>
                  <p>Separa saldo de capital de pagos, seguros y otros componentes.</p>
                </div>
              </div>
              <div className="guided-grid">
                <Field label="Saldo de capital (COP)" hint="Busca saldo de capital, capital pendiente o un concepto equivalente; no uses automáticamente el total a pagar.">
                  <input className="field-control" type="number" min="0" inputMode="numeric" value={form.principalBalance} onChange={(event) => update("principalBalance", event.target.value)} />
                </Field>
                <Field label="Pago, cuota o canon total más reciente (COP)" hint="Opcional. Es contexto; no sustituye la cuota financiera modelada.">
                  <input className="field-control" type="number" min="0" inputMode="numeric" value={form.currentTotalPayment} onChange={(event) => update("currentTotalPayment", event.target.value)} />
                </Field>
                <Field label="Seguros o costos mensuales identificables (COP)" hint="Opcional. Déjalo vacío si el extracto no los separa claramente.">
                  <input className="field-control" type="number" min="0" inputMode="numeric" value={form.monthlyInsuranceOrCosts} onChange={(event) => update("monthlyInsuranceOrCosts", event.target.value)} />
                </Field>
              </div>
            </section>

            <section className="guided-section" aria-labelledby="guided-model-data-title">
              <div className="guided-section-heading">
                <span>3</span>
                <div>
                  <h3 id="guided-model-data-title">Si aparecen claramente, añade los datos que habilitan matemática</h3>
                  <p>No son necesarios para construir la fotografía C1.</p>
                </div>
              </div>
              <div className="guided-grid">
                <Field label="Tasa efectiva anual — EA (%)" hint="Solo transcríbela aquí si el extracto la identifica inequívocamente como efectiva anual.">
                  <input className="field-control" type="number" min="0" max="99.9999" step="0.0001" inputMode="decimal" value={form.annualEffectiveRatePercent} onChange={(event) => update("annualEffectiveRatePercent", event.target.value)} />
                </Field>
                <Field label="Cuotas restantes">
                  <input className="field-control" type="number" min="1" step="1" inputMode="numeric" value={form.remainingInstallments} onChange={(event) => update("remainingInstallments", event.target.value)} />
                </Field>
              </div>
              <fieldset className="field-group">
                <legend className="field-label">Sistema de amortización</legend>
                <div className="choice-list">
                  <label className="radio-card"><input type="radio" name="guided-system" checked={form.amortizationSystem === "constant_payment_pesos"} onChange={() => update("amortizationSystem", "constant_payment_pesos")} /><span>Cuota constante en pesos</span></label>
                  <label className="radio-card"><input type="radio" name="guided-system" checked={form.amortizationSystem === "other"} onChange={() => update("amortizationSystem", "other")} /><span>Otro sistema</span></label>
                  <label className="radio-card"><input type="radio" name="guided-system" checked={form.amortizationSystem === "unknown"} onChange={() => update("amortizationSystem", "unknown")} /><span>No estoy seguro</span></label>
                </div>
              </fieldset>
            </section>

            <div className="guided-actions">
              <button className="button button-primary" type="button" onClick={buildSnapshot}>Organizar mi situación</button>
              <label className="button button-secondary guided-change-file" htmlFor="statement-file">Cambiar extracto local</label>
            </div>
          </section>

          {submitted ? (
            <section className="guided-results" aria-live="polite">
              {assessment.snapshotReadiness === "incomplete" || !snapshot ? (
                <section className="surface form-card" aria-labelledby="guided-incomplete-title">
                  <p className="eyebrow">Falta información material</p>
                  <h2 id="guided-incomplete-title" ref={resultHeadingRef} tabIndex={-1}>Todavía falta información para construir una fotografía completa.</h2>
                  <p className="section-copy">Corrige únicamente estos campos de la fotografía base; no necesitas completar todavía la parte matemática.</p>
                  <ul className="guided-issue-list">
                    {snapshotIssues.map((item) => <li key={`${item.code}-${item.field}`}>{issueCopy[item.code] ?? "Revisa este dato material."}</li>)}
                  </ul>
                </section>
              ) : (
                <>
                  <section className="surface guided-result-heading" aria-labelledby="guided-ready-title">
                    <p className="eyebrow">Mi Situación · C1</p>
                    <h2 id="guided-ready-title" ref={resultHeadingRef} tabIndex={-1}>Ya organizamos los datos base de tu situación.</h2>
                    <p>Datos transcritos por ti desde un extracto local. Casa con Criterio no leyó ni verificó el archivo.</p>
                    <p className="field-hint">Referencia declarada · corte {snapshot.cutoffDate} · {snapshot.statementAgeDays} días respecto a esta evaluación. No asignamos un umbral universal de “vigente” o “desactualizado”.</p>
                  </section>

                  <MortgageTwin data={mortgageTwinData(snapshot)} mode="declared" showOpportunities={false} />

                  {(snapshot.institutionName || snapshot.currentTotalPayment !== undefined) ? (
                    <section className="surface guided-context" aria-labelledby="guided-context-title">
                      <p className="eyebrow">Contexto transcrito</p>
                      <h2 id="guided-context-title">Datos útiles que no cambian por sí solos la precisión</h2>
                      <dl className="guided-context-grid">
                        {snapshot.institutionName ? <div><dt>Entidad</dt><dd>{snapshot.institutionName}</dd></div> : null}
                        {snapshot.currentTotalPayment !== undefined ? <div><dt>Pago total reciente</dt><dd>{cop.format(snapshot.currentTotalPayment)}</dd></div> : null}
                      </dl>
                    </section>
                  ) : null}

                  {contextIssues.length > 0 ? (
                    <section className="surface-warning" aria-labelledby="guided-context-issues-title">
                      <strong id="guided-context-issues-title">Hay un dato opcional que conviene revisar.</strong>
                      <ul className="guided-issue-list">{contextIssues.map((item) => <li key={`${item.code}-${item.field}`}>{issueCopy[item.code]}</li>)}</ul>
                      <p>Esto no invalida Mi Situación ni bloquea un modelo compatible.</p>
                    </section>
                  ) : null}

                  {assessment.modelReadiness === "ready_for_constant_payment_pesos_model" ? (
                    <section className="surface form-card guided-model" aria-labelledby="guided-model-title">
                      <p className="eyebrow">Siguiente nivel · C2 opcional</p>
                      <h2 id="guided-model-title">También tenemos los datos para probar un escenario de prepago.</h2>
                      <p className="section-copy">La fotografía base sigue siendo C1. Si defines un abono adicional, el resultado matemático será C2 y conservará que los datos base fueron transcritos por ti.</p>
                      <Field label="Abono adicional mensual que quieres probar (COP)" hint="Es dinero que aportarías tú; no es una recomendación ni valor generado por Casa con Criterio.">
                        <input
                          className="field-control"
                          type="number"
                          min="1"
                          step="10000"
                          inputMode="numeric"
                          value={monthlyExtra}
                          onChange={(event) => {
                            setMonthlyExtra(event.target.value);
                            setModelResult(null);
                            setModelError(null);
                            setShowOpportunities(false);
                          }}
                        />
                      </Field>
                      {modelError ? <p className="field-error" role="alert">{modelError}</p> : null}
                      <button className="button button-primary" type="button" onClick={modelPrepayment}>Modelar este abono</button>
                    </section>
                  ) : assessment.modelReadiness === "not_applicable" ? (
                    <section className="surface-warning" role="status">
                      <strong>{snapshot.productType === "housing_leasing" ? "Esta situación corresponde a leasing habitacional." : "No vamos a aplicar una fórmula de cuota constante en pesos a este crédito UVR."}</strong>
                      <p>{snapshot.productType === "housing_leasing" ? "No aplicamos automáticamente el modelo de prepago de crédito hipotecario. La estructura contractual y la opción de compra deben conservarse separadas." : "Mi Situación C1 sí es útil. Un escenario UVR exige una trayectoria explícita y un modelo compatible; esta versión no lo inventa desde el extracto."}</p>
                    </section>
                  ) : (
                    <section className="surface guided-model-missing" aria-labelledby="guided-model-missing-title">
                      <p className="eyebrow">Modelo opcional</p>
                      <h2 id="guided-model-missing-title">Mi Situación ya está lista; para modelar un prepago faltan datos.</h2>
                      <ul className="guided-issue-list">{modelIssues.map((item) => <li key={`${item.code}-${item.field}`}>{issueCopy[item.code] ?? "Este dato todavía no habilita el modelo."}</li>)}</ul>
                      <p className="field-hint">Completa esos campos arriba solo si aparecen claramente en tu extracto.</p>
                    </section>
                  )}

                  {modelResult ? (
                    <section className="surface guided-c2-result" aria-labelledby="guided-c2-title">
                      <div className="section-header">
                        <div>
                          <p className="eyebrow">Escenario de prepago · C2</p>
                          <h2 id="guided-c2-title">Con {cop.format(Number(monthlyExtra))} adicionales al mes, el modelo termina {modelResult.termReductionMonths} cuotas antes.</h2>
                          <p className="section-copy">Datos base C1 transcritos por ti + motor determinístico C2. No es verificación contractual, recomendación bancaria ni ahorro garantizado.</p>
                        </div>
                        <PrecisionBadge level="C2" />
                      </div>
                      <dl className="guided-context-grid">
                        <div><dt>Cuota financiera modelada</dt><dd>{cop.format(modelResult.baseline.contractualPayment)}</dd></div>
                        <div><dt>Plazo base</dt><dd>{modelResult.baseline.payoffMonth} cuotas</dd></div>
                        <div><dt>Plazo del escenario</dt><dd>{modelResult.scenario.payoffMonth} cuotas</dd></div>
                        <div><dt>Reducción modelada</dt><dd>{modelResult.termReductionMonths} cuotas</dd></div>
                        <div><dt>Capital adicional aportado por ti</dt><dd>{cop.format(modelResult.userExtraPrincipal)}</dd></div>
                        <div><dt>Interés nominal futuro evitado por el modelo</dt><dd>{cop.format(modelResult.interestAvoided)}</dd></div>
                      </dl>
                    </section>
                  ) : null}

                  <section className="surface guided-next-decisions" aria-labelledby="guided-next-decisions-title">
                    <p className="eyebrow">Siguiente decisión</p>
                    <h2 id="guided-next-decisions-title">Entiende primero qué merece atención y después compara la opción adecuada.</h2>
                    <p className="section-copy">
                      Radar Vivienda usará Mi Situación como fuente C1. El escenario mensual heredado puede conservar C2 solo en reducción de plazo. Si construyes la comparación con un mismo abono único, reducción de plazo y reducción de cuota podrán ganar C2 por separado; las demás opciones seguirán en C1 hasta que tengan soporte propio.
                    </p>
                    <button className="button button-primary" type="button" onClick={openOpportunities} aria-expanded={showOpportunities} aria-controls="guided-opportunity-router">
                      Ver mi situación y oportunidades
                    </button>
                  </section>

                  {showOpportunities ? (
                    <div id="guided-opportunity-router" ref={opportunityRef} tabIndex={-1}>
                      <OpportunityWorkspace
                        precision="C1"
                        initialProductType={snapshot.productType}
                        initialModality={snapshot.modality}
                        sourceLabel={`Mi Situación C1 · corte ${snapshot.cutoffDate}`}
                        {...(modelResult
                          ? { initialTermPrepaymentModel: { recurringExtraPrincipal: Number(monthlyExtra) } }
                          : {})}
                        {...(assessment.constantPaymentPesosModelInput
                          ? { prepaymentChoiceModelInput: assessment.constantPaymentPesosModelInput }
                          : {})}
                      />
                    </div>
                  ) : null}

                  <div className="guided-actions guided-result-actions">
                    <a className="button button-secondary" href="/revisar">Volver a mi análisis</a>
                    <a className="button button-secondary" href="/revisar-diferencia">Revisar una diferencia</a>
                  </div>
                </>
              )}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
