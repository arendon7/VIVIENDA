import { createHash } from "node:crypto";
import {
  appendCaseEvent,
  replayCaseHistory,
  type CaseActor,
  type CaseEvent,
  type CaseEventDraft,
} from "@/domain/case-state/machine";
import {
  PersistenceBoundaryError,
  isAuthenticated,
  principalActorKind,
  type AppendCaseEventCommand,
  type AuthenticatedPrincipal,
  type CaseJournalRecord,
  type CasePersistencePort,
  type CaseReadModel,
  type CaseTimelineEvent,
  type Clock,
  type CreateCaseCommand,
  type DataAuthorizationRecord,
  type EvidenceKind,
  type EvidenceMetadata,
  type EvidenceUploadIntent,
  type FinalizeEvidenceCommand,
  type GrantDataAuthorizationCommand,
  type IdGenerator,
  type LegalDataCategory,
  type PersistedCaseSnapshot,
  type PrepareEvidenceUploadCommand,
  type Principal,
  type PrivacyPurpose,
  type SecurityTier,
} from "./contracts";

const SUBJECT_REF = /^(?:sub|svc)_[A-Za-z0-9_-]{3,}$/;
const OPAQUE_EVIDENCE_REF = /^evd_[A-Za-z0-9_-]{3,}$/;
const OPAQUE_STORAGE_LOCATOR = /^obj_[A-Za-z0-9_-]{6,}$/;
const SHA256 = /^[a-f0-9]{64}$/i;
const SAFE_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX_EVIDENCE_BYTES = 25 * 1024 * 1024;
const EVIDENCE_TREATMENT_PURPOSES = new Set<PrivacyPurpose>([
  "mortgage_analysis",
  "case_management",
  "legal_service",
]);
const EXTERNAL_RECORDABLE = new Set<CaseEventDraft["type"]>(["RESPONSE_RECORDED", "RESOLUTION_RECORDED"]);
const RESERVED_GENERIC_OPERATIONS = new Set<CaseEventDraft["type"]>([
  "DATA_AUTHORIZATION_RECORDED",
  "EVIDENCE_ATTACHED",
]);

const FORBIDDEN_PERSISTENCE_KEYS = new Set([
  "email",
  "phone",
  "telephone",
  "cedula",
  "documentnumber",
  "fullname",
  "originalfilename",
  "filename",
  "url",
  "base64",
  "bytes",
  "ocrtext",
  "address",
]);

export type CaseMutationResult = {
  kind: "appended" | "duplicate" | "created";
  model: CaseReadModel;
};

function requireAuthenticated(principal: Principal): AuthenticatedPrincipal {
  if (!isAuthenticated(principal)) {
    throw new PersistenceBoundaryError(
      "authentication_required",
      "Se requiere una identidad autenticada para persistir o leer un expediente.",
    );
  }
  assertSubjectRef(principal.subjectRef);
  return principal;
}

function assertSubjectRef(subjectRef: string) {
  if (!SUBJECT_REF.test(subjectRef)) {
    throw new PersistenceBoundaryError("invalid_subject_ref", "subjectRef debe ser un identificador interno opaco.");
  }
}

function assertNonBlank(value: string, label: string) {
  if (value.trim() === "") {
    throw new PersistenceBoundaryError("invalid_command", `${label} no puede estar vacío.`);
  }
}

function assertIdempotencyKey(value: string) {
  assertNonBlank(value, "idempotencyKey");
  if (value.length > 200) {
    throw new PersistenceBoundaryError("invalid_command", "idempotencyKey excede el tamaño permitido.");
  }
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableNormalize(item)]),
    );
  }
  return value;
}

function semanticFingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableNormalize(value))).digest("hex");
}

