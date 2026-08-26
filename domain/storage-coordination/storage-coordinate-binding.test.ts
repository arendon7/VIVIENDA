import { describe, expect, it } from "vitest";
import type {
  CaseReadModel,
  Clock,
  EvidenceUploadIntent,
  PrepareEvidenceUploadCommand,
  Principal,
} from "@/domain/persistence-boundary/contracts";
import type { CaseMutationResult } from "@/domain/persistence-boundary/service";
import {
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
const principal: UserPrincipal = { kind: "client", subjectRef: "sub_client" };
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
  expiresAt: "2026-08-26T13:15:00.000Z",
  status: "quarantine",
};
const command: PrepareEvidenceUploadCommand = {
  kind: "statement",
  legalDataCategory: "financial_credit_semiprivate",
  securityTier: "restricted",
};
const goodCoordinates: ReservedObjectCoordinates = {
  storageLocator: "obj_abcdef",
  bucketId: EVIDENCE_BUCKET_ID,
  objectPath: "quarantine/upl_demo/evd_demo/obj_abcdef",
};
const goodIntentResolution: IntentObjectResolution = {
  intentId: "upl_demo",
  evidenceId: "evd_demo",
  caseId: "case_demo",
  status: "quarantine",
  expiresAt: "2026-08-26T13:15:00.000Z",
  storageLocator: "obj_abcdef",
  bucketId: EVIDENCE_BUCKET_ID,
  objectPath: goodCoordinates.objectPath,
  deletedAt: null,
};
const goodEvidenceResolution: EvidenceObjectResolution = {
  evidenceId: "evd_demo",
  caseId: "case_demo",
  storageLocator: "obj_abcdef",
  bucketId: EVIDENCE_BUCKET_ID,
  objectPath: goodCoordinates.objectPath,
};

const model = {
  caseId: "case_demo",
  evidence: [
    {
      evidenceId: "evd_demo",
      lifecycle: "active",
    },
  ],
} as unknown as CaseReadModel;

class FixedClock implements Clock {
  now() {
    return now;
  }
}

class FixedPrincipal implements PrincipalSource {
  async resolve() {
    return principal;
  }
}

class FakeCaseApplication implements EvidenceCaseApplication {
  constructor(private readonly calls: string[]) {}
  async prepareEvidenceUpload(_principal: Principal, _caseId: string, _command: PrepareEvidenceUploadCommand) {
    this.calls.push("case.prepare");
    return { ...intent };
  }
  async readCase(_principal: Principal, _caseId: string) {
    this.calls.push("case.read");
    return model;
  }
  async finalizeEvidenceUpload(): Promise<CaseMutationResult> {
    this.calls.push("case.finalize");
    return { kind: "appended", model };
  }
}

class FakeRegistry implements EvidenceObjectRegistryPort {
  intentObject: IntentObjectResolution | null = { ...goodIntentResolution };
  evidenceObject: EvidenceObjectResolution | null = { ...goodEvidenceResolution };
  expired: ExpiredEvidenceObject[] = [];
  pending: PendingEvidenceDeletion[] = [];
  constructor(private readonly calls: string[]) {}
  async registerObject() {
    this.calls.push("registry.register");
  }
  async resolveIntentObject() {
    this.calls.push("registry.resolveIntent");
    return this.intentObject;
  }
  async resolveReadableEvidenceObject() {
    this.calls.push("registry.resolveEvidence");
    return this.evidenceObject;
  }
  async expireIntents() {
    this.calls.push("registry.expire");
    return this.expired;
  }
  async listPendingDeletions() {
    this.calls.push("registry.pending");
    return this.pending;
  }
  async markObjectDeleted(storageLocator: string) {
    this.calls.push(`registry.mark:${storageLocator}`);
  }
}

class FakeStorage implements EvidenceStorageGateway {
  uploadExpiresAt = "2026-08-26T15:00:00.000Z";
  downloadExpiresAt = "2026-08-26T13:01:00.000Z";
  constructor(private readonly calls: string[]) {}
  async createSignedUploadGrant() {
    this.calls.push("storage.signUpload");
    return { token: "upload-token", expiresAt: this.uploadExpiresAt };
  }
  async inspectAndHashObject() {
    this.calls.push("storage.inspect");
    return {
      mimeType: "application/pdf",
      byteSize: 1024,
      checksumSha256: "a".repeat(64),
      verifiedAt: now,
    };
  }
  async createSignedDownloadGrant() {
    this.calls.push("storage.signDownload");
    return { url: "https://signed.example/download", expiresAt: this.downloadExpiresAt };
  }
  async deleteObject(input: Parameters<EvidenceStorageGateway["deleteObject"]>[0]) {
    this.calls.push(`storage.delete:${input.objectPath}`);
    return "deleted" as const;
  }
}

class FakeCoordinates implements OpaqueObjectCoordinateFactory {
  value = { ...goodCoordinates };
  reserve() {
    return { ...this.value };
  }
}

