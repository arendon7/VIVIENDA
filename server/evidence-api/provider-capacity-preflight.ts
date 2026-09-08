import type {
  DevEnvironmentQualificationFacts,
  DevProvisioningAuthorizationDecision,
} from "./dev-provisioning-qualification";
import type { EvidenceRuntimeActivationFacts } from "./activation-preflight";

export type ProviderCapacityVerificationStatus = "missing" | "stale" | "verified";
export type ProviderProjectCapacity = "unknown" | "available" | "exhausted";

export type DevProviderCapacityFacts = {
  organizationIdentity: ProviderCapacityVerificationStatus;
  capacityObservation: ProviderCapacityVerificationStatus;
  projectCapacity: ProviderProjectCapacity;
  costQuote: ProviderCapacityVerificationStatus;
  costConfirmation: ProviderCapacityVerificationStatus;
  quotedProjectCreationCost: number | null;
};

export type DevProviderCapacityPreflightState =
  | "authorization_blocked"
  | "capacity_unverified"
  | "capacity_exhausted"
  | "ready_for_provider_creation";

export type DevProviderCapacityBlockerCode =
  | "parent_authorization_incomplete"
  | "organization_identity_unverified"
  | "capacity_observation_unverified"
  | "project_capacity_unknown"
  | "project_capacity_exhausted"
  | "cost_quote_unverified"
  | "cost_confirmation_unverified";

export type DevProviderCapacityBlocker = {
  code: DevProviderCapacityBlockerCode;
  message: string;
};

export type DevProviderCapacityPreflightDecision = {
  state: DevProviderCapacityPreflightState;
  providerCreationMayExecute: boolean;
  projectCapacity: ProviderProjectCapacity;
  quotedProjectCreationCost: number | null;
  blockers: DevProviderCapacityBlocker[];
};

const blockerMessages: Record<DevProviderCapacityBlockerCode, string> = {
  parent_authorization_incomplete:
    "La autorización DEV de V0.23.14 no permite todavía solicitar la creación del proyecto.",
  organization_identity_unverified:
    "La organización objetivo debe volver a observarse y verificarse antes de ejecutar una creación externa.",
  capacity_observation_unverified:
    "La cuota/capacidad del proveedor debe observarse de forma vigente; un costo aprobado no demuestra disponibilidad de cupo.",
  project_capacity_unknown:
    "El proveedor no ha demostrado todavía si existe un cupo disponible para otro proyecto activo.",
  project_capacity_exhausted:
    "El proveedor confirmó que no existe capacidad disponible para crear otro proyecto activo en el contexto seleccionado.",
  cost_quote_unverified:
    "La cotización del proveedor debe ser vigente y verificada inmediatamente antes de la operación que puede generar costo.",
  cost_confirmation_unverified:
    "La comprensión/aprobación del costo vigente debe estar confirmada antes de ejecutar la creación.",
};

function blocker(code: DevProviderCapacityBlockerCode): DevProviderCapacityBlocker {
  return { code, message: blockerMessages[code] };
}

export function emptyDevProviderCapacityFacts(): DevProviderCapacityFacts {
  return {
    organizationIdentity: "missing",
    capacityObservation: "missing",
    projectCapacity: "unknown",
    costQuote: "missing",
    costConfirmation: "missing",
    quotedProjectCreationCost: null,
  };
}

export function verifiedAvailableDevProviderCapacityFacts(
  quotedProjectCreationCost = 0,
): DevProviderCapacityFacts {
  return {
    organizationIdentity: "verified",
    capacityObservation: "verified",
    projectCapacity: "available",
    costQuote: "verified",
    costConfirmation: "verified",
    quotedProjectCreationCost,
  };
}

export function evaluateDevProviderCapacityPreflight(
  authorization: DevProvisioningAuthorizationDecision,
  facts: DevProviderCapacityFacts = emptyDevProviderCapacityFacts(),
): DevProviderCapacityPreflightDecision {
  const blockers: DevProviderCapacityBlocker[] = [];

  if (!authorization.projectCreationMayBeRequested) {
    blockers.push(blocker("parent_authorization_incomplete"));
  }

  if (facts.organizationIdentity !== "verified") {
    blockers.push(blocker("organization_identity_unverified"));
  }

  if (facts.capacityObservation !== "verified") {
    blockers.push(blocker("capacity_observation_unverified"));
  }

  if (facts.projectCapacity === "unknown") {
    blockers.push(blocker("project_capacity_unknown"));
  } else if (facts.projectCapacity === "exhausted") {
    blockers.push(blocker("project_capacity_exhausted"));
  }

  if (facts.costQuote !== "verified") {
    blockers.push(blocker("cost_quote_unverified"));
  }

  if (facts.costConfirmation !== "verified") {
    blockers.push(blocker("cost_confirmation_unverified"));
  }

  const providerCreationMayExecute = blockers.length === 0;

  let state: DevProviderCapacityPreflightState;
  if (!authorization.projectCreationMayBeRequested) {
    state = "authorization_blocked";
  } else if (facts.projectCapacity === "exhausted" && facts.capacityObservation === "verified") {
    state = "capacity_exhausted";
  } else if (providerCreationMayExecute) {
    state = "ready_for_provider_creation";
  } else {
    state = "capacity_unverified";
  }

  return {
    state,
    providerCreationMayExecute,
    projectCapacity: facts.projectCapacity,
    quotedProjectCreationCost: facts.quotedProjectCreationCost,
    blockers,
  };
}

export function providerCapacityProducesNoEnvironmentQualificationFacts(): DevEnvironmentQualificationFacts {
  return {};
}

export function providerCapacityProducesNoRuntimeActivationFacts(): EvidenceRuntimeActivationFacts {
  return {};
}
