# ADR-0012 · Provider capacity recovery strategy

## Estado

Accepted for V0.23.16.

## Contexto

V0.23.15 introdujo un preflight que distingue precio de capacidad del proveedor. El primer intento real de crear `vivienda-dev` demostró que la organización seleccionada podía devolver costo 0 y, aun así, rechazar la creación por capacidad agotada.

Una vez confirmado `capacity_exhausted`, aparecen varias opciones operativas posibles:

- diferir el provisioning;
- pausar un proyecto existente;
- utilizar otra organización;
- cambiar el plan de la organización actual.

Ninguna debe seleccionarse implícitamente. Algunas pueden afectar otros productos, otras pueden generar costo y todas modifican el contexto que V0.23.15 observó.

## Decisión

Introducir un contrato explícito de recuperación de capacidad después de V0.23.15.

Cadena:

`V0.23.15 capacity_exhausted → V0.23.16 recovery decision → recovery action/context change → V0.23.15 fresh recheck → provider create_project`

La recuperación nunca entrega permiso directo para `create_project`.

## Estrategias

`ProviderCapacityRecoveryStrategy`:

- `defer_provisioning`
- `pause_existing_project`
- `alternate_organization`
- `plan_upgrade`

No existe estrategia por defecto.

## Estados

`ProviderCapacityRecoveryDecisionState`:

- `recovery_not_applicable`
- `awaiting_explicit_strategy`
- `deferred`
- `recovery_blocked`
- `authorized_for_recovery_mutation`
- `ready_for_capacity_recheck`

## Regla de aplicabilidad

El recovery gate solo aplica si V0.23.15 entregó exactamente:

`capacity_exhausted`

Un capacity snapshot ausente, stale, unknown o ya available no autoriza una mutación de recuperación.

## Estrategia: defer

`defer_provisioning` es siempre no destructiva.

Resultado:

- `state = deferred`
- `externalMutationMayExecute = false`
- `capacityRecheckRequired = false`
- `projectCreationMayExecute = false`

## Estrategia: pause existing project

Requiere simultáneamente:

1. candidato identificado explícitamente;
2. `candidateProjectPauseSafety = verified_safe_to_pause`;
3. impacto revisado y aprobado;
4. ruta de restore verificada;
5. aprobación explícita de pausa.

`unknown` nunca se interpreta como seguro.

La auditoría read-only realizada antes de este ADR no produjo ningún candidato que cumpla estas condiciones. Por tanto, el estado operacional actual no permite pausar automáticamente ningún proyecto.

Si todos los controles futuros llegaran a cumplirse:

- `externalMutationMayExecute = true`
- `capacityRecheckRequired = true`
- `projectCreationMayExecute = false`

La pausa, incluso autorizada, solo cambia el contexto; V0.23.15 debe observar nuevamente al proveedor.

## Estrategia: alternate organization

Requiere:

1. organization id explícito;
2. selección aprobada;
3. capacidad observada como `available`;
4. cost quote verificado;
5. cost approval explícito.

No es una mutación destructiva del proveedor desde este contrato.

Cuando está completa:

- `state = ready_for_capacity_recheck`
- `externalMutationMayExecute = false`
- `capacityRecheckRequired = true`
- `projectCreationMayExecute = false`

La nueva organización debe pasar V0.23.15 como contexto fresco.

## Estrategia: plan upgrade

Requiere:

1. cotización de upgrade verificada;
2. aprobación del billing owner;
3. aprobación explícita del upgrade.

Solo entonces puede existir:

`externalMutationMayExecute = true`

Pero:

`projectCreationMayExecute = false`

Después del upgrade se debe volver a consultar capacidad y pricing a través de V0.23.15.

## No hardcode de precios o planes

V0.23.16 no codifica:

- precio Pro;
- número de proyectos incluidos;
- límites Free;
- reglas comerciales de Supabase.

Esas condiciones cambian y deben observarse en el momento de la decisión.

## No destructive inference

Se prohíbe tratar cualquiera de estas señales como permiso para pausar:

- nombre del proyecto;
- función marcada retired;
- timeout de base de datos;
- baja actividad aparente;
- fecha de creación;
- existencia de otro backup;
- necesidad de liberar cuota para VIVIENDA.

La seguridad de pausa debe estar verificada positivamente.

## Recheck obligatorio

Toda estrategia que cambie el contexto de capacidad debe terminar en:

`capacityRecheckRequired = true`

Antes de cualquier nuevo `create_project` debe repetirse V0.23.15 con observaciones actuales.

## Consecuencias

### Positivas

- convierte un bloqueo del proveedor en opciones operativas tipadas;
- evita elegir automáticamente la opción más destructiva o costosa;
- preserva la prioridad de otros productos activos;
- separa autoridad de recuperación de autoridad de creación;
- fuerza revalidación de cuota y precio después de cualquier cambio.

### Costos

- agrega una decisión previa adicional;
- una pausa segura requiere auditoría operacional real;
- un upgrade requiere pricing/billing approval actualizados;
- una organización alternativa requiere su propio capacity preflight.

## Fuera de alcance

- ejecutar pause;
- ejecutar upgrade;
- crear organización;
- crear `vivienda-dev`;
- elegir automáticamente un proyecto existente;
- migraciones;
- Auth/Storage;
- runtime live.