function setup() {
  const calls: string[] = [];
  const cases = new FakeCaseApplication(calls);
  const registry = new FakeRegistry(calls);
  const storage = new FakeStorage(calls);
  const coordinates = new FakeCoordinates();
  const coordinator = new EvidenceStorageCoordinator(
    new FixedPrincipal(),
    cases,
    registry,
    storage,
    coordinates,
    new FixedClock(),
  );
  return { calls, cases, registry, storage, coordinates, coordinator };
}

describe("Storage coordinate binding hardening v0.8", () => {
  it("rejects a syntactically valid upload path bound to the wrong intent before registration or signing", async () => {
    const { coordinator, coordinates, calls } = setup();
    coordinates.value = {
      ...goodCoordinates,
      objectPath: "quarantine/upl_other/evd_demo/obj_abcdef",
    };

    await expect(coordinator.prepareUpload("case_demo", command)).rejects.toMatchObject({ code: "provider_error" });
    expect(calls).toEqual(["case.prepare"]);
  });

  it("rejects a registry path whose evidence segment does not match before inspecting the object", async () => {
    const { coordinator, registry, calls } = setup();
    registry.intentObject = {
      ...goodIntentResolution,
      objectPath: "quarantine/upl_demo/evd_other/obj_abcdef",
    };

    await expect(
      coordinator.completeUpload({
        caseId: "case_demo",
        intentId: "upl_demo",
        expectedVersion: 2,
        idempotencyKey: "idem-bind",
      }),
    ).rejects.toMatchObject({ code: "provider_error" });
    expect(calls).toEqual(["case.read", "registry.resolveIntent"]);
  });

  it("rejects a readable object whose path is bound to a different evidence id before signing", async () => {
    const { coordinator, registry, calls } = setup();
    registry.evidenceObject = {
      ...goodEvidenceResolution,
      objectPath: "quarantine/upl_demo/evd_other/obj_abcdef",
    };

    await expect(
      coordinator.createDownloadGrant({ caseId: "case_demo", evidenceId: "evd_demo" }),
    ).rejects.toMatchObject({ code: "provider_error" });
    expect(calls).toEqual(["case.read", "registry.resolveEvidence"]);
  });

  it("does not delete a pending object when its locator does not match the object path", async () => {
    const calls: string[] = [];
    const registry = new FakeRegistry(calls);
    const storage = new FakeStorage(calls);
    registry.pending = [
      {
        storageLocator: "obj_other1",
        bucketId: EVIDENCE_BUCKET_ID,
        objectPath: "quarantine/upl_demo/evd_demo/obj_abcdef",
        deletionRequestedAt: now,
      },
    ];

    await expect(
      new EvidenceDeletionWorker(registry, storage, new FixedClock()).cleanupRequestedDeletions(),
    ).resolves.toEqual({
      attempted: 1,
      confirmedDeleted: 0,
      failures: [{ storageLocator: "obj_other1", reason: "provider_error" }],
    });
    expect(calls).not.toContain("storage.delete:quarantine/upl_demo/evd_demo/obj_abcdef");
    expect(calls).not.toContain("registry.mark:obj_other1");
  });

  it("does not delete an expired object when the path belongs to another intent", async () => {
    const calls: string[] = [];
    const registry = new FakeRegistry(calls);
    const storage = new FakeStorage(calls);
    registry.expired = [
      {
        intentId: "upl_demo",
        storageLocator: "obj_abcdef",
        objectPath: "quarantine/upl_other/evd_demo/obj_abcdef",
      },
    ];

    const report = await new EvidenceDeletionWorker(registry, storage, new FixedClock()).cleanupExpiredIntents();
    expect(report).toEqual({
      attempted: 1,
      confirmedDeleted: 0,
      failures: [{ storageLocator: "obj_abcdef", reason: "provider_error" }],
    });
    expect(calls).not.toContain("storage.delete:quarantine/upl_other/evd_demo/obj_abcdef");
  });

  it("rejects an already-expired provider upload grant", async () => {
    const { coordinator, storage, calls } = setup();
    storage.uploadExpiresAt = "2026-08-26T12:59:59.000Z";

    await expect(coordinator.prepareUpload("case_demo", command)).rejects.toMatchObject({ code: "provider_error" });
    expect(calls).toContain("storage.signUpload");
  });

  it("rejects a download grant whose actual expiry exceeds the requested TTL", async () => {
    const { coordinator, storage, calls } = setup();
    storage.downloadExpiresAt = "2026-08-26T13:10:00.000Z";

    await expect(
      coordinator.createDownloadGrant({ caseId: "case_demo", evidenceId: "evd_demo", expiresInSeconds: 60 }),
    ).rejects.toMatchObject({ code: "provider_error" });
    expect(calls).toContain("storage.signDownload");
  });
});
