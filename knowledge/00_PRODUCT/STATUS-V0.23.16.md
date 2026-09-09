# STATUS · V0.23.16 · Provider Capacity Recovery Decision

## Estado

**Candidato de freeze documental.**

Rama:

`product/provider-capacity-recovery-v0.23.16`

Base inmediata:

`product/provider-capacity-preflight-v0.23.15`

Freeze padre V0.23.15:

`950b544e9ea845619835c368cdcec41a2a28a980`

Head funcional/documental previo a este STATUS:

`bdef345d27f39d1a064318dd2ecd7febe75d3863`

## Pregunta de producto/operación

Después de que V0.23.15 confirme de forma vigente que la capacidad del proveedor está agotada, ¿cómo puede el sistema representar una estrategia de recuperación sin seleccionar automáticamente una mutación riesgosa ni convertirla en permiso implícito para crear `vivienda-dev`?

## Respuesta V0.23.16

Se introduce un contrato explícito de **Provider Capacity Recovery Decision**.

La recuperación solo aplica cuando V0.23.15 entrega:

`state = capacity_exhausted`

No existe estrategia por defecto.

Las estrategias posibles son:

1. `defer_provisioning`
2. `pause_existing_project`
3. `alternate_organization`
4. `plan_upgrade`

Toda estrategia mantiene siempre:

`projectCreationMayExecute = false`

Por tanto, resolver la recuperación de capacidad **no equivale a autorización de creación**. Tras cualquier cambio relevante debe repetirse V0.23.15 con una observación fresca de capacidad, cotización y confirmación de costo.

## Estados del contrato

`ProviderCapacityRecoveryDecisionState`:

- `recovery_not_applicable`
- `awaiting_explicit_strategy`
- `deferred`
- `recovery_blocked`
- `authorized_for_recovery_mutation`
- `ready_for_capacity_recheck`

## Fronteras por estrategia

### 1. Diferir provisioning

`defer_provisioning`:

- no ejecuta mutación externa;
- no requiere recheck inmediato;
- no crea proyecto;
- deja el provisioning diferido de forma explícita.

### 2. Pausar un proyecto existente

`pause_existing_project` solo puede llegar a:

`authorized_for_recovery_mutation`

si todos los siguientes hechos están presentes:

- proyecto candidato identificado explícitamente;
- `candidateProjectPauseSafety = verified_safe_to_pause`;
- impacto operativo revisado y aprobado;
- ruta de restore verificada;
- aprobación explícita separada para pausar.

Estados `unknown`, evidencia insuficiente o una revisión meramente propuesta bloquean la pausa.

La autorización previa para crear VIVIENDA DEV **no autoriza pausar infraestructura de otro producto**.

### 3. Organización alternativa

`alternate_organization` requiere:

- organización alternativa identificada;
- selección explícitamente aprobada;
- capacidad observada como `available`;
- cotización verificada para esa organización;
- costo explícitamente aprobado.

Incluso con todo ello, el estado resultante es:

`ready_for_capacity_recheck`

No se ejecuta una mutación externa desde este contrato y no se habilita `create_project` directamente.

### 4. Upgrade de plan

`plan_upgrade` solo puede llegar a:

`authorized_for_recovery_mutation`

si existen:

- cotización vigente/verificada del upgrade;
- aprobación explícita del billing owner;
- aprobación explícita separada para el cambio de plan.

El hecho de que un upgrade pudiera liberar capacidad no autoriza por sí solo la mutación de billing.

Después de cualquier upgrade ejecutado, V0.23.15 debe repetirse con observación fresca.

## Regla de no inferencia

Ninguna de estas señales es suficiente para elegir o ejecutar una estrategia automáticamente:

- el proveedor rechazó `create_project`;
- el costo de proyecto fue 0;
- existe otro proyecto en la organización;
- una Edge Function parece retirada;
- un proyecto está `ACTIVE_HEALTHY`;
- una base no respondió a un probe read-only;
- el usuario autorizó previamente crear `vivienda-dev`.

