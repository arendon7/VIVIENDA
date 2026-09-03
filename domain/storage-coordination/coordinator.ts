import {
  PersistenceBoundaryError,
  type CaseReadModel,
  type Clock,
  type EvidenceUploadIntent,
  type FinalizeEvidenceCommand,
  type PrepareEvidenceUploadCommand,
  type Principal,
  type VerifiedUploadReceipt,
} from "@/domain/persistence-boundary/contracts";
import type { CaseMutationResult } from "@/domain/persistence-boundary/service";

export const EVIDENCE_BUCKET_ID = "vivienda-evidence" as const;
export const DEFAULT_DOWNLOAD_TTL_SECONDS = 60;
export const MAX_DOWNLOAD_TTL_SECONDS = 300;

const STORAGE_LOCATOR = /^obj_[A-Za-z0-9_-]{6,}$/;
const INTENT_ID = /^upl_[A-Za-z0-9_-]{3,}$/;
const EVIDENCE_ID = /^evd_[A-Za-z0-9_-]{3,}$/;
const OBJECT_PATH = /^quarantine\/(upl_[A-Za-z0-9_-]{3,})\/(evd_[A-Za-z0-9_-]{3,})\/(obj_[A-Za-z0-9_-]{6,})$/;
const SHA256 = /^[A-Fa-f0-9]{64}$/;
const GRANT_EXPIRY_SKEW_SECONDS = 5;

export type UserPrincipal = Exclude<Principal, { kind: "anonymous" } | { kind: "service" }>;

export interface PrincipalSource {
  resolve(): Promise<UserPrincipal | null>;
}

export interface EvidenceCaseApplication {
  prepareEvidenceUpload(
    principal: Principal,
    caseId: string,
    command: PrepareEvidenceUploadCommand,
  ): Promise<EvidenceUploadIntent>;
  finalizeEvidenceUpload(
    principal: Principal,
    caseId: string,
    command: FinalizeEvidenceCommand,
  ): Promise<CaseMutationResult>;
  readCase(principal: Principal, caseId: string): Promise<CaseReadModel>;
}

export type ReservedObjectCoordinates = {
  storageLocator: string;
  bucketId: typeof EVIDENCE_BUCKET_ID;
  objectPath: string;
};

export interface OpaqueObjectCoordinateFactory {
  reserve(intent: EvidenceUploadIntent): ReservedObjectCoordinates;
}

export type IntentObjectResolution = {
  intentId: string;
  evidenceId: string;
  caseId: string;
  status: "quarantine" | "finalized" | "expired";
  expiresAt: string;
  storageLocator: string;
  bucketId: typeof EVIDENCE_BUCKET_ID;
  objectPath: string;
  deletedAt: string | null;
};

export type EvidenceObjectResolution = {
  evidenceId: string;
  caseId: string;
  storageLocator: string;
  bucketId: typeof EVIDENCE_BUCKET_ID;
  objectPath: string;
};

export type PendingEvidenceDeletion = {
  storageLocator: string;
  bucketId: typeof EVIDENCE_BUCKET_ID;
  objectPath: string;
  deletionRequestedAt: string;
};

export type ExpiredEvidenceObject = {
  intentId: string;
  storageLocator: string | null;
  objectPath: string | null;
};

export interface EvidenceObjectRegistryPort {
  registerObject(input: {
    intentId: string;
    storageLocator: string;
    objectPath: string;
  }): Promise<void>;
  resolveIntentObject(intentId: string): Promise<IntentObjectResolution | null>;
  resolveReadableEvidenceObject(caseId: string, evidenceId: string): Promise<EvidenceObjectResolution | null>;
  expireIntents(before: string): Promise<ExpiredEvidenceObject[]>;
  listPendingDeletions(limit?: number): Promise<PendingEvidenceDeletion[]>;
  markObjectDeleted(storageLocator: string, deletedAt: string): Promise<void>;
}

export type SignedUploadProviderGrant = {
  token: string;
  expiresAt: string;
};

export type ObjectInspection = {
  mimeType: string;
  byteSize: number;
  checksumSha256: string;
  verifiedAt: string;
};

export type SignedDownloadProviderGrant = {
  url: string;
  expiresAt: string;
};

export interface EvidenceStorageGateway {
  createSignedUploadGrant(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
    upsert: false;
  }): Promise<SignedUploadProviderGrant>;
  inspectAndHashObject(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
  }): Promise<ObjectInspection | null>;
  createSignedDownloadGrant(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
    expiresInSeconds: number;
  }): Promise<SignedDownloadProviderGrant>;
  deleteObject(input: {
    bucketId: typeof EVIDENCE_BUCKET_ID;
    objectPath: string;
  }): Promise<"deleted" | "not_found">;
}

