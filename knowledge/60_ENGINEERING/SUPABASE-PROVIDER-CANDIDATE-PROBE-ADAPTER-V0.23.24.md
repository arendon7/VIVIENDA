# Supabase Provider Candidate Probe Adapter · V0.23.24

## Objetivo

Traducir los seis probes canónicos V0.23.20 a una orquestación Supabase provider-candidate que construya observaciones V0.23.19 desde acciones y lecturas independientes, sin provider I/O real durante el slice.

## Dependencias

- V0.23.14 · DEV qualification 14/14.
- V0.23.19 · Runtime Parity Contract (37 checks).
- V0.23.20 · Provider Candidate Parity Harness.
- V0.23.21 · Fixture Lifecycle.
- V0.23.22 · Supabase Fixture Lifecycle Adapter.
- V0.23.23 · Supabase DEV Fixture Admin Control Plane.

## Archivo principal

`server/evidence-api/supabase-provider-candidate-probe-adapter.ts`

Exports principales:

- `SupabaseProviderCandidateProbeAdapter`
- `SupabaseProviderCandidateProbeExecutionPort`
- tipos de seed, HTTP result, prepared upload, Case snapshot, intent snapshot y telemetry
- `SupabaseProviderCandidateProbeAdapterError`
- `SUPABASE_PROVIDER_CANDIDATE_PROBE_ADAPTER_VERSION`
- `supabaseProviderCandidateProbeAdapterProducesNoActivationFacts()`

## Construction invariants

Execution port requerido:

```text
provider = supabase
projectLabel = vivienda-dev
syntheticOnly = true
externalIoOccurred = true
liveRuntimeAuthorized = false
runtimeServerWasUsed = false
```

El adapter expone `externalIoOccurred=true`, `liveRuntimeAuthorized=false` y `runtimeServerWasUsed=false` como invariantes propios después de validar el execution port.

La afirmación `externalIoOccurred=true` es un requisito del futuro driver provider-candidate. Un fake unitario puede modelarla para probar la lógica, pero no produce evidencia live.

## Granular execution port

```text
seedCase
prepareEvidence
uploadSyntheticPdf
completeEvidence
downloadEvidence
readCase
readIntent
readTelemetry
```

No hay retorno de parity decision ni parity observation completa.

## Fixture binding

El adapter trabaja siempre dentro de `ProviderCandidateFixtureSession.run(scope, ...)`.

Validaciones relevantes:

```text
caseId startsWith case_<namespace>_
ownerSubjectRef == lease.ownerSubjectRef
intentId startsWith upl_<namespace>_
objectPath == quarantine/<intent>/<evidence>/<obj_*>
telemetry.fixtureId == lease.fixtureId
telemetry.namespace == lease.namespace
```

Esto evita mezclar observaciones entre probes aunque el execution driver devuelva estado de otro namespace.

## Happy path sequence

```text
fixture allocate
→ seedCase(authorizeData=true)
→ prepareEvidence(owner, weak browser classification)
→ validate prepared upload
→ uploadSyntheticPdf(2048 B, application/pdf)
→ completeEvidence(owner, expectedVersion)
→ downloadEvidence(owner, 60 s)
→ readCase(owner) + readTelemetry
→ derive happy observation
→ fixture cleanup + residue verification
```

La clasificación browser enviada intencionalmente es:

```text
kind=statement
legalDataCategory=non_personal
securityTier=open
```

La observación final solo pasa paridad si el servidor la eleva al baseline `financial_credit_semiprivate/restricted`.

## Failure sequence

### unauthenticated_prepare

- seed autorizado;
- prepare actor `anonymous`;
- no fault injection.

### missing_data_authorization

- seed `authorizeData=false`;
- prepare actor owner.

### cross_case_access

- seed autorizado;
- prepare actor intruder.

### missing_uploaded_object

- seed autorizado;
- prepare owner;
- valida prepared upload;
- **no llama** `uploadSyntheticPdf`;
- llama complete directamente;
- lee intent residual.

### rate_limit_unavailable

- seed autorizado;
- prepare owner;
- único scope que recibe `fault=rate_limit_unavailable`.

## Observation derivation

### Case

El execution driver devuelve snapshot granular:

```text
caseId
ownerSubjectRef
routeCode
caseTrack
version
stage
eventSequence
evidence[]
publicReadModel
```

