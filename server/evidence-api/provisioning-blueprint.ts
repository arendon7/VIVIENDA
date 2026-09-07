import type { EvidenceRuntimeActivationDecision } from "./activation-preflight";

export type ProvisioningEnvironment = "development" | "staging" | "production";

export type ProvisioningPlanDecisionStatus = "undecided" | "defined" | "approved";

export type ProvisioningDecisionCode =
  | "dedicated_environment_projects"
  | "billing_owner_approved"
  | "primary_region_approved"
  | "secret_store_and_rotation_defined"
  | "identity_auth_strategy_approved"
  | "database_migration_strategy_approved"
  | "rollback_restore_strategy_approved"
  | "security_review_runbook_approved"
  | "private_storage_and_retention_approved"
  | "physical_deletion_operations_approved"
  | "rate_limit_backend_approved"
  | "audit_sink_and_redaction_approved"
  | "trusted_origins_approved"
  | "monitoring_and_alerting_approved"
  | "incident_owner_and_kill_switch_approved"
  | "real_case_creation_approved"
  | "data_authorization_approved"
  | "service_agreement_approved"
  | "progressive_cutover_approved"
  | "post_cutover_validation_approved";

export type ProvisioningPlanFacts = Partial<
  Record<ProvisioningDecisionCode, ProvisioningPlanDecisionStatus>
>;

export type ProvisioningDecision = {
  code: ProvisioningDecisionCode;
  status: ProvisioningPlanDecisionStatus;
  verificationCriterion: string;
};

export type ProvisioningBlueprintState =
  | "not_defined"
  | "partially_defined"
  | "approved_for_controlled_provisioning";

export type ProvisioningBlueprintDecision = {
  state: ProvisioningBlueprintState;
  provisioningMayBegin: boolean;
  approvedDecisionCount: number;
  totalDecisionCount: number;
  decisions: ProvisioningDecision[];
  blockers: ProvisioningDecision[];
};

export type ProvisioningEnvironmentPolicy = {
  environment: ProvisioningEnvironment;
  projectIsolation: "dedicated_project";
  dataPolicy: "synthetic_only" | "real_data_after_controlled_activation";
  secretsVisibility: "server_only";
  directManualProductionMutation: false;
  evidenceRuntimeDefault: "fail_closed";
};

export type ProvisioningPromotionEvidence = {
  blueprint: ProvisioningBlueprintDecision;
  sourceEnvironmentVerified: boolean;
  targetEnvironmentIsolationVerified: boolean;
  rollbackRehearsed: boolean;
  backupRestoreVerified: boolean;
  securityReviewComplete: boolean;
  costApprovalRecorded: boolean;
  incidentOwnerAssigned: boolean;
  killSwitchVerified: boolean;
  activation?: EvidenceRuntimeActivationDecision;
};

export type ProvisioningPromotionState =
  | "invalid_transition"
  | "blocked"
  | "ready_for_controlled_promotion";

export type ProvisioningPromotionBlockerCode =
  | "blueprint_not_approved"
  | "source_environment_not_verified"
  | "target_isolation_not_verified"
  | "rollback_not_rehearsed"
  | "backup_restore_not_verified"
  | "security_review_incomplete"
  | "production_cost_not_approved"
  | "production_incident_owner_missing"
  | "production_kill_switch_not_verified"
  | "runtime_activation_preflight_not_ready";

export type ProvisioningPromotionDecision = {
  from: ProvisioningEnvironment;
  to: ProvisioningEnvironment;
  state: ProvisioningPromotionState;
  promotionMayProceed: boolean;
  blockers: ProvisioningPromotionBlockerCode[];
};

const DECISION_DEFINITIONS: ReadonlyArray<
  Omit<ProvisioningDecision, "status">
