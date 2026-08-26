import { describe, expect, it } from "vitest";
import {
  PersistenceBoundaryError,
  type CaseReadModel,
  type Clock,
  type EvidenceUploadIntent,
  type PrepareEvidenceUploadCommand,
  type Principal,
} from "@/domain/persistence-boundary/contracts";
import type { CaseMutationResult } from "@/domain/persistence-boundary/service";
import {
  DEFAULT_DOWNLOAD_TTL_SECONDS,
  EVIDENCE_BUCKET_ID,
  EvidenceDeletionWorker,
  EvidenceStorageCoordinator,
  type EvidenceCaseApplication,
  type EvidenceObjectRegistryPort,
  type EvidenceObjectResolution,
  type EvidenceStorageGateway,
  type ExpiredEvidenceObject,
  type IntentObjectResolution,
  type OpaqueObjectCoordinateFactory,
  type PendingEvidenceDeletion,
  type PrincipalSource,
  type ReservedObjectCoordinates,
} from "./coordinator";

const now = "2026-08-26T13:00:00.000Z";
const intentExpires = "2026-08-26T13:15:00.000Z";
const providerExpires = "2026-08-26T15:00:00.000Z";
const downloadExpires = "2026-08-26T13:01:00.000Z";
const sha = "a".repeat(64);

const principal: Principal = { kind: "client", subjectRef: "sub_client" };

const intent: EvidenceUploadIntent = {
  intentId: "upl_demo",
  evidenceId: "evd_demo",
  caseId: "case_demo",
  createdBySubjectRef: "sub_client",
  kind: "statement",
  legalDataCategory: "financial_credit_semiprivate",
  securityTier: "restricted",
  displayName: "Extracto de crédito",
  createdAt: now,
  expiresAt: intentExpires,
  status: "quarantine",
};

const coordinates: ReservedObjectCoordinates = {
  storageLocator: "obj_abcdef",
  bucketId: EVIDENCE_BUCKET_ID,
  objectPath: "quarantine/upl_demo/evd_demo/obj_abcdef",
};

const intentResolution: IntentObjectResolution = {
  intentId: intent.intentId,
  evidenceId: intent.evidenceId,
  caseId: intent.caseId,
  status: "quarantine",
  expiresAt: intent.expiresAt,
  storageLocator: coordinates.storageLocator,
  bucketId: coordinates.bucketId,
  objectPath: coordinates.objectPath,
  deletedAt: null,
};

const evidenceResolution: EvidenceObjectResolution = {
  evidenceId: intent.evidenceId,
  caseId: intent.caseId,
  storageLocator: coordinates.storageLocator,
  bucketId: coordinates.bucketId,
  objectPath: coordinates.objectPath,
};

const prepareCommand: PrepareEvidenceUploadCommand = {
  kind: "statement",
  legalDataCategory: "financial_credit_semiprivate",
  securityTier: "restricted",
};

function readModel(lifecycle: "active" | "legal_hold" | "tombstoned" = "active"): CaseReadModel {
  return {
    caseId: "case_demo",
    projection: {
      caseId: "case_demo",
      version: 2,
      stage: "collecting_evidence",
      origin: {
        routeCode: "R1_PREPAGO_PLAZO",
        routeStatus: "eligible_now",
        precision: "C2",
        track: "self_service",
      },
      createdAt: now,
      lastRecordedAt: now,
      capabilities: {
        dataAuthorizationRecorded: true,
        serviceAgreementAccepted: false,
        extrajudicialAuthorityVerified: false,
        judicialPowerVerified: false,
        professionalReviewRequested: false,
        professionalReviewCompleted: false,
        submissionPrepared: false,
        submissionRecorded: false,
        responseRecorded: false,
        responseReviewStarted: false,
        responseReviewCompleted: false,
        negotiationStarted: false,
        escalationReviewStarted: false,
        resolutionRecorded: false,
        outcomeVerified: false,
      },
      attachedEvidenceIds: ["evd_demo"],
      verifiedEvidenceIds: [],
      lastSubmissionReference: null,
      lastResponseReference: null,
      terminalReason: null,
    },
    timeline: [],
    dataAuthorizations: [],
    evidence: [
      {
        evidenceId: "evd_demo",
        caseId: "case_demo",
        kind: "statement",
        legalDataCategory: "financial_credit_semiprivate",
        securityTier: "restricted",
        displayName: "Extracto de crédito",
        mimeType: "application/pdf",
        byteSize: 1024,
        createdAt: now,
        lifecycle,
        tombstonedAt: lifecycle === "tombstoned" ? now : null,
        tombstoneReason: lifecycle === "tombstoned" ? "Solicitud del titular" : null,
      },
    ],
  };
}

