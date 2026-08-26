"use client";

import { useMemo, useState } from "react";
import { MortgageTwin } from "@/components/vivienda/mortgage-twin";
import { PrecisionBadge } from "@/components/vivienda/signature-components";
import {
  assessDocumentVerification,
  buildMortgageTwinData,
  type VerificationFieldStatus,
} from "@/domain/verification/reconciliation";

type Field = {
  key: string;
  label: string;
  value: string;
  status: VerificationFieldStatus;
  material: boolean;
  hint: string;
};

const initialFields: Field[] = [
  {
    key: "balance",
    label: "Saldo de capital",
    value: "180000000",
    status: "needs_confirmation",
    material: true,
    hint: "Ejemplo simulado · página 1",
  },
  {
    key: "cutoff",
    label: "Fecha de corte",
    value: "2026-08-15",
    status: "needs_confirmation",
    material: true,
    hint: "Ejemplo simulado · encabezado",
  },
  {
    key: "modality",
    label: "Modalidad",
    value: "Pesos",
    status: "needs_confirmation",
    material: true,
    hint: "Ejemplo simulado · condiciones",
  },
  {
    key: "rate",
    label: "Tasa",
    value: "12 % EA",
    status: "needs_confirmation",
    material: true,
    hint: "Ejemplo simulado · condiciones financieras",
  },
  {
    key: "remaining",
    label: "Cuotas restantes",
    value: "204",
    status: "needs_confirmation",
    material: true,
    hint: "Ejemplo simulado · plan",
  },
  {
    key: "system",
    label: "Sistema de amortización",
    value: "Cuota constante en pesos",
    status: "needs_confirmation",
    material: true,
    hint: "Ejemplo simulado · clasificación pendiente de confirmación",
  },
  {
    key: "insurance",
    label: "Seguros/costos en la cuota",
    value: "",
    status: "missing",
    material: false,
    hint: "No aparece claramente en este ejemplo",
  },
];

const statusLabel: Record<VerificationFieldStatus, string> = {
  extracted_high_confidence: "Extraído",
  needs_confirmation: "Por confirmar",
  user_corrected: "Corregido por ti",
  missing: "No encontrado",
  conflict: "Conflicto",
};

const acceptedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const maxFileBytes = 15 * 1024 * 1024;

