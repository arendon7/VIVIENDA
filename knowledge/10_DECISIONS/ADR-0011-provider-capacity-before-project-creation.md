# ADR-0011 · Provider capacity before project creation

## Estado

Accepted for V0.23.15.

## Contexto

V0.23.14 separó correctamente:

- blueprint de provisión aprobado;
- autorización explícita para solicitar la creación de DEV;
- proyecto realmente creado;
- entorno DEV calificado;
- runtime live.

Al ejecutar el siguiente paso real contra Supabase apareció una frontera adicional que no estaba modelada:

> **costo confirmado no implica capacidad disponible para crear otro proyecto.**

La organización conectada devolvió una cotización vigente de creación con costo 0 mensual y el usuario autorizó continuar. Sin embargo, el proveedor rechazó la creación porque la capacidad Free para proyectos activos estaba agotada.

No se creó ningún proyecto y no se generó ningún cargo.

## Decisión

Introducir un preflight de capacidad del proveedor entre V0.23.14 y cualquier llamada externa de creación.

Flujo obligatorio:

`V0.23.13 blueprint → V0.23.14 authorization → V0.23.15 provider-capacity preflight → provider create_project → V0.23.14 qualification`

V0.23.15 no reabre ni debilita los gates anteriores.

## Estados

`DevProviderCapacityPreflightState`:

- `authorization_blocked`
- `capacity_unverified`
- `capacity_exhausted`
- `ready_for_provider_creation`

Solo `ready_for_provider_creation` puede producir:

`providerCreationMayExecute = true`

## Hechos mínimos

El preflight exige observar por separado:

1. identidad vigente de la organización;
2. observación vigente de capacidad/cuota;
3. resultado explícito de capacidad (`available`, `exhausted`, `unknown`);
4. cotización vigente;
5. confirmación vigente del costo.

Los estados de observación son:

- `missing`
- `stale`
- `verified`

`stale` nunca equivale a `verified`.

## Regla de precio

`quotedProjectCreationCost = 0` no concede ninguna capacidad especial.

Una creación con costo cero continúa bloqueada cuando:

- la cuota no fue observada;
- la observación está vencida;
- el proveedor reporta capacidad agotada;
- la organización no fue verificada;
- la cotización o su confirmación no son vigentes;
- V0.23.14 no está aprobado.

## Regla de capacidad

No se calcula capacidad únicamente a partir del plan nominal o del número histórico de proyectos.

La fuente canónica es una observación vigente del proveedor que permita clasificar el contexto como:

- `available`
- `exhausted`
- `unknown`

Esto evita hardcodear límites comerciales que pueden cambiar por plan, cuenta, organización o política del proveedor.

## No reutilización automática

Capacidad agotada no autoriza:

- pausar otro proyecto;
- borrar un proyecto;
- reutilizar un proyecto de otro producto;
- renombrar infraestructura existente;
- crear otra organización;
- subir de plan;
- aceptar un costo distinto.

Cada una de esas operaciones requiere una decisión separada.

## Cero bridge semántico

Un preflight verde solo significa:

> la llamada de creación al proveedor puede ejecutarse en este momento bajo las condiciones observadas.

No significa:

- que el proyecto exista;
- que DEV esté calificado;
- que migraciones estén aplicadas;
- que Auth/Storage estén activados;
- que haya datos reales;
- que el runtime live esté autorizado.

Por eso:

- `providerCapacityProducesNoEnvironmentQualificationFacts()` retorna `{}`;
- `providerCapacityProducesNoRuntimeActivationFacts()` retorna `{}`.

## Evidencia operacional que originó la decisión

La inspección read-only del proveedor mostró dos proyectos `ACTIVE_HEALTHY` ocupando la capacidad Free observada.

No se pausó ninguno.

Uno de ellos presenta actividad/data operacional sustancial y no es candidato seguro de pausa. El otro no pudo clasificarse como seguro de pausar porque la base no respondió a probes read-only y su estado de control plane continúa activo.

La política resultante es conservadora: **la falta de evidencia suficiente nunca se convierte en permiso de mutación**.

## Consecuencias

### Positivas

- evita repetir una llamada de creación que el proveedor ya sabe que bloqueará;
- separa pricing de quota;
- evita inferir límites comerciales desde supuestos locales;
- preserva no-reuse y no-destructive-by-default;
- mantiene DEV, qualification y runtime como contratos separados.

### Costos

- añade un gate más antes de provisioning real;
- exige refrescar cuota y precio inmediatamente antes de crear;
- algunos proveedores pueden requerir APIs distintas para capacidad y pricing.

## Fuera de alcance

- crear `vivienda-dev`;
- pausar proyectos existentes;
- cambiar plan Supabase;
- crear organizaciones;
- aplicar migraciones;
- activar Auth/Storage;
- STAGING/PROD;
- uploads reales;
- OCR;
- runtime live.
