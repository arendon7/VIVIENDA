import { evaluateOpportunityRoutes } from "@/domain/opportunity/router";
import { buildMortgageAuditBlueprint } from "@/domain/assisted-execution/mortgage-audit";
import {
  type CasePersistencePort,
  type Clock,
  type IdGenerator,
  type Principal,
} from "@/domain/persistence-boundary/contracts";
import { CasePersistenceService } from "@/domain/persistence-boundary/service";
import type { ProviderCandidateFixtureLease } from "./provider-candidate-fixture-lifecycle";
import type {
  SupabaseProviderCandidateFaultReceipt,
  SupabaseProviderCandidateObservabilityTransport,
  SupabaseProviderCandidateParityFaultTransport,
  SupabaseProviderCandidateSeedSpec,
  SupabaseProviderCandidateStateTransport,
  SupabaseProviderCandidateTelemetryEnvelope,
} from "./supabase-provider-candidate-execution-driver";
import type {
  SupabaseProviderProbeAuditEvent,
  SupabaseProviderProbeCaseSnapshot,
  SupabaseProviderProbeIntentSnapshot,
} from "./supabase-provider-candidate-probe-adapter";

export const SUPABASE_DEV_PROBE_SUPPORT_PLANE_VERSION =
  "V0.23.26-SUPABASE-DEV-PROBE-SUPPORT-V1" as const;

const DEV_PROJECT_LABEL = "vivienda-dev" as const;
const TOKEN = /^[A-Za-z0-9_-]{8,40}$/;
const FIXTURE_ID = /^fx_[A-Za-z0-9_-]{8,40}$/;
const CASE_ID = /^case_vivienda_dev_[A-Za-z0-9_-]{8,40}_[A-Za-z0-9_-]{3,}$/;
const INTENT_ID = /^upl_vivienda_dev_[A-Za-z0-9_-]{8,40}_[A-Za-z0-9_-]{3,}$/;
const OBSERVATION_ID = /^obs_[A-Za-z0-9_-]{6,}$/;
const RECEIPT_ID = /^fault_[A-Za-z0-9_-]{6,}$/;
const AUDIT_OPERATIONS = new Set([
  "evidence.prepare",
  "evidence.complete",
  "evidence.download",
] as const);
const PROBE_SCOPES = new Set<ProviderCandidateFixtureLease["scope"]>([
  "happy_path",
  "unauthenticated_prepare",
  "missing_data_authorization",
  "cross_case_access",
  "missing_uploaded_object",
  "rate_limit_unavailable",
]);

export type SupabaseDevProbeSupportErrorCode =
  | "invalid_configuration"
  | "invalid_input"
  | "provider_error"
  | "invalid_provider_response";

export class SupabaseDevProbeSupportError extends Error {
  constructor(readonly code: SupabaseDevProbeSupportErrorCode) {
    super("Supabase DEV probe support plane failed.");
    this.name = "SupabaseDevProbeSupportError";
  }
}

export type SupabaseDevProbeRpcResult<T> = {
  data: T;
  error: { code?: string; status?: number; message?: string } | null;
};

