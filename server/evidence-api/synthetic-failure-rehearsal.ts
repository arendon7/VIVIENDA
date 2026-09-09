import { evaluateOpportunityRoutes } from "@/domain/opportunity/router";
import { buildMortgageAuditBlueprint } from "@/domain/assisted-execution/mortgage-audit";
import { MemoryCasePersistence } from "@/domain/persistence-boundary/memory-adapter";
import {
  type Clock,
  type IdGenerator,
  type Principal,
} from "@/domain/persistence-boundary/contracts";
import { CasePersistenceService } from "@/domain/persistence-boundary/service";
import {
  EVIDENCE_BUCKET_ID,
  EvidenceStorageCoordinator,
  type EvidenceObjectRegistryPort,
  type EvidenceObjectResolution,
  type EvidenceStorageGateway,
  type ExpiredEvidenceObject,
  type IntentObjectResolution,
  type OpaqueObjectCoordinateFactory,
  type ObjectInspection,
  type PendingEvidenceDeletion,
  type PrincipalSource,
  type ReservedObjectCoordinates,
  type UserPrincipal,
} from "@/domain/storage-coordination/coordinator";
import { ServerClassifiedEvidenceApplication } from "./application-authority";
import {
  EvidenceHttpApi,
  type ApiAuditLogPort,
  type ApiRateLimitPort,
  type ApiRequestContextSource,
  type EvidenceApiOperation,
} from "./http-boundary";

const SYNTHETIC_ORIGIN = "https://synthetic-failure.vivienda.invalid";
const SYNTHETIC_NOW = "2026-09-08T18:00:00.000Z";

export type SyntheticEvidenceFailureScenario =
  | "unauthenticated_prepare"
  | "missing_data_authorization"
  | "cross_case_access"
  | "missing_uploaded_object"
  | "rate_limit_unavailable";

export type SyntheticEvidenceFailureReport = {
  mode: "synthetic_failure_rehearsal";
  externalIoOccurred: false;
  liveRuntimeAuthorized: false;
  runtimeServerWasUsed: false;
  scenario: SyntheticEvidenceFailureScenario;
  errorOperation: "prepare" | "complete";
  expectedErrorCode: string;
  observedErrorCode: string;
  httpStatuses: {
    prepare: number | null;
    complete: number | null;
  };
  finalCaseVersion: number;
  finalCaseStage: string;
  eventSequence: string[];
  evidenceCount: number;
  uploadIntentStatus: "quarantine" | "finalized" | "expired" | null;
  registryRegistrations: number;
  storageUploadGrantCalls: number;
  storageInspectionCalls: number;
  auditOperations: Array<{
    operation: EvidenceApiOperation;
    status: number;
    errorCode?: string;
  }>;
  boundaries: {
    noEvidencePersisted: boolean;
    noEvidenceAttachedEvent: boolean;
    caseVersionUnchangedByRejectedOperation: boolean;
    publicErrorSanitized: boolean;
  };
};

class SyntheticFailureClock implements Clock {
  now() {
    return SYNTHETIC_NOW;
  }
}

class SyntheticFailureIds implements IdGenerator {
  private counters: Record<Parameters<IdGenerator["next"]>[0], number> = {
    case: 0,
    evt: 0,
    auth: 0,
    evd: 0,
    upl: 0,
    req: 0,
  };

  next(prefix: Parameters<IdGenerator["next"]>[0]): string {
    this.counters[prefix] += 1;
    return `${prefix}_failure_${String(this.counters[prefix]).padStart(3, "0")}`;
  }
}

class SyntheticFailurePrincipalSource implements PrincipalSource {
  constructor(private readonly principal: UserPrincipal | null) {}

  async resolve(): Promise<UserPrincipal | null> {
    return this.principal ? { ...this.principal } : null;
  }
}

type RegistryEntry = {
  intentId: string;
  storageLocator: string;
  objectPath: string;
};

class SyntheticFailureRegistry implements EvidenceObjectRegistryPort {
  private readonly objects = new Map<string, RegistryEntry>();
  registrations = 0;

  constructor(private readonly persistence: MemoryCasePersistence) {}

  async registerObject(input: RegistryEntry): Promise<void> {
    const intent = await this.persistence.loadEvidenceIntent(input.intentId);
    if (!intent) throw new Error("Failure rehearsal registry requires a persisted upload intent.");
    this.registrations += 1;
    this.objects.set(input.intentId, { ...input });
  }

