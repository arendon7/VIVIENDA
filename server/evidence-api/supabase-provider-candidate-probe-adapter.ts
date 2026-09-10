import type { SyntheticEvidenceFailureScenario } from "./synthetic-failure-rehearsal";
import type {
  EvidenceRuntimeFailureObservation,
  EvidenceRuntimeHappyPathObservation,
} from "./runtime-parity-contract";
import type { EvidenceRuntimeProviderCandidateProbe } from "./provider-candidate-parity-harness";
import {
  ProviderCandidateFixtureSession,
  type ProviderCandidateFixtureLease,
} from "./provider-candidate-fixture-lifecycle";

export const SUPABASE_PROVIDER_CANDIDATE_PROBE_ADAPTER_VERSION =
  "V0.23.24-SUPABASE-PROVIDER-PROBE-V1" as const;

const HTTP_STATUS_MIN = 100;
const HTTP_STATUS_MAX = 599;
const INTENT_ID = /^upl_[A-Za-z0-9_-]{3,}$/;
const EVIDENCE_ID = /^evd_[A-Za-z0-9_-]{3,}$/;
const STORAGE_LOCATOR = /^obj_[A-Za-z0-9_-]{6,}$/;
const AUDIT_OPERATIONS = new Set([
  "evidence.prepare",
  "evidence.complete",
  "evidence.download",
] as const);

export type SupabaseProviderProbeActor = "owner" | "intruder" | "anonymous";
export type SupabaseProviderProbeFault = "rate_limit_unavailable" | null;

export type SupabaseProviderProbeHttpResult<T> = {
  status: number;
  body: unknown;
  data: T | null;
};

export type SupabaseProviderPreparedUpload = {
  intentId: string;
  evidenceId: string;
  objectPath: string;
  uploadCapability: string;
};

export type SupabaseProviderProbeCaseSeed = {
  caseId: string;
  versionBeforeEvidenceOperation: number;
};

export type SupabaseProviderProbeEvidenceSnapshot = {
  kind: string;
  legalDataCategory: string;
  securityTier: string;
  lifecycle: string;
};

export type SupabaseProviderProbeCaseSnapshot = {
  caseId: string;
  ownerSubjectRef: string;
  routeCode: string;
  caseTrack: string;
  version: number;
  stage: string;
  eventSequence: string[];
  evidence: SupabaseProviderProbeEvidenceSnapshot[];
  publicReadModel: unknown;
};

export type SupabaseProviderProbeIntentSnapshot = {
  intentId: string;
  caseId: string;
  status: "quarantine" | "finalized" | "expired";
};

export type SupabaseProviderProbeAuditEvent = {
  operation: "evidence.prepare" | "evidence.complete" | "evidence.download";
  status: number;
  errorCode?: string;
};

export type SupabaseProviderProbeTelemetry = {
  fixtureId: string;
  namespace: string;
  registryRegistrations: number;
  storageUploadGrantCalls: number;
  storageInspectionCalls: number;
  auditOperations: SupabaseProviderProbeAuditEvent[];
};

/**
 * Probe-only execution seam for a future qualified Supabase DEV candidate.
 *
 * The adapter orchestrates the six canonical probes itself. This port cannot return a completed
 * parity observation; it only exposes provider actions and independent state/telemetry reads.
 * A live implementation must remain server-only and synthetic-only.
 */
export interface SupabaseProviderCandidateProbeExecutionPort {
  readonly provider: "supabase";
  readonly projectLabel: "vivienda-dev";
  readonly syntheticOnly: true;
  readonly externalIoOccurred: boolean;
  readonly liveRuntimeAuthorized: false;
  readonly runtimeServerWasUsed: false;

  seedCase(input: {
    lease: ProviderCandidateFixtureLease;
    authorizeData: boolean;
  }): Promise<SupabaseProviderProbeCaseSeed>;

  prepareEvidence(input: {
    lease: ProviderCandidateFixtureLease;
    caseId: string;
    actor: SupabaseProviderProbeActor;
    clientClassification: {
      kind: "statement";
      legalDataCategory: "non_personal";
      securityTier: "open";
    };
    fault: SupabaseProviderProbeFault;
  }): Promise<SupabaseProviderProbeHttpResult<SupabaseProviderPreparedUpload>>;

