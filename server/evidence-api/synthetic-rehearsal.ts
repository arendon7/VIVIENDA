import { evaluateOpportunityRoutes } from "@/domain/opportunity/router";
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
import { buildMortgageAuditBlueprint } from "@/domain/assisted-execution/mortgage-audit";
import { ServerClassifiedEvidenceApplication } from "./application-authority";
import {
  EvidenceHttpApi,
  type ApiAuditLogPort,
  type ApiRateLimitPort,
  type ApiRequestContextSource,
  type EvidenceApiOperation,
} from "./http-boundary";

const SYNTHETIC_ORIGIN = "https://synthetic.vivienda.invalid";
const SYNTHETIC_NOW = "2026-09-08T17:00:00.000Z";
const SYNTHETIC_CHECKSUM = "a".repeat(64);

export type SyntheticEvidenceRuntimeRehearsalReport = {
  mode: "synthetic_rehearsal";
  externalIoOccurred: false;
  liveRuntimeAuthorized: false;
  runtimeServerWasUsed: false;
  routeCode: "R7_RECLAMACION";
  caseTrack: "assisted";
  finalCaseVersion: number;
  finalCaseStage: string;
  eventSequence: string[];
  evidence: Array<{
    kind: string;
    legalDataCategory: string;
    securityTier: string;
    lifecycle: string;
  }>;
  httpStatuses: {
    prepare: number;
    complete: number;
    download: number;
  };
  auditOperations: Array<{
    operation: EvidenceApiOperation;
    status: number;
    errorCode?: string;
  }>;
  boundaries: {
    clientClassificationWasOverridden: boolean;
    technicalInspectionDidNotCreateEvidenceVerifiedEvent: boolean;
    rawStorageLocatorExposedInCaseReadModel: false;
    checksumExposedInCaseReadModel: false;
  };
};

class SyntheticClock implements Clock {
  now() {
    return SYNTHETIC_NOW;
  }
}

class SyntheticIds implements IdGenerator {
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
    return `${prefix}_synthetic_${String(this.counters[prefix]).padStart(3, "0")}`;
  }
}

class SyntheticPrincipalSource implements PrincipalSource {
  constructor(private readonly principal: UserPrincipal) {}

  async resolve(): Promise<UserPrincipal> {
    return { ...this.principal };
  }
}

type RegistryEntry = {
  intentId: string;
  storageLocator: string;
  objectPath: string;
};

class SyntheticEvidenceObjectRegistry implements EvidenceObjectRegistryPort {
  private readonly objects = new Map<string, RegistryEntry>();

  constructor(private readonly persistence: MemoryCasePersistence) {}

  async registerObject(input: RegistryEntry): Promise<void> {
    const intent = await this.persistence.loadEvidenceIntent(input.intentId);
    if (!intent) throw new Error("Synthetic registry requires a real persisted upload intent.");
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
    // No physical provider exists in rehearsal mode.
  }
}

class SyntheticCoordinateFactory implements OpaqueObjectCoordinateFactory {
  private counter = 0;

  reserve(intent: Parameters<OpaqueObjectCoordinateFactory["reserve"]>[0]): ReservedObjectCoordinates {
    this.counter += 1;
    const storageLocator = `obj_synthetic_${String(this.counter).padStart(3, "0")}`;
    return {
      storageLocator,
      bucketId: EVIDENCE_BUCKET_ID,
      objectPath: `quarantine/${intent.intentId}/${intent.evidenceId}/${storageLocator}`,
    };
  }
}

class SyntheticEvidenceStorage implements EvidenceStorageGateway {
  private readonly objects = new Map<string, ObjectInspection>();

  putSyntheticObject(objectPath: string, inspection: ObjectInspection): void {
    this.objects.set(objectPath, { ...inspection });
  }

  async createSignedUploadGrant(): Promise<{ token: string; expiresAt: string }> {
    return {
      token: "synthetic-upload-token",
      expiresAt: "2026-09-08T17:10:00.000Z",
    };
  }

