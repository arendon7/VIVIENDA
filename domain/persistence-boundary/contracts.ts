import type {
  CaseActorKind,
  CaseEvent,
  CaseEventDraft,
  CaseProjection,
  CaseTrack,
} from "@/domain/case-state/machine";
import type {
  OpportunityPrecision,
  OpportunityRouteCode,
  OpportunityRouteStatus,
} from "@/domain/opportunity/router";

export type ServiceScope = "case:read" | "case:append_system" | "case:record_external";

export type Principal =
  | { kind: "anonymous" }
  | { kind: "client"; subjectRef: string }
  | { kind: "lawyer"; subjectRef: string }
  | { kind: "admin"; subjectRef: string }
  | { kind: "service"; subjectRef: string; scopes: ServiceScope[] };

export type AuthenticatedPrincipal = Exclude<Principal, { kind: "anonymous" }>;

export type CaseAccessSnapshot = {
  ownerSubjectRef: string;
  assignedLawyerSubjectRefs: string[];
};

export type CaseJournalRecord = {
  event: CaseEvent;
  recordedBySubjectRef: string;
  recordedByPrincipalKind: AuthenticatedPrincipal["kind"];
  requestId: string;
  semanticFingerprint: string;
  storedAt: string;
};

export type PrivacyPurpose =
  | "mortgage_analysis"
  | "case_management"
  | "legal_service"
  | "customer_support"
  | "external_credit_data"
  | "marketing";

export type DataAuthorizationStatus = "active" | "revoked" | "superseded";

export type DataAuthorizationRecord = {
  authorizationId: string;
  caseId: string;
  subjectRef: string;
  consentVersion: string;
  purposes: PrivacyPurpose[];
  status: DataAuthorizationStatus;
  grantedAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
};

export type LegalDataCategory =
  | "non_personal"
  | "personal"
  | "financial_credit_semiprivate"
  | "private"
  | "sensitive";

export type SecurityTier = "open" | "controlled" | "restricted" | "highly_restricted";

export type EvidenceKind =
  | "statement"
  | "contract"
  | "bank_response"
  | "filing_proof"
  | "authority"
  | "court_document"
  | "other";

export type EvidenceUploadIntent = {
  intentId: string;
  evidenceId: string;
  caseId: string;
  createdBySubjectRef: string;
  kind: EvidenceKind;
  legalDataCategory: LegalDataCategory;
  securityTier: SecurityTier;
  displayName: string;
  createdAt: string;
  expiresAt: string;
  status: "quarantine" | "finalized" | "expired";
};

export type VerifiedUploadReceipt = {
  evidenceId: string;
  storageLocator: string;
  mimeType: string;
  byteSize: number;
  checksumSha256: string;
  verifiedAt: string;
};

export type EvidenceMetadata = {
  evidenceId: string;
  caseId: string;
  kind: EvidenceKind;
  legalDataCategory: LegalDataCategory;
  securityTier: SecurityTier;
  displayName: string;
  mimeType: string | null;
  byteSize: number | null;
  checksumSha256: string | null;
  storageLocator: string | null;
  createdAt: string;
  createdBySubjectRef: string;
  lifecycle: "active" | "legal_hold" | "tombstoned";
  tombstonedAt: string | null;
  tombstoneReason: string | null;
};

export type PersistedCaseSnapshot = {
  caseId: string;
  access: CaseAccessSnapshot;
  journal: CaseJournalRecord[];
  dataAuthorizations: DataAuthorizationRecord[];
  evidence: EvidenceMetadata[];
};

export type CreatePersistedCaseInput = {
  caseId: string;
  ownerSubjectRef: string;
  creationIdempotencyKey: string;
  creationFingerprint: string;
  firstRecord: CaseJournalRecord;
};

export type CreatePersistedCaseResult =
  | { kind: "created"; snapshot: PersistedCaseSnapshot }
  | { kind: "duplicate"; snapshot: PersistedCaseSnapshot };

export type AppendJournalInput = {
  caseId: string;
  expectedVersion: number;
  record: CaseJournalRecord;
};

export type AppendJournalResult =
  | { kind: "appended"; snapshot: PersistedCaseSnapshot }
  | { kind: "duplicate"; snapshot: PersistedCaseSnapshot };

export type GrantAuthorizationAtomicInput = {
  caseId: string;
  expectedVersion: number;
  record: CaseJournalRecord;
  authorization: DataAuthorizationRecord;
};

export type FinalizeEvidenceAtomicInput = {
  caseId: string;
  expectedVersion: number;
  intentId: string;
  metadata: EvidenceMetadata;
  record: CaseJournalRecord;
};

