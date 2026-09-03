import type { CaseEvent } from "@/domain/case-state/machine";
import {
  PersistenceBoundaryError,
  type AppendJournalInput,
  type AppendJournalResult,
  type CaseJournalRecord,
  type CasePersistencePort,
  type CreatePersistedCaseInput,
  type CreatePersistedCaseResult,
  type DataAuthorizationRecord,
  type EvidenceMetadata,
  type EvidenceUploadIntent,
  type FinalizeEvidenceAtomicInput,
  type GrantAuthorizationAtomicInput,
  type PersistedCaseSnapshot,
} from "./contracts";

type InternalCase = {
  caseId: string;
  access: {
    ownerSubjectRef: string;
    assignedLawyerSubjectRefs: string[];
  };
  journal: CaseJournalRecord[];
  dataAuthorizations: DataAuthorizationRecord[];
  evidence: Map<string, EvidenceMetadata>;
};

function cloneEvent(event: CaseEvent): CaseEvent {
  return {
    ...event,
    actor: { ...event.actor },
    payload: { ...event.payload },
    ...(event.evidenceRefs ? { evidenceRefs: [...event.evidenceRefs] } : {}),
  } as CaseEvent;
}

function cloneRecord(record: CaseJournalRecord): CaseJournalRecord {
  return {
    ...record,
    event: cloneEvent(record.event),
  };
}

function cloneAuthorization(value: DataAuthorizationRecord): DataAuthorizationRecord {
  return {
    ...value,
    purposes: [...value.purposes],
  };
}

function cloneEvidence(value: EvidenceMetadata): EvidenceMetadata {
  return { ...value };
}

function cloneIntent(value: EvidenceUploadIntent): EvidenceUploadIntent {
  return { ...value };
}

function cloneSnapshot(value: InternalCase): PersistedCaseSnapshot {
  return {
    caseId: value.caseId,
    access: {
      ownerSubjectRef: value.access.ownerSubjectRef,
      assignedLawyerSubjectRefs: [...value.access.assignedLawyerSubjectRefs],
    },
    journal: value.journal.map(cloneRecord),
    dataAuthorizations: value.dataAuthorizations.map(cloneAuthorization),
    evidence: [...value.evidence.values()].map(cloneEvidence),
  };
}

export class MemoryCasePersistence implements CasePersistencePort {
  private readonly cases = new Map<string, InternalCase>();
  private readonly creationIndex = new Map<string, { caseId: string; fingerprint: string }>();
  private readonly intents = new Map<string, EvidenceUploadIntent>();

  async createCaseAtomic(input: CreatePersistedCaseInput): Promise<CreatePersistedCaseResult> {
    const creationKey = `${input.ownerSubjectRef}:${input.creationIdempotencyKey}`;
    const existingCreation = this.creationIndex.get(creationKey);

    if (existingCreation) {
      if (existingCreation.fingerprint !== input.creationFingerprint) {
        throw new PersistenceBoundaryError(
          "idempotency_conflict",
          "La misma idempotencyKey de creación fue reutilizada con semántica diferente.",
        );
      }
      const existing = this.cases.get(existingCreation.caseId);
      if (!existing) {
        throw new PersistenceBoundaryError("case_not_found", "El índice de creación apunta a un expediente inexistente.");
      }
      return { kind: "duplicate", snapshot: cloneSnapshot(existing) };
    }

    if (this.cases.has(input.caseId)) {
      throw new PersistenceBoundaryError("invalid_identifier", "caseId ya existe.");
    }
    this.assertEventIdUnique(input.firstRecord.event.eventId);
    if (input.firstRecord.event.sequence !== 1) {
      throw new PersistenceBoundaryError("duplicate_sequence", "El primer evento persistido debe tener sequence 1.");
    }

    const stored: InternalCase = {
      caseId: input.caseId,
      access: {
        ownerSubjectRef: input.ownerSubjectRef,
        assignedLawyerSubjectRefs: [],
      },
      journal: [cloneRecord(input.firstRecord)],
      dataAuthorizations: [],
      evidence: new Map(),
    };

    this.cases.set(input.caseId, stored);
    this.creationIndex.set(creationKey, { caseId: input.caseId, fingerprint: input.creationFingerprint });
    return { kind: "created", snapshot: cloneSnapshot(stored) };
  }

  async loadCase(caseId: string): Promise<PersistedCaseSnapshot | null> {
    const stored = this.cases.get(caseId);
    return stored ? cloneSnapshot(stored) : null;
  }

  async appendJournalAtomic(input: AppendJournalInput): Promise<AppendJournalResult> {
    const stored = this.requireCase(input.caseId);
    return this.appendToInternalCase(stored, input);
  }

  async assignLawyer(caseId: string, lawyerSubjectRef: string): Promise<void> {
    const stored = this.requireCase(caseId);
    if (!stored.access.assignedLawyerSubjectRefs.includes(lawyerSubjectRef)) {
      stored.access.assignedLawyerSubjectRefs.push(lawyerSubjectRef);
    }
  }

  async grantDataAuthorizationAtomic(input: GrantAuthorizationAtomicInput): Promise<AppendJournalResult> {
    const stored = this.requireCase(input.caseId);
    const result = this.appendToInternalCase(stored, {
      caseId: input.caseId,
      expectedVersion: input.expectedVersion,
      record: input.record,
    });

    if (result.kind === "appended") {
      stored.dataAuthorizations = stored.dataAuthorizations.map((item) =>
        item.status === "active"
          ? {
              ...item,
              purposes: [...item.purposes],
              status: "superseded",
              revokedAt: input.authorization.grantedAt,
              revokedReason: `Superseded by ${input.authorization.authorizationId}`,
            }
          : cloneAuthorization(item),
      );
      stored.dataAuthorizations.push(cloneAuthorization(input.authorization));
      return { kind: "appended", snapshot: cloneSnapshot(stored) };
    }

    return { kind: "duplicate", snapshot: cloneSnapshot(stored) };
  }