> = [
  {
    code: "dedicated_environment_projects",
    verificationCriterion:
      "DEV, STAGING y PROD tienen proyectos dedicados a VIVIENDA y aislados entre sí; no comparten recursos de otros productos.",
  },
  {
    code: "billing_owner_approved",
    verificationCriterion:
      "Existe responsable explícito de costo, presupuesto y aprobación antes de crear o escalar recursos pagos.",
  },
  {
    code: "primary_region_approved",
    verificationCriterion:
      "La región primaria está decidida y documentada considerando latencia, continuidad, tratamiento de datos y costo.",
  },
  {
    code: "secret_store_and_rotation_defined",
    verificationCriterion:
      "Secrets se gestionan server-side, separados por entorno, con ownership y rotación definidos; nunca se almacenan en el repositorio ni se exponen al cliente.",
  },
  {
    code: "identity_auth_strategy_approved",
    verificationCriterion:
      "Auth y resolución server-side de identidad están definidos por entorno, incluyendo mapeo inmutable a subjectRef.",
  },
  {
    code: "database_migration_strategy_approved",
    verificationCriterion:
      "Las migraciones siguen DEV → STAGING → PROD, con verificación previa y sin cambios manuales no trazados en producción.",
  },
  {
    code: "rollback_restore_strategy_approved",
    verificationCriterion:
      "Existe runbook de rollback/restore compatible con las migraciones y una condición explícita para abortar el cutover.",
  },
  {
    code: "security_review_runbook_approved",
    verificationCriterion:
      "La revisión de RLS/policies/advisors/configuración de seguridad tiene owner, evidencia y criterio de bloqueo.",
  },
  {
    code: "private_storage_and_retention_approved",
    verificationCriterion:
      "Storage privado, clasificación, retención y minimización están definidos antes de aceptar evidencia real.",
  },
  {
    code: "physical_deletion_operations_approved",
    verificationCriterion:
      "El proceso de tombstone, eliminación física, reintentos y confirmación operativa está documentado y tiene owner.",
  },
  {
    code: "rate_limit_backend_approved",
    verificationCriterion:
      "El backend durable/compartido de rate limiting y su comportamiento fail-closed están definidos para STAGING y PROD.",
  },
  {
    code: "audit_sink_and_redaction_approved",
    verificationCriterion:
      "El sink de auditoría, redacción/minimización, retención y acceso operativo están definidos sin almacenar documentos o secretos innecesarios.",
  },
  {
    code: "trusted_origins_approved",
    verificationCriterion:
      "Los orígenes permitidos están enumerados por entorno y cualquier origen no autorizado falla cerrado.",
  },
  {
    code: "monitoring_and_alerting_approved",
    verificationCriterion:
      "Health, errores, saturación, fallos de Storage, rate limiting, auditoría y eliminación tienen señales y responsables definidos.",
  },
  {
    code: "incident_owner_and_kill_switch_approved",
    verificationCriterion:
      "Existe owner operativo y una ruta probada para volver inmediatamente al runtime fail-closed sin aceptar nuevos uploads.",
  },
  {
    code: "real_case_creation_approved",
    verificationCriterion:
      "El flujo de creación de Case real está definido antes de intake y no convierte automáticamente estado local/preview en expediente durable.",
  },
  {
    code: "data_authorization_approved",
    verificationCriterion:
      "La autorización por finalidad, versión, revocación y vigencia está definida para evidencia real.",
  },
  {
    code: "service_agreement_approved",
    verificationCriterion:
      "Cuando una ruta asistida lo requiere, el alcance del servicio se acepta explícitamente sin inferir poder, mandato o representación.",
  },
  {
    code: "progressive_cutover_approved",
    verificationCriterion:
      "El cutover se ejecuta por cohortes/control de feature, con criterios de entrada, pausa y rollback; no existe big-bang implícito.",
  },
  {
    code: "post_cutover_validation_approved",
    verificationCriterion:
      "Existe checklist posterior al cutover para verificar auth, ownership, persistencia, Storage, auditoría, rate limit, deletion y truth boundary.",
  },
];

export const PROVISIONING_ENVIRONMENT_POLICIES: Readonly<
  Record<ProvisioningEnvironment, ProvisioningEnvironmentPolicy>
