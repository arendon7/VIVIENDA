import {
  LIVE_EVIDENCE_COLLECTION_ACTIONS,
  type EvidenceCollectionAuthorizationContract,
  type LiveEvidenceCollectionAction,
  type LiveMaterializationAuthorizationEvidenceContractDecision,
} from "./live-materialization-authorization-evidence-contract";

export const EVIDENCE_COLLECTION_AUTHORIZATION_EXECUTOR_VERSION =
  "V0.23.37-EVIDENCE-COLLECTION-AUTHORIZATION-EXECUTOR-V1" as const;

const DEV_PROJECT_LABEL = "vivienda-dev" as const;
const MAX_LEASE_TTL_MS = 300 * 1000;
const MAX_CLOCK_SKEW_MS = 60 * 1000;
const OPAQUE = /^[A-Za-z0-9_.:-]{8,160}$/;
const BINDING_ID = /^[A-Za-z0-9_-]{8,80}$/;
const PROJECT_REF = /^[a-z0-9]{8,40}$/;
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;

export type StructuralEvidenceCollectionLeaseObservation = {
  source: "injected_structural_test_observation";
  provenance: "structural_test_double";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  expectedProjectRef: string;
  expectedProjectUrl: string;
  authorizationId: string;
  requestId: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  allowedActions: readonly LiveEvidenceCollectionAction[];
  maxUsesPerAction: 1;
  syntheticFixtureOnly: true;
  materializationAllowed: false;
  runtimeActivationAllowed: false;
  deploymentAllowed: false;
};

export type StructuralEvidenceCollectionAuthorizationTransportResult =
  | { data: StructuralEvidenceCollectionLeaseObservation; error: null }
  | { data: null; error: { code?: string; message?: string; status?: number } };

export interface StructuralEvidenceCollectionAuthorizationTransport {
  readonly channel: "evidence_collection_authorization_structural_transport";
  readonly provider: "supabase";
  readonly projectLabel: typeof DEV_PROJECT_LABEL;
  readonly structuralOnly: true;
  readonly externallyIssuedLeaseProven: false;
  readonly providerIoAuthorized: false;
  readonly clientMaterializationAuthorized: false;
  readonly runtimeActivationAuthorized: false;
  readonly deploymentAuthorized: false;
  exercise(input: {
    provider: "supabase";
    projectLabel: typeof DEV_PROJECT_LABEL;
    projectBindingId: string;
    expectedProjectRef: string;
    expectedProjectUrl: string;
    requestId: string;
    nonce: string;
    requestedAt: string;
    allowedActions: readonly LiveEvidenceCollectionAction[];
    maxUsesPerAction: 1;
  }): Promise<StructuralEvidenceCollectionAuthorizationTransportResult>;
}

export type ExternalEvidenceCollectionLeaseReceiptAcceptanceContract = {
  channel: "live_materialization_evidence_collection_authorization_receipt";
  requiredSource: "external_materialization_control_plane";
  requiredProvenance: "externally_issued_and_boundary_verified";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  expectedProjectRef: string;
  expectedProjectUrl: string;
  maxTtlSeconds: 300;
  authorizationIdRequired: true;
  issuanceReceiptIdRequired: true;
  issuedAtRequired: true;
  expiresAtRequired: true;
  exactActionSetRequired: true;
  allowedActions: readonly LiveEvidenceCollectionAction[];
  maxUsesPerAction: 1;
  syntheticFixtureOnlyRequired: true;
  externalBoundaryVerificationRequired: true;
  structuralTestDoubleAcceptedAsExternalEvidence: false;
  credentialsForbiddenInReceipt: true;
  authorityHandleIdsForbiddenInReceipt: true;
  providerClientMaterializationAllowed: false;
  sdkFactoryInvocationAllowed: false;
  runtimeActivationAllowed: false;
  deploymentAllowed: false;
};

