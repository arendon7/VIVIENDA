# STATUS V0.23.14 — DEV Provisioning Authorization & Qualification

## Estado

**FUNCTIONALLY FULL GREEN / DOCUMENTATION FREEZE PENDING FINAL CI**

Rama:

`product/dev-provisioning-qualification-v0.23.14`

Base congelada heredada:

**V0.23.13 — Production Provisioning Blueprint**

Base SHA:

`2a551344e00661addc9f2642a4dfd51dbae1af07`

Head funcional full green previo al STATUS:

`d2d21021c231296d33c9e456143b8637307f4a14`

GitHub Actions run funcional:

`34162046404`

## Pregunta de arquitectura

V0.23.14 responde:

> **¿Qué debe estar explícitamente autorizado antes de solicitar la creación del primer proyecto DEV de VIVIENDA y qué debe verificarse después de que ese proyecto exista para poder llamarlo realmente DEV, sin confundirlo con STAGING, PROD o runtime live?**

## Regla central

> **Autorizado para crear ≠ proyecto creado ≠ proyecto sano ≠ DEV calificado ≠ STAGING-ready ≠ producción autorizada ≠ runtime live.**

## Contexto de producto

El Journey Map requiere más adelante:

- cuenta/identidad;
- documento;
- Mortgage Twin persistente;
- Case durable;
- consentimiento/autorización;
- ejecución longitudinal.

Esas capacidades necesitan infraestructura real, pero no justifican saltarse las fronteras V0.23.12/V0.23.13.

V0.23.14 prepara el primer entorno real sin activarlo todavía.

## Observación externa Supabase

Durante este slice se hizo una lectura del inventario Supabase accesible.

No se identificó un proyecto dedicado a VIVIENDA.

Los proyectos existentes corresponden a otros productos y no deben reutilizarse.

Esta observación es temporal/operativa y no se codifica como verdad permanente.

No se creó proyecto, no se mutó ningún proyecto y no se generó costo.

## Perfil DEV recomendado

`DEV_PROVIDER_PROFILE`

Define:

- provider: `supabase`;
- role: `development`;
- recommended name: `vivienda-dev`;
- recommended region: `sa-east-1`;
- region label: South America (São Paulo);
- data policy: `synthetic_only`;
- runtime default: `fail_closed`;
- isolation: `dedicated_project`;
- secrets: `server_only`;
- DB recovery y Storage-object recovery: controles separados;
- fresh provider cost confirmation required;
- explicit organization selection required.

## Región

La documentación vigente de Supabase expone `sa-east-1` como región específica South America (São Paulo) y recomienda elegir una región cercana a los usuarios para rendimiento.

Referencia:

https://supabase.com/docs/guides/platform/regions

Para un producto enfocado en Colombia, V0.23.14 la registra como **recomendación DEV**, no como aprobación automática y no como decisión PROD.

La región también determina localización primaria de datos, por lo que PROD deberá tener una decisión separada de privacidad/legal/residencia/continuidad.

## Costos

No se hardcodea un precio en el repositorio.

La información pública de Supabase muestra pricing dependiente de plan/compute, pero una creación real debe usar el costo vigente para la organización elegida y una confirmación fresca del proveedor.

Referencia:

https://supabase.com/pricing

El flujo futuro exige:

1. elegir organización explícitamente;
2. obtener quote vigente;
3. revisar quote;
4. aprobar costo explícitamente;
5. obtener confirmación operacional de costo;
6. ejecutar creación.

## Gate A — DEV Provisioning Authorization

Contrato:

`evaluateDevProvisioningAuthorization(...)`

Estados:

- `not_authorized`
- `partially_authorized`
- `authorized_for_cost_confirmed_creation`

Solo el último estado produce:

`projectCreationMayBeRequested = true`

### Dependencia padre

El V0.23.13 blueprint debe tener:

`provisioningMayBegin = true`

No existe bypass desde una autorización DEV aislada.

## 8 autorizaciones previas

1. `dedicated_project_scope_approved`
2. `organization_selection_recorded`
3. `provider_cost_quote_reviewed`
4. `provider_cost_approval_recorded`
5. `development_region_approved`
6. `synthetic_only_scope_approved`
7. `no_existing_project_reuse_approved`
8. `provisioning_actor_authorized`

Estados por autorización:

- `missing`
- `proposed`
- `approved`

Solo `approved` satisface.

## Gate B — DEV Environment Qualification

Contrato:

`evaluateDevEnvironmentQualification(...)`

Estados:

- `not_provisioned`
- `provisioned_unqualified`
- `qualified_for_staging_candidate`

Estados por requisito:

- `missing`
- `configured_unverified`
- `verified`

Solo `verified` satisface.

## 14 verificaciones posteriores

1. `project_exists`
2. `project_role_matches_dev`
3. `project_isolation_verified`
4. `region_matches_authorization`
5. `migrations_applied_and_versioned`
6. `security_advisors_reviewed`
7. `rls_and_rpc_security_verified`
8. `identity_mapping_verified`
9. `private_storage_verified`
10. `database_recovery_verified`
11. `storage_object_recovery_strategy_verified`
12. `secrets_server_only_verified`
13. `synthetic_only_data_verified`
14. `runtime_fail_closed_verified`

