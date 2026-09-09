import type { SyntheticEvidenceFailureScenario } from "./synthetic-failure-rehearsal";
import {
  EVIDENCE_RUNTIME_PARITY_BASELINE_VERSION,
  evaluateEvidenceRuntimeParity,
  type EvidenceRuntimeFailureObservation,
  type EvidenceRuntimeHappyPathObservation,
  type EvidenceRuntimeParityDecision,
  type EvidenceRuntimeParityObservation,
} from "./runtime-parity-contract";

export const PROVIDER_CANDIDATE_PARITY_FAILURE_SCENARIOS = [
  "unauthenticated_prepare",
  "missing_data_authorization",
  "cross_case_access",
  "missing_uploaded_object",
  "rate_limit_unavailable",
] as const satisfies readonly SyntheticEvidenceFailureScenario[];

export type ProviderCandidateParityProbeScope = "happy_path" | SyntheticEvidenceFailureScenario;

/**
 * Provider-neutral seam for a future DEV candidate.
 *
 * Implementations are responsible for creating isolated, disposable fixtures for every probe.
 * They may perform external IO against an explicitly authorized DEV environment, but must never
 * use production data or the public runtime as part of parity certification.
 */
export interface EvidenceRuntimeProviderCandidateProbe {
  readonly externalIoOccurred: boolean;
  readonly liveRuntimeAuthorized: boolean;
  readonly runtimeServerWasUsed: boolean;

  captureHappyPath(): Promise<EvidenceRuntimeHappyPathObservation>;
  captureFailureScenario(
    scenario: SyntheticEvidenceFailureScenario,
  ): Promise<EvidenceRuntimeFailureObservation>;
}

export type ProviderCandidateParityCertification = {
  mode: "provider_candidate_parity_certification";
  baselineVersion: typeof EVIDENCE_RUNTIME_PARITY_BASELINE_VERSION;
  probeOrder: readonly [
    "happy_path",
    "unauthenticated_prepare",
    "missing_data_authorization",
    "cross_case_access",
    "missing_uploaded_object",
    "rate_limit_unavailable",
  ];
  observation: EvidenceRuntimeParityObservation;
  decision: EvidenceRuntimeParityDecision;
  runtimeActivationAuthorized: false;
  activationFactsProduced: false;
  deploymentAuthorized: false;
};

export class ProviderCandidateParityHarnessError extends Error {
  readonly code = "provider_candidate_parity_probe_failed" as const;

  constructor(readonly scope: ProviderCandidateParityProbeScope) {
    super(`Provider candidate parity probe failed in ${scope}.`);
    this.name = "ProviderCandidateParityHarnessError";
  }
}

const PROBE_ORDER: ProviderCandidateParityCertification["probeOrder"] = [
  "happy_path",
  "unauthenticated_prepare",
  "missing_data_authorization",
  "cross_case_access",
  "missing_uploaded_object",
  "rate_limit_unavailable",
];

async function captureHappyPathSafely(
  candidate: EvidenceRuntimeProviderCandidateProbe,
): Promise<EvidenceRuntimeHappyPathObservation> {
  try {
    return await candidate.captureHappyPath();
  } catch {
    throw new ProviderCandidateParityHarnessError("happy_path");
  }
}

async function captureFailureSafely(
  candidate: EvidenceRuntimeProviderCandidateProbe,
  scenario: SyntheticEvidenceFailureScenario,
): Promise<EvidenceRuntimeFailureObservation> {
  try {
    return await candidate.captureFailureScenario(scenario);
  } catch {
    throw new ProviderCandidateParityHarnessError(scenario);
  }
}

/**
 * Runs the canonical parity probe sequence for a future DEV provider candidate.
 *
 * The harness only produces conformance evidence. It deliberately does not import activation
 * preflight code, build activation facts, invoke createActivatedEvidenceRuntime, or use
 * runtime.server.ts. A conformant certification is therefore never an activation decision.
 */
export async function certifyEvidenceRuntimeProviderCandidate(
  candidate: EvidenceRuntimeProviderCandidateProbe,
): Promise<ProviderCandidateParityCertification> {
  const happyPath = await captureHappyPathSafely(candidate);
  const failures: EvidenceRuntimeFailureObservation[] = [];

  // Sequential execution is intentional. Future DEV implementations must isolate each fixture;
  // the harness avoids hidden concurrency between stateful provider scenarios.
  for (const scenario of PROVIDER_CANDIDATE_PARITY_FAILURE_SCENARIOS) {
    failures.push(await captureFailureSafely(candidate, scenario));
  }

  const observation: EvidenceRuntimeParityObservation = {
    baselineVersion: EVIDENCE_RUNTIME_PARITY_BASELINE_VERSION,
    source: "dev_provider_candidate",
    externalIoOccurred: candidate.externalIoOccurred,
    liveRuntimeAuthorized: candidate.liveRuntimeAuthorized,
    runtimeServerWasUsed: candidate.runtimeServerWasUsed,
    happyPath,
    failures,
  };

  const decision = evaluateEvidenceRuntimeParity(observation);

  return {
    mode: "provider_candidate_parity_certification",
    baselineVersion: EVIDENCE_RUNTIME_PARITY_BASELINE_VERSION,
    probeOrder: PROBE_ORDER,
    observation,
    decision,
    runtimeActivationAuthorized: false,
    activationFactsProduced: false,
    deploymentAuthorized: false,
  };
}
