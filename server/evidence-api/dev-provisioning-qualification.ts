import type { EvidenceRuntimeActivationFacts } from "./activation-preflight";
import type { ProvisioningBlueprintDecision } from "./provisioning-blueprint";

export type DevProvisioningAuthorizationStatus = "missing" | "proposed" | "approved";

export type DevProvisioningAuthorizationCode =
  | "dedicated_project_scope_approved"
  | "organization_selection_recorded"
  | "provider_cost_quote_reviewed"
  | "provider_cost_approval_recorded"
  | "development_region_approved"
  | "synthetic_only_scope_approved"
  | "no_existing_project_reuse_approved"
  | "provisioning_actor_authorized";

export type DevProvisioningAuthorizationFacts = Partial<
  Record<DevProvisioningAuthorizationCode, DevProvisioningAuthorizationStatus>
>;

export type DevProvisioningAuthorizationRequirement = {
  code: DevProvisioningAuthorizationCode;
  status: DevProvisioningAuthorizationStatus;
  verificationCriterion: string;
};

export type DevProvisioningAuthorizationState =
  | "not_authorized"
  | "partially_authorized"
  | "authorized_for_cost_confirmed_creation";

export type DevProvisioningAuthorizationDecision = {
  state: DevProvisioningAuthorizationState;
  projectCreationMayBeRequested: boolean;
  approvedRequirementCount: number;
  totalRequirementCount: number;
  blueprintApproved: boolean;
  requirements: DevProvisioningAuthorizationRequirement[];
  blockers: DevProvisioningAuthorizationRequirement[];
};

export type DevEnvironmentQualificationStatus = "missing" | "configured_unverified" | "verified";

export type DevEnvironmentQualificationCode =
  | "project_exists"
  | "project_role_matches_dev"
  | "project_isolation_verified"
  | "region_matches_authorization"
  | "migrations_applied_and_versioned"
  | "security_advisors_reviewed"
  | "rls_and_rpc_security_verified"
  | "identity_mapping_verified"
  | "private_storage_verified"
  | "database_recovery_verified"
  | "storage_object_recovery_strategy_verified"
  | "secrets_server_only_verified"
  | "synthetic_only_data_verified"
  | "runtime_fail_closed_verified";

export type DevEnvironmentQualificationFacts = Partial<
  Record<DevEnvironmentQualificationCode, DevEnvironmentQualificationStatus>
>;

export type DevEnvironmentQualificationRequirement = {
  code: DevEnvironmentQualificationCode;
  status: DevEnvironmentQualificationStatus;
  verificationCriterion: string;
};

export type DevEnvironmentQualificationState =
  | "not_provisioned"
  | "provisioned_unqualified"
  | "qualified_for_staging_candidate";

export type DevEnvironmentQualificationDecision = {
  state: DevEnvironmentQualificationState;
  devEnvironmentVerified: boolean;
  liveRuntimeAuthorized: false;
  verifiedRequirementCount: number;
  totalRequirementCount: number;
  requirements: DevEnvironmentQualificationRequirement[];
  blockers: DevEnvironmentQualificationRequirement[];
};

export const DEV_PROVIDER_PROFILE = {
  provider: "supabase",
  projectRole: "development",
  recommendedProjectName: "vivienda-dev",
  recommendedRegion: "sa-east-1",
  recommendedRegionLabel: "South America (São Paulo)",
  dataPolicy: "synthetic_only",
  evidenceRuntimeDefault: "fail_closed",
  secretsVisibility: "server_only",
  projectIsolation: "dedicated_project",
  databaseAndStorageRecoveryAreSeparate: true,
  freshProviderCostConfirmationRequired: true,
  explicitOrganizationSelectionRequired: true,
} as const;

const AUTHORIZATION_REQUIREMENTS: ReadonlyArray<
  Omit<DevProvisioningAuthorizationRequirement, "status">