export type PreparedEvidenceUpload = {
  intentId: string;
  evidenceId: string;
  intentExpiresAt: string;
  providerGrantExpiresAt: string;
  bucketId: typeof EVIDENCE_BUCKET_ID;
  objectPath: string;
  uploadToken: string;
  upsert: false;
};

export type CompletedEvidenceUpload = CaseMutationResult;

export type EvidenceDownloadGrant = {
  evidenceId: string;
  url: string;
  expiresAt: string;
};

export type DeleteWorkerFailure = {
  storageLocator: string;
  reason: "provider_error" | "registry_error";
};

export type DeleteWorkerReport = {
  attempted: number;
  confirmedDeleted: number;
  failures: DeleteWorkerFailure[];
};

type ObjectPathParts = {
  intentId: string;
  evidenceId: string;
  storageLocator: string;
};

type DeleteCandidate = {
  storageLocator: string;
  bucketId: typeof EVIDENCE_BUCKET_ID;
  objectPath: string;
  expectedIntentId?: string;
};

function requirePrincipal(principal: UserPrincipal | null): UserPrincipal {
  if (!principal) {
    throw new PersistenceBoundaryError(
      "authentication_required",
      "Se requiere una identidad autenticada para operar evidencia persistida.",
    );
  }
  return principal;
}

function parseObjectPath(objectPath: string): ObjectPathParts | null {
  const match = OBJECT_PATH.exec(objectPath);
  if (!match) return null;
  return {
    intentId: match[1]!,
    evidenceId: match[2]!,
    storageLocator: match[3]!,
  };
}

function assertCoordinates(value: ReservedObjectCoordinates, intent: EvidenceUploadIntent) {
  const parts = parseObjectPath(value.objectPath);
  if (
    value.bucketId !== EVIDENCE_BUCKET_ID ||
    !INTENT_ID.test(intent.intentId) ||
    !EVIDENCE_ID.test(intent.evidenceId) ||
    !STORAGE_LOCATOR.test(value.storageLocator) ||
    !parts ||
    parts.intentId !== intent.intentId ||
    parts.evidenceId !== intent.evidenceId ||
    parts.storageLocator !== value.storageLocator
  ) {
    throw new PersistenceBoundaryError("provider_error", "La reserva de Storage no cumple la relación opaca requerida.");
  }
}

function assertIntentResolution(value: IntentObjectResolution, intentId: string) {
  const parts = parseObjectPath(value.objectPath);
  if (
    value.intentId !== intentId ||
    !INTENT_ID.test(value.intentId) ||
    !EVIDENCE_ID.test(value.evidenceId) ||
    !STORAGE_LOCATOR.test(value.storageLocator) ||
    value.bucketId !== EVIDENCE_BUCKET_ID ||
    Number.isNaN(Date.parse(value.expiresAt)) ||
    (value.deletedAt !== null && Number.isNaN(Date.parse(value.deletedAt))) ||
    !parts ||
    parts.intentId !== value.intentId ||
    parts.evidenceId !== value.evidenceId ||
    parts.storageLocator !== value.storageLocator
  ) {
    throw new PersistenceBoundaryError("provider_error", "El registry devolvió una reserva inconsistente.");
  }
}

function assertEvidenceResolution(value: EvidenceObjectResolution, caseId: string, evidenceId: string) {
  const parts = parseObjectPath(value.objectPath);
  if (
    value.caseId !== caseId ||
    value.evidenceId !== evidenceId ||
    !EVIDENCE_ID.test(value.evidenceId) ||
    value.bucketId !== EVIDENCE_BUCKET_ID ||
    !STORAGE_LOCATOR.test(value.storageLocator) ||
    !parts ||
    parts.evidenceId !== value.evidenceId ||
    parts.storageLocator !== value.storageLocator
  ) {
    throw new PersistenceBoundaryError("provider_error", "El registry devolvió coordenadas físicas inconsistentes.");
  }
}

function assertDeleteCandidate(candidate: DeleteCandidate) {
  const parts = parseObjectPath(candidate.objectPath);
  if (
    !STORAGE_LOCATOR.test(candidate.storageLocator) ||
    candidate.bucketId !== EVIDENCE_BUCKET_ID ||
    !parts ||
    parts.storageLocator !== candidate.storageLocator ||
    (candidate.expectedIntentId !== undefined && parts.intentId !== candidate.expectedIntentId)
  ) {
    throw new PersistenceBoundaryError("provider_error", "Coordenadas de borrado inválidas.");
  }
}