> = {
  development: {
    environment: "development",
    projectIsolation: "dedicated_project",
    dataPolicy: "synthetic_only",
    secretsVisibility: "server_only",
    directManualProductionMutation: false,
    evidenceRuntimeDefault: "fail_closed",
  },
  staging: {
    environment: "staging",
    projectIsolation: "dedicated_project",
    dataPolicy: "synthetic_only",
    secretsVisibility: "server_only",
    directManualProductionMutation: false,
    evidenceRuntimeDefault: "fail_closed",
  },
  production: {
    environment: "production",
    projectIsolation: "dedicated_project",
    dataPolicy: "real_data_after_controlled_activation",
    secretsVisibility: "server_only",
    directManualProductionMutation: false,
    evidenceRuntimeDefault: "fail_closed",
  },
};

function statusFor(
  facts: ProvisioningPlanFacts,
  code: ProvisioningDecisionCode,
): ProvisioningPlanDecisionStatus {
  return facts[code] ?? "undecided";
}

export function evaluateProvisioningBlueprint(
  facts: ProvisioningPlanFacts = {},
): ProvisioningBlueprintDecision {
  const decisions = DECISION_DEFINITIONS.map((definition): ProvisioningDecision => ({
    ...definition,
    status: statusFor(facts, definition.code),
  }));

  const blockers = decisions.filter((decision) => decision.status !== "approved");
  const approvedDecisionCount = decisions.length - blockers.length;
  const definedCount = decisions.filter((decision) => decision.status !== "undecided").length;
  const provisioningMayBegin = blockers.length === 0;

  const state: ProvisioningBlueprintState = provisioningMayBegin
    ? "approved_for_controlled_provisioning"
    : definedCount > 0
      ? "partially_defined"
      : "not_defined";

  return {
    state,
    provisioningMayBegin,
    approvedDecisionCount,
    totalDecisionCount: decisions.length,
    decisions,
    blockers,
  };
}

export function approvedProvisioningPlanFacts(): ProvisioningPlanFacts {
  return Object.fromEntries(
    DECISION_DEFINITIONS.map((decision) => [decision.code, "approved"]),
  ) as ProvisioningPlanFacts;
}

function isValidTransition(from: ProvisioningEnvironment, to: ProvisioningEnvironment): boolean {
  return (
    (from === "development" && to === "staging") ||
    (from === "staging" && to === "production")
  );
}

export function evaluateProvisioningPromotion(
  from: ProvisioningEnvironment,
  to: ProvisioningEnvironment,
  evidence: ProvisioningPromotionEvidence,
): ProvisioningPromotionDecision {
  if (!isValidTransition(from, to)) {
    return {
      from,
      to,
      state: "invalid_transition",
      promotionMayProceed: false,
      blockers: [],
    };
  }

  const blockers: ProvisioningPromotionBlockerCode[] = [];

  if (!evidence.blueprint.provisioningMayBegin) blockers.push("blueprint_not_approved");
  if (!evidence.sourceEnvironmentVerified) blockers.push("source_environment_not_verified");
  if (!evidence.targetEnvironmentIsolationVerified) blockers.push("target_isolation_not_verified");
  if (!evidence.rollbackRehearsed) blockers.push("rollback_not_rehearsed");
  if (!evidence.backupRestoreVerified) blockers.push("backup_restore_not_verified");
  if (!evidence.securityReviewComplete) blockers.push("security_review_incomplete");

  if (to === "production") {
    if (!evidence.costApprovalRecorded) blockers.push("production_cost_not_approved");
    if (!evidence.incidentOwnerAssigned) blockers.push("production_incident_owner_missing");
    if (!evidence.killSwitchVerified) blockers.push("production_kill_switch_not_verified");
    if (!evidence.activation?.runtimeMayActivate) {
      blockers.push("runtime_activation_preflight_not_ready");
    }
  }

  return {
    from,
    to,
    state: blockers.length === 0 ? "ready_for_controlled_promotion" : "blocked",
    promotionMayProceed: blockers.length === 0,
    blockers,
  };
}