El adapter valida identidad estructural pero no normaliza valores de negocio. V0.23.19 decide si route, track, stage, events o evidence son conformes.

### Intent

Para `missing_uploaded_object`, el adapter puede leer:

```text
intentId
caseId
status = quarantine|finalized|expired
```

Un intent ausente se conserva como `null`; el evaluator lo convierte en desviación de paridad en vez de inventar estado.

### Telemetry

```text
fixtureId
namespace
registryRegistrations
storageUploadGrantCalls
storageInspectionCalls
auditOperations[]
```

Contadores: enteros seguros >= 0.

Audit operations permitidas:

- `evidence.prepare`
- `evidence.complete`
- `evidence.download`

HTTP statuses: 100–599.

## Public leakage detection

### Failure body

Se serializa el body observado y se busca material prohibido. La detección es fail-closed ante payload no serializable.

Se marcan como fuga términos relacionados con:

- Storage locator/path;
- upload token/capability;
- checksum;
- service role;
- `quarantine/`;
- `obj_*`.

El adapter no limpia el body y después declara éxito. Marca `publicErrorSanitized=false`, permitiendo que V0.23.19 falle.

### Public Case read model

También se serializa el `publicReadModel` real y se derivan localmente:

```text
rawStorageLocatorExposedInCaseReadModel
checksumExposedInCaseReadModel
```

No se aceptan estos flags desde el provider.

## Frozen literal-type bridge

V0.23.19 tipa algunos valores happy-path como literales mientras los revisa dinámicamente en runtime. V0.23.24 mantiene esos valores observados como `string/boolean` durante la captura y solo castea el objeto final al tipo congelado.

No se modifica el dato. Ejemplo: si `routeCode` observado fuera distinto de R7, el cast no lo convierte en R7; el evaluator recibe el string real y reporta `happy_route_mismatch`.

## Error semantics

Adapter errors:

```text
invalid_configuration
invalid_provider_response
probe_execution_failed
```

La lifecycle garantiza cleanup incluso cuando el callback del probe lanza error.

Luego V0.23.20 sanitiza la excepción hacia `ProviderCandidateParityHarnessError` y detiene la certificación antes del evaluator cuando el probe no puede producir una observación estructuralmente fiable.

## Tests

Archivos:

- `server/evidence-api/supabase-provider-candidate-probe-adapter.test.ts`
- `server/evidence-api/supabase-provider-candidate-probe-external-io.test.ts`

Cobertura principal:

1. versión del adapter;
2. certificación canónica 37/37 con los seis probes;
3. orden exacto de probes;
4. seis fixtures/namespace únicos;
5. cleanup después de cada probe;
6. actor correcto por escenario;
7. fault rate-limit solo en su scope;
8. DEV no calificado bloquea antes de execution I/O;
9. intent/path foreign bloquea y cleanup ocurre;
10. Case owner tampered bloquea;
11. fuga `service_role` no se oculta;
12. execution exception queda sanitizada por harness;
13. read-model leakage se deriva localmente;
14. runtime authority inválida bloquea construcción;
15. external IO false bloquea construcción;
16. cero activation facts/imports de runtime/credentials.

## CI discoveries

Durante el slice, TypeScript expuso que V0.23.19 usa tipos literales para campos que su evaluator permite observar como desviaciones. Se resolvió solo en la frontera V0.23.24 mediante cast de la observación runtime, sin alterar el contrato padre.

## Siguiente slice recomendado

V0.23.25 · **Supabase Provider Candidate Execution Driver Contract**.

Debe implementar la traducción del execution port hacia:

- setup del Case sintético;
- sesiones/JWT owner e intruder;
- Evidence API requests;
- upload físico usando grant;
- introspección Case/intent;
- telemetría/auditoría provider-verificable;
- fault injection de rate limiter estrictamente parity-only.

El driver debe seguir testeándose con transports falsos. El wiring real con URL/key/project ref seguirá separado hasta que exista `vivienda-dev` autorizado y V0.23.14 14/14 observado realmente.

## No autoridad

**Probe Adapter PASS no equivale a provider parity real.**

V0.23.24 no crea infraestructura, no llama Supabase, no aplica SQL, no usa secrets y no habilita runtime o deployment.
