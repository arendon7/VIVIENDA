# Provider Candidate Fixture Lifecycle · V0.23.21

## Objetivo

Cerrar la última precondición provider-neutral antes de implementar un candidato DEV real: cada probe de paridad debe ejecutarse con identidad y estado aislados, sintéticos, efímeros y con cleanup verificable.

V0.23.21 no toca Supabase live. Prepara el contrato que una futura implementación Supabase deberá satisfacer.

## Dependencias canónicas

- V0.23.14 · DEV Provisioning Authorization & Qualification.
- V0.23.19 · Evidence Runtime Parity Contract.
- V0.23.20 · Provider Candidate Parity Harness.

## API

Archivo:

`server/evidence-api/provider-candidate-fixture-lifecycle.ts`

Elementos principales:

- `ProviderCandidateFixtureLifecycle`
- `ProviderCandidateFixtureLease`
- `ProviderCandidateFixtureCleanupReport`
- `ProviderCandidateFixtureSession`
- `ProviderCandidateFixtureContractError`
- `providerCandidateFixtureContractProducesNoActivationFacts()`

## Gate previo

`ProviderCandidateFixtureSession.run(...)` falla antes de allocation si la decisión V0.23.14 no prueba un DEV completamente calificado.

Condiciones mínimas:

- `qualified_for_staging_candidate`;
- `devEnvironmentVerified = true`;
- `liveRuntimeAuthorized = false`;
- `blockers.length = 0`;
- `verifiedRequirementCount === totalRequirementCount`.

Esto vincula los probes reales a las 14 verificaciones DEV sin convertir esa calificación en permiso live.

## Lease

Cada allocation debe producir:

```text
contractVersion = V0.23.21-PROVIDER-FIXTURE-V1
scope = probe solicitado
fixtureId = fx_*
namespace = vivienda_dev_*
ownerSubjectRef = sub_synthetic_*
intruderSubjectRef = sub_synthetic_*
syntheticOnly = true
disposable = true
TTL <= 30 minutos
```

Owner e intruder deben ser distintos.

El lease debe estar vigente y su timestamp de emisión no puede adelantarse más de 60 segundos frente al reloj de la sesión.

## Aislamiento intra-certificación

La sesión mantiene un set interno de identificadores ya consumidos. Se rechaza cualquier repetición de:

1. fixture ID;
2. namespace;
3. owner subjectRef;
4. intruder subjectRef.

La intención es que una futura instancia de candidato utilice **una sesión por certificación V0.23.20**, no una sesión por probe. Así la barrera detecta reuse entre happy path y escenarios adversariales.

## Cleanup

`cleanup(lease)` es obligatorio después de todo probe, incluido un probe que arroje excepción.

El reporte solo se acepta si confirma simultáneamente:

```text
caseResidueAbsent = true
storageResidueAbsent = true
registryResidueAbsent = true
identityResidueAbsent = true
```

También debe coincidir el `fixtureId` y scope del lease original.

Cualquier desviación produce `fixture_cleanup_failed`.

## Error contract

Códigos:

- `dev_environment_unqualified`
- `fixture_allocation_failed`
- `fixture_invalid`
- `fixture_reuse_detected`
- `fixture_cleanup_failed`

Las excepciones de allocation/cleanup no se encadenan ni exponen como `cause`; el mensaje público del contrato es genérico. El harness V0.23.20 aplica además su propia sanitización al envolver la ejecución del candidato.

## Tests

`server/evidence-api/provider-candidate-fixture-lifecycle.test.ts` verifica:

1. DEV no calificado bloquea antes de allocation;
2. lease sintético válido ejecuta y limpia;
3. identidad no sintética / TTL inválido bloquean y aun intentan cleanup;
4. reuse entre probes se rechaza;
5. una excepción durante el probe no evita cleanup;
6. residuo de Storage bloquea la certificación;
7. error del proveedor durante cleanup se sanitiza;
8. se producen cero activation facts;
9. el módulo permanece aislado de runtime/activation.

## Integración futura con Supabase

La implementación futura deberá aportar un `ProviderCandidateFixtureLifecycle` real que, dentro de `vivienda-dev`:

- cree identidades Auth sintéticas y efímeras;
- genere un namespace exclusivo por probe;
- permita crear el Case/objetos requeridos por el escenario;
- elimine/expire estado de DB y registry;
- elimine objetos vía Storage API;
- elimine identidades temporales;
- verifique después del cleanup que no existe residuo.

Supabase documenta que la eliminación de objetos debe ejecutarse mediante Storage API, no borrando únicamente metadata SQL. Ese detalle deberá respetarse en el adapter real.

## Secuencia objetivo posterior

1. resolver capacidad/provisionar `vivienda-dev` con los gates V0.23.14–16;
2. aplicar migraciones canónicas;
3. obtener 14/14 DEV qualification;
4. implementar lifecycle Supabase real contra este contrato;
5. implementar `EvidenceRuntimeProviderCandidateProbe`;
6. ejecutar V0.23.20;
7. exigir 37/37 V0.23.19;
8. recién después evaluar activation preflight por una vía separada.

## Invariantes

- synthetic-only;
- no proyecto existente reutilizado;
- no datos reales;
- no public runtime;
- no activation facts;
- no deployment authorization;
- cleanup fail-closed;
- probe isolation obligatorio.
