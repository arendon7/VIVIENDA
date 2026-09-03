import { describe, expect, it } from "vitest";
import { PersistenceBoundaryError, type PrepareEvidenceUploadCommand } from "@/domain/persistence-boundary/contracts";
import type {
  CompletedEvidenceUpload,
  EvidenceDownloadGrant,
  PreparedEvidenceUpload,
} from "@/domain/storage-coordination/coordinator";
import {
  ServerClassifiedEvidenceApplication,
  assertCanonicalIdempotencyKey,
} from "./application-authority";
import type { EvidenceApiApplication } from "./http-boundary";

class RecordingApplication implements EvidenceApiApplication {
  completes: Parameters<EvidenceApiApplication["completeUpload"]>[0][] = [];

  async prepareUpload(_caseId: string, _command: PrepareEvidenceUploadCommand): Promise<PreparedEvidenceUpload> {
    throw new Error("not used");
  }

  async completeUpload(
    input: Parameters<EvidenceApiApplication["completeUpload"]>[0],
  ): Promise<CompletedEvidenceUpload> {
    this.completes.push(input);
    return {
      kind: "appended",
      model: {
        caseId: input.caseId,
        projection: { version: input.expectedVersion + 1, stage: "collecting_evidence" },
      },
    } as unknown as CompletedEvidenceUpload;
  }

  async createDownloadGrant(): Promise<EvidenceDownloadGrant> {
    throw new Error("not used");
  }
}

describe("canonical idempotency authority v0.9", () => {
  it.each([
    "idem-browser-001",
    "req.abc:def_123",
    "A",
    "a".repeat(128),
  ])("accepts canonical key %s", (key) => {
    expect(() => assertCanonicalIdempotencyKey(key)).not.toThrow();
  });

  it.each([
    " idem-browser-001",
    "idem-browser-001 ",
    "idem browser 001",
    "idem/browser/001",
    "idem\tkey",
    "a".repeat(129),
    "",
  ])("rejects non-canonical key representation %j", (key) => {
    expect(() => assertCanonicalIdempotencyKey(key)).toThrow(PersistenceBoundaryError);
  });

  it("blocks non-canonical keys before invoking the inner persistence application", () => {
    const inner = new RecordingApplication();
    const app = new ServerClassifiedEvidenceApplication(inner);

    expect(() =>
      app.completeUpload({
        caseId: "case_demo",
        intentId: "upl_demo",
        expectedVersion: 2,
        idempotencyKey: " idem-browser-001",
      }),
    ).toThrow(PersistenceBoundaryError);
    expect(inner.completes).toHaveLength(0);
  });

  it("forwards canonical keys without rewriting their value", async () => {
    const inner = new RecordingApplication();
    const app = new ServerClassifiedEvidenceApplication(inner);
    const key = "idem-browser-001";

    await app.completeUpload({
      caseId: "case_demo",
      intentId: "upl_demo",
      expectedVersion: 2,
      idempotencyKey: key,
    });

    expect(inner.completes).toEqual([
      {
        caseId: "case_demo",
        intentId: "upl_demo",
        expectedVersion: 2,
        idempotencyKey: key,
      },
    ]);
  });
});
