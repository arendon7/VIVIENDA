import "server-only";

import { randomUUID } from "node:crypto";
import { PersistenceBoundaryError } from "@/domain/persistence-boundary/contracts";
import {
  EvidenceHttpApi,
  type ApiAuditLogPort,
  type ApiRateLimitPort,
  type ApiRequestContextSource,
  type EvidenceApiApplication,
} from "./http-boundary";

class UnconfiguredEvidenceApplication implements EvidenceApiApplication {
  private unavailable(): never {
    throw new PersistenceBoundaryError(
      "provider_error",
      "Evidence API application wiring is not configured for this environment.",
    );
  }

  async prepareUpload(): Promise<never> {
    return this.unavailable();
  }

  async completeUpload(): Promise<never> {
    return this.unavailable();
  }

  async createDownloadGrant(): Promise<never> {
    return this.unavailable();
  }
}

class ServerRequestContextSource implements ApiRequestContextSource {
  resolve() {
    return {
      requestId: `req_${randomUUID().replaceAll("-", "")}`,
      // This is intentionally not an identity key. Real session-derived rate-limit context
      // belongs to the infrastructure activation slice. The rate limiter below fails closed.
      rateLimitKey: "runtime_unconfigured",
    };
  }
}

class FailClosedRateLimit implements ApiRateLimitPort {
  async consume() {
    return { kind: "unavailable" as const };
  }
}

class NoopSafeAudit implements ApiAuditLogPort {
  record() {
    // Production structured audit transport is intentionally not invented in v0.9.
  }
}

export const evidenceHttpApi = new EvidenceHttpApi(
  new UnconfiguredEvidenceApplication(),
  new ServerRequestContextSource(),
  new FailClosedRateLimit(),
  new NoopSafeAudit(),
);
