import {
  PersistenceBoundaryError,
  type AppendJournalInput,
  type AppendJournalResult,
  type CasePersistencePort,
  type CreatePersistedCaseInput,
  type CreatePersistedCaseResult,
  type DataAuthorizationRecord,
  type EvidenceUploadIntent,
  type FinalizeEvidenceAtomicInput,
  type GrantAuthorizationAtomicInput,
  type PersistedCaseSnapshot,
  type Principal,
} from "./contracts";

export type SupabaseRpcError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

export interface SupabaseRpcClient {
  rpc<T = unknown>(
    functionName: string,
    args?: Record<string, unknown>,
  ): Promise<{ data: T | null; error: SupabaseRpcError | null }>;
}

const KNOWN_BOUNDARY_CODES = new Set([
  "authentication_required",
  "forbidden",
  "case_not_found",
  "invalid_subject_ref",
  "invalid_identifier",
  "invalid_command",
  "reserved_operation",
  "invalid_external_recording",
  "version_conflict",
  "idempotency_conflict",
  "duplicate_event_id",
  "duplicate_sequence",
  "data_authorization_required",
  "data_authorization_subject_mismatch",
  "evidence_intent_not_found",
  "evidence_intent_expired",
  "evidence_receipt_mismatch",
  "invalid_evidence_reference",
  "unsafe_persistence_material",
  "evidence_not_found",
  "evidence_on_legal_hold",
] as const);

type KnownBoundaryCode = (typeof KNOWN_BOUNDARY_CODES extends Set<infer T> ? T : never) & string;

type PersistMutationEnvelope<TKind extends "created" | "duplicate" | "appended"> = {
  kind: TKind;
  snapshot: PersistedCaseSnapshot;
};

type PersistCreateEnvelope = PersistMutationEnvelope<"created" | "duplicate">;
type PersistAppendEnvelope = PersistMutationEnvelope<"appended" | "duplicate">;

export type ExpiredEvidenceObject = {
  intentId: string;
  storageLocator: string | null;
  objectPath: string | null;
};

export type RegisteredEvidenceObject = {
  intentId: string;
  storageLocator: string;
  objectPath: string;
};

export type ResolvedSupabasePrincipal = Exclude<Principal, { kind: "anonymous" } | { kind: "service" }>;

function requireData<T>(data: T | null, operation: string): T {
  if (data === null) {
    throw providerError(operation, "El proveedor no devolvió el payload esperado.");
  }
  return data;
}

function providerError(operation: string, publicMessage?: string): PersistenceBoundaryError {
  return new PersistenceBoundaryError(
    "provider_error",
    publicMessage ?? `La operación ${operation} no pudo completarse en el proveedor de persistencia.`,
  );
}

function parseBoundaryCode(message: string): KnownBoundaryCode | null {
  const match = message.match(/(?:^|\s)vivienda:([a-z_]+)/i);
  if (!match) return null;
  const candidate = match[1];
  return KNOWN_BOUNDARY_CODES.has(candidate as KnownBoundaryCode)
    ? (candidate as KnownBoundaryCode)
    : null;
}

function throwRpcError(operation: string, error: SupabaseRpcError): never {
  const code = parseBoundaryCode(error.message);
  if (code) {
    throw new PersistenceBoundaryError(code, `La operación ${operation} fue rechazada por una regla de persistencia.`);
  }
  throw providerError(operation);
}

function cloneSnapshot(snapshot: PersistedCaseSnapshot): PersistedCaseSnapshot {
  return {
    caseId: snapshot.caseId,
    access: {
      ownerSubjectRef: snapshot.access.ownerSubjectRef,
      assignedLawyerSubjectRefs: [...snapshot.access.assignedLawyerSubjectRefs],
    },
    journal: snapshot.journal.map((record) => ({
      ...record,
      event: {
        ...record.event,
        actor: { ...record.event.actor },
        payload: { ...record.event.payload },
        ...(record.event.evidenceRefs ? { evidenceRefs: [...record.event.evidenceRefs] } : {}),
      } as typeof record.event,
    })),
    dataAuthorizations: snapshot.dataAuthorizations.map((authorization) => ({
      ...authorization,
      purposes: [...authorization.purposes],
    })),
    evidence: snapshot.evidence.map((item) => ({ ...item })),
  };
}

function assertSnapshot(value: unknown, operation: string): PersistedCaseSnapshot {
  if (!value || typeof value !== "object") throw providerError(operation);
  const candidate = value as Partial<PersistedCaseSnapshot>;
  if (
    typeof candidate.caseId !== "string" ||
    !candidate.access ||
    !Array.isArray(candidate.journal) ||
    !Array.isArray(candidate.dataAuthorizations) ||
    !Array.isArray(candidate.evidence)
  ) {
    throw providerError(operation);
  }
  return cloneSnapshot(candidate as PersistedCaseSnapshot);
}

