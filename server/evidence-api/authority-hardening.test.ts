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
import {
  canonicalTrustedOrigin,
  rebindRequestToConfiguredOrigin,
} from "./trusted-origin-policy";

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

describe("trusted-origin policy v0.9", () => {
  it("accepts HTTPS origins and explicit loopback HTTP only", () => {
    expect(canonicalTrustedOrigin("https://vivienda.example")).toBe("https://vivienda.example");
    expect(canonicalTrustedOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(canonicalTrustedOrigin("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
    expect(canonicalTrustedOrigin("http://vivienda.example")).toBeNull();
    expect(canonicalTrustedOrigin("https://vivienda.example/path")).toBeNull();
    expect(canonicalTrustedOrigin("https://user:pass@vivienda.example")).toBeNull();
    expect(canonicalTrustedOrigin(undefined)).toBeNull();
  });

  it("rebinds a spoofed request URL to the server-configured origin while preserving browser Origin and body", async () => {
    const incoming = new Request("https://attacker-controlled-host.example/api/v1/cases/case_demo/evidence/uploads?x=1", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/json",
      },
      body: JSON.stringify({ kind: "statement" }),
    });

    const rebound = rebindRequestToConfiguredOrigin(incoming, "https://vivienda.example");
    expect(rebound).not.toBeNull();
    expect(rebound!.url).toBe("https://vivienda.example/api/v1/cases/case_demo/evidence/uploads?x=1");
    expect(rebound!.headers.get("origin")).toBe("https://evil.example");
    expect(rebound!.method).toBe("POST");
    expect(await rebound!.text()).toBe(JSON.stringify({ kind: "statement" }));
  });

  it("fails to produce a rebound request when trusted-origin configuration is absent or invalid", () => {
    const incoming = new Request("https://host.example/api", { method: "POST", body: "{}" });
    expect(rebindRequestToConfiguredOrigin(incoming, undefined)).toBeNull();
    expect(rebindRequestToConfiguredOrigin(incoming, "http://public.example")).toBeNull();
  });
});

describe("trusted-origin server wiring v0.9", () => {
  const root = process.cwd();
  const trustedOriginServer = readFileSync(join(root, "server/evidence-api/trusted-origin.server.ts"), "utf8");
  const trustedOriginPolicy = readFileSync(join(root, "server/evidence-api/trusted-origin-policy.ts"), "utf8");
  const runtime = readFileSync(join(root, "server/evidence-api/runtime.server.ts"), "utf8");
  const routes = [
    "app/api/v1/cases/[caseId]/evidence/uploads/route.ts",
    "app/api/v1/cases/[caseId]/evidence/uploads/[intentId]/complete/route.ts",
    "app/api/v1/cases/[caseId]/evidence/[evidenceId]/download/route.ts",
  ].map((path) => readFileSync(join(root, path), "utf8"));

  it("keeps trusted origin configuration server-only and fail-closed when absent", () => {
    expect(trustedOriginServer).toContain('import "server-only"');
    expect(trustedOriginServer).toContain("process.env.VIVIENDA_TRUSTED_ORIGIN");
    expect(trustedOriginServer).toContain('code: "origin_policy_unavailable"');
    expect(trustedOriginServer).toContain("status: 503");
    expect(trustedOriginServer).not.toContain("NEXT_PUBLIC_");
  });

  it("keeps protocol restrictions in the testable policy rather than trusting request Host", () => {
    expect(trustedOriginPolicy).toContain('url.protocol !== "https:"');
    expect(trustedOriginPolicy).toContain('url.protocol === "http:"');
    expect(trustedOriginPolicy).toContain("LOCAL_HOSTS.has(url.hostname)");
    expect(trustedOriginPolicy).toContain("return new Request(trustedUrl, request)");
  });

  it("forces every browser evidence route through trusted-origin binding", () => {
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
