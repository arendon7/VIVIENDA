# V0.23.15 · Provider Capacity Preflight

## Objetivo

Cerrar una brecha descubierta al intentar provisionar el primer `vivienda-dev` real:

> **autorización y costo vigente no bastan; el proveedor debe tener capacidad disponible para ejecutar la creación.**

Este slice introduce un gate server-side puro y determinista entre V0.23.14 y cualquier `create_project` externo.

## Posición en la cadena

1. V0.23.13 — Production Provisioning Blueprint
2. V0.23.14 — DEV Provisioning Authorization
3. **V0.23.15 — Provider Capacity Preflight**
4. provider create-project call
5. V0.23.14 — DEV Environment Qualification
6. futuros gates STAGING/PROD

## API de dominio

Archivo:

`server/evidence-api/provider-capacity-preflight.ts`

Función principal:

`evaluateDevProviderCapacityPreflight(authorization, facts)`

### Entrada padre

Recibe `DevProvisioningAuthorizationDecision`.

Si:

`authorization.projectCreationMayBeRequested !== true`

el estado queda:

`authorization_blocked`

aunque el proveedor aparentemente tenga cupo y costo cero.

## Facts

`DevProviderCapacityFacts` contiene:

- `organizationIdentity`
- `capacityObservation`
- `projectCapacity`
- `costQuote`
- `costConfirmation`
- `quotedProjectCreationCost`

### Estados verificables

Para organización, capacidad observada y pricing:

- `missing`
- `stale`
- `verified`

Para capacidad:

- `unknown`
- `available`
- `exhausted`

## Estados de decisión

### `authorization_blocked`

V0.23.14 no permite todavía solicitar creación.

### `capacity_unverified`

La autorización padre existe, pero falta una observación vigente de organización, capacidad o pricing.

### `capacity_exhausted`

La cuota fue observada de forma vigente y el proveedor reportó que no hay capacidad para otro proyecto activo.

### `ready_for_provider_creation`

Único estado donde:

`providerCreationMayExecute = true`

Requiere simultáneamente:

- V0.23.14 aprobado;
- organización verificada;
- capacidad observada y vigente;
- `projectCapacity = available`;
- cotización vigente;
- confirmación vigente del costo.

## Regla crítica: costo 0

La siguiente combinación debe permanecer bloqueada:

- costo cotizado: `0`
- cost quote: `verified`
- cost confirmation: `verified`
- capacity observation: `verified`
- project capacity: `exhausted`

Resultado:

- state: `capacity_exhausted`
- `providerCreationMayExecute = false`

Esto reproduce exactamente la frontera que apareció contra el proveedor real.

## Freshness

No existe caching implícito de autorización comercial.

Si la capacidad o el precio se clasifican como `stale`, el gate vuelve a bloquear.

V0.23.15 evita hardcodear una ventana temporal única porque la vigencia puede depender del proveedor. El adaptador futuro deberá decidir cuándo una observación deja de ser actual y mapearla a `stale`.

## No inferencia desde plan o conteo

El core no codifica reglas como:

`Free => máximo 2 proyectos`

Aunque esa condición fue observada en el proveedor durante esta iteración, no pertenece al contrato de dominio porque puede cambiar.

El adaptador debe consultar/observar el proveedor y entregar una de estas conclusiones:

- available
- exhausted
- unknown

## No efectos laterales

El evaluator:

- no llama Supabase;
- no crea proyectos;
- no pausa proyectos;
- no modifica billing;
- no crea organizaciones;
- no aplica migraciones;
- no almacena secrets;
- no habilita runtime.

## No facts derivados

`providerCapacityProducesNoEnvironmentQualificationFacts()` → `{}`

`providerCapacityProducesNoRuntimeActivationFacts()` → `{}`

Una cuota verde no puede satisfacer V0.23.14 Qualification ni V0.23.12 Runtime Activation.

## Bloqueadores tipados

- `parent_authorization_incomplete`
- `organization_identity_unverified`
- `capacity_observation_unverified`
- `project_capacity_unknown`
- `project_capacity_exhausted`
- `cost_quote_unverified`
- `cost_confirmation_unverified`

## Tests

Archivo:

`server/evidence-api/provider-capacity-preflight.test.ts`

Cobertura:

1. parent authorization incompleta falla cerrado;
2. costo cero no implica cupo;
3. capacidad agotada bloquea incluso con costo cero confirmado;
4. observación de cuota stale bloquea;
5. cost quote stale bloquea independientemente del cupo;
6. cost confirmation faltante bloquea independientemente del precio cero;
7. solo todos los gates actuales permiten ejecutar la llamada del proveedor;
8. facts vacíos son fail-closed;
9. capacity preflight no produce qualification/runtime facts.

## Hallazgo operacional de referencia

Durante la operación posterior a V0.23.14:

- la organización seleccionada fue observada;
- el costo de proyecto devuelto por el provider fue 0 mensual;
- el usuario autorizó la creación;
- el proveedor bloqueó `create_project` por capacidad Free agotada;
- no se creó ningún recurso;
- no se incurrió costo.

La inspección read-only posterior no encontró un proyecto existente que pueda pausarse de manera automática y segura.

## Aceptación

V0.23.15 se considera funcionalmente listo cuando:

- TypeScript PASS;
- Domain tests PASS;
- Build PASS;
- los journeys E2E existentes permanecen verdes sin cambios de comportamiento;
- no hay mutaciones externas asociadas al slice.

## Fuera de alcance

- UI pública;
- crear proyecto Supabase;
- pausar proyecto Supabase;
- upgrade de plan;
- nueva organización;
- migraciones externas;
- Auth/Storage live;
- evidencia real;
- STAGING/PROD.
