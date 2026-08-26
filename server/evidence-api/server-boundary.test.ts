import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const runtimePath = join(root, "server/evidence-api/runtime.server.ts");
const prepareRoutePath = join(root, "app/api/v1/cases/[caseId]/evidence/uploads/route.ts");
const completeRoutePath = join(root, "app/api/v1/cases/[caseId]/evidence/uploads/[intentId]/complete/route.ts");
const downloadRoutePath = join(root, "app/api/v1/cases/[caseId]/evidence/[evidenceId]/download/route.ts");

const runtime = readFileSync(runtimePath, "utf8");
const routes = [prepareRoutePath, completeRoutePath, downloadRoutePath].map((path) => readFileSync(path, "utf8"));

describe("Next server-only evidence boundary v0.9", () => {
  it("pins privileged runtime to server-only and fails closed before infrastructure activation", () => {
    expect(runtime).toContain('import "server-only"');
    expect(runtime).toContain("UnconfiguredEvidenceApplication");
    expect(runtime).toContain("FailClosedRateLimit");
    expect(runtime).toContain('return { kind: "unavailable" as const }');
  });

  it("contains no browser-exported or hard-coded provider credentials", () => {
    expect(runtime).not.toMatch(/NEXT_PUBLIC_/);
    expect(runtime).not.toMatch(/SUPABASE_(SERVICE|SECRET|ANON|PUBLISHABLE)/i);
    expect(runtime).not.toMatch(/service[_-]?role[_-]?key/i);
    expect(runtime).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\./);
  });

  it("keeps route handlers thin and dependent only on the server runtime", () => {
    for (const route of routes) {
      expect(route).toContain('@/server/evidence-api/runtime.server');
      expect(route).toContain('export const dynamic = "force-dynamic"');
      expect(route).not.toContain("Supabase");
      expect(route).not.toContain("CasePersistenceService");
      expect(route).not.toContain("StorageGateway");
      expect(route).not.toContain("subjectRef");
      expect(route).not.toContain("service_role");
      expect(route).not.toContain("process.env");
    }
  });

  it("exposes no public delete, cleanup or object-registry route", () => {
    const forbiddenPublicRoutes = [
      "app/api/v1/evidence/delete/route.ts",
      "app/api/v1/evidence/cleanup/route.ts",
      "app/api/v1/evidence/objects/route.ts",
      "app/api/v1/internal/evidence/delete/route.ts",
    ];
    for (const relative of forbiddenPublicRoutes) {
      expect(existsSync(join(root, relative))).toBe(false);
    }
  });

  it("defines exactly the three intended browser-facing evidence route files for this slice", () => {
    expect(existsSync(prepareRoutePath)).toBe(true);
    expect(existsSync(completeRoutePath)).toBe(true);
    expect(existsSync(downloadRoutePath)).toBe(true);
  });
});
