# STATUS · V0.23.15

## Slice

**Provider Capacity Preflight — cost approval does not imply project quota**

## Estado

Functional/documented head verified. Pending final STATUS recertification and stacked draft PR.

## Problema de producto/plataforma

V0.23.14 permitió llegar de forma controlada al primer intento real de creación de `vivienda-dev`.

La secuencia ejecutada fue correcta:

1. organización seleccionada explícitamente;
2. costo vigente consultado;
3. costo observado: 0 mensual;
4. usuario confirmó continuar bajo ese costo;
5. se solicitó creación de un proyecto dedicado `vivienda-dev`;
6. el proveedor rechazó la operación porque la capacidad Free para proyectos activos estaba agotada.

No se creó ningún recurso y no hubo cargo.

El fallo reveló una frontera que faltaba modelar:

> **cost quote/current approval ≠ provider capacity available ≠ project creation executable**

## Solución V0.23.15

Se introduce un preflight puro entre V0.23.14 y cualquier llamada externa `create_project`.

Cadena canónica:

`V0.23.13 blueprint → V0.23.14 DEV authorization → V0.23.15 provider capacity → provider create_project → V0.23.14 DEV qualification`

## Dominio

Archivo:

`server/evidence-api/provider-capacity-preflight.ts`

Función:

`evaluateDevProviderCapacityPreflight(...)`

Estados:

- `authorization_blocked`
- `capacity_unverified`
- `capacity_exhausted`
- `ready_for_provider_creation`

Únicamente:

`ready_for_provider_creation`

puede entregar:

`providerCreationMayExecute = true`

## Facts obligatorios

- organización verificada;
- observación vigente de capacidad;
- capacidad explícita `available`;
- cotización vigente;
- confirmación vigente del costo;
- autorización padre V0.23.14 vigente.

Estados de observación:

- `missing`
- `stale`
- `verified`

Capacidad:

- `unknown`
- `available`
- `exhausted`

## Regla crítica de costo cero

Un costo de creación `0` no afecta la política de capacidad.

Si:

- quote = verified;
- confirmation = verified;
- quoted cost = 0;
- capacity observation = verified;
- project capacity = exhausted;

entonces:

- state = `capacity_exhausted`;
- `providerCreationMayExecute = false`.

## No hardcode de límites comerciales

El core no incorpora reglas estáticas tipo:

`Free = 2 proyectos`

El límite observado fue un hecho operacional del proveedor, no un contrato estable del dominio.

La integración futura debe observar al proveedor y mapear el resultado a:

- available;
- exhausted;
- unknown.

## Audit read-only de los proyectos activos

Después del bloqueo de creación se inspeccionó la capacidad actual sin mutaciones.

### `superbid-deal-intelligence`

No es candidato seguro para pausar.

La inspección observó actividad/data material, entre otros:

- aproximadamente 109k auction snapshots;
- aproximadamente 28k collection runs;
- aproximadamente 945 auction lots;
- múltiples tablas operativas y de provenance/alerting.

### `greenatics-ops`

Tampoco se clasificó como seguro para pausar automáticamente.

- control plane: `ACTIVE_HEALTHY`;
- dos probes read-only de base terminaron por timeout;
- existe una Edge Function visible activa cuyo código responde `retired`.

La combinación no permite concluir que el proyecto sea prescindible.

Regla aplicada:

> **falta de evidencia suficiente ≠ permiso de mutación.**

No se pausó, eliminó, renombró ni reutilizó ningún proyecto.

## Zero semantic bridge

Incluso un preflight de capacidad verde:

- no crea el proyecto;
- no califica DEV;
- no aplica migraciones;
- no verifica Auth/Storage;
- no habilita datos reales;
- no habilita runtime live.

Helpers:

- `providerCapacityProducesNoEnvironmentQualificationFacts()` → `{}`
- `providerCapacityProducesNoRuntimeActivationFacts()` → `{}`

## Tests

Archivo:

`server/evidence-api/provider-capacity-preflight.test.ts`

Cubre:

1. parent authorization incompleta;
2. costo cero no implica cuota;
3. capacity exhausted bloquea aun con costo cero;
4. observación stale bloquea;
5. quote stale bloquea;
6. confirmation faltante bloquea;
7. solo autorización + organización + cuota + pricing vigentes permiten provider call;
8. snapshot vacío falla cerrado;
9. capacity no produce qualification/runtime facts.

## Documentación

- `knowledge/10_DECISIONS/ADR-0011-provider-capacity-before-project-creation.md`
- `knowledge/60_ENGINEERING/PROVIDER-CAPACITY-PREFLIGHT-V0.23.15.md`

## Verificación funcional previa al STATUS

Head:

`09830e708417b1219f0a6e1a9abc6eb54fdec9e6`

Run:

`34254908404`

Resultado:

- TypeScript — PASS
- Domain tests — PASS
- Build — PASS
- Borrower journey E2E — PASS
- Playwright — **244/244 PASS**
- Remote Preview E2E — SKIPPED por diseño

## Cambios de runtime/producto

Ninguno.

No se modifican:

- UI;
- rutas;
- `runtime.server.ts`;
- API HTTP;
- migraciones;
- Supabase projects;
- Auth;
- Storage;
- Evidence upload;
- OCR.

## Infraestructura externa

No se creó `vivienda-dev` debido a capacity exhaustion reportada por el proveedor.

No se incurrió costo.

No se pausó ningún proyecto existente.

No se cambió plan ni organización.

## Fuera de alcance

- elegir un proyecto para pausar;
- upgrade de plan;
- crear organización adicional;
- crear `vivienda-dev` hasta recuperar capacidad verificada;
- aplicar migraciones;
- calificar DEV;
- STAGING/PROD;
- datos reales;
- runtime live.

## Próximo gate externo

Antes de reintentar creación debe existir una observación vigente con:

`projectCapacity = available`

Eso puede provenir de una decisión externa separada, por ejemplo capacidad liberada o un contexto de plan/organización distinto. V0.23.15 no autoriza por sí mismo ninguna de esas mutaciones.
