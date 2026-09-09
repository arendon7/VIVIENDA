import {
  runSyntheticEvidenceFailureMatrix,
  type SyntheticEvidenceFailureReport,
  type SyntheticEvidenceFailureScenario,
} from "./synthetic-failure-rehearsal";
import {
  runSyntheticEvidenceRuntimeRehearsal,
  type SyntheticEvidenceRuntimeRehearsalReport,
} from "./synthetic-rehearsal";

export const EVIDENCE_RUNTIME_PARITY_BASELINE_VERSION = "V0.23.19-RUNTIME-PARITY-V1" as const;

export type EvidenceRuntimeParitySource = "synthetic_baseline" | "dev_provider_candidate";

export type EvidenceRuntimeHappyPathObservation = Pick<
  SyntheticEvidenceRuntimeRehearsalReport,
  | "routeCode"
  | "caseTrack"
  | "finalCaseVersion"
  | "finalCaseStage"
  | "eventSequence"
  | "evidence"
  | "httpStatuses"
  | "auditOperations"
  | "boundaries"
>;

export type EvidenceRuntimeFailureObservation = Omit<
  SyntheticEvidenceFailureReport,
  "mode" | "externalIoOccurred" | "liveRuntimeAuthorized" | "runtimeServerWasUsed" | "expectedErrorCode"
>;

export type EvidenceRuntimeParityObservation = {
  baselineVersion: typeof EVIDENCE_RUNTIME_PARITY_BASELINE_VERSION;
  source: EvidenceRuntimeParitySource;
  externalIoOccurred: boolean;
  liveRuntimeAuthorized: boolean;
  runtimeServerWasUsed: boolean;
  happyPath: EvidenceRuntimeHappyPathObservation;
  failures: EvidenceRuntimeFailureObservation[];
};

export type EvidenceRuntimeParityDeviationCode =
  | "baseline_version_mismatch"
  | "activation_authority_present"
  | "runtime_server_used"
  | "happy_route_mismatch"
  | "happy_track_mismatch"
  | "happy_case_state_mismatch"
  | "happy_event_sequence_mismatch"
  | "happy_evidence_mismatch"
  | "happy_http_mismatch"
  | "happy_audit_mismatch"
  | "happy_safety_boundary_mismatch"
  | "failure_scenario_set_mismatch"
  | "failure_public_contract_mismatch"
  | "failure_case_state_mismatch"
  | "failure_persistence_boundary_mismatch"
  | "failure_storage_touch_mismatch"
  | "failure_audit_mismatch";

export type EvidenceRuntimeParityDeviation = {
  code: EvidenceRuntimeParityDeviationCode;
  scope: "global" | "happy_path" | SyntheticEvidenceFailureScenario;
  message: string;
};

export type EvidenceRuntimeParityDecision = {
  state: "conformant" | "nonconformant";
  conformsToBaseline: boolean;
  baselineVersion: typeof EVIDENCE_RUNTIME_PARITY_BASELINE_VERSION;
  totalChecks: number;
  passedChecks: number;
  deviations: EvidenceRuntimeParityDeviation[];
  runtimeActivationAuthorized: false;
  activationDecisionEvaluated: false;
};

type FailureExpectation = {
  scenario: SyntheticEvidenceFailureScenario;
  errorOperation: "prepare" | "complete";
  observedErrorCode: string;
  httpStatuses: { prepare: number | null; complete: number | null };
  finalCaseVersion: number;
  finalCaseStage: "draft";
  eventSequence: string[];
  evidenceCount: 0;
  uploadIntentStatus: "quarantine" | null;
  registryRegistrations: number;
  storageUploadGrantCalls: number;
  storageInspectionCalls: number;
  auditOperations: Array<{
    operation: "evidence.prepare" | "evidence.complete";
    status: number;
    errorCode?: string;
  }>;
};

const HAPPY_EVENT_SEQUENCE = [
  "CASE_CREATED",
  "DATA_AUTHORIZATION_RECORDED",
  "SERVICE_AGREEMENT_ACCEPTED",
  "EVIDENCE_REQUESTED",
  "EVIDENCE_ATTACHED",
];

const HAPPY_EVIDENCE = [
  {
    kind: "statement",
    legalDataCategory: "financial_credit_semiprivate",
    securityTier: "restricted",
    lifecycle: "active",
  },
];

const HAPPY_HTTP = {
  prepare: 200,
  complete: 200,
  download: 200,
};

const HAPPY_AUDIT = [
  { operation: "evidence.prepare", status: 200 },
  { operation: "evidence.complete", status: 200 },
  { operation: "evidence.download", status: 200 },
];

