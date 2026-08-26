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
const SAFE_OBJECT_PATH = /^quarantine\/upl_[A-Za-z0-9_-]{3,}\/evd_[A-Za-z0-9_-]{3,}\/obj_[A-Za-z0-9_-]{6,}$/;
const SHA256 = /^[A-Fa-f0-9]{64}$/;

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

function requirePrincipal(principal: UserPrincipal | null): UserPrincipal {
  if (!principal) {
    throw new PersistenceBoundaryError(
      "authentication_required",
      "Se requiere una identidad autenticada para operar evidencia persistida.",
    );
  }
  return principal;
}

function assertCoordinates(value: ReservedObjectCoordinates) {
  if (value.bucketId !== EVIDENCE_BUCKET_ID) {
    throw new PersistenceBoundaryError("provider_error", "La reserva de Storage devolvió un bucket inválido.");
  }
  if (!STORAGE_LOCATOR.test(value.storageLocator) || !SAFE_OBJECT_PATH.test(value.objectPath)) {
    throw new PersistenceBoundaryError("provider_error", "La reserva de Storage no cumple el formato opaco requerido.");
  }
}

function assertIntentResolution(value: IntentObjectResolution, intentId: string) {
  if (
    value.intentId !== intentId ||
    !INTENT_ID.test(value.intentId) ||
    !EVIDENCE_ID.test(value.evidenceId) ||
    !STORAGE_LOCATOR.test(value.storageLocator) ||
    value.bucketId !== EVIDENCE_BUCKET_ID ||
    !SAFE_OBJECT_PATH.test(value.objectPath)
  ) {
    throw new PersistenceBoundaryError("provider_error", "El registry devolvió una reserva inconsistente.");
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
    assertCoordinates(reserved);

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
    if (!grant.token || Number.isNaN(Date.parse(grant.expiresAt))) {
      throw new PersistenceBoundaryError("provider_error", "El proveedor no emitió un grant de upload válido.");
    }

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
    const principal = requirePrincipal(await this.principals.resolve());
    const model = await this.cases.readCase(principal, input.caseId);
    const evidence = model.evidence.find((item) => item.evidenceId === input.evidenceId);
    if (!evidence || evidence.lifecycle === "tombstoned") {
      throw new PersistenceBoundaryError("evidence_not_found", "La evidencia no está disponible para descarga.");
    }

    const physical = await this.registry.resolveReadableEvidenceObject(input.caseId, input.evidenceId);
    if (!physical || physical.caseId !== input.caseId || physical.evidenceId !== input.evidenceId) {
      throw new PersistenceBoundaryError("evidence_not_found", "No existe un objeto físico activo para esta evidencia.");
    }
    if (
      physical.bucketId !== EVIDENCE_BUCKET_ID ||
      !STORAGE_LOCATOR.test(physical.storageLocator) ||
      !SAFE_OBJECT_PATH.test(physical.objectPath)
    ) {
      throw new PersistenceBoundaryError("provider_error", "El registry devolvió coordenadas físicas inválidas.");
    }

    const ttl = resolveTtl(input.expiresInSeconds);
    const grant = await this.storage.createSignedDownloadGrant({
      bucketId: physical.bucketId,
      objectPath: physical.objectPath,
      expiresInSeconds: ttl,
    });
    if (!grant.url || Number.isNaN(Date.parse(grant.expiresAt))) {
      throw new PersistenceBoundaryError("provider_error", "El proveedor no emitió un acceso temporal válido.");
    }

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
      }));
    return this.deleteCandidates(candidates);
  }

  async cleanupRequestedDeletions(limit = 100): Promise<DeleteWorkerReport> {
    const candidates = await this.registry.listPendingDeletions(limit);
    return this.deleteCandidates(candidates);
  }

  private async deleteCandidates(
    candidates: Array<{ storageLocator: string; bucketId: typeof EVIDENCE_BUCKET_ID; objectPath: string }>,
  ): Promise<DeleteWorkerReport> {
    const failures: DeleteWorkerFailure[] = [];
    let confirmedDeleted = 0;

    for (const candidate of candidates) {
      try {
        if (
          !STORAGE_LOCATOR.test(candidate.storageLocator) ||
          candidate.bucketId !== EVIDENCE_BUCKET_ID ||
          !SAFE_OBJECT_PATH.test(candidate.objectPath)
        ) {
          throw new PersistenceBoundaryError("provider_error", "Coordenadas de borrado inválidas.");
        }
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
