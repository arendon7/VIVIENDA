# STATUS · V0.23.23 · Supabase DEV Fixture Admin Control Plane

## Estado

**Freeze candidate · final CI required.**

Rama:

`product/supabase-dev-admin-control-plane-v0.23.23`

Base inmediata:

`product/supabase-provider-fixture-adapter-v0.23.22`

Freeze padre V0.23.22:

`b632937c0e3c2504ba0d73e0c4632ea2c70e0e76`

## Pregunta de arquitectura

¿Cómo conectamos el AdminPort V0.23.22 a las primitivas reales de Supabase sin incorporar credenciales, sin habilitar provider I/O accidental y sin permitir que una simple etiqueta local sustituya la calificación DEV 14/14?

## Respuesta V0.23.23

Se implementa `SupabaseDevFixtureAdminControlPlane` sobre una interfaz mínima e inyectada de cliente Supabase.

Traduce el contrato a:

- Auth Admin create/delete/get;
- Storage list/remove;
- RPC de identity binding;
- RPC DEV-only purge/residue.

## Gate 14/14

El control plane no puede construirse salvo que:

- `projectLabel === 'vivienda-dev'`;
- V0.23.14 esté `qualified_for_staging_candidate`;
- `devEnvironmentVerified === true`;
- `verifiedRequirementCount === totalRequirementCount`;
- `liveRuntimeAuthorized === false`.

Así, `vivienda-dev` como string no constituye por sí solo evidencia de entorno.

## Hardening incorporado

1. validación namespace/subject/role/email antes de Auth I/O;
2. identity binding solo sintético;
3. enumeración Storage jerárquica y canónica;
4. cap explícito de paginación para impedir falsos cero residuos;
5. rechazo de profundidad inesperada;
6. paths duplicados/no canónicos bloqueados antes de remove;
7. delete físico en batches de 100;
8. `user_not_found` es la única ausencia Auth idempotente;
9. residue combina DB + Storage + Auth;
10. malformed DB residue falla antes de continuar;
11. errores provider sanitizados;
12. cero variables de entorno/credenciales en source;
13. cero activation facts.

## Corrección de CI durante el slice

Al añadir el gate V0.23.14, el test factory quedó con shadowing TypeScript:

`const { client, control } = control()`

Se corrigió renombrando el factory a `makeControlPlane()`. El commit `42222bd5cb01eb6d5c556a7cc36fe4e1636f147c` confirmó posteriormente:

- TypeScript PASS;
- Domain tests PASS;
- Build PASS.

El freeze definitivo se declara solo sobre el head final después de documentación + E2E verde.

## Archivos del slice

1. `server/evidence-api/supabase-dev-fixture-admin-control-plane.ts`
2. `server/evidence-api/supabase-dev-fixture-admin-control-plane.test.ts`
3. `knowledge/10_DECISIONS/ADR-0019-supabase-dev-fixture-admin-control-plane.md`
4. `knowledge/60_ENGINEERING/SUPABASE-DEV-FIXTURE-ADMIN-CONTROL-PLANE-V0.23.23.md`
5. `knowledge/00_PRODUCT/STATUS-V0.23.23.md`

## Autoridad

V0.23.23:

- no crea un cliente Supabase real;
- no lee `process.env`;
- no contiene URL, service-role key, anon key ni project ref;
- no aplica SQL;
- no llama Auth/Storage/RPC real;
- no produce activation facts;
- no autoriza provider parity;
- no autoriza deployment.

Regla:

**DEV 14/14 ≠ Admin Control Plane PASS ≠ Fixture Lifecycle PASS ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## CI requerido para freeze

Sobre el head final:

- TypeScript PASS;
- Domain tests PASS;
- Build PASS;
- Borrower journey E2E / Playwright PASS;
- Remote Preview E2E SKIPPED por diseño.

## Siguiente paso permitido

V0.23.24 · **Supabase Provider Candidate Probe Adapter**:

- traducir los seis probes V0.23.20 al candidato Supabase;
- mantener transport/runtime dependencies inyectados;
- generar requests/expectativas por scope;
- usar los subject refs y namespace del lease V0.23.21/22;
- no tocar proveedor real en unit tests;
- no generar activation facts.

La ejecución real continúa bloqueada hasta que exista un `vivienda-dev` dedicado y autorizado, las migraciones canónicas estén aplicadas, el SQL DEV V0.23.22 esté instalado allí y V0.23.14 esté observado realmente en 14/14.

## Fuera de alcance

- provisioning Supabase;
- billing/capacity mutation;
- reutilizar otro proyecto;
- secrets live;
- Auth/Storage/RPC live;
- datos reales;
- provider parity real;
- runtime público;
- STAGING/PROD;
- deployment;
- merge del stack.
