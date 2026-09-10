# ADR-0019 · Supabase DEV Fixture Admin Control Plane

- **Estado:** Accepted for V0.23.23
- **Fecha:** 2026-09-10
- **Padre:** V0.23.22 · Supabase Provider Fixture Adapter

## Contexto

V0.23.22 congeló el lifecycle destructivo específico de Supabase detrás de `SupabaseProviderFixtureAdminPort`, pero dejó deliberadamente pendiente la traducción concreta a las primitivas administrativas del proveedor.

El riesgo del siguiente paso era crear un cliente que, por tener acceso server-side privilegiado, pudiera:

- ejecutarse sobre un proyecto que no fuera el DEV dedicado;
- considerar suficiente una etiqueta local `vivienda-dev` sin exigir la calificación V0.23.14;
- aceptar identidades no sintéticas;
- listar o borrar Storage fuera del namespace del fixture;
- certificar cero residuos a partir de una enumeración incompleta;
- propagar diagnósticos sensibles del proveedor;
- mezclar el control plane de pruebas con el runtime público.

## Decisión

Se introduce `SupabaseDevFixtureAdminControlPlane`, implementación concreta de `SupabaseProviderFixtureAdminPort` sobre una forma mínima e inyectada de cliente Supabase server-side.

El control plane no crea el cliente, no lee variables de entorno y no contiene credenciales. Su constructor requiere simultáneamente:

1. `projectLabel === 'vivienda-dev'`;
2. una `DevEnvironmentQualificationDecision` de V0.23.14 con estado `qualified_for_staging_candidate`;
3. `devEnvironmentVerified === true`;
4. `verifiedRequirementCount === totalRequirementCount`;
5. `liveRuntimeAuthorized === false`.

La etiqueta local nunca sustituye la calificación 14/14.

## Auth Admin

El control plane implementa:

- creación de owner/intruder sintéticos mediante `auth.admin.createUser`;
- `email_confirm: true` para evitar flujos de correo reales en fixtures;
- validación estricta de namespace, `subjectRef`, rol y email antes de I/O;
- borrado idempotente mediante `auth.admin.deleteUser`;
- comprobación residual mediante `auth.admin.getUserById`.

Un `user_not_found` se interpreta únicamente como ausencia ya confirmada. Cualquier otro error falla cerrado.

## Identity binding y RPC DEV

El binding de identidad reutiliza el RPC canónico:

`vivienda_persist_upsert_identity`

La purga y el conteo de residuos usan exclusivamente las funciones DEV-only introducidas en V0.23.22:

- `vivienda_dev_fixture_purge`
- `vivienda_dev_fixture_residue`

Todos los inputs vuelven a validarse en TypeScript antes de emitir RPC, además de los guards redundantes del SQL DEV.

## Storage enumeration

El control plane no acepta un listado plano arbitrario.

Para `quarantine/upl_<namespace>_`:

1. lista el directorio `quarantine` con búsqueda por el prefijo exacto;
2. acepta únicamente carpetas raíz cuyo nombre comience por ese prefijo;
3. recorre la jerarquía esperada `intent -> evidence -> object`;
4. exige que cada archivo final cumpla el path canónico;
5. rechaza archivos a profundidad inesperada, carpetas demasiado profundas, segmentos inválidos o duplicados;
6. pagina con límites explícitos.

Si se alcanzan 100 páginas de 100 entradas sin observar una página terminal, la enumeración falla con `enumeration_limit_exceeded`. Una enumeración posiblemente incompleta nunca puede producir evidencia de cero residuos.

## Storage deletion

El borrado físico:

- solo acepta bucket `vivienda-evidence`;
- exige paths canónicos;
- rechaza duplicados;
- agrupa `remove()` en batches de 100 objetos.

La lifecycle V0.23.22 sigue siendo responsable de demostrar que esos paths pertenecen al prefijo exacto del fixture antes de llamar al control plane.

## Residue report

`inspectFixtureResidue()` combina tres fuentes independientes:

1. DB/registry/identity mediante `vivienda_dev_fixture_residue`;
2. Storage físico mediante enumeración real del prefijo;
3. Auth mediante `getUserById` para owner e intruder.

Los conteos de DB deben ser enteros seguros no negativos. Un payload malformado falla antes de consultar Storage/Auth y nunca se convierte en un reporte limpio.

## Error boundary

Todos los errores externos se reducen a códigos estables:

- `invalid_configuration`
- `invalid_input`
- `provider_error`
- `invalid_provider_response`
- `enumeration_limit_exceeded`

Mensajes, hints, códigos internos y secretos del proveedor no se propagan al caller.

## Separación de autoridad

V0.23.23 no importa ni construye:

- `runtime.server.ts`;
- `activated-runtime.ts`;
- `activation-preflight.ts`;
- variables `process.env`;
- URL/key de Supabase.

Produce cero activation facts.

Regla:

**DEV 14/14 ≠ Admin Control Plane PASS ≠ Fixture Lifecycle PASS ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Consecuencias

### Positivas

- V0.23.22 ya tiene traducción concreta a Auth/Storage/RPC;
- el control plane privilegiado no puede construirse con una calificación DEV incompleta;
- Storage queda sujeto a enumeración y borrado verificables;
- residue combina DB, Storage y Auth en lugar de inferir uno desde otro;
- el siguiente slice puede construir el provider candidate probe sin rediseñar la capa administrativa.

### Costos

- todavía no existe un wiring real de cliente/credenciales;
- no se ha ejecutado ninguna operación contra Supabase;
- la enumeración está intencionalmente limitada y falla si el volumen excede el safety cap;
- sigue siendo necesario provisionar y calificar un proyecto `vivienda-dev` dedicado antes de cualquier ejecución real.

## Fuera de alcance

- provisioning o billing;
- crear/reutilizar proyectos Supabase;
- aplicar migraciones o SQL DEV;
- secrets live;
- ejecutar Auth/Storage/RPC live;
- implementar el provider candidate probe completo;
- provider parity real;
- runtime público;
- STAGING/PROD;
- deployment o merge del stack.
