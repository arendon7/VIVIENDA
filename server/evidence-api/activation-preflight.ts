export type EvidenceRuntimeActivationLayer =
  | "environment"
  | "identity"
  | "persistence"
  | "storage"
  | "boundary"
  | "product";

export type EvidenceRuntimeRequirementCode =
  | "dedicated_vivienda_project"
  | "migrations_applied"
  | "security_advisors_reviewed"
  | "authenticated_principal_resolver"
  | "immutable_subject_mapping_verified"
  | "case_persistence_provider"
  | "private_evidence_bucket"
  | "signed_upload_download_provider"
  | "physical_deletion_worker"
  | "trusted_origin_policy"
  | "rate_limit_provider"
  | "structured_audit_transport"
  | "real_case_creation_flow"
  | "purpose_specific_data_authorization"
  | "service_agreement_recording";

export type EvidenceRuntimeRequirementStatus = "missing" | "configured_unverified" | "verified";

export type EvidenceRuntimeActivationFacts = Partial<
  Record<EvidenceRuntimeRequirementCode, EvidenceRuntimeRequirementStatus>
>;

export type EvidenceRuntimeRequirement = {
  code: EvidenceRuntimeRequirementCode;
  layer: EvidenceRuntimeActivationLayer;
  label: string;
  status: EvidenceRuntimeRequirementStatus;
  verificationCriterion: string;
};

export type EvidenceRuntimeActivationState =
  | "not_configured"
  | "blocked_partial_configuration"
  | "ready_for_controlled_activation";

export type EvidenceRuntimeActivationDecision = {
  state: EvidenceRuntimeActivationState;
  runtimeMayActivate: boolean;
  partialActivationDetected: boolean;
  verifiedRequirementCount: number;
  totalRequirementCount: number;
  nextBlockingLayer: EvidenceRuntimeActivationLayer | null;
  requirements: EvidenceRuntimeRequirement[];
  blockers: EvidenceRuntimeRequirement[];
};

const LAYER_ORDER: EvidenceRuntimeActivationLayer[] = [
  "environment",
  "identity",
  "persistence",
  "storage",
  "boundary",
  "product",
];

const REQUIREMENT_DEFINITIONS: ReadonlyArray<
  Omit<EvidenceRuntimeRequirement, "status">
> = [
  {
    code: "dedicated_vivienda_project",
    layer: "environment",
    label: "Proyecto de infraestructura dedicado a VIVIENDA",
    verificationCriterion:
      "Existe un proyecto dedicado y aprobado para VIVIENDA; no se reutiliza infraestructura de otro producto.",
  },
  {
    code: "migrations_applied",
    layer: "environment",
    label: "Migraciones de persistencia y Storage aplicadas",
    verificationCriterion:
      "Schema, RPC, hardening de seguridad/integridad, identidad y coordinación de Storage están aplicados y comprobados en el proyecto objetivo.",
  },
  {
    code: "security_advisors_reviewed",
    layer: "environment",
    label: "Advisors de seguridad revisados",
    verificationCriterion:
      "Los hallazgos de seguridad relevantes del proveedor fueron revisados y no existe un bloqueo crítico pendiente.",
  },
  {
    code: "authenticated_principal_resolver",
    layer: "identity",
    label: "Resolución de principal autenticado",
    verificationCriterion:
      "La sesión autenticada se resuelve server-side a un principal permitido sin aceptar subjectRef, rol o autoridad desde el navegador.",
  },
  {
    code: "immutable_subject_mapping_verified",
    layer: "identity",
    label: "Mapeo inmutable auth user → subjectRef",
    verificationCriterion:
      "El mapeo opaco de identidad está provisionado y probado para impedir reasignaciones silenciosas de subjectRef.",
  },
  {
    code: "case_persistence_provider",
    layer: "persistence",
    label: "Proveedor de persistencia de Case State",
    verificationCriterion:
      "CasePersistencePort está cableado a persistencia durable y pasa pruebas de acceso, idempotencia, atomicidad y concurrencia.",
  },
  {
    code: "private_evidence_bucket",
    layer: "storage",
    label: "Bucket privado de evidencia",
    verificationCriterion:
      "La evidencia reside en almacenamiento privado dedicado; no existe lectura pública ni path controlado por el cliente.",
  },
  {
    code: "signed_upload_download_provider",
    layer: "storage",
    label: "Coordinador de upload/download firmado",
    verificationCriterion:
      "Prepare, complete y download usan grants de corta vida, coordenadas server-authoritative y verificación antes de finalizar evidencia.",
  },
  {
    code: "physical_deletion_worker",
    layer: "storage",
    label: "Worker de eliminación física",
    verificationCriterion:
      "Expiraciones/tombstones generan eliminación física verificable y su confirmación se registra sin fingir borrado antes de ejecutarlo.",
  },
  {
    code: "trusted_origin_policy",
    layer: "boundary",
    label: "Política de trusted origin",
    verificationCriterion:
      "Los orígenes permitidos están definidos para el entorno objetivo y las solicitudes cross-origin no autorizadas fallan cerrado.",
  },
  {
    code: "rate_limit_provider",
    layer: "boundary",
    label: "Rate limiter productivo",
    verificationCriterion:
      "Existe un rate limiter durable/compartido con clave derivada de contexto autenticado; una falla del limiter bloquea la operación.",
  },
  {
    code: "structured_audit_transport",
    layer: "boundary",
    label: "Transporte de auditoría estructurada",
    verificationCriterion:
      "Prepare, complete y download registran requestId, operación y resultado sin persistir secretos, documentos ni datos sensibles innecesarios.",
  },
  {
    code: "real_case_creation_flow",
    layer: "product",
    label: "Flujo real de creación de expediente",
    verificationCriterion:
      "El usuario autenticado crea un Case real y propio antes de cualquier intake documental; el preview local no se reutiliza como expediente.",
  },
  {
    code: "purpose_specific_data_authorization",
    layer: "product",
    label: "Autorización de datos por finalidad",
    verificationCriterion:
      "Existe autorización activa, versionada y con una finalidad compatible antes de preparar o finalizar evidencia.",
  },
  {
    code: "service_agreement_recording",
    layer: "product",
    label: "Aceptación del alcance del servicio",
    verificationCriterion:
      "Cuando la ruta asistida lo exige, la aceptación del alcance se registra explícitamente y no se interpreta como poder, mandato o representación.",
  },
];