function assertCreateEnvelope(value: unknown): PersistCreateEnvelope {
  if (!value || typeof value !== "object") throw providerError("createCaseAtomic");
  const candidate = value as { kind?: unknown; snapshot?: unknown };
  if (candidate.kind !== "created" && candidate.kind !== "duplicate") {
    throw providerError("createCaseAtomic");
  }
  return { kind: candidate.kind, snapshot: assertSnapshot(candidate.snapshot, "createCaseAtomic") };
}

function assertAppendEnvelope(value: unknown, operation: string): PersistAppendEnvelope {
  if (!value || typeof value !== "object") throw providerError(operation);
  const candidate = value as { kind?: unknown; snapshot?: unknown };
  if (candidate.kind !== "appended" && candidate.kind !== "duplicate") {
    throw providerError(operation);
  }
  return { kind: candidate.kind, snapshot: assertSnapshot(candidate.snapshot, operation) };
}

function toProviderAuthorization(value: DataAuthorizationRecord): Record<string, unknown> {
  return {
    authorizationId: value.authorizationId,
    caseId: value.caseId,
    subjectRef: value.subjectRef,
    consentVersion: value.consentVersion,
    purposes: [...value.purposes],
    status: value.status,
    grantedAt: value.grantedAt,
    revokedAt: value.revokedAt,
    revokedReason: value.revokedReason,
  };
}

export class SupabaseCasePersistenceAdapter implements CasePersistencePort {
  constructor(private readonly client: SupabaseRpcClient) {}

  async createCaseAtomic(input: CreatePersistedCaseInput): Promise<CreatePersistedCaseResult> {
    const { data, error } = await this.client.rpc<unknown>("vivienda_persist_create_case", {
      p_case_id: input.caseId,
      p_owner_subject_ref: input.ownerSubjectRef,
      p_creation_idempotency_key: input.creationIdempotencyKey,
      p_creation_fingerprint: input.creationFingerprint,
      p_first_record: input.firstRecord,
    });
    if (error) throwRpcError("createCaseAtomic", error);
    const envelope = assertCreateEnvelope(requireData(data, "createCaseAtomic"));
    return envelope.kind === "created"
      ? { kind: "created", snapshot: envelope.snapshot }
      : { kind: "duplicate", snapshot: envelope.snapshot };
  }

  async loadCase(caseId: string): Promise<PersistedCaseSnapshot | null> {
    const { data, error } = await this.client.rpc<unknown>("vivienda_persist_load_case", {
      p_case_id: caseId,
    });
    if (error) throwRpcError("loadCase", error);
    return data === null ? null : assertSnapshot(data, "loadCase");
  }

  async appendJournalAtomic(input: AppendJournalInput): Promise<AppendJournalResult> {
    const { data, error } = await this.client.rpc<unknown>("vivienda_persist_append_journal", {
      p_case_id: input.caseId,
      p_expected_version: input.expectedVersion,
      p_record: input.record,
    });
    if (error) throwRpcError("appendJournalAtomic", error);
    const envelope = assertAppendEnvelope(requireData(data, "appendJournalAtomic"), "appendJournalAtomic");
    return envelope.kind === "appended"
      ? { kind: "appended", snapshot: envelope.snapshot }
      : { kind: "duplicate", snapshot: envelope.snapshot };
  }

  async assignLawyer(caseId: string, lawyerSubjectRef: string): Promise<void> {
    const { error } = await this.client.rpc("vivienda_persist_assign_lawyer", {
      p_case_id: caseId,
      p_lawyer_subject_ref: lawyerSubjectRef,
    });
    if (error) throwRpcError("assignLawyer", error);
  }

  async grantDataAuthorizationAtomic(input: GrantAuthorizationAtomicInput): Promise<AppendJournalResult> {
    const { data, error } = await this.client.rpc<unknown>("vivienda_persist_grant_data_authorization", {
      p_case_id: input.caseId,
      p_expected_version: input.expectedVersion,
      p_record: input.record,
      p_authorization: toProviderAuthorization(input.authorization),
    });
    if (error) throwRpcError("grantDataAuthorizationAtomic", error);
    const envelope = assertAppendEnvelope(
      requireData(data, "grantDataAuthorizationAtomic"),
      "grantDataAuthorizationAtomic",
    );
    return envelope.kind === "appended"
      ? { kind: "appended", snapshot: envelope.snapshot }
      : { kind: "duplicate", snapshot: envelope.snapshot };
  }