> = [
  {
    code: "dedicated_project_scope_approved",
    verificationCriterion:
      "DEV será un proyecto dedicado exclusivamente a VIVIENDA y no una reutilización o renombre de infraestructura de otro producto.",
  },
  {
    code: "organization_selection_recorded",
    verificationCriterion:
      "La organización objetivo del proveedor fue seleccionada explícitamente para esta creación; no se infiere desde otro proyecto existente.",
  },
  {
    code: "provider_cost_quote_reviewed",
    verificationCriterion:
      "Se obtuvo y revisó una cotización vigente del proveedor para crear el proyecto en la organización seleccionada.",
  },
  {
    code: "provider_cost_approval_recorded",
    verificationCriterion:
      "El costo vigente fue aprobado explícitamente antes de ejecutar la operación que puede generar cobro.",
  },
  {
    code: "development_region_approved",
    verificationCriterion:
      "La región de DEV fue aprobada explícitamente; la recomendación técnica no sustituye esta aprobación.",
  },
  {
    code: "synthetic_only_scope_approved",
    verificationCriterion:
      "DEV acepta únicamente datos sintéticos y no se usará para documentos, extractos o evidencia financiera real.",
  },
  {
    code: "no_existing_project_reuse_approved",
    verificationCriterion:
      "Se comprobó y aceptó que ningún proyecto de otro producto será reutilizado para VIVIENDA DEV.",
  },
  {
    code: "provisioning_actor_authorized",
    verificationCriterion:
      "La persona o automatización que ejecutará la creación está autorizada y conoce la frontera fail-closed del entorno.",
  },
];

const QUALIFICATION_REQUIREMENTS: ReadonlyArray<
  Omit<DevEnvironmentQualificationRequirement, "status">
> = [
  {
    code: "project_exists",
    verificationCriterion:
      "El proyecto DEV existe realmente en el proveedor y su identificador fue observado desde una fuente confiable del entorno.",
  },
  {
    code: "project_role_matches_dev",
    verificationCriterion:
      "Nombre, propósito y configuración del proyecto corresponden a VIVIENDA DEV y no a STAGING, PROD u otro producto.",
  },
  {
    code: "project_isolation_verified",
    verificationCriterion:
      "Base de datos, Auth, Storage y credenciales del proyecto están aislados de otros productos y de futuros STAGING/PROD.",
  },
  {
    code: "region_matches_authorization",
    verificationCriterion:
      "La región creada coincide exactamente con la región aprobada para DEV.",
  },
  {
    code: "migrations_applied_and_versioned",
    verificationCriterion:
      "Todas las migraciones canónicas del repositorio se aplicaron en orden y el schema resultante es trazable a sus versiones; no hay SQL manual no registrado.",
  },
  {
    code: "security_advisors_reviewed",
    verificationCriterion:
      "Los advisors de seguridad relevantes fueron ejecutados y revisados después de aplicar las migraciones; no queda un bloqueo crítico sin resolver.",
  },
  {
    code: "rls_and_rpc_security_verified",
    verificationCriterion:
      "RLS, permisos y RPC sensibles fueron verificados contra acceso no autorizado y autoridad controlada por el cliente.",
  },
  {
    code: "identity_mapping_verified",
    verificationCriterion:
      "El esquema de identidad soporta resolución server-side y mapeo inmutable auth user → subjectRef sin aceptar subjectRef desde el navegador.",
  },
  {
    code: "private_storage_verified",
    verificationCriterion:
      "Storage de evidencia es privado, no expone lectura pública y no permite al cliente escoger paths autoritativos.",
  },
  {
    code: "database_recovery_verified",
    verificationCriterion:
      "Existe un mecanismo reproducible para reconstruir o restaurar la base DEV y se comprobó al menos una ruta de recovery apropiada al entorno.",
  },
  {
    code: "storage_object_recovery_strategy_verified",
    verificationCriterion:
      "La estrategia de recovery reconoce que los backups de la base no restauran por sí solos los objetos de Storage y define cómo se prueba esa capa separadamente.",
  },
  {
    code: "secrets_server_only_verified",
    verificationCriterion:
      "Las credenciales privilegiadas permanecen server-side y no aparecen en repositorio, bundle cliente, logs, fixtures o payloads del navegador.",
  },
  {
    code: "synthetic_only_data_verified",
    verificationCriterion:
      "La verificación de DEV usa únicamente fixtures y datos sintéticos; no se copiaron documentos o datos financieros reales.",
  },
  {
    code: "runtime_fail_closed_verified",
    verificationCriterion:
      "El runtime de evidencia sigue fail-closed; la existencia y calificación de DEV no habilitan uploads reales ni sustituyen V0.23.12.",
  },
];

