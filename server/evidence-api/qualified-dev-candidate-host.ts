import { randomUUID } from "node:crypto";
import {
  PersistenceBoundaryError,
  type Clock,
  type IdGenerator,
} from "@/domain/persistence-boundary/contracts";
import { CasePersistenceService } from "@/domain/persistence-boundary/service";
import {
  EVIDENCE_BUCKET_ID,
  EvidenceStorageCoordinator,
  type EvidenceObjectRegistryPort,
  type OpaqueObjectCoordinateFactory,
  type PrincipalSource,
  type ReservedObjectCoordinates,
  type UserPrincipal,
} from "@/domain/storage-coordination/coordinator";
import { ServerClassifiedEvidenceApplication } from "./application-authority";
import {
  EvidenceHttpApi,
  type ApiRequestContext,
  type ApiRequestContextSource,
} from "./http-boundary";
import type { ProviderCandidateFixtureLease } from "./provider-candidate-fixture-lifecycle";
import {
  createQualifiedDevProviderComposition,
  type QualifiedDevProbeServerContextPort,
  type QualifiedDevProviderComposition,
  type QualifiedDevProviderCompositionInputs,
} from "./qualified-dev-provider-composition";

export const QUALIFIED_DEV_CANDIDATE_HOST_VERSION =
  "V0.23.28-QUALIFIED-DEV-CANDIDATE-HOST-V1" as const;

const DEV_PROJECT_LABEL = "vivienda-dev" as const;
const TOKEN = /^[A-Za-z0-9_-]{6,64}$/;
const CASE_ID = /^case_[A-Za-z0-9_-]{3,}$/;
const INTENT_ID = /^upl_[A-Za-z0-9_-]{3,}$/;
const EVIDENCE_ID = /^evd_[A-Za-z0-9_-]{3,}$/;
const LEASE_TOKEN = /^[A-Za-z0-9_-]{8,40}$/;
const PROBE_SCOPES = new Set<ProviderCandidateFixtureLease["scope"]>([
  "happy_path",
  "unauthenticated_prepare",
  "cross_case_access",
  "missing_data_authorization",
  "missing_uploaded_object",
  "rate_limit_unavailable",
]);

const PREPARE_PATH = /^\/api\/v1\/cases\/(case_[A-Za-z0-9_-]{3,})\/evidence\/uploads$/;
const COMPLETE_PATH = /^\/api\/v1\/cases\/(case_[A-Za-z0-9_-]{3,})\/evidence\/uploads\/(upl_[A-Za-z0-9_-]{3,})\/complete$/;
const DOWNLOAD_PATH = /^\/api\/v1\/cases\/(case_[A-Za-z0-9_-]{3,})\/evidence\/(evd_[A-Za-z0-9_-]{3,})\/download$/;

export type QualifiedDevCandidateHostErrorCode =
  | "invalid_configuration"
  | "invalid_invocation"
  | "invalid_request_binding";

export class QualifiedDevCandidateHostError extends Error {
  constructor(readonly code: QualifiedDevCandidateHostErrorCode) {
    super("Qualified DEV candidate host failed.");
    this.name = "QualifiedDevCandidateHostError";
  }
}

function fail(code: QualifiedDevCandidateHostErrorCode): never {
  throw new QualifiedDevCandidateHostError(code);
}

function defaultToken(): string {
  return randomUUID().replaceAll("-", "");
}

function nextToken(source: () => string): string {
  const token = source();
  if (!TOKEN.test(token)) fail("invalid_configuration");
  return token;
}

function leaseToken(namespace: string): string | null {
  const prefix = "vivienda_dev_";
  if (!namespace.startsWith(prefix)) return null;
  const token = namespace.slice(prefix.length);
  return LEASE_TOKEN.test(token) ? token : null;
}

function assertLease(lease: ProviderCandidateFixtureLease): void {
  const token = leaseToken(lease.namespace);
  if (
    !token ||
    lease.fixtureId !== `fx_${token}` ||
    lease.ownerSubjectRef !== `sub_synthetic_${token}_owner` ||
    lease.intruderSubjectRef !== `sub_synthetic_${token}_intruder` ||
    lease.ownerSubjectRef === lease.intruderSubjectRef ||
    lease.syntheticOnly !== true ||
    lease.disposable !== true ||
    !PROBE_SCOPES.has(lease.scope)
  ) {
    fail("invalid_invocation");
  }
}

function normalizeOrigin(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    fail("invalid_configuration");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    fail("invalid_configuration");
  }
  return parsed.origin;
}

export interface QualifiedDevCandidateProbeScopePort extends QualifiedDevProbeServerContextPort {
  readonly scopeChannel: "server_probe_scope";

  run<T>(lease: ProviderCandidateFixtureLease, task: () => Promise<T>): Promise<T>;
}

export interface QualifiedDevCandidatePrincipalResolverPort {
  readonly channel: "candidate_principal_resolver";
  readonly projectLabel: typeof DEV_PROJECT_LABEL;
  readonly syntheticOnly: true;
  readonly publicFixtureSelectorsAccepted: false;

