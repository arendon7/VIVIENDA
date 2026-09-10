# ADR-0020 · Supabase Provider Candidate Probe Adapter

- **Estado:** Accepted for V0.23.24
- **Fecha:** 2026-09-10
- **Padre:** V0.23.23 · Supabase DEV Fixture Admin Control Plane

## Contexto

V0.23.20 congeló un harness que sabe ejecutar seis probes y evaluar su observación contra las 37 exigencias de V0.23.19. V0.23.21–23 construyeron el lifecycle de fixtures y el control plane Supabase DEV, pero aún faltaba una frontera que tradujera cada probe en operaciones observables del candidato.

El riesgo era implementar un driver que devolviera directamente una observación de paridad ya construida. Ese diseño permitiría que la misma capa que ejecuta el candidato también se auto-certificara, sin separar suficientemente:

- acciones HTTP/provider;
- estado final del Case;
- estado del upload intent;
- telemetría registry/Storage;
- auditoría;
- sanitización del error público.

## Decisión

Se introduce `SupabaseProviderCandidateProbeAdapter`, implementación de `EvidenceRuntimeProviderCandidateProbe` que **orquesta** los seis probes V0.23.20 y deriva las observaciones V0.23.19 a partir de primitivas independientes.

El adapter depende de:

1. `ProviderCandidateFixtureSession` — aislamiento, single-use y cleanup V0.23.21/22;
2. `SupabaseProviderCandidateProbeExecutionPort` — ejecución/lectura granular del futuro candidato Supabase DEV.

El execution port no puede devolver `EvidenceRuntimeParityObservation`, `EvidenceRuntimeHappyPathObservation` ni una decisión de conformidad. Solo puede ejecutar acciones y devolver estados/telemetría de bajo nivel.

## Provider-candidate gate

El adapter solo se construye si el execution port declara exactamente:

- `provider = supabase`;
- `projectLabel = vivienda-dev`;
- `syntheticOnly = true`;
- `externalIoOccurred = true`;
- `liveRuntimeAuthorized = false`;
- `runtimeServerWasUsed = false`.

`externalIoOccurred=true` separa explícitamente esta superficie de las rehearsals V0.23.17–18. La suite unitaria usa un fake que satisface el contrato, pero esa simulación no constituye evidencia provider live.

## Execution port granular

El port expone:

- `seedCase()`;
- `prepareEvidence()`;
- `uploadSyntheticPdf()`;
- `completeEvidence()`;
- `downloadEvidence()`;
- `readCase()`;
- `readIntent()`;
- `readTelemetry()`.

No existe método `captureParity`, `certify`, `evaluate` o equivalente.

## Scope binding

Todos los datos autoritativos del probe deben estar ligados al `ProviderCandidateFixtureLease`.

El adapter exige:

- `caseId` con prefijo `case_<namespace>_`;
- owner del Case igual a `lease.ownerSubjectRef`;
- `intentId` con prefijo `upl_<namespace>_`;
- path Storage exacto `quarantine/<intentId>/<evidenceId>/<obj_...>`;
- telemetría con `fixtureId` y `namespace` exactos.

Una inconsistencia estructural falla como `invalid_provider_response` y V0.23.21 ejecuta cleanup antes de propagar el error.

## Happy path

El adapter ejecuta:

1. seed R7 autorizado;
2. prepare como owner con clasificación browser deliberadamente débil (`non_personal/open`);
3. valida intent/evidence/path ligados al fixture;
4. sube un PDF sintético de 2048 bytes;
5. complete con expected version del seed;
6. download por 60 segundos;
7. lee Case final y telemetría independientemente;
8. deriva la observación happy-path.

No confía en flags provider para comprobar exposición de Storage/checksum. Serializa el `publicReadModel` y calcula esas fronteras localmente.

## Failure matrix

Los actores/faults se fijan en el adapter, no en el caller:

- `unauthenticated_prepare` → anonymous;
- `cross_case_access` → intruder;
- `missing_data_authorization` → owner, seed sin data authorization;
- `missing_uploaded_object` → owner, prepare sin upload y luego complete;
- `rate_limit_unavailable` → owner + fault explícito `rate_limit_unavailable`.

El fault de rate-limit solo puede emitirse en ese scope.

Después del rechazo, el adapter lee Case, telemetría y, cuando existe, upload intent. Con esos datos calcula las fronteras de persistencia y sanitización que V0.23.19 evalúa.

## Public-error and read-model inspection

El adapter no transforma una fuga en un error aparentemente limpio.

Para fallos, inspecciona el cuerpo público y marca `publicErrorSanitized=false` si encuentra material asociado a:

- storage locator/path;
- upload token/capability;
- checksum;
- service-role material;
- paths `quarantine/`;
- identificadores `obj_*`.

Para happy-path, inspecciona `publicReadModel` y deriva localmente:

- `rawStorageLocatorExposedInCaseReadModel`;
- `checksumExposedInCaseReadModel`.

La paridad queda `nonconformant` si se observa una fuga; el adapter no la oculta.

## Telemetry contract

`readTelemetry()` debe devolver:

- fixtureId;
- namespace;
- registryRegistrations;
- storageUploadGrantCalls;
- storageInspectionCalls;
- auditOperations.

Los contadores deben ser enteros seguros no negativos. Audit operations deben limitarse a prepare/complete/download y status HTTP válido.

## Error boundary

Errores del execution port nunca se propagan literalmente. El adapter expone únicamente:

- `invalid_configuration`;
- `invalid_provider_response`;
- `probe_execution_failed`.

V0.23.20 vuelve a encapsular cualquier excepción de probe como `ProviderCandidateParityHarnessError` con scope estable.

## Frozen V0.23.19 literal types

V0.23.19 tiene algunos campos de `EvidenceRuntimeHappyPathObservation` tipados como literales (`R7_RECLAMACION`, `assisted`, y dos flags `false`) aunque su evaluator runtime contiene checks para detectar valores distintos.

V0.23.24 no modifica ese contrato congelado. En la frontera final del happy observation usa un cast de tipo para conservar el valor runtime observado. El cast no reemplaza ni normaliza el dato: si el proveedor devuelve una desviación, el evaluator sigue recibiendo la desviación y puede marcarla.

## Separación de autoridad

V0.23.24:

- no crea cliente Supabase;
- no contiene URL/key/env;
- no importa `runtime.server`, `activated-runtime` ni `activation-preflight`;
- no produce activation facts;
- no autoriza deployment.

Regla:

**DEV 14/14 ≠ Admin Control Plane PASS ≠ Probe Adapter PASS ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Consecuencias

### Positivas

- los seis probes tienen una orquestación Supabase concreta;
- el provider no puede entregar directamente una certificación autocontenida;
- fixture identity/namespace se verifican en cada lectura crítica;
- las fugas públicas se detectan localmente;
- rate-limit fault queda scope-bound;
- una excepción mantiene cleanup por V0.23.21;
- el siguiente slice puede implementar el execution driver real sin cambiar el contrato de paridad.

### Costos

- falta el driver server-only que conecte estas primitivas a Evidence API/Supabase DEV;
- la telemetría necesita una fuente verificable en ese driver;
- la suite offline prueba el contrato, no constituye provider parity real.

## Fuera de alcance

- provider I/O real;
- provisioning/billing;
- aplicar SQL;
- secrets live;
- crear casos o Auth users reales;
- ejecutar paridad live;
- runtime público;
- STAGING/PROD;
- deployment o merge del stack.