  uploadSyntheticPdf(input: {
    lease: ProviderCandidateFixtureLease;
    prepared: SupabaseProviderPreparedUpload;
    mimeType: "application/pdf";
    byteSize: 2048;
  }): Promise<void>;

  completeEvidence(input: {
    lease: ProviderCandidateFixtureLease;
    caseId: string;
    intentId: string;
    actor: "owner";
    expectedVersion: number;
    idempotencyKey: string;
  }): Promise<SupabaseProviderProbeHttpResult<unknown>>;

  downloadEvidence(input: {
    lease: ProviderCandidateFixtureLease;
    caseId: string;
    evidenceId: string;
    actor: "owner";
    expiresInSeconds: 60;
  }): Promise<SupabaseProviderProbeHttpResult<unknown>>;

  readCase(input: {
    lease: ProviderCandidateFixtureLease;
    caseId: string;
    actor: "owner";
  }): Promise<SupabaseProviderProbeCaseSnapshot>;

  readIntent(input: {
    lease: ProviderCandidateFixtureLease;
    caseId: string;
    intentId: string;
  }): Promise<SupabaseProviderProbeIntentSnapshot | null>;

  readTelemetry(input: {
    lease: ProviderCandidateFixtureLease;
  }): Promise<SupabaseProviderProbeTelemetry>;
}

export type SupabaseProviderCandidateProbeAdapterErrorCode =
  | "invalid_configuration"
  | "invalid_provider_response"
  | "probe_execution_failed";

export class SupabaseProviderCandidateProbeAdapterError extends Error {
  constructor(
    readonly code: SupabaseProviderCandidateProbeAdapterErrorCode,
    readonly scope: "happy_path" | SyntheticEvidenceFailureScenario,
  ) {
    super(`Supabase provider candidate probe adapter failed in ${scope}.`);
    this.name = "SupabaseProviderCandidateProbeAdapterError";
  }
}

function fail(
  code: SupabaseProviderCandidateProbeAdapterErrorCode,
  scope: "happy_path" | SyntheticEvidenceFailureScenario,
): never {
  throw new SupabaseProviderCandidateProbeAdapterError(code, scope);
}

function validStatus(value: number): boolean {
  return Number.isSafeInteger(value) && value >= HTTP_STATUS_MIN && value <= HTTP_STATUS_MAX;
}

function validCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function safeSerialize(value: unknown, scope: "happy_path" | SyntheticEvidenceFailureScenario): string {
  try {
    const serialized = JSON.stringify(value);
    return typeof serialized === "string" ? serialized : "";
  } catch {
    fail("invalid_provider_response", scope);
  }
}

function errorCodeFromBody(body: unknown): string {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "";
  const error = (body as Record<string, unknown>).error;
  if (!error || typeof error !== "object" || Array.isArray(error)) return "";
  const code = (error as Record<string, unknown>).code;
  return typeof code === "string" ? code : "";
}

function publicErrorIsSanitized(
  body: unknown,
  scope: SyntheticEvidenceFailureScenario,
): boolean {
  const serialized = safeSerialize(body, scope).toLowerCase();
  const forbidden = [
    "storagelocator",
    "storage_locator",
    "objectpath",
    "object_path",
    "uploadtoken",
    "upload_token",
    "checksum",
    "service_role",
    "quarantine/",
    "obj_",
  ];
  return forbidden.every((token) => !serialized.includes(token));
}

function publicCaseReadModelBoundaries(
  publicReadModel: unknown,
  scope: "happy_path" | SyntheticEvidenceFailureScenario,
): { rawStorageLocatorExposed: boolean; checksumExposed: boolean } {
  const serialized = safeSerialize(publicReadModel, scope).toLowerCase();
  return {
    rawStorageLocatorExposed:
      serialized.includes("storagelocator") ||
      serialized.includes("storage_locator") ||
      serialized.includes("objectpath") ||
      serialized.includes("object_path") ||
      serialized.includes("quarantine/") ||
      serialized.includes("obj_"),
    checksumExposed: serialized.includes("checksum"),
  };
}

