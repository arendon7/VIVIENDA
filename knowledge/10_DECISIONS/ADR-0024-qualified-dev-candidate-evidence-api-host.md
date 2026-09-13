# ADR-0024 · Qualified DEV Candidate Evidence API Host

- Estado: **accepted for candidate validation**
- Slice: **V0.23.28**
- Parent freeze: **V0.23.27 `fdc467c9e60a92e07fc424066ab8dd3246a303d7`**
- Scope: synthetic-only Supabase DEV candidate

## Contexto

V0.23.27 cerró el composition root de transportes y wrappers DEV, pero todavía no existía un host aislado capaz de ejecutar las tres operaciones públicas de Evidence API contra dominio canónico sin usar `runtime.server.ts` ni convertir la composición candidata en runtime activado.

El candidato necesita ejecutar:

1. prepare upload;
2. complete upload;
3. download grant;

con la misma clasificación server-side, persistence boundary, Storage coordinator, rate limiting y audit boundary que la aplicación, pero bajo un lease sintético V0.23.21 entregado fuera del request público.

## Decisión

Se introduce `QualifiedDevCandidateEvidenceApiHost`.

El host:

- exige la composición V0.23.27;
- conserva `provider=supabase`, `projectLabel=vivienda-dev`, `syntheticOnly=true`;
- conserva `liveRuntimeAuthorized=false` y `runtimeServerWasUsed=false`;
- usa `CasePersistenceService` sobre el `CasePersistencePort` inyectado;
- usa `EvidenceStorageCoordinator`;
- envuelve el coordinator en `ServerClassifiedEvidenceApplication`;
- expone únicamente el routing candidate de los tres POST canónicos mediante `EvidenceHttpApi`;
- no importa ni modifica `runtime.server.ts`;
- no usa `activated-runtime.ts` ni `activation-preflight.ts`;
- no crea clientes Supabase, URL, keys, secrets ni SDKs.

## Lease fuera de banda

El fixture lease no puede viajar en header, query, body ni path público.

Por ello el host exige una invocación explícita:

```text
source = server_probe_harness
publicRequestDerived = false
lease = <ProviderCandidateFixtureLease>
```

La invocación se ejecuta dentro de `QualifiedDevCandidateProbeScopePort.run(lease, task)`.

Ese scope también implementa el trusted server context requerido por V0.23.27 para Storage, Audit y RateLimit.

La interfaz exige:

```text
scopeChannel = server_probe_scope
channel = server_probe_context
projectLabel = vivienda-dev
syntheticOnly = true
liveRuntimeAuthorized = false
publicRequestDerived = false
```

## Principal resolution

La identidad se resuelve mediante `QualifiedDevCandidatePrincipalResolverPort`.

El resolver debe declarar:

```text
channel = candidate_principal_resolver
projectLabel = vivienda-dev
syntheticOnly = true
publicFixtureSelectorsAccepted = false
```

El host acepta únicamente:

- `null` para la prueba anónima;
- client principal cuyo `subjectRef` sea exactamente owner o intruder del lease activo.

Cualquier principal externo al fixture falla antes de persistence/Storage authority.

## Routing

El host reconoce solamente:

```text
POST /api/v1/cases/{caseId}/evidence/uploads
POST /api/v1/cases/{caseId}/evidence/uploads/{intentId}/complete
POST /api/v1/cases/{caseId}/evidence/{evidenceId}/download
```

Origin distinto, query/hash o route no reconocida producen `candidate_route_not_found` y no entran al probe scope.

La validación HTTP fina —method, Content-Type, same-origin header, body, path identifiers, rate limit y errores públicos— permanece dentro de `EvidenceHttpApi`.

## IDs y coordenadas

Los IDs creados durante la invocación son namespace-scoped al fixture:

```text
<prefix>_<lease.namespace>_<opaque-token>
```

La reserva Storage es:

```text
quarantine/<intentId>/<evidenceId>/<storageLocator>
```

con `storageLocator` también ligado al namespace del fixture.

V0.23.27 vuelve a comprobar lease ↔ objectPath antes del provider Storage call.

## Clasificación

El browser/probe puede enviar una clasificación débil para demostrar la frontera de autoridad, pero `ServerClassifiedEvidenceApplication` sustituye esos campos usando el evidence kind conocido por el servidor.

Para `statement`:

```text
legalDataCategory = financial_credit_semiprivate
securityTier = restricted
```

Por tanto una entrada `non_personal/open` no alcanza persistence como autoridad.

## Fallos certificados offline

La suite V0.23.28 demuestra:

- happy path prepare → complete → download;
- unauthenticated prepare → 401 sanitizado;
- cross-case intruder → 403 antes de Storage grant;
- missing data authorization → 409 sin reserva física;
- missing uploaded object → 404 y intent continúa quarantine;
- one-shot rate-limit unavailable → 503 antes de principal/Storage;
- foreign origin/unknown route no entra al probe scope;
- lease público/tampered rechazado;
- principal externo al fixture rechazado.

Estas pruebas siguen siendo offline/injected. No constituyen provider parity live.

## Decisión sobre errores de composición

El factory del host no reempaqueta los errores V0.23.27. Si la qualification 14/14 no se cumple, se preserva `QualifiedDevProviderCompositionError(code=dev_environment_unqualified)`.

Esto mantiene visible el gate que realmente negó la construcción y evita inventar una segunda semántica de qualification en V0.23.28.

## Brecha restante

El host no cierra todavía el loop driver → HTTP client → host.

`SupabaseProviderCandidateExecutionDriver` llama un `QualifiedDevEvidenceHttpClientPort` sin transportar públicamente el lease, mientras el host exige correctamente el lease fuera de banda. Un slice posterior debe crear un bridge server-only que recupere el lease desde el probe scope/control plane y conecte el HTTP client al host sin introducir fixture selectors públicos ni circular authority.

Ese bridge tampoco puede convertir el candidate host en `runtime.server.ts`.

## Autoridad

**Candidate Host PASS ≠ Driver↔Host Bridge PASS ≠ Provider Transport PASS ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

No autoriza:

- provisioning;
- SQL apply;
- credentials live;
- provider I/O real;
- runtime público;
- STAGING/PROD;
- merge;
- deployment.
