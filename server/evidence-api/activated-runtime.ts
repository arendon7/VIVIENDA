import {
  assertEvidenceRuntimeActivationAllowed,
  type EvidenceRuntimeActivationDecision,
  type EvidenceRuntimeActivationFacts,
} from "./activation-preflight";
import {
  EvidenceHttpApi,
  type ApiAuditLogPort,
  type ApiRateLimitPort,
  type ApiRequestContextSource,
  type EvidenceApiApplication,
} from "./http-boundary";

export type ActivatedEvidenceRuntimeInput = {
  activationFacts: EvidenceRuntimeActivationFacts;
  application: EvidenceApiApplication;
  contexts: ApiRequestContextSource;
  rateLimits: ApiRateLimitPort;
  audit: ApiAuditLogPort;
};

export type ActivatedEvidenceRuntime = {
  activation: EvidenceRuntimeActivationDecision;
  api: EvidenceHttpApi;
};

/**
 * Canonical construction path for a future live evidence runtime.
 *
 * This factory does not configure providers and does not infer readiness from the
 * presence of environment variables. Every requirement must be explicitly verified
 * by deployment/preflight work before the HTTP runtime can be constructed here.
 *
 * The current preview runtime intentionally remains on runtime.server.ts with
 * UnconfiguredEvidenceApplication + FailClosedRateLimit.
 */
export function createActivatedEvidenceRuntime(
  input: ActivatedEvidenceRuntimeInput,
): ActivatedEvidenceRuntime {
  const activation = assertEvidenceRuntimeActivationAllowed(input.activationFacts);

  return {
    activation,
    api: new EvidenceHttpApi(
      input.application,
      input.contexts,
      input.rateLimits,
      input.audit,
    ),
  };
}