function assertPersistenceSafe(value: unknown, path = "payload") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^data:/i.test(trimmed) || /^https?:\/\//i.test(trimmed)) {
      throw new PersistenceBoundaryError("unsafe_persistence_material", `${path} no puede contener URLs o data URIs.`);
    }
    if (/\b[^\s/\\]+\.(?:pdf|png|jpe?g)\b/i.test(trimmed)) {
      throw new PersistenceBoundaryError("unsafe_persistence_material", `${path} no puede almacenar filenames de usuario.`);
    }
    if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(trimmed)) {
      throw new PersistenceBoundaryError("unsafe_persistence_material", `${path} no puede almacenar emails directos.`);
    }
    if (trimmed.length > 256 && /^[A-Za-z0-9+/=\r\n]+$/.test(trimmed)) {
      throw new PersistenceBoundaryError("unsafe_persistence_material", `${path} parece contener material base64.`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertPersistenceSafe(item, `${path}[${index}]`));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const normalizedKey = key.replace(/[_-]/g, "").toLowerCase();
      if (FORBIDDEN_PERSISTENCE_KEYS.has(normalizedKey)) {
        throw new PersistenceBoundaryError("unsafe_persistence_material", `${path}.${key} no pertenece al Case Log.`);
      }
      assertPersistenceSafe(item, `${path}.${key}`);
    }
  }
}

function assertOpaqueEvidenceRefs(evidenceRefs: readonly string[] | undefined) {
  for (const ref of evidenceRefs ?? []) {
    if (!OPAQUE_EVIDENCE_REF.test(ref)) {
      throw new PersistenceBoundaryError(
        "invalid_evidence_reference",
        "evidenceRefs solo puede contener IDs opacos evd_*; no paths, URLs ni filenames.",
      );
    }
  }
}

function assertSecurityClassification(category: LegalDataCategory, tier: SecurityTier) {
  if (category === "sensitive" && tier !== "highly_restricted") {
    throw new PersistenceBoundaryError(
      "invalid_command",
      "Los datos clasificados como sensitive requieren securityTier highly_restricted.",
    );
  }
  if (
    (category === "financial_credit_semiprivate" || category === "private") &&
    tier !== "restricted" &&
    tier !== "highly_restricted"
  ) {
    throw new PersistenceBoundaryError("invalid_command", `${category} requiere securityTier restricted o highly_restricted.`);
  }
  if (category === "personal" && tier === "open") {
    throw new PersistenceBoundaryError("invalid_command", "Los datos personales no pueden usar securityTier open.");
  }
}

function displayNameFor(kind: EvidenceKind): string {
  switch (kind) {
    case "statement":
      return "Extracto hipotecario";
    case "contract":
      return "Contrato del crédito";
    case "bank_response":
      return "Respuesta de la entidad";
    case "filing_proof":
      return "Constancia de radicación";
    case "authority":
      return "Autorización o poder";
    case "court_document":
      return "Documento judicial";
    case "other":
      return "Documento de soporte";
  }
}

function ensureServiceScope(
  principal: AuthenticatedPrincipal,
  scope: "case:read" | "case:append_system" | "case:record_external",
) {
  if (principal.kind === "service" && !principal.scopes.includes(scope)) {
    throw new PersistenceBoundaryError("forbidden", `El service principal requiere scope ${scope}.`);
  }
}

function canAccessCase(principal: AuthenticatedPrincipal, snapshot: PersistedCaseSnapshot): boolean {
  switch (principal.kind) {
    case "client":
      return snapshot.access.ownerSubjectRef === principal.subjectRef;
    case "lawyer":
      return snapshot.access.assignedLawyerSubjectRefs.includes(principal.subjectRef);
    case "admin":
      return true;
    case "service":
      return principal.scopes.includes("case:read");
  }
}

function assertCaseAccess(principal: AuthenticatedPrincipal, snapshot: PersistedCaseSnapshot) {
  if (!canAccessCase(principal, snapshot)) {
    throw new PersistenceBoundaryError("forbidden", "La identidad autenticada no tiene acceso a este expediente.");
  }
}

function actorFor(principal: AuthenticatedPrincipal, recordAsExternal: boolean): CaseActor {
  if (recordAsExternal) return { kind: "external_recorded" };
  return { kind: principalActorKind(principal), actorId: principal.subjectRef };
}

