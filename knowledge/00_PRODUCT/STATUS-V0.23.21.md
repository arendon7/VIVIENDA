# STATUS · V0.23.21 · Provider Candidate Fixture Lifecycle

## Estado

**Freeze candidate · final CI required.**

Rama:

`product/provider-candidate-fixture-lifecycle-v0.23.21`

Base inmediata:

`product/provider-candidate-parity-harness-v0.23.20`

Freeze padre V0.23.20:

`fb788541e1d6128e530294d3033fcfb6729827c3`

Head funcional/documental previo a este STATUS:

`fcc65098024c3e82e9b3e2239e17b420cf28ca18`

## Pregunta de arquitectura

Después de congelar el harness V0.23.20, ¿cómo impedimos que un futuro proveedor DEV ejecute los seis probes reutilizando identidades/estado, usando datos no sintéticos o dejando residuos entre escenarios?

## Respuesta V0.23.21

Se introduce un contrato ejecutable de lifecycle de fixtures.

`ProviderCandidateFixtureSession` exige, antes de allocation:

- DEV V0.23.14 completamente verificado;
- `devEnvironmentVerified = true`;
- `liveRuntimeAuthorized = false`;
- cero blockers;
- 14/14 requisitos verificados.

Cada probe usa un lease:

- synthetic-only;
- disposable;
- scope exacto;
- fixture y namespace exclusivos;
- owner/intruder sintéticos y distintos;
- TTL máximo de 30 minutos.

Una misma sesión rechaza reutilización de fixture ID, namespace u otras identidades entre probes.

## Cleanup fail-closed

Después de cada probe se exige evidencia explícita de:

- cero residuo de Case/base de datos;
- cero residuo de Storage;
- cero residuo de registry;
- cero residuo de identidades temporales.

El cleanup se ejecuta incluso cuando el probe falla.

Un cleanup incompleto o una excepción del proveedor produce un error sanitizado `fixture_cleanup_failed`.

## Separación de autoridad

V0.23.21:

- no importa `runtime.server.ts`;
- no importa `activated-runtime.ts`;
- no importa `activation-preflight.ts`;
- produce `{}` como activation facts;
- no crea un proyecto;
- no autoriza deployment.

Regla:

**DEV 14/14 ≠ fixture lifecycle PASS ≠ provider parity PASS ≠ runtime activation.**

## Archivos del slice

1. `server/evidence-api/provider-candidate-fixture-lifecycle.ts`
2. `server/evidence-api/provider-candidate-fixture-lifecycle.test.ts`
3. `knowledge/10_DECISIONS/ADR-0017-provider-candidate-fixture-lifecycle.md`
4. `knowledge/60_ENGINEERING/PROVIDER-CANDIDATE-FIXTURE-LIFECYCLE-V0.23.21.md`
5. `knowledge/00_PRODUCT/STATUS-V0.23.21.md`

## Cobertura nueva

Nueve tests verifican:

1. bloqueo antes de allocation si DEV no está calificado;
2. ejecución válida con cleanup;
3. rechazo de lease no sintético/TTL inválido;
4. no reutilización entre probes;
5. cleanup tras error del probe;
6. fail-closed ante residuo;
7. sanitización de errores de cleanup;
8. cero activation facts;
9. aislamiento del runtime/activation.

## CI

El head documental previo al STATUS inició GitHub Actions run:

`34404824441`

Ese run estaba pendiente al momento de crear este STATUS y no se usa como evidencia de freeze.

El commit generado por este STATUS debe ejecutar un nuevo gate y solo podrá convertirse en freeze si confirma:

- TypeScript PASS;
- Domain tests PASS;
- Build PASS;
- Playwright 244/244 PASS;
- Remote Preview E2E SKIPPED por diseño.

## Estado externo

En este slice no se creó, pausó, restauró, renombró ni reutilizó infraestructura Supabase.

La observación operativa actual continúa sin un proyecto dedicado `vivienda-dev`. V0.23.21 no intenta resolver capacidad ni billing.

## Siguiente paso permitido

Una vez congelado V0.23.21, el siguiente desarrollo puede diseñar el adapter/lifecycle específico de Supabase para el futuro candidato DEV, **pero no ejecutarlo contra un proveedor real** hasta que:

1. se resuelva la capacidad mediante la ruta V0.23.15–16;
2. `vivienda-dev` sea creado con autorización y costo confirmados;
3. se apliquen migraciones canónicas;
4. el entorno obtenga 14/14 V0.23.14.

## Fuera de alcance

- mutaciones de capacidad/billing;
- crear `vivienda-dev`;
- aplicar migraciones live;
- Auth live;
- Storage live;
- documentos o datos reales;
- `EvidenceRuntimeProviderCandidateProbe` Supabase real;
- runtime público;
- activation facts;
- STAGING/PROD;
- deployment;
- merge del stack.
