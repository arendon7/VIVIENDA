import { PersistenceBoundaryError } from "@/domain/persistence-boundary/contracts";
import {
  SupabaseEvidenceObjectRegistry,
  type SupabaseRpcClient,
  type SupabaseRpcError,
} from "@/domain/persistence-boundary/supabase-adapter";
import {
  EVIDENCE_BUCKET_ID,
  type EvidenceObjectRegistryPort,
  type EvidenceObjectResolution,
  type IntentObjectResolution,
  type PendingEvidenceDeletion,
} from "./coordinator";

function providerError(operation: string): PersistenceBoundaryError {
  return new PersistenceBoundaryError(
    "provider_error",
    `La operación ${operation} no pudo completarse en el registry de evidencia.`,
  );
}

function throwRpcError(operation: string, _error: SupabaseRpcError): never {
  // Deliberately do not propagate SQL/provider message, details or hints to the caller.
  throw providerError(operation);
}

function firstRow<T>(data: T[] | T | null): T | null {
  if (data === null) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
}

function stringValue(row: Record<string, unknown>, camel: string, snake: string): string | null {
  const value = row[camel] ?? row[snake];
  return typeof value === "string" ? value : null;
}

export class SupabaseStorageCoordinationRegistry implements EvidenceObjectRegistryPort {
  private readonly base: SupabaseEvidenceObjectRegistry;

  constructor(private readonly client: SupabaseRpcClient) {
    this.base = new SupabaseEvidenceObjectRegistry(client);
  }

  registerObject(input: { intentId: string; storageLocator: string; objectPath: string }): Promise<void> {
    return this.base.registerObject(input);
  }

  expireIntents(before: string) {
    return this.base.expireIntents(before);
  }

  async listPendingDeletions(limit?: number): Promise<PendingEvidenceDeletion[]> {
    const rows = await this.base.listPendingDeletions(limit);
    return rows.map((row) => {
      if (row.bucketId !== EVIDENCE_BUCKET_ID) {
        throw providerError("listPendingDeletions");
      }
      return {
        storageLocator: row.storageLocator,
        bucketId: EVIDENCE_BUCKET_ID,
        objectPath: row.objectPath,
        deletionRequestedAt: row.deletionRequestedAt,
      };
    });
  }

  markObjectDeleted(storageLocator: string, deletedAt: string) {
    return this.base.markObjectDeleted(storageLocator, deletedAt);
  }

  async resolveIntentObject(intentId: string): Promise<IntentObjectResolution | null> {
    const { data, error } = await this.client.rpc<unknown>("vivienda_persist_resolve_intent_object", {
      p_intent_id: intentId,
    });
    if (error) throwRpcError("resolveIntentObject", error);
    const raw = firstRow(data as Record<string, unknown>[] | Record<string, unknown> | null);
    if (!raw) return null;

    const row = raw as Record<string, unknown>;
    const resolvedIntentId = stringValue(row, "intentId", "intent_id");
    const evidenceId = stringValue(row, "evidenceId", "evidence_id");
    const caseId = stringValue(row, "caseId", "case_id");
    const status = stringValue(row, "status", "status");
    const expiresAt = stringValue(row, "expiresAt", "expires_at");
    const storageLocator = stringValue(row, "storageLocator", "storage_locator");
    const bucketId = stringValue(row, "bucketId", "bucket_id");
    const objectPath = stringValue(row, "objectPath", "object_path");
    const deletedRaw = row.deletedAt ?? row.deleted_at ?? null;
    const deletedAt = deletedRaw === null ? null : typeof deletedRaw === "string" ? deletedRaw : undefined;

    if (
      !resolvedIntentId ||
      !evidenceId ||
      !caseId ||
      (status !== "quarantine" && status !== "finalized" && status !== "expired") ||
      !expiresAt ||
      !storageLocator ||
      bucketId !== EVIDENCE_BUCKET_ID ||
      !objectPath ||
      deletedAt === undefined
    ) {
      throw providerError("resolveIntentObject");
    }

    return {
      intentId: resolvedIntentId,
      evidenceId,
      caseId,
      status,
      expiresAt,
      storageLocator,
      bucketId: EVIDENCE_BUCKET_ID,
      objectPath,
      deletedAt,
    };
  }

  async resolveReadableEvidenceObject(
    caseId: string,
    evidenceId: string,
  ): Promise<EvidenceObjectResolution | null> {
    const { data, error } = await this.client.rpc<unknown>(
      "vivienda_persist_resolve_readable_evidence_object",
      {
        p_case_id: caseId,
        p_evidence_id: evidenceId,
      },
    );
    if (error) throwRpcError("resolveReadableEvidenceObject", error);
    const raw = firstRow(data as Record<string, unknown>[] | Record<string, unknown> | null);
    if (!raw) return null;

    const row = raw as Record<string, unknown>;
    const resolvedEvidenceId = stringValue(row, "evidenceId", "evidence_id");
    const resolvedCaseId = stringValue(row, "caseId", "case_id");
    const storageLocator = stringValue(row, "storageLocator", "storage_locator");
    const bucketId = stringValue(row, "bucketId", "bucket_id");
    const objectPath = stringValue(row, "objectPath", "object_path");

    if (
      !resolvedEvidenceId ||
      !resolvedCaseId ||
      !storageLocator ||
      bucketId !== EVIDENCE_BUCKET_ID ||
      !objectPath
    ) {
      throw providerError("resolveReadableEvidenceObject");
    }

    return {
      evidenceId: resolvedEvidenceId,
      caseId: resolvedCaseId,
      storageLocator,
      bucketId: EVIDENCE_BUCKET_ID,
      objectPath,
    };
  }
}
