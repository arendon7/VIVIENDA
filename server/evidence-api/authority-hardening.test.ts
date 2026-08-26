import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { PrepareEvidenceUploadCommand } from "@/domain/persistence-boundary/contracts";
import type {
  CompletedEvidenceUpload,
  EvidenceDownloadGrant,
  PreparedEvidenceUpload,
} from "@/domain/storage-coordination/coordinator";
import {
  ServerClassifiedEvidenceApplication,
  canonicalClassificationForEvidenceKind,
} from "./application-authority";
import type { EvidenceApiApplication } from "./http-boundary";

class RecordingApplication implements EvidenceApiApplication {
  prepares: Array<{ caseId: string; command: PrepareEvidenceUploadCommand }> = [];

  async prepareUpload(caseId: string, command: PrepareEvidenceUploadCommand): Promise<PreparedEvidenceUpload> {
    this.prepares.push({ caseId, command });
    return {
      intentId: "upl_demo",
      evidenceId: "evd_demo",
      intentExpiresAt: "2026-08-26T13:15:00.000Z",
      providerGrantExpiresAt: "2026-08-26T15:00:00.000Z",
      bucketId: "vivienda-evidence",
      objectPath: "quarantine/upl_demo/evd_demo/obj_abcdef",
      uploadToken: "token",
      upsert: false,
    };
  }

  async completeUpload(): Promise<CompletedEvidenceUpload> {
    throw new Error("not used");
  }

  async createDownloadGrant(): Promise<EvidenceDownloadGrant> {
    throw new Error("not used");
  }
}

describe("server-controlled evidence classification v0.9", () => {
  it("maps mortgage statements to financial-credit semiprivate + restricted", () => {
    expect(canonicalClassificationForEvidenceKind("statement")).toEqual({
      legalDataCategory: "financial_credit_semiprivate",
      securityTier: "restricted",
    });
  });

  it("uses highly-restricted operational defaults for authority, court and other documents", () => {
    for (const kind of ["authority", "court_document", "other"] as const) {
      expect(canonicalClassificationForEvidenceKind(kind)).toEqual({
        legalDataCategory: "private",
        securityTier: "highly_restricted",
      });
    }
  });

  it("prevents the browser/application caller from downgrading a statement to non-personal/open", async () => {
    const inner = new RecordingApplication();
    const classified = new ServerClassifiedEvidenceApplication(inner);

    await classified.prepareUpload("case_demo", {
      kind: "statement",
      legalDataCategory: "non_personal",
      securityTier: "open",
    });

    expect(inner.prepares).toEqual([
      {
        caseId: "case_demo",
        command: {
          kind: "statement",
          legalDataCategory: "financial_credit_semiprivate",
          securityTier: "restricted",
        },
      },
    ]);
  });
});

describe("trusted-origin wiring v0.9", () => {
  const root = process.cwd();
  const trustedOrigin = readFileSync(join(root, "server/evidence-api/trusted-origin.server.ts"), "utf8");
  const runtime = readFileSync(join(root, "server/evidence-api/runtime.server.ts"), "utf8");
  const routes = [
    "app/api/v1/cases/[caseId]/evidence/uploads/route.ts",
    "app/api/v1/cases/[caseId]/evidence/uploads/[intentId]/complete/route.ts",
    "app/api/v1/cases/[caseId]/evidence/[evidenceId]/download/route.ts",
  ].map((path) => readFileSync(join(root, path), "utf8"));

  it("keeps trusted origin configuration server-only and fail-closed when absent", () => {
    expect(trustedOrigin).toContain('import "server-only"');
    expect(trustedOrigin).toContain("process.env.VIVIENDA_TRUSTED_ORIGIN");
    expect(trustedOrigin).toContain('code: "origin_policy_unavailable"');
    expect(trustedOrigin).toContain("status: 503");
    expect(trustedOrigin).not.toContain("NEXT_PUBLIC_");
  });

  it("rejects non-HTTPS origins except explicit local-development hosts", () => {
    expect(trustedOrigin).toContain('url.protocol !== "https:"');
    expect(trustedOrigin).toContain('url.protocol === "http:"');
    expect(trustedOrigin).toContain("LOCAL_HOSTS.has(url.hostname)");
  });

  it("rebinds request URL to the configured origin before the inner same-origin guard", () => {
    expect(trustedOrigin).toContain("const trustedUrl = `${trustedOrigin}${incoming.pathname}${incoming.search}`");
    expect(trustedOrigin).toContain("return new Request(trustedUrl, request)");
    for (const route of routes) {
      expect(route).toContain("bindRequestToTrustedOrigin(request)");
      expect(route).toContain("guardedRequest instanceof Response");
      expect(route).toMatch(/evidenceHttpApi\.(prepare|complete|download)\(guardedRequest/);
      expect(route).not.toContain("process.env");
    }
  });

  it("forces the production assembly through the server classification decorator", () => {
    expect(runtime).toContain("ServerClassifiedEvidenceApplication");
    expect(runtime).toContain("const classifiedApplication = new ServerClassifiedEvidenceApplication");
    expect(runtime).toContain("new EvidenceHttpApi(\n  classifiedApplication,");
  });
});