## Contexto operacional observado

El primer intento controlado de creación de `vivienda-dev` fue rechazado por falta de capacidad Free disponible.

La auditoría read-only posterior mostró:

- `superbid-deal-intelligence` contiene actividad y datos operativos sustanciales y no debe considerarse candidato automático de pausa;
- `greenatics-ops` permanece `ACTIVE_HEALTHY`; su Edge Function visible responde `retired`, pero probes DB terminaron por timeout. Esa evidencia no es suficiente para declararlo seguro de pausar.

No se pausó, eliminó, renombró ni reutilizó ningún proyecto Supabase.

## Relación con V0.23.15

V0.23.15 responde:

> ¿Existe capacidad vigente y suficiente para ejecutar la llamada de creación?

V0.23.16 responde:

> Si la capacidad está agotada, ¿qué estrategia explícita y segura puede prepararse para intentar recuperarla?

El flujo correcto es:

`V0.23.14 autorización DEV`
→ `V0.23.15 capacity preflight`
→ `capacity_exhausted`
→ `V0.23.16 recovery decision`
→ `mutación autorizada o selección de alternativa`
→ **nuevo V0.23.15 con facts frescos**
→ solo entonces, si corresponde, provider creation.

## Zero semantic bridge

Resolver capacidad no implica:

- proyecto Supabase creado;
- DEV provisionado;
- DEV calificado;
- migraciones aplicadas;
- Auth activado;
- Storage privado verificado;
- evidence runtime activado;
- Case real creado;
- consentimiento registrado;
- servicio aceptado;
- carga de documentos habilitada;
- STAGING o PROD habilitados.

## Archivos del slice antes de STATUS

1. `server/evidence-api/provider-capacity-recovery.ts`
2. `server/evidence-api/provider-capacity-recovery.test.ts`
3. `knowledge/10_DECISIONS/ADR-0012-provider-capacity-recovery-strategy.md`
4. `knowledge/60_ENGINEERING/PROVIDER-CAPACITY-RECOVERY-V0.23.16.md`

Este STATUS es el quinto archivo del slice.

## Verificación funcional previa al STATUS

Head:

`bdef345d27f39d1a064318dd2ecd7febe75d3863`

GitHub Actions run:

`34256825599`

Resultado:

- TypeScript — **PASS**
- Domain tests — **PASS**
- Build — **PASS**
- Playwright — **244/244 PASS**
- Remote Preview E2E — **SKIPPED por diseño**

Playwright reportó:

`244 passed (2.3m)`

## Invariantes de freeze

Antes de abrir el PR apilado, el SHA generado por este STATUS deberá repetir:

1. TypeScript PASS;
2. Domain tests PASS;
3. Build PASS;
4. Playwright 244/244 PASS;
5. Remote Preview E2E SKIPPED por diseño.

Después del freeze definitivo:

- no se añadirán commits;
- el PR será draft;
- su base será V0.23.15/#44, no `main`;
- el CI del merge ref deberá quedar verde;
- no se fusionará el stack.

## Fuera de alcance

- pausar un proyecto Supabase;
- actualizar un plan;
- crear una organización;
- crear `vivienda-dev`;
- ejecutar billing mutations;
- reutilizar infraestructura de otro producto;
- aplicar migraciones externas;
- configurar Auth o Storage live;
- activar el Evidence Runtime;
- almacenar datos reales;
- crear STAGING/PROD;
- fusionar PRs.

## Criterio de cierre

V0.23.16 queda cerrado únicamente cuando:

- este STATUS tenga freeze SHA propio;
- el freeze repita verify + 244 E2E;
- exista PR draft apilado sobre #44;
- `mergeable = true`;
- CI propio del PR pase verify + 244/244 E2E;
- se registre comentario final de freeze;
- no existan commits posteriores.