  resolve(input: {
    request: Request;
    lease: ProviderCandidateFixtureLease;
  }): Promise<UserPrincipal | null>;
}

export type QualifiedDevCandidateInvocation = {
  readonly source: "server_probe_harness";
  readonly publicRequestDerived: false;
  readonly lease: ProviderCandidateFixtureLease;
};

export type QualifiedDevCandidateHostInputs = {
  provider: Omit<QualifiedDevProviderCompositionInputs, "server">;
  server: {
    storageGateway: QualifiedDevProviderCompositionInputs["server"]["storageGateway"];
    auditLog: QualifiedDevProviderCompositionInputs["server"]["auditLog"];
    rateLimit: QualifiedDevProviderCompositionInputs["server"]["rateLimit"];
    probeScope: QualifiedDevCandidateProbeScopePort;
    registry: EvidenceObjectRegistryPort;
    principalResolver: QualifiedDevCandidatePrincipalResolverPort;
    clock: Clock;
  };
  tokenSource?: () => string;
};

type ParsedRoute =
  | { operation: "prepare"; caseId: string }
  | { operation: "complete"; caseId: string; intentId: string }
  | { operation: "download"; caseId: string; evidenceId: string };

function parseRoute(request: Request, expectedOrigin: string): ParsedRoute | null {
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return null;
  }
  if (url.origin !== expectedOrigin || url.search !== "" || url.hash !== "") return null;

  const prepare = PREPARE_PATH.exec(url.pathname);
  if (prepare) return { operation: "prepare", caseId: prepare[1]! };

  const complete = COMPLETE_PATH.exec(url.pathname);
  if (complete) {
    return { operation: "complete", caseId: complete[1]!, intentId: complete[2]! };
  }

  const download = DOWNLOAD_PATH.exec(url.pathname);
  if (download) {
    return { operation: "download", caseId: download[1]!, evidenceId: download[2]! };
  }

  return null;
}

