# V0.23.36 · Live Materialization Authorization Evidence Contract

## Objetivo

Definir, de forma pura y fail-closed, qué autoridad y qué receipts deben existir antes de que un futuro materializer pueda construir provider clients para `vivienda-dev`.

V0.23.36 no ejecuta provider I/O, no instancia SDKs, no acepta evidencia live y no consume grants.

## Parent

V0.23.35 freeze:

`271f397859256308997957cd7cf84cead0da2423`

## Source

`server/evidence-api/live-materialization-authorization-evidence-contract.ts`

Version:

`V0.23.36-LIVE-MATERIALIZATION-AUTHORIZATION-EVIDENCE-CONTRACT-V1`

Main evaluator:

`evaluateLiveMaterializationAuthorizationEvidenceContract`

## Input

El evaluator recibe exclusivamente:

```ts
{
  materializationGate: ProviderClientMaterializationGateDecision
}
```

No recibe:

- credentials;
- access tokens;
- SDK clients;
- fetch transports;
- environment variables;
- runtime activation state.

## Precondición upstream

El gate V0.23.35 debe estar exactamente en:

```text
version=V0.23.35-AUTHORIZED-CLIENT-MATERIALIZATION-GATE-V1
state=ready_for_live_materialization_authorization
provider=supabase
projectLabel=vivienda-dev
authorityHandleCount=5
configurationRevalidated=true
configurationStable=true
contractStackValidated=true
blockers=[]
```

Y todas las autoridades de ejecución continúan false.

El nested `authorizationRequirement` se revalida en forma exacta, incluyendo:

- project identity;
- 5 authority handles como cardinalidad esperada;
- source de remote identity;
- source de session bootstrap;
- source/action del grant final;
- TTL final 300 s;
- binding de project identity;
- binding de authority handles;
- binding de live evidence;
- atomic consumption;
- `providerIoBeforeGrantAllowed=false`;
- `sdkInstantiationBeforeGrantAllowed=false`.

Cualquier drift bloquea el contrato.

## State machine

Estados:

```text
evidence_authorization_contract_ready
blocked_materialization_gate_invalid
```

Blockers:

```text
materialization_gate_not_ready
materialization_authorization_requirement_invalid
```

Un PASS de V0.23.36 solo significa que la estructura de autoridad futura está definida coherentemente.

## Two-phase authorization

### Phase A · Evidence collection

Contrato:

```text
channel=live_materialization_evidence_collection_authorization
requiredSource=external_materialization_control_plane
authorizationKind=scoped_live_evidence_collection_lease
maxTtlSeconds=300
singleProjectOnly=true
syntheticFixtureOnly=true
maxUsesPerAction=1
```

Allowed action set exacto:

```text
attest_remote_project_identity
bootstrap_owner_synthetic_session
resolve_owner_synthetic_session
bootstrap_intruder_synthetic_session
resolve_intruder_synthetic_session
```

Prohibiciones de la lease:

```text
arbitraryRpcAllowed=false
arbitraryStorageAllowed=false
providerClientMaterializationAllowed=false
sdkFactoryInvocationAllowed=false
runtimeActivationAllowed=false
deploymentAllowed=false
```

El receipt de la lease debe vincular:

- authorization ID;
- project identity;
- acciones completadas;
- producer externo.

V0.23.36 no emite el receipt ni acepta la lease.

### Phase B · Materialization grant

Contrato:

```text
channel=provider_client_materialization_authorization
requiredSource=external_materialization_control_plane
action=materialize_qualified_dev_provider_clients
maxTtlSeconds=300
singleUseRequired=true
atomicConsumptionRequired=true
```

Debe vincular:

1. project identity exacta;
2. set exacto de authority handles mediante receipt externo;
3. evidence-collection authorization receipt;
4. live remote identity evidence ID;
5. live session bootstrap evidence ID.

Además:

```text
liveEvidenceMustPredateGrant=true
liveEvidenceMustBeFreshAtGrantIssue=true
liveEvidenceAuthenticityMustBeExternallyVerified=true
materializerMayExecuteBeforeAtomicConsumption=false
```

Los raw authority handle IDs no aparecen en el output V0.23.36.

## Live Remote Identity receipt contract

Exige:

```text
evidenceKind=live_remote_project_identity
requiredSource=authorized_external_live_provider_attestation
providerIoObservedRequired=true
remoteIdentityVerifiedRequired=true
externalVerifierReceiptRequired=true
evidenceIdRequired=true
observedAtRequired=true
maxEvidenceAgeSeconds=300
credentialsForbiddenInReceipt=true
authorityHandleIdsForbiddenInReceipt=true
```

La identidad esperada incluye:

- `vivienda-dev`;
- project binding ID;
- expected project ref;
- expected HTTPS origin.

## Live Synthetic Session receipt contract

Exige:

```text
evidenceKind=live_synthetic_session_bootstrap
requiredSource=authorized_external_live_provider_session_bootstrap
ownerAndIntruderRequired=true
issueAndResolveRequiredForEachActor=true
distinctSubjectsRequired=true
disposableFixtureRequired=true
capabilityLifetimeContainmentRequired=true
providerIoObservedRequired=true
sessionBootstrapProvenRequired=true
externalVerifierReceiptRequired=true
evidenceIdRequired=true
observedAtRequired=true
maxEvidenceAgeSeconds=300
```

Y minimización:

```text
accessTokenValuesForbiddenInReceipt=true
syntheticEmailValuesForbiddenInReceipt=true
authorityHandleIdsForbiddenInReceipt=true
```

## Resolución de la dependencia circular

V0.23.35 exige live evidence antes del grant final y, simultáneamente, niega provider I/O antes de ese grant.

V0.23.36 no altera ese freeze. Define un canal de autoridad distinto para evidence collection. Ese canal:

- no es el materialization grant;
- no puede materializar clients;
- no puede activar runtime;
- requiere autorización externa propia;
- solo puede ejecutar el action set exacto para construir receipts.

Por tanto la secuencia futura queda:

```text
V0.23.35 ready
  ↓
Phase A external evidence-collection lease
  ↓
remote identity receipt + session bootstrap receipt
  ↓
Phase B final materialization grant bound to both receipts
  ↓
atomic grant consumption
  ↓
future provider-client materializer
```

Ninguna flecha posterior a V0.23.35 se ejecuta en V0.23.36.

## Authority output

Incluso en PASS:

```text
evidenceCollectionAuthorizationAccepted=false
evidenceCollectionProviderIoAuthorized=false
liveRemoteIdentityEvidenceAccepted=false
liveSessionBootstrapEvidenceAccepted=false
explicitMaterializationGrantAccepted=false
materializationGrantConsumed=false
materializationProviderIoAuthorized=false
sdkInstantiationAuthorized=false
clientMaterializationAuthorized=false
materializerMayExecute=false
remoteIdentityVerified=false
sessionBootstrapProven=false
providerParityProven=false
runtimeActivationAuthorized=false
deploymentAuthorized=false
activationFactsProduced=false
```

## Tests

`server/evidence-api/live-materialization-authorization-evidence-contract.test.ts`

Cobertura de alto valor:

- PASS estructural sin autoridad;
- separación de Phase A / Phase B;
- action set exacto de evidence collection;
- remote identity receipt contract;
- owner/intruder session receipt contract;
- final grant binding;
- upstream gate fail-closed;
- rechazo de self-promotion upstream;
- rechazo de provider-I/O drift;
- rechazo de TTL/source/action/evidence-binding drift;
- data minimization;
- no activation/provider execution facts;
- no runtime/env/network/SDK imports.

Vitest expande `it.each`, por lo que el archivo ejecuta 19 test cases.

## Verificación funcional inicial

Head funcional previo a docs:

`d5c1a75fcb29df2279681a61dfb923dd8c082fe0`

Run push:

`34781093447`

Verify:

```text
TypeScript PASS
69/69 test files PASS
739/739 tests PASS
V0.23.36 19/19 PASS
Build PASS
```

El freeze definitivo requiere un nuevo run de `pull_request` sobre el head final con docs.

## No-go imports / effects

El source no importa ni ejecuta:

- `runtime.server`;
- `activated-runtime`;
- `activation-preflight`;
- `@supabase/supabase-js`;
- `createClient`;
- `process.env`;
- `fetch`;
- axios;
- `node:http` / `node:https`.

## Autoridad

**Evidence Authorization Contract PASS ≠ Evidence Collection Lease Issued ≠ Evidence Collection Provider I/O Authorized ≠ Live Remote Identity PASS ≠ Live Session Bootstrap PASS ≠ Materialization Grant Accepted ≠ Grant Consumed ≠ Provider Client Materialization ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**