  async revokeDataAuthorization(
    caseId: string,
    subjectRef: string,
    revokedAt: string,
    reason: string,
  ): Promise<void> {
    const { error } = await this.client.rpc("vivienda_persist_revoke_data_authorization", {
      p_case_id: caseId,
      p_subject_ref: subjectRef,
      p_revoked_at: revokedAt,
      p_reason: reason,
    });
    if (error) throwRpcError("revokeDataAuthorization", error);
  }

  async createEvidenceIntent(intent: EvidenceUploadIntent): Promise<void> {
    const { error } = await this.client.rpc("vivienda_persist_create_evidence_intent", {
      p_intent: { ...intent },
    });
    if (error) throwRpcError("createEvidenceIntent", error);
  }

  async loadEvidenceIntent(intentId: string): Promise<EvidenceUploadIntent | null> {
    const { data, error } = await this.client.rpc<EvidenceUploadIntent>("vivienda_persist_load_evidence_intent", {
      p_intent_id: intentId,
    });
    if (error) throwRpcError("loadEvidenceIntent", error);
    return data ? { ...data } : null;
  }

  async finalizeEvidenceAtomic(input: FinalizeEvidenceAtomicInput): Promise<AppendJournalResult> {
    const { data, error } = await this.client.rpc<unknown>("vivienda_persist_finalize_evidence", {
      p_case_id: input.caseId,
      p_expected_version: input.expectedVersion,
      p_intent_id: input.intentId,
      p_metadata: input.metadata,
      p_record: input.record,
    });
    if (error) throwRpcError("finalizeEvidenceAtomic", error);
    const envelope = assertAppendEnvelope(requireData(data, "finalizeEvidenceAtomic"), "finalizeEvidenceAtomic");
    return envelope.kind === "appended"
      ? { kind: "appended", snapshot: envelope.snapshot }
      : { kind: "duplicate", snapshot: envelope.snapshot };
  }

  async tombstoneEvidence(caseId: string, evidenceId: string, at: string, reason: string): Promise<void> {
    const { error } = await this.client.rpc("vivienda_persist_tombstone_evidence", {
      p_case_id: caseId,
      p_evidence_id: evidenceId,
      p_at: at,
      p_reason: reason,
    });
    if (error) throwRpcError("tombstoneEvidence", error);
  }
}

export class SupabaseEvidenceObjectRegistry {
  constructor(private readonly client: SupabaseRpcClient) {}

  async registerObject(input: RegisteredEvidenceObject): Promise<void> {
    const { error } = await this.client.rpc("vivienda_persist_register_evidence_object", {
      p_intent_id: input.intentId,
      p_storage_locator: input.storageLocator,
      p_object_path: input.objectPath,
    });
    if (error) throwRpcError("registerEvidenceObject", error);
  }

  async expireIntents(before: string): Promise<ExpiredEvidenceObject[]> {
    const { data, error } = await this.client.rpc<Array<{
      intent_id?: string;
      storage_locator?: string | null;
      object_path?: string | null;
      intentId?: string;
      storageLocator?: string | null;
      objectPath?: string | null;
    }>>("vivienda_persist_expire_evidence_intents", {
      p_before: before,
    });
    if (error) throwRpcError("expireEvidenceIntents", error);

    return (data ?? []).map((item) => ({
      intentId: item.intentId ?? item.intent_id ?? "",
      storageLocator: item.storageLocator ?? item.storage_locator ?? null,
      objectPath: item.objectPath ?? item.object_path ?? null,
    }));
  }

  async markOrphanObjectDeleted(storageLocator: string, deletedAt: string): Promise<void> {
    const { error } = await this.client.rpc("vivienda_persist_mark_orphan_object_deleted", {
      p_storage_locator: storageLocator,
      p_deleted_at: deletedAt,
    });
    if (error) throwRpcError("markOrphanObjectDeleted", error);
  }
}

export class SupabasePrincipalResolver {
  constructor(private readonly userScopedClient: SupabaseRpcClient) {}

  async resolve(): Promise<ResolvedSupabasePrincipal | null> {
    const { data, error } = await this.userScopedClient.rpc<{ subjectRef?: string; kind?: string }>(
      "vivienda_resolve_principal",
    );
    if (error) throwRpcError("resolvePrincipal", error);
    if (!data) return null;
    if (
      typeof data.subjectRef !== "string" ||
      (data.kind !== "client" && data.kind !== "lawyer" && data.kind !== "admin")
    ) {
      throw providerError("resolvePrincipal");
    }
    return { kind: data.kind, subjectRef: data.subjectRef };
  }
}
