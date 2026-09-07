import type { CasePlanEvidenceItem, CasePlanEvidenceKind } from "@/domain/case-plan/planner";
import type { MortgageAuditExecutionBlueprint } from "@/domain/assisted-execution/mortgage-audit";

export type AssistedEvidenceDeclaration =
  | "not_declared"
  | "user_reports_available"
  | "user_reports_missing";

export type AssistedEvidenceInventoryStatus =
  | "not_started"
  | "in_progress"
  | "inventory_complete";

export type AssistedEvidencePreparationState =
  | "needs_classification"
  | "needs_collection"
  | "declared_ready_for_future_intake";

export type AssistedEvidenceDeclarationInput = {
  label: string;
  declaration: Exclude<AssistedEvidenceDeclaration, "not_declared">;
};

export type AssistedEvidenceReadinessItem = {
  label: string;
  kind: CasePlanEvidenceKind;
  declaration: AssistedEvidenceDeclaration;
  uploaded: false;
  persisted: false;
  verified: false;
};

export type AssistedEvidenceReadinessSummary = {
  totalItems: number;
  declaredItems: number;
  availableItems: number;
  missingItems: number;
  undeclaredItems: number;
  currentItems: number;
  currentMissingItems: number;
  currentUndeclaredItems: number;
  conditionalItems: number;
};

export type AssistedEvidenceReadiness = {
  mode: "local_preview";
  routeCode: "R7_RECLAMACION";
  serviceCode: "MORTGAGE_AUDIT_R7_V1";
  inventoryStatus: AssistedEvidenceInventoryStatus;
  preparationState: AssistedEvidencePreparationState;
  items: AssistedEvidenceReadinessItem[];
  summary: AssistedEvidenceReadinessSummary;
  nextAction: string;
  truthBoundary: {
    userDeclarationIsNotUpload: true;
    userDeclarationIsNotPersistence: true;
    userDeclarationIsNotVerification: true;
    inventoryDoesNotCreateCase: true;
    inventoryDoesNotRequestProfessionalReview: true;
  };
  notices: string[];
};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("es-CO");
}

function declarationMap(
  inputs: readonly AssistedEvidenceDeclarationInput[],
): Map<string, AssistedEvidenceDeclarationInput["declaration"]> {
  const map = new Map<string, AssistedEvidenceDeclarationInput["declaration"]>();
  for (const input of inputs) {
    const key = normalize(input.label);
    if (!key) continue;
    map.set(key, input.declaration);
  }
  return map;
}

function uniqueChecklist(items: readonly CasePlanEvidenceItem[]): CasePlanEvidenceItem[] {
  const seen = new Set<string>();
  const result: CasePlanEvidenceItem[] = [];

  for (const item of items) {
    const key = normalize(item.label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push({ ...item });
  }

  return result;
}

function inventoryStatus(summary: AssistedEvidenceReadinessSummary): AssistedEvidenceInventoryStatus {
  if (summary.declaredItems === 0) return "not_started";
  if (summary.undeclaredItems === 0) return "inventory_complete";
  return "in_progress";
}

function preparationState(summary: AssistedEvidenceReadinessSummary): AssistedEvidencePreparationState {
  if (summary.currentUndeclaredItems > 0) return "needs_classification";
  if (summary.currentMissingItems > 0) return "needs_collection";
  return "declared_ready_for_future_intake";
}

function nextActionFor(
  state: AssistedEvidencePreparationState,
  summary: AssistedEvidenceReadinessSummary,
): string {
  switch (state) {
    case "needs_classification":
      return `Indica si tienes o te falta cada soporte actual. Quedan ${summary.currentUndeclaredItems} por clasificar.`;
    case "needs_collection": {
      const article = summary.currentMissingItems === 1 ? "el" : "los";
      return `Reúne ${article} ${summary.currentMissingItems} soporte${summary.currentMissingItems === 1 ? "" : "s"} actual${summary.currentMissingItems === 1 ? "" : "es"} que declaraste como faltante${summary.currentMissingItems === 1 ? "" : "s"}.`;
    }
    case "declared_ready_for_future_intake":
      return "Declaraste disponibles los soportes actuales. Un futuro ingreso documental todavía deberá autorizar, cargar y verificar cada evidencia por separado.";
  }
}

export function buildAssistedEvidenceReadiness(
  blueprint: MortgageAuditExecutionBlueprint,
  declarations: readonly AssistedEvidenceDeclarationInput[] = [],
): AssistedEvidenceReadiness {
  const declarationByLabel = declarationMap(declarations);
  const checklist = uniqueChecklist(blueprint.casePlan.evidenceChecklist);
  const items = checklist.map((item): AssistedEvidenceReadinessItem => ({
    label: item.label,
    kind: item.kind,
    declaration: declarationByLabel.get(normalize(item.label)) ?? "not_declared",
    uploaded: false,
    persisted: false,
    verified: false,
  }));

  const currentItems = items.filter((item) => item.kind !== "conditional");
  const summary: AssistedEvidenceReadinessSummary = {
    totalItems: items.length,
    declaredItems: items.filter((item) => item.declaration !== "not_declared").length,
    availableItems: items.filter((item) => item.declaration === "user_reports_available").length,
    missingItems: items.filter((item) => item.declaration === "user_reports_missing").length,
    undeclaredItems: items.filter((item) => item.declaration === "not_declared").length,
    currentItems: currentItems.length,
    currentMissingItems: currentItems.filter((item) => item.declaration === "user_reports_missing").length,
    currentUndeclaredItems: currentItems.filter((item) => item.declaration === "not_declared").length,
    conditionalItems: items.filter((item) => item.kind === "conditional").length,
  };
  const state = preparationState(summary);

  return {
    mode: "local_preview",
    routeCode: blueprint.routeCode,
    serviceCode: blueprint.serviceCode,
    inventoryStatus: inventoryStatus(summary),
    preparationState: state,
    items,
    summary,
    nextAction: nextActionFor(state, summary),
    truthBoundary: {
      userDeclarationIsNotUpload: true,
      userDeclarationIsNotPersistence: true,
      userDeclarationIsNotVerification: true,
      inventoryDoesNotCreateCase: true,
      inventoryDoesNotRequestProfessionalReview: true,
    },
    notices: [
      "Marcar un soporte como disponible solo registra una declaración local del usuario en esta sesión.",
      "Casa con Criterio no recibe, conserva ni verifica ningún documento desde este inventario.",
      "Los soportes condicionales pueden depender de hechos posteriores y no bloquean la preparación actual mientras ese evento no exista.",
    ],
  };
}