function requirementStatus(
  facts: EvidenceRuntimeActivationFacts,
  code: EvidenceRuntimeRequirementCode,
): EvidenceRuntimeRequirementStatus {
  return facts[code] ?? "missing";
}

function nextBlockingLayer(blockers: readonly EvidenceRuntimeRequirement[]): EvidenceRuntimeActivationLayer | null {
  for (const layer of LAYER_ORDER) {
    if (blockers.some((item) => item.layer === layer)) return layer;
  }
  return null;
}

export function evaluateEvidenceRuntimeActivation(
  facts: EvidenceRuntimeActivationFacts = {},
): EvidenceRuntimeActivationDecision {
  const requirements = REQUIREMENT_DEFINITIONS.map((definition): EvidenceRuntimeRequirement => ({
    ...definition,
    status: requirementStatus(facts, definition.code),
  }));

  const blockers = requirements.filter((item) => item.status !== "verified");
  const verifiedRequirementCount = requirements.length - blockers.length;
  const configuredRequirementCount = requirements.filter((item) => item.status !== "missing").length;
  const runtimeMayActivate = blockers.length === 0;
  const partialActivationDetected = !runtimeMayActivate && configuredRequirementCount > 0;

  const state: EvidenceRuntimeActivationState = runtimeMayActivate
    ? "ready_for_controlled_activation"
    : partialActivationDetected
      ? "blocked_partial_configuration"
      : "not_configured";

  return {
    state,
    runtimeMayActivate,
    partialActivationDetected,
    verifiedRequirementCount,
    totalRequirementCount: requirements.length,
    nextBlockingLayer: nextBlockingLayer(blockers),
    requirements,
    blockers,
  };
}

export class EvidenceRuntimeActivationError extends Error {
  readonly code = "runtime_activation_blocked" as const;
  readonly decision: EvidenceRuntimeActivationDecision;

  constructor(decision: EvidenceRuntimeActivationDecision) {
    const firstBlocker = decision.blockers[0];
    super(
      firstBlocker
        ? `Evidence runtime activation blocked by ${firstBlocker.code}.`
        : "Evidence runtime activation blocked.",
    );
    this.name = "EvidenceRuntimeActivationError";
    this.decision = decision;
  }
}

export function assertEvidenceRuntimeActivationAllowed(
  facts: EvidenceRuntimeActivationFacts,
): EvidenceRuntimeActivationDecision {
  const decision = evaluateEvidenceRuntimeActivation(facts);
  if (!decision.runtimeMayActivate) {
    throw new EvidenceRuntimeActivationError(decision);
  }
  return decision;
}

export function verifiedEvidenceRuntimeActivationFacts(): EvidenceRuntimeActivationFacts {
  return Object.fromEntries(
    REQUIREMENT_DEFINITIONS.map((item) => [item.code, "verified"]),
  ) as EvidenceRuntimeActivationFacts;
}
