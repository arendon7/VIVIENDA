# V0.23.25 · Supabase Provider Candidate Execution Driver

## Objetivo

Traducir el execution port V0.23.24 a canales de transporte concretos y testeables sin conectar un proyecto Supabase real ni modificar el runtime público.

## Versión

`V0.23.25-SUPABASE-PROVIDER-EXECUTION-DRIVER-V1`

Implementación:

`server/evidence-api/supabase-provider-candidate-execution-driver.ts`

## Superficie

`SupabaseProviderCandidateExecutionDriver` implementa `SupabaseProviderCandidateProbeExecutionPort` y declara:

```text
provider=supabase
projectLabel=vivienda-dev
syntheticOnly=true
externalIoOccurred=true
liveRuntimeAuthorized=false
runtimeServerWasUsed=false
```

## Transportes

### Auth

`SupabaseProviderCandidateAuthTransport`

- canal: `supabase_auth`;
- emite access token para owner/intruder;
- subjectRef devuelto debe coincidir exactamente con el lease;
- anonymous no toca este transporte.

### Evidence API HTTP

`SupabaseProviderCandidateHttpTransport`

- canal: `evidence_api`;
- solo POST;
- origin HTTPS inyectado;
- `Content-Type: application/json`;
- `Accept: application/json`;
- mismo Origin;
- Bearer solo cuando existe actor autenticado.

Rutas permitidas por construcción:

```text
/api/v1/cases/{caseId}/evidence/uploads
/api/v1/cases/{caseId}/evidence/uploads/{intentId}/complete
/api/v1/cases/{caseId}/evidence/{evidenceId}/download
```

### Storage

`SupabaseProviderCandidateStorageTransport`

- canal: `supabase_storage`;
- bucket exacto `vivienda-evidence`;
- signed capability opaca del prepare;
- `application/pdf`;
- `upsert=false`;
- bytes sintéticos únicamente.

### State

`SupabaseProviderCandidateStateTransport`

- canal: `supabase_state`;
- seed determinista R7;
- read Case;
- read intent;
- no se expone como API pública.

### Observability

`SupabaseProviderCandidateObservabilityTransport`

- canal: `supabase_observability`;
- envelope completo con identidad fixture/namespace/scope;
- fuente exacta `supabase_dev_observability`;
- timestamp válido;
- contadores no negativos;
- auditoría restringida a prepare/complete/download.

### Fault control

`SupabaseProviderCandidateParityFaultTransport`

- canal: `parity_fault_control`;
- `parityOnly=true`;
- arm one-shot de `rate_limit_unavailable` para `evidence.prepare`;
- receipt exacto fixture + namespace;
- disarm obligatorio;
- nunca viaja como header/body del Evidence API.

## Actor/fault binding

El driver no depende únicamente de que V0.23.24 sea correcto. Antes de cualquier transporte valida:

| Scope | Actor | Fault |
|---|---|---|
| happy_path | owner | null |
| unauthenticated_prepare | anonymous | null |
| missing_data_authorization | owner | null |
| cross_case_access | intruder | null |
| missing_uploaded_object | owner | null |
| rate_limit_unavailable | owner | rate_limit_unavailable |

Cualquier otra combinación produce `invalid_input` sin tocar Auth, HTTP ni fault-control.

## Seed contract

El state transport recibe un spec fijo:

```text
ownerSubjectRef = lease.ownerSubjectRef
routeCode = R7_RECLAMACION
caseTrack = assisted
evidenceRequestCode = R7_STATEMENT_DIFFERENCE
authorizeData = true|false
```

El driver exige:

- caseId `case_<namespace>_...`;
- version 4 si authorizeData=true;
- version 3 si authorizeData=false.

## Prepare parsing

Un prepare HTTP 200 solo es aceptado si contiene:

```text
data.intentId
data.evidenceId
data.upload.bucketId = vivienda-evidence
data.upload.objectPath = quarantine/<intent>/<evidence>/<obj>
data.upload.token = opaque capability
data.upload.upsert = false
```

Intent y path deben pertenecer al namespace del lease.

Para status distinto de 200 el driver conserva status/body y devuelve `data=null`; la evaluación del error corresponde al probe adapter/parity contract.

## Synthetic PDF

El upload usa exactamente 2048 bytes:

- encabezado `%PDF-1.4`;
- marcador `synthetic-only`;
- fixtureId y namespace;
- terminador `%%EOF`;
- padding determinista;
- sin PII ni contenido de usuario.

Solo 2xx se acepta como upload válido.

## Complete

Requiere:

- owner;
- case/intent ligados al namespace;
- expectedVersion entero positivo;
- idempotency key no vacía, <= 200 y sin caracteres de control.

Envía `{ expectedVersion }` al endpoint canónico con `idempotency-key`.

## Download

Requiere:

- owner;
- case ligado al namespace;
- evidenceId válido;
- TTL exacto de 60 segundos.

## State reads

### Case

Se valida:

- caseId exacto solicitado;
- ownerSubjectRef exacto del lease;
- version segura positiva;
- stage/route/track strings;
- arrays de events/evidence;
- publicReadModel serializable.

V0.23.24 vuelve a realizar las comprobaciones de paridad y leakage.

### Intent

Si existe debe coincidir con:

- caseId;
- intentId;
- namespace;
- status `quarantine|finalized|expired`.

## Telemetry envelope

La fuente provider debe entregar:

```text
source=supabase_dev_observability
observationId=obs_...
fixtureId=<lease.fixtureId>
namespace=<lease.namespace>
scope=<lease.scope>
observedAt=<ISO timestamp>
complete=true
registryRegistrations=N
storageUploadGrantCalls=N
storageInspectionCalls=N
auditOperations=[...]
```

Solo después de validar ese envelope el driver produce `SupabaseProviderProbeTelemetry`.

## Fault lifecycle

Para `rate_limit_unavailable`:

1. validar scope/actor/fault;
2. arm one-shot;
3. validar receipt;
4. ejecutar prepare público sin header de fault;
5. disarm aun si HTTP falla;
6. si disarm falla, `fault_cleanup_failed`.

Esto evita dejar una perturbación DEV activa para el siguiente fixture.

## Error contract

```text
invalid_configuration
invalid_input
invalid_transport_response
transport_failure
fault_cleanup_failed
```

Mensaje estable:

`Supabase provider candidate execution driver failed.`

Nunca se propaga detalle bruto de un transporte.

## Tests V0.23.25

La suite cubre:

- versión y cero activation facts;
- seed R7 exacto;
- rechazo de seed version incorrecta;
- owner JWT + prepare mapping;
- anonymous sin Auth;
- signed upload parsing;
- PDF 2048 bytes;
- complete/download paths;
- state/telemetry fixture binding;
- Auth subject tampered;
- telemetry fixture tampered;
- malformed bucket/upsert;
- one-shot fault + disarm;
- disarm tras HTTP throw;
- scope/fault mismatch bloqueado antes de I/O;
- scope/actor mismatch bloqueado antes de I/O;
- aislamiento de env/secrets/runtime activation.

## Lo que este slice no prueba

Los fakes demuestran el contrato del driver, no que:

- exista `vivienda-dev`;
- el proyecto tenga migraciones aplicadas;
- Auth emita JWT reales;
- Storage acepte el upload;
- observability produzca los contadores;
- fault-control exista;
- provider parity live sea PASS.

## Próxima brecha

V0.23.26 debe crear el **Supabase DEV Probe Support Plane Contract** para state/observability/fault-control, reutilizando donde corresponda los adapters Supabase existentes y manteniendo cualquier soporte destructivo/parity-only fuera del runtime público y sin aplicar SQL a infraestructura real.
