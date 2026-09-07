# V0.23.12 — Evidence Runtime Activation Preflight

## Objetivo

V0.23.12 responde una pregunta de arquitectura:

> **¿Cuándo puede dejar de usar el runtime fail-closed de preview y construirse por primera vez un runtime real de evidencia?**

La respuesta no depende de una sola variable de entorno ni de que exista código para Supabase/Storage.

Depende de que todas las precondiciones técnicas, de seguridad y de producto hayan sido **verificadas**.

## Base heredada

V0.23.11 dejó el journey R7 asistido en:

`inventario local → Assisted Intake Gate`

El estado actual después de completar el inventario es:

`platform_activation_required`

Ese comportamiento no cambia en V0.23.12.

## Inventario de arquitectura existente

### Ya existe en código

- `domain/persistence-boundary/contracts.ts`
  - principal autenticado vs anonymous;
  - `CasePersistencePort`;
  - data authorization;
  - evidence intents;
  - finalize atomic;
  - tombstone.

- `domain/persistence-boundary/service.ts`
  - auth obligatoria;
  - ownership/roles;
  - autorización activa antes de evidencia;
  - clasificación de seguridad;
  - idempotencia;
  - límites MIME/size/checksum;
  - no URLs/filenames/material sensible arbitrario en Case Log.

- `domain/persistence-boundary/supabase-adapter.ts`
  - RPC durable;
  - principal resolver;
  - object registry;
  - lifecycle.

- `supabase/migrations/*`
  - schema/RPC;
  - security/integrity hardening;
  - identity mapping;
  - storage coordination;
  - retry/lifecycle.

- `domain/storage-coordination/*`
  - coordinación de quarantine/finalize;
  - registry;
  - retry/lifecycle.

- `server/evidence-api/http-boundary.ts`
  - POST JSON only;
  - body size limit;
  - same/trusted-origin checks;
  - IDs canónicos;
  - privileged-key rejection;
  - rate limiting fail-closed;
  - errores públicos sanitizados;
  - no-store;
  - request IDs;
  - auditoría.

- `server/evidence-api/application-authority.ts`
  - clasificación server-authoritative por tipo de evidencia;
  - browser no puede degradar clasificación;
  - idempotency canonicalization.

- rutas Next `/api/v1/cases/[caseId]/evidence/*`
  - prepare;
  - complete;
  - download.

### Sigue deliberadamente no activado

`server/evidence-api/runtime.server.ts` conserva:

- `UnconfiguredEvidenceApplication`;
- `FailClosedRateLimit`;
- request context que no pretende ser identidad;
- auditoría noop segura.

Por tanto, la existencia de endpoints no significa que exista un intake productivo.

## Nuevo contrato V0.23.12

Archivo:

`server/evidence-api/activation-preflight.ts`

Estados de requisito:

- `missing`
- `configured_unverified`
- `verified`

Estados globales:

### `not_configured`

Ningún requisito ha sido configurado/verificado.

### `blocked_partial_configuration`

Existe al menos una pieza configurada o verificada, pero falta verificar una o más.

Este estado es explícitamente **bloqueante**.

### `ready_for_controlled_activation`

Todos los requisitos están `verified`.

Solo aquí:

`runtimeMayActivate = true`

## Requisitos

### Environment

1. `dedicated_vivienda_project`
2. `migrations_applied`
3. `security_advisors_reviewed`

### Identity

4. `authenticated_principal_resolver`
5. `immutable_subject_mapping_verified`

### Persistence

6. `case_persistence_provider`

### Storage

7. `private_evidence_bucket`
8. `signed_upload_download_provider`
9. `physical_deletion_worker`

### Boundary

10. `trusted_origin_policy`
11. `rate_limit_provider`
12. `structured_audit_transport`

### Product

13. `real_case_creation_flow`
14. `purpose_specific_data_authorization`
15. `service_agreement_recording`

## Precedencia de blockers

El preflight presenta primero la capa más temprana aún bloqueada:

1. environment
2. identity
3. persistence
4. storage
5. boundary
6. product

Esto evita intentar resolver UX/consentimiento sobre una infraestructura que todavía no existe o intentar crear Storage live sin identidad/persistencia verificadas.

## Ruta canónica de construcción live

Archivo:

`server/evidence-api/activated-runtime.ts`

Función:

`createActivatedEvidenceRuntime(...)`

Secuencia:

1. recibe hechos de activación ya clasificados;
2. ejecuta `assertEvidenceRuntimeActivationAllowed(...)`;
3. si existe cualquier blocker, lanza `EvidenceRuntimeActivationError`;
4. únicamente con 15/15 `verified` construye `EvidenceHttpApi`.

No infiere readiness a partir de env vars.

## Qué no cambia

V0.23.12 no modifica:

- `runtime.server.ts`;
- rutas API;
- UI R7;
- Case State;
- persistencia;
- Storage;
- Supabase migrations;
- consentimiento;
- service agreement.

El usuario final sigue viendo el gate fail-closed de V0.23.11.

## Observación operativa de la auditoría

La inspección realizada durante este slice no permitió identificar un proyecto Supabase dedicado a VIVIENDA entre los proyectos accesibles por la conexión disponible.

Esta observación **no se codifica como verdad permanente** dentro del preflight: el contrato exige `dedicated_vivienda_project = verified` cuando un entorno dedicado exista y haya sido validado.

V0.23.12 no crea infraestructura externa.

## Criterios de aceptación

1. Cero configuración → `not_configured` y fail closed.
2. Cualquier configuración parcial → `blocked_partial_configuration`.
3. `configured_unverified` nunca cuenta como verificado.
4. El blocker se ordena por capa canónica.
5. Requisitos de producto son obligatorios incluso si toda la infraestructura técnica está lista.
6. Solo 15/15 `verified` permite `runtimeMayActivate = true`.
7. El factory live no puede construirse con readiness parcial.
8. El preflight no contiene secretos ni datos personales.
9. El runtime preview existente sigue igual.

## Siguiente slice posible después del freeze

La activación real deberá ser separada y controlada.

Antes de tocar providers live deberá existir una decisión explícita sobre:

- organización/proyecto Supabase objetivo;
- costo/provisioning;
- región;
- estrategia Auth;
- política de retención;
- rate-limit backend;
- audit sink;
- trusted origins por entorno;
- estrategia de secrets;
- procedimiento de migrations + rollback;
- smoke/security verification;
- activación progresiva por entorno.
