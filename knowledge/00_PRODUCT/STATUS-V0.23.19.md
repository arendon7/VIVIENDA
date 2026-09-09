# STATUS · V0.23.19 · Evidence Runtime Parity Contract

## Estado

**Candidato de freeze documental.**

Rama:

`product/evidence-runtime-parity-contract-v0.23.19`

Base inmediata:

`product/synthetic-evidence-failure-rehearsal-v0.23.18`

Freeze padre V0.23.18:

`ac0c90e790e0afbc606ff2ecb6083a9d2e6cd5fc`

Head funcional/documental previo a este STATUS:

`461f9b42b9e5b4888dfdb15536de5ae220b8e70f`

## Pregunta de arquitectura

Después de congelar por separado el happy-path sintético de V0.23.17 y la matriz fail-closed de V0.23.18, ¿cómo obligamos a un futuro runtime DEV con providers reales a conservar simultáneamente esas mismas semánticas antes de siquiera discutir activación?

## Respuesta V0.23.19

Mediante un **Evidence Runtime Parity Contract** provider-neutral, versionado y ejecutable.

Baseline:

`V0.23.19-RUNTIME-PARITY-V1`

El contrato toma una observación segura del comportamiento de un candidato y la compara contra:

- el happy-path congelado en V0.23.17;
- los cinco escenarios adversariales congelados en V0.23.18.

No configura providers, no evalúa activation facts y no activa el runtime público.

## Auditoría previa y razón del slice

Antes de implementar V0.23.19 se verificó que el repositorio ya contiene los adapters/provider boundaries relevantes:

- `SupabaseCasePersistenceAdapter`;
- `SupabasePrincipalResolver`;
- `SupabaseStorageCoordinationRegistry`;
- RPCs service-only para resolver objetos físicos de intents y evidencia legible.

Por ello no se creó otro adapter abstracto redundante.

El gap real era de **conformance**: un provider puede implementar correctamente interfaces TypeScript y aun introducir drift observable en status HTTP, error codes, Case State, orden de acceso a Storage, clasificación o auditoría.

## Archivos funcionales

1. `server/evidence-api/runtime-parity-contract.ts`
2. `server/evidence-api/runtime-parity-contract.test.ts`

## Archivos documentales

3. `knowledge/10_DECISIONS/ADR-0015-evidence-runtime-parity-contract.md`
4. `knowledge/60_ENGINEERING/EVIDENCE-RUNTIME-PARITY-CONTRACT-V0.23.19.md`
5. `knowledge/00_PRODUCT/STATUS-V0.23.19.md`

## Observation model

`EvidenceRuntimeParityObservation` conserva:

- baseline version;
- source (`synthetic_baseline` o `dev_provider_candidate`);
- metadata `externalIoOccurred`;
- `liveRuntimeAuthorized`;
- `runtimeServerWasUsed`;
- happy-path normalizado;
- failure matrix normalizada.

No contiene:

- `storageLocator`;
- `checksumSha256`;
- upload token;
- signed URL;
- object path;
- bytes;
- PII;
- secrets.

Dos observaciones sintéticas consecutivas son determinísticas.

## External IO no es autoridad

El baseline sintético usa:

`externalIoOccurred = false`

Un futuro candidato DEV puede usar:

`source = dev_provider_candidate`

`externalIoOccurred = true`

y aun ser semánticamente conformante.

Esto es intencional: paridad compara comportamiento, no pretende que un provider real carezca de IO.

## Frontera de activación

Toda decisión de paridad conserva por tipo y valor:

- `runtimeActivationAuthorized = false`;
- `activationDecisionEvaluated = false`.

Además, la observación falla si intenta declarar:

- `liveRuntimeAuthorized = true`;
- `runtimeServerWasUsed = true`.

El contrato no importa ni invoca:

- `runtime.server.ts`;
- `createActivatedEvidenceRuntime`;
- `assertEvidenceRuntimeActivationAllowed`;
- `verifiedEvidenceRuntimeActivationFacts`.

Por tanto:

> parity PASS ≠ activation preflight PASS ≠ activación/deployment productivo.

## Happy-path canónico

Debe conservar exactamente:

- route `R7_RECLAMACION`;
- track `assisted`;
- final Case version `5`;
- final stage `collecting_evidence`;
- event sequence:
  1. `CASE_CREATED`
  2. `DATA_AUTHORIZATION_RECORDED`
  3. `SERVICE_AGREEMENT_ACCEPTED`
  4. `EVIDENCE_REQUESTED`
  5. `EVIDENCE_ATTACHED`
- ausencia de `EVIDENCE_VERIFIED`;
- una evidencia `statement`;
- `financial_credit_semiprivate`;
- `restricted`;
- lifecycle `active`;
- prepare/complete/download = 200/200/200;
- audit prepare → complete → download;
- clasificación server-side prevalece;
- Case read model no expone locator ni checksum.

## Failure matrix canónica

### 1. unauthenticated_prepare

- prepare 401;
- `authentication_required`;
- version 4;
- stage draft;
- evidence 0;
- registry 0;
- grants 0;
- inspections 0.

### 2. missing_data_authorization

- prepare 409;
- `data_authorization_required`;
- version 3;
- stage draft;
- evidence 0;
- registry 0;
- grants 0;
- inspections 0.