function assertInspection(value: ObjectInspection) {
  if (
    typeof value.mimeType !== "string" ||
    !Number.isInteger(value.byteSize) ||
    value.byteSize <= 0 ||
    !SHA256.test(value.checksumSha256) ||
    Number.isNaN(Date.parse(value.verifiedAt))
  ) {
    throw new PersistenceBoundaryError("provider_error", "La verificación del objeto devolvió metadata inválida.");
  }
}

function assertFutureExpiry(expiresAt: string, now: string, operation: string) {
  const expiryMs = Date.parse(expiresAt);
  const nowMs = Date.parse(now);
  if (Number.isNaN(expiryMs) || Number.isNaN(nowMs) || expiryMs <= nowMs) {
    throw new PersistenceBoundaryError("provider_error", `El proveedor emitió un grant de ${operation} vencido o inválido.`);
  }
}

function assertDownloadExpiry(expiresAt: string, now: string, requestedTtlSeconds: number) {
  assertFutureExpiry(expiresAt, now, "download");
  const maximum = Date.parse(now) + (requestedTtlSeconds + GRANT_EXPIRY_SKEW_SECONDS) * 1000;
  if (Date.parse(expiresAt) > maximum) {
    throw new PersistenceBoundaryError("provider_error", "El proveedor emitió un acceso temporal más largo que el solicitado.");
  }
}

function resolveTtl(requested?: number): number {
  if (requested === undefined) return DEFAULT_DOWNLOAD_TTL_SECONDS;
  if (!Number.isInteger(requested) || requested <= 0 || requested > MAX_DOWNLOAD_TTL_SECONDS) {
    throw new PersistenceBoundaryError(
      "invalid_command",
      `El acceso temporal debe estar entre 1 y ${MAX_DOWNLOAD_TTL_SECONDS} segundos.`,
    );
  }
  return requested;
}

export class EvidenceStorageCoordinator {
  constructor(
    private readonly principals: PrincipalSource,
    private readonly cases: EvidenceCaseApplication,
    private readonly registry: EvidenceObjectRegistryPort,
    private readonly storage: EvidenceStorageGateway,
    private readonly coordinates: OpaqueObjectCoordinateFactory,
    private readonly clock: Clock,
  ) {}

  async prepareUpload(caseId: string, command: PrepareEvidenceUploadCommand): Promise<PreparedEvidenceUpload> {
    const principal = requirePrincipal(await this.principals.resolve());
    const intent = await this.cases.prepareEvidenceUpload(principal, caseId, command);
    const reserved = this.coordinates.reserve(intent);
    assertCoordinates(reserved, intent);

    // Reserve the physical coordinates before issuing a usable upload grant. If signing fails,
    // the quarantined reservation remains discoverable by cleanup instead of becoming untracked.
    await this.registry.registerObject({
      intentId: intent.intentId,
      storageLocator: reserved.storageLocator,
      objectPath: reserved.objectPath,
    });

    const grant = await this.storage.createSignedUploadGrant({
      bucketId: reserved.bucketId,
      objectPath: reserved.objectPath,
      upsert: false,
    });
    if (!grant.token || grant.token.trim() === "") {
      throw new PersistenceBoundaryError("provider_error", "El proveedor no emitió un token de upload válido.");
    }
    assertFutureExpiry(grant.expiresAt, this.clock.now(), "upload");

    return {
      intentId: intent.intentId,
      evidenceId: intent.evidenceId,
      intentExpiresAt: intent.expiresAt,
      providerGrantExpiresAt: grant.expiresAt,
      bucketId: reserved.bucketId,
      objectPath: reserved.objectPath,
      uploadToken: grant.token,
      upsert: false,
    };
  }

