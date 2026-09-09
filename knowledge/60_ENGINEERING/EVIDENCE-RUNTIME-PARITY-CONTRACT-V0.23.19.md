# Evidence Runtime Parity Contract · V0.23.19

## 1. Objetivo

V0.23.19 convierte los dos baselines integrados ya congelados —V0.23.17 happy-path y V0.23.18 fail-closed— en un contrato único, versionado y reutilizable para comparar un futuro runtime DEV contra la semántica actualmente certificada.

La pregunta de ingeniería es:

> ¿El candidato reproduce exactamente las decisiones observables que ya consideramos correctas, sin convertir esa equivalencia en autorización de activación?

La respuesta se materializa en:

`server/evidence-api/runtime-parity-contract.ts`

con pruebas en:

`server/evidence-api/runtime-parity-contract.test.ts`

## 2. Base inmediata

Parent slice:

`V0.23.18 · Synthetic Evidence Failure Rehearsal`

Freeze padre:

`ac0c90e790e0afbc606ff2ecb6083a9d2e6cd5fc`

Branch:

`product/evidence-runtime-parity-contract-v0.23.19`

## 3. Baseline versionado

Constante:

`EVIDENCE_RUNTIME_PARITY_BASELINE_VERSION = "V0.23.19-RUNTIME-PARITY-V1"`

La versión forma parte de la observación y de la decisión de evaluación.

El objetivo es impedir que un provider futuro sea comparado contra una semántica implícita o móvil.

## 4. Fuentes canónicas

El baseline se obtiene directamente de:

- `runSyntheticEvidenceRuntimeRehearsal()`;
- `runSyntheticEvidenceFailureMatrix()`.

No se duplican runners alternativos para inventar expectativas nuevas.

V0.23.19 normaliza sus resultados y fija las invariantes que ya estaban demostradas.

## 5. Observation model

`EvidenceRuntimeParityObservation` contiene:

- `baselineVersion`;
- `source`;
- `externalIoOccurred`;
- `liveRuntimeAuthorized`;
- `runtimeServerWasUsed`;
- `happyPath`;
- `failures`.

Sources válidos:

- `synthetic_baseline`;
- `dev_provider_candidate`.

### 5.1 externalIoOccurred

Este flag es descriptivo, no comparativo.

El baseline sintético retorna false.

Un futuro harness DEV puede retornar true sin perder conformidad, porque el propósito del parity contract es comparar semántica observable, no fingir que un provider real funciona sin IO.

### 5.2 liveRuntimeAuthorized

Debe permanecer false.

Un candidato que declare true es rechazado con:

`activation_authority_present`

### 5.3 runtimeServerWasUsed

Debe permanecer false.

La paridad se ejecuta antes y separada del runtime público. Un candidato que declare uso de `runtime.server.ts` falla con:

`runtime_server_used`

## 6. Normalización segura

El observation model conserva únicamente campos útiles para paridad.

No transporta:

- signed upload token;
- signed download URL;
- `storageLocator`;
- `checksumSha256`;
- `objectPath`;
- bytes;
- filenames reales;
- PII;
- secrets.

El test de no filtración serializa la observación completa y bloquea esos identificadores.

## 7. Happy-path contract

### 7.1 Ruta y track

Debe ser:

- route `R7_RECLAMACION`;
- track `assisted`.

Deviation codes:

- `happy_route_mismatch`;
- `happy_track_mismatch`.

### 7.2 Case final

Debe terminar en:

- version `5`;
- stage `collecting_evidence`.

Deviation:

`happy_case_state_mismatch`

### 7.3 Event sequence

Secuencia exacta:

```text
CASE_CREATED
DATA_AUTHORIZATION_RECORDED
SERVICE_AGREEMENT_ACCEPTED
EVIDENCE_REQUESTED
EVIDENCE_ATTACHED
```

Además se verifica explícitamente que no exista `EVIDENCE_VERIFIED`.

Deviation:

`happy_event_sequence_mismatch`

### 7.4 Evidencia

Debe existir exactamente una evidencia normalizada:

- kind `statement`;
- legal data category `financial_credit_semiprivate`;
- security tier `restricted`;
- lifecycle `active`.

Deviation:

`happy_evidence_mismatch`

### 7.5 HTTP

Contrato exacto:

- prepare 200;
- complete 200;
- download 200.

Deviation:

`happy_http_mismatch`

### 7.6 Audit

Orden exacto:

1. `evidence.prepare` 200;
2. `evidence.complete` 200;
3. `evidence.download` 200.

Deviation:

`happy_audit_mismatch`

### 7.7 Safety boundaries

Deben permanecer:

- `clientClassificationWasOverridden = true`;
- `technicalInspectionDidNotCreateEvidenceVerifiedEvent = true`;
- `rawStorageLocatorExposedInCaseReadModel = false`;
- `checksumExposedInCaseReadModel = false`.

Deviation:

`happy_safety_boundary_mismatch`

## 8. Failure matrix completeness

Deben existir exactamente estos cinco escenarios, sin omisiones ni adicionales:

1. `unauthenticated_prepare`;
2. `missing_data_authorization`;
3. `cross_case_access`;
4. `missing_uploaded_object`;
5. `rate_limit_unavailable`.

Deviation:

`failure_scenario_set_mismatch`

## 9. Cinco checks por failure scenario

Para cada escenario se ejecutan cinco verificaciones.

### 9.1 Public contract

Compara:

- operación que falla;
- HTTP status;
- error code público.

Deviation:

`failure_public_contract_mismatch`

### 9.2 Case State

Compara:

- versión final;
- stage final;
- event sequence.

Deviation:

`failure_case_state_mismatch`

### 9.3 Persistence / sanitization

Exige:

- evidence count = 0;
- `noEvidencePersisted = true`;
- `noEvidenceAttachedEvent = true`;
- `caseVersionUnchangedByRejectedOperation = true`;
- `publicErrorSanitized = true`.

Deviation:

`failure_persistence_boundary_mismatch`

### 9.4 Registry / Storage touch

Compara:

- upload intent status;
- registry registrations;
- signed upload grant calls;
- object inspection calls.

Deviation:

`failure_storage_touch_mismatch`

Esta verificación es especialmente importante porque distingue un error público correcto de una implementación insegura que ya tocó infraestructura privilegiada antes de autorizar.

### 9.5 Audit

Compara la secuencia completa de audit operations del escenario.

Deviation:

`failure_audit_mismatch`

## 10. Matriz canónica resumida

| Escenario | HTTP | Error | Version | Registry | Grant | Inspect | Intent |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| unauthenticated_prepare | 401 | authentication_required | 4 | 0 | 0 | 0 | null |
| missing_data_authorization | 409 | data_authorization_required | 3 | 0 | 0 | 0 | null |
| cross_case_access | 403 | forbidden | 4 | 0 | 0 | 0 | null |
| missing_uploaded_object | prepare 200 / complete 404 | evidence_not_found | 4 | 1 | 1 | 1 | quarantine |
| rate_limit_unavailable | 503 | rate_limit_unavailable | 4 | 0 | 0 | 0 | null |

Todos terminan con:

- stage `draft`;
- evidence count `0`;
- no `EVIDENCE_ATTACHED` causado por la operación rechazada.

## 11. Conteo de checks

Total inicial: **37**.

Distribución:

- 3 globales;
- 8 happy-path;
- 1 completitud de failure matrix;
- 25 failure checks (5 × 5).

Un baseline sintético correcto debe producir:

- `state = conformant`;
- `conformsToBaseline = true`;
- `totalChecks = 37`;
- `passedChecks = 37`;
- `deviations = []`.

## 12. Decision model

`EvidenceRuntimeParityDecision` contiene:

- state;
- boolean de conformidad;
- baseline version;
- total/passed checks;
- deviations;
- `runtimeActivationAuthorized: false`;
- `activationDecisionEvaluated: false`.

Los dos últimos flags son literales de tipo `false`, no simples valores convencionales.

## 13. Assertion gate

`assertEvidenceRuntimeParity(observation)`:

- retorna la decisión cuando es conformante;
- lanza `EvidenceRuntimeParityError` cuando existe drift.

Error code estable:

`runtime_parity_failed`

El error no incluye payloads provider-specific.

## 14. Casos adversariales del parity contract

Los tests de V0.23.19 modifican deliberadamente observaciones para demostrar que el evaluator detecta:

- aparición de `EVIDENCE_VERIFIED`;
- evidencia persistida después de un complete fallido;
- `EVIDENCE_ATTACHED` después de rechazo;
- contacto con registry/Storage antes de ownership;
- drift de 401/authentication_required a 500/provider_error;
- omisión de rate-limit failure;
- intento de declarar autoridad live;
- uso de runtime público.

## 15. Determinismo

Dos capturas consecutivas del baseline sintético deben ser exactamente iguales.

Esto habilita comparación futura sin tolerancias ambiguas ni timestamps variables en el observation model.

## 16. Integración futura con DEV

El futuro harness DEV deberá:

1. ejecutar el mismo journey R7 asistido contra providers DEV;
2. ejecutar los mismos cinco failures;
3. producir `EvidenceRuntimeParityObservation` sin secretos;
4. marcar `source = dev_provider_candidate`;
5. marcar `externalIoOccurred = true` cuando corresponda;
6. mantener `liveRuntimeAuthorized = false`;
7. mantener `runtimeServerWasUsed = false`;
8. pasar `assertEvidenceRuntimeParity`.

Solo después puede ese resultado convertirse en evidencia para el requisito de provider verification de otro gate.

## 17. Lo que NO hace V0.23.19

No:

- crea el harness DEV;
- crea Supabase DEV;
- configura Auth;
- aplica migrations;
- implementa Storage gateway live;
- configura service role secrets;
- valida RLS live;
- valida signed grants live;
- valida deletion worker live;
- valida distributed rate limiting;
- evalúa activation facts;
- modifica `runtime.server.ts`;
- invoca `createActivatedEvidenceRuntime`.

## 18. Relación con activation preflight

El activation preflight V0.23.12 exige 15 requisitos de environment, identity, persistence, storage, boundary y product.

V0.23.19 no sustituye ninguno.

Una futura arquitectura puede usar un parity PASS como evidencia de comportamiento para ciertos requisitos, pero el evaluator de paridad no tiene autoridad para marcarlos `verified`.

Ese vínculo deberá ser explícito en un slice posterior y solo después de un DEV real.

## 19. Separación de archivos runtime

El test de aislamiento inspecciona el source de `runtime-parity-contract.ts` y exige ausencia de:

- import de `./runtime.server`;
- `createActivatedEvidenceRuntime`;
- `verifiedEvidenceRuntimeActivationFacts`;
- `assertEvidenceRuntimeActivationAllowed`.

Esto protege la frontera de compilación además de la semántica del decision model.

## 20. Criterio de aceptación V0.23.19

El slice es funcionalmente aceptable cuando:

1. el baseline sintético pasa 37/37;
2. todos los adversarial parity tests detectan drift;
3. TypeScript PASS;
4. Domain tests PASS;
5. Build PASS;
6. Playwright público permanece 244/244 PASS;
7. `runtime.server.ts` permanece sin cambios;
8. no ocurre IO externo por el slice;
9. no se muta infraestructura Supabase.

Después se aplica el protocolo estándar de STATUS → freeze CI → draft stacked PR → PR CI → freeze comment.