class FixedClock implements Clock {
  constructor(private readonly value = now) {}
  now() {
    return this.value;
  }
}

class FakePrincipalSource implements PrincipalSource {
  constructor(
    private readonly value: PrincipalSource extends { resolve(): Promise<infer T> } ? T : never = principal,
    private readonly calls?: string[],
  ) {}
  async resolve() {
    this.calls?.push("principal.resolve");
    return this.value;
  }
}

class FakeCaseApp implements EvidenceCaseApplication {
  readonly calls: string[];
  model = readModel();
  preparedIntent = intent;
  finalizeResult: CaseMutationResult = { kind: "appended", model: this.model };
  lastFinalizeCommand: unknown = null;

  constructor(calls: string[]) {
    this.calls = calls;
  }

  async prepareEvidenceUpload(_principal: Principal, _caseId: string, _command: PrepareEvidenceUploadCommand) {
    this.calls.push("case.prepare");
    return { ...this.preparedIntent };
  }

  async finalizeEvidenceUpload(
    _principal: Principal,
    _caseId: string,
    command: Parameters<EvidenceCaseApplication["finalizeEvidenceUpload"]>[2],
  ) {
    this.calls.push("case.finalize");
    this.lastFinalizeCommand = command;
    return this.finalizeResult;
  }

  async readCase(_principal: Principal, _caseId: string) {
    this.calls.push("case.read");
    return this.model;
  }
}

class FakeRegistry implements EvidenceObjectRegistryPort {
  readonly calls: string[];
  intentObject: IntentObjectResolution | null = intentResolution;
  evidenceObject: EvidenceObjectResolution | null = evidenceResolution;
  expired: ExpiredEvidenceObject[] = [];
  pending: PendingEvidenceDeletion[] = [];
  failMark = new Set<string>();

  constructor(calls: string[]) {
    this.calls = calls;
  }

  async registerObject() {
    this.calls.push("registry.register");
  }

  async resolveIntentObject() {
    this.calls.push("registry.resolveIntent");
    return this.intentObject ? { ...this.intentObject } : null;
  }

  async resolveReadableEvidenceObject() {
    this.calls.push("registry.resolveEvidence");
    return this.evidenceObject ? { ...this.evidenceObject } : null;
  }

  async expireIntents() {
    this.calls.push("registry.expire");
    return this.expired.map((item) => ({ ...item }));
  }

  async listPendingDeletions() {
    this.calls.push("registry.pending");
    return this.pending.map((item) => ({ ...item }));
  }

  async markObjectDeleted(storageLocator: string) {
    this.calls.push(`registry.mark:${storageLocator}`);
    if (this.failMark.has(storageLocator)) throw new Error("registry failed");
  }
}

class FakeStorage implements EvidenceStorageGateway {
  readonly calls: string[];
  inspection = {
    mimeType: "application/pdf",
    byteSize: 1024,
    checksumSha256: sha,
    verifiedAt: now,
  };
  missingObject = false;
  failDelete = new Set<string>();
  lastUploadGrantInput: unknown = null;
  lastDownloadGrantInput: unknown = null;

  constructor(calls: string[]) {
    this.calls = calls;
  }

  async createSignedUploadGrant(input: Parameters<EvidenceStorageGateway["createSignedUploadGrant"]>[0]) {
    this.calls.push("storage.signUpload");
    this.lastUploadGrantInput = input;
    return { token: "signed-upload-token", expiresAt: providerExpires };
  }

  async inspectAndHashObject() {
    this.calls.push("storage.inspect");
    return this.missingObject ? null : { ...this.inspection };
  }

  async createSignedDownloadGrant(input: Parameters<EvidenceStorageGateway["createSignedDownloadGrant"]>[0]) {
    this.calls.push("storage.signDownload");
    this.lastDownloadGrantInput = input;
    return { url: "https://signed.example/download", expiresAt: downloadExpires };
  }

  async deleteObject(input: Parameters<EvidenceStorageGateway["deleteObject"]>[0]) {
    this.calls.push(`storage.delete:${input.objectPath}`);
    if (this.failDelete.has(input.objectPath)) throw new Error("storage failed");
    return "deleted" as const;
  }
}

class FakeCoordinates implements OpaqueObjectCoordinateFactory {
  value = coordinates;
  reserve() {
    return { ...this.value };
  }
}