  async completeUpload(input: {
    caseId: string;
    intentId: string;
    expectedVersion: number;
    idempotencyKey: string;
  }): Promise<CompletedEvidenceUpload> {
    const principal = requirePrincipal(await this.principals.resolve());

    // Authorize ownership/assignment before privileged physical lookup or object inspection.
    // Finalization authorizes again, intentionally closing TOCTOU changes between read and commit.
    await this.cases.readCase(principal, input.caseId);

    const reserved = await this.registry.resolveIntentObject(input.intentId);
    if (!reserved || reserved.caseId !== input.caseId) {
      throw new PersistenceBoundaryError("evidence_intent_not_found", "No existe una reserva física para este upload intent.");
    }
    assertIntentResolution(reserved, input.intentId);
    if (reserved.status !== "quarantine" || reserved.deletedAt !== null) {
      throw new PersistenceBoundaryError("evidence_intent_not_found", "La reserva ya no está disponible para finalización.");
    }
    if (Date.parse(reserved.expiresAt) <= Date.parse(this.clock.now())) {
      throw new PersistenceBoundaryError("evidence_intent_expired", "El upload intent expiró antes de la finalización.");
    }

    const inspection = await this.storage.inspectAndHashObject({
      bucketId: reserved.bucketId,
      objectPath: reserved.objectPath,
    });
    if (!inspection) {
      throw new PersistenceBoundaryError("evidence_not_found", "El objeto cargado todavía no está disponible para verificación.");
    }
    assertInspection(inspection);

    const receipt: VerifiedUploadReceipt = {
      evidenceId: reserved.evidenceId,
      storageLocator: reserved.storageLocator,
      mimeType: inspection.mimeType,
      byteSize: inspection.byteSize,
      checksumSha256: inspection.checksumSha256,
      verifiedAt: inspection.verifiedAt,
    };

    return this.cases.finalizeEvidenceUpload(principal, input.caseId, {
      idempotencyKey: input.idempotencyKey,
      intentId: input.intentId,
      expectedVersion: input.expectedVersion,
      receipt,
    });
  }

  async createDownloadGrant(input: {
    caseId: string;
    evidenceId: string;
    expiresInSeconds?: number;
  }): Promise<EvidenceDownloadGrant> {
    const ttl = resolveTtl(input.expiresInSeconds);
    const principal = requirePrincipal(await this.principals.resolve());
    const model = await this.cases.readCase(principal, input.caseId);
    const evidence = model.evidence.find((item) => item.evidenceId === input.evidenceId);
    if (!evidence || evidence.lifecycle === "tombstoned") {
      throw new PersistenceBoundaryError("evidence_not_found", "La evidencia no está disponible para descarga.");
    }

    const physical = await this.registry.resolveReadableEvidenceObject(input.caseId, input.evidenceId);
    if (!physical) {
      throw new PersistenceBoundaryError("evidence_not_found", "No existe un objeto físico activo para esta evidencia.");
    }
    assertEvidenceResolution(physical, input.caseId, input.evidenceId);

    const grant = await this.storage.createSignedDownloadGrant({
      bucketId: physical.bucketId,
      objectPath: physical.objectPath,
      expiresInSeconds: ttl,
    });
    if (!grant.url || grant.url.trim() === "") {
      throw new PersistenceBoundaryError("provider_error", "El proveedor no emitió un acceso temporal válido.");
    }
    assertDownloadExpiry(grant.expiresAt, this.clock.now(), ttl);

    return {
      evidenceId: input.evidenceId,
      url: grant.url,
      expiresAt: grant.expiresAt,
    };
  }
}

export class EvidenceDeletionWorker {
  constructor(
    private readonly registry: EvidenceObjectRegistryPort,
    private readonly storage: EvidenceStorageGateway,
    private readonly clock: Clock,
  ) {}

  async cleanupExpiredIntents(before = this.clock.now()): Promise<DeleteWorkerReport> {
    const expired = await this.registry.expireIntents(before);
    const candidates = expired
      .filter((item): item is ExpiredEvidenceObject & { storageLocator: string; objectPath: string } =>
        Boolean(item.storageLocator && item.objectPath),
      )
      .map((item) => ({
        storageLocator: item.storageLocator,
        bucketId: EVIDENCE_BUCKET_ID,
        objectPath: item.objectPath,
        expectedIntentId: item.intentId,
      }));
    return this.deleteCandidates(candidates);
  }

  async cleanupRequestedDeletions(limit = 100): Promise<DeleteWorkerReport> {
    const candidates = await this.registry.listPendingDeletions(limit);
    return this.deleteCandidates(candidates);
  }

  private async deleteCandidates(candidates: DeleteCandidate[]): Promise<DeleteWorkerReport> {
    const failures: DeleteWorkerFailure[] = [];
    let confirmedDeleted = 0;

    for (const candidate of candidates) {
      try {
        assertDeleteCandidate(candidate);
        await this.storage.deleteObject({
          bucketId: candidate.bucketId,
          objectPath: candidate.objectPath,
        });
      } catch {
        failures.push({ storageLocator: candidate.storageLocator, reason: "provider_error" });
        continue;
      }

      try {
        await this.registry.markObjectDeleted(candidate.storageLocator, this.clock.now());
        confirmedDeleted += 1;
      } catch {
        failures.push({ storageLocator: candidate.storageLocator, reason: "registry_error" });
      }
    }

    return {
      attempted: candidates.length,
      confirmedDeleted,
      failures,
    };
  }
}
