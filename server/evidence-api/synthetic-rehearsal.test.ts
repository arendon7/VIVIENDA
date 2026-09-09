import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runSyntheticEvidenceRuntimeRehearsal } from "./synthetic-rehearsal";

const root = process.cwd();
const runtimeServerSource = readFileSync(join(root, "server/evidence-api/runtime.server.ts"), "utf8");
const rehearsalSource = readFileSync(join(root, "server/evidence-api/synthetic-rehearsal.ts"), "utf8");

describe("Synthetic Evidence Runtime Rehearsal V0.23.17", () => {
  it("rehearses the canonical R7 assisted sequence through EVIDENCE_ATTACHED using real domain persistence", async () => {
    const report = await runSyntheticEvidenceRuntimeRehearsal();

    expect(report.mode).toBe("synthetic_rehearsal");
    expect(report.routeCode).toBe("R7_RECLAMACION");
    expect(report.caseTrack).toBe("assisted");
    expect(report.eventSequence).toEqual([
      "CASE_CREATED",
      "DATA_AUTHORIZATION_RECORDED",
      "SERVICE_AGREEMENT_ACCEPTED",
      "EVIDENCE_REQUESTED",
      "EVIDENCE_ATTACHED",
    ]);
    expect(report.finalCaseVersion).toBe(5);
    expect(report.finalCaseStage).toBe("collecting_evidence");
  });

  it("proves server classification overrides a weaker browser classification", async () => {
    const report = await runSyntheticEvidenceRuntimeRehearsal();

    expect(report.evidence).toEqual([
      {
        kind: "statement",
        legalDataCategory: "financial_credit_semiprivate",
        securityTier: "restricted",
        lifecycle: "active",
      },
    ]);
    expect(report.boundaries.clientClassificationWasOverridden).toBe(true);
  });

  it("does not confuse technical object inspection with domain evidence verification", async () => {
    const report = await runSyntheticEvidenceRuntimeRehearsal();

    expect(report.boundaries.technicalInspectionDidNotCreateEvidenceVerifiedEvent).toBe(true);
    expect(report.eventSequence).not.toContain("EVIDENCE_VERIFIED");
    expect(report.finalCaseStage).toBe("collecting_evidence");
  });

  it("exercises prepare, complete and download through the real HTTP boundary", async () => {
    const report = await runSyntheticEvidenceRuntimeRehearsal();

    expect(report.httpStatuses).toEqual({ prepare: 200, complete: 200, download: 200 });
    expect(report.auditOperations).toEqual([
      { operation: "evidence.prepare", status: 200 },
      { operation: "evidence.complete", status: 200 },
      { operation: "evidence.download", status: 200 },
    ]);
  });

  it("keeps provider coordinates and checksums out of the Case read-model report", async () => {
    const report = await runSyntheticEvidenceRuntimeRehearsal();
    const serialized = JSON.stringify(report);

    expect(report.boundaries.rawStorageLocatorExposedInCaseReadModel).toBe(false);
    expect(report.boundaries.checksumExposedInCaseReadModel).toBe(false);
    expect(serialized).not.toContain("obj_synthetic");
    expect(serialized).not.toContain("synthetic-upload-token");
    expect(serialized).not.toContain("a".repeat(64));
  });

  it("is deterministic and performs no external or live-runtime activation", async () => {
    const first = await runSyntheticEvidenceRuntimeRehearsal();
    const second = await runSyntheticEvidenceRuntimeRehearsal();

    expect(second).toEqual(first);
    expect(first.externalIoOccurred).toBe(false);
    expect(first.liveRuntimeAuthorized).toBe(false);
    expect(first.runtimeServerWasUsed).toBe(false);
  });

  it("is not wired into the public runtime and does not import the live activation factory", () => {
    expect(runtimeServerSource).not.toContain("synthetic-rehearsal");
    expect(runtimeServerSource).not.toContain("runSyntheticEvidenceRuntimeRehearsal");
    expect(rehearsalSource).not.toMatch(/from\s+["']\.\/activated-runtime["']/);
    expect(rehearsalSource).not.toMatch(/import\s*\{[^}]*createActivatedEvidenceRuntime[^}]*\}/s);
  });
});