### 3. cross_case_access

- prepare 403;
- `forbidden`;
- version 4;
- stage draft;
- evidence 0;
- registry 0;
- grants 0;
- inspections 0.

### 4. missing_uploaded_object

- prepare 200;
- complete 404;
- `evidence_not_found`;
- version 4;
- stage draft;
- upload intent `quarantine`;
- registry 1;
- grant 1;
- inspection 1;
- evidence 0;
- no `EVIDENCE_ATTACHED`.

### 5. rate_limit_unavailable

- prepare 503;
- `rate_limit_unavailable`;
- version 4;
- stage draft;
- evidence 0;
- registry 0;
- grants 0;
- inspections 0.

## 37 checks

El baseline inicial ejecuta exactamente **37 verificaciones**:

- 3 globales;
- 8 de happy-path;
- 1 de completitud de failure matrix;
- 5 checks por cada uno de 5 failures = 25.

Baseline sano:

- `state = conformant`;
- `conformsToBaseline = true`;
- `totalChecks = 37`;
- `passedChecks = 37`;
- `deviations = []`.

## Drifts adversariales fijados en tests

V0.23.19 demuestra que el evaluator detecta:

- elevar inspección técnica a `EVIDENCE_VERIFIED`;
- persistir evidencia después de un complete fallido;
- crear `EVIDENCE_ATTACHED` después de rechazo;
- tocar registry/Storage antes de ownership;
- convertir 401 `authentication_required` en 500 `provider_error`;
- omitir un escenario adversarial;
- declarar autoridad live;
- participar `runtime.server.ts`.

## Error/gate

`assertEvidenceRuntimeParity()` lanza:

`EvidenceRuntimeParityError`

con code:

`runtime_parity_failed`

cuando existe cualquier desviación.

La decisión reporta códigos estables y mensajes sanitizados; no expone material físico del provider.

## Verificación funcional inicial

Head funcional:

`63342032116420489e71a3a5fdee3a3dca75477b`

GitHub Actions run:

`34317552775`

Resultado:

- TypeScript — **PASS**
- Domain tests — **PASS**
- Build — **PASS**
- Playwright — **244/244 PASS**
- Playwright reportó `244 passed (1.8m)`
- Remote Preview E2E — **SKIPPED por diseño**

## Verificación funcional/documental previa al STATUS

Head:

`461f9b42b9e5b4888dfdb15536de5ae220b8e70f`

GitHub Actions run:

`34317955523`

Resultado:

- TypeScript — **PASS**
- Domain tests — **PASS**
- Build — **PASS**
- Playwright — **244/244 PASS**
- Playwright reportó `244 passed (2.4m)`
- Remote Preview E2E — **SKIPPED por diseño**

## Lo que V0.23.19 NO demuestra

No demuestra:

- que exista un proyecto Supabase DEV utilizable;
- que exista capacidad del provider;
- que migrations estén aplicadas live;
- Auth live;
- mapping inmutable live;
- RLS live;
- Storage live;
- grants firmados live;
- deletion worker live;
- distributed rate limiting;
- audit transport externo;
- backups/recovery;
- performance;
- disponibilidad;
- billing;
- deployment productivo.

## Relación con V0.23.12

El activation preflight mantiene 15 requisitos independientes.

Un parity PASS puede convertirse en el futuro en evidencia técnica para algunos de ellos, pero V0.23.19 no puede marcarlos `verified`.

No existe puente automático desde conformance hacia activation facts.

## runtime.server.ts

Permanece sin cambios y fail-closed:

- `UnconfiguredEvidenceApplication`;
- `FailClosedRateLimit`.

V0.23.19 no lo importa ni lo ejecuta.

## Infraestructura

Durante V0.23.19:

- no se creó proyecto Supabase;
- no se pausó proyecto alguno;
- no se ejecutó billing/upgrade;
- no se aplicaron migrations live;
- no se usaron secrets;
- no se almacenaron documentos reales;
- no ocurrió IO externo propio del slice;
- no se habilitaron endpoints públicos nuevos.

## Zero semantic bridge

`conformant` no significa:

- provider disponible;
- provider verificado;
- DEV provisionado;
- DEV calificado;
- runtime activable;
- runtime activado;
- Case real creado;
- consentimiento real registrado;
- servicio real aceptado;
- documento real almacenado;
- servicio profesional contratado;
- poder otorgado;
- radicación ejecutada.

## Invariantes de freeze

El SHA generado por este STATUS debe repetir antes de abrir PR:

1. TypeScript PASS;
2. Domain tests PASS;
3. Build PASS;
4. Playwright 244/244 PASS;
5. Remote Preview E2E SKIPPED por diseño.

Después del freeze definitivo:

- no se añadirán commits;
- el PR será draft;
- su base será V0.23.18/#47, no `main`;
- el CI del merge ref deberá quedar verde;
- se registrará comentario final de freeze;
- no se fusionará el stack.

## Criterio de cierre

V0.23.19 queda cerrado únicamente cuando:

- este STATUS tenga freeze SHA propio;
- ese freeze repita verify + 244/244 E2E;
- exista PR draft apilado sobre #47;
- `mergeable = true`;
- el CI propio del PR pase verify + 244/244 E2E;
- se registre comentario final de freeze;
- no existan commits posteriores.