export function DocumentReviewDemo() {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[]>(initialFields);
  const [confirmedKeys, setConfirmedKeys] = useState<Set<string>>(new Set());
  const [fileError, setFileError] = useState<string | null>(null);
  const [showTwin, setShowTwin] = useState(false);

  const verificationFields = useMemo(
    () =>
      fields.map((field) => ({
        key: field.key,
        value: field.value,
        material: field.material,
        status: field.status,
        confirmed: confirmedKeys.has(field.key),
      })),
    [confirmedKeys, fields],
  );

  const assessment = useMemo(
    () =>
      assessDocumentVerification({
        documentSelected: selectedName !== null,
        evidenceMode: "simulated",
        fields: verificationFields,
      }),
    [selectedName, verificationFields],
  );

  const twinData = useMemo(
    () => (assessment.reconciliationComplete ? buildMortgageTwinData(verificationFields) : null),
    [assessment.reconciliationComplete, verificationFields],
  );

  function selectFile(file: File | undefined) {
    setFileError(null);
    setShowTwin(false);

    if (!file) {
      setSelectedName(null);
      return;
    }

    if (!acceptedTypes.has(file.type)) {
      setSelectedName(null);
      setFileError("Usa un archivo PDF, JPG o PNG.");
      return;
    }

    if (file.size > maxFileBytes) {
      setSelectedName(null);
      setFileError("El archivo supera 15 MB. Usa una versión más liviana para esta etapa.");
      return;
    }

    setSelectedName(file.name);
    setFields(initialFields);
    setConfirmedKeys(new Set());
  }

  function updateValue(key: string, value: string) {
    setShowTwin(false);
    setFields((current) =>
      current.map((field) =>
        field.key === key
          ? { ...field, value, status: "user_corrected" }
          : field,
      ),
    );
    setConfirmedKeys((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }

  function toggleConfirm(key: string) {
    setShowTwin(false);
    setConfirmedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div>
      <section className="surface form-card" aria-labelledby="verify-title">
        <p className="eyebrow">Verificar con documento</p>
        <h1 id="verify-title" style={{ fontSize: "clamp(32px, 6vw, 46px)" }}>
          Mejora la precisión sin entregar tus claves bancarias.
        </h1>
        <p className="section-copy">
          Para esta etapa sirve un extracto reciente del crédito hipotecario o leasing habitacional. Queremos confirmar saldo, fecha de corte, modalidad, tasa, plazo y sistema cuando estén disponibles.
        </p>

        <div className="privacy-panel">
          <strong>Antes de seleccionar un archivo</strong>
          <ul>
            <li>Nunca pedimos contraseña, token ni clave bancaria.</li>
            <li>Este prototipo no envía el documento a un proveedor OCR ni lo persiste.</li>
            <li>Los valores que verás abajo son una demostración de la experiencia de revisión, no una extracción real de tu archivo.</li>
            <li>C3 solo podrá existir cuando los valores provengan realmente del documento y superen reconciliación.</li>
          </ul>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="statement-file">Selecciona un extracto para probar la experiencia</label>
          <span className="field-hint" id="statement-file-hint">PDF, JPG o PNG, máximo 15 MB. En este prototipo el archivo permanece en tu navegador y no se procesa.</span>
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

      {selectedName ? (
        <section className="surface form-card" style={{ marginTop: 16 }} aria-labelledby="review-title">
          <div className="section-header">
            <div>
              <p className="eyebrow">Demostración · extracción simulada</p>
              <h2 id="review-title">Revisa campo por campo antes de usarlo.</h2>
              <p className="section-copy">Archivo seleccionado localmente. Su nombre no debe enviarse a analítica genérica.</p>
            </div>
            <PrecisionBadge level={assessment.level} />
          </div>

          <div className="document-file-chip" aria-label="Archivo local seleccionado">
            <strong>Archivo local:</strong> <span>{selectedName}</span>
          </div>

          <div className="verification-progress" role="status" aria-live="polite">
            <strong>{assessment.confirmedMaterialCount} de {assessment.totalMaterialCount} campos materiales confirmados</strong>
            <span> · precisión actual {assessment.level}</span>
          </div>

          <div className="extraction-list">
            {fields.map((field) => {
              const confirmed = confirmedKeys.has(field.key);
              const confirmDisabled = field.status === "missing" || field.status === "conflict" || field.value.trim().length === 0;

              return (
                <article className="extraction-row" key={field.key}>
                  <div>
                    <div className="extraction-heading">
                      <strong>{field.label}</strong>
                      <span className={`status-chip status-${field.status}`}>{statusLabel[field.status]}</span>
                      {field.material ? <span className="material-chip">Material</span> : <span className="optional-chip">No material</span>}
                    </div>
                    <p className="field-hint">{field.hint}</p>
                  </div>

                  <div className="extraction-actions">
                    <label className="sr-only" htmlFor={`field-${field.key}`}>Editar {field.label}</label>
                    <input
                      className="field-control"
                      id={`field-${field.key}`}
                      value={field.value}
                      onChange={(event) => updateValue(field.key, event.target.value)}
                    />
                    <label className={`confirm-control ${confirmDisabled ? "confirm-disabled" : ""}`}>
                      <input
                        type="checkbox"
                        checked={confirmed}
                        disabled={confirmDisabled}
                        onChange={() => toggleConfirm(field.key)}
                      />
                      <span>Confirmo este valor</span>
                    </label>
                  </div>
                </article>
              );
            })}
          </div>

          {assessment.reconciliationComplete ? (
            <div className="result-callout" role="status" aria-live="polite">
              <strong>La reconciliación de la demostración está completa, pero sigue siendo C2.</strong>
              <p className="section-copy">Los seis campos materiales fueron confirmados. El único bloqueo restante es de provenance: estos valores son simulados y no fueron extraídos del archivo seleccionado.</p>
              <button className="button button-primary" style={{ marginTop: 18 }} type="button" onClick={() => setShowTwin(true)}>
                Previsualizar Mortgage Twin
              </button>
            </div>
          ) : (
            <div className="surface-warning" role="status">
              <strong>Aún no está reconciliado.</strong>
              <p>Confirma todos los campos materiales. Un campo faltante, en conflicto o sin confirmación bloquearía C3 incluso con OCR de alta confianza.</p>
            </div>
          )}
        </section>
      ) : null}

      {showTwin && twinData ? (
        <div style={{ marginTop: 20 }} aria-live="polite">
          <MortgageTwin data={twinData} mode="preview" documentName={selectedName ?? undefined} />
        </div>
      ) : null}
    </div>
  );
}