const HAPPY_BOUNDARIES = {
  clientClassificationWasOverridden: true,
  technicalInspectionDidNotCreateEvidenceVerifiedEvent: true,
  rawStorageLocatorExposedInCaseReadModel: false,
  checksumExposedInCaseReadModel: false,
};

const FAILURE_EXPECTATIONS: Record<SyntheticEvidenceFailureScenario, FailureExpectation> = {
  unauthenticated_prepare: {
    scenario: "unauthenticated_prepare",
    errorOperation: "prepare",
    observedErrorCode: "authentication_required",
    httpStatuses: { prepare: 401, complete: null },
    finalCaseVersion: 4,
    finalCaseStage: "draft",
    eventSequence: [
      "CASE_CREATED",
      "DATA_AUTHORIZATION_RECORDED",
      "SERVICE_AGREEMENT_ACCEPTED",
      "EVIDENCE_REQUESTED",
    ],
    evidenceCount: 0,
    uploadIntentStatus: null,
    registryRegistrations: 0,
    storageUploadGrantCalls: 0,
    storageInspectionCalls: 0,
    auditOperations: [
      { operation: "evidence.prepare", status: 401, errorCode: "authentication_required" },
    ],
  },
  missing_data_authorization: {
    scenario: "missing_data_authorization",
    errorOperation: "prepare",
    observedErrorCode: "data_authorization_required",
    httpStatuses: { prepare: 409, complete: null },
    finalCaseVersion: 3,
    finalCaseStage: "draft",
    eventSequence: ["CASE_CREATED", "SERVICE_AGREEMENT_ACCEPTED", "EVIDENCE_REQUESTED"],
    evidenceCount: 0,
    uploadIntentStatus: null,
    registryRegistrations: 0,
    storageUploadGrantCalls: 0,
    storageInspectionCalls: 0,
    auditOperations: [
      { operation: "evidence.prepare", status: 409, errorCode: "data_authorization_required" },
    ],
  },
  cross_case_access: {
    scenario: "cross_case_access",
    errorOperation: "prepare",
    observedErrorCode: "forbidden",
    httpStatuses: { prepare: 403, complete: null },
    finalCaseVersion: 4,
    finalCaseStage: "draft",
    eventSequence: [
      "CASE_CREATED",
      "DATA_AUTHORIZATION_RECORDED",
      "SERVICE_AGREEMENT_ACCEPTED",
      "EVIDENCE_REQUESTED",
    ],
    evidenceCount: 0,
    uploadIntentStatus: null,
    registryRegistrations: 0,
    storageUploadGrantCalls: 0,
    storageInspectionCalls: 0,
    auditOperations: [{ operation: "evidence.prepare", status: 403, errorCode: "forbidden" }],
  },
  missing_uploaded_object: {
    scenario: "missing_uploaded_object",
    errorOperation: "complete",
    observedErrorCode: "evidence_not_found",
    httpStatuses: { prepare: 200, complete: 404 },
    finalCaseVersion: 4,
    finalCaseStage: "draft",
    eventSequence: [
      "CASE_CREATED",
      "DATA_AUTHORIZATION_RECORDED",
      "SERVICE_AGREEMENT_ACCEPTED",
      "EVIDENCE_REQUESTED",
    ],
    evidenceCount: 0,
    uploadIntentStatus: "quarantine",
    registryRegistrations: 1,
    storageUploadGrantCalls: 1,
    storageInspectionCalls: 1,
    auditOperations: [
      { operation: "evidence.prepare", status: 200 },
      { operation: "evidence.complete", status: 404, errorCode: "evidence_not_found" },
    ],
  },
  rate_limit_unavailable: {
    scenario: "rate_limit_unavailable",
    errorOperation: "prepare",
    observedErrorCode: "rate_limit_unavailable",
    httpStatuses: { prepare: 503, complete: null },
    finalCaseVersion: 4,
    finalCaseStage: "draft",
    eventSequence: [
      "CASE_CREATED",
      "DATA_AUTHORIZATION_RECORDED",
      "SERVICE_AGREEMENT_ACCEPTED",
      "EVIDENCE_REQUESTED",
    ],
    evidenceCount: 0,
    uploadIntentStatus: null,
    registryRegistrations: 0,
    storageUploadGrantCalls: 0,
    storageInspectionCalls: 0,
    auditOperations: [
      { operation: "evidence.prepare", status: 503, errorCode: "rate_limit_unavailable" },
    ],
  },
};

