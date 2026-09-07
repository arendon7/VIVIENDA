# STATUS V0.23.13 — Production Provisioning Blueprint

## Estado

**FUNCTIONALLY FULL GREEN / DOCUMENTATION FREEZE PENDING FINAL CI**

Rama:

`product/production-provisioning-blueprint-v0.23.13`

Base congelada heredada:

**V0.23.12 — Evidence Runtime Activation Preflight**

Base SHA:

`dbc01b9c6febbfe59e290029eabf2cc06ac8a725`

Head funcional full green previo al STATUS:

`a3ca22cbfc2caba2a97e59b0eaec2ee207ffa60b`

GitHub Actions run funcional:

`34156624029`

## Pregunta de arquitectura

V0.23.13 responde:

> **¿Cómo debe provisionarse y promoverse la infraestructura de VIVIENDA entre DEV, STAGING y PROD sin confundir plan aprobado, recursos creados, recursos verificados y runtime autorizado para datos reales?**

## Regla central

> **Plan de provisión aprobado no significa infraestructura verificada; infraestructura verificada no significa runtime live; runtime live sigue subordinado al preflight V0.23.12.**

## Entornos canónicos

- `development`
- `staging`
- `production`

Secuencia obligatoria:

`development → staging → production`

No existe promoción directa DEV → PROD.

## Política de datos

### Development

`synthetic_only`

### Staging

`synthetic_only`

### Production

`real_data_after_controlled_activation`

DEV y STAGING no deben utilizar evidencia financiera o documental real para probar el runtime.

## Política de runtime

Los tres entornos parten de:

`evidenceRuntimeDefault = fail_closed`

La existencia de PROD no autoriza upload real.

## Política de aislamiento

Cada entorno requiere:

`projectIsolation = dedicated_project`

No se comparte infraestructura con otros productos ni entre DEV/STAGING/PROD.

## Política de secretos

`secretsVisibility = server_only`

No se introducen secretos en:

- repositorio;
- bundle cliente;
- documentación;
- logs;
- fixtures;
- payloads del navegador.

## Readiness del plan

Cada decisión de planificación tiene estado:

- `undecided`
- `defined`
- `approved`

Estados globales:

- `not_defined`
- `partially_defined`
- `approved_for_controlled_provisioning`

Solo 20/20 decisiones `approved` producen:

`provisioningMayBegin = true`

Esto significa únicamente que puede comenzar la provisión controlada de recursos.

No genera `EvidenceRuntimeActivationFacts` ni cambia V0.23.12.

## 20 decisiones obligatorias

1. `dedicated_environment_projects`
2. `billing_owner_approved`
3. `primary_region_approved`
4. `secret_store_and_rotation_defined`
5. `identity_auth_strategy_approved`
6. `database_migration_strategy_approved`
7. `rollback_restore_strategy_approved`
8. `security_review_runbook_approved`
9. `private_storage_and_retention_approved`
10. `physical_deletion_operations_approved`
11. `rate_limit_backend_approved`
12. `audit_sink_and_redaction_approved`
13. `trusted_origins_approved`
14. `monitoring_and_alerting_approved`
15. `incident_owner_and_kill_switch_approved`
16. `real_case_creation_approved`
17. `data_authorization_approved`
18. `service_agreement_approved`
19. `progressive_cutover_approved`
20. `post_cutover_validation_approved`

## Gate DEV → STAGING

Requiere:

- blueprint 20/20 aprobado;
- DEV verificado;
- aislamiento STAGING verificado;
- rollback ensayado;
- backup/restore verificado;
- security review completa.

STAGING continúa synthetic-only y no requiere todavía `runtimeMayActivate=true`.

## Gate STAGING → PROD

Además requiere:

- aprobación explícita de costo;
- incident owner asignado;
- kill switch verificado;
- V0.23.12 en `ready_for_controlled_activation`.

Si falta cualquiera:

`promotionMayProceed = false`

## Cutover

El cutover futuro debe ser:

- progresivo;
- reversible;
- observable;
- gobernado por cohort/feature control;
- con condiciones explícitas de entrada, pausa y rollback.

No se selecciona en este slice una tecnología concreta de feature flags.

## Kill switch

Debe existir una ruta verificada para volver al runtime fail-closed sin aceptar nuevos uploads.