export type EvidenceCollectionActionUseReceiptRequirement = {
  action: LiveEvidenceCollectionAction;
  exactUseCount: 1;
  usedAtRequired: true;
  providerIoObservedRequired: true;
};

export type ExternalEvidenceCollectionConsumptionReceiptContract = {
  channel: "live_materialization_evidence_collection_consumption_receipt";
  requiredSource: "external_materialization_control_plane";
  requiredProvenance: "externally_observed_action_consumption";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  authorizationIdMustMatchAcceptedLease: true;
  issuanceReceiptIdMustMatchAcceptedLease: true;
  projectIdentityMustMatchAcceptedLease: true;
  completionReceiptIdRequired: true;
  completedAtRequired: true;
  completionMustOccurBeforeLeaseExpiry: true;
  exactCompletedActionSetRequired: true;
  actionUses: readonly EvidenceCollectionActionUseReceiptRequirement[];
  duplicateActionUseAllowed: false;
  unlistedActionUseAllowed: false;
  externalBoundaryVerificationRequired: true;
  structuralTestDoubleAcceptedAsExternalEvidence: false;
  credentialsForbiddenInReceipt: true;
  accessTokenValuesForbiddenInReceipt: true;
  syntheticEmailValuesForbiddenInReceipt: true;
  authorityHandleIdsForbiddenInReceipt: true;
  providerClientMaterializationAuthorized: false;
  runtimeActivationAuthorized: false;
  deploymentAuthorized: false;
};

export type StructuralEvidenceCollectionAuthorizationResult = {
  version: typeof EVIDENCE_COLLECTION_AUTHORIZATION_EXECUTOR_VERSION;
  state: "structural_authorization_exchange_satisfied";
  provider: "supabase";
  projectLabel: typeof DEV_PROJECT_LABEL;
  projectBindingId: string;
  expectedProjectRef: string;
  expectedProjectUrl: string;
  structuralLease: {
    provenance: "structural_test_double";
    authorizationId: string;
    issuedAt: string;
    expiresAt: string;
    allowedActions: readonly LiveEvidenceCollectionAction[];
    maxUsesPerAction: 1;
  };
  externalLeaseReceiptAcceptance: ExternalEvidenceCollectionLeaseReceiptAcceptanceContract;
  externalConsumptionReceiptAcceptance: ExternalEvidenceCollectionConsumptionReceiptContract;
  structuralTransportInvoked: true;
  structuralLeaseEnvelopeValidated: true;
  externalLeaseIssuanceRequired: true;
  externallyIssuedLeaseProven: false;
  externalLeaseReceiptAccepted: false;
  evidenceCollectionAuthorizationAccepted: false;
  evidenceCollectionProviderIoAuthorized: false;
  externalConsumptionReceiptAccepted: false;
  liveRemoteIdentityEvidenceAccepted: false;
  liveSessionBootstrapEvidenceAccepted: false;
  explicitMaterializationGrantAccepted: false;
  clientMaterializationAuthorized: false;
  materializerMayExecute: false;
  providerParityProven: false;
  runtimeActivationAuthorized: false;
  deploymentAuthorized: false;
  activationFactsProduced: false;
};

export type EvidenceCollectionAuthorizationExecutorErrorCode =
  | "authorization_contract_not_ready"
  | "invalid_structural_transport"
  | "invalid_clock"
  | "invalid_token_source"
  | "structural_transport_unavailable"
  | "invalid_structural_response"
  | "structural_identity_mismatch"
  | "structural_action_scope_mismatch"
  | "structural_lease_lifetime_invalid";

export class EvidenceCollectionAuthorizationExecutorError extends Error {
  constructor(readonly code: EvidenceCollectionAuthorizationExecutorErrorCode) {
    super("Evidence collection authorization structural exchange failed.");
    this.name = "EvidenceCollectionAuthorizationExecutorError";
  }
}

export type EvidenceCollectionAuthorizationExecutorInputs = {
  authorizationContract: LiveMaterializationAuthorizationEvidenceContractDecision;
  transport: StructuralEvidenceCollectionAuthorizationTransport;
  now: () => string;
  tokenSource: (kind: "request_id" | "authorization_nonce") => string;
};

