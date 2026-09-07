# V0.23.13 — Production Provisioning Blueprint

## Objetivo

Definir una arquitectura operativa verificable para provisionar VIVIENDA en DEV, STAGING y PROD sin crear todavía recursos externos ni activar el runtime live de evidencia.

La finalidad del slice es convertir en contrato ejecutable la transición entre:

1. arquitectura provider-ready;
2. plan aprobado;
3. recursos provisionados;
4. recursos verificados;
5. promoción de entorno;
6. activación controlada del runtime.

Estas etapas no se consideran equivalentes.

## Contrato ejecutable

Archivo:

`server/evidence-api/provisioning-blueprint.ts`

### Entornos canónicos

- `development`
- `staging`
- `production`

Secuencia obligatoria:

`development → staging → production`

Cualquier transición distinta devuelve `invalid_transition`.

## Política por entorno

### Development

- proyecto dedicado;
- datos sintéticos únicamente;
- secrets server-side;
- runtime de evidencia fail-closed por defecto;
- no existe mutación productiva manual.

### Staging

- proyecto dedicado e independiente de DEV/PROD;
- datos sintéticos únicamente;
- configuración production-like;
- lugar obligatorio para ensayar migraciones, rollback, restore, seguridad y kill switch;
- runtime de evidencia fail-closed por defecto.

### Production

- proyecto dedicado;
- datos reales únicamente después de activación controlada;
- secrets server-side;
- runtime fail-closed por defecto;
- cambios únicamente por ruta trazable;
- cutover progresivo y reversible.

## Readiness del blueprint

Cada decisión de planificación tiene uno de tres estados:

- `undecided`
- `defined`
- `approved`

Estados globales:

### `not_defined`

No existe definición suficiente para comenzar provisión.

### `partially_defined`

Existe planificación parcial, pero al menos una decisión sigue sin aprobar.

### `approved_for_controlled_provisioning`

Las 20 decisiones obligatorias están `approved`.

Solo aquí:

`provisioningMayBegin = true`

Esto **no** crea recursos ni marca requisitos V0.23.12 como `verified`.

## 20 decisiones requeridas

### Topología y gobierno

1. `dedicated_environment_projects`
2. `billing_owner_approved`
3. `primary_region_approved`

### Secrets e identidad

4. `secret_store_and_rotation_defined`
5. `identity_auth_strategy_approved`

### Database / recovery

6. `database_migration_strategy_approved`
7. `rollback_restore_strategy_approved`
8. `security_review_runbook_approved`

### Storage y lifecycle

9. `private_storage_and_retention_approved`
10. `physical_deletion_operations_approved`

### Boundary y observabilidad

11. `rate_limit_backend_approved`
12. `audit_sink_and_redaction_approved`
13. `trusted_origins_approved`
14. `monitoring_and_alerting_approved`
15. `incident_owner_and_kill_switch_approved`

### Producto

16. `real_case_creation_approved`
17. `data_authorization_approved`
18. `service_agreement_approved`

### Release

19. `progressive_cutover_approved`
20. `post_cutover_validation_approved`

## Principios de provisión

### 1. Aislamiento real

Cada entorno debe ser independiente. No compartir:

- proyecto de backend;
- base de datos;
- Storage;
- secrets;
- rate-limit state;
- auditoría;
- identity mapping.

La reutilización de infraestructura perteneciente a otro producto está prohibida.

### 2. Datos sintéticos antes de producción

DEV y STAGING no deben procesar documentos financieros reales ni datos personales reales para probar el runtime.

Las pruebas de:

- upload;
- download;
- retención;
- eliminación;
- ownership;
- rate limiting;
- auditoría;
- recovery;

se realizan con fixtures sintéticos.

### 3. Secrets separados por entorno

Cada entorno debe tener su propia autoridad de secrets.

No deben existir secrets en:

- repositorio;
- bundle del cliente;
- documentación;
- logs;
- payloads de browser;
- fixtures.

La rotación y ownership deben quedar definidos antes de provisión.

### 4. Migraciones forward-only con rollback operativo

La ruta normal es:

`DEV → STAGING → PROD`

El esquema no se modifica manualmente en PROD por fuera de una migración trazada.

Antes de PROD debe existir evidencia de:

- aplicación exitosa en STAGING;
- rollback o estrategia de forward-fix documentada;
- backup/restore verificado;
- criterio de abortar el release.

### 5. Seguridad como gate

La promoción exige revisión explícita de:

- ownership;
- RLS/policies;
- identity mapping;
- Storage privado;
- signed grants;
- trusted origins;
- rate limiter fail-closed;
- auditoría;
- deletion lifecycle.

Un advisory crítico sin resolver bloquea promoción.

### 6. Observabilidad antes de tráfico real

