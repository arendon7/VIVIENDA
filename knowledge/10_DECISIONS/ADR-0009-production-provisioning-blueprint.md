# ADR-0009 — Production Provisioning Blueprint

Status: accepted for V0.23.13

## Contexto

V0.23.12 creó un preflight ejecutable para impedir un runtime live de evidencia parcialmente configurado. Ese contrato responde cuándo el runtime **puede entrar en activación controlada**, pero no decide todavía cómo deben organizarse los entornos ni cómo se promueve infraestructura entre ellos.

El siguiente riesgo arquitectónico es confundir cualquiera de estas situaciones:

- un plan de infraestructura escrito;
- recursos creados;
- recursos configurados;
- recursos verificados;
- un entorno promovible;
- un runtime autorizable para datos reales.

Estas situaciones no son equivalentes.

## Decisión

VIVIENDA adopta tres entornos explícitos y secuenciales:

`development → staging → production`

No existe promoción directa `development → production`.

Cada entorno debe usar infraestructura dedicada a VIVIENDA y aislada de los demás entornos. No se reutiliza infraestructura perteneciente a otros productos.

### Política de datos

- DEV: `synthetic_only`
- STAGING: `synthetic_only`
- PROD: `real_data_after_controlled_activation`

La existencia de PROD no autoriza por sí sola datos reales. El runtime de evidencia permanece fail-closed hasta superar la activación controlada.

### Política de secretos

Los secretos son server-side y separados por entorno. No se almacenan en el repositorio, no se transportan en el blueprint y no se exponen al navegador.

### Mutaciones productivas

No se consideran aceptables cambios manuales productivos fuera de una ruta trazable de migración/configuración. El blueprint requiere estrategia de migraciones y rollback/restore antes de comenzar provisión.

## Plan readiness ≠ runtime readiness

V0.23.13 introduce estados para decisiones de planificación:

- `undecided`
- `defined`
- `approved`

Solo 20/20 decisiones `approved` producen:

`approved_for_controlled_provisioning`

Esto significa únicamente que el plan está suficientemente decidido para comenzar provisión de recursos.

No produce ni modifica `EvidenceRuntimeActivationFacts` de V0.23.12.

## 20 decisiones obligatorias

1. proyectos dedicados por entorno;
2. owner de costo/presupuesto;
3. región primaria;
4. secret store y rotación;
5. estrategia Auth/identity;
6. estrategia de migraciones;
7. rollback/restore;
8. runbook de seguridad;
9. Storage privado + retención;
10. eliminación física;
11. rate-limit backend;
12. audit sink + redacción;
13. trusted origins;
14. monitoring/alerting;
15. incident owner + kill switch;
16. creación real de Case;
17. autorización de datos por finalidad;
18. acuerdo de servicio cuando aplica;
19. progressive cutover;
20. validación post-cutover.

## Gate DEV → STAGING

La promoción requiere:

- blueprint aprobado;
- DEV verificado;
- aislamiento de STAGING verificado;
- rollback ensayado;
- backup/restore verificado;
- revisión de seguridad completa.

STAGING sigue usando datos sintéticos.

## Gate STAGING → PROD

Además de los requisitos anteriores, requiere:

- aprobación explícita de costo;
- incident owner asignado;
- kill switch verificado;
- V0.23.12 en `ready_for_controlled_activation` (`runtimeMayActivate=true`).

Incluso con este gate verde, la promoción significa **ready for controlled promotion**, no que ya exista tráfico real ni evidencia real.

## Cutover

El cutover productivo debe ser progresivo, reversible y observable. Debe disponer de criterios explícitos de:

- entrada;
- pausa;
- rollback;
- validación post-cutover.

El kill switch debe permitir volver al runtime fail-closed sin aceptar nuevos uploads.

## Consecuencias

### Positivas

- separa plan, provisión, verificación y activación;
- evita reutilizar infraestructura accidentalmente;
- impide DEV→PROD;
- obliga a ensayar recovery antes de producción;
- conserva V0.23.12 como autoridad final del runtime live;
- permite decidir costos y región antes de crear recursos pagos.

### Costos

- más disciplina operativa;
- tres entornos implicarán recursos separados cuando se provisionen;
- las promociones requieren evidencia y ownership explícitos.

## No decidido por este ADR

- proveedor o plan comercial definitivo;
- región concreta;
- presupuesto concreto;
- días exactos de retención;
- nombres de proyectos/buckets/secrets;
- credenciales;
- fechas de cutover;
- creación de infraestructura externa.

Esas decisiones deben resolverse mediante el blueprint antes de provisionar recursos.

## Truth boundary

Un blueprint 20/20 aprobado no significa que exista infraestructura.

Un entorno provisionado no significa que esté verificado.

Un STAGING verificado no significa que PROD esté habilitado.

Un gate STAGING→PROD verde no significa que haya ocurrido cutover.

Un cutover técnico no significa que exista un Case, consentimiento, servicio contratado, upload, evidencia verificada, representación profesional ni decisión de tercero.
