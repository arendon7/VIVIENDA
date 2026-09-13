# ADR-0037 · Live Evidence Trust Readiness Aggregate & Offline Completion Gate

## Estado

Aceptado para V0.23.41.

## Contexto

V0.23.35–V0.23.40 construyeron, en slices separados y fail-closed, la arquitectura necesaria para llegar desde un preflight estructural hasta una futura materialización de clients de provider sin confundir pruebas offline con hechos live.

La secuencia acumulada quedó distribuida entre seis decisiones:

1. V0.23.35 valida coherencia del gate de materialización y exige evidencia live + grant explícito;
2. V0.23.36 separa Phase A de recolección de evidencia del grant final de materialización;
3. V0.23.37 demuestra únicamente el exchange estructural de autorización de Phase A;
4. V0.23.38 valida estructura, correlación y timeline de receipts externos;
5. V0.23.39 vincula evidencia independiente de autenticidad a esos receipts;
6. V0.23.40 cierra la cadena offline de trust y prohíbe nuevas promociones offline.

Sin un agregado terminal, era posible seguir agregando slices laterales sin responder una pregunta operacional simple: **¿qué está completo offline y qué debe ocurrir, en qué orden, para progresar realmente?**

## Decisión

V0.23.41 introduce `Live Evidence Trust Readiness Aggregate / Offline Completion Gate` como resumen normativo del stack V0.23.35–40.

El gate:

- revalida los seis contratos congelados;
- detecta drift de `projectBindingId` entre slices;
- detecta drift de `expectedProjectRef` y `expectedProjectUrl` donde esos campos existen;
- rechaza cualquier promoción prematura de autoridad en cualquiera de los seis inputs;
- declara la arquitectura offline completa solo cuando los seis slices conservan exactamente sus fronteras fail-closed;
- emite el único orden válido para una futura ejecución externa;
- no autoriza esa ejecución, no la inicia y no produce hechos live.

## Estado PASS

Un PASS de V0.23.41 significa:

```text
state=offline_architecture_complete_external_execution_blocked
offlineArchitectureComplete=true
offlineTrustChainClosed=true
nextProgressRequiresExternalExecution=true
noFurtherOfflineTrustPromotionAllowed=true
crossSliceProjectBindingStable=true
crossSliceProjectIdentityStable=true
```

Y simultáneamente mantiene:

```text
externalExecutionSeparatelyAuthorized=false
phaseAEvidenceCollectionAuthorizationAccepted=false
evidenceCollectionProviderIoAuthorized=false
liveRemoteIdentityEvidenceAccepted=false
liveSessionBootstrapEvidenceAccepted=false
verifierTrustAnchorExternallyVerified=false
authenticityEvidenceAccepted=false
externalBoundaryVerificationProven=false
evidenceCollectionReceiptsVerified=false
explicitMaterializationGrantAccepted=false
materializationGrantConsumed=false
providerIoAuthorized=false
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

## Orden externo único

Cuando y solo cuando exista una autorización externa separada, la progresión deberá respetar este orden:

1. `authorize_phase_a_evidence_collection`
2. `execute_live_identity_and_session_evidence`
3. `verify_receipt_authenticity_and_verifier_trust`
4. `accept_live_evidence_receipts`
5. `issue_and_atomically_consume_materialization_grant`
6. `materialize_qualified_dev_provider_clients`

Este plan es descriptivo y normativo, no una capability ejecutable.

## Reglas de no sustitución

- V0.23.37 no sustituye una lease Phase A externamente emitida.
- V0.23.38 no convierte estructura de receipts en receipts externos aceptados.
- V0.23.39 no convierte un claim de autenticidad en autenticidad aceptada.
- V0.23.40 no convierte cierre offline en trust externo verificado.
- test doubles estructurales no pueden satisfacer ningún stage externo.
- artifacts offline no pueden sustituir evidencia live.

## Corrección detectada por CI

El primer run funcional `34784862790` falló en TypeScript antes de ejecutar Domain porque `bindings[0]` podía tiparse como `string | null | undefined` y el resultado contractual exige `string | null`.

La corrección fue deliberadamente mínima:

```text
projectBindingId: pass && typeof binding === "string" ? binding : null
```

No se modificaron tests, estados, blockers, orden de ejecución ni fronteras de autoridad.

El run corregido `34785188062` sobre `ca064e221da51b8827a6413d5b4e23258034689b` obtuvo:

- TypeScript PASS;
- Domain: 74 files / 873 tests PASS;
- V0.23.41: 18/18 PASS;
- Build PASS.

## Consecuencias

### Positivas

- cierra explícitamente el trabajo offline de esta línea;
- evita proliferación de nuevos contracts que no incrementen evidencia real;
- concentra el próximo salto técnico en una sola frontera autorizable;
- conserva exacta trazabilidad desde V0.23.35 hasta V0.23.40;
- hace visible cualquier drift entre slices antes de una futura ejecución externa.

### Pendiente

Ninguna ejecución externa está autorizada. No existe provider I/O live, trust-registry I/O, aceptación de receipts live, grant consumido ni client materialization.

## Autoridad

**Offline Completion PASS ≠ External Execution Authorized ≠ Phase A Authorization Accepted ≠ Live Evidence Accepted ≠ Verifier Trust PASS ≠ Receipt Acceptance ≠ Materialization Grant Accepted/Consumed ≠ Provider Client Materialization ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Restricciones

V0.23.41 no usa env, credentials, Supabase SDK, fetch, provider I/O, trust-registry I/O, `runtime.server.ts`, client construction, materialización, runtime activation, deployment, provisioning, SQL ni merge.
