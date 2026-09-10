# Supabase Provider Fixture Adapter · V0.23.22

## Objetivo

Traducir el contrato provider-neutral V0.23.21 a una lifecycle específica de Supabase, sin credenciales, sin I/O real y sin abrir autoridad de runtime.

## Dependencias canónicas

- V0.23.14 · DEV Provisioning Authorization & Qualification.
- V0.23.19 · Evidence Runtime Parity Contract.
- V0.23.20 · Provider Candidate Parity Harness.
- V0.23.21 · Provider Candidate Fixture Lifecycle.

## Archivo principal

`server/evidence-api/supabase-provider-fixture-adapter.ts`

Exports principales:

- `SupabaseProviderCandidateFixtureLifecycle`
- `SupabaseProviderFixtureAdminPort`
- `SupabaseFixtureResidue`
- `SupabaseProviderFixtureAdapterError`
- `SUPABASE_PROVIDER_FIXTURE_ADAPTER_VERSION`
- `supabaseProviderFixtureAdapterProducesNoActivationFacts()`

## Control plane inyectable

El adapter no depende de `@supabase/supabase-js` ni de variables de entorno.

La implementación futura de `SupabaseProviderFixtureAdminPort` debe aportar:

1. creación de usuario Auth sintético;
2. binding de `auth_user_id -> subjectRef`;
3. listado de objetos bajo prefijo Storage;
4. borrado físico por Storage API;
5. purge de DB/registry/identity mapping;
6. borrado de Auth user;
7. inspección independiente de residuos.

Esto permite certificar la lógica destructiva sin disponer todavía de un proyecto Supabase DEV.

## Naming contract

Por fixture:

```text
fixtureId          = fx_<token>
namespace          = vivienda_dev_<token>
ownerSubjectRef    = sub_synthetic_<token>_owner
intruderSubjectRef = sub_synthetic_<token>_intruder
storagePrefix      = quarantine/upl_vivienda_dev_<token>_
```

Token permitido:

`[A-Za-z0-9_-]{8,40}`

El generador por defecto usa 12 bytes aleatorios codificados en hex.

## TTL

- default: 20 minutos;
- máximo: 30 minutos, heredado de V0.23.21;
- `ttlMs <= 0`, no entero seguro o superior al máximo: `invalid_configuration` antes de I/O.

## Allocation sequence

```text
build lease
→ historical collision gate
→ consume fixtureId
→ create owner Auth
→ bind owner identity
→ create intruder Auth
→ bind intruder identity
→ register active fixture
```

El segundo Auth user debe:

- tener UUID válido;
- ser distinto del owner.

El fixture no entra al registry activo hasta que ambas identidades están completas.

## Allocation rollback

Ante error parcial:

```text
purgeFixtureDatabase(namespace, subjects)
→ deleteAuthUser(known owner)
→ deleteAuthUser(known intruder)
→ sanitized allocation_failed
```

El rollback es best-effort para reducir residuo, pero nunca transforma el fallo original en PASS. El `fixtureId` permanece consumido después de un allocation fallido para impedir que un posible namespace parcialmente contaminado sea reutilizado.

## Historical collision safety

La lifecycle mantiene dos estados distintos:

- `activeFixtures`: fixtures que todavía admiten cleanup/retry;
- `consumedFixtureIds`: todos los IDs que alguna vez pasaron el collision gate.

El gate consulta `consumedFixtureIds` **antes** de `createSyntheticAuthUser` y consume el ID antes del primer provider I/O.

Por tanto un token repetido se rechaza:

- mientras el fixture está activo;
- después de cleanup exitoso;
- después de allocation parcial fallido.

Esto hace que cada namespace sea single-use durante toda la vida de la instancia del adapter y alinea la implementación Supabase con la prohibición de reuse V0.23.21 antes de que el proveedor sea tocado.

## Storage deletion boundary

El adapter pide al proveedor únicamente:

`listStorageObjects(bucket='vivienda-evidence', prefix=storagePrefix)`

Antes de borrar valida que **todos** los paths devueltos comienzan por el prefijo asignado.

Si aparece un path extraño:

- no se llama `deleteStorageObjects`;
- se marca failure;
- se continúa DB/Auth cleanup;
- la lifecycle retiene el fixture para retry.

## Cleanup sequence

```text
Storage list
→ Storage physical delete
→ DB purge
→ Auth owner delete
→ Auth intruder delete
→ residue inspection
```

No se permite invertir DB/Storage porque la eliminación de metadata no prueba eliminación física.

No se permite borrar Auth antes del DB purge porque `private.vivienda_identity_subjects.auth_user_id` referencia `auth.users`, mientras Cases referencian `subject_ref`.

## Best-effort + fail-closed

Una fase que falla no impide intentar las siguientes fases seguras.