const FAILURE_SCENARIOS = Object.keys(FAILURE_EXPECTATIONS).sort() as SyntheticEvidenceFailureScenario[];

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeHappyPath(report: SyntheticEvidenceRuntimeRehearsalReport): EvidenceRuntimeHappyPathObservation {
  return {
    routeCode: report.routeCode,
    caseTrack: report.caseTrack,
    finalCaseVersion: report.finalCaseVersion,
    finalCaseStage: report.finalCaseStage,
    eventSequence: [...report.eventSequence],
    evidence: report.evidence.map((item) => ({ ...item })),
    httpStatuses: { ...report.httpStatuses },
    auditOperations: report.auditOperations.map((item) => ({ ...item })),
    boundaries: { ...report.boundaries },
  };
}

function normalizeFailure(report: SyntheticEvidenceFailureReport): EvidenceRuntimeFailureObservation {
  return {
    scenario: report.scenario,
    errorOperation: report.errorOperation,
    observedErrorCode: report.observedErrorCode,
    httpStatuses: { ...report.httpStatuses },
    finalCaseVersion: report.finalCaseVersion,
    finalCaseStage: report.finalCaseStage,
    eventSequence: [...report.eventSequence],
    evidenceCount: report.evidenceCount,
    uploadIntentStatus: report.uploadIntentStatus,
    registryRegistrations: report.registryRegistrations,
    storageUploadGrantCalls: report.storageUploadGrantCalls,
    storageInspectionCalls: report.storageInspectionCalls,
    auditOperations: report.auditOperations.map((item) => ({ ...item })),
    boundaries: { ...report.boundaries },
  };
}

/**
 * Captures the V0.23.17 happy-path plus the V0.23.18 failure matrix into one
 * provider-neutral, secret-free parity observation.
 *
 * This does not evaluate activation facts and does not touch runtime.server.ts.
 */
export async function captureSyntheticEvidenceRuntimeParityObservation(): Promise<EvidenceRuntimeParityObservation> {
  const [happy, failures] = await Promise.all([
    runSyntheticEvidenceRuntimeRehearsal(),
    runSyntheticEvidenceFailureMatrix(),
  ]);

  return {
    baselineVersion: EVIDENCE_RUNTIME_PARITY_BASELINE_VERSION,
    source: "synthetic_baseline",
    externalIoOccurred:
      happy.externalIoOccurred || failures.some((report) => report.externalIoOccurred),
    liveRuntimeAuthorized:
      happy.liveRuntimeAuthorized || failures.some((report) => report.liveRuntimeAuthorized),
    runtimeServerWasUsed:
      happy.runtimeServerWasUsed || failures.some((report) => report.runtimeServerWasUsed),
    happyPath: normalizeHappyPath(happy),
    failures: failures.map(normalizeFailure),
  };
}

