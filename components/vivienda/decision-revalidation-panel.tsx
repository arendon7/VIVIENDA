"use client";

import type {
  DecisionRevalidationReason,
  DecisionRevalidationResult,
} from "@/domain/decision-object/revalidation";

const reasonLabels: Record<DecisionRevalidationReason, string> = {
  selected_route_removed: "La opción que habías elegido ya no aparece con los datos actuales.",
  governing_route_changed: "Cambió la ruta que debe gobernar el siguiente paso.",
  precision_changed: "Cambió el nivel de precisión de la ruta que gobierna la decisión.",
  status_changed: "Cambió el estado de elegibilidad o revisión de la ruta.",
  professional_review_changed: "Cambió la necesidad de revisión profesional.",
  blockers_changed: "Cambió lo que bloquea o condiciona esta ruta.",
  required_evidence_changed: "Cambió la evidencia que conviene reunir antes de continuar.",
  next_action_changed: "Cambió el siguiente paso recomendado para esta ruta.",
  caveat_changed: "Cambió una limitación relevante de la ruta.",
};

export function DecisionRevalidationPanel({
  revalidation,
  onAcceptCurrentBasis,
  onChooseAnotherRoute,
}: {
  revalidation: DecisionRevalidationResult;
  onAcceptCurrentBasis: () => void;
  onChooseAnotherRoute: () => void;
}) {
  if (revalidation.status === "current") return null;

  if (revalidation.status === "selection_invalid") {
    return (
      <section
        className="surface-warning"
        style={{ marginTop: 18 }}
        aria-live="polite"
        data-decision-revalidation="selection_invalid"
      >
        <strong>Tu elección anterior ya no puede sostenerse con los datos actuales.</strong>
        <p>
          La ruta que habías marcado dejó de estar disponible. No vamos a conservarla ni abrir un plan basado en una opción que ya no existe.
        </p>
        <div className="actions" style={{ marginTop: 12 }}>
          <button className="button button-primary" type="button" onClick={onChooseAnotherRoute}>
            Volver a revisar opciones
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="surface-warning"
      style={{ marginTop: 18 }}
      aria-live="polite"
      data-decision-revalidation="review_required"
    >
      <strong>Tu decisión necesita una nueva revisión porque cambió su fundamento.</strong>
      <p>
        Conservamos tu preferencia como contexto, pero no permitimos continuar al plan hasta que revises cómo cambiaron los datos que gobiernan esta decisión.
      </p>
      <ul>
        {revalidation.reasons.map((reason) => (
          <li key={reason}>{reasonLabels[reason]}</li>
        ))}
      </ul>
      <div className="actions" style={{ marginTop: 12 }}>
        <button className="button button-primary" type="button" onClick={onAcceptCurrentBasis}>
          Revisé los cambios · usar fundamento actual
        </button>
        <button className="button button-secondary" type="button" onClick={onChooseAnotherRoute}>
          Elegir otra ruta
        </button>
      </div>
    </section>
  );
}