function sanitizeTimelineEvent(event: CaseEvent): CaseTimelineEvent {
  return {
    ...event,
    actor: { kind: event.actor.kind },
    payload: { ...event.payload },
    ...(event.evidenceRefs ? { evidenceRefs: [...event.evidenceRefs] } : {}),
  } as CaseTimelineEvent;
}

function modelFromSnapshot(snapshot: PersistedCaseSnapshot): CaseReadModel {
  const projection = replayCaseHistory(snapshot.journal.map((item) => item.event));
  return {
    caseId: snapshot.caseId,
    projection,
    timeline: snapshot.journal.map((record) => sanitizeTimelineEvent(record.event)),
    dataAuthorizations: snapshot.dataAuthorizations.map(({ subjectRef: _subjectRef, ...item }) => ({
      ...item,
      purposes: [...item.purposes],
    })),
    evidence: snapshot.evidence.map(
      ({ storageLocator: _storageLocator, checksumSha256: _checksumSha256, createdBySubjectRef: _createdBySubjectRef, ...item }) => ({
        ...item,
      }),
    ),
  };
}

function duplicateFor(
  snapshot: PersistedCaseSnapshot,
  idempotencyKey: string,
  fingerprint: string,
): CaseMutationResult | null {
  const existing = snapshot.journal.find((item) => item.event.idempotencyKey === idempotencyKey);
  if (!existing) return null;
  if (existing.semanticFingerprint !== fingerprint) {
    throw new PersistenceBoundaryError(
      "idempotency_conflict",
      "La misma idempotencyKey fue reutilizada con semántica diferente.",
    );
  }
  return { kind: "duplicate", model: modelFromSnapshot(snapshot) };
}

function recordEnvelope(
  event: CaseEvent,
  principal: AuthenticatedPrincipal,
  fingerprint: string,
  storedAt: string,
  ids: IdGenerator,
): CaseJournalRecord {
  return {
    event,
    recordedBySubjectRef: principal.subjectRef,
    recordedByPrincipalKind: principal.kind,
    requestId: ids.next("req"),
    semanticFingerprint: fingerprint,
    storedAt,
  };
}

function validateReceipt(command: FinalizeEvidenceCommand) {
  const { receipt } = command;
  if (!OPAQUE_STORAGE_LOCATOR.test(receipt.storageLocator)) {
    throw new PersistenceBoundaryError("evidence_receipt_mismatch", "storageLocator debe ser un identificador opaco obj_*.");
  }
  if (!SAFE_MIME_TYPES.has(receipt.mimeType)) {
    throw new PersistenceBoundaryError("evidence_receipt_mismatch", "MIME no permitido para evidencia v0.6.");
  }
  if (!Number.isInteger(receipt.byteSize) || receipt.byteSize <= 0 || receipt.byteSize > MAX_EVIDENCE_BYTES) {
    throw new PersistenceBoundaryError("evidence_receipt_mismatch", "byteSize de evidencia está fuera del rango permitido.");
  }
  if (!SHA256.test(receipt.checksumSha256)) {
    throw new PersistenceBoundaryError(
      "evidence_receipt_mismatch",
      "checksumSha256 debe contener 64 caracteres hexadecimales.",
    );
  }
  if (Number.isNaN(Date.parse(receipt.verifiedAt))) {
    throw new PersistenceBoundaryError("evidence_receipt_mismatch", "verifiedAt debe ser una fecha válida.");
  }
}

function activeDataAuthorization(snapshot: PersistedCaseSnapshot): DataAuthorizationRecord | null {
  for (let index = snapshot.dataAuthorizations.length - 1; index >= 0; index -= 1) {
    const item = snapshot.dataAuthorizations[index];
    if (item?.status === "active") return item;
  }
  return null;
}

