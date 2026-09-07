import { describe, expect, it } from "vitest";
import { createActivatedEvidenceRuntime } from "./activated-runtime";
import { EvidenceRuntimeActivationError, verifiedEvidenceRuntimeActivationFacts } from "./activation-preflight";
import type {
  ApiAuditLogPort,
  ApiRateLimitPort,
  ApiRequestContextSource,
  EvidenceApiApplication,
} from "./http-boundary";

const application: EvidenceApiApplication = {
  async prepareUpload() {
    throw new Error("not exercised");
  },
  async completeUpload() {
    throw new Error("not exercised");
  },
  async createDownloadGrant() {
    throw new Error("not exercised");
  },
};

const contexts: ApiRequestContextSource = {
  resolve() {
    return { requestId: "req_runtime_test", rateLimitKey: "sub_runtime_test" };
  },
};

const rateLimits: ApiRateLimitPort = {
  async consume() {
    return { kind: "allowed" };
  },
};

const audit: ApiAuditLogPort = {
  record() {},
};

describe("createActivatedEvidenceRuntime", () => {
  it("refuses to construct a live runtime from partial readiness", () => {
    expect(() =>
      createActivatedEvidenceRuntime({
        activationFacts: {
          dedicated_vivienda_project: "verified",
          migrations_applied: "verified",
        },
        application,
        contexts,
        rateLimits,
        audit,
      }),
    ).toThrow(EvidenceRuntimeActivationError);
  });

  it("constructs the HTTP runtime only after all requirements are verified", () => {
    const runtime = createActivatedEvidenceRuntime({
      activationFacts: verifiedEvidenceRuntimeActivationFacts(),
      application,
      contexts,
      rateLimits,
      audit,
    });

    expect(runtime.activation.runtimeMayActivate).toBe(true);
    expect(runtime.activation.state).toBe("ready_for_controlled_activation");
    expect(runtime.api).toBeDefined();
  });
});