function setup(principalValue: ConstructorParameters<typeof FakePrincipalSource>[0] = principal) {
  const calls: string[] = [];
  const principals = new FakePrincipalSource(principalValue, calls);
  const cases = new FakeCaseApp(calls);
  const registry = new FakeRegistry(calls);
  const storage = new FakeStorage(calls);
  const coordinateFactory = new FakeCoordinates();
  const clock = new FixedClock();
  const coordinator = new EvidenceStorageCoordinator(
    principals,
    cases,
    registry,
    storage,
    coordinateFactory,
    clock,
  );
  return { calls, cases, registry, storage, coordinateFactory, coordinator, clock };
}

describe("EvidenceStorageCoordinator v0.8", () => {
  it("rejects anonymous requests before creating an evidence intent", async () => {
    const { coordinator, calls } = setup(null);
    await expect(coordinator.prepareUpload("case_demo", prepareCommand)).rejects.toMatchObject({
      code: "authentication_required",
    });
    expect(calls).toEqual(["principal.resolve"]);
  });

  it("prepares intent, reserves coordinates and only then issues a non-upsert signed upload grant", async () => {
    const { coordinator, calls, storage } = setup();
    const result = await coordinator.prepareUpload("case_demo", prepareCommand);

    expect(calls).toEqual([
      "principal.resolve",
      "case.prepare",
      "registry.register",
      "storage.signUpload",
    ]);
    expect(storage.lastUploadGrantInput).toEqual({
      bucketId: EVIDENCE_BUCKET_ID,
      objectPath: coordinates.objectPath,
      upsert: false,
    });
    expect(result).toMatchObject({
      intentId: "upl_demo",
      evidenceId: "evd_demo",
      intentExpiresAt: intentExpires,
      providerGrantExpiresAt: providerExpires,
      upsert: false,
    });
    expect(result).not.toHaveProperty("storageLocator");
    expect(result.intentExpiresAt).not.toBe(result.providerGrantExpiresAt);
  });

  it("rejects non-opaque coordinates before a signed upload grant is emitted", async () => {
    const { coordinator, coordinateFactory, calls } = setup();
    coordinateFactory.value = {
      storageLocator: "obj_abcdef",
      bucketId: EVIDENCE_BUCKET_ID,
      objectPath: "quarantine/client@example.com/statement.pdf",
    };
    await expect(coordinator.prepareUpload("case_demo", prepareCommand)).rejects.toMatchObject({
      code: "provider_error",
    });
    expect(calls).toEqual(["principal.resolve", "case.prepare"]);
  });

  it("builds finalization receipt from server inspection and the reserved locator", async () => {
    const { coordinator, cases, calls } = setup();
    await coordinator.completeUpload({
      caseId: "case_demo",
      intentId: "upl_demo",
      expectedVersion: 2,
      idempotencyKey: "idem-finalize-demo",
    });

    expect(calls).toEqual([
      "principal.resolve",
      "registry.resolveIntent",
      "storage.inspect",
      "case.finalize",
    ]);
    expect(cases.lastFinalizeCommand).toEqual({
      idempotencyKey: "idem-finalize-demo",
      intentId: "upl_demo",
      expectedVersion: 2,
      receipt: {
        evidenceId: "evd_demo",
        storageLocator: "obj_abcdef",
        mimeType: "application/pdf",
        byteSize: 1024,
        checksumSha256: sha,
        verifiedAt: now,
      },
    });
  });

  it("does not inspect or finalize a business intent that already expired", async () => {
    const expired = { ...intentResolution, expiresAt: "2026-08-26T12:59:59.000Z" };
    const { coordinator, registry, calls } = setup();
    registry.intentObject = expired;

    await expect(
      coordinator.completeUpload({
        caseId: "case_demo",
        intentId: "upl_demo",
        expectedVersion: 2,
        idempotencyKey: "idem-expired",
      }),
    ).rejects.toMatchObject({ code: "evidence_intent_expired" });
    expect(calls).toEqual(["principal.resolve", "registry.resolveIntent"]);
  });

  it("does not finalize when the reserved object is missing", async () => {
    const { coordinator, storage, calls } = setup();
    storage.missingObject = true;
    await expect(
      coordinator.completeUpload({
        caseId: "case_demo",
        intentId: "upl_demo",
        expectedVersion: 2,
        idempotencyKey: "idem-missing",
      }),
    ).rejects.toMatchObject({ code: "evidence_not_found" });
    expect(calls).not.toContain("case.finalize");
  });

  it("authorizes the case before resolving physical coordinates for download", async () => {
    const { coordinator, calls, storage } = setup();
    const grant = await coordinator.createDownloadGrant({
      caseId: "case_demo",
      evidenceId: "evd_demo",
    });

    expect(calls).toEqual([
      "principal.resolve",
      "case.read",
      "registry.resolveEvidence",
      "storage.signDownload",
    ]);
    expect(storage.lastDownloadGrantInput).toEqual({
      bucketId: EVIDENCE_BUCKET_ID,
      objectPath: coordinates.objectPath,
      expiresInSeconds: DEFAULT_DOWNLOAD_TTL_SECONDS,
    });
    expect(grant).toEqual({
      evidenceId: "evd_demo",
      url: "https://signed.example/download",
      expiresAt: downloadExpires,
    });
    expect(grant).not.toHaveProperty("storageLocator");
    expect(grant).not.toHaveProperty("objectPath");
  });

  it("refuses a signed download for tombstoned evidence before physical lookup", async () => {
    const { coordinator, cases, calls } = setup();
    cases.model = readModel("tombstoned");
    await expect(
      coordinator.createDownloadGrant({ caseId: "case_demo", evidenceId: "evd_demo" }),
    ).rejects.toMatchObject({ code: "evidence_not_found" });
    expect(calls).toEqual(["principal.resolve", "case.read"]);
  });

  it("enforces a maximum signed download TTL of 300 seconds", async () => {
    const { coordinator, calls } = setup();
    await expect(
      coordinator.createDownloadGrant({
        caseId: "case_demo",
        evidenceId: "evd_demo",
        expiresInSeconds: 301,
      }),
    ).rejects.toMatchObject({ code: "invalid_command" });
    expect(calls).not.toContain("storage.signDownload");
  });

  it("allows legal-hold evidence to remain readable when ownership authorization succeeds", async () => {
    const { coordinator, cases } = setup();
    cases.model = readModel("legal_hold");
    await expect(
      coordinator.createDownloadGrant({ caseId: "case_demo", evidenceId: "evd_demo" }),
    ).resolves.toMatchObject({ evidenceId: "evd_demo" });
  });
});