function fail(code: EvidenceCollectionAuthorizationExecutorErrorCode): never {
  throw new EvidenceCollectionAuthorizationExecutorError(code);
}

function parseIso(value: string): number | null {
  if (typeof value !== "string" || CONTROL_CHARACTER.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeOrigin(value: string): string | null {
  if (typeof value !== "string" || value.length > 2048 || CONTROL_CHARACTER.test(value)) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    return null;
  }
  return parsed.origin;
}

function exactActionSet(value: readonly LiveEvidenceCollectionAction[]): boolean {
  return (
    Array.isArray(value) &&
    value.length === LIVE_EVIDENCE_COLLECTION_ACTIONS.length &&
    value.every((action, index) => action === LIVE_EVIDENCE_COLLECTION_ACTIONS[index])
  );
}

function phaseAContractValid(value: EvidenceCollectionAuthorizationContract | null): value is EvidenceCollectionAuthorizationContract {
  return (
    value !== null &&
    typeof value === "object" &&
    value.channel === "live_materialization_evidence_collection_authorization" &&
    value.provider === "supabase" &&
    value.projectLabel === DEV_PROJECT_LABEL &&
    BINDING_ID.test(value.projectBindingId) &&
    PROJECT_REF.test(value.expectedProjectRef) &&
    normalizeOrigin(value.expectedProjectUrl) === value.expectedProjectUrl &&
    value.requiredSource === "external_materialization_control_plane" &&
    value.authorizationKind === "scoped_live_evidence_collection_lease" &&
    value.maxTtlSeconds === 300 &&
    value.singleProjectOnly === true &&
    value.syntheticFixtureOnly === true &&
    value.exactActionSetRequired === true &&
    exactActionSet(value.allowedActions) &&
    value.maxUsesPerAction === 1 &&
    value.arbitraryRpcAllowed === false &&
    value.arbitraryStorageAllowed === false &&
    value.providerClientMaterializationAllowed === false &&
    value.sdkFactoryInvocationAllowed === false &&
    value.runtimeActivationAllowed === false &&
    value.deploymentAllowed === false &&
    value.receiptRequired === true &&
    value.receiptMustBindAuthorizationId === true &&
    value.receiptMustBindProjectIdentity === true &&
    value.receiptMustBindCompletedActions === true &&
    value.receiptMustBeProducedExternally === true
  );
}

function assertAuthorizationContract(
  value: LiveMaterializationAuthorizationEvidenceContractDecision,
): EvidenceCollectionAuthorizationContract {
  if (
    value.version !== "V0.23.36-LIVE-MATERIALIZATION-AUTHORIZATION-EVIDENCE-CONTRACT-V1" ||
    value.state !== "evidence_authorization_contract_ready" ||
    value.provider !== "supabase" ||
    value.projectLabel !== DEV_PROJECT_LABEL ||
    typeof value.projectBindingId !== "string" ||
    !BINDING_ID.test(value.projectBindingId) ||
    typeof value.expectedProjectRef !== "string" ||
    !PROJECT_REF.test(value.expectedProjectRef) ||
    typeof value.expectedProjectUrl !== "string" ||
    normalizeOrigin(value.expectedProjectUrl) !== value.expectedProjectUrl ||
    value.authorityHandleCount !== 5 ||
    value.blockers.length !== 0 ||
    value.twoPhaseAuthorizationRequired !== true ||
    value.circularDependencyResolvedBySeparateEvidenceCollectionAuthority !== true ||
    value.evidenceCollectionAuthorizationAccepted !== false ||
    value.evidenceCollectionProviderIoAuthorized !== false ||
    value.liveRemoteIdentityEvidenceAccepted !== false ||
    value.liveSessionBootstrapEvidenceAccepted !== false ||
    value.explicitMaterializationGrantAccepted !== false ||
    value.materializationGrantConsumed !== false ||
    value.materializationProviderIoAuthorized !== false ||
    value.sdkInstantiationAuthorized !== false ||
    value.clientMaterializationAuthorized !== false ||
    value.materializerMayExecute !== false ||
    value.remoteIdentityVerified !== false ||
    value.sessionBootstrapProven !== false ||
    value.providerParityProven !== false ||
    value.runtimeActivationAuthorized !== false ||
    value.deploymentAuthorized !== false ||
    value.activationFactsProduced !== false ||
    !phaseAContractValid(value.evidenceCollectionAuthorization)
  ) {
    fail("authorization_contract_not_ready");
  }
  const phaseA = value.evidenceCollectionAuthorization;
  if (
    phaseA.projectBindingId !== value.projectBindingId ||
    phaseA.expectedProjectRef !== value.expectedProjectRef ||
    phaseA.expectedProjectUrl !== value.expectedProjectUrl ||
    value.remoteIdentityEvidenceReceipt === null ||
    value.sessionBootstrapEvidenceReceipt === null ||
    value.materializationGrantAcceptance === null
  ) {
    fail("authorization_contract_not_ready");
  }
  return phaseA;
}

function assertTransport(
  transport: StructuralEvidenceCollectionAuthorizationTransport,
  contract: EvidenceCollectionAuthorizationContract,
): void {
  if (
    transport.channel !== "evidence_collection_authorization_structural_transport" ||
    transport.provider !== "supabase" ||
    transport.projectLabel !== DEV_PROJECT_LABEL ||
    transport.structuralOnly !== true ||
    transport.externallyIssuedLeaseProven !== false ||
    transport.providerIoAuthorized !== false ||
    transport.clientMaterializationAuthorized !== false ||
    transport.runtimeActivationAuthorized !== false ||
    transport.deploymentAuthorized !== false ||
    contract.projectLabel !== transport.projectLabel
  ) {
    fail("invalid_structural_transport");
  }
}

function externalLeaseReceiptContract(
  contract: EvidenceCollectionAuthorizationContract,
): ExternalEvidenceCollectionLeaseReceiptAcceptanceContract {
  return {
    channel: "live_materialization_evidence_collection_authorization_receipt",
    requiredSource: "external_materialization_control_plane",
    requiredProvenance: "externally_issued_and_boundary_verified",
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    projectBindingId: contract.projectBindingId,
    expectedProjectRef: contract.expectedProjectRef,
    expectedProjectUrl: contract.expectedProjectUrl,
    maxTtlSeconds: 300,
    authorizationIdRequired: true,
    issuanceReceiptIdRequired: true,
    issuedAtRequired: true,
    expiresAtRequired: true,
    exactActionSetRequired: true,
    allowedActions: [...LIVE_EVIDENCE_COLLECTION_ACTIONS],
    maxUsesPerAction: 1,
    syntheticFixtureOnlyRequired: true,
    externalBoundaryVerificationRequired: true,
    structuralTestDoubleAcceptedAsExternalEvidence: false,
    credentialsForbiddenInReceipt: true,
    authorityHandleIdsForbiddenInReceipt: true,
    providerClientMaterializationAllowed: false,
    sdkFactoryInvocationAllowed: false,
    runtimeActivationAllowed: false,
    deploymentAllowed: false,
  };
}

function externalConsumptionReceiptContract(
  contract: EvidenceCollectionAuthorizationContract,
): ExternalEvidenceCollectionConsumptionReceiptContract {
  return {
    channel: "live_materialization_evidence_collection_consumption_receipt",
    requiredSource: "external_materialization_control_plane",
    requiredProvenance: "externally_observed_action_consumption",
    provider: "supabase",
    projectLabel: DEV_PROJECT_LABEL,
    projectBindingId: contract.projectBindingId,
    authorizationIdMustMatchAcceptedLease: true,
    issuanceReceiptIdMustMatchAcceptedLease: true,
    projectIdentityMustMatchAcceptedLease: true,
    completionReceiptIdRequired: true,
    completedAtRequired: true,
    completionMustOccurBeforeLeaseExpiry: true,
    exactCompletedActionSetRequired: true,
    actionUses: LIVE_EVIDENCE_COLLECTION_ACTIONS.map((action) => ({
      action,
      exactUseCount: 1 as const,
      usedAtRequired: true as const,
      providerIoObservedRequired: true as const,
    })),
    duplicateActionUseAllowed: false,
    unlistedActionUseAllowed: false,
    externalBoundaryVerificationRequired: true,
    structuralTestDoubleAcceptedAsExternalEvidence: false,
    credentialsForbiddenInReceipt: true,
    accessTokenValuesForbiddenInReceipt: true,
    syntheticEmailValuesForbiddenInReceipt: true,
    authorityHandleIdsForbiddenInReceipt: true,
    providerClientMaterializationAuthorized: false,
    runtimeActivationAuthorized: false,
    deploymentAuthorized: false,
  };
}

function validateStructuralObservation(
  observation: StructuralEvidenceCollectionLeaseObservation,
  contract: EvidenceCollectionAuthorizationContract,
  requestId: string,
  nonce: string,
  requestedAtMs: number,
  completedAtMs: number,
): void {
  if (
    !observation ||
    typeof observation !== "object" ||
    observation.source !== "injected_structural_test_observation" ||
    observation.provenance !== "structural_test_double" ||
    observation.provider !== "supabase" ||
    observation.projectLabel !== DEV_PROJECT_LABEL ||
    observation.requestId !== requestId ||
    observation.nonce !== nonce ||
    !OPAQUE.test(observation.authorizationId)
  ) {
    fail("invalid_structural_response");
  }

  if (
    observation.projectBindingId !== contract.projectBindingId ||
    observation.expectedProjectRef !== contract.expectedProjectRef ||
    normalizeOrigin(observation.expectedProjectUrl) !== contract.expectedProjectUrl
  ) {
    fail("structural_identity_mismatch");
  }

  if (
    !exactActionSet(observation.allowedActions) ||
    observation.maxUsesPerAction !== 1 ||
    observation.syntheticFixtureOnly !== true ||
    observation.materializationAllowed !== false ||
    observation.runtimeActivationAllowed !== false ||
    observation.deploymentAllowed !== false
  ) {
    fail("structural_action_scope_mismatch");
  }

  const issuedAtMs = parseIso(observation.issuedAt);
  const expiresAtMs = parseIso(observation.expiresAt);
  if (
    issuedAtMs === null ||
    expiresAtMs === null ||
    issuedAtMs < requestedAtMs - MAX_CLOCK_SKEW_MS ||
    issuedAtMs > completedAtMs + MAX_CLOCK_SKEW_MS ||
    expiresAtMs <= issuedAtMs ||
    expiresAtMs <= completedAtMs ||
    expiresAtMs - issuedAtMs > MAX_LEASE_TTL_MS
  ) {
    fail("structural_lease_lifetime_invalid");
  }
}

export class EvidenceCollectionAuthorizationExecutor {
  readonly version = EVIDENCE_COLLECTION_AUTHORIZATION_EXECUTOR_VERSION;
  readonly provider = "supabase" as const;
  readonly projectLabel = DEV_PROJECT_LABEL;
  readonly structuralOnly = true as const;
  readonly externallyIssuedLeaseProven = false as const;
  readonly providerIoAuthorized = false as const;
  readonly clientMaterializationAuthorized = false as const;

  private readonly contract: EvidenceCollectionAuthorizationContract;

  constructor(private readonly input: EvidenceCollectionAuthorizationExecutorInputs) {
    this.contract = assertAuthorizationContract(input.authorizationContract);
    assertTransport(input.transport, this.contract);
    if (typeof input.now !== "function") fail("invalid_clock");
    if (typeof input.tokenSource !== "function") fail("invalid_token_source");
  }

  async execute(): Promise<StructuralEvidenceCollectionAuthorizationResult> {
    const requestedAt = this.input.now();
    const requestedAtMs = parseIso(requestedAt);
    if (requestedAtMs === null) fail("invalid_clock");

    const requestId = this.input.tokenSource("request_id");
    const nonce = this.input.tokenSource("authorization_nonce");
    if (!OPAQUE.test(requestId) || !OPAQUE.test(nonce) || requestId === nonce) {
      fail("invalid_token_source");
    }

    let response: StructuralEvidenceCollectionAuthorizationTransportResult;
    try {
      response = await this.input.transport.exercise({
        provider: "supabase",
        projectLabel: DEV_PROJECT_LABEL,
        projectBindingId: this.contract.projectBindingId,
        expectedProjectRef: this.contract.expectedProjectRef,
        expectedProjectUrl: this.contract.expectedProjectUrl,
        requestId,
        nonce,
        requestedAt,
        allowedActions: [...LIVE_EVIDENCE_COLLECTION_ACTIONS],
        maxUsesPerAction: 1,
      });
    } catch {
      fail("structural_transport_unavailable");
    }

    if (!response || typeof response !== "object") fail("invalid_structural_response");
    if (response.error !== null) fail("structural_transport_unavailable");
    if (!response.data) fail("invalid_structural_response");

    const completedAt = this.input.now();
    const completedAtMs = parseIso(completedAt);
    if (completedAtMs === null || completedAtMs < requestedAtMs - MAX_CLOCK_SKEW_MS) fail("invalid_clock");

    validateStructuralObservation(
      response.data,
      this.contract,
      requestId,
      nonce,
      requestedAtMs,
      completedAtMs,
    );

    return {
      version: EVIDENCE_COLLECTION_AUTHORIZATION_EXECUTOR_VERSION,
      state: "structural_authorization_exchange_satisfied",
      provider: "supabase",
      projectLabel: DEV_PROJECT_LABEL,
      projectBindingId: this.contract.projectBindingId,
      expectedProjectRef: this.contract.expectedProjectRef,
      expectedProjectUrl: this.contract.expectedProjectUrl,
      structuralLease: {
        provenance: "structural_test_double",
        authorizationId: response.data.authorizationId,
        issuedAt: response.data.issuedAt,
        expiresAt: response.data.expiresAt,
        allowedActions: [...LIVE_EVIDENCE_COLLECTION_ACTIONS],
        maxUsesPerAction: 1,
      },
      externalLeaseReceiptAcceptance: externalLeaseReceiptContract(this.contract),
      externalConsumptionReceiptAcceptance: externalConsumptionReceiptContract(this.contract),
      structuralTransportInvoked: true,
      structuralLeaseEnvelopeValidated: true,
      externalLeaseIssuanceRequired: true,
      externallyIssuedLeaseProven: false,
      externalLeaseReceiptAccepted: false,
      evidenceCollectionAuthorizationAccepted: false,
      evidenceCollectionProviderIoAuthorized: false,
      externalConsumptionReceiptAccepted: false,
      liveRemoteIdentityEvidenceAccepted: false,
      liveSessionBootstrapEvidenceAccepted: false,
      explicitMaterializationGrantAccepted: false,
      clientMaterializationAuthorized: false,
      materializerMayExecute: false,
      providerParityProven: false,
      runtimeActivationAuthorized: false,
      deploymentAuthorized: false,
      activationFactsProduced: false,
    };
  }
}

export function createEvidenceCollectionAuthorizationExecutor(
  input: EvidenceCollectionAuthorizationExecutorInputs,
): EvidenceCollectionAuthorizationExecutor {
  return new EvidenceCollectionAuthorizationExecutor(input);
}

export function evidenceCollectionAuthorizationExecutorProducesNoActivationFacts(): Record<string, never> {
  return {};
}

export function evidenceCollectionAuthorizationExecutorProducesNoProviderExecutionFacts(): Record<string, never> {
  return {};
}
