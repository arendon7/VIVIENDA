# Supabase DEV Fixture Admin Control Plane · V0.23.23

## Objetivo

Implementar concretamente `SupabaseProviderFixtureAdminPort` usando las superficies administrativas de Supabase, pero manteniendo el wiring real, las credenciales y todo provider I/O fuera del slice.

## Dependencias canónicas

- V0.23.14 · DEV Provisioning Authorization & Qualification.
- V0.23.20 · Provider Candidate Parity Harness.
- V0.23.21 · Provider Candidate Fixture Lifecycle.
- V0.23.22 · Supabase Provider Fixture Adapter.

## Archivo principal

`server/evidence-api/supabase-dev-fixture-admin-control-plane.ts`

Exports principales:

- `SupabaseDevFixtureAdminControlPlane`
- `SupabaseDevFixtureClient`
- `SupabaseDevAuthAdminClient`
- `SupabaseDevStorageBucketClient`
- `SupabaseDevFixtureAdminControlPlaneError`
- `SUPABASE_DEV_FIXTURE_ADMIN_CONTROL_PLANE_VERSION`
- `supabaseDevFixtureAdminControlPlaneProducesNoActivationFacts()`

## Construction gate

El constructor requiere:

```text
projectLabel = vivienda-dev
AND qualification.state = qualified_for_staging_candidate
AND qualification.devEnvironmentVerified = true
AND qualification.verifiedRequirementCount = qualification.totalRequirementCount
AND qualification.liveRuntimeAuthorized = false
```

Este gate vincula la capa privilegiada al contrato V0.23.14. No se permite construir el control plane usando solo una etiqueta local.

## Cliente inyectado

V0.23.23 define únicamente la forma mínima del cliente requerido:

```text
auth.admin.createUser
auth.admin.deleteUser
auth.admin.getUserById
storage.from(bucket).list
storage.from(bucket).remove
rpc(functionName, args)
```

No existe import de `@supabase/supabase-js`, `process.env`, URL o key. El wiring real queda para una frontera server-only posterior.

## Identity contract

Por fixture:

```text
namespace          = vivienda_dev_<token>
ownerSubjectRef    = sub_synthetic_<token>_owner
intruderSubjectRef = sub_synthetic_<token>_intruder
owner email        = fixture+<namespace>.owner@vivienda.invalid
intruder email     = fixture+<namespace>.intruder@vivienda.invalid
```

Antes de Auth Admin I/O se valida la relación exacta namespace/subject/role/email.

`bindSyntheticIdentity()`:

- exige UUID Auth válido;
- exige `sub_synthetic_*`;
- usa `vivienda_persist_upsert_identity`;
- fija `principalKind = client`.

## Storage listing

Input permitido:

```text
bucket = vivienda-evidence
prefix = quarantine/upl_vivienda_dev_<token>_
```

La enumeración se realiza por jerarquía:

```text
quarantine
  -> upl_vivienda_dev_<token>_<intent suffix>
      -> evd_<...>
          -> obj_<...>
```

Cada archivo terminal debe cumplir:

```text
^quarantine/(upl_vivienda_dev_<token>_<...>)/(evd_<...>)/(obj_<...>)$
```

### Safety caps

- page size: 100;
- máximo: 100 páginas por directorio;
- remove batch: 100 paths.

Si no se encuentra una página terminal dentro del cap, se lanza `enumeration_limit_exceeded`. El objetivo es evitar falsos `storageObjects = 0` por truncamiento.

## Storage delete

`deleteStorageObjects()` rechaza antes de I/O:

- bucket distinto;
- lista vacía;
- path no canónico;
- duplicados.

Después ejecuta `remove()` en batches de 100.

El ownership final del namespace sigue siendo doblemente validado por V0.23.22 antes de llegar aquí.

## Database purge

`purgeFixtureDatabase()` exige la pareja exacta:

```text
[ownerSubjectRef, intruderSubjectRef]
```

en ese orden y derivada del mismo namespace.

RPC:

```text
vivienda_dev_fixture_purge({
  p_project_label: 'vivienda-dev',
  p_namespace,
  p_subject_refs
})
```

El SQL V0.23.22 vuelve a validar esos mismos invariantes.

## Auth delete

`deleteAuthUser()`:

- valida UUID;
- ejecuta Auth Admin delete;
- permite solo `user_not_found` como resultado idempotente;
- cualquier otra falla => `provider_error`.

## Residue inspection

Orden lógico:

```text
DEV residue RPC
-> validate DB counters
-> Storage recursive listing
-> owner Auth lookup
-> intruder Auth lookup
-> combined residue report
```

Resultado:

```text
caseRows
storageObjects
registryRows
identityRows
authUsers
```

Un payload DB inválido detiene la operación antes de Storage/Auth para impedir certificar un resultado parcial.

## Error sanitization

El caller solo observa `SupabaseDevFixtureAdminControlPlaneError` con uno de:

```text
invalid_configuration
invalid_input
provider_error
invalid_provider_response
enumeration_limit_exceeded
```

No se reexpone `message`, hint, SQL diagnostic o material de service role.

## Tests

`server/evidence-api/supabase-dev-fixture-admin-control-plane.test.ts` cubre:

1. versión congelada;
2. project label incorrecto;
3. DEV no 14/14;
4. createUser sintético exacto;
5. mismatch namespace/subject/email antes de I/O;
6. sanitización Auth;
7. identity RPC;
8. rechazo identity no sintética;
9. enumeración recursiva canónica;
10. file a profundidad incorrecta;
11. folder depth inesperado;
12. delete batch de 100;
13. duplicate/non-canonical path rejection;
14. purge RPC exacto;
15. Auth delete idempotente solo para user_not_found;
16. residue combinado DB/Storage/Auth;
17. malformed residue fail-closed;
18. cap de paginación;
19. cero activation facts y cero source credentials.

## Sin provider real

Todos los tests usan `FakeSupabaseDevClient`.

No existe:

- URL Supabase;
- key;
- project ref;
- llamada remota;
- fixture Auth real;
- objeto Storage real;
- RPC real.

## Próximo slice permitido

V0.23.24 debe decidir el siguiente precondicionamiento más estrecho para conectar el parity harness al candidato Supabase. La opción preferida es un **Supabase Provider Candidate Probe Adapter** todavía inyectado/offline que traduzca los seis probes V0.23.20 a requests reales del Evidence API sin crear autoridad de deployment.

La ejecución live continúa bloqueada hasta que exista un proyecto `vivienda-dev` dedicado, autorizado, migrado, con SQL DEV instalado y V0.23.14 14/14 observado realmente.

## Invariantes

- no provider I/O en tests;
- no secrets en source;
- no client-side privileged surface;
- no proyecto existente reutilizado;
- synthetic-only;
- Storage physical truth separada de DB;
- Auth truth separada de identity mapping;
- control plane requiere 14/14;
- cero activation facts;
- no deployment authorization.