function assertEvidenceTreatmentAuthorization(snapshot: PersistedCaseSnapshot): DataAuthorizationRecord {
  const authorization = activeDataAuthorization(snapshot);
  if (!authorization) {
    throw new PersistenceBoundaryError(
      "data_authorization_required",
      "La evidencia no puede persistirse sin una autorización de tratamiento activa para el expediente.",
    );
  }
  if (!authorization.purposes.some((purpose) => EVIDENCE_TREATMENT_PURPOSES.has(purpose))) {
    throw new PersistenceBoundaryError(
      "data_authorization_required",
      "La autorización activa no incluye una finalidad compatible con análisis hipotecario, gestión del expediente o servicio jurídico.",
    );
  }
  return authorization;
}

export class CasePersistenceService {
  constructor(
    private readonly store: CasePersistencePort,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async createCase(principalInput: Principal, command: CreateCaseCommand): Promise<CaseMutationResult> {
    const principal = requireAuthenticated(principalInput);
    if (principal.kind !== "client") {
      throw new PersistenceBoundaryError("forbidden", "v0.6 permite creación persistida inicial únicamente al cliente titular.");
    }
    assertIdempotencyKey(command.idempotencyKey);
    assertPersistenceSafe(command);

    const now = this.clock.now();
    const caseId = this.ids.next("case");
    const eventId = this.ids.next("evt");
    const fingerprint = semanticFingerprint({
      operation: "create_case",
      ownerSubjectRef: principal.subjectRef,
      routeCode: command.routeCode,
      routeStatus: command.routeStatus,
      precision: command.precision,
      track: command.track,
    });

    const draft: CaseEventDraft = {
      eventId,
      caseId,
      type: "CASE_CREATED",
      occurredAt: now,
      recordedAt: now,
      actor: { kind: "client", actorId: principal.subjectRef },
      idempotencyKey: command.idempotencyKey,
      payload: {
        routeCode: command.routeCode,
        routeStatus: command.routeStatus,
        precision: command.precision,
        track: command.track,
      },
    };

    const domainResult = appendCaseEvent({ history: [], expectedVersion: 0, event: draft });
    const firstEvent = domainResult.history[0]!;
    const result = await this.store.createCaseAtomic({
      caseId,
      ownerSubjectRef: principal.subjectRef,
      creationIdempotencyKey: command.idempotencyKey,
      creationFingerprint: fingerprint,
      firstRecord: recordEnvelope(firstEvent, principal, fingerprint, now, this.ids),
    });

    return { kind: result.kind === "created" ? "created" : "duplicate", model: modelFromSnapshot(result.snapshot) };
  }

  async readCase(principalInput: Principal, caseId: string): Promise<CaseReadModel> {
    const principal = requireAuthenticated(principalInput);
    const snapshot = await this.requireCase(caseId);
    ensureServiceScope(principal, "case:read");
    assertCaseAccess(principal, snapshot);
    return modelFromSnapshot(snapshot);
  }

  async assignLawyer(principalInput: Principal, caseId: string, lawyerSubjectRef: string): Promise<void> {
    const principal = requireAuthenticated(principalInput);
    if (principal.kind !== "admin") {
      throw new PersistenceBoundaryError("forbidden", "Solo administración puede asignar profesionales en v0.6.");
    }
    assertSubjectRef(lawyerSubjectRef);
    await this.requireCase(caseId);
    await this.store.assignLawyer(caseId, lawyerSubjectRef);
  }

  async appendEvent(
    principalInput: Principal,
    caseId: string,
    expectedVersion: number,
    command: AppendCaseEventCommand,
  ): Promise<CaseMutationResult> {
    const principal = requireAuthenticated(principalInput);
    const snapshot = await this.requireCase(caseId);
    assertCaseAccess(principal, snapshot);
    assertIdempotencyKey(command.idempotencyKey);

    if (RESERVED_GENERIC_OPERATIONS.has(command.type)) {
      throw new PersistenceBoundaryError(
        "reserved_operation",
        `${command.type} debe usar la operación especializada de privacidad/evidencia para conservar atomicidad.`,
      );
    }

    if (principal.kind === "service") {
      ensureServiceScope(principal, command.recordAsExternal ? "case:record_external" : "case:append_system");
    }

    if (command.recordAsExternal) {
      if (!EXTERNAL_RECORDABLE.has(command.type)) {
        throw new PersistenceBoundaryError(
          "invalid_external_recording",
          `${command.type} no puede registrarse como external_recorded en v0.6.`,
        );
      }
      if (principal.kind === "client") {
        throw new PersistenceBoundaryError("forbidden", "El cliente no puede convertir un evento propio en external_recorded.");
      }
    }

    if (command.occurredAt && principal.kind === "client") {
      throw new PersistenceBoundaryError(
        "invalid_command",
        "El cliente no puede backdatear eventos persistidos; los hechos históricos requieren una ruta privilegiada.",
      );
    }

    assertOpaqueEvidenceRefs(command.evidenceRefs);
    assertPersistenceSafe(command.payload);

    const effectiveActor = actorFor(principal, Boolean(command.recordAsExternal));
    const fingerprint = semanticFingerprint({
      operation: "append_event",
      type: command.type,
      payload: command.payload,
      evidenceRefs: command.evidenceRefs ?? [],
      occurredAt: command.occurredAt ?? null,
      actor: effectiveActor,
    });

    const duplicate = duplicateFor(snapshot, command.idempotencyKey, fingerprint);
    if (duplicate) return duplicate;

    const now = this.clock.now();
    const { idempotencyKey, occurredAt, recordAsExternal: _recordAsExternal, ...commandBody } = command;
    const draft = {
      ...commandBody,
      eventId: this.ids.next("evt"),
      caseId,
      occurredAt: occurredAt ?? now,
      recordedAt: now,
      actor: effectiveActor,
      idempotencyKey,
    } as CaseEventDraft;

    const history = snapshot.journal.map((item) => item.event);
    const domainResult = appendCaseEvent({ history, expectedVersion, event: draft });
    const persistedEvent = domainResult.history.at(-1)!;
    const storeResult = await this.store.appendJournalAtomic({
      caseId,
      expectedVersion,
      record: recordEnvelope(persistedEvent, principal, fingerprint, now, this.ids),
    });

    return { kind: storeResult.kind, model: modelFromSnapshot(storeResult.snapshot) };
  }

  async grantDataAuthorization(
    principalInput: Principal,
    caseId: string,
    expectedVersion: number,
    command: GrantDataAuthorizationCommand,
  ): Promise<CaseMutationResult> {
    const principal = requireAuthenticated(principalInput);
    const snapshot = await this.requireCase(caseId);
    assertCaseAccess(principal, snapshot);
    if (principal.kind !== "client" && principal.kind !== "admin") {
      throw new PersistenceBoundaryError(
        "forbidden",
        "Solo el cliente titular o administración puede registrar la autorización de datos.",
      );
    }
    if (principal.kind === "client" && snapshot.access.ownerSubjectRef !== principal.subjectRef) {
      throw new PersistenceBoundaryError("forbidden", "El cliente solo puede autorizar tratamiento para su propio expediente.");
    }

    assertIdempotencyKey(command.idempotencyKey);
    assertNonBlank(command.consentVersion, "consentVersion");
    if (command.purposes.length === 0) {
      throw new PersistenceBoundaryError("invalid_command", "La autorización debe declarar al menos una finalidad.");
    }
    const purposes = [...new Set(command.purposes)].sort();
    const fingerprint = semanticFingerprint({
      operation: "grant_data_authorization",
      consentVersion: command.consentVersion,
      purposes,
      actorKind: principal.kind,
      subjectRef: snapshot.access.ownerSubjectRef,
    });

    const duplicate = duplicateFor(snapshot, command.idempotencyKey, fingerprint);
    if (duplicate) return duplicate;

    const now = this.clock.now();
    const draft: CaseEventDraft = {
      eventId: this.ids.next("evt"),
      caseId,
      type: "DATA_AUTHORIZATION_RECORDED",
      occurredAt: now,
      recordedAt: now,
      actor: { kind: principal.kind, actorId: principal.subjectRef },
      idempotencyKey: command.idempotencyKey,
      payload: { consentVersion: command.consentVersion },
    } as CaseEventDraft;

    const history = snapshot.journal.map((item) => item.event);
    const domainResult = appendCaseEvent({ history, expectedVersion, event: draft });
    const event = domainResult.history.at(-1)!;
    const authorization: DataAuthorizationRecord = {
      authorizationId: this.ids.next("auth"),
      caseId,
      subjectRef: snapshot.access.ownerSubjectRef,
      consentVersion: command.consentVersion,
      purposes,
      status: "active",
      grantedAt: now,
      revokedAt: null,
      revokedReason: null,
    };

    const storeResult = await this.store.grantDataAuthorizationAtomic({
      caseId,
      expectedVersion,
      record: recordEnvelope(event, principal, fingerprint, now, this.ids),
      authorization,
    });

    return { kind: storeResult.kind, model: modelFromSnapshot(storeResult.snapshot) };
  }

  async revokeDataAuthorization(
    principalInput: Principal,
    caseId: string,
    reason: string,
  ): Promise<CaseReadModel> {
    const principal = requireAuthenticated(principalInput);
    const snapshot = await this.requireCase(caseId);
    assertCaseAccess(principal, snapshot);
    if (principal.kind !== "client" && principal.kind !== "admin") {
      throw new PersistenceBoundaryError("forbidden", "Solo el titular o administración puede registrar revocación en v0.6.");
    }
    assertNonBlank(reason, "reason");
    await this.store.revokeDataAuthorization(caseId, snapshot.access.ownerSubjectRef, this.clock.now(), reason);
    return this.readCase(principal, caseId);
  }

  async prepareEvidenceUpload(
    principalInput: Principal,
    caseId: string,
    command: PrepareEvidenceUploadCommand,
  ): Promise<EvidenceUploadIntent> {
    const principal = requireAuthenticated(principalInput);
    const snapshot = await this.requireCase(caseId);
    assertCaseAccess(principal, snapshot);
    if (principal.kind === "service") {
      throw new PersistenceBoundaryError("forbidden", "Los service principals no preparan uploads de usuario en v0.6.");
    }
    assertEvidenceTreatmentAuthorization(snapshot);
    assertSecurityClassification(command.legalDataCategory, command.securityTier);

    const now = this.clock.now();
    const expiresAt = new Date(Date.parse(now) + 15 * 60 * 1000).toISOString();
    const intent: EvidenceUploadIntent = {
      intentId: this.ids.next("upl"),
      evidenceId: this.ids.next("evd"),
      caseId,
      createdBySubjectRef: principal.subjectRef,
      kind: command.kind,
      legalDataCategory: command.legalDataCategory,
      securityTier: command.securityTier,
      displayName: displayNameFor(command.kind),
      createdAt: now,
      expiresAt,
      status: "quarantine",
    };

    await this.store.createEvidenceIntent(intent);
    return { ...intent };
  }

  async finalizeEvidenceUpload(
    principalInput: Principal,
    caseId: string,
    command: FinalizeEvidenceCommand,
  ): Promise<CaseMutationResult> {
    const principal = requireAuthenticated(principalInput);
    const snapshot = await this.requireCase(caseId);
    assertCaseAccess(principal, snapshot);
    if (principal.kind === "service") {
      throw new PersistenceBoundaryError(
        "forbidden",
        "La finalización de evidencia de usuario no se expone a service principals en v0.6.",
      );
    }
    assertEvidenceTreatmentAuthorization(snapshot);
    assertIdempotencyKey(command.idempotencyKey);
    validateReceipt(command);

    const intent = await this.store.loadEvidenceIntent(command.intentId);
    if (!intent || intent.caseId !== caseId) {
      throw new PersistenceBoundaryError("evidence_intent_not_found", "Upload intent no encontrado para este expediente.");
    }
    if (intent.evidenceId !== command.receipt.evidenceId) {
      throw new PersistenceBoundaryError("evidence_receipt_mismatch", "El receipt no corresponde al evidenceId reservado.");
    }

    const fingerprint = semanticFingerprint({
      operation: "finalize_evidence",
      evidenceId: intent.evidenceId,
      checksumSha256: command.receipt.checksumSha256,
      byteSize: command.receipt.byteSize,
      mimeType: command.receipt.mimeType,
      storageLocator: command.receipt.storageLocator,
      actorKind: principal.kind,
      actorRef: principal.subjectRef,
    });
    const duplicate = duplicateFor(snapshot, command.idempotencyKey, fingerprint);
    if (duplicate) return duplicate;

    if (intent.status !== "quarantine") {
      throw new PersistenceBoundaryError("evidence_intent_not_found", "El upload intent ya no está disponible para finalización.");
    }
    const now = this.clock.now();
    if (Date.parse(intent.expiresAt) <= Date.parse(now)) {
      throw new PersistenceBoundaryError("evidence_intent_expired", "El upload intent expiró y debe prepararse uno nuevo.");
    }

    const metadata: EvidenceMetadata = {
      evidenceId: intent.evidenceId,
      caseId,
      kind: intent.kind,
      legalDataCategory: intent.legalDataCategory,
      securityTier: intent.securityTier,
      displayName: intent.displayName,
      mimeType: command.receipt.mimeType,
      byteSize: command.receipt.byteSize,
      checksumSha256: command.receipt.checksumSha256.toLowerCase(),
      storageLocator: command.receipt.storageLocator,
      createdAt: now,
      createdBySubjectRef: intent.createdBySubjectRef,
      lifecycle: "active",
      tombstonedAt: null,
      tombstoneReason: null,
    };

    const draft: CaseEventDraft = {
      eventId: this.ids.next("evt"),
      caseId,
      type: "EVIDENCE_ATTACHED",
      occurredAt: now,
      recordedAt: now,
      actor: { kind: principalActorKind(principal), actorId: principal.subjectRef },
      idempotencyKey: command.idempotencyKey,
      payload: {
        evidenceId: intent.evidenceId,
        kind: intent.kind,
        label: intent.displayName,
      },
    };

    assertPersistenceSafe(draft.payload);
    const history = snapshot.journal.map((item) => item.event);
    const domainResult = appendCaseEvent({ history, expectedVersion: command.expectedVersion, event: draft });
    const event = domainResult.history.at(-1)!;
    const storeResult = await this.store.finalizeEvidenceAtomic({
      caseId,
      expectedVersion: command.expectedVersion,
      intentId: intent.intentId,
      metadata,
      record: recordEnvelope(event, principal, fingerprint, now, this.ids),
    });

    return { kind: storeResult.kind, model: modelFromSnapshot(storeResult.snapshot) };
  }

  async tombstoneEvidence(
    principalInput: Principal,
    caseId: string,
    evidenceId: string,
    reason: string,
  ): Promise<CaseReadModel> {
    const principal = requireAuthenticated(principalInput);
    const snapshot = await this.requireCase(caseId);
    assertCaseAccess(principal, snapshot);
    if (principal.kind !== "client" && principal.kind !== "admin") {
      throw new PersistenceBoundaryError("forbidden", "Solo titular o administración puede ejecutar tombstone en v0.6.");
    }
    if (!OPAQUE_EVIDENCE_REF.test(evidenceId)) {
      throw new PersistenceBoundaryError("invalid_evidence_reference", "evidenceId debe ser un identificador opaco evd_*.");
    }
    assertNonBlank(reason, "reason");
    await this.store.tombstoneEvidence(caseId, evidenceId, this.clock.now(), reason);
    return this.readCase(principal, caseId);
  }

  async rebuildProjection(principalInput: Principal, caseId: string) {
    const principal = requireAuthenticated(principalInput);
    const snapshot = await this.requireCase(caseId);
    ensureServiceScope(principal, "case:read");
    assertCaseAccess(principal, snapshot);
    return replayCaseHistory(snapshot.journal.map((record) => record.event));
  }

  private async requireCase(caseId: string): Promise<PersistedCaseSnapshot> {
    const snapshot = await this.store.loadCase(caseId);
    if (!snapshot) {
      throw new PersistenceBoundaryError("case_not_found", "Expediente persistido no encontrado.");
    }
    return snapshot;
  }
}
