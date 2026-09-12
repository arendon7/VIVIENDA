# V0.23.26 · Supabase DEV Probe Support Plane

## Objetivo

Cerrar las brechas de state, observability, fault-control y cleanup necesarias para una futura composición provider-candidate en un proyecto Supabase DEV autorizado, sin aplicar SQL ni tocar el runtime público.

## Versión

`V0.23.26-SUPABASE-DEV-PROBE-SUPPORT-V1`

Implementación principal:

`server/evidence-api/supabase-dev-probe-support-plane.ts`

Cleanup decorator:

`server/evidence-api/supabase-dev-probe-aware-fixture-admin.ts`

SQL de soporte:

`supabase/dev-fixtures/V0.23.26_DEV_PROBE_SUPPORT.sql`

El SQL está deliberadamente fuera de `supabase/migrations`.

## State transport

`SupabaseDevProbeStateTransport` implementa el canal `supabase_state` de V0.23.25 reutilizando `CasePersistenceService` y un `CasePersistencePort` inyectado.

No existe un RPC paralelo para sembrar Case. El seed atraviesa el mismo dominio canónico que la aplicación.

Fixture canónico:

```text
routeCode=R7_RECLAMACION
caseTrack=assisted
evidenceRequestCode=R7_STATEMENT_DIFFERENCE
ownerSubjectRef=lease.ownerSubjectRef
```

Secuencia:

1. `CASE_CREATED`;
2. `DATA_AUTHORIZATION_RECORDED` cuando `authorizeData=true`;
3. `SERVICE_AGREEMENT_ACCEPTED`;
4. `EVIDENCE_REQUESTED`.

Versiones esperadas antes de la operación de evidencia:

```text
authorizeData=true  -> version 4
authorizeData=false -> version 3
```

IDs y clock se derivan únicamente del lease sintético.

## State reads

### Case

`readCase` usa `CasePersistenceService.readCase` y devuelve el snapshot requerido por V0.23.24:

- caseId;
- ownerSubjectRef;
- routeCode;
- caseTrack;
- version;
- stage;
- eventSequence;
- evidence classification/lifecycle;
- publicReadModel.

El public read model procede del dominio canónico y no reintroduce `storageLocator` ni `checksumSha256`.

### Intent

`readIntent` usa el persistence port canónico y exige:

- caseId fixture-scoped;
- intentId fixture-scoped;
- intent/case exactos;
- status `quarantine|finalized|expired`.

## DEV support RPC

`SupabaseDevProbeSupportRpc` requiere `projectLabel=vivienda-dev` y un cliente RPC inyectado. Nunca crea URL, key o cliente Supabase internamente.

RPCs definidos:

```text
vivienda_dev_probe_record_storage_touch
vivienda_dev_probe_record_audit
vivienda_dev_probe_observe
vivienda_dev_probe_fault_arm
vivienda_dev_probe_fault_consume
vivienda_dev_probe_fault_disarm
vivienda_dev_probe_support_residue
```

Todos los inputs quedan ligados a:

```text
fixtureId
namespace
scope
projectLabel=vivienda-dev
```

## Provider-verifiable observability

La observación solo se acepta si contiene:

```text
source=supabase_dev_observability
observationId=obs_...
fixtureId=<lease.fixtureId>
namespace=<lease.namespace>
scope=<lease.scope>
observedAt=<ISO timestamp>
complete=true
registryRegistrations>=0
storageUploadGrantCalls>=0
storageInspectionCalls>=0
auditOperations=[...]
```

`registryRegistrations` se deriva de `private.vivienda_evidence_objects`, no de un booleano declarado por el parity harness.

Los otros contadores y audit operations se almacenan en tablas DEV-only del support plane.

## Telemetry recorder

`SupabaseDevProbeTelemetryRecorder` expone seams server-only para registrar:

- upload grant;
- storage inspection;
- audit de `evidence.prepare`;
- audit de `evidence.complete`;
- audit de `evidence.download`.

V0.23.26 no los conecta todavía a StorageGateway/AuditLog del runtime. Ese wiring pertenece a la composición DEV posterior.

## Fault control