El kill switch no significa borrar Cases/evidencia existentes ni fingir rollback de datos.

## Migraciones y recovery

Ruta normal:

`DEV → STAGING → PROD`

Antes de PROD debe existir evidencia de:

- migración exitosa en STAGING;
- rollback o forward-fix documentado;
- backup/restore verificado;
- criterio explícito para abortar el release.

No se consideran válidas mutaciones manuales productivas no trazadas.

## Región

V0.23.13 exige una región primaria aprobada antes de provisionar, pero no inventa una región concreta.

La decisión deberá considerar latencia Colombia, continuidad, tratamiento/localización de datos, costo y recovery.

## Retención

V0.23.13 exige una política aprobada, pero no inventa días de retención.

La futura política debe distinguir evidencia activa, upload incompleto, Case cerrado, revocación, obligación de conservación, tombstone y eliminación física confirmada.

## Costos

No se crea ningún recurso pago en este slice.

Antes de provisionar debe existir owner de costo y aprobación explícita del presupuesto/plan.

## Contrato ejecutable

`server/evidence-api/provisioning-blueprint.ts`

Funciones principales:

- `evaluateProvisioningBlueprint(...)`
- `approvedProvisioningPlanFacts()`
- `evaluateProvisioningPromotion(...)`

Política estática:

- `PROVISIONING_ENVIRONMENT_POLICIES`

## Tests nuevos

`server/evidence-api/provisioning-blueprint.test.ts`

Cubre:

1. plan vacío fail closed;
2. `defined` no equivale a approved;
3. 20/20 approved habilita solo controlled provisioning;
4. DEV/STAGING synthetic-only;
5. PROD real data solo después de controlled activation;
6. promociones no secuenciales inválidas;
7. DEV→STAGING requiere isolation/recovery/security evidence;
8. STAGING→PROD bloquea sin V0.23.12 ready;
9. PROD exige costo, incident owner y kill switch;
10. blueprint aprobado no crea runtime verification.

## Gate funcional confirmado

Sobre `a3ca22cbfc2caba2a97e59b0eaec2ee207ffa60b`:

- TypeScript — **PASS**
- Domain tests — **PASS**
- Production build — **PASS**
- Borrower journey E2E — **PASS**
- Playwright — **244/244 PASS**
- Remote Preview E2E — **SKIPPED por diseño**

Run:

`34156624029`

## Diff funcional/documental previo al STATUS contra V0.23.12

- 4 commits
- 4 archivos
- +1010 / −0

Archivos:

1. `knowledge/10_DECISIONS/ADR-0009-production-provisioning-blueprint.md`
2. `knowledge/60_ENGINEERING/PRODUCTION-PROVISIONING-BLUEPRINT-V0.23.13.md`
3. `server/evidence-api/provisioning-blueprint.test.ts`
4. `server/evidence-api/provisioning-blueprint.ts`

## Documentación canónica

- `knowledge/00_PRODUCT/STATUS-V0.23.13.md`
- `knowledge/10_DECISIONS/ADR-0009-production-provisioning-blueprint.md`
- `knowledge/60_ENGINEERING/PRODUCTION-PROVISIONING-BLUEPRINT-V0.23.13.md`

## Truth boundary

Un blueprint 20/20 aprobado no significa que exista infraestructura.

Infraestructura creada no significa infraestructura verificada.

STAGING verificado no significa PROD habilitado.

Gate STAGING→PROD verde no significa que ocurrió cutover.

Cutover técnico no significa Case, consentimiento, servicio, upload, evidencia verificada, revisión profesional, mandato, representación, radicación o decisión de tercero.

## Fuera de alcance

- crear proyectos externos;
- activar Supabase/Auth;
- seleccionar plan comercial;
- fijar región concreta;
- aplicar migraciones live;
- crear buckets;
- configurar secrets;
- desplegar rate limiter/audit sink/delete worker;
- cambiar `runtime.server.ts`;
- habilitar uploads reales;
- OCR;
- datos financieros reales;
- pagos;
- representación jurídica;
- merge del stack.

## Siguiente condición

El commit documental que contiene este STATUS debe volver a pasar verify + 244 E2E antes de abrir el PR apilado sobre V0.23.12.
