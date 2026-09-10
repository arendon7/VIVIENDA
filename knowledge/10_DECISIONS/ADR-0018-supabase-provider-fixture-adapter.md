# ADR-0018 · Supabase Provider Fixture Adapter

- **Estado:** Accepted for V0.23.22
- **Fecha:** 2026-09-10
- **Padre:** V0.23.21 · Provider Candidate Fixture Lifecycle

## Contexto

V0.23.21 congeló el contrato provider-neutral que obliga a ejecutar cada probe de paridad con un fixture sintético, desechable, aislado y con cleanup verificable.

El siguiente riesgo era conectar ese contrato a Supabase de una forma que:

- introdujera credenciales en código;
- acoplara el harness al runtime público;
- permitiera borrar objetos fuera del fixture;
- borrara metadata SQL sin borrar primero el objeto físico;
- eliminara Auth antes de desmontar las referencias de persistencia;
- perdiera capacidad de remediación después de un cleanup parcial;
- permitiera reutilizar un namespace ya consumido;
- aplicara utilidades DEV como migraciones canónicas de STAGING/PROD.

## Decisión

Se introduce `SupabaseProviderCandidateFixtureLifecycle`, implementación Supabase-specific del contrato V0.23.21.

La clase depende exclusivamente de `SupabaseProviderFixtureAdminPort`, un control plane inyectable. V0.23.22 no contiene URL, service-role key, anon key ni cliente Supabase live.

El adapter sí congela la semántica que toda implementación real deberá respetar.

## Allocation

Cada allocation:

1. genera un token criptográficamente aleatorio por defecto;
2. construye `fixtureId = fx_<token>`;
3. construye `namespace = vivienda_dev_<token>`;
4. construye owner e intruder `sub_synthetic_*`;
5. verifica que ese `fixtureId` nunca haya sido consumido por esa lifecycle;
6. consume el `fixtureId` antes del primer I/O;
7. crea dos usuarios Auth sintéticos;
8. enlaza cada `auth_user_id` con el `subjectRef` mediante el boundary de identidad;
9. registra el fixture activo únicamente después de completar ambas identidades.

El TTL por defecto es 20 minutos y nunca puede superar el máximo V0.23.21 de 30 minutos.

La regla de no reutilización es histórica, no solamente concurrente: un token/fixture consumido no vuelve a entrar al proveedor aunque el fixture anterior haya limpiado 0/0/0/0/0 o aunque su allocation haya fallado parcialmente. Esto evita reabrir un namespace sobre el que pudiera existir estado residual no observable.

## Rollback de allocation parcial

Si falla cualquier fase después de crear uno o más usuarios Auth, el adapter intenta:

1. purgar las filas de identidad/DB del namespace;
2. eliminar todos los Auth users cuyo ID ya conoce.

El error resultante se sanitiza como `allocation_failed`.

El `fixtureId` permanece consumido después del fallo: el retry debe generar un token nuevo y nunca reutilizar el namespace potencialmente contaminado.

## Storage ownership

Todos los objetos del futuro probe deben usar intents con prefijo:

`upl_<namespace>_...`

De acuerdo con el coordinador canónico, el Storage path queda dentro de:

`quarantine/upl_<namespace>_...`

El cleanup lista exclusivamente ese prefijo.

Si Supabase devuelve siquiera un path fuera del prefijo esperado, el adapter:

- no ejecuta el batch de borrado recibido;
- marca el cleanup como fallido;
- continúa intentando DB/Auth cleanup;
- conserva el fixture activo para remediación/reintento.

## Orden de cleanup

El orden es obligatorio:

1. listar Storage del prefijo fixture-owned;
2. borrar objetos físicos por Storage API;
3. purgar DB/registry/identity mapping;
4. borrar Auth users sintéticos;
5. inspeccionar residuos en DB, Storage, registry, identity mapping y Auth.

Esto preserva la regla de V0.23.7/V0.23.8: borrar metadata nunca equivale a borrar el objeto físico.

Supabase documenta que la eliminación de archivos se realiza mediante `storage.from(bucket).remove(paths)`. También documenta que `auth.admin.deleteUser` requiere service-role y debe ejecutarse server-side.

## Cleanup fail-closed y retry

Un error en una fase no detiene automáticamente las fases posteriores.

El adapter intenta reducir residuos tanto como sea seguro y después exige una inspección independiente.

Si una operación falló, la inspección no pudo ejecutarse, devolvió conteos inválidos o quedan residuos, el fixture **no se olvida**. Se conserva en memoria para una remediación/reintento con el mismo lease.

Solo un reporte 0/0/0/0/0 elimina el fixture del registro activo. Incluso entonces su `fixtureId` permanece en el conjunto histórico consumido y no puede reasignarse.

## Lease integrity

Cleanup solo acepta un lease que coincida estructuralmente con el lease asignado para ese `fixtureId`.

Por tanto:

- una copia serializada válida puede usarse para retry;
- un lease con namespace/subject/scope/timestamps alterados no puede emitir operaciones destructivas.

## DEV-only SQL support plane

Se añade:

`supabase/dev-fixtures/V0.23.22_PROVIDER_FIXTURE_SUPPORT.sql`

Deliberadamente **no** vive bajo `supabase/migrations/`.

Expone dos funciones exclusivamente para `service_role`:

- `vivienda_dev_fixture_purge`
- `vivienda_dev_fixture_residue`

Ambas requieren:

- `p_project_label = 'vivienda-dev'`;
- namespace `vivienda_dev_*` válido;
- exactamente owner + intruder sintéticos derivados del mismo token.

El SQL:

- puede borrar roots de Case del namespace y dejar actuar las cascadas canónicas;
- puede borrar identity mappings sintéticos;
- puede contar residuo DB/registry/identity;
- **no** borra `storage.objects`;
- **no** borra `auth.users`.

Storage y Auth siguen siendo responsabilidad de sus APIs administrativas.

## Separación de autoridad

V0.23.22 no importa:

- `runtime.server.ts`;
- `activated-runtime.ts`;
- `activation-preflight.ts`.

No produce activation facts.

Regla:

**Supabase fixture adapter PASS ≠ Supabase provider parity PASS ≠ activation preflight PASS ≠ deployment authorization.**

## Consecuencias

### Positivas

- el lifecycle provider-neutral ya tiene una traducción Supabase concreta;
- los borrados destructivos quedan estrictamente namespace-scoped;
- ningún namespace consumido puede reabrirse por colisión del generador;
- Storage y Auth respetan su orden físico/referencial;
- cleanup parcial conserva capacidad de remediation;
- las utilidades SQL DEV no entran al migration chain canónico;
- el siguiente slice puede implementar el control plane concreto sin rediseñar lifecycle.

### Costos

- el conjunto de IDs consumidos crece durante la vida de la lifecycle, deliberadamente;
- todavía falta una implementación real de `SupabaseProviderFixtureAdminPort`;
- el SQL DEV deberá instalarse manual y exclusivamente en `vivienda-dev`;
- un provider real sigue bloqueado mientras no exista un proyecto DEV dedicado y 14/14 calificado.

## Fuera de alcance

- crear `vivienda-dev`;
- aplicar el SQL DEV a un proyecto;
- instalar/usar service-role credentials;
- ejecutar Auth Admin o Storage live;
- implementar todavía `EvidenceRuntimeProviderCandidateProbe`;
- activar runtime público;
- STAGING/PROD;
- deployment o merge.