Antes de producción deben existir señales operativas para:

- errores de API;
- fallos de Auth;
- fallos de persistencia;
- Storage;
- signed grants;
- rate-limit backend;
- audit transport;
- deletion worker;
- health del runtime.

Cada señal debe tener owner y ruta de respuesta.

### 7. Kill switch

Debe existir una ruta verificada para volver al comportamiento fail-closed de V0.23.12 sin aceptar nuevos uploads.

El kill switch no borra evidencia ya almacenada ni implica rollback de datos. Su función es detener nuevas operaciones de intake de forma segura.

## Gate DEV → STAGING

`evaluateProvisioningPromotion("development", "staging", evidence)`

Requiere:

- blueprint 20/20 aprobado;
- DEV verificado;
- aislamiento STAGING verificado;
- rollback ensayado;
- backup/restore verificado;
- security review completa.

No requiere `runtimeMayActivate`, porque STAGING sigue siendo synthetic-only.

## Gate STAGING → PROD

`evaluateProvisioningPromotion("staging", "production", evidence)`

Requiere todo lo anterior, más:

- costo aprobado;
- incident owner;
- kill switch verificado;
- decisión V0.23.12 con `runtimeMayActivate = true`.

Si falta cualquiera:

`promotionMayProceed = false`

## Precedencia conceptual

V0.23.13 no reemplaza V0.23.12.

La relación es:

`plan approval → provisioning → environment verification → promotion gate → V0.23.12 activation readiness → controlled production cutover`

El blueprint nunca fabrica `EvidenceRuntimeActivationFacts`.

## Cutover progresivo

La activación productiva futura debe evitar un big-bang.

Secuencia recomendada:

1. PROD provisionado pero runtime fail-closed;
2. smoke checks server-side;
3. preflight V0.23.12 15/15;
4. cohort/feature control limitado;
5. verificación de auth + Case ownership;
6. primer upload sintético/controlado;
7. validación de audit/rate limit/deletion paths;
8. ampliación gradual;
9. monitoreo reforzado;
10. cierre del cutover solo después de post-cutover validation.

No se fija en este slice una tecnología concreta de feature flags.

## Rollback

Un rollback operativo debe poder:

- desactivar nuevas operaciones de evidencia;
- devolver el runtime a fail-closed;
- preservar integridad de Cases/evidencia existentes;
- evitar borrar datos para simular un rollback;
- conservar trazabilidad/auditoría;
- permitir investigación posterior.

## Región

V0.23.13 requiere que la región sea decidida y aprobada antes de provisión, pero no la fija.

La decisión futura debe considerar como mínimo:

- latencia para usuarios en Colombia;
- disponibilidad del proveedor;
- continuidad operativa;
- tratamiento y localización de datos;
- costo;
- compatibilidad con backup/recovery.

## Retención

V0.23.13 requiere una política aprobada, pero no inventa un número de días.

La política futura debe distinguir:

- evidencia activa;
- upload abandonado/incompleto;
- Case cerrado;
- autorización revocada;
- obligación de conservación aplicable;
- tombstone lógico;
- eliminación física confirmada.

## Costos

Ningún recurso pago se crea en este slice.

Antes de provisionar debe existir:

- owner de costo;
- presupuesto/plan aceptado;
- criterio de escalamiento;
- criterio para detener recursos no utilizados.

## Proveedor

El código existente contiene un adaptador provider-ready hacia Supabase, pero V0.23.13 no convierte esa preparación en una decisión irreversible de compra ni crea proyectos externos.

Si Supabase continúa como proveedor objetivo, la implementación deberá respetar exactamente este blueprint y V0.23.12.

## Tests

`server/evidence-api/provisioning-blueprint.test.ts`

Cubre:

1. plan vacío → fail closed;
2. decisión `defined` no cuenta como aprobada;
3. 20/20 approved habilita solo controlled provisioning;
4. DEV/STAGING synthetic-only;
5. PROD real data solo tras controlled activation;
6. transiciones no secuenciales inválidas;
7. DEV→STAGING requiere recovery/security evidence;
8. STAGING→PROD bloquea si V0.23.12 no está listo;
9. PROD exige costo, incident owner y kill switch;
10. blueprint aprobado no produce runtime verification.

## Fuera de alcance

- crear proyectos Supabase;
- seleccionar plan comercial;
- fijar región;
- crear usuarios Auth;
- aplicar migraciones live;
- crear buckets;
- introducir secrets;
- configurar rate limiter externo;
- configurar audit sink externo;
- desplegar deletion worker;
- cambiar `runtime.server.ts`;
- habilitar uploads reales;
- OCR;
- datos financieros reales;
- pagos;
- representación jurídica;
- merge del stack.