  async resolveIntentObject(intentId: string): Promise<IntentObjectResolution | null> {
    const entry = this.objects.get(intentId);
    const intent = await this.persistence.loadEvidenceIntent(intentId);
    if (!entry || !intent) return null;
    return {
      intentId: intent.intentId,
      evidenceId: intent.evidenceId,
      caseId: intent.caseId,
      status: intent.status,
      expiresAt: intent.expiresAt,
      storageLocator: entry.storageLocator,
      bucketId: EVIDENCE_BUCKET_ID,
      objectPath: entry.objectPath,
      deletedAt: null,
    };
  }

  async resolveReadableEvidenceObject(caseId: string, evidenceId: string): Promise<EvidenceObjectResolution | null> {
    for (const [intentId, entry] of this.objects) {
      const intent = await this.persistence.loadEvidenceIntent(intentId);
      if (intent?.caseId === caseId && intent.evidenceId === evidenceId && intent.status === "finalized") {
        return {
          evidenceId,
          caseId,
          storageLocator: entry.storageLocator,
          bucketId: EVIDENCE_BUCKET_ID,
          objectPath: entry.objectPath,
        };
      }
    }
    return null;
  }

  async expireIntents(): Promise<ExpiredEvidenceObject[]> {
    return [];
  }

  async listPendingDeletions(): Promise<PendingEvidenceDeletion[]> {
    return [];
  }

  async markObjectDeleted(): Promise<void> {
    // No external object exists in a synthetic failure rehearsal.
  }
}

class SyntheticFailureCoordinates implements OpaqueObjectCoordinateFactory {
  private counter = 0;

  reserve(intent: Parameters<OpaqueObjectCoordinateFactory["reserve"]>[0]): ReservedObjectCoordinates {
    this.counter += 1;
    const storageLocator = `obj_failure_${String(this.counter).padStart(3, "0")}`;
    return {
      storageLocator,
      bucketId: EVIDENCE_BUCKET_ID,
      objectPath: `quarantine/${intent.intentId}/${intent.evidenceId}/${storageLocator}`,
    };
  }
}

class SyntheticFailureStorage implements EvidenceStorageGateway {
  private readonly objects = new Map<string, ObjectInspection>();
  uploadGrantCalls = 0;
  inspectionCalls = 0;

  putSyntheticObject(objectPath: string, inspection: ObjectInspection): void {
    this.objects.set(objectPath, { ...inspection });
  }

  async createSignedUploadGrant(): Promise<{ token: string; expiresAt: string }> {
    this.uploadGrantCalls += 1;
    return {
      token: "failure-rehearsal-upload-token",
      expiresAt: "2026-09-08T18:10:00.000Z",
    };
  }

  async inspectAndHashObject(input: Parameters<EvidenceStorageGateway["inspectAndHashObject"]>[0]) {
    this.inspectionCalls += 1;
    const inspection = this.objects.get(input.objectPath);
    return inspection ? { ...inspection } : null;
  }

  async createSignedDownloadGrant(): Promise<{ url: string; expiresAt: string }> {
    return {
      url: `${SYNTHETIC_ORIGIN}/unused-download-token`,
      expiresAt: "2026-09-08T18:01:00.000Z",
    };
  }

  async deleteObject(): Promise<"deleted"> {
    return "deleted";
  }
}

class SyntheticFailureContexts implements ApiRequestContextSource {
  private counter = 0;

  resolve(): { requestId: string; rateLimitKey: string } {
    this.counter += 1;
    return {
      requestId: `req_failure_http_${String(this.counter).padStart(3, "0")}`,
      rateLimitKey: "synthetic-failure-rehearsal",
    };
  }
}

class SyntheticFailureRateLimit implements ApiRateLimitPort {
  constructor(private readonly unavailable: boolean) {}

  async consume(): Promise<{ kind: "allowed" } | { kind: "unavailable" }> {
    return this.unavailable ? { kind: "unavailable" } : { kind: "allowed" };
  }
}

class SyntheticFailureAudit implements ApiAuditLogPort {
  readonly events: Array<{
    requestId: string;
    operation: EvidenceApiOperation;
    status: number;
    errorCode?: string;
  }> = [];

  record(event: {
    requestId: string;
    operation: EvidenceApiOperation;
    status: number;
    errorCode?: string;
  }): void {
    this.events.push({ ...event });
  }
}

