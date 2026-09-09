# ADR-0017 · Provider Candidate Fixture Lifecycle

- **Estado:** Accepted for V0.23.21
- **Fecha:** 2026-09-09
- **Padre:** V0.23.20 · Provider Candidate Parity Harness

## Contexto

V0.23.20 congeló el harness que obliga a un futuro candidato DEV a ejecutar exactamente un happy path y cinco escenarios adversariales antes de comparar su comportamiento con el baseline V0.23.19.

El harness declara que cada probe debe operar sobre fixtures aislados y desechables, pero hasta V0.23.20 esa responsabilidad estaba expresada como obligación de implementación y no como contrato ejecutable.

Conectar un proveedor real sin cerrar esa lifecycle permitiría, entre otros riesgos:

- reutilizar identidad o namespace entre probes;
- contaminar un escenario con estado de otro;
- dejar Cases, objetos, registry rows o identidades residuales;
- usar datos no sintéticos;
- ejecutar probes contra un entorno todavía no calificado;
- confundir una prueba de paridad con autorización de runtime live.

## Decisión

Se introduce `ProviderCandidateFixtureSession` como frontera canónica para toda futura implementación de `EvidenceRuntimeProviderCandidateProbe` que realice I/O contra DEV.

La sesión solo puede asignar un fixture si recibe una decisión V0.23.14 que pruebe simultáneamente:

- `state = qualified_for_staging_candidate`;
- `devEnvironmentVerified = true`;
- `liveRuntimeAuthorized = false`;
- cero blockers;
- todos los requisitos DEV verificados.

Esto no autoriza STAGING, producción ni el Evidence Runtime live. El nombre histórico del estado V0.23.14 expresa que DEV puede ser candidato para un gate posterior, no que ese gate haya sido aprobado.

## Lease obligatorio

Cada probe recibe un `ProviderCandidateFixtureLease` con:

- versión de contrato V0.23.21;
- scope exacto del probe;
- `fixtureId` opaco;
- namespace exclusivo `vivienda_dev_*`;
- identidad owner sintética;
- identidad intruder sintética;
- `issuedAt` y `expiresAt`;
- `syntheticOnly = true`;
- `disposable = true`.

La vigencia máxima del lease es 30 minutos. Se tolera únicamente un skew de reloj acotado de 60 segundos al validar `issuedAt`.

## No reutilización

Una misma `ProviderCandidateFixtureSession` debe envolver la certificación completa. La sesión registra y rechaza reutilización de:

- `fixtureId`;
- namespace;
- owner subjectRef;
- intruder subjectRef.

Por tanto, el happy path y los cinco escenarios adversariales no pueden compartir accidentalmente identidad o namespace.

## Cleanup verificable

Después de **cada** probe, incluso si su ejecución falla, la lifecycle debe producir un `ProviderCandidateFixtureCleanupReport` que pruebe:

- ausencia de residuo de Case/base de datos;
- ausencia de residuo de Storage;
- ausencia de residuo de registry;
- ausencia de residuo de identidades temporales.

Un cleanup incompleto, no verificable o que arroje una excepción bloquea la ejecución con `fixture_cleanup_failed`.

Los errores de allocation/cleanup se sanitizan y no propagan mensajes del proveedor, paths, credenciales ni detalles internos.

## Relación con V0.23.20

V0.23.20 define **qué** probes ejecutar y cómo comparar observaciones.

V0.23.21 define **bajo qué lifecycle de datos e identidad** puede ejecutarse cada probe de un proveedor real.

El flujo futuro queda:

`DEV 14/14 verificado`
→ `ProviderCandidateFixtureSession`
→ `EvidenceRuntimeProviderCandidateProbe`
→ `V0.23.20 parity harness`
→ `V0.23.19 evaluator`.

## Separación de autoridad

V0.23.21 no importa:

- `runtime.server.ts`;
- `activated-runtime.ts`;
- `activation-preflight.ts`.

Además `providerCandidateFixtureContractProducesNoActivationFacts()` retorna `{}`.

Por tanto:

**fixture limpio ≠ provider parity PASS ≠ activation preflight PASS ≠ deployment authorization.**

## Consecuencias

### Positivas

- elimina state bleed entre probes;
- fuerza synthetic-only antes del primer I/O de paridad;
- convierte cleanup en evidencia verificable y no en best effort silencioso;
- impide ejecutar el candidato sobre un DEV incompleto;
- prepara una implementación Supabase DEV sin acoplarla al runtime público.

### Costos

- el futuro candidato Supabase deberá implementar allocation y cleanup reales;
- la certificación será deliberadamente más lenta por aislamiento secuencial;
- no puede ensayarse contra proveedor real hasta que exista un DEV dedicado y 14/14 verificado.

## Fuera de alcance

- crear o pausar proyectos Supabase;
- resolver capacidad/billing;
- aplicar migraciones live;
- crear usuarios Auth reales;
- crear buckets u objetos live;
- implementar todavía el candidato Supabase;
- activar rutas públicas;
- producir activation facts;
- deployment o merge del stack.