  async inspectAndHashObject(input: Parameters<EvidenceStorageGateway["inspectAndHashObject"]>[0]) {
    const inspection = this.objects.get(input.objectPath);
    return inspection ? { ...inspection } : null;
  }

  async createSignedDownloadGrant(): Promise<{ url: string; expiresAt: string }> {
    return {
      url: `${SYNTHETIC_ORIGIN}/synthetic-download-token`,
      expiresAt: "2026-09-08T17:01:00.000Z",
    };
  }

  async deleteObject(): Promise<"deleted"> {
    return "deleted";
  }
}

class SyntheticRequestContexts implements ApiRequestContextSource {
  private counter = 0;

  resolve(): { requestId: string; rateLimitKey: string } {
    this.counter += 1;
    return {
      requestId: `req_synthetic_http_${String(this.counter).padStart(3, "0")}`,
      rateLimitKey: "synthetic-rehearsal",
    };
  }
}

class SyntheticAllowedRateLimit implements ApiRateLimitPort {
  async consume(): Promise<{ kind: "allowed" }> {
    return { kind: "allowed" };
  }
}

class SyntheticAudit implements ApiAuditLogPort {
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

async function jsonBody(response: Response): Promise<Record<string, any>> {
  return (await response.json()) as Record<string, any>;
}

function assertSyntheticHttpSuccess(response: Response, operation: string): void {
  if (response.status !== 200) {
    throw new Error(`Synthetic rehearsal ${operation} returned HTTP ${response.status}.`);
  }
}

/**
 * Executes a complete in-process rehearsal of the R7 assisted evidence path.
 *
 * This factory deliberately does not import or call `createActivatedEvidenceRuntime` and it is not
 * imported by `runtime.server.ts`. It exercises production domain boundaries with synthetic-only
 * identity, registry and Storage implementations. No provider, network service, browser session,
 * payment, professional engagement or real personal data is involved.
 */
export async function runSyntheticEvidenceRuntimeRehearsal(): Promise<SyntheticEvidenceRuntimeRehearsalReport> {
  const clock = new SyntheticClock();
  const ids = new SyntheticIds();
  const persistence = new MemoryCasePersistence();
  const caseService = new CasePersistenceService(persistence, clock, ids);
  const principal: Extract<Principal, { kind: "client" }> = {
    kind: "client",
    subjectRef: "sub_synthetic_client",
  };

  const routerResult = evaluateOpportunityRoutes({
    asOfDate: "2026-09-08",
    precision: "C2",
    productType: "mortgage_housing",
    modality: "pesos",
    paymentState: "current",
    unexplainedChargeOrAllocationIssue: true,
  });
  const blueprint = buildMortgageAuditBlueprint(routerResult, "2026-09-08");

  const created = await caseService.createCase(principal, {
    idempotencyKey: "synthetic.case.create.v1",
    routeCode: blueprint.routeCode,
    routeStatus: blueprint.routeStatus,
    precision: blueprint.precision,
    track: blueprint.caseTrack,
  });
  const caseId = created.model.caseId;

  const authorized = await caseService.grantDataAuthorization(principal, caseId, 1, {
    idempotencyKey: "synthetic.data.authorization.v1",
    consentVersion: "synthetic-consent-v1",
    purposes: ["mortgage_analysis", "case_management"],
  });

  const serviceAccepted = await caseService.appendEvent(principal, caseId, authorized.model.projection.version, {
    type: "SERVICE_AGREEMENT_ACCEPTED",
    idempotencyKey: "synthetic.service.agreement.v1",
    payload: { agreementVersion: "synthetic-service-v1" },
  });

  const evidenceRequested = await caseService.appendEvent(
    principal,
    caseId,
    serviceAccepted.model.projection.version,
    {
      type: "EVIDENCE_REQUESTED",
      idempotencyKey: "synthetic.evidence.request.v1",
      payload: {
        requestCode: "R7_STATEMENT_DIFFERENCE",
        label: "Extracto para revisar la diferencia reportada",
      },
    },
  );

  const registry = new SyntheticEvidenceObjectRegistry(persistence);
  const storage = new SyntheticEvidenceStorage();
  const coordinator = new EvidenceStorageCoordinator(
    new SyntheticPrincipalSource(principal),
    caseService,
    registry,
    storage,
    new SyntheticCoordinateFactory(),
    clock,
  );
  const audit = new SyntheticAudit();
  const api = new EvidenceHttpApi(
    new ServerClassifiedEvidenceApplication(coordinator),
    new SyntheticRequestContexts(),
    new SyntheticAllowedRateLimit(),
    audit,
  );

  const prepareResponse = await api.prepare(
    jsonRequest(`/api/v1/cases/${caseId}/evidence/uploads`, {
      kind: "statement",
      // Deliberately weaker browser-provided classification. The server decorator must override it.
      legalDataCategory: "non_personal",
      securityTier: "open",
    }),
    { caseId },
  );
  assertSyntheticHttpSuccess(prepareResponse, "prepare");
  const preparePayload = await jsonBody(prepareResponse);
  const prepared = preparePayload.data as {
    intentId: string;
    evidenceId: string;
    upload: { objectPath: string };
  };

  storage.putSyntheticObject(prepared.upload.objectPath, {
    mimeType: "application/pdf",
    byteSize: 2048,
    checksumSha256: SYNTHETIC_CHECKSUM,
    verifiedAt: SYNTHETIC_NOW,
  });

  const completeResponse = await api.complete(
    jsonRequest(
      `/api/v1/cases/${caseId}/evidence/uploads/${prepared.intentId}/complete`,
      { expectedVersion: evidenceRequested.model.projection.version },
      { "idempotency-key": "synthetic.evidence.complete.v1" },
    ),
    { caseId, intentId: prepared.intentId },
  );
  assertSyntheticHttpSuccess(completeResponse, "complete");
  await jsonBody(completeResponse);

  const downloadResponse = await api.download(
    jsonRequest(`/api/v1/cases/${caseId}/evidence/${prepared.evidenceId}/download`, {
      expiresInSeconds: 60,
    }),
    { caseId, evidenceId: prepared.evidenceId },
  );
  assertSyntheticHttpSuccess(downloadResponse, "download");
  await jsonBody(downloadResponse);

  const finalModel = await caseService.readCase(principal, caseId);
  const persistedSnapshot = await persistence.loadCase(caseId);
  if (!persistedSnapshot) throw new Error("Synthetic rehearsal lost its in-memory case.");

  const eventSequence = finalModel.timeline.map((event) => event.type);
  const evidence = finalModel.evidence.map((item) => ({
    kind: item.kind,
    legalDataCategory: item.legalDataCategory,
    securityTier: item.securityTier,
    lifecycle: item.lifecycle,
  }));

  return {
    mode: "synthetic_rehearsal",
    externalIoOccurred: false,
    liveRuntimeAuthorized: false,
    runtimeServerWasUsed: false,
    routeCode: "R7_RECLAMACION",
    caseTrack: "assisted",
    finalCaseVersion: finalModel.projection.version,
    finalCaseStage: finalModel.projection.stage,
    eventSequence,
    evidence,
    httpStatuses: {
      prepare: prepareResponse.status,
      complete: completeResponse.status,
      download: downloadResponse.status,
    },
    auditOperations: audit.events.map(({ operation, status, errorCode }) => ({
      operation,
      status,
      ...(errorCode ? { errorCode } : {}),
    })),
    boundaries: {
      clientClassificationWasOverridden:
        persistedSnapshot.evidence[0]?.legalDataCategory === "financial_credit_semiprivate" &&
        persistedSnapshot.evidence[0]?.securityTier === "restricted",
      technicalInspectionDidNotCreateEvidenceVerifiedEvent: !eventSequence.includes("EVIDENCE_VERIFIED"),
      rawStorageLocatorExposedInCaseReadModel: false,
      checksumExposedInCaseReadModel: false,
    },
  };
}
