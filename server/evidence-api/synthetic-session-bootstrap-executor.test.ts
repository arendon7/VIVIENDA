import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateDevEnvironmentQualification,
  verifiedDevEnvironmentQualificationFacts,
} from "./dev-provisioning-qualification";
import type { ProviderCandidateFixtureLease } from "./provider-candidate-fixture-lifecycle";
import {
  evaluateProviderClientFactoryPreflight,
  type ProviderClientFactoryPreflightDecision,
} from "./provider-client-factory-preflight";
import {
  SYNTHETIC_SESSION_BOOTSTRAP_EXECUTOR_VERSION,
  SyntheticSessionBootstrapExecutorError,
  createSyntheticSessionBootstrapExecutor,
  syntheticSessionBootstrapExecutorProducesNoActivationFacts,
  type SyntheticSessionActor,
  type SyntheticSessionBootstrapTransport,
  type SyntheticSessionIssueObservation,
  type SyntheticSessionResolveObservation,
} from "./synthetic-session-bootstrap-executor";

const BINDING = "binding_dev_034";
const NOW = "2026-09-13T17:20:00.000Z";
const SESSION_EXPIRES = "2026-09-13T17:40:00.000Z";

function preflight(): ProviderClientFactoryPreflightDecision {
  return evaluateProviderClientFactoryPreflight({
    qualification: evaluateDevEnvironmentQualification(verifiedDevEnvironmentQualificationFacts()),
    manifest: {
      provider: "supabase",
      projectLabel: "vivienda-dev",
      projectBindingId: BINDING,
      projectUrl: "https://bvykdyhlwawojivopztl.supabase.co",
      expectedRemoteProjectRef: "bvykdyhlwawojivopztl",
      source: "external_injected_configuration",
      syntheticOnly: true,
      liveRuntimeAuthorized: false,
      secretValuesEmbedded: false,
      environmentReadRequiredByContract: false,
      authorityHandles: {
        candidate_runtime_rpc: { authority: "candidate_runtime", handleId: "handle.runtime.034", source: "external_secret_broker", serverOnly: true, secretValueExposedToApplication: false },
        dev_probe_support_rpc: { authority: "probe_support", handleId: "handle.support.034", source: "external_secret_broker", serverOnly: true, secretValueExposedToApplication: false },
        dev_fixture_admin: { authority: "fixture_admin", handleId: "handle.admin.034", source: "external_secret_broker", serverOnly: true, secretValueExposedToApplication: false },
        dev_storage: { authority: "storage_candidate", handleId: "handle.storage.034", source: "external_secret_broker", serverOnly: true, secretValueExposedToApplication: false },
        candidate_session_authority: { authority: "synthetic_session", handleId: "handle.session.034", source: "external_secret_broker", serverOnly: true, secretValueExposedToApplication: false },
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

function lease(patch: Partial<ProviderCandidateFixtureLease> = {}): ProviderCandidateFixtureLease {
  return {
    contractVersion: "V0.23.21-PROVIDER-FIXTURE-V1",
    scope: "happy_path",
    fixtureId: "fx_session_034",
    namespace: "vivienda_dev_session_034",
    ownerSubjectRef: "sub_synthetic_owner_034",
    intruderSubjectRef: "sub_synthetic_intruder_034",
    issuedAt: "2026-09-13T17:15:00.000Z",
    expiresAt: "2026-09-13T17:45:00.000Z",
    syntheticOnly: true,
    disposable: true,
    ...patch,
  };
}

type FixtureOptions = {
  transportPatch?: Record<string, unknown>;
  issuePatch?: Partial<SyntheticSessionIssueObservation> | ((actor: SyntheticSessionActor) => Partial<SyntheticSessionIssueObservation>);
  resolvePatch?: Partial<SyntheticSessionResolveObservation> | ((actor: SyntheticSessionActor) => Partial<SyntheticSessionResolveObservation>);
  throwIssue?: boolean;
  throwResolve?: boolean;
  providerIssueError?: boolean;
  providerResolveError?: boolean;
  duplicateTokens?: boolean;
  now?: string;
  tokenSource?: (kind: "issue_request" | "issue_nonce" | "resolve_request" | "resolve_nonce", actor: SyntheticSessionActor) => string;
};

function email(actor: SyntheticSessionActor) {
  return `fixture+vivienda_dev_session_034.${actor}@vivienda.invalid`;
}

function fixture(options: FixtureOptions = {}) {
  let issueCalls = 0;
  let resolveCalls = 0;
  let clockCalls = 0;
  let tokenCalls = 0;
  const issuedInputs: unknown[] = [];
  const resolvedInputs: unknown[] = [];

  const transport = {
    channel: "synthetic_session_bootstrap_transport",
    provider: "supabase",
    projectLabel: "vivienda-dev",
    syntheticOnly: true,
    liveRuntimeAuthorized: false,
    liveProviderSessionProven: false,
    async issue(input: Parameters<SyntheticSessionBootstrapTransport["issue"]>[0]) {
      issueCalls += 1;
      issuedInputs.push(input);
      if (options.throwIssue) throw new Error("sensitive auth issue detail");
      if (options.providerIssueError) return { data: null, error: { code: "auth_down", status: 503, message: "sensitive" } };
      const patch = typeof options.issuePatch === "function" ? options.issuePatch(input.actor) : options.issuePatch;
      return {
        data: {
          source: "injected_transport_observation",
          actor: input.actor,
          fixtureId: input.fixtureId,
          namespace: input.namespace,
          subjectRef: input.subjectRef,
          syntheticEmail: input.syntheticEmail,
          accessToken: options.duplicateTokens ? "session.shared.token.034" : `session.${input.actor}.token.034`,
          expiresAt: SESSION_EXPIRES,
          requestId: input.requestId,
          nonce: input.nonce,
          ...patch,
        },
        error: null,
      };
    },
    async resolve(input: Parameters<SyntheticSessionBootstrapTransport["resolve"]>[0]) {
      resolveCalls += 1;
      resolvedInputs.push(input);
      if (options.throwResolve) throw new Error("sensitive auth resolve detail");
      if (options.providerResolveError) return { data: null, error: { code: "auth_down", status: 503, message: "sensitive" } };
      const subjectRef = input.actor === "owner" ? "sub_synthetic_owner_034" : "sub_synthetic_intruder_034";
      const patch = typeof options.resolvePatch === "function" ? options.resolvePatch(input.actor) : options.resolvePatch;
      return {
        data: {
          source: "injected_transport_observation",
          actor: input.actor,
          fixtureId: input.fixtureId,
          namespace: input.namespace,
          subjectRef,
          syntheticEmail: email(input.actor),
          requestId: input.requestId,
          nonce: input.nonce,
          ...patch,
        },
        error: null,
      };
    },
    ...options.transportPatch,
  } as unknown as SyntheticSessionBootstrapTransport;

  const defaultTokenSource = (
    kind: "issue_request" | "issue_nonce" | "resolve_request" | "resolve_nonce",
    actor: SyntheticSessionActor,
  ) => `${kind}.${actor}.034`;

  const executor = createSyntheticSessionBootstrapExecutor({
    preflight: preflight(),
    transport,
    now: () => {
      clockCalls += 1;
      return options.now ?? NOW;
    },
    tokenSource: (kind, actor) => {
      tokenCalls += 1;
      return (options.tokenSource ?? defaultTokenSource)(kind, actor);
    },
  });

  return {
    executor,
    counters: () => ({ issueCalls, resolveCalls, clockCalls, tokenCalls }),
    issuedInputs,
    resolvedInputs,
  };
}

function expectError(error: unknown, code: SyntheticSessionBootstrapExecutorError["code"]): void {
  expect(error).toBeInstanceOf(SyntheticSessionBootstrapExecutorError);
  expect((error as SyntheticSessionBootstrapExecutorError).code).toBe(code);
  expect((error as Error).message).toBe("Synthetic session bootstrap failed.");
}

async function capture(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (error) {
    return error;
  }
}

describe("V0.23.34 synthetic session bootstrap executor", () => {
  it("constructs with zero transport, clock or token I/O", () => {
    const f = fixture();
    expect(f.executor.version).toBe(SYNTHETIC_SESSION_BOOTSTRAP_EXECUTOR_VERSION);
    expect(f.executor.liveProviderSessionProven).toBe(false);
    expect(f.counters()).toEqual({ issueCalls: 0, resolveCalls: 0, clockCalls: 0, tokenCalls: 0 });
  });

  it("issues and resolves distinct owner/intruder capabilities without elevating live authority", async () => {
    const f = fixture();
    const result = await f.executor.execute(lease());
    expect(result.state).toBe("session_bootstrap_contract_satisfied");
    expect(result.owner).toEqual({
      actor: "owner",
      subjectRef: "sub_synthetic_owner_034",
      syntheticEmail: email("owner"),
      accessToken: "session.owner.token.034",
      expiresAt: SESSION_EXPIRES,
      serverOnly: true,
    });
    expect(result.intruder).toEqual({
      actor: "intruder",
      subjectRef: "sub_synthetic_intruder_034",
      syntheticEmail: email("intruder"),
      accessToken: "session.intruder.token.034",
      expiresAt: SESSION_EXPIRES,
      serverOnly: true,
    });
    expect(result).toMatchObject({
      sessionBootstrapContractSatisfied: true,
      injectedTransportInvoked: true,
      liveProviderSessionProven: false,
      sessionBootstrapProven: false,
      remoteIdentityVerified: false,
      clientMaterializationAuthorized: false,
      providerParityProven: false,
      runtimeActivationAuthorized: false,
      deploymentAuthorized: false,
    });
    expect(f.counters()).toEqual({ issueCalls: 2, resolveCalls: 2, clockCalls: 1, tokenCalls: 8 });
    expect(syntheticSessionBootstrapExecutorProducesNoActivationFacts()).toEqual({});
  });

  it("uses deterministic .invalid fixture emails and passes no password or locally minted JWT input", async () => {
    const f = fixture();
    await f.executor.execute(lease());
    expect(f.issuedInputs).toHaveLength(2);
    expect(f.issuedInputs[0]).toMatchObject({ actor: "owner", syntheticEmail: email("owner") });
    expect(f.issuedInputs[1]).toMatchObject({ actor: "intruder", syntheticEmail: email("intruder") });
    expect(JSON.stringify(f.issuedInputs)).not.toMatch(/password|jwt|secret/i);
  });

  it("binds issue observations to exact request id and nonce", async () => {
    for (const issuePatch of [
      { requestId: "issue_request.other.034" },
      { nonce: "issue_nonce.other.034" },
      { fixtureId: "fx_other_034" },
      { namespace: "vivienda_dev_other_034" },
    ]) {
      expectError(await capture(fixture({ issuePatch }).executor.execute(lease())), "invalid_transport_response");
    }
  });

  it("binds resolve observations to exact request id and nonce", async () => {
    for (const resolvePatch of [
      { requestId: "resolve_request.other.034" },
      { nonce: "resolve_nonce.other.034" },
      { fixtureId: "fx_other_034" },
      { namespace: "vivienda_dev_other_034" },
    ]) {
      expectError(await capture(fixture({ resolvePatch }).executor.execute(lease())), "invalid_transport_response");
    }
  });

  it("rejects subject/email substitution during issue or resolve", async () => {
    const issueWrong = fixture({ issuePatch: { subjectRef: "sub_synthetic_other_034" } });
    expectError(await capture(issueWrong.executor.execute(lease())), "session_identity_mismatch");

    const resolveWrong = fixture({ resolvePatch: { syntheticEmail: "fixture+wrong@vivienda.invalid" } });
    expectError(await capture(resolveWrong.executor.execute(lease())), "session_identity_mismatch");
  });

  it("rejects malformed, shared or expired/outliving session capabilities", async () => {
    expectError(
      await capture(fixture({ issuePatch: { accessToken: "tiny" } }).executor.execute(lease())),
      "invalid_transport_response",
    );
    expectError(
      await capture(fixture({ duplicateTokens: true }).executor.execute(lease())),
      "session_separation_failed",
    );
    expectError(
      await capture(fixture({ issuePatch: { expiresAt: "2026-09-13T17:19:00.000Z" } }).executor.execute(lease())),
      "session_expiry_invalid",
    );
    expectError(
      await capture(fixture({ issuePatch: { expiresAt: "2026-09-13T18:00:00.000Z" } }).executor.execute(lease())),
      "session_expiry_invalid",
    );
  });

  it("rejects invalid, expired or overlong disposable fixture leases before auth transport I/O", async () => {
    const variants = [
      lease({ expiresAt: "2026-09-13T17:19:00.000Z" }),
      lease({ expiresAt: "2026-09-13T19:00:00.000Z" }),
      lease({ ownerSubjectRef: "sub_synthetic_intruder_034" }),
      lease({ disposable: false as true }),
      lease({ syntheticOnly: false as true }),
    ];
    for (const candidate of variants) {
      const f = fixture();
      expectError(await capture(f.executor.execute(candidate)), "invalid_fixture");
      expect(f.counters().issueCalls).toBe(0);
      expect(f.counters().resolveCalls).toBe(0);
    }
  });

  it("sanitizes issue and resolve transport failures", async () => {
    for (const options of [
      { throwIssue: true },
      { providerIssueError: true },
      { throwResolve: true },
      { providerResolveError: true },
    ]) {
      const error = await capture(fixture(options).executor.execute(lease()));
      expectError(error, "transport_unavailable");
      expect((error as Error).message).not.toContain("sensitive");
    }
  });

  it("rejects invalid transport metadata before any Auth transport I/O", () => {
    for (const transportPatch of [
      { liveProviderSessionProven: true },
      { liveRuntimeAuthorized: true },
      { syntheticOnly: false },
      { projectLabel: "vivienda-prod" },
      { provider: "other" },
      { channel: "other_channel" },
    ]) {
      let thrown: unknown;
      try {
        fixture({ transportPatch });
      } catch (error) {
        thrown = error;
      }
      expectError(thrown, "invalid_transport");
    }
  });

  it("rejects blocked/tampered preflight or bootstrap plan before transport I/O", () => {
    const valid = preflight();
    const variants = [
      { ...valid, state: "blocked" },
      { ...valid, sessionBootstrapProven: true },
      { ...valid, clientMaterializationAuthorized: true },
      { ...valid, sessionBootstrap: null },
      {
        ...valid,
        sessionBootstrap: valid.sessionBootstrap ? { ...valid.sessionBootstrap, locallyMintedJwtAllowed: true } : null,
      },
    ];
    for (const bad of variants) {
      let calls = 0;
      let thrown: unknown;
      try {
        createSyntheticSessionBootstrapExecutor({
          preflight: bad as unknown as ProviderClientFactoryPreflightDecision,
          transport: {
            channel: "synthetic_session_bootstrap_transport",
            provider: "supabase",
            projectLabel: "vivienda-dev",
            syntheticOnly: true,
            liveRuntimeAuthorized: false,
            liveProviderSessionProven: false,
            async issue() { calls += 1; throw new Error("must not run"); },
            async resolve() { calls += 1; throw new Error("must not run"); },
          },
          now: () => NOW,
          tokenSource: () => "opaque.token.034",
        });
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(SyntheticSessionBootstrapExecutorError);
      expect(["preflight_not_ready", "invalid_plan"]).toContain((thrown as SyntheticSessionBootstrapExecutorError).code);
      expect(calls).toBe(0);
    }
  });

  it("rejects invalid clock and token reuse before unsafe continuation", async () => {
    expectError(
      await capture(fixture({ now: "not-a-date" }).executor.execute(lease())),
      "invalid_clock",
    );
    expectError(
      await capture(fixture({ tokenSource: () => "same.token.034" }).executor.execute(lease())),
      "invalid_token_source",
    );
    expectError(
      await capture(fixture({ tokenSource: () => "tiny" }).executor.execute(lease())),
      "invalid_token_source",
    );
  });

  it("contains no env reads, SDK client creation, activation imports or direct provider networking", () => {
    const source = readFileSync(
      join(process.cwd(), "server/evidence-api/synthetic-session-bootstrap-executor.ts"),
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
