import type { DecisionActionProfile } from "@/domain/decision-object/action-profile";
import {
  createDecisionBrief,
  type DecisionObject,
} from "@/domain/decision-object/evaluator";

const statusLabels = {
  eligible_now: "Se puede activar ahora",
  candidate: "Vale la pena evaluar",
  seasonal_wait: "Depende de una ventana",
  not_recommended: "No recomendado",
  legal_review: "Revisión profesional necesaria",
} as const;

const selfServiceLabels = {
  available: "Autogestión disponible para preparar/ejecutar la instrucción soportada.",
  preparation_only: "Puedes preparar la ruta; el resultado o actuación final depende de terceros o revisión adicional.",
  not_appropriate: "No es apropiada como autogestión ordinaria con los hechos actuales.",
} as const;

const assistedLabels = {
  mortgage_audit_preview: "Auditoría Hipotecaria asistida: blueprint de preview disponible.",
  not_productized: "No existe un servicio asistido productizado para esta ruta en esta preview.",
} as const;

function effortSummary(profile: DecisionActionProfile): string {
  const parts = [
    `${profile.effort.userTaskCount} tarea${profile.effort.userTaskCount === 1 ? "" : "s"} del usuario`,
    `${profile.effort.evidenceItemCount} evidencia${profile.effort.evidenceItemCount === 1 ? "" : "s"}`,
  ];

  if (profile.effort.professionalTaskCount > 0) {
    parts.push(`${profile.effort.professionalTaskCount} paso${profile.effort.professionalTaskCount === 1 ? "" : "s"} profesional${profile.effort.professionalTaskCount === 1 ? "" : "es"}`);
  }
  if (profile.effort.thirdPartyTaskCount > 0) {
    parts.push(`${profile.effort.thirdPartyTaskCount} paso${profile.effort.thirdPartyTaskCount === 1 ? "" : "s"} de banco/tercero`);
  }
  if (profile.effort.externalTriggerCount > 0) {
    parts.push("depende de un evento externo todavía no acreditado");
  }

  return parts.join(" · ");
}

function costSummary(profile: DecisionActionProfile): string {
  const parts: string[] = [];

  if (profile.cost.userCapitalRequirement === "required_for_execution") {
    parts.push("el capital adicional lo aporta el usuario y no es una tarifa");
  }

  if (profile.cost.assistedServicePricing === "not_quoted_preview") {
    parts.push("servicio asistido sin precio final cotizado en esta preview");
  } else if (profile.cost.assistedServicePricing === "not_available_in_preview") {
    parts.push("servicio asistido no productizado ni cotizado aquí");
  } else {
    parts.push("no se modela una tarifa asistida para esta ruta");
  }

  parts.push("costos externos no modelados");
  return parts.join(" · ");
}

export function DecisionBriefPanel({
  decision,
  actionProfiles = [],
}: {
  decision: DecisionObject;
  actionProfiles?: DecisionActionProfile[];
}) {
  const brief = createDecisionBrief(decision);
  const governing = decision.governingRouteCode
    ? decision.options.find((option) => option.routeCode === decision.governingRouteCode) ?? null
    : null;
  const actionProfileByRoute = new Map(actionProfiles.map((profile) => [profile.routeCode, profile]));

  return (
    <section
      className="surface form-card"
      style={{ marginTop: 30 }}
      aria-labelledby="decision-brief-title"
      aria-live="polite"
      data-decision-state={decision.state}
    >
      <div className="section-header">
        <div>
          <p className="eyebrow">Mi Decisión · vista previa local</p>
          <h3 id="decision-brief-title">{brief.statusLabel}</h3>
          <p className="section-copy">{brief.summary}</p>
        </div>
        <div className="actions" aria-label="Estado de Mi Decisión">
          {decision.decisionPrecision ? (
            <span className="status-chip">{decision.decisionPrecision} · ruta que gobierna</span>
          ) : null}
          {decision.requiresProfessionalReview ? (
            <span className="material-chip">Revisión profesional</span>
          ) : null}
        </div>
      </div>

      {governing ? (
        <div className="result-callout" style={{ marginTop: 18 }}>
          <strong>Qué gobierna el siguiente paso</strong>
          <p className="section-copy">
            {governing.title} · {statusLabels[governing.status]} · precisión {governing.precision}.
          </p>
          {brief.nextAction ? <p className="section-copy">{brief.nextAction}</p> : null}
        </div>
      ) : null}

      {decision.options.length > 0 ? (
        <div style={{ marginTop: 20 }}>
          <strong>Compara qué implica cada opción</strong>
          <p className="field-hint" style={{ marginTop: 6 }}>
            Separamos el efecto esperado, el trabajo visible, la forma de ejecución y los costos que realmente conocemos. No usamos una puntuación subjetiva de “facilidad”.
          </p>
          <div className="extraction-list" style={{ marginTop: 12 }}>
            {decision.options.map((option) => {
              const profile = actionProfileByRoute.get(option.routeCode);
              return (
                <article
                  className="extraction-row"
                  key={option.routeCode}
                  data-decision-option={option.routeCode}
                  data-decision-action-profile={profile ? option.routeCode : undefined}
                >
                  <div>
                    <strong>{option.title}</strong>
                    <p className="field-hint">
                      {statusLabels[option.status]} · precisión {option.precision}
                      {decision.selectedRouteCode === option.routeCode ? " · preferencia actual" : ""}
                      {decision.governingRouteCode === option.routeCode ? " · gobierna el siguiente paso" : ""}
                    </p>
                  </div>

                  {profile ? (
                    <div className="extraction-actions" style={{ alignItems: "stretch" }}>
                      <div>
                        <strong>Efecto esperado</strong>
                        <p className="section-copy">{profile.effectLabel}</p>
                      </div>
                      <div>
                        <strong>Esfuerzo visible del plan</strong>
                        <p className="section-copy">{effortSummary(profile)}.</p>
                      </div>
                      <div>
                        <strong>Cómo puede ejecutarse</strong>
                        <p className="section-copy">{selfServiceLabels[profile.availability.selfService]}</p>
                        <p className="field-hint">{assistedLabels[profile.availability.assisted]}</p>
                        {profile.availability.professionalReview === "required" ? (
                          <p className="field-hint">Esta ruta exige revisión profesional antes de la actuación que la requiera.</p>
                        ) : null}
                      </div>
                      <div>
                        <strong>Costo y precio conocidos</strong>
                        <p className="section-copy">{costSummary(profile)}.</p>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {brief.verificationNeeds.length > 0 ? (
        <div className="surface-warning" style={{ marginTop: 18 }}>
          <strong>Qué falta verificar o resolver</strong>
          <ul>
            {brief.verificationNeeds.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}

      {decision.warnings.length > 0 ? (
        <div style={{ marginTop: 18 }}>
          <strong>Advertencias de esta decisión</strong>
          <ul>
            {decision.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      ) : null}

      <details style={{ marginTop: 18 }}>
        <summary>Qué significa —y qué no significa— esta vista</summary>
        <ul>
          {brief.disclosures.map((disclosure) => <li key={disclosure}>{disclosure}</li>)}
          {actionProfiles.flatMap((profile) => profile.disclosures).filter((disclosure, index, list) => list.indexOf(disclosure) === index).map((disclosure) => (
            <li key={disclosure}>{disclosure}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}