function jsonRequest(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${SYNTHETIC_ORIGIN}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: SYNTHETIC_ORIGIN,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function responseBody(response: Response): Promise<Record<string, any>> {
  return (await response.json()) as Record<string, any>;
}

async function createR7CaseFixture(input: {
  authorizeData: boolean;
  persistence: MemoryCasePersistence;
  caseService: CasePersistenceService;
  owner: Extract<Principal, { kind: "client" }>;
}) {
  const routerResult = evaluateOpportunityRoutes({
    asOfDate: "2026-09-08",
    precision: "C2",
    productType: "mortgage_housing",
    modality: "pesos",
    paymentState: "current",
    unexplainedChargeOrAllocationIssue: true,
  });
  const blueprint = buildMortgageAuditBlueprint(routerResult, "2026-09-08");

  const created = await input.caseService.createCase(input.owner, {
    idempotencyKey: "failure.case.create.v1",
    routeCode: blueprint.routeCode,
    routeStatus: blueprint.routeStatus,
    precision: blueprint.precision,
    track: blueprint.caseTrack,
  });
  const caseId = created.model.caseId;
  let version = created.model.projection.version;

  if (input.authorizeData) {
    const authorized = await input.caseService.grantDataAuthorization(input.owner, caseId, version, {
      idempotencyKey: "failure.data.authorization.v1",
      consentVersion: "failure-consent-v1",
      purposes: ["mortgage_analysis", "case_management"],
    });
    version = authorized.model.projection.version;
  }

  const serviceAccepted = await input.caseService.appendEvent(input.owner, caseId, version, {
    type: "SERVICE_AGREEMENT_ACCEPTED",
    idempotencyKey: "failure.service.agreement.v1",
    payload: { agreementVersion: "failure-service-v1" },
  });
  version = serviceAccepted.model.projection.version;

  const evidenceRequested = await input.caseService.appendEvent(input.owner, caseId, version, {
    type: "EVIDENCE_REQUESTED",
    idempotencyKey: "failure.evidence.request.v1",
    payload: {
      requestCode: "R7_STATEMENT_DIFFERENCE",
      label: "Extracto para revisar la diferencia reportada",
    },
  });

  return {
    caseId,
    versionBeforeRejectedOperation: evidenceRequested.model.projection.version,
  };
}

function publicErrorIsSanitized(body: Record<string, any>): boolean {
  const serialized = JSON.stringify(body).toLowerCase();
  return (
    !serialized.includes("storagelocator") &&
    !serialized.includes("checksum") &&
    !serialized.includes("upload-token") &&
    !serialized.includes("failure-rehearsal-upload-token") &&
    !serialized.includes("obj_failure_")
  );
}

function expectedFor(scenario: SyntheticEvidenceFailureScenario): {
  operation: "prepare" | "complete";
  status: number;
  code: string;
} {
  switch (scenario) {
    case "unauthenticated_prepare":
      return { operation: "prepare", status: 401, code: "authentication_required" };
    case "missing_data_authorization":
      return { operation: "prepare", status: 409, code: "data_authorization_required" };
    case "cross_case_access":
      return { operation: "prepare", status: 403, code: "forbidden" };
    case "missing_uploaded_object":
      return { operation: "complete", status: 404, code: "evidence_not_found" };
    case "rate_limit_unavailable":
      return { operation: "prepare", status: 503, code: "rate_limit_unavailable" };
  }
}

/**
 * Exercises fail-closed behavior across the real Case + Storage coordination + HTTP composition.
 *
 * Every scenario uses only deterministic in-memory infrastructure. A successful failure rehearsal means
 * the expected operation was rejected without persisting evidence or advancing the Case to EVIDENCE_ATTACHED.
 */
export async function runSyntheticEvidenceFailureRehearsal(
  scenario: SyntheticEvidenceFailureScenario,
): Promise<SyntheticEvidenceFailureReport> {
  const clock = new SyntheticFailureClock();
  const ids = new SyntheticFailureIds();
  const persistence = new MemoryCasePersistence();
  const caseService = new CasePersistenceService(persistence, clock, ids);
  const owner: Extract<Principal, { kind: "client" }> = {
    kind: "client",
    subjectRef: "sub_failure_owner",
  };
  const fixture = await createR7CaseFixture({
    authorizeData: scenario !== "missing_data_authorization",
    persistence,
    caseService,
    owner,
  });

  const principalForHttp: UserPrincipal | null =
    scenario === "unauthenticated_prepare"
      ? null
      : scenario === "cross_case_access"
        ? { kind: "client", subjectRef: "sub_failure_intruder" }
        : owner;

  const registry = new SyntheticFailureRegistry(persistence);
  const storage = new SyntheticFailureStorage();
  const coordinator = new EvidenceStorageCoordinator(
    new SyntheticFailurePrincipalSource(principalForHttp),
    caseService,
    registry,
    storage,
    new SyntheticFailureCoordinates(),
    clock,
  );
  const audit = new SyntheticFailureAudit();
  const api = new EvidenceHttpApi(
    new ServerClassifiedEvidenceApplication(coordinator),
    new SyntheticFailureContexts(),
    new SyntheticFailureRateLimit(scenario === "rate_limit_unavailable"),
    audit,
  );

  let prepareStatus: number | null = null;
  let completeStatus: number | null = null;
  let errorBody: Record<string, any> = {};
  let preparedIntentId: string | null = null;

  const prepareResponse = await api.prepare(
    jsonRequest(`/api/v1/cases/${fixture.caseId}/evidence/uploads`, {
      kind: "statement",
      legalDataCategory: "non_personal",
      securityTier: "open",
    }),
    { caseId: fixture.caseId },
  );
  prepareStatus = prepareResponse.status;
  const prepareBody = await responseBody(prepareResponse);

  if (scenario === "missing_uploaded_object") {
    if (prepareResponse.status !== 200) {
      throw new Error(`Failure rehearsal expected prepare 200 before missing-object complete; got ${prepareResponse.status}.`);
    }
    const prepared = prepareBody.data as { intentId: string };
    preparedIntentId = prepared.intentId;
    const completeResponse = await api.complete(
      jsonRequest(
        `/api/v1/cases/${fixture.caseId}/evidence/uploads/${prepared.intentId}/complete`,
        { expectedVersion: fixture.versionBeforeRejectedOperation },
        { "idempotency-key": "failure.evidence.complete.v1" },
      ),
      { caseId: fixture.caseId, intentId: prepared.intentId },
    );
    completeStatus = completeResponse.status;
    errorBody = await responseBody(completeResponse);
  } else {
    errorBody = prepareBody;
  }

  const expected = expectedFor(scenario);
  const observedErrorCode = String((errorBody.error as { code?: unknown } | undefined)?.code ?? "");
  const finalModel = await caseService.readCase(owner, fixture.caseId);
  const persistedSnapshot = await persistence.loadCase(fixture.caseId);
  if (!persistedSnapshot) throw new Error("Failure rehearsal lost its in-memory case.");

  const intent = preparedIntentId ? await persistence.loadEvidenceIntent(preparedIntentId) : null;
  const eventSequence = finalModel.timeline.map((event) => event.type);

  return {
    mode: "synthetic_failure_rehearsal",
    externalIoOccurred: false,
    liveRuntimeAuthorized: false,
    runtimeServerWasUsed: false,
    scenario,
    errorOperation: expected.operation,
    expectedErrorCode: expected.code,
    observedErrorCode,
    httpStatuses: {
      prepare: prepareStatus,
      complete: completeStatus,
    },
    finalCaseVersion: finalModel.projection.version,
    finalCaseStage: finalModel.projection.stage,
    eventSequence,
    evidenceCount: persistedSnapshot.evidence.length,
    uploadIntentStatus: intent?.status ?? null,
    registryRegistrations: registry.registrations,
    storageUploadGrantCalls: storage.uploadGrantCalls,
    storageInspectionCalls: storage.inspectionCalls,
    auditOperations: audit.events.map(({ operation, status, errorCode }) => ({
      operation,
      status,
      ...(errorCode ? { errorCode } : {}),
    })),
    boundaries: {
      noEvidencePersisted: persistedSnapshot.evidence.length === 0,
      noEvidenceAttachedEvent: !eventSequence.includes("EVIDENCE_ATTACHED"),
      caseVersionUnchangedByRejectedOperation:
        finalModel.projection.version === fixture.versionBeforeRejectedOperation,
      publicErrorSanitized: publicErrorIsSanitized(errorBody),
    },
  };
}

export async function runSyntheticEvidenceFailureMatrix(): Promise<SyntheticEvidenceFailureReport[]> {
  const scenarios: SyntheticEvidenceFailureScenario[] = [
    "unauthenticated_prepare",
    "missing_data_authorization",
    "cross_case_access",
    "missing_uploaded_object",
    "rate_limit_unavailable",
  ];
  return Promise.all(scenarios.map((scenario) => runSyntheticEvidenceFailureRehearsal(scenario)));
}