Solo 14/14 produce:

`devEnvironmentVerified = true`

## Recovery: DB y Storage no son lo mismo

Supabase documenta que los backups de base protegen Postgres, pero no incluyen los objetos almacenados mediante Storage API.

Referencia:

https://supabase.com/docs/guides/platform/backups

Por eso V0.23.14 separa:

- `database_recovery_verified`
- `storage_object_recovery_strategy_verified`

Una restauración correcta de Postgres nunca prueba por sí sola que documentos/objetos Storage fueron recuperados.

## Migraciones canónicas existentes

El repositorio ya contiene una línea de migraciones provider-ready:

- V0.7 schema;
- V0.7 RPC;
- V0.7 security hardening;
- V0.7 integrity hardening;
- V0.7 identity/storage lifecycle;
- V0.8 Storage coordination;
- V0.8 Storage retry hardening.

V0.23.14 no las aplica externamente.

La futura calificación exige que se apliquen de manera versionada y sin SQL manual no trazado.

## No bridge hacia V0.23.12

Incluso 14/14 DEV verificado mantiene:

`liveRuntimeAuthorized = false`

Además:

`devQualificationProducesNoRuntimeActivationFacts()`

retorna:

`{}`

Esto evita que una validación DEV satisfaga accidentalmente los requisitos productivos del Evidence Runtime Activation Preflight V0.23.12.

## Relación con V0.23.13

Un DEV calificado puede ser candidato futuro para demostrar:

`sourceEnvironmentVerified`

en el gate DEV → STAGING.

Pero V0.23.13 sigue exigiendo además:

- target isolation;
- rollback rehearsal;
- backup/restore;
- security review;
- blueprint aprobado.

V0.23.14 no promueve entornos.

## Truth/security boundary

Este slice no transporta ni registra:

- passwords;
- service-role keys;
- access tokens;
- JWTs;
- signed URLs;
- upload tokens;
- provider cost-confirmation IDs;
- subjectRefs reales;
- documentos;
- evidencia financiera real.

## Contrato ejecutable

`server/evidence-api/dev-provisioning-qualification.ts`

Funciones principales:

- `evaluateDevProvisioningAuthorization(...)`
- `approvedDevProvisioningAuthorizationFacts()`
- `evaluateDevEnvironmentQualification(...)`
- `verifiedDevEnvironmentQualificationFacts()`
- `devQualificationProducesNoRuntimeActivationFacts()`

Perfil:

- `DEV_PROVIDER_PROFILE`

## Tests nuevos

`server/evidence-api/dev-provisioning-qualification.test.ts`

Cubre:

1. autorización vacía fail closed;
2. autorización DEV no bypassa blueprint padre;
3. `proposed` cost/region no equivale a approval;
4. solo blueprint + 8/8 approved permiten solicitar creación;
5. provider profile synthetic-only/fail-closed;
6. sin proyecto real → `not_provisioned`;
7. proyecto existente parcial → `provisioned_unqualified`;
8. `configured_unverified` no satisface;
9. DB recovery y Storage recovery son independientes;
10. solo 14/14 verified califican DEV;
11. DEV calificado no autoriza runtime live;
12. DEV calificado produce cero facts V0.23.12.

## Gate funcional confirmado

Sobre `d2d21021c231296d33c9e456143b8637307f4a14`:

- TypeScript — **PASS**
- Domain tests — **PASS**
- Production build — **PASS**
- Borrower journey E2E — **PASS**
- Playwright — **244/244 PASS**
- Remote Preview E2E — **SKIPPED por diseño**

Run:

`34162046404`

## Diff funcional/documental previo al STATUS contra V0.23.13

- 4 commits
- 4 archivos
- +1070 / −0

Archivos:

1. `knowledge/10_DECISIONS/ADR-0010-dev-provisioning-authorization-and-qualification.md`
2. `knowledge/60_ENGINEERING/DEV-PROVISIONING-QUALIFICATION-V0.23.14.md`
3. `server/evidence-api/dev-provisioning-qualification.test.ts`
4. `server/evidence-api/dev-provisioning-qualification.ts`

## Documentación canónica

- `knowledge/00_PRODUCT/STATUS-V0.23.14.md`
- `knowledge/10_DECISIONS/ADR-0010-dev-provisioning-authorization-and-qualification.md`
- `knowledge/60_ENGINEERING/DEV-PROVISIONING-QUALIFICATION-V0.23.14.md`

## Fuera de alcance

- crear `vivienda-dev`;
- elegir organización por el usuario;
- aprobar costo;
- introducir secrets;
- aplicar migraciones externamente;
- crear bucket;
- activar Auth;
- habilitar upload;
- datos reales;
- STAGING/PROD;
- cambiar `runtime.server.ts`;
- OCR;
- merge del stack.

## Siguiente condición

El commit documental que contiene este STATUS debe volver a pasar verify + 244 E2E.

Solo después debe abrirse un PR draft apilado sobre V0.23.13.
