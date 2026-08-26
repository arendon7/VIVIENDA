import { describe, expect, it } from "vitest";
import {
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
  type UserPrincipal,
} from "./coordinator";

const now = "2026-08-26T13:00:00.000Z";
const intentExpires = "2026-08-26T13:15:00.000Z";
const providerExpires = "2026-08-26T15:00:00.000Z";
const downloadExpires = "2026-08-26T13:01:00.000Z";
const checksum = "a".repeat(64);

const principal: UserPrincipal = { kind: "client", subjectRef: "sub_client" };
const coordinates: ReservedObjectCoordinates = {
  storageLocator: "obj_abcdef",
  bucketId: EVIDENCE_BUCKET_ID,
  objectPath: "quarantine/upl_demo/evd_demo/obj_abcdef",
};
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
const intentResolution: IntentObjectResolution = {
  intentId: "upl_demo",
  evidenceId: "evd_demo",
  caseId: "case_demo",
  status: "quarantine",
  expiresAt: intentExpires,
  storageLocator: "obj_abcdef",
  bucketId: EVIDENCE_BUCKET_ID,
  objectPath: coordinates.objectPath,
  deletedAt: null,
};
const evidenceResolution: EvidenceObjectResolution = {
  evidenceId: "evd_demo",
  caseId: "case_demo",
  storageLocator: "obj_abcdef",
  bucketId: EVIDENCE_BUCKET_ID,
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
    private readonly value: UserPrincipal | null = principal,
    private readonly calls: string[] = [],
  ) {}
  async resolve() {
    this.calls.push("principal.resolve");
    return this.value;
  }
}

class FakeCaseApp implements EvidenceCaseApplication {
  model = readModel();
  lastFinalizeCommand: unknown = null;
  constructor(private readonly calls: string[]) {}
  async prepareEvidenceUpload(_principal: Principal, _caseId: string, _command: PrepareEvidenceUploadCommand) {
    this.calls.push("case.prepare");
    return { ...intent };
  }
  async finalizeEvidenceUpload(
    _principal: Principal,
    _caseId: string,
    command: Parameters<EvidenceCaseApplication["finalizeEvidenceUpload"]>[2],
  ): Promise<CaseMutationResult> {
    this.calls.push("case.finalize");
    this.lastFinalizeCommand = command;
    return { kind: "appended", model: this.model };
  }
  async readCase(_principal: Principal, _caseId: string) {
    this.calls.push("case.read");
    return this.model;
  }
}

class FakeRegistry implements EvidenceObjectRegistryPort {
  intentObject: IntentObjectResolution | null = { ...intentResolution };
  evidenceObject: EvidenceObjectResolution | null = { ...evidenceResolution };
  expired: ExpiredEvidenceObject[] = [];
  pending: PendingEvidenceDeletion[] = [];
  failMark = new Set<string>();
  constructor(private readonly calls: string[]) {}
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
  inspection = {
    mimeType: "application/pdf",
    byteSize: 1024,
    checksumSha256: checksum,
    verifiedAt: now,
  };
  missingObject = false;
  failDelete = new Set<string>();
  lastUploadGrantInput: unknown = null;
  lastDownloadGrantInput: unknown = null;
  constructor(private readonly calls: string[]) {}
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
  value = { ...coordinates };
  reserve() {
    return { ...this.value };
  }
}

function setup(principalValue: UserPrincipal | null = principal) {
  const calls: string[] = [];
  const cases = new FakeCaseApp(calls);
  const registry = new FakeRegistry(calls);
  const storage = new FakeStorage(calls);
  const coordinateFactory = new FakeCoordinates();
  const coordinator = new EvidenceStorageCoordinator(
    new FakePrincipalSource(principalValue, calls),
    cases,
    registry,
    storage,
    coordinateFactory,
    new FixedClock(),
  );
  return { calls, cases, registry, storage, coordinateFactory, coordinator };
}