  async revokeDataAuthorization(caseId: string, subjectRef: string, revokedAt: string, reason: string): Promise<void> {
    const stored = this.requireCase(caseId);
    let activeIndex = -1;
    for (let index = stored.dataAuthorizations.length - 1; index >= 0; index -= 1) {
      const item = stored.dataAuthorizations[index];
      if (item?.status === "active" && item.subjectRef === subjectRef) {
        activeIndex = index;
        break;
      }
    }
    if (activeIndex < 0) {
      throw new PersistenceBoundaryError(
        "data_authorization_subject_mismatch",
        "No existe una autorización activa correspondiente al titular indicado.",
      );
    }

    const authorization = stored.dataAuthorizations[activeIndex]!;
    stored.dataAuthorizations[activeIndex] = {
      ...authorization,
      purposes: [...authorization.purposes],
      status: "revoked",
      revokedAt,
      revokedReason: reason,
    };
  }

  async createEvidenceIntent(intent: EvidenceUploadIntent): Promise<void> {
    if (this.intents.has(intent.intentId)) {
      throw new PersistenceBoundaryError("invalid_identifier", "intentId ya existe.");
    }
    if ([...this.intents.values()].some((item) => item.evidenceId === intent.evidenceId)) {
      throw new PersistenceBoundaryError("invalid_identifier", "evidenceId ya existe en un upload intent.");
    }
    this.requireCase(intent.caseId);
    this.intents.set(intent.intentId, cloneIntent(intent));
  }

  async loadEvidenceIntent(intentId: string): Promise<EvidenceUploadIntent | null> {
    const intent = this.intents.get(intentId);
    return intent ? cloneIntent(intent) : null;
  }

  async finalizeEvidenceAtomic(input: FinalizeEvidenceAtomicInput): Promise<AppendJournalResult> {
    const stored = this.requireCase(input.caseId);
    const intent = this.intents.get(input.intentId);
    if (!intent || intent.caseId !== input.caseId) {
      throw new PersistenceBoundaryError("evidence_intent_not_found", "No existe un upload intent válido para este expediente.");
    }

    const result = this.appendToInternalCase(stored, {
      caseId: input.caseId,
      expectedVersion: input.expectedVersion,
      record: input.record,
    });

    if (result.kind === "appended") {
      stored.evidence.set(input.metadata.evidenceId, cloneEvidence(input.metadata));
      this.intents.set(input.intentId, { ...intent, status: "finalized" });
      return { kind: "appended", snapshot: cloneSnapshot(stored) };
    }

    return { kind: "duplicate", snapshot: cloneSnapshot(stored) };
  }

  async tombstoneEvidence(caseId: string, evidenceId: string, at: string, reason: string): Promise<void> {
    const stored = this.requireCase(caseId);
    const evidence = stored.evidence.get(evidenceId);
    if (!evidence) {
      throw new PersistenceBoundaryError("evidence_not_found", "No existe metadata activa para la evidencia indicada.");
    }
    if (evidence.lifecycle === "legal_hold") {
      throw new PersistenceBoundaryError("evidence_on_legal_hold", "La evidencia está bajo legal hold y no puede tombstonearse.");
    }

    stored.evidence.set(evidenceId, {
      ...evidence,
      mimeType: null,
      byteSize: null,
      checksumSha256: null,
      storageLocator: null,
      lifecycle: "tombstoned",
      tombstonedAt: at,
      tombstoneReason: reason,
    });
  }

  private requireCase(caseId: string): InternalCase {
    const stored = this.cases.get(caseId);
    if (!stored) {
      throw new PersistenceBoundaryError("case_not_found", "Expediente persistido no encontrado.");
    }
    return stored;
  }

  private appendToInternalCase(stored: InternalCase, input: AppendJournalInput): AppendJournalResult {
    const duplicate = stored.journal.find((item) => item.event.idempotencyKey === input.record.event.idempotencyKey);
    if (duplicate) {
      if (duplicate.semanticFingerprint !== input.record.semanticFingerprint) {
        throw new PersistenceBoundaryError(
          "idempotency_conflict",
          "La misma idempotencyKey fue reutilizada con semántica diferente.",
        );
      }
      return { kind: "duplicate", snapshot: cloneSnapshot(stored) };
    }

    if (input.expectedVersion !== stored.journal.length) {
      throw new PersistenceBoundaryError(
        "version_conflict",
        `expectedVersion ${input.expectedVersion} no coincide con la versión persistida ${stored.journal.length}.`,
      );
    }

    const expectedSequence = stored.journal.length + 1;
    if (input.record.event.sequence !== expectedSequence) {
      throw new PersistenceBoundaryError(
        "duplicate_sequence",
        `sequence ${input.record.event.sequence} no coincide con la siguiente secuencia ${expectedSequence}.`,
      );
    }

    this.assertEventIdUnique(input.record.event.eventId);
    stored.journal.push(cloneRecord(input.record));
    return { kind: "appended", snapshot: cloneSnapshot(stored) };
  }

  private assertEventIdUnique(eventId: string) {
    for (const stored of this.cases.values()) {
      if (stored.journal.some((item) => item.event.eventId === eventId)) {
        throw new PersistenceBoundaryError("duplicate_event_id", "eventId ya existe en el journal.");
      }
    }
  }
}