`SupabaseDevProbeParityFaultTransport` implementa el canal `parity_fault_control` y solo permite:

```text
scope=rate_limit_unavailable
operation=evidence.prepare
mode=rate_limit_unavailable_once
oneShot=true
```

El SQL mantiene receipt fixture-bound e impide más de un fault activo equivalente.

`vivienda_dev_probe_fault_consume` usa locking para que un fault se consuma como máximo una vez.

`SupabaseDevProbeRateLimitFaultConsumer` es el seam previsto para un futuro wrapper DEV del `ApiRateLimitPort`; todavía no está cableado al runtime público.

## SQL DEV-only

Tablas:

```text
private.vivienda_dev_probe_metrics
private.vivienda_dev_probe_audit
private.vivienda_dev_probe_faults
```

Reglas:

- RLS habilitado;
- sin grants a `public`, `anon` o `authenticated`;
- RPCs service-role-only;
- funciones `security invoker`;
- proyecto exacto `vivienda-dev`;
- fixture/namespace/scope validados en SQL.

El archivo redefine los RPC V0.23.22 `vivienda_dev_fixture_purge` y `vivienda_dev_fixture_residue` con la misma firma para incorporar el cleanup del support plane cuando, y solo cuando, ese SQL sea aplicado expresamente en DEV.

## Cleanup fail-closed

Los contratos V0.23.21/V0.23.22 no exponen un flag `supportResidueAbsent`. Para no reabrir contratos congelados se introduce `SupabaseDevProbeAwareFixtureAdmin`.

El decorator:

1. delega operaciones normales al admin V0.23.23;
2. consulta `vivienda_dev_probe_support_residue`;
3. valida `supportRows` como entero no negativo;
4. suma `supportRows` al `caseRows` del reporte interno.

Por tanto, el `caseResidueAbsent` existente solo queda true cuando no existe ni Case residue ni support-plane residue.

Si el RPC falta, falla o devuelve shape inválido, cleanup falla cerrado.

## Error boundary

Support plane:

```text
invalid_configuration
invalid_input
provider_error
invalid_provider_response
```

Cleanup decorator:

```text
invalid_configuration
provider_error
invalid_provider_response
```

Los mensajes son estables y no propagan diagnósticos provider.

## Tests

La suite cubre:

- versión y cero activation facts;
- seed R7 con y sin autorización;
- state read canónico;
- intent fixture-bound;
- telemetry recorder exacto;
- envelope observability fixture-bound;
- rechazo de telemetry foreign;
- one-shot fault arm/consume/disarm;
- rechazo de faults fuera de scope;
- errores provider sanitizados;
- SQL ubicado fuera de migrations;
- grants/revokes service-role-only;
- ausencia de env/secrets/URLs Supabase embebidas;
- ausencia de import de runtime activation;
- cleanup con support residue cero;
- cleanup con support residue positivo;
- cleanup fail-closed si el support RPC no existe o es inválido.

## Qué este slice no demuestra

Los tests offline no prueban que:

- exista un proyecto `vivienda-dev`;
- V0.23.14 esté observado realmente 14/14;
- el SQL compile/ejecute en PostgreSQL real;
- el SQL haya sido aplicado;
- los RPC existan en Supabase;
- Storage/Audit/RateLimit estén instrumentados live;
- Auth/JWT/HTTP/Storage transport real funcione;
- provider parity live sea PASS.

## Separación de autoridad

**Support Plane PASS ≠ Support SQL Applied ≠ Provider Composition PASS ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

No hay provisioning, billing, secrets live, SQL aplicado, migración live, datos reales, STAGING/PROD, merge ni deployment.

## Próxima brecha

V0.23.27 debe construir la **Qualified DEV Provider Composition Contract**:

- ensamblar execution driver + fixture lifecycle + support plane;
- definir adapters inyectados para Auth/session, HTTP y Storage;
- envolver Storage/Audit/RateLimit con telemetry/fault seams V0.23.26;
- mantener `runtime.server.ts` fail-closed;
- exigir qualification V0.23.14 antes de construir la composición;
- seguir offline/fake hasta autorización explícita de un DEV real.
