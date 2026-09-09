import type { DevProviderCapacityPreflightDecision } from "./provider-capacity-preflight";

export type ProviderCapacityRecoveryStrategy =
  | "defer_provisioning"
  | "pause_existing_project"
  | "alternate_organization"
  | "plan_upgrade";

export type RecoveryApprovalStatus = "missing" | "proposed" | "approved";
export type RecoveryVerificationStatus = "missing" | "configured_unverified" | "verified";
export type ExistingProjectPauseSafety =
  | "unknown"
  | "unsafe_to_pause"
  | "verified_safe_to_pause";
export type AlternateOrganizationCapacity = "unknown" | "exhausted" | "available";

export type ProviderCapacityRecoveryFacts = {
  candidateProjectId?: string | null;
  candidateProjectPauseSafety?: ExistingProjectPauseSafety;
  candidateImpactReview?: RecoveryApprovalStatus;
  candidateRestorePath?: RecoveryVerificationStatus;
  pauseApproval?: RecoveryApprovalStatus;

  alternateOrganizationId?: string | null;
  alternateOrganizationSelection?: RecoveryApprovalStatus;
  alternateOrganizationCapacity?: AlternateOrganizationCapacity;
  alternateOrganizationCostQuote?: RecoveryVerificationStatus;
  alternateOrganizationCostApproval?: RecoveryApprovalStatus;

  planUpgradeQuote?: RecoveryVerificationStatus;
  billingOwnerApproval?: RecoveryApprovalStatus;
  planUpgradeApproval?: RecoveryApprovalStatus;
};

export type ProviderCapacityRecoveryDecisionState =
  | "recovery_not_applicable"
  | "awaiting_explicit_strategy"
  | "deferred"
  | "recovery_blocked"
  | "authorized_for_recovery_mutation"
  | "ready_for_capacity_recheck";

export type ProviderCapacityRecoveryBlockerCode =
  | "capacity_exhaustion_not_verified"
  | "explicit_strategy_required"
  | "candidate_project_required"
  | "candidate_project_not_verified_safe_to_pause"
  | "candidate_impact_review_missing"
  | "candidate_restore_path_unverified"
  | "pause_approval_missing"
  | "alternate_organization_required"
  | "alternate_organization_selection_missing"
  | "alternate_organization_capacity_unavailable"
  | "alternate_organization_cost_quote_unverified"
  | "alternate_organization_cost_approval_missing"
  | "plan_upgrade_quote_unverified"
  | "billing_owner_approval_missing"
  | "plan_upgrade_approval_missing";

export type ProviderCapacityRecoveryBlocker = {
  code: ProviderCapacityRecoveryBlockerCode;
  message: string;
};

export type ProviderCapacityRecoveryDecision = {
  state: ProviderCapacityRecoveryDecisionState;
  selectedStrategy: ProviderCapacityRecoveryStrategy | null;
  externalMutationMayExecute: boolean;
  capacityRecheckRequired: boolean;
  projectCreationMayExecute: false;
  blockers: ProviderCapacityRecoveryBlocker[];
};

const messages: Record<ProviderCapacityRecoveryBlockerCode, string> = {
  capacity_exhaustion_not_verified:
    "La recuperación de capacidad solo aplica después de que V0.23.15 haya confirmado capacity_exhausted con una observación vigente.",
  explicit_strategy_required:
    "No existe una estrategia de recuperación por defecto; debe elegirse explícitamente diferir, pausar un proyecto, usar otra organización o cambiar de plan.",
  candidate_project_required:
    "La estrategia de pausa requiere identificar explícitamente el proyecto candidato; nunca se selecciona por inferencia.",
  candidate_project_not_verified_safe_to_pause:
    "El proyecto candidato debe estar verificado como seguro de pausar; estado desconocido o evidencia insuficiente bloquean la mutación.",
  candidate_impact_review_missing:
    "El impacto operativo del proyecto candidato debe revisarse y aprobarse antes de una pausa.",
  candidate_restore_path_unverified:
    "Debe verificarse una ruta de restauración antes de pausar infraestructura existente.",
  pause_approval_missing:
    "La pausa requiere una aprobación explícita separada de la autorización para crear VIVIENDA DEV.",
  alternate_organization_required:
    "La alternativa de organización requiere un identificador de organización observado y seleccionado explícitamente.",
  alternate_organization_selection_missing:
    "La organización alternativa debe aprobarse explícitamente; no puede inferirse desde una membresía o proyecto existente.",
  alternate_organization_capacity_unavailable:
    "La organización alternativa debe mostrar capacidad disponible antes de pasar a un nuevo capacity preflight.",
  alternate_organization_cost_quote_unverified:
    "Debe existir una cotización vigente para crear el proyecto en la organización alternativa.",
  alternate_organization_cost_approval_missing:
    "El costo de la organización alternativa debe aprobarse explícitamente antes de usarla para provisioning.",
  plan_upgrade_quote_unverified:
    "Un cambio de plan exige una cotización vigente del proveedor antes de autorizar la mutación de billing.",
  billing_owner_approval_missing:
    "El responsable de billing debe aprobar explícitamente el cambio de plan.",
  plan_upgrade_approval_missing:
    "El upgrade de plan requiere aprobación explícita separada; nunca se ejecuta solo porque libere capacidad.",
};

