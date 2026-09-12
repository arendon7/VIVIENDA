# V0.23.27 · Qualified DEV Provider Composition Contract

## Objetivo

Ensamblar los contratos congelados V0.23.21–V0.23.26 en una composición DEV única, certificable y fail-closed, sin crear un runtime público alternativo ni realizar provider I/O real durante las pruebas.

## Versión

`V0.23.27-QUALIFIED-DEV-PROVIDER-COMPOSITION-V1`

Implementación:

`server/evidence-api/qualified-dev-provider-composition.ts`

Tests:

`server/evidence-api/qualified-dev-provider-composition.test.ts`

## Gate de construcción

`createQualifiedDevProviderComposition` falla antes de cualquier I/O si no se cumple simultáneamente:

```text
projectLabel=vivienda-dev
state=qualified_for_staging_candidate
devEnvironmentVerified=true
liveRuntimeAuthorized=false
totalRequirementCount=14
verifiedRequirementCount=14
blockers.length=0
requirements.length=14
all requirements.status=verified
```

Evidence API origin debe ser HTTPS puro, sin credentials/path/query/hash adicionales.

## Transportes provider-candidate

### QualifiedDevAuthTransport

Implementa `SupabaseProviderCandidateAuthTransport`.

Contrato:

```text
channel=supabase_auth
projectLabel=vivienda-dev
syntheticOnly=true
liveRuntimeAuthorized=false
```

No emite JWT por sí mismo. Invoca un `QualifiedDevAuthSessionPort` inyectado y le entrega el `expectedSubjectRef` derivado del lease.

### QualifiedDevHttpTransport

Implementa `SupabaseProviderCandidateHttpTransport`.

Solo permite POST same-origin sobre:

```text
/api/v1/cases/{caseId}/evidence/uploads
/api/v1/cases/{caseId}/evidence/uploads/{intentId}/complete
/api/v1/cases/{caseId}/evidence/{evidenceId}/download
```

No permite origin distinto, query/hash ni rutas arbitrarias.

Las validaciones se expresan como Promise rejections para mantener semántica consistente con el transport asíncrono.

### QualifiedDevStorageTransport

Implementa `SupabaseProviderCandidateStorageTransport`.

Exige:

```text
bucket=vivienda-evidence
path=quarantine/upl_<lease.namespace>_.../evd_.../obj_...
contentType=application/pdf
byteSize=2048
upsert=false
signedCapability non-empty
```

Un path de otro namespace es rechazado antes del adapter provider.

## Trusted server probe context

`QualifiedDevProbeServerContextPort` es un control plane server-only, no un valor del navegador.

Debe declarar:

```text
channel=server_probe_context
projectLabel=vivienda-dev
syntheticOnly=true
liveRuntimeAuthorized=false
publicRequestDerived=false
```

La composición rechaza cualquier implementación que no cumpla esa identidad.

El port resuelve fixture lease para:

- Storage upload grant / inspection;
- audit requestId + operation;
- rate-limit operation + key.

## Instrumented Storage Gateway

`QualifiedDevInstrumentedStorageGateway` envuelve un `EvidenceStorageGateway` real/injectable.

Upload grant e inspection siguen el orden:

```text
validate objectPath
resolve trusted lease
verify path belongs to lease namespace
execute delegate
record support telemetry
```

Si context/path no es válido, el delegate no recibe I/O.

Download/delete conservan la semántica del gateway canónico y no fabrican counters adicionales.

## Instrumented Audit

`QualifiedDevInstrumentedAuditLogPort`:

1. resuelve el fixture por context server-only;
2. ejecuta el audit delegate;
3. solo tras éxito registra el evento V0.23.26.

La telemetría contiene exclusivamente operation/status/errorCode sanitizado.

## Instrumented Rate Limit

`QualifiedDevInstrumentedRateLimitPort` resuelve el lease antes del delegate.

Caso especial único:

```text
scope=rate_limit_unavailable
operation=evidence.prepare
```

Entonces intenta consumir `vivienda_dev_probe_fault_consume`. Si retorna true, produce `{kind:"unavailable"}` y no consume el limiter normal en esa llamada.

Para cualquier otro caso delega al limiter real sin mutar su decisión.

## Composition graph

```text
14/14 qualification
        |
        v
SupabaseDevProbeSupportRpc
        |------------------ telemetry recorder
        |------------------ rate-limit fault consumer
        |
        +--> probe-aware fixture admin
                |
                v
        provider fixture lifecycle
                |
                v
        fixture session

Auth transport -----\
HTTP transport ------\
Storage transport ----> Execution Driver V0.23.25
State transport ------/
Observability --------/
Fault transport ------/
                |
                v
        Probe Adapter V0.23.24

Server candidate host receives separately:
  instrumented StorageGateway
  instrumented AuditLogPort
  instrumented RateLimitPort
```

## Error codes

Composition boundary:

```text
invalid_configuration
dev_environment_unqualified
invalid_input
context_unavailable
instrumentation_failure
```

No se propaga provider detail en los mensajes de este boundary.

## Tests

La suite prueba:

- construcción exacta con 14/14;
- rechazo de qualification incompleta antes de provider I/O;
- project label/origin inválidos;
- rechazo de context derivable del request público;
- binding owner/intruder → expected subjectRef;
- allowlist exacto de HTTP same-origin;
- signed upload 2048 bytes y path fixture-owned;
- Storage telemetry derivada de calls reales;
- foreign fixture Storage path bloqueado antes del delegate;
- audit telemetry después del delegate;
- one-shot rate-limit unavailable sin tocar limiter normal;
- delegación normal del limiter;
- cleanup probe-aware con support residue;
- missing trusted context fail-closed;
- ausencia de env, keys, Supabase URLs, provider SDK y runtime activation imports.

## Lo que no demuestra

V0.23.27 no demuestra:

- existencia real de `vivienda-dev`;
- qualification 14/14 observada en proveedor;
- Support SQL aplicado;
- Auth session/JWT real;
- HTTP endpoint real desplegado;
- signed upload real;
- provider observability real;
- provider parity 37/37 live;
- activation o deployment.

## Separación de autoridad

**Composition Contract PASS ≠ Provider Host PASS ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Próximo slice recomendado

V0.23.28 · **Qualified DEV Candidate Evidence API Host Contract**.

Debe ensamblar, todavía offline/injected:

- principal/session resolution del candidato;
- canonical `CasePersistenceService`;
- `EvidenceStorageCoordinator`/application boundary;
- `EvidenceHttpApi`;
- request context;
- wrappers Storage/Audit/RateLimit V0.23.27;
- routing aislado de las tres rutas canónicas.

Debe seguir sin modificar ni importar `runtime.server.ts` y no debe producir activation facts.