describe("EvidenceDeletionWorker v0.8", () => {
  it("deletes expired quarantine objects before confirming physical deletion", async () => {
    const calls: string[] = [];
    const registry = new FakeRegistry(calls);
    const storage = new FakeStorage(calls);
    registry.expired = [
      {
        intentId: "upl_old",
        storageLocator: "obj_old123",
        objectPath: "quarantine/upl_old/evd_old/obj_old123",
      },
    ];
    const worker = new EvidenceDeletionWorker(registry, storage, new FixedClock());

    await expect(worker.cleanupExpiredIntents()).resolves.toEqual({
      attempted: 1,
      confirmedDeleted: 1,
      failures: [],
    });
    expect(calls).toEqual([
      "registry.expire",
      "storage.delete:quarantine/upl_old/evd_old/obj_old123",
      "registry.mark:obj_old123",
    ]);
  });

  it("continues after a provider deletion failure and leaves that object unconfirmed", async () => {
    const calls: string[] = [];
    const registry = new FakeRegistry(calls);
    const storage = new FakeStorage(calls);
    const firstPath = "quarantine/upl_one/evd_one/obj_first1";
    const secondPath = "quarantine/upl_two/evd_two/obj_second2";
    registry.pending = [
      {
        storageLocator: "obj_first1",
        bucketId: EVIDENCE_BUCKET_ID,
        objectPath: firstPath,
        deletionRequestedAt: now,
      },
      {
        storageLocator: "obj_second2",
        bucketId: EVIDENCE_BUCKET_ID,
        objectPath: secondPath,
        deletionRequestedAt: now,
      },
    ];
    storage.failDelete.add(firstPath);
    const worker = new EvidenceDeletionWorker(registry, storage, new FixedClock());

    const report = await worker.cleanupRequestedDeletions();
    expect(report.attempted).toBe(2);
    expect(report.confirmedDeleted).toBe(1);
    expect(report.failures).toEqual([{ storageLocator: "obj_first1", reason: "provider_error" }]);
    expect(calls).not.toContain("registry.mark:obj_first1");
    expect(calls).toContain("registry.mark:obj_second2");
  });

  it("reports registry confirmation failure after Storage deletion without inventing success", async () => {
    const calls: string[] = [];
    const registry = new FakeRegistry(calls);
    const storage = new FakeStorage(calls);
    registry.pending = [
      {
        storageLocator: "obj_mark123",
        bucketId: EVIDENCE_BUCKET_ID,
        objectPath: "quarantine/upl_mark/evd_mark/obj_mark123",
        deletionRequestedAt: now,
      },
    ];
    registry.failMark.add("obj_mark123");
    const worker = new EvidenceDeletionWorker(registry, storage, new FixedClock());

    await expect(worker.cleanupRequestedDeletions()).resolves.toEqual({
      attempted: 1,
      confirmedDeleted: 0,
      failures: [{ storageLocator: "obj_mark123", reason: "registry_error" }],
    });
  });
});
