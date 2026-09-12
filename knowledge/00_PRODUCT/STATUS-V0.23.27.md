# STATUS · V0.23.27 · Qualified DEV Provider Composition Contract

## Estado

**Freeze candidate · final CI required.**

Rama:

`product/qualified-dev-provider-composition-v0.23.27`

Base inmediata:

`product/supabase-dev-probe-support-plane-v0.23.26`

Freeze padre V0.23.26:

`99fe1717d705c2b5cd1ff8786d661f27d600d658`

## Resultado arquitectónico

V0.23.27 introduce un composition root offline para ensamblar los contratos provider-candidate existentes únicamente después de qualification DEV exacta 14/14.

El root no crea infraestructura ni clientes provider. Recibe todo mediante inyección y devuelve:

- fixture lifecycle probe-aware;
- execution driver V0.23.25;
- probe adapter V0.23.24;
- instrumented Storage/Audit/RateLimit ports para el futuro candidate host.

Metadatos invariantes:

```text
provider=supabase
projectLabel=vivienda-dev
syntheticOnly=true
externalIoOccurred=true
liveRuntimeAuthorized=false
runtimeServerWasUsed=false
```

## Gate 14/14

La construcción falla antes de I/O salvo que:

```text
state=qualified_for_staging_candidate
devEnvironmentVerified=true
liveRuntimeAuthorized=false
verified=14/14
blockers=0
all requirement statuses=verified
```

Esto sigue siendo una simulación contractual en tests; no afirma que un DEV real esté hoy calificado.

## Transports

### Auth

Owner/intruder quedan ligados al subjectRef exacto del fixture antes de entregar la solicitud al session issuer inyectado.

### HTTP

Solo HTTPS same-origin y tres rutas POST canónicas de Evidence API.

### Signed upload

Solo `vivienda-evidence`, PDF sintético 2048 bytes, `upsert=false` y objectPath perteneciente al namespace del lease.

## Trusted context

La instrumentación del candidate host exige un resolver server-only con:

```text
channel=server_probe_context
projectLabel=vivienda-dev
syntheticOnly=true
liveRuntimeAuthorized=false
publicRequestDerived=false
```

El navegador/request público no puede declarar qué fixture está siendo observado.

## Storage instrumentation

Upload grants e inspection validan el trusted context y ownership del objectPath **antes** del delegate. Un path de otro fixture no puede tocar provider Storage.

Tras éxito del delegate se registra telemetry V0.23.26.

## Audit instrumentation

El context se resuelve antes del audit delegate. El evento support se registra después de que el audit real acepta la operación.

## Rate-limit fault

Solo `rate_limit_unavailable + evidence.prepare` puede consumir el fault one-shot V0.23.26. El fault permanece fuera del request público.

## Primera ronda CI

Head inicial de tests:

`63f807b7f02f579e28001a346581d87836c381a5`

Run `34716248330`:

- TypeScript PASS;
- 629/630 Domain tests PASS;
- única falla: la prueba esperaba Promise rejection para un `send()` que lanzaba sincronamente antes de devolver la Promise;
- Build/E2E skipped por el gate rojo.

No era una relajación de seguridad ni una ruta canónica inválida. La primera petición same-origin había pasado; la falla era la segunda aserción de rechazo cross-origin.

## Hardening aplicado

Se corrigió el transport HTTP para mantener semántica async consistente y, antes de congelar, se añadieron dos defensas:

1. `QualifiedDevProbeServerContextPort` debe declarar explícitamente `publicRequestDerived=false`;
2. Storage verifica lease ↔ objectPath antes del delegate provider.

Head funcional hardening:

`eab720108a3cf6d14de341b1b196db12971e37bb`

En su run de push `34716484085`, antes de los commits documentales:

- TypeScript PASS;
- Domain tests PASS;
- Build PASS;
- Borrower Journey E2E iniciado.

El head documental final requiere un nuevo pipeline completo antes del freeze formal.

## Archivos del slice

1. `server/evidence-api/qualified-dev-provider-composition.ts`
2. `server/evidence-api/qualified-dev-provider-composition.test.ts`
3. `knowledge/10_DECISIONS/ADR-0023-qualified-dev-provider-composition.md`
4. `knowledge/60_ENGINEERING/QUALIFIED-DEV-PROVIDER-COMPOSITION-V0.23.27.md`
5. `knowledge/00_PRODUCT/STATUS-V0.23.27.md`

## Autoridad

V0.23.27 no:

- provisiona Supabase;
- aplica V0.23.26 SQL;
- usa secrets live;
- crea Auth sessions reales;
- hace provider I/O en tests;
- modifica `runtime.server.ts`;
- activa Evidence Runtime;
- ejecuta provider parity live;
- usa datos reales;
- autoriza STAGING/PROD;
- hace deployment;
- fusiona el stack.

Regla:

**Qualified Composition PASS ≠ Candidate Host PASS ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Siguiente paso permitido

V0.23.28 · **Qualified DEV Candidate Evidence API Host Contract**.

Objetivo: ensamblar offline las dependencias server-side que recibirían las tres requests canónicas durante una futura ejecución provider-candidate, usando los wrappers V0.23.27 y manteniendo `runtime.server.ts` totalmente fuera de la ruta.

Debe incluir:

- principal/session resolver inyectado;
- CasePersistenceService canónico;
- Evidence Storage coordination/application;
- EvidenceHttpApi;
- trusted request context;
- instrumented Storage/Audit/RateLimit;
- router exacto de tres endpoints;
- tests end-to-end in-process con fakes;
- cero activation facts/provider I/O real.

## Fuera de alcance

- provisioning/billing;
- aplicar SQL;
- credentials live;
- Auth/JWT real;
- Storage real;
- endpoint desplegado;
- provider parity live;
- runtime público;
- STAGING/PROD;
- deployment;
- merge.
