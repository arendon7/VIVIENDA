# STATUS · V0.23.36

## Slice

**Live Materialization Authorization Evidence Contract**

## Parent freeze

V0.23.35:

`271f397859256308997957cd7cf84cead0da2423`

PR padre: #64.

## Branch

`product/live-materialization-authorization-evidence-v0.23.36`

## Estado actual

Candidate complete; freeze pendiente del CI final de `pull_request`.

## Implementación

Source:

`server/evidence-api/live-materialization-authorization-evidence-contract.ts`

Version:

`V0.23.36-LIVE-MATERIALIZATION-AUTHORIZATION-EVIDENCE-CONTRACT-V1`

Test:

`server/evidence-api/live-materialization-authorization-evidence-contract.test.ts`

Docs:

- `knowledge/10_DECISIONS/ADR-0032-live-materialization-authorization-evidence-contract.md`
- `knowledge/60_ENGINEERING/LIVE-MATERIALIZATION-AUTHORIZATION-EVIDENCE-CONTRACT-V0.23.36.md`
- este status.

## Qué resuelve

V0.23.36 define la autoridad futura necesaria para satisfacer los tres requisitos live emitidos por V0.23.35 sin ejecutar ningún I/O ni materializar clients.

La principal decisión es una separación de autoridad en dos fases:

1. **Phase A · Evidence collection authorization**;
2. **Phase B · Final materialization grant**.

## Hallazgo arquitectónico

V0.23.35 exige:

- remote identity live evidence;
- synthetic session live evidence;
- grant final que vincule ambas evidencias;

pero también mantiene:

```text
providerIoBeforeGrantAllowed=false
```

Si el grant final fuera la única autoridad para cualquier I/O, la secuencia quedaría bloqueada: la evidencia live necesita I/O, pero el grant necesita la evidencia antes de existir.

V0.23.36 resuelve este deadlock sin modificar V0.23.35 mediante un canal separado y limitado de evidence collection.

## Phase A · Evidence collection

Contrato:

```text
channel=live_materialization_evidence_collection_authorization
authorizationKind=scoped_live_evidence_collection_lease
requiredSource=external_materialization_control_plane
maxTtlSeconds=300
```

Allowed actions exactas:

1. `attest_remote_project_identity`;
2. `bootstrap_owner_synthetic_session`;
3. `resolve_owner_synthetic_session`;
4. `bootstrap_intruder_synthetic_session`;
5. `resolve_intruder_synthetic_session`.

Cada acción: máximo 1 uso.

No permite:

- RPC arbitrario;
- Storage arbitrario;
- provider-client materialization;
- SDK factory invocation;
- runtime activation;
- deployment.

V0.23.36 no emite ni acepta esta lease.

## Receipts live requeridos

### Remote identity

Debe venir de:

`authorized_external_live_provider_attestation`

Y demostrar:

- provider I/O observado;
- identidad exacta del proyecto;
- verificación externa;
- evidence ID + timestamp;
- frescura <= 300 s;
- cero credentials/handle IDs en receipt.

### Session bootstrap

Debe venir de:

`authorized_external_live_provider_session_bootstrap`

Y demostrar:

- owner + intruder;
- issue + resolve de ambos;
- subjects distintos;
- fixture desechable;
- lifetime containment;
- provider I/O observado;
- verificación externa;
- evidence ID + timestamp;
- frescura <= 300 s;
- cero access-token values, fixture-email values o handle IDs en receipt.

## Phase B · Final materialization grant

Debe venir de:

`external_materialization_control_plane`

Acción exacta:

`materialize_qualified_dev_provider_clients`

Requisitos:

- TTL <= 300 s;
- single-use;
- atomic consumption;
- exact project binding;
- exact five-authority set por receipt externo;
- binding del Phase A authorization receipt;
- binding del remote evidence ID;
- binding del session evidence ID;
- evidencia anterior al grant y todavía fresca;
- autenticidad externamente verificada.

El materializer no puede ejecutar antes del consumo atómico.

## Autoridad mantenida en false

Incluso con state ready:

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

## Verificación funcional previa a docs

Head:

`d5c1a75fcb29df2279681a61dfb923dd8c082fe0`

Run push:

`34781093447`

Verify:

- TypeScript PASS;
- Domain **69 files / 739 tests PASS**;
- V0.23.36 **19/19 PASS**;
- Build PASS.

## Freeze pendiente

1. verificar delta exacto contra V0.23.35;
2. confirmar source + test + 3 docs solamente;
3. abrir draft PR #65 con base `product/authorized-client-materialization-gate-v0.23.35`;
4. inmovilizar el head final;
5. usar exclusivamente el run `pull_request` de ese SHA;
6. exigir TypeScript, Domain, Build y Borrower Journey PASS;
7. remote-preview puede quedar SKIPPED por diseño;
8. exigir `draft=true`, `open`, `merged=false`, `mergeable=true`;
9. registrar freeze únicamente en metadata del PR.

## Próxima frontera posible

Después del freeze, V0.23.37 puede implementar el **Evidence Collection Authorization Executor / Receipt Contract**, todavía con ports inyectados y sin provider I/O live no autorizado.

Ese slice debe poder distinguir con claridad:

- una lease estructural/fake usada por tests;
- una lease realmente emitida por un control plane externo;
- receipt de consumo/acciones completadas;
- ninguna autoridad de materialización.

## Autoridad

**Evidence Authorization Contract PASS ≠ Evidence Collection Lease Issued ≠ Evidence Collection Provider I/O Authorized ≠ Live Remote Identity PASS ≠ Live Session Bootstrap PASS ≠ Materialization Grant Accepted ≠ Grant Consumed ≠ Provider Client Materialization ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Prohibiciones mantenidas

- no merge;
- no provider I/O live;
- no SDK Supabase;
- no credentials/secrets;
- no env reads;
- no provisioning;
- no SQL aplicado;
- no `runtime.server.ts` change;
- no activation;
- no deployment.