export interface SupabaseDevProbeRpcClient {
  rpc<T = unknown>(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<SupabaseDevProbeRpcResult<T>>;
}

export type SupabaseDevProbeStorageTouch = "upload_grant" | "inspection";

function fail(code: SupabaseDevProbeSupportErrorCode): never {
  throw new SupabaseDevProbeSupportError(code);
}

function requireProviderSuccess<T>(result: SupabaseDevProbeRpcResult<T>): T {
  if (result.error) fail("provider_error");
  return result.data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function namespaceToken(namespace: string): string | null {
  const prefix = "vivienda_dev_";
  if (!namespace.startsWith(prefix)) return null;
  const token = namespace.slice(prefix.length);
  return TOKEN.test(token) ? token : null;
}

function validateLease(lease: ProviderCandidateFixtureLease): string {
  const token = namespaceToken(lease.namespace);
  if (
    !token ||
    lease.fixtureId !== `fx_${token}` ||
    !FIXTURE_ID.test(lease.fixtureId) ||
    lease.ownerSubjectRef !== `sub_synthetic_${token}_owner` ||
    lease.intruderSubjectRef !== `sub_synthetic_${token}_intruder` ||
    lease.ownerSubjectRef === lease.intruderSubjectRef ||
    lease.syntheticOnly !== true ||
    lease.disposable !== true ||
    !PROBE_SCOPES.has(lease.scope)
  ) {
    fail("invalid_input");
  }
  return token;
}

function rpcIdentity(lease: ProviderCandidateFixtureLease): Record<string, unknown> {
  validateLease(lease);
  return {
    p_project_label: DEV_PROJECT_LABEL,
    p_fixture_id: lease.fixtureId,
    p_namespace: lease.namespace,
    p_scope: lease.scope,
  };
}

class FixtureClock implements Clock {
  constructor(private readonly at: string) {
    if (!Number.isFinite(Date.parse(at))) fail("invalid_input");
  }

  now(): string {
    return this.at;
  }
}

class FixtureIds implements IdGenerator {
  private counters: Record<Parameters<IdGenerator["next"]>[0], number> = {
    case: 0,
    evt: 0,
    auth: 0,
    evd: 0,
    upl: 0,
    req: 0,
  };

  constructor(private readonly namespace: string) {
    if (!namespaceToken(namespace)) fail("invalid_input");
  }

  next(prefix: Parameters<IdGenerator["next"]>[0]): string {
    this.counters[prefix] += 1;
    return `${prefix}_${this.namespace}_${String(this.counters[prefix]).padStart(3, "0")}`;
  }
}

function ownerPrincipal(lease: ProviderCandidateFixtureLease): Extract<Principal, { kind: "client" }> {
  validateLease(lease);
  return { kind: "client", subjectRef: lease.ownerSubjectRef };
}

function validateSeedSpec(input: SupabaseProviderCandidateSeedSpec): void {
  validateLease(input.lease);
  if (
    input.ownerSubjectRef !== input.lease.ownerSubjectRef ||
    input.routeCode !== "R7_RECLAMACION" ||
    input.caseTrack !== "assisted" ||
    input.evidenceRequestCode !== "R7_STATEMENT_DIFFERENCE" ||
    typeof input.authorizeData !== "boolean"
  ) {
    fail("invalid_input");
  }
}

/**
 * DEV-only state transport that deliberately reuses the canonical persistence service.
 * It does not create a second seed SQL path: Case creation, data authorization and journal
 * transitions pass through the same CasePersistenceService used by the application.
 */
export class SupabaseDevProbeStateTransport implements SupabaseProviderCandidateStateTransport {
  readonly channel = "supabase_state" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;

  constructor(private readonly store: CasePersistencePort) {}

  async seedCase(input: SupabaseProviderCandidateSeedSpec) {
    validateSeedSpec(input);
    const service = new CasePersistenceService(
      this.store,
      new FixtureClock(input.lease.issuedAt),
      new FixtureIds(input.lease.namespace),
    );
    const principal = ownerPrincipal(input.lease);

    const route = evaluateOpportunityRoutes({
      asOfDate: input.lease.issuedAt.slice(0, 10),
      precision: "C2",
      productType: "mortgage_housing",
      modality: "pesos",
      paymentState: "current",
      unexplainedChargeOrAllocationIssue: true,
    });
    const blueprint = buildMortgageAuditBlueprint(route, input.lease.issuedAt.slice(0, 10));
    if (blueprint.routeCode !== input.routeCode || blueprint.caseTrack !== input.caseTrack) {
      fail("invalid_configuration");
    }

    const created = await service.createCase(principal, {
      idempotencyKey: `probe.${input.lease.namespace}.case.v1`,
      routeCode: blueprint.routeCode,
      routeStatus: blueprint.routeStatus,
      precision: blueprint.precision,
      track: blueprint.caseTrack,
    });
    const caseId = created.model.caseId;
    if (!CASE_ID.test(caseId) || !caseId.startsWith(`case_${input.lease.namespace}_`)) {
      fail("invalid_provider_response");
    }
    let version = created.model.projection.version;

    if (input.authorizeData) {
      const authorized = await service.grantDataAuthorization(principal, caseId, version, {
        idempotencyKey: `probe.${input.lease.namespace}.data-authorization.v1`,
        consentVersion: "provider-parity-consent-v1",
        purposes: ["mortgage_analysis", "case_management"],
      });
      version = authorized.model.projection.version;
    }

    const serviceAccepted = await service.appendEvent(principal, caseId, version, {
      type: "SERVICE_AGREEMENT_ACCEPTED",
      idempotencyKey: `probe.${input.lease.namespace}.service-agreement.v1`,
      payload: { agreementVersion: "provider-parity-service-v1" },
    });
    version = serviceAccepted.model.projection.version;

    const evidenceRequested = await service.appendEvent(principal, caseId, version, {
      type: "EVIDENCE_REQUESTED",
      idempotencyKey: `probe.${input.lease.namespace}.evidence-request.v1`,
      payload: {
        requestCode: input.evidenceRequestCode,
        label: "Extracto para revisar la diferencia reportada",
      },
    });

    return {
      caseId,
      versionBeforeEvidenceOperation: evidenceRequested.model.projection.version,
    };
  }

  async readCase(input: {
    lease: ProviderCandidateFixtureLease;
    caseId: string;
    ownerSubjectRef: string;
  }): Promise<SupabaseProviderProbeCaseSnapshot> {
    validateLease(input.lease);
    if (
      input.ownerSubjectRef !== input.lease.ownerSubjectRef ||
      !CASE_ID.test(input.caseId) ||
      !input.caseId.startsWith(`case_${input.lease.namespace}_`)
    ) {
      fail("invalid_input");
    }
    const service = new CasePersistenceService(
      this.store,
      new FixtureClock(input.lease.issuedAt),
      new FixtureIds(input.lease.namespace),
    );
    const model = await service.readCase(ownerPrincipal(input.lease), input.caseId);
    return {
      caseId: model.caseId,
      ownerSubjectRef: input.lease.ownerSubjectRef,
      routeCode: model.projection.origin.routeCode,
      caseTrack: model.projection.origin.track,
      version: model.projection.version,
      stage: model.projection.stage,
      eventSequence: model.timeline.map((event) => event.type),
      evidence: model.evidence.map((item) => ({
        kind: item.kind,
        legalDataCategory: item.legalDataCategory,
        securityTier: item.securityTier,
        lifecycle: item.lifecycle,
      })),
      publicReadModel: model,
    };
  }

  async readIntent(input: {
    lease: ProviderCandidateFixtureLease;
    caseId: string;
    intentId: string;
  }): Promise<SupabaseProviderProbeIntentSnapshot | null> {
    validateLease(input.lease);
    if (
      !CASE_ID.test(input.caseId) ||
      !input.caseId.startsWith(`case_${input.lease.namespace}_`) ||
      !INTENT_ID.test(input.intentId) ||
      !input.intentId.startsWith(`upl_${input.lease.namespace}_`)
    ) {
      fail("invalid_input");
    }
    let intent;
    try {
      intent = await this.store.loadEvidenceIntent(input.intentId);
    } catch {
      fail("provider_error");
    }
    if (!intent) return null;
    if (intent.caseId !== input.caseId || intent.intentId !== input.intentId) {
      fail("invalid_provider_response");
    }
    return {
      intentId: intent.intentId,
      caseId: intent.caseId,
      status: intent.status,
    };
  }
}

function parseAuditOperations(value: unknown): SupabaseProviderProbeAuditEvent[] {
  if (!Array.isArray(value)) fail("invalid_provider_response");
  return value.map((entry) => {
    if (!isRecord(entry)) fail("invalid_provider_response");
    const operation = entry.operation;
    const status = entry.status;
    const errorCode = entry.errorCode;
    if (
      (operation !== "evidence.prepare" &&
        operation !== "evidence.complete" &&
        operation !== "evidence.download") ||
      !AUDIT_OPERATIONS.has(operation) ||
      typeof status !== "number" ||
      !Number.isSafeInteger(status) ||
      status < 100 ||
      status > 599 ||
      (errorCode !== undefined && errorCode !== null && typeof errorCode !== "string")
    ) {
      fail("invalid_provider_response");
    }
    return {
      operation,
      status,
      ...(typeof errorCode === "string" && errorCode.length > 0 ? { errorCode } : {}),
    };
  });
}

function parseTelemetryEnvelope(
  value: unknown,
  lease: ProviderCandidateFixtureLease,
): SupabaseProviderCandidateTelemetryEnvelope {
  validateLease(lease);
  if (!isRecord(value)) fail("invalid_provider_response");
  const registryRegistrations = parseCount(value.registryRegistrations);
  const storageUploadGrantCalls = parseCount(value.storageUploadGrantCalls);
  const storageInspectionCalls = parseCount(value.storageInspectionCalls);
  if (
    value.source !== "supabase_dev_observability" ||
    typeof value.observationId !== "string" ||
    !OBSERVATION_ID.test(value.observationId) ||
    value.fixtureId !== lease.fixtureId ||
    value.namespace !== lease.namespace ||
    value.scope !== lease.scope ||
    typeof value.observedAt !== "string" ||
    !Number.isFinite(Date.parse(value.observedAt)) ||
    value.complete !== true ||
    registryRegistrations === null ||
    storageUploadGrantCalls === null ||
    storageInspectionCalls === null
  ) {
    fail("invalid_provider_response");
  }
  return {
    source: "supabase_dev_observability",
    observationId: value.observationId,
    fixtureId: lease.fixtureId,
    namespace: lease.namespace,
    scope: lease.scope,
    observedAt: value.observedAt,
    complete: true,
    registryRegistrations,
    storageUploadGrantCalls,
    storageInspectionCalls,
    auditOperations: parseAuditOperations(value.auditOperations),
  };
}

function parseFaultReceipt(
  value: unknown,
  lease: ProviderCandidateFixtureLease,
): SupabaseProviderCandidateFaultReceipt {
  validateLease(lease);
  if (
    !isRecord(value) ||
    typeof value.receiptId !== "string" ||
    !RECEIPT_ID.test(value.receiptId) ||
    value.fixtureId !== lease.fixtureId ||
    value.namespace !== lease.namespace ||
    value.operation !== "evidence.prepare" ||
    value.mode !== "rate_limit_unavailable_once" ||
    value.armed !== true
  ) {
    fail("invalid_provider_response");
  }
  return {
    receiptId: value.receiptId,
    fixtureId: lease.fixtureId,
    namespace: lease.namespace,
    operation: "evidence.prepare",
    mode: "rate_limit_unavailable_once",
    armed: true,
  };
}

export class SupabaseDevProbeSupportRpc {
  constructor(
    private readonly client: SupabaseDevProbeRpcClient,
    configuration: { projectLabel: string },
  ) {
    if (configuration.projectLabel !== DEV_PROJECT_LABEL) fail("invalid_configuration");
  }

  async recordStorageTouch(
    lease: ProviderCandidateFixtureLease,
    kind: SupabaseDevProbeStorageTouch,
  ): Promise<void> {
    if (kind !== "upload_grant" && kind !== "inspection") fail("invalid_input");
    requireProviderSuccess(
      await this.client.rpc("vivienda_dev_probe_record_storage_touch", {
        ...rpcIdentity(lease),
        p_kind: kind,
      }),
    );
  }

  async recordAudit(
    lease: ProviderCandidateFixtureLease,
    event: SupabaseProviderProbeAuditEvent,
  ): Promise<void> {
    if (
      !AUDIT_OPERATIONS.has(event.operation) ||
      !Number.isSafeInteger(event.status) ||
      event.status < 100 ||
      event.status > 599 ||
      (event.errorCode !== undefined && (typeof event.errorCode !== "string" || event.errorCode.length === 0))
    ) {
      fail("invalid_input");
    }
    requireProviderSuccess(
      await this.client.rpc("vivienda_dev_probe_record_audit", {
        ...rpcIdentity(lease),
        p_operation: event.operation,
        p_status: event.status,
        p_error_code: event.errorCode ?? null,
      }),
    );
  }

  async observe(lease: ProviderCandidateFixtureLease): Promise<SupabaseProviderCandidateTelemetryEnvelope> {
    const data = requireProviderSuccess(
      await this.client.rpc<unknown>("vivienda_dev_probe_observe", rpcIdentity(lease)),
    );
    return parseTelemetryEnvelope(data, lease);
  }

  async armRateLimitUnavailable(
    lease: ProviderCandidateFixtureLease,
  ): Promise<SupabaseProviderCandidateFaultReceipt> {
    if (lease.scope !== "rate_limit_unavailable") fail("invalid_input");
    const data = requireProviderSuccess(
      await this.client.rpc<unknown>("vivienda_dev_probe_fault_arm", {
        ...rpcIdentity(lease),
        p_operation: "evidence.prepare",
        p_mode: "rate_limit_unavailable_once",
      }),
    );
    return parseFaultReceipt(data, lease);
  }

  async disarm(
    lease: ProviderCandidateFixtureLease,
    receipt: SupabaseProviderCandidateFaultReceipt,
  ): Promise<void> {
    const parsed = parseFaultReceipt(receipt, lease);
    requireProviderSuccess(
      await this.client.rpc("vivienda_dev_probe_fault_disarm", {
        ...rpcIdentity(lease),
        p_receipt_id: parsed.receiptId,
      }),
    );
  }

  async consumeRateLimitUnavailable(
    lease: ProviderCandidateFixtureLease,
  ): Promise<boolean> {
    if (lease.scope !== "rate_limit_unavailable") fail("invalid_input");
    const data = requireProviderSuccess(
      await this.client.rpc<unknown>("vivienda_dev_probe_fault_consume", {
        ...rpcIdentity(lease),
        p_operation: "evidence.prepare",
        p_mode: "rate_limit_unavailable_once",
      }),
    );
    if (typeof data !== "boolean") fail("invalid_provider_response");
    return data;
  }
}

export class SupabaseDevProbeObservabilityTransport
  implements SupabaseProviderCandidateObservabilityTransport
{
  readonly channel = "supabase_observability" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;

  constructor(private readonly support: SupabaseDevProbeSupportRpc) {}

  readTelemetry(input: { lease: ProviderCandidateFixtureLease }) {
    return this.support.observe(input.lease);
  }
}

export class SupabaseDevProbeParityFaultTransport
  implements SupabaseProviderCandidateParityFaultTransport
{
  readonly channel = "parity_fault_control" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly syntheticOnly = true as const;
  readonly liveRuntimeAuthorized = false as const;
  readonly parityOnly = true as const;

  constructor(private readonly support: SupabaseDevProbeSupportRpc) {}

  async armRateLimitUnavailable(input: {
    lease: ProviderCandidateFixtureLease;
    operation: "evidence.prepare";
    oneShot: true;
  }) {
    if (input.operation !== "evidence.prepare" || input.oneShot !== true) fail("invalid_input");
    return this.support.armRateLimitUnavailable(input.lease);
  }

  async disarm(input: {
    lease: ProviderCandidateFixtureLease;
    receipt: SupabaseProviderCandidateFaultReceipt;
  }): Promise<void> {
    await this.support.disarm(input.lease, input.receipt);
  }
}

/** Server-only instrumentation seam for a future qualified DEV composition. */
export class SupabaseDevProbeTelemetryRecorder {
  constructor(private readonly support: SupabaseDevProbeSupportRpc) {}

  recordStorageUploadGrant(lease: ProviderCandidateFixtureLease): Promise<void> {
    return this.support.recordStorageTouch(lease, "upload_grant");
  }

  recordStorageInspection(lease: ProviderCandidateFixtureLease): Promise<void> {
    return this.support.recordStorageTouch(lease, "inspection");
  }

  recordAudit(
    lease: ProviderCandidateFixtureLease,
    event: SupabaseProviderProbeAuditEvent,
  ): Promise<void> {
    return this.support.recordAudit(lease, event);
  }
}

/**
 * Server-only fault consumer seam for a future DEV ApiRateLimitPort wrapper.
 * V0.23.26 deliberately does not wire this into runtime.server.ts.
 */
export class SupabaseDevProbeRateLimitFaultConsumer {
  constructor(private readonly support: SupabaseDevProbeSupportRpc) {}

  consumePrepareUnavailable(lease: ProviderCandidateFixtureLease): Promise<boolean> {
    return this.support.consumeRateLimitUnavailable(lease);
  }
}

export function supabaseDevProbeSupportPlaneProducesNoActivationFacts(): Record<string, never> {
  return {};
}