function authorizationStatus(
  facts: DevProvisioningAuthorizationFacts,
  code: DevProvisioningAuthorizationCode,
): DevProvisioningAuthorizationStatus {
  return facts[code] ?? "missing";
}

export function evaluateDevProvisioningAuthorization(
  blueprint: ProvisioningBlueprintDecision,
  facts: DevProvisioningAuthorizationFacts = {},
): DevProvisioningAuthorizationDecision {
  const requirements = AUTHORIZATION_REQUIREMENTS.map(
    (definition): DevProvisioningAuthorizationRequirement => ({
      ...definition,
      status: authorizationStatus(facts, definition.code),
    }),
  );

  const blockers = requirements.filter((requirement) => requirement.status !== "approved");
  const approvedRequirementCount = requirements.length - blockers.length;
  const hasAnyAuthorizationWork = requirements.some((requirement) => requirement.status !== "missing");
  const blueprintApproved = blueprint.provisioningMayBegin;
  const projectCreationMayBeRequested = blueprintApproved && blockers.length === 0;

  const state: DevProvisioningAuthorizationState = projectCreationMayBeRequested
    ? "authorized_for_cost_confirmed_creation"
    : hasAnyAuthorizationWork || blueprintApproved
      ? "partially_authorized"
      : "not_authorized";

  return {
    state,
    projectCreationMayBeRequested,
    approvedRequirementCount,
    totalRequirementCount: requirements.length,
    blueprintApproved,
    requirements,
    blockers,
  };
}

function qualificationStatus(
  facts: DevEnvironmentQualificationFacts,
  code: DevEnvironmentQualificationCode,
): DevEnvironmentQualificationStatus {
  return facts[code] ?? "missing";
}

export function evaluateDevEnvironmentQualification(
  facts: DevEnvironmentQualificationFacts = {},
): DevEnvironmentQualificationDecision {
  const requirements = QUALIFICATION_REQUIREMENTS.map(
    (definition): DevEnvironmentQualificationRequirement => ({
      ...definition,
      status: qualificationStatus(facts, definition.code),
    }),
  );

  const blockers = requirements.filter((requirement) => requirement.status !== "verified");
  const verifiedRequirementCount = requirements.length - blockers.length;
  const projectExists = facts.project_exists === "verified";
  const devEnvironmentVerified = blockers.length === 0;

  const state: DevEnvironmentQualificationState = devEnvironmentVerified
    ? "qualified_for_staging_candidate"
    : projectExists
      ? "provisioned_unqualified"
      : "not_provisioned";

  return {
    state,
    devEnvironmentVerified,
    liveRuntimeAuthorized: false,
    verifiedRequirementCount,
    totalRequirementCount: requirements.length,
    requirements,
    blockers,
  };
}

export function approvedDevProvisioningAuthorizationFacts(): DevProvisioningAuthorizationFacts {
  return Object.fromEntries(
    AUTHORIZATION_REQUIREMENTS.map((requirement) => [requirement.code, "approved"]),
  ) as DevProvisioningAuthorizationFacts;
}

export function verifiedDevEnvironmentQualificationFacts(): DevEnvironmentQualificationFacts {
  return Object.fromEntries(
    QUALIFICATION_REQUIREMENTS.map((requirement) => [requirement.code, "verified"]),
  ) as DevEnvironmentQualificationFacts;
}

export function devQualificationProducesNoRuntimeActivationFacts(): EvidenceRuntimeActivationFacts {
  return {};
}