function assertCaseSeed(
  seed: SupabaseProviderProbeCaseSeed,
  lease: ProviderCandidateFixtureLease,
  scope: "happy_path" | SyntheticEvidenceFailureScenario,
): void {
  if (
    !seed ||
    typeof seed.caseId !== "string" ||
    !seed.caseId.startsWith(`case_${lease.namespace}_`) ||
    !Number.isSafeInteger(seed.versionBeforeEvidenceOperation) ||
    seed.versionBeforeEvidenceOperation < 1
  ) {
    fail("invalid_provider_response", scope);
  }
}

function assertHttpResult<T>(
  result: SupabaseProviderProbeHttpResult<T>,
  scope: "happy_path" | SyntheticEvidenceFailureScenario,
): void {
  if (!result || !validStatus(result.status)) fail("invalid_provider_response", scope);
  safeSerialize(result.body, scope);
}

function assertPreparedUpload(
  prepared: SupabaseProviderPreparedUpload,
  lease: ProviderCandidateFixtureLease,
  scope: "happy_path" | SyntheticEvidenceFailureScenario,
): void {
  const intentPrefix = `upl_${lease.namespace}_`;
  if (
    !prepared ||
    typeof prepared.intentId !== "string" ||
    !INTENT_ID.test(prepared.intentId) ||
    !prepared.intentId.startsWith(intentPrefix) ||
    typeof prepared.evidenceId !== "string" ||
    !EVIDENCE_ID.test(prepared.evidenceId) ||
    typeof prepared.objectPath !== "string" ||
    typeof prepared.uploadCapability !== "string" ||
    prepared.uploadCapability.length === 0
  ) {
    fail("invalid_provider_response", scope);
  }

  const parts = prepared.objectPath.split("/");
  if (
    parts.length !== 4 ||
    parts[0] !== "quarantine" ||
    parts[1] !== prepared.intentId ||
    parts[2] !== prepared.evidenceId ||
    !STORAGE_LOCATOR.test(parts[3] ?? "")
  ) {
    fail("invalid_provider_response", scope);
  }
}

function cloneAndValidateCaseSnapshot(
  snapshot: SupabaseProviderProbeCaseSnapshot,
  seed: SupabaseProviderProbeCaseSeed,
  lease: ProviderCandidateFixtureLease,
  scope: "happy_path" | SyntheticEvidenceFailureScenario,
): SupabaseProviderProbeCaseSnapshot {
  if (
    !snapshot ||
    snapshot.caseId !== seed.caseId ||
    snapshot.ownerSubjectRef !== lease.ownerSubjectRef ||
    typeof snapshot.routeCode !== "string" ||
    typeof snapshot.caseTrack !== "string" ||
    !Number.isSafeInteger(snapshot.version) ||
    snapshot.version < 1 ||
    typeof snapshot.stage !== "string" ||
    !Array.isArray(snapshot.eventSequence) ||
    snapshot.eventSequence.some((event) => typeof event !== "string") ||
    !Array.isArray(snapshot.evidence) ||
    snapshot.evidence.some(
      (item) =>
        !item ||
        typeof item.kind !== "string" ||
        typeof item.legalDataCategory !== "string" ||
        typeof item.securityTier !== "string" ||
        typeof item.lifecycle !== "string",
    )
  ) {
    fail("invalid_provider_response", scope);
  }
  safeSerialize(snapshot.publicReadModel, scope);

  return {
    caseId: snapshot.caseId,
    ownerSubjectRef: snapshot.ownerSubjectRef,
    routeCode: snapshot.routeCode,
    caseTrack: snapshot.caseTrack,
    version: snapshot.version,
    stage: snapshot.stage,
    eventSequence: [...snapshot.eventSequence],
    evidence: snapshot.evidence.map((item) => ({ ...item })),
    publicReadModel: snapshot.publicReadModel,
  };
}