export interface CasePersistencePort {
  createCaseAtomic(input: CreatePersistedCaseInput): Promise<CreatePersistedCaseResult>;
  loadCase(caseId: string): Promise<PersistedCaseSnapshot | null>;
  appendJournalAtomic(input: AppendJournalInput): Promise<AppendJournalResult>;
  assignLawyer(caseId: string, lawyerSubjectRef: string): Promise<void>;
  grantDataAuthorizationAtomic(input: GrantAuthorizationAtomicInput): Promise<AppendJournalResult>;
  revokeDataAuthorization(caseId: string, subjectRef: string, revokedAt: string, reason: string): Promise<void>;
  createEvidenceIntent(intent: EvidenceUploadIntent): Promise<void>;
  loadEvidenceIntent(intentId: string): Promise<EvidenceUploadIntent | null>;
  finalizeEvidenceAtomic(input: FinalizeEvidenceAtomicInput): Promise<AppendJournalResult>;
  tombstoneEvidence(caseId: string, evidenceId: string, at: string, reason: string): Promise<void>;
}

export interface Clock {
  now(): string;
}

export interface IdGenerator {
  next(prefix: "case" | "evt" | "auth" | "evd" | "upl" | "req"): string;
}

export type CreateCaseCommand = {
  idempotencyKey: string;
  routeCode: OpportunityRouteCode;
  routeStatus: OpportunityRouteStatus;
  precision: OpportunityPrecision;
  track: CaseTrack;
};

type NonCreateDraft = Exclude<CaseEventDraft, { type: "CASE_CREATED" }>;

type ToAppendCommand<T extends NonCreateDraft> = T extends NonCreateDraft
  ? Omit<T, "eventId" | "caseId" | "actor" | "recordedAt" | "occurredAt" | "idempotencyKey"> & {
      idempotencyKey: string;
      occurredAt?: string;
      recordAsExternal?: boolean;
    }
  : never;

export type AppendCaseEventCommand = ToAppendCommand<NonCreateDraft>;

export type GrantDataAuthorizationCommand = {
  idempotencyKey: string;
  consentVersion: string;
  purposes: PrivacyPurpose[];
};

export type PrepareEvidenceUploadCommand = {
  kind: EvidenceKind;
  legalDataCategory: LegalDataCategory;
  securityTier: SecurityTier;
};

export type FinalizeEvidenceCommand = {
  idempotencyKey: string;
  intentId: string;
  expectedVersion: number;
  receipt: VerifiedUploadReceipt;
};

export type CaseTimelineEvent = Omit<CaseEvent, "actor"> & {
  actor: { kind: CaseActorKind };
};

export type DataAuthorizationReadModel = Omit<DataAuthorizationRecord, "subjectRef">;

export type EvidenceReadModel = Omit<EvidenceMetadata, "storageLocator" | "checksumSha256" | "createdBySubjectRef">;

export type CaseReadModel = {
  caseId: string;
  projection: CaseProjection;
  timeline: CaseTimelineEvent[];
  dataAuthorizations: DataAuthorizationReadModel[];
  evidence: EvidenceReadModel[];
};

export type BoundaryErrorCode =
  | "authentication_required"
  | "forbidden"
  | "case_not_found"
  | "invalid_subject_ref"
  | "invalid_identifier"
  | "invalid_command"
  | "reserved_operation"
  | "invalid_external_recording"
  | "version_conflict"
  | "idempotency_conflict"
  | "duplicate_event_id"
  | "duplicate_sequence"
  | "data_authorization_required"
  | "data_authorization_subject_mismatch"
  | "evidence_intent_not_found"
  | "evidence_intent_expired"
  | "evidence_receipt_mismatch"
  | "invalid_evidence_reference"
  | "unsafe_persistence_material"
  | "evidence_not_found"
  | "evidence_on_legal_hold";

export class PersistenceBoundaryError extends Error {
  readonly code: BoundaryErrorCode;

  constructor(code: BoundaryErrorCode, message: string) {
    super(message);
    this.name = "PersistenceBoundaryError";
    this.code = code;
  }
}

export function isAuthenticated(principal: Principal): principal is AuthenticatedPrincipal {
  return principal.kind !== "anonymous";
}

export function principalActorKind(principal: AuthenticatedPrincipal): Exclude<CaseActorKind, "external_recorded"> {
  switch (principal.kind) {
    case "client":
      return "client";
    case "lawyer":
      return "lawyer";
    case "admin":
      return "admin";
    case "service":
      return "system";
  }
}