No obstante, cualquier error operacional hace fallar el cleanup aunque una inspección posterior devuelva cero. Esto evita convertir una ejecución parcialmente desconocida en evidencia positiva.

## Residue contract

La inspección debe producir conteos enteros seguros >= 0:

```text
caseRows
storageObjects
registryRows
identityRows
authUsers
```

Mapping a V0.23.21:

```text
caseResidueAbsent     = caseRows == 0
storageResidueAbsent  = storageObjects == 0
registryResidueAbsent = registryRows == 0
identityResidueAbsent = identityRows == 0 && authUsers == 0
```

El fixture solo se elimina de `activeFixtures` cuando los cinco conteos son cero y no hubo errores operacionales. El `fixtureId` permanece en `consumedFixtureIds`.

## Retry semantics

Una lifecycle con cleanup fallido conserva el fixture activo.

Se acepta una copia estructural exacta del lease para retry. Esto permite persistir/reconstituir el lease sin exigir identidad de objeto JavaScript.

Cualquier alteración de:

- scope;
- fixture ID;
- namespace;
- subject refs;
- timestamps;
- contract version;
- flags synthetic/disposable;

bloquea antes de cualquier llamada destructiva.

## DEV-only SQL support

Archivo:

`supabase/dev-fixtures/V0.23.22_PROVIDER_FIXTURE_SUPPORT.sql`

No pertenece al migration chain.

Funciones:

```text
public.vivienda_dev_fixture_purge(text,text,text[])
public.vivienda_dev_fixture_residue(text,text,text[])
```

Gates redundantes:

- project label exacto `vivienda-dev`;
- namespace válido;
- dos subject refs exactos derivados del token;
- `coalesce(cardinality(...),0)` para fail-closed sobre arrays NULL.

`purge`:

1. borra Cases cuyo `case_id` comienza exactamente por `case_<namespace>_`;
2. usa las FK `ON DELETE CASCADE` canónicas;
3. borra únicamente los dos identity mappings sintéticos esperados.

`residue` cuenta:

- roots y filas Case-linked;
- evidence object registry rows;
- identity mappings.

No cuenta Storage físico ni Auth users porque esas dos evidencias deben obtenerse de sus APIs respectivas.

## Supabase API assumptions verificadas

Documentación oficial consultada el 2026-09-10:

- `auth.admin.deleteUser(id)` requiere `service_role` y uso server-side;
- `auth.admin.getUserById(id)` permite verificar existencia residual de Auth;
- `storage.from(bucket).list(path, options)` lista objetos/folders del bucket;
- `storage.from(bucket).remove(paths)` elimina físicamente archivos;
- `supabase.rpc(fn,args)` ejecuta funciones Postgres expuestas.

La implementación concreta del AdminPort debe mantener esas llamadas en un entorno server-only DEV.

## Test coverage

`supabase-provider-fixture-adapter.test.ts` cubre:

1. versión del adapter;
2. allocation owner/intruder;
3. naming y TTL;
4. invalid config antes de provider I/O;
5. token collision antes de provider I/O;
6. rollback de allocation parcial;
7. orden Storage → DB → Auth → inspect;
8. rechazo de Storage path fuera del prefix;
9. continuación de cleanup tras Storage failure;
10. retry posterior con lease clonado;
11. flags explícitos de residuo;
12. rechazo de lease alterado;
13. sanitización;
14. cero activation facts / import isolation.

`supabase-provider-fixture-reuse.test.ts` congela adicionalmente que un `fixtureId` no puede reutilizarse después de un cleanup completamente exitoso y que la segunda tentativa genera cero provider calls.

`supabase-provider-fixture-support.test.ts` cubre estáticamente:

1. ubicación fuera de migrations;
2. project-label guard;
3. namespace/subject fail-closed;
4. scope de DELETE SQL;
5. prohibición de borrar `storage.objects` y `auth.users`;
6. permisos solo `service_role`;
7. separación entre residue SQL y evidencia Storage/Auth.

## Siguiente slice

Una vez V0.23.22 esté congelado, V0.23.23 puede implementar el **Supabase DEV Fixture Admin Control Plane** concreto que satisfaga `SupabaseProviderFixtureAdminPort`.

Ese código todavía deberá permanecer desconectado hasta:

1. existencia autorizada de `vivienda-dev`;
2. migraciones canónicas aplicadas;
3. SQL DEV V0.23.22 aplicado exclusivamente allí;
4. V0.23.14 en 14/14.

## Invariantes

- fixture/namespace single-use por lifecycle;
- no credentials en source;
- no provider I/O en tests;
- no reuse de proyecto existente;
- no datos reales;
- no STAGING/PROD helper migration;
- no public runtime import;
- no activation facts;
- no deployment authorization.