function cloneAndValidateIntent(
  intent: SupabaseProviderProbeIntentSnapshot | null,
  seed: SupabaseProviderProbeCaseSeed,
  expectedIntentId: string | null,
  scope: SyntheticEvidenceFailureScenario,
): SupabaseProviderProbeIntentSnapshot | null {
  if (intent === null) return null;
  if (
    !expectedIntentId ||
    intent.intentId !== expectedIntentId ||
    intent.caseId !== seed.caseId ||
    (intent.status !== "quarantine" && intent.status !== "finalized" && intent.status !== "expired")
  ) {
    fail("invalid_provider_response", scope);
  }
  return { ...intent };
}

function cloneAndValidateTelemetry(
  telemetry: SupabaseProviderProbeTelemetry,
  lease: ProviderCandidateFixtureLease,
  scope: "happy_path" | SyntheticEvidenceFailureScenario,
): SupabaseProviderProbeTelemetry {
  if (
    !telemetry ||
    telemetry.fixtureId !== lease.fixtureId ||
    telemetry.namespace !== lease.namespace ||
    !validCount(telemetry.registryRegistrations) ||
    !validCount(telemetry.storageUploadGrantCalls) ||
    !validCount(telemetry.storageInspectionCalls) ||
    !Array.isArray(telemetry.auditOperations)
  ) {
    fail("invalid_provider_response", scope);
  }

  const auditOperations = telemetry.auditOperations.map((event) => {
    if (
      !event ||
      !AUDIT_OPERATIONS.has(event.operation) ||
      !validStatus(event.status) ||
      (event.errorCode !== undefined && typeof event.errorCode !== "string")
    ) {
      fail("invalid_provider_response", scope);
    }
    return {
      operation: event.operation,
      status: event.status,
      ...(event.errorCode ? { errorCode: event.errorCode } : {}),
    };
  });

  return {
    fixtureId: telemetry.fixtureId,
    namespace: telemetry.namespace,
    registryRegistrations: telemetry.registryRegistrations,
    storageUploadGrantCalls: telemetry.storageUploadGrantCalls,
    storageInspectionCalls: telemetry.storageInspectionCalls,
    auditOperations,
  };
}

function failureActor(scenario: SyntheticEvidenceFailureScenario): SupabaseProviderProbeActor {
  if (scenario === "unauthenticated_prepare") return "anonymous";
  if (scenario === "cross_case_access") return "intruder";
  return "owner";
}

function failureErrorOperation(
  scenario: SyntheticEvidenceFailureScenario,
): "prepare" | "complete" {
  return scenario === "missing_uploaded_object" ? "complete" : "prepare";
}

export class SupabaseProviderCandidateProbeAdapter implements EvidenceRuntimeProviderCandidateProbe {
  readonly liveRuntimeAuthorized = false as const;
  readonly runtimeServerWasUsed = false as const;

  constructor(
    private readonly session: ProviderCandidateFixtureSession,
    private readonly execution: SupabaseProviderCandidateProbeExecutionPort,
  ) {
    if (
      execution.provider !== "supabase" ||
      execution.projectLabel !== "vivienda-dev" ||
      execution.syntheticOnly !== true ||
      execution.liveRuntimeAuthorized !== false ||
      execution.runtimeServerWasUsed !== false
    ) {
      fail("invalid_configuration", "happy_path");
    }
  }

  get externalIoOccurred(): boolean {
    return this.execution.externalIoOccurred;
  }

  private async seed(
    lease: ProviderCandidateFixtureLease,
    authorizeData: boolean,
    scope: "happy_path" | SyntheticEvidenceFailureScenario,
  ): Promise<SupabaseProviderProbeCaseSeed> {
    try {
      const seed = await this.execution.seedCase({ lease, authorizeData });
      assertCaseSeed(seed, lease, scope);
      return { ...seed };
    } catch (error) {
      if (error instanceof SupabaseProviderCandidateProbeAdapterError) throw error;
      fail("probe_execution_failed", scope);
    }
  }

