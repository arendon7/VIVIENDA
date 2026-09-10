# STATUS · V0.23.22 · Supabase Provider Fixture Adapter

## Estado

**Freeze candidate · final CI required.**

Rama:

`product/supabase-provider-fixture-adapter-v0.23.22`

PR:

`#51 · V0.23.22 · Supabase Provider Fixture Adapter — DEV-only destructive lifecycle`

Base inmediata:

`product/provider-candidate-fixture-lifecycle-v0.23.21`

Freeze padre V0.23.21:

`3096bb2eb206f69fb3b549ca210df9a0625c3b9b`

Head funcional/documental previo a este STATUS:

`d33bc3e41a0d0fb12f2696fadf345e3409399574`

## Pregunta de arquitectura

¿Cómo traducimos V0.23.21 a Supabase sin introducir credenciales, tocar un proyecto real, mezclar helpers DEV con migraciones productivas ni crear una ruta destructiva insegura?

## Respuesta V0.23.22

Se implementa `SupabaseProviderCandidateFixtureLifecycle` sobre un `SupabaseProviderFixtureAdminPort` inyectable.

El adapter congela:

- naming `vivienda_dev_*`;
- dos Auth principals sintéticos por fixture;
- binding owner/intruder a `subjectRef`;
- TTL default 20 min / máximo 30 min;
- fixture/namespace single-use durante toda la lifecycle;
- collision gate antes de provider I/O;
- rollback de allocation parcial;
- Storage ownership por prefijo;
- cleanup Storage → DB → Auth → inspect;
- residue 0/0/0/0/0;
- retry con lease estructuralmente idéntico;
- sanitización de errores.

## Hardening incorporado durante el slice

Antes del freeze se corrigieron explícitamente:

1. **historical token collision:** un `fixtureId` se consume antes del primer I/O y nunca puede reutilizarse, incluso tras cleanup exitoso o allocation parcial fallido;
2. **foreign Storage path:** un listado que incluya un path fuera del prefix no puede ser enviado a delete;
3. **cleanup retry:** un cleanup no verificado conserva el fixture activo;
4. **lease integrity:** cleanup compara el lease completo y no solo `fixtureId`;
5. **NULL SQL subject array:** el soporte SQL usa `coalesce(cardinality(...),0)` y comparaciones booleanas fail-closed;
6. **partial allocation residue defense:** un namespace potencialmente tocado permanece consumido aunque rollback sea best-effort.

## DEV-only SQL support plane

Se añadió:

`supabase/dev-fixtures/V0.23.22_PROVIDER_FIXTURE_SUPPORT.sql`

Está deliberadamente fuera de `supabase/migrations`.

Incluye:

- `vivienda_dev_fixture_purge`
- `vivienda_dev_fixture_residue`

Protecciones:

- project label exacto `vivienda-dev`;
- namespace `vivienda_dev_*`;
- owner/intruder exactos derivados del token;
- execute exclusivo `service_role`;
- no `DELETE FROM storage.objects`;
- no `DELETE FROM auth.users`.

## Separación de responsabilidades

```text
Storage físico -> Supabase Storage API
DB / registry / identity mapping -> DEV-only service-role RPC
Auth user -> Supabase Auth Admin
```

La documentación oficial de Supabase fue revisada el 2026-09-10 para confirmar las primitivas de Storage `list/remove`, Auth Admin `deleteUser/getUserById` y Postgres RPC.

## Archivos del slice

1. `server/evidence-api/supabase-provider-fixture-adapter.ts`
2. `server/evidence-api/supabase-provider-fixture-adapter.test.ts`
3. `server/evidence-api/supabase-provider-fixture-reuse.test.ts`
4. `server/evidence-api/supabase-provider-fixture-support.test.ts`
5. `supabase/dev-fixtures/V0.23.22_PROVIDER_FIXTURE_SUPPORT.sql`
6. `knowledge/10_DECISIONS/ADR-0018-supabase-provider-fixture-adapter.md`
7. `knowledge/60_ENGINEERING/SUPABASE-PROVIDER-FIXTURE-ADAPTER-V0.23.22.md`
8. `knowledge/00_PRODUCT/STATUS-V0.23.22.md`

## Cobertura nueva

La cobertura V0.23.22 verifica, entre otros:

- allocation owner/intruder y naming exacto;
- TTL y configuración inválida antes de I/O;
- colisión concurrente e histórica antes de I/O;
- rollback de allocation parcial;
- orden Storage → DB → Auth → inspect;
- bloqueo de path Storage fuera de namespace;
- continuidad de fases seguras después de fallo Storage;
- retry con lease clonado válido;
- residuo explícito DB/Storage/registry/identity/Auth;
- rechazo de lease alterado antes de operaciones destructivas;
- sanitización de mensajes del proveedor;
- SQL DEV fuera de migrations, service-role-only y fail-closed;
- cero activation facts y aislamiento de runtime/activation.

## Autoridad

V0.23.22:

- no contiene Supabase URL/key;
- no llama un proyecto real;
- no crea `vivienda-dev`;
- no aplica SQL;
- no importa runtime/activation;
- produce cero activation facts;
- no autoriza deployment.

Regla:

**fixture adapter PASS ≠ provider parity PASS ≠ activation preflight PASS ≠ deployment.**

## CI requerido para freeze

El commit generado por este STATUS es el candidato final de freeze y debe confirmar:

- TypeScript PASS;
- Domain tests PASS, incluidos los tests nuevos V0.23.22;
- Build PASS;
- Borrower journey E2E / Playwright PASS;
- Remote Preview E2E SKIPPED por diseño.

No se declarará freeze antes de ese gate.

## Siguiente paso permitido

V0.23.23 · **Supabase DEV Fixture Admin Control Plane**:

- implementar concretamente `SupabaseProviderFixtureAdminPort`;
- mantener service-role server-only;
- modelar Auth Admin create/delete/get;
- modelar Storage list/remove;
- modelar RPC bind/purge/residue;
- testear todo con transportes falsos, sin credenciales.

La ejecución real seguirá bloqueada hasta que:

1. exista `vivienda-dev` autorizado;
2. estén aplicadas las migraciones canónicas;
3. el soporte SQL DEV sea instalado solo allí;
4. V0.23.14 confirme 14/14.

## Fuera de alcance

- provisioning Supabase;
- billing/capacity mutation;
- credentials live;
- Auth/Storage/RPC live;
- datos reales;
- provider parity real;
- runtime público;
- STAGING/PROD;
- deployment;
- merge del stack.
