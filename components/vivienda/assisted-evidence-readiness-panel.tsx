"use client";

import { useMemo, useState } from "react";
import { AssistedIntakeGatePanel } from "@/components/vivienda/assisted-intake-gate-panel";
import { buildMortgageAuditBlueprintForGovernedRoute } from "@/domain/assisted-execution/mortgage-audit";
import {
  buildAssistedEvidenceReadiness,
  type AssistedEvidenceDeclarationInput,
} from "@/domain/assisted-execution/evidence-readiness";
import { buildPreviewAssistedIntakeGate } from "@/domain/assisted-execution/intake-gate";
import type { OpportunityRoute } from "@/domain/opportunity/router";

const kindLabels = {
  known_required: "Requerido por esta opción",
  recommended: "Conviene tenerlo para esta revisión",
  conditional: "Solo si ese hecho o documento existe",
} as const;

const preparationLabels = {
  needs_classification: "Completa tu inventario local",
  needs_collection: "Te faltan soportes actuales",
  declared_ready_for_future_intake: "Soportes actuales declarados disponibles",
} as const;

export function AssistedEvidenceReadinessPanel({
  route,
  asOfDate,
}: {
  route: OpportunityRoute;
  asOfDate: string;
}) {
  const blueprint = useMemo(
    () => buildMortgageAuditBlueprintForGovernedRoute(route, asOfDate),
    [route, asOfDate],
  );
  const [declarations, setDeclarations] = useState<Record<string, AssistedEvidenceDeclarationInput["declaration"]>>({});
  const declarationInputs = Object.entries(declarations).map(([label, declaration]) => ({ label, declaration }));
  const readiness = buildAssistedEvidenceReadiness(blueprint, declarationInputs);
  const intakeGate = buildPreviewAssistedIntakeGate(readiness);

  function setDeclaration(label: string, declaration: AssistedEvidenceDeclarationInput["declaration"]) {
    setDeclarations((current) => ({ ...current, [label]: declaration }));
  }

  return (
    <>
      <section
        className="surface"
        style={{ marginTop: 22, padding: 20 }}
        aria-labelledby="assisted-evidence-readiness-title"
        data-assisted-evidence-readiness={readiness.routeCode}
        data-evidence-inventory-status={readiness.inventoryStatus}
        data-evidence-preparation-state={readiness.preparationState}
      >
        <div className="section-header">
          <div>
            <p className="eyebrow">Evidencia · inventario local</p>
            <h3 id="assisted-evidence-readiness-title">Prepara tus soportes sin cargarlos todavía.</h3>
            <p className="section-copy">
              Marca qué documentos tienes a mano y cuáles te faltan. Esta clasificación vive solo en esta sesión: no envía archivos, no guarda documentos y no verifica su contenido.
            </p>
          </div>
          <span className="status-chip">{preparationLabels[readiness.preparationState]}</span>
        </div>

        <div className="metric-grid" style={{ marginTop: 20 }} aria-label="Resumen del inventario local">
          <div><span className="metric-label">Disponibles según tú</span><strong>{readiness.summary.availableItems}</strong></div>
          <div><span className="metric-label">Te faltan</span><strong>{readiness.summary.missingItems}</strong></div>
          <div><span className="metric-label">Sin clasificar</span><strong>{readiness.summary.undeclaredItems}</strong></div>
          <div><span className="metric-label">Condicionales</span><strong>{readiness.summary.conditionalItems}</strong></div>
        </div>

        <div className="result-callout" style={{ marginTop: 18 }} role="status">
          <strong>Siguiente paso seguro</strong>
          <p className="section-copy">{readiness.nextAction}</p>
        </div>

        <div className="extraction-list" style={{ marginTop: 20 }} aria-label="Inventario local de soportes">
          {readiness.items.map((item, index) => (
            <article
              className="extraction-row"
              key={item.label}
              aria-label={`Soporte ${index + 1}: ${item.label}`}
              data-evidence-kind={item.kind}
              data-evidence-declaration={item.declaration}
            >
              <div>
                <strong>{item.label}</strong>
                <p className="field-hint">{kindLabels[item.kind]}</p>
                <p className="field-hint">
                  Tu marca no significa que el soporte esté cargado, conservado o revisado por Casa con Criterio.
                </p>
              </div>
              <div className="actions" style={{ flexWrap: "wrap" }}>
                <button
                  className="button button-secondary"
                  type="button"
                  aria-pressed={item.declaration === "user_reports_available"}
                  onClick={() => setDeclaration(item.label, "user_reports_available")}
                >
                  Lo tengo
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  aria-pressed={item.declaration === "user_reports_missing"}
                  onClick={() => setDeclaration(item.label, "user_reports_missing")}
                >
                  Me falta
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="surface-warning" style={{ marginTop: 20 }}>
          <strong>Esta preparación no sustituye el ingreso ni la verificación documental.</strong>
          <ul>
            {readiness.notices.map((notice) => <li key={notice}>{notice}</li>)}
          </ul>
        </div>

        {readiness.summary.declaredItems > 0 ? (
          <div className="actions" style={{ marginTop: 16 }}>
            <button className="button button-secondary" type="button" onClick={() => setDeclarations({})}>
              Reiniciar inventario local
            </button>
          </div>
        ) : null}
      </section>

      <AssistedIntakeGatePanel gate={intakeGate} />
    </>
  );
}