  async captureHappyPath(): Promise<EvidenceRuntimeHappyPathObservation> {
    return this.session.run("happy_path", async (lease) => {
      const seed = await this.seed(lease, true, "happy_path");

      let preparedResult: SupabaseProviderProbeHttpResult<SupabaseProviderPreparedUpload>;
      try {
        preparedResult = await this.execution.prepareEvidence({
          lease,
          caseId: seed.caseId,
          actor: "owner",
          clientClassification: {
            kind: "statement",
            legalDataCategory: "non_personal",
            securityTier: "open",
          },
          fault: null,
        });
      } catch {
        fail("probe_execution_failed", "happy_path");
      }
      assertHttpResult(preparedResult, "happy_path");
      if (preparedResult.status !== 200 || !preparedResult.data) {
        fail("invalid_provider_response", "happy_path");
      }
      assertPreparedUpload(preparedResult.data, lease, "happy_path");
      const prepared = { ...preparedResult.data };

      try {
        await this.execution.uploadSyntheticPdf({
          lease,
          prepared,
          mimeType: "application/pdf",
          byteSize: 2048,
        });
      } catch {
        fail("probe_execution_failed", "happy_path");
      }

      let completed: SupabaseProviderProbeHttpResult<unknown>;
      try {
        completed = await this.execution.completeEvidence({
          lease,
          caseId: seed.caseId,
          intentId: prepared.intentId,
          actor: "owner",
          expectedVersion: seed.versionBeforeEvidenceOperation,
          idempotencyKey: `probe.${lease.namespace}.complete.v1`,
        });
      } catch {
        fail("probe_execution_failed", "happy_path");
      }
      assertHttpResult(completed, "happy_path");
      if (completed.status !== 200) fail("invalid_provider_response", "happy_path");

      let downloaded: SupabaseProviderProbeHttpResult<unknown>;
      try {
        downloaded = await this.execution.downloadEvidence({
          lease,
          caseId: seed.caseId,
          evidenceId: prepared.evidenceId,
          actor: "owner",
          expiresInSeconds: 60,
        });
      } catch {
        fail("probe_execution_failed", "happy_path");
      }
      assertHttpResult(downloaded, "happy_path");
      if (downloaded.status !== 200) fail("invalid_provider_response", "happy_path");

      let snapshotRaw: SupabaseProviderProbeCaseSnapshot;
      let telemetryRaw: SupabaseProviderProbeTelemetry;
      try {
        [snapshotRaw, telemetryRaw] = await Promise.all([
          this.execution.readCase({ lease, caseId: seed.caseId, actor: "owner" }),
          this.execution.readTelemetry({ lease }),
        ]);
      } catch {
        fail("probe_execution_failed", "happy_path");
      }
      const snapshot = cloneAndValidateCaseSnapshot(snapshotRaw, seed, lease, "happy_path");
      const telemetry = cloneAndValidateTelemetry(telemetryRaw, lease, "happy_path");
      const publicBoundaries = publicCaseReadModelBoundaries(snapshot.publicReadModel, "happy_path");

      return {
        // V0.23.19 uses literal TS types while its runtime evaluator intentionally checks mismatches.
        // Preserve the observed runtime values here; the cast only bridges that frozen type boundary.
        routeCode: snapshot.routeCode as EvidenceRuntimeHappyPathObservation["routeCode"],
        caseTrack: snapshot.caseTrack as EvidenceRuntimeHappyPathObservation["caseTrack"],
        finalCaseVersion: snapshot.version,
        finalCaseStage: snapshot.stage,
        eventSequence: [...snapshot.eventSequence],
        evidence: snapshot.evidence.map((item) => ({ ...item })),
        httpStatuses: {
          prepare: preparedResult.status,
          complete: completed.status,
          download: downloaded.status,
        },
        auditOperations: telemetry.auditOperations.map((item) => ({ ...item })),
        boundaries: {
          clientClassificationWasOverridden:
            snapshot.evidence[0]?.legalDataCategory === "financial_credit_semiprivate" &&
            snapshot.evidence[0]?.securityTier === "restricted",
          technicalInspectionDidNotCreateEvidenceVerifiedEvent:
            !snapshot.eventSequence.includes("EVIDENCE_VERIFIED"),
          rawStorageLocatorExposedInCaseReadModel: publicBoundaries.rawStorageLocatorExposed,
          checksumExposedInCaseReadModel: publicBoundaries.checksumExposed,
        },
      };
    });
  }