describe("EvidenceStorageCoordinator v0.8", () => {
  it("rejects an unauthenticated request before the case application is called", async () => {
    const { coordinator, calls } = setup(null);
    await expect(coordinator.prepareUpload("case_demo", prepareCommand)).rejects.toMatchObject({
      code: "authentication_required",
    });
    expect(calls).toEqual(["principal.resolve"]);
  });

  it("orders prepare → reserve → signed grant and forces upsert false", async () => {
    const { coordinator, calls, storage } = setup();
    const grant = await coordinator.prepareUpload("case_demo", prepareCommand);
    expect(calls).toEqual(["principal.resolve", "case.prepare", "registry.register", "storage.signUpload"]);
    expect(storage.lastUploadGrantInput).toEqual({
      bucketId: EVIDENCE_BUCKET_ID,
      objectPath: coordinates.objectPath,
      upsert: false,
    });
    expect(grant).toMatchObject({
      intentId: "upl_demo",
      evidenceId: "evd_demo",
      intentExpiresAt: intentExpires,
      providerGrantExpiresAt: providerExpires,
      upsert: false,
    });
    expect(grant).not.toHaveProperty("storageLocator");
  });

  it("rejects semantic/user-controlled paths before signing upload", async () => {
    const { coordinator, coordinateFactory, calls } = setup();
    coordinateFactory.value = {
      storageLocator: "obj_abcdef",
      bucketId: EVIDENCE_BUCKET_ID,
      objectPath: "quarantine/client@example.com/statement.pdf",
    };
    await expect(coordinator.prepareUpload("case_demo", prepareCommand)).rejects.toMatchObject({ code: "provider_error" });
    expect(calls).toEqual(["principal.resolve", "case.prepare"]);
  });

  it("builds the finalization receipt only from reserved coordinates and server inspection", async () => {
    const { coordinator, cases, calls } = setup();
    await coordinator.completeUpload({
      caseId: "case_demo",
      intentId: "upl_demo",
      expectedVersion: 2,
      idempotencyKey: "idem-finalize-demo",
    });
    expect(calls).toEqual(["principal.resolve", "registry.resolveIntent", "storage.inspect", "case.finalize"]);
    expect(cases.lastFinalizeCommand).toEqual({
      idempotencyKey: "idem-finalize-demo",
      intentId: "upl_demo",
      expectedVersion: 2,
      receipt: {
        evidenceId: "evd_demo",
        storageLocator: "obj_abcdef",
        mimeType: "application/pdf",
        byteSize: 1024,
        checksumSha256: checksum,
        verifiedAt: now,
      },
    });
  });

  it("rejects an expired business intent before inspecting the object", async () => {
    const { coordinator, registry, calls } = setup();
    registry.intentObject = { ...intentResolution, expiresAt: "2026-08-26T12:59:59.000Z" };
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

  it("authorizes readCase before physical lookup and signs downloads for 60 seconds by default", async () => {
    const { coordinator, calls, storage } = setup();
    const grant = await coordinator.createDownloadGrant({ caseId: "case_demo", evidenceId: "evd_demo" });
    expect(calls).toEqual(["principal.resolve", "case.read", "registry.resolveEvidence", "storage.signDownload"]);
    expect(storage.lastDownloadGrantInput).toEqual({
      bucketId: EVIDENCE_BUCKET_ID,
      objectPath: coordinates.objectPath,
      expiresInSeconds: DEFAULT_DOWNLOAD_TTL_SECONDS,
    });
    expect(grant).toEqual({ evidenceId: "evd_demo", url: "https://signed.example/download", expiresAt: downloadExpires });
    expect(grant).not.toHaveProperty("storageLocator");
    expect(grant).not.toHaveProperty("objectPath");
  });

  it("rejects tombstoned downloads before physical lookup but keeps legal_hold readable", async () => {
    const tombstoned = setup();
    tombstoned.cases.model = readModel("tombstoned");
    await expect(
      tombstoned.coordinator.createDownloadGrant({ caseId: "case_demo", evidenceId: "evd_demo" }),
    ).rejects.toMatchObject({ code: "evidence_not_found" });
    expect(tombstoned.calls).toEqual(["principal.resolve", "case.read"]);

    const held = setup();
    held.cases.model = readModel("legal_hold");
    await expect(
      held.coordinator.createDownloadGrant({ caseId: "case_demo", evidenceId: "evd_demo" }),
    ).resolves.toMatchObject({ evidenceId: "evd_demo" });
  });

  it("enforces the 300-second maximum download TTL", async () => {
    const { coordinator, calls } = setup();
    await expect(
      coordinator.createDownloadGrant({ caseId: "case_demo", evidenceId: "evd_demo", expiresInSeconds: 301 }),
    ).rejects.toMatchObject({ code: "invalid_command" });
    expect(calls).not.toContain("storage.signDownload");
  });
});

describe("EvidenceDeletionWorker v0.8", () => {
  it("deletes Storage before confirming an expired object as deleted", async () => {
    const calls: string[] = [];
    const registry = new FakeRegistry(calls);
    const storage = new FakeStorage(calls);
    registry.expired = [
      { intentId: "upl_old", storageLocator: "obj_old123", objectPath: "quarantine/upl_old/evd_old/obj_old123" },
    ];
    const worker = new EvidenceDeletionWorker(registry, storage, new FixedClock());
    await expect(worker.cleanupExpiredIntents()).resolves.toEqual({ attempted: 1, confirmedDeleted: 1, failures: [] });
    expect(calls).toEqual([
      "registry.expire",
      "storage.delete:quarantine/upl_old/evd_old/obj_old123",
      "registry.mark:obj_old123",
    ]);
  });

  it("continues after a provider failure and never confirms the failed object", async () => {
    const calls: string[] = [];
    const registry = new FakeRegistry(calls);
    const storage = new FakeStorage(calls);
    const firstPath = "quarantine/upl_one/evd_one/obj_first1";
    const secondPath = "quarantine/upl_two/evd_two/obj_second2";
    registry.pending = [
      { storageLocator: "obj_first1", bucketId: EVIDENCE_BUCKET_ID, objectPath: firstPath, deletionRequestedAt: now },
      { storageLocator: "obj_second2", bucketId: EVIDENCE_BUCKET_ID, objectPath: secondPath, deletionRequestedAt: now },
    ];
    storage.failDelete.add(firstPath);
    const report = await new EvidenceDeletionWorker(registry, storage, new FixedClock()).cleanupRequestedDeletions();
    expect(report).toEqual({
      attempted: 2,
      confirmedDeleted: 1,
      failures: [{ storageLocator: "obj_first1", reason: "provider_error" }],
    });
    expect(calls).not.toContain("registry.mark:obj_first1");
    expect(calls).toContain("registry.mark:obj_second2");
  });

  it("does not invent success when the DB confirmation fails after Storage deletion", async () => {
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
    await expect(
      new EvidenceDeletionWorker(registry, storage, new FixedClock()).cleanupRequestedDeletions(),
    ).resolves.toEqual({
      attempted: 1,
      confirmedDeleted: 0,
      failures: [{ storageLocator: "obj_mark123", reason: "registry_error" }],
    });
  });
});
