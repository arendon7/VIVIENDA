# STATUS · V0.23.26 · Supabase DEV Probe Support Plane

## Estado

**Freeze candidate · final CI required.**

Rama:

`product/supabase-dev-probe-support-plane-v0.23.26`

Base inmediata:

`product/supabase-provider-candidate-execution-driver-v0.23.25`

Freeze padre V0.23.25:

`d7fb1722f297d8b92ccd0eaf3f602d30e6abe204`

## Pregunta de arquitectura

¿Cómo completar state, observability, one-shot fault-control y cleanup del provider-candidate sin crear una segunda implementación de Case, sin exponer controles parity-only al HTTP público y sin aplicar infraestructura no autorizada?

## Respuesta V0.23.26

Se introduce un support plane DEV-only con tres responsabilidades separadas:

1. `SupabaseDevProbeStateTransport`, que reutiliza `CasePersistenceService` y el persistence port canónico;
2. `SupabaseDevProbeSupportRpc`, que define observability/fault support mediante RPCs inyectados;
3. `SupabaseDevProbeAwareFixtureAdmin`, decorator fail-closed para incorporar support residue al cleanup V0.23.22 sin reabrir contratos congelados.

## State canónico

No se crea un RPC de seed paralelo.

El seed R7 ejecuta dominio real:

```text
CASE_CREATED
DATA_AUTHORIZATION_RECORDED   (cuando authorizeData=true)
SERVICE_AGREEMENT_ACCEPTED
EVIDENCE_REQUESTED
```

Versiones pre-evidence:

```text
con data authorization = 4
sin data authorization = 3
```

`readCase` y `readIntent` también usan el persistence boundary canónico.

## Observability

El support plane define una observación fixture-bound:

```text
source=supabase_dev_observability
observationId
fixtureId
namespace
scope
observedAt
complete=true
registryRegistrations
storageUploadGrantCalls
storageInspectionCalls
auditOperations
```

`registryRegistrations` se deriva de la tabla canónica `private.vivienda_evidence_objects`.

Storage/audit counters se mantienen en tablas DEV-only y no son booleans auto-reportados por el parity evaluator.

## Fault control

Solo existe un fault permitido:

```text
scope=rate_limit_unavailable
operation=evidence.prepare
mode=rate_limit_unavailable_once
```

Es one-shot, fixture-bound, consumible una sola vez y con disarm explícito.

No se transporta como header/body del Evidence API público.

## SQL support

Archivo:

`supabase/dev-fixtures/V0.23.26_DEV_PROBE_SUPPORT.sql`

Permanece fuera de `supabase/migrations`.

Incluye únicamente soporte DEV sintético:

- metrics;
- audit;
- fault receipts;
- observe;
- fault arm/consume/disarm;
- support residue;
- extensión compatible de fixture purge/residue.

No se ha aplicado a ningún proyecto.

## Cleanup

`SupabaseDevProbeAwareFixtureAdmin` consulta `supportRows` además del residue base.

Para conservar el contrato externo V0.23.21, `supportRows` se incorpora al conteo interno `caseRows` usado por el gate. Por tanto un fixture con support residue nunca puede devolver `caseResidueAbsent=true`.

Si support residue no puede verificarse, cleanup falla cerrado.

## Instrumentation seams

V0.23.26 añade:

- `SupabaseDevProbeTelemetryRecorder`;
- `SupabaseDevProbeRateLimitFaultConsumer`.

No están cableados todavía al StorageGateway, audit port o rate limiter de un runtime DEV. Ese ensamblaje es la siguiente brecha.

## Tests

Archivos principales:

- `server/evidence-api/supabase-dev-probe-support-plane.test.ts`;
- `server/evidence-api/supabase-dev-probe-aware-fixture-admin.test.ts`.

Cubren state canónico, telemetry, one-shot fault lifecycle, isolation, SQL static contract y cleanup fail-closed.

Un run previo sobre `7b89039c6ca7e6511db56f41b437c1d0df8c7b4a` mostró:

- TypeScript PASS;
- 616/617 Domain tests PASS;
- única falla: una prueba de aislamiento hacía `not.toContain("runtime.server")` y coincidía con un comentario explicativo, no con un import;
- Build/E2E no ejecutados por ese fallo.

La prueba fue corregida para detectar específicamente imports prohibidos. El head documental final debe pasar el pipeline completo antes del freeze.

## Archivos del slice

1. `server/evidence-api/supabase-dev-probe-support-plane.ts`
2. `server/evidence-api/supabase-dev-probe-support-plane.test.ts`
3. `server/evidence-api/supabase-dev-probe-aware-fixture-admin.ts`
4. `server/evidence-api/supabase-dev-probe-aware-fixture-admin.test.ts`
5. `supabase/dev-fixtures/V0.23.26_DEV_PROBE_SUPPORT.sql`
6. `knowledge/10_DECISIONS/ADR-0022-supabase-dev-probe-support-plane.md`
7. `knowledge/60_ENGINEERING/SUPABASE-DEV-PROBE-SUPPORT-PLANE-V0.23.26.md`
8. `knowledge/00_PRODUCT/STATUS-V0.23.26.md`

## Autoridad

V0.23.26:

- no provisiona Supabase;
- no reutiliza proyectos existentes;
- no usa credentials live;
- no aplica SQL;
- no modifica `supabase/migrations`;
- no toca rutas HTTP públicas;
- no modifica `runtime.server.ts`;
- no ejecuta provider parity live;
- no produce activation facts;
- no autoriza STAGING/PROD/deployment.

Regla:

**Support Plane PASS ≠ Support SQL Applied ≠ Provider Composition PASS ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## CI requerido para freeze

Sobre el head final:

- TypeScript PASS;
- Domain tests PASS;
- Build PASS;
- Borrower Journey E2E / Playwright PASS;
- Remote Preview E2E SKIPPED por diseño.

## Siguiente paso permitido

V0.23.27 · **Qualified DEV Provider Composition Contract**:

- ensamblar fixture lifecycle + execution driver + support plane;
- concretar adapters inyectados de Auth/session, HTTP y Storage;
- envolver Storage/Audit/RateLimit con los seams V0.23.26;
- exigir qualification V0.23.14 completa antes de construir la composición;
- preservar `externalIoOccurred=true`, `liveRuntimeAuthorized=false`, `runtimeServerWasUsed=false`;
- mantener `runtime.server.ts` fail-closed;
- seguir usando fakes/inyección y cero provider I/O real.

Después de ese contrato podrá definirse el procedimiento de instalación/ejecución en un DEV real, pero únicamente tras autorización explícita y disponibilidad de infraestructura.

## Fuera de alcance

- provisioning/billing;
- capacity workaround;
- secrets live;
- aplicar SQL;
- Auth/JWT real;
- Storage real;
- provider parity live;
- datos reales;
- runtime público;
- STAGING/PROD;
- deployment;
- merge del stack.