  async captureFailureScenario(
    scenario: SyntheticEvidenceFailureScenario,
  ): Promise<EvidenceRuntimeFailureObservation> {
    return this.session.run(scenario, async (lease) => {
      const seed = await this.seed(
        lease,
        scenario !== "missing_data_authorization",
        scenario,
      );

      let preparedResult: SupabaseProviderProbeHttpResult<SupabaseProviderPreparedUpload>;
      try {
        preparedResult = await this.execution.prepareEvidence({
          lease,
          caseId: seed.caseId,
          actor: failureActor(scenario),
          clientClassification: {
            kind: "statement",
            legalDataCategory: "non_personal",
            securityTier: "open",
          },
          fault: scenario === "rate_limit_unavailable" ? "rate_limit_unavailable" : null,
        });
      } catch {
        fail("probe_execution_failed", scenario);
      }
      assertHttpResult(preparedResult, scenario);

      let completeResult: SupabaseProviderProbeHttpResult<unknown> | null = null;
      let expectedIntentId: string | null = null;
      let errorBody = preparedResult.body;

      if (scenario === "missing_uploaded_object" && preparedResult.status === 200) {
        if (!preparedResult.data) fail("invalid_provider_response", scenario);
        assertPreparedUpload(preparedResult.data, lease, scenario);
        expectedIntentId = preparedResult.data.intentId;

        try {
          completeResult = await this.execution.completeEvidence({
            lease,
            caseId: seed.caseId,
            intentId: preparedResult.data.intentId,
            actor: "owner",
            expectedVersion: seed.versionBeforeEvidenceOperation,
            idempotencyKey: `probe.${lease.namespace}.complete.v1`,
          });
        } catch {
          fail("probe_execution_failed", scenario);
        }
        assertHttpResult(completeResult, scenario);
        errorBody = completeResult.body;
      }

      let snapshotRaw: SupabaseProviderProbeCaseSnapshot;
      let telemetryRaw: SupabaseProviderProbeTelemetry;
      let intentRaw: SupabaseProviderProbeIntentSnapshot | null = null;
      try {
        [snapshotRaw, telemetryRaw, intentRaw] = await Promise.all([
          this.execution.readCase({ lease, caseId: seed.caseId, actor: "owner" }),
          this.execution.readTelemetry({ lease }),
          expectedIntentId
            ? this.execution.readIntent({
                lease,
                caseId: seed.caseId,
                intentId: expectedIntentId,
              })
            : Promise.resolve(null),
        ]);
      } catch {
        fail("probe_execution_failed", scenario);
      }

      const snapshot = cloneAndValidateCaseSnapshot(snapshotRaw, seed, lease, scenario);
      const telemetry = cloneAndValidateTelemetry(telemetryRaw, lease, scenario);
      const intent = cloneAndValidateIntent(intentRaw, seed, expectedIntentId, scenario);

      return {
        scenario,
        errorOperation: failureErrorOperation(scenario),
        observedErrorCode: errorCodeFromBody(errorBody),
        httpStatuses: {
          prepare: preparedResult.status,
          complete: completeResult?.status ?? null,
        },
        finalCaseVersion: snapshot.version,
        finalCaseStage: snapshot.stage,
        eventSequence: [...snapshot.eventSequence],
        evidenceCount: snapshot.evidence.length,
        uploadIntentStatus: intent?.status ?? null,
        registryRegistrations: telemetry.registryRegistrations,
        storageUploadGrantCalls: telemetry.storageUploadGrantCalls,
        storageInspectionCalls: telemetry.storageInspectionCalls,
        auditOperations: telemetry.auditOperations.map((item) => ({ ...item })),
        boundaries: {
          noEvidencePersisted: snapshot.evidence.length === 0,
          noEvidenceAttachedEvent: !snapshot.eventSequence.includes("EVIDENCE_ATTACHED"),
          caseVersionUnchangedByRejectedOperation:
            snapshot.version === seed.versionBeforeEvidenceOperation,
          publicErrorSanitized: publicErrorIsSanitized(errorBody, scenario),
        },
      };
    });
  }
}

export function supabaseProviderCandidateProbeAdapterProducesNoActivationFacts(): Record<string, never> {
  return {};
}