function b(code: ProviderCapacityRecoveryBlockerCode): ProviderCapacityRecoveryBlocker {
  return { code, message: messages[code] };
}

function isApproved(value: RecoveryApprovalStatus | undefined): boolean {
  return value === "approved";
}

function isVerified(value: RecoveryVerificationStatus | undefined): boolean {
  return value === "verified";
}

export function evaluateProviderCapacityRecovery(
  capacity: DevProviderCapacityPreflightDecision,
  strategy: ProviderCapacityRecoveryStrategy | null = null,
  facts: ProviderCapacityRecoveryFacts = {},
): ProviderCapacityRecoveryDecision {
  if (capacity.state !== "capacity_exhausted") {
    return {
      state: "recovery_not_applicable",
      selectedStrategy: strategy,
      externalMutationMayExecute: false,
      capacityRecheckRequired: false,
      projectCreationMayExecute: false,
      blockers: [b("capacity_exhaustion_not_verified")],
    };
  }

  if (!strategy) {
    return {
      state: "awaiting_explicit_strategy",
      selectedStrategy: null,
      externalMutationMayExecute: false,
      capacityRecheckRequired: false,
      projectCreationMayExecute: false,
      blockers: [b("explicit_strategy_required")],
    };
  }

  if (strategy === "defer_provisioning") {
    return {
      state: "deferred",
      selectedStrategy: strategy,
      externalMutationMayExecute: false,
      capacityRecheckRequired: false,
      projectCreationMayExecute: false,
      blockers: [],
    };
  }

  const blockers: ProviderCapacityRecoveryBlocker[] = [];

  if (strategy === "pause_existing_project") {
    if (!facts.candidateProjectId?.trim()) blockers.push(b("candidate_project_required"));
    if (facts.candidateProjectPauseSafety !== "verified_safe_to_pause") {
      blockers.push(b("candidate_project_not_verified_safe_to_pause"));
    }
    if (!isApproved(facts.candidateImpactReview)) blockers.push(b("candidate_impact_review_missing"));
    if (!isVerified(facts.candidateRestorePath)) blockers.push(b("candidate_restore_path_unverified"));
    if (!isApproved(facts.pauseApproval)) blockers.push(b("pause_approval_missing"));

    return {
      state: blockers.length === 0 ? "authorized_for_recovery_mutation" : "recovery_blocked",
      selectedStrategy: strategy,
      externalMutationMayExecute: blockers.length === 0,
      capacityRecheckRequired: blockers.length === 0,
      projectCreationMayExecute: false,
      blockers,
    };
  }

  if (strategy === "alternate_organization") {
    if (!facts.alternateOrganizationId?.trim()) blockers.push(b("alternate_organization_required"));
    if (!isApproved(facts.alternateOrganizationSelection)) {
      blockers.push(b("alternate_organization_selection_missing"));
    }
    if (facts.alternateOrganizationCapacity !== "available") {
      blockers.push(b("alternate_organization_capacity_unavailable"));
    }
    if (!isVerified(facts.alternateOrganizationCostQuote)) {
      blockers.push(b("alternate_organization_cost_quote_unverified"));
    }
    if (!isApproved(facts.alternateOrganizationCostApproval)) {
      blockers.push(b("alternate_organization_cost_approval_missing"));
    }

    return {
      state: blockers.length === 0 ? "ready_for_capacity_recheck" : "recovery_blocked",
      selectedStrategy: strategy,
      externalMutationMayExecute: false,
      capacityRecheckRequired: blockers.length === 0,
      projectCreationMayExecute: false,
      blockers,
    };
  }

  if (!isVerified(facts.planUpgradeQuote)) blockers.push(b("plan_upgrade_quote_unverified"));
  if (!isApproved(facts.billingOwnerApproval)) blockers.push(b("billing_owner_approval_missing"));
  if (!isApproved(facts.planUpgradeApproval)) blockers.push(b("plan_upgrade_approval_missing"));

  return {
    state: blockers.length === 0 ? "authorized_for_recovery_mutation" : "recovery_blocked",
    selectedStrategy: strategy,
    externalMutationMayExecute: blockers.length === 0,
    capacityRecheckRequired: blockers.length === 0,
    projectCreationMayExecute: false,
    blockers,
  };
}
