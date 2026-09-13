# V0.23.37 · Evidence Collection Authorization Executor / Receipt Contract

## Objetivo

Implementar el executor estructural de Phase A definido por V0.23.36 y dejar explícitos los contratos de receipts externos requeridos para una futura aceptación live.

V0.23.37 no acepta una lease externa, no autoriza provider I/O y no materializa provider clients.

## Parent freeze

V0.23.36:

`04fa063a4cc33dcd1de6c000b6ba7415aaf7a386`

## Source

`server/evidence-api/evidence-collection-authorization-executor.ts`

Version:

`V0.23.37-EVIDENCE-COLLECTION-AUTHORIZATION-EXECUTOR-V1`

Factory:

`createEvidenceCollectionAuthorizationExecutor`

Executor:

`EvidenceCollectionAuthorizationExecutor`

## Inputs

```ts
{
  authorizationContract: LiveMaterializationAuthorizationEvidenceContractDecision;
  transport: StructuralEvidenceCollectionAuthorizationTransport;
  now: () => string;
  tokenSource: (kind: "request_id" | "authorization_nonce") => string;
}
```

No recibe provider clients, credentials, environment values ni runtime activation state.

## Upstream gate

V0.23.37 exige V0.23.36 exacto:

```text
version=V0.23.36-LIVE-MATERIALIZATION-AUTHORIZATION-EVIDENCE-CONTRACT-V1
state=evidence_authorization_contract_ready
provider=supabase
projectLabel=vivienda-dev
authorityHandleCount=5
blockers=[]
twoPhaseAuthorizationRequired=true
circularDependencyResolvedBySeparateEvidenceCollectionAuthority=true
```

Todas las banderas de autoridad de V0.23.36 deben permanecer false.

También se revalida el Phase A contract:

```text
channel=live_materialization_evidence_collection_authorization
requiredSource=external_materialization_control_plane
authorizationKind=scoped_live_evidence_collection_lease
maxTtlSeconds=300
singleProjectOnly=true
syntheticFixtureOnly=true
exactActionSetRequired=true
maxUsesPerAction=1
```

Y las prohibiciones:

```text
arbitraryRpcAllowed=false
arbitraryStorageAllowed=false
providerClientMaterializationAllowed=false
sdkFactoryInvocationAllowed=false
runtimeActivationAllowed=false
deploymentAllowed=false
```

## Structural transport

Interface:

`StructuralEvidenceCollectionAuthorizationTransport`

Metadata obligatoria:

```text
channel=evidence_collection_authorization_structural_transport
provider=supabase
projectLabel=vivienda-dev
structuralOnly=true
externallyIssuedLeaseProven=false
providerIoAuthorized=false
clientMaterializationAuthorized=false
runtimeActivationAuthorized=false
deploymentAuthorized=false
```

El constructor valida esta metadata antes de cualquier llamada.

## Exchange request

`exercise()` recibe:

- provider/project label;
- project binding ID;
- expected project ref;
- expected project URL;
- request ID opaco;
- authorization nonce opaco y distinto del request ID;
- requestedAt;
- cinco acciones canónicas;
- `maxUsesPerAction=1`.

## Structural observation

La respuesta válida debe incluir:

```text
source=injected_structural_test_observation
provenance=structural_test_double
provider=supabase
projectLabel=vivienda-dev
```

más:

- project identity exacta;
- authorization ID opaco;
- requestId/nonce exactos;
- issuedAt/expiresAt;
- action set exacto y en orden canónico;
- maxUsesPerAction=1;
- syntheticFixtureOnly=true;
- materializationAllowed=false;
- runtimeActivationAllowed=false;
- deploymentAllowed=false.

## Temporal validation

Constantes:

```text
MAX_LEASE_TTL = 300 s
MAX_CLOCK_SKEW = 60 s
```

Se rechaza:

- timestamp inválido;
- issue demasiado anterior al request;
- issue irrazonablemente posterior a completion;
- expiry <= issue;
- expiry <= completion;
- TTL > 300 s.

## Structural result

State:

`structural_authorization_exchange_satisfied`

El resultado conserva una versión sanitizada de la lease estructural:

- provenance;
- authorization ID;
- issuedAt/expiresAt;
- allowedActions;
- maxUsesPerAction.

No contiene request nonce ni secrets.

Authority flags:

```text
structuralTransportInvoked=true
structuralLeaseEnvelopeValidated=true
externalLeaseIssuanceRequired=true
externallyIssuedLeaseProven=false
externalLeaseReceiptAccepted=false
evidenceCollectionAuthorizationAccepted=false
evidenceCollectionProviderIoAuthorized=false
externalConsumptionReceiptAccepted=false
liveRemoteIdentityEvidenceAccepted=false
liveSessionBootstrapEvidenceAccepted=false
explicitMaterializationGrantAccepted=false
clientMaterializationAuthorized=false
materializerMayExecute=false
providerParityProven=false
runtimeActivationAuthorized=false
deploymentAuthorized=false
activationFactsProduced=false
```

## External issuance receipt acceptance contract

V0.23.37 produce un contrato, no un receipt aceptado.

```text
channel=live_materialization_evidence_collection_authorization_receipt
requiredSource=external_materialization_control_plane
requiredProvenance=externally_issued_and_boundary_verified
maxTtlSeconds=300
structuralTestDoubleAcceptedAsExternalEvidence=false
externalBoundaryVerificationRequired=true
```

Debe contener/bind:

- authorization ID;
- issuance receipt ID;
- exact project identity;
- issue/expiry;
- exact action set;
- one use per action;
- synthetic-only scope.

Debe omitir:

- credentials;
- authority handle IDs.

No implica materialization/SDK/runtime/deployment.

## External consumption receipt acceptance contract

Contrato:

```text
channel=live_materialization_evidence_collection_consumption_receipt
requiredSource=external_materialization_control_plane
requiredProvenance=externally_observed_action_consumption
```

Bindings requeridos:

- authorization ID = accepted lease;
- issuance receipt ID = accepted lease;
- project identity = accepted lease;
- completion receipt ID;
- completedAt;
- completion antes del expiry;
- exact five-action completion set.

Cada acción requiere:

```text
exactUseCount=1
usedAtRequired=true
providerIoObservedRequired=true
```

Prohibiciones:

```text
duplicateActionUseAllowed=false
unlistedActionUseAllowed=false
structuralTestDoubleAcceptedAsExternalEvidence=false
providerClientMaterializationAuthorized=false
runtimeActivationAuthorized=false
deploymentAuthorized=false
```

Minimización:

- credentials forbidden;
- access token values forbidden;
- synthetic email values forbidden;
- authority handle IDs forbidden.

## Error model

`EvidenceCollectionAuthorizationExecutorError` codes:

```text
authorization_contract_not_ready
invalid_structural_transport
invalid_clock
invalid_token_source
structural_transport_unavailable
invalid_structural_response
structural_identity_mismatch
structural_action_scope_mismatch
structural_lease_lifetime_invalid
```

Los errores de upstream/transport metadata ocurren antes de `exercise()`.

## Tests

`server/evidence-api/evidence-collection-authorization-executor.test.ts`

Vitest ejecuta **22 cases** por los `it.each`.

Cobertura:

- structural PASS sin external authority;
- external issuance receipt contract;
- consumption receipt exact one-use for five actions;
- upstream self-promotion rejected pre-I/O;
- transport self-promotion rejected pre-I/O;
- project identity drift;
- action set/order/scope drift;
- TTL and timestamp drift;
- request/nonce reuse;
- transport throw/error fail-closed;
- output data minimization;
- no activation/provider execution facts;
- no runtime/env/network/SDK imports.

## Verificación funcional inicial

Head funcional:

`1e124858dfdc0a666e286a9f9248d3a4395bfcb8`

Push run:

`34781587196`

Verify:

```text
TypeScript PASS
70/70 test files PASS
761/761 tests PASS
V0.23.37 22/22 PASS
Build PASS
```

El freeze final requiere CI `pull_request` sobre el head con docs.

## No-go effects

No se usa:

- `runtime.server`;
- activated runtime;
- activation preflight;
- Supabase SDK;
- `createClient`;
- `process.env`;
- network libraries;
- provider credentials.

## Autoridad

**Structural Authorization Exchange PASS ≠ External Lease Issued ≠ External Lease Receipt Accepted ≠ Evidence Collection Provider I/O Authorized ≠ Consumption Receipt Accepted ≠ Live Evidence PASS ≠ Materialization Grant Accepted ≠ Provider Client Materialization ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**