export function evaluateEvidenceRuntimeParity(
  observation: EvidenceRuntimeParityObservation,
): EvidenceRuntimeParityDecision {
  const deviations: EvidenceRuntimeParityDeviation[] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  const check = (
    pass: boolean,
    code: EvidenceRuntimeParityDeviationCode,
    scope: EvidenceRuntimeParityDeviation["scope"],
    message: string,
  ) => {
    totalChecks += 1;
    if (pass) {
      passedChecks += 1;
      return;
    }
    deviations.push({ code, scope, message });
  };

  check(
    observation.baselineVersion === EVIDENCE_RUNTIME_PARITY_BASELINE_VERSION,
    "baseline_version_mismatch",
    "global",
    "La observación no declara la versión canónica del contrato de paridad.",
  );
  check(
    observation.liveRuntimeAuthorized === false,
    "activation_authority_present",
    "global",
    "Una observación de paridad no puede declarar autoridad de activación live.",
  );
  check(
    observation.runtimeServerWasUsed === false,
    "runtime_server_used",
    "global",
    "La certificación de paridad debe permanecer separada del runtime público.",
  );

  check(
    observation.happyPath.routeCode === "R7_RECLAMACION",
    "happy_route_mismatch",
    "happy_path",
    "El happy-path no conserva la ruta R7 canónica.",
  );
  check(
    observation.happyPath.caseTrack === "assisted",
    "happy_track_mismatch",
    "happy_path",
    "El happy-path no conserva el track assisted canónico.",
  );
  check(
    observation.happyPath.finalCaseVersion === 5 && observation.happyPath.finalCaseStage === "collecting_evidence",
    "happy_case_state_mismatch",
    "happy_path",
    "El Case final del happy-path no coincide con la versión/etapa canónica.",
  );
  check(
    sameValue(observation.happyPath.eventSequence, HAPPY_EVENT_SEQUENCE) &&
      !observation.happyPath.eventSequence.includes("EVIDENCE_VERIFIED"),
    "happy_event_sequence_mismatch",
    "happy_path",
    "La secuencia happy-path cambió o elevó inspección técnica a EVIDENCE_VERIFIED.",
  );
  check(
    sameValue(observation.happyPath.evidence, HAPPY_EVIDENCE),
    "happy_evidence_mismatch",
    "happy_path",
    "La evidencia happy-path no conserva clasificación/lifecycle server-authoritative.",
  );
  check(
    sameValue(observation.happyPath.httpStatuses, HAPPY_HTTP),
    "happy_http_mismatch",
    "happy_path",
    "Prepare, complete y download no conservan el contrato HTTP happy-path.",
  );
  check(
    sameValue(observation.happyPath.auditOperations, HAPPY_AUDIT),
    "happy_audit_mismatch",
    "happy_path",
    "La auditoría happy-path no conserva operaciones y resultados canónicos.",
  );
  check(
    sameValue(observation.happyPath.boundaries, HAPPY_BOUNDARIES),
    "happy_safety_boundary_mismatch",
    "happy_path",
    "Las fronteras de clasificación, verificación técnica o redacción segura cambiaron.",
  );

  const observedScenarios = observation.failures.map((item) => item.scenario).sort();
  check(
    sameValue(observedScenarios, FAILURE_SCENARIOS),
    "failure_scenario_set_mismatch",
    "global",
    "La matriz adversarial no contiene exactamente los cinco escenarios canónicos.",
  );

  for (const scenario of FAILURE_SCENARIOS) {
    const expected = FAILURE_EXPECTATIONS[scenario];
    const observed = observation.failures.find((item) => item.scenario === scenario);
    if (!observed) continue;

    check(
      observed.errorOperation === expected.errorOperation &&
        observed.observedErrorCode === expected.observedErrorCode &&
        sameValue(observed.httpStatuses, expected.httpStatuses),
      "failure_public_contract_mismatch",
      scenario,
      `El escenario ${scenario} no conserva status, operación y error público canónicos.`,
    );
    check(
      observed.finalCaseVersion === expected.finalCaseVersion &&
        observed.finalCaseStage === expected.finalCaseStage &&
        sameValue(observed.eventSequence, expected.eventSequence),
      "failure_case_state_mismatch",
      scenario,
      `El escenario ${scenario} modificó el Case más allá del estado permitido.`,
    );
    check(
      observed.evidenceCount === 0 &&
        observed.boundaries.noEvidencePersisted &&
        observed.boundaries.noEvidenceAttachedEvent &&
        observed.boundaries.caseVersionUnchangedByRejectedOperation &&
        observed.boundaries.publicErrorSanitized,
      "failure_persistence_boundary_mismatch",
      scenario,
      `El escenario ${scenario} violó una frontera de persistencia o sanitización fail-closed.`,
    );
    check(
      observed.uploadIntentStatus === expected.uploadIntentStatus &&
        observed.registryRegistrations === expected.registryRegistrations &&
        observed.storageUploadGrantCalls === expected.storageUploadGrantCalls &&
        observed.storageInspectionCalls === expected.storageInspectionCalls,
      "failure_storage_touch_mismatch",
      scenario,
      `El escenario ${scenario} tocó registry/Storage en un orden o cantidad no permitidos.`,
    );
    check(
      sameValue(observed.auditOperations, expected.auditOperations),
      "failure_audit_mismatch",
      scenario,
      `La auditoría del escenario ${scenario} no conserva el contrato canónico.`,
    );
  }

  const conformsToBaseline = deviations.length === 0;
  return {
    state: conformsToBaseline ? "conformant" : "nonconformant",
    conformsToBaseline,
    baselineVersion: EVIDENCE_RUNTIME_PARITY_BASELINE_VERSION,
    totalChecks,
    passedChecks,
    deviations,
    runtimeActivationAuthorized: false,
    activationDecisionEvaluated: false,
  };
}

export class EvidenceRuntimeParityError extends Error {
  readonly code = "runtime_parity_failed" as const;

  constructor(readonly decision: EvidenceRuntimeParityDecision) {
    super("Evidence runtime parity contract failed.");
    this.name = "EvidenceRuntimeParityError";
  }
}

export function assertEvidenceRuntimeParity(
  observation: EvidenceRuntimeParityObservation,
): EvidenceRuntimeParityDecision {
  const decision = evaluateEvidenceRuntimeParity(observation);
  if (!decision.conformsToBaseline) throw new EvidenceRuntimeParityError(decision);
  return decision;
}
