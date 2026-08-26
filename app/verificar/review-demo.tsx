"use client";

import { useMemo, useState } from "react";
import { PrecisionBadge } from "@/components/vivienda/signature-components";

type FieldStatus =
  | "extracted_high_confidence"
  | "needs_confirmation"
  | "user_corrected"
  | "missing"
  | "conflict";

type Field = {
  key: string;
  label: string;
  value: string;
  status: FieldStatus;
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
    value: "No identificado",
    status: "missing",
    material: false,
    hint: "No aparece claramente en este ejemplo",
  },
];

const statusLabel: Record<FieldStatus, string> = {
  extracted_high_confidence: "Extraído",
  needs_confirmation: "Por confirmar",
  user_corrected: "Corregido por ti",
  missing: "No encontrado",
  conflict: "Conflicto",
};

export function DocumentReviewDemo() {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[]>(initialFields);
  const [confirmedKeys, setConfirmedKeys] = useState<Set<string>>(new Set());

  const materialFields = fields.filter((field) => field.material);
  const materialReady = useMemo(
    () =>
      selectedName !== null &&
      materialFields.every(
        (field) =>
          confirmedKeys.has(field.key) &&
          field.status !== "missing" &&
          field.status !== "conflict" &&
          field.value.trim().length > 0,
      ),
    [confirmedKeys, materialFields, selectedName],
  );

  function selectFile(file: File | undefined) {
    if (!file) return;
    setSelectedName(file.name);
    setFields(initialFields);
    setConfirmedKeys(new Set());
  }

  function updateValue(key: string, value: string) {
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
            <li>En producción, cada valor extraído deberá poder confirmarse o corregirse antes de afectar un cálculo.</li>
          </ul>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="statement-file">Selecciona un extracto para probar la experiencia</label>
          <span className="field-hint" id="statement-file-hint">PDF, JPG o PNG. En este prototipo el archivo permanece en tu navegador y no se procesa.</span>
          <input
            className="field-control"
            id="statement-file"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            aria-describedby="statement-file-hint"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
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
            <PrecisionBadge level={materialReady ? "C3" : "C2"} />
          </div>

          <div className="document-file-chip" aria-label="Archivo local seleccionado">
            <strong>Archivo local:</strong> <span>{selectedName}</span>
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
                      {field.material ? <span className="material-chip">Material</span> : null}
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

          {materialReady ? (
            <div className="result-callout" role="status" aria-live="polite">
              <strong>Los campos materiales de esta demostración están confirmados.</strong>
              <p className="section-copy">En un flujo productivo todavía aplicaríamos reglas de reconciliación contra el documento antes de conceder C3. Aquí mostramos el estado únicamente para validar la UX.</p>
            </div>
          ) : (
            <div className="surface-warning" role="status">
              <strong>Aún no es C3.</strong>
              <p>Confirma todos los campos materiales. Un campo faltante o en conflicto bloquearía la promoción incluso si el resto de la extracción pareciera correcta.</p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