function routeNotFound(): Response {
  return new Response(
    JSON.stringify({ error: { code: "candidate_route_not_found", message: "El recurso solicitado no está disponible." } }),
    {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}

function assertProbeScope(scope: QualifiedDevCandidateProbeScopePort): void {
  if (
    scope.scopeChannel !== "server_probe_scope" ||
    scope.channel !== "server_probe_context" ||
    scope.projectLabel !== DEV_PROJECT_LABEL ||
    scope.syntheticOnly !== true ||
    scope.liveRuntimeAuthorized !== false ||
    scope.publicRequestDerived !== false
  ) {
    fail("invalid_configuration");
  }
}

function assertPrincipalResolver(resolver: QualifiedDevCandidatePrincipalResolverPort): void {
  if (
    resolver.channel !== "candidate_principal_resolver" ||
    resolver.projectLabel !== DEV_PROJECT_LABEL ||
    resolver.syntheticOnly !== true ||
    resolver.publicFixtureSelectorsAccepted !== false
  ) {
    fail("invalid_configuration");
  }
}

class FixtureIdGenerator implements IdGenerator {
  constructor(
    private readonly lease: ProviderCandidateFixtureLease,
    private readonly tokens: () => string,
  ) {}

  next(prefix: "case" | "evt" | "auth" | "evd" | "upl" | "req"): string {
    return `${prefix}_${this.lease.namespace}_${nextToken(this.tokens)}`;
  }
}

class FixtureCoordinateFactory implements OpaqueObjectCoordinateFactory {
  constructor(
    private readonly lease: ProviderCandidateFixtureLease,
    private readonly tokens: () => string,
  ) {}

  reserve(intent: Parameters<OpaqueObjectCoordinateFactory["reserve"]>[0]): ReservedObjectCoordinates {
    if (
      !intent.intentId.startsWith(`upl_${this.lease.namespace}_`) ||
      !intent.evidenceId.startsWith(`evd_${this.lease.namespace}_`)
    ) {
      throw new PersistenceBoundaryError("provider_error", "La reserva no pertenece al fixture DEV activo.");
    }
    const storageLocator = `obj_${this.lease.namespace}_${nextToken(this.tokens)}`;
    return {
      storageLocator,
      bucketId: EVIDENCE_BUCKET_ID,
      objectPath: `quarantine/${intent.intentId}/${intent.evidenceId}/${storageLocator}`,
    };
  }
}

class BoundPrincipalSource implements PrincipalSource {
  private resolved = false;
  private value: UserPrincipal | null = null;

  constructor(
    private readonly resolver: QualifiedDevCandidatePrincipalResolverPort,
    private readonly request: Request,
    private readonly lease: ProviderCandidateFixtureLease,
  ) {}

  async resolve(): Promise<UserPrincipal | null> {
    if (!this.resolved) {
      const principal = await this.resolver.resolve({ request: this.request, lease: this.lease });
      if (principal !== null) {
        const valid =
          principal.kind === "client" &&
          (principal.subjectRef === this.lease.ownerSubjectRef ||
            principal.subjectRef === this.lease.intruderSubjectRef);
        if (!valid) {
          throw new PersistenceBoundaryError("forbidden", "La identidad no pertenece al fixture DEV activo.");
        }
      }
      this.value = principal;
      this.resolved = true;
    }
    return this.value;
  }
}

class BoundRequestContextSource implements ApiRequestContextSource {
  constructor(
    private readonly boundRequest: Request,
    private readonly context: ApiRequestContext,
  ) {}

  resolve(request: Request): ApiRequestContext {
    if (request !== this.boundRequest) throw new Error("request mismatch");
    return { ...this.context };
  }
}

function assertInvocation(invocation: QualifiedDevCandidateInvocation): void {
  if (
    invocation.source !== "server_probe_harness" ||
    invocation.publicRequestDerived !== false
  ) {
    fail("invalid_invocation");
  }
  assertLease(invocation.lease);
}

export class QualifiedDevCandidateEvidenceApiHost {
  readonly version = QUALIFIED_DEV_CANDIDATE_HOST_VERSION;
  readonly provider = "supabase" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly syntheticOnly = true as const;
  readonly externalIoOccurred = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly runtimeServerWasUsed = false as const;
  private readonly origin: string;
  private readonly tokens: () => string;

  constructor(
    readonly composition: QualifiedDevProviderComposition,
    private readonly persistence: QualifiedDevProviderCompositionInputs["casePersistence"],
    private readonly registry: EvidenceObjectRegistryPort,
    private readonly principalResolver: QualifiedDevCandidatePrincipalResolverPort,
    private readonly probeScope: QualifiedDevCandidateProbeScopePort,
    private readonly clock: Clock,
    evidenceApiOrigin: string,
    tokenSource: () => string = defaultToken,
  ) {
    this.origin = normalizeOrigin(evidenceApiOrigin);
    this.tokens = tokenSource;
    assertProbeScope(probeScope);
    assertPrincipalResolver(principalResolver);
    if (
      composition.provider !== "supabase" ||
      composition.projectLabel !== DEV_PROJECT_LABEL ||
      composition.syntheticOnly !== true ||
      composition.externalIoOccurred !== true ||
      composition.liveRuntimeAuthorized !== false ||
      composition.runtimeServerWasUsed !== false
    ) {
      fail("invalid_configuration");
    }
  }

  async handle(request: Request, invocation: QualifiedDevCandidateInvocation): Promise<Response> {
    assertInvocation(invocation);
    const route = parseRoute(request, this.origin);
    if (!route) return routeNotFound();

    return this.probeScope.run(invocation.lease, async () => {
      const requestToken = nextToken(this.tokens);
      const principalSource = new BoundPrincipalSource(
        this.principalResolver,
        request,
        invocation.lease,
      );
      const ids = new FixtureIdGenerator(invocation.lease, this.tokens);
      const cases = new CasePersistenceService(this.persistence, this.clock, ids);
      const coordinator = new EvidenceStorageCoordinator(
        principalSource,
        cases,
        this.registry,
        this.composition.server.storageGateway,
        new FixtureCoordinateFactory(invocation.lease, this.tokens),
        this.clock,
      );
      const application = new ServerClassifiedEvidenceApplication(coordinator);
      const contexts = new BoundRequestContextSource(request, {
        requestId: `req_${requestToken}`,
        rateLimitKey: `probe_${requestToken}`,
      });
      const api = new EvidenceHttpApi(
        application,
        contexts,
        this.composition.server.rateLimit,
        this.composition.server.auditLog,
      );

      switch (route.operation) {
        case "prepare":
          return api.prepare(request, { caseId: route.caseId });
        case "complete":
          return api.complete(request, { caseId: route.caseId, intentId: route.intentId });
        case "download":
          return api.download(request, { caseId: route.caseId, evidenceId: route.evidenceId });
      }
    });
  }
}

export function createQualifiedDevCandidateEvidenceApiHost(
  input: QualifiedDevCandidateHostInputs,
): QualifiedDevCandidateEvidenceApiHost {
  if (input.provider.configuration.projectLabel !== DEV_PROJECT_LABEL) fail("invalid_configuration");
  assertProbeScope(input.server.probeScope);
  assertPrincipalResolver(input.server.principalResolver);
  const origin = normalizeOrigin(input.provider.configuration.evidenceApiOrigin);

  const composition = createQualifiedDevProviderComposition({
    ...input.provider,
    server: {
      storageGateway: input.server.storageGateway,
      auditLog: input.server.auditLog,
      rateLimit: input.server.rateLimit,
      context: input.server.probeScope,
    },
  });

  return new QualifiedDevCandidateEvidenceApiHost(
    composition,
    input.provider.casePersistence,
    input.server.registry,
    input.server.principalResolver,
    input.server.probeScope,
    input.server.clock,
    origin,
    input.tokenSource,
  );
}

export function qualifiedDevCandidateHostProducesNoActivationFacts(): Record<string, never> {
  return {};
}
