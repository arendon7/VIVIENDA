import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateDevEnvironmentQualification,
  verifiedDevEnvironmentQualificationFacts,
} from "./dev-provisioning-qualification";
import {
  evaluateProviderClientFactoryPreflight,
  type ProviderClientFactoryPreflightDecision,
} from "./provider-client-factory-preflight";
import {
  REMOTE_PROJECT_IDENTITY_ATTESTATION_EXECUTOR_VERSION,
  RemoteIdentityAttestationExecutorError,
  createRemoteProjectIdentityAttestationExecutor,
  remoteIdentityAttestationExecutorProducesNoActivationFacts,
  type RemoteIdentityAttestationObservation,
  type RemoteIdentityAttestationTransport,
} from "./remote-project-identity-attestation-executor";

const PROJECT_BINDING_ID = "binding_dev_033";
const PROJECT_REF = "bvykdyhlwawojivopztl";
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;
const REQUESTED_AT = "2026-09-13T17:20:00.000Z";
const OBSERVED_AT = "2026-09-13T17:20:01.000Z";
const COMPLETED_AT = "2026-09-13T17:20:02.000Z";

function preflight(): ProviderClientFactoryPreflightDecision {
  return evaluateProviderClientFactoryPreflight({
    qualification: evaluateDevEnvironmentQualification(verifiedDevEnvironmentQualificationFacts()),
    manifest: {
      provider: "supabase",
      projectLabel: "vivienda-dev",
      projectBindingId: PROJECT_BINDING_ID,
      projectUrl: PROJECT_URL,
      expectedRemoteProjectRef: PROJECT_REF,
      source: "external_injected_configuration",
      syntheticOnly: true,
      liveRuntimeAuthorized: false,
      secretValuesEmbedded: false,
      environmentReadRequiredByContract: false,
      authorityHandles: {
        candidate_runtime_rpc: {
          authority: "candidate_runtime",
          handleId: "handle.runtime.033",
          source: "external_secret_broker",
          serverOnly: true,
          secretValueExposedToApplication: false,
        },
        dev_probe_support_rpc: {
          authority: "probe_support",
          handleId: "handle.support.033",
          source: "external_secret_broker",
          serverOnly: true,
          secretValueExposedToApplication: false,
        },
        dev_fixture_admin: {
          authority: "fixture_admin",
          handleId: "handle.admin.033",
          source: "external_secret_broker",
          serverOnly: true,
          secretValueExposedToApplication: false,
        },
        dev_storage: {
          authority: "storage_candidate",
          handleId: "handle.storage.033",
          source: "external_secret_broker",
          serverOnly: true,
          secretValueExposedToApplication: false,
        },
        candidate_session_authority: {
          authority: "synthetic_session",
          handleId: "handle.session.033",
          source: "external_secret_broker",
          serverOnly: true,
          secretValueExposedToApplication: false,
        },
      },
    },
    constructionPolicy: {
      sdkFactoryInjected: true,
      sdkDependencyRequiredByContract: false,
      providerIoOnConstruction: false,
      remoteAttestationOnConstruction: false,
      sessionBootstrapOnConstruction: false,
      runtimeServerUsed: false,
    },
  });
}

type Options = {
  throwTransport?: boolean;
  providerError?: boolean;
  observationPatch?: Partial<RemoteIdentityAttestationObservation>;
  transportPatch?: Record<string, unknown>;
};

function fixture(options: Options = {}) {
  let transportCalls = 0;
  let clockCalls = 0;
  let tokenCalls = 0;
  let observedInput: unknown = null;
  const times = [REQUESTED_AT, COMPLETED_AT];

  const transport = {
    channel: "remote_project_identity_attestation_transport",
    provider: "supabase",
    projectLabel: "vivienda-dev",
    syntheticOnly: true,
    liveRuntimeAuthorized: false,
    liveProviderEvidenceProven: false,
    async observe(input: Parameters<RemoteIdentityAttestationTransport["observe"]>[0]) {
      transportCalls += 1;
      observedInput = input;
      if (options.throwTransport) throw new Error("sensitive transport detail");
      if (options.providerError) {
        return {
          data: null,
          error: { code: "upstream_down", status: 503, message: "sensitive provider detail" },
        };
      }
      const observation: RemoteIdentityAttestationObservation = {
        provider: "supabase",
        projectLabel: "vivienda-dev",
        projectBindingId: PROJECT_BINDING_ID,
        projectRef: PROJECT_REF,
        projectUrl: PROJECT_URL,
        requestId: input.requestId,
        nonce: input.nonce,
        observedAt: OBSERVED_AT,
        source: "injected_transport_observation",
        ...options.observationPatch,
      };
      return { data: observation, error: null };
    },
    ...options.transportPatch,
  } as unknown as RemoteIdentityAttestationTransport;

  const executor = createRemoteProjectIdentityAttestationExecutor({
    preflight: preflight(),
    transport,
    now: () => {
      clockCalls += 1;
      return times[Math.min(clockCalls - 1, times.length - 1)]!;
    },
    tokenSource: (kind) => {
      tokenCalls += 1;
      return kind === "request_id" ? "request.identity.033" : "nonce.identity.033";
    },
  });

  return {
    executor,
    counters: () => ({ transportCalls, clockCalls, tokenCalls }),
    observedInput: () => observedInput,
  };
}

function expectError(error: unknown, code: RemoteIdentityAttestationExecutorError["code"]) {
  expect(error).toBeInstanceOf(RemoteIdentityAttestationExecutorError);
  expect((error as RemoteIdentityAttestationExecutorError).code).toBe(code);
  expect((error as Error).message).toBe("Remote project identity attestation failed.");
}

async function capture(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (error) {
    return error;
  }
}

describe("V0.23.33 remote project identity attestation executor", () => {
  it("constructs with zero transport, clock or token I/O", () => {
    const f = fixture();
    expect(f.executor.version).toBe(REMOTE_PROJECT_IDENTITY_ATTESTATION_EXECUTOR_VERSION);
    expect(f.executor.syntheticOnly).toBe(true);
    expect(f.executor.liveRuntimeAuthorized).toBe(false);
    expect(f.executor.liveProviderIoProven).toBe(false);
    expect(f.counters()).toEqual({ transportCalls: 0, clockCalls: 0, tokenCalls: 0 });
  });

  it("satisfies only the injected attestation contract and never elevates live authority", async () => {
    const f = fixture();
    const result = await f.executor.execute();

    expect(result).toEqual({
      version: REMOTE_PROJECT_IDENTITY_ATTESTATION_EXECUTOR_VERSION,
      state: "attestation_contract_satisfied",
      provider: "supabase",
      projectLabel: "vivienda-dev",
      projectBindingId: PROJECT_BINDING_ID,
      expectedProjectRef: PROJECT_REF,
      expectedProjectUrl: PROJECT_URL,
      requestId: "request.identity.033",
      observationNonce: "nonce.identity.033",
      observedAt: OBSERVED_AT,
      attestationContractSatisfied: true,
      injectedTransportInvoked: true,
      liveProviderEvidenceProven: false,
      remoteIdentityVerified: false,
      clientMaterializationAuthorized: false,
      sessionBootstrapProven: false,
      providerParityProven: false,
      runtimeActivationAuthorized: false,
      deploymentAuthorized: false,
    });
    expect(f.counters()).toEqual({ transportCalls: 1, clockCalls: 2, tokenCalls: 2 });
    expect(remoteIdentityAttestationExecutorProducesNoActivationFacts()).toEqual({});
  });

  it("binds each observation to exact request id and nonce", async () => {
    for (const observationPatch of [
      { requestId: "request.other.033" },
      { nonce: "nonce.other.033" },
    ]) {
      const f = fixture({ observationPatch });
      expectError(await capture(f.executor.execute()), "invalid_transport_response");
    }
  });

  it("rejects project binding, project ref and project URL mismatches", async () => {
    const variants: Partial<RemoteIdentityAttestationObservation>[] = [
      { projectBindingId: "binding_other_033" },
      { projectRef: "otherprojectref001" },
      { projectUrl: "https://otherprojectref001.supabase.co" },
      { projectUrl: `${PROJECT_URL}/rest/v1` },
    ];
    for (const observationPatch of variants) {
      const f = fixture({ observationPatch });
      expectError(await capture(f.executor.execute()), "identity_mismatch");
    }
  });

  it("rejects malformed provider/source observation metadata", async () => {
    const variants = [
      { provider: "other" },
      { projectLabel: "vivienda-prod" },
      { source: "untrusted_source" },
      { observedAt: "not-a-date" },
    ];
    for (const patch of variants) {
      const f = fixture({ observationPatch: patch as unknown as Partial<RemoteIdentityAttestationObservation> });
      expectError(await capture(f.executor.execute()), "invalid_transport_response");
    }
  });

  it("enforces observation freshness and bounded clock skew", async () => {
    for (const observedAt of [
      "2026-09-13T17:13:00.000Z",
      "2026-09-13T17:22:00.000Z",
    ]) {
      const f = fixture({ observationPatch: { observedAt } });
      expectError(await capture(f.executor.execute()), "stale_observation");
    }
  });

  it("sanitizes thrown and provider-reported transport failures", async () => {
    const thrown = await capture(fixture({ throwTransport: true }).executor.execute());
    expectError(thrown, "transport_unavailable");
    expect(String((thrown as Error).message)).not.toContain("sensitive");

    const reported = await capture(fixture({ providerError: true }).executor.execute());
    expectError(reported, "transport_unavailable");
    expect(String((reported as Error).message)).not.toContain("provider detail");
  });

  it("rejects a transport that claims live evidence or wrong authority metadata before I/O", () => {
    const variants = [
      { liveProviderEvidenceProven: true },
      { liveRuntimeAuthorized: true },
      { syntheticOnly: false },
      { projectLabel: "vivienda-prod" },
      { provider: "other" },
      { channel: "other_channel" },
    ];
    for (const transportPatch of variants) {
      let thrown: unknown;
      try {
        fixture({ transportPatch });
      } catch (error) {
        thrown = error;
      }
      expectError(thrown, "invalid_transport");
    }
  });

  it("rejects a blocked/tampered V0.23.32 preflight before any transport I/O", () => {
    const valid = preflight();
    const variants = [
      { ...valid, state: "blocked" },
      { ...valid, remoteIdentityVerified: true },
      { ...valid, clientMaterializationAuthorized: true },
      { ...valid, blockers: [{ code: "invalid_project_configuration", scope: "project" }] },
      { ...valid, remoteIdentityAttestation: null },
    ];
    for (const badPreflight of variants) {
      let transportCalls = 0;
      let thrown: unknown;
      try {
        createRemoteProjectIdentityAttestationExecutor({
          preflight: badPreflight as unknown as ProviderClientFactoryPreflightDecision,
          transport: {
            channel: "remote_project_identity_attestation_transport",
            provider: "supabase",
            projectLabel: "vivienda-dev",
            syntheticOnly: true,
            liveRuntimeAuthorized: false,
            liveProviderEvidenceProven: false,
            async observe() {
              transportCalls += 1;
              throw new Error("must not execute");
            },
          },
          now: () => REQUESTED_AT,
          tokenSource: () => "opaque.token.033",
        });
      } catch (error) {
        thrown = error;
      }
      expectError(thrown, "preflight_not_ready");
      expect(transportCalls).toBe(0);
    }
  });

  it("rejects tampering between V0.23.32 summary fields and its attestation requirement", () => {
    const valid = preflight();
    const tampered = {
      ...valid,
      normalizedProjectUrl: "https://other.example.com",
    } as unknown as ProviderClientFactoryPreflightDecision;

    let thrown: unknown;
    try {
      createRemoteProjectIdentityAttestationExecutor({
        preflight: tampered,
        transport: fixture().executor["input" as never] as never,
        now: () => REQUESTED_AT,
        tokenSource: () => "opaque.token.033",
      });
    } catch (error) {
      thrown = error;
    }
    expectError(thrown, "invalid_requirement");
  });

  it("validates clocks and opaque token source before transport invocation", async () => {
    const validTransport: RemoteIdentityAttestationTransport = {
      channel: "remote_project_identity_attestation_transport",
      provider: "supabase",
      projectLabel: "vivienda-dev",
      syntheticOnly: true,
      liveRuntimeAuthorized: false,
      liveProviderEvidenceProven: false,
      async observe() {
        throw new Error("must not execute");
      },
    };

    const badClock = createRemoteProjectIdentityAttestationExecutor({
      preflight: preflight(),
      transport: validTransport,
      now: () => "not-a-date",
      tokenSource: () => "opaque.token.033",
    });
    expectError(await capture(badClock.execute()), "invalid_clock");

    for (const tokenSource of [
      () => "tiny",
      () => "same.token.033",
    ]) {
      const executor = createRemoteProjectIdentityAttestationExecutor({
        preflight: preflight(),
        transport: validTransport,
        now: () => REQUESTED_AT,
        tokenSource: tokenSource as (kind: "request_id" | "attestation_nonce") => string,
      });
      expectError(await capture(executor.execute()), "invalid_token_source");
    }
  });

  it("contains no env reads, SDK client creation, runtime activation imports or direct network I/O", () => {
    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/remote-project-identity-attestation-executor.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/process\.env|Deno\.env|SUPABASE_(URL|KEY|SECRET)|service_role|sb_secret_/);
    expect(source).not.toMatch(/@supabase\/supabase-js|createClient\s*\(/);
    expect(source).not.toMatch(/from\s+["']\.\/runtime\.server["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activated-runtime["']/);
    expect(source).not.toMatch(/from\s+["']\.\/activation-preflight["']/);
    expect(source).not.toMatch(/fetch\s*\(|https\.request|http\.request|\.rpc\s*\(/);
  });
});
