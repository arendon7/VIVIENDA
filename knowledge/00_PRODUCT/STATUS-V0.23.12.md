# STATUS V0.23.12 — Evidence Runtime Activation Preflight

## Estado

**FUNCTIONALLY FULL GREEN / DOCUMENTATION FREEZE PENDING FINAL CI**

Rama:

`product/evidence-runtime-activation-preflight-v0.23.12`

Base congelada heredada:

**V0.23.11 — Assisted Intake Gate**

Base SHA:

`69fe78bc4eb4e33656d42bfc0542f6d38dc9fdaf`

Head funcional full green previo al STATUS:

`3abe721aabe51d1b3b22e81eb92cc7e80a504afd`

GitHub Actions run funcional:

`34155303291`

El freeze definitivo de V0.23.12 corresponde al commit documental que contiene este STATUS, siempre que ese SHA vuelva a pasar verify + los 244 E2E.

## Pregunta de arquitectura

V0.23.12 responde:

> **¿Cuándo puede dejar de usarse el runtime fail-closed de preview y construirse por primera vez un runtime real de evidencia?**

## Regla central

> **Provider-ready no significa provider-verified. Una activación parcial sigue bloqueada.**

La presencia de código, URL, variables de entorno, keys o providers configurados no autoriza por sí sola el runtime live.

Solo un requisito explícitamente `verified` cuenta como satisfecho.

## Estados por requisito

- `missing`
- `configured_unverified`
- `verified`

## Estados globales

### `not_configured`

No existe configuración/verificación suficiente para comenzar una activación.

### `blocked_partial_configuration`

Existe al menos una pieza configurada o verificada, pero una o más precondiciones siguen sin verificar.

El runtime permanece bloqueado.

### `ready_for_controlled_activation`

Los 15 requisitos están en `verified`.

Solo en este estado:

`runtimeMayActivate = true`

## 15 requisitos obligatorios

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

El primer bloqueo se presenta por esta secuencia:

1. environment
2. identity
3. persistence
4. storage
5. boundary
6. product

Así no se intenta activar una capa posterior sobre fundamentos anteriores todavía incompletos.

## Nuevo contrato ejecutable

`server/evidence-api/activation-preflight.ts`

Funciones principales:

- `evaluateEvidenceRuntimeActivation(...)`
- `assertEvidenceRuntimeActivationAllowed(...)`
- `verifiedEvidenceRuntimeActivationFacts()`

Error canónico:

`EvidenceRuntimeActivationError`

Código:

`runtime_activation_blocked`

## Ruta canónica de futuro runtime live

`server/evidence-api/activated-runtime.ts`

`createActivatedEvidenceRuntime(...)` obliga a pasar el preflight antes de construir `EvidenceHttpApi`.

Una configuración parcial no puede construir el runtime mediante esta ruta.

## Runtime actual

V0.23.12 **no cambia**:

`server/evidence-api/runtime.server.ts`

Continúa usando deliberadamente:

- `UnconfiguredEvidenceApplication`;
- `FailClosedRateLimit`;
- request context que no pretende ser identidad real;
- auditoría noop segura.

Por tanto, el journey actual de V0.23.11 continúa en `platform_activation_required` cuando el inventario local está listo.

No se habilita upload.

## Arquitectura provider-ready existente auditada

Se verificó en el repositorio la existencia de contratos/código para:

- principal autenticado y `subjectRef` opaco;
- `CasePersistencePort` / `CasePersistenceService`;
- autorización de datos por finalidad;
- persistencia Supabase mediante RPC;
- mapeo inmutable auth user → subjectRef;
- intents de evidencia y finalización atómica;
- Storage coordination y lifecycle;
- tombstone + eliminación física modelada;
- clasificación server-authoritative de evidencia;
- HTTP boundary prepare/complete/download;
- same/trusted origin;
- rate limiting fail-closed;
- auditoría estructurable;
- sanitización de errores y payloads.

Esto demuestra preparación arquitectónica, no activación productiva.

## Auditoría de infraestructura externa

Durante V0.23.12 se consultaron los proyectos Supabase accesibles mediante la conexión disponible.

No se identificó un proyecto dedicado a **VIVIENDA**.

Esto es una observación del entorno accesible durante esta auditoría, no una verdad permanente codificada en el dominio.

No se creó ningún proyecto ni se generó costo alguno.

## Truth boundary

Incluso un preflight con 15/15 `verified` significa únicamente que el runtime **puede entrar en una activación controlada**.

No significa que:

- un usuario concreto ya esté autenticado;
- exista un Case concreto;
- exista autorización activa en ese Case;
- un documento haya sido subido;
- una evidencia esté verificada;
- exista revisión profesional;
- exista poder, mandato o representación;
- se haya radicado una actuación;
- exista respuesta o decisión de un tercero.

## Seguridad / secretos

El preflight solo trabaja con:

- código del requisito;
- capa;
- estado;
- criterio de verificación.

No transporta ni registra:

- service-role keys;
- JWTs;
- passwords;
- signed URLs;
- upload tokens;
- bucket paths concretos;
- subjectRefs reales;
- documentos;
- contenido de evidencia.

## Tests nuevos

`server/evidence-api/activation-preflight.test.ts`

Cubre:

1. cero configuración → fail closed;
2. configuración parcial → bloqueada;
3. `configured_unverified` no satisface;
4. blocker por capa determinista;
5. requisitos de Case/consentimiento/acuerdo siguen siendo obligatorios aunque la infraestructura esté lista;
6. únicamente 15/15 `verified` habilita activación;
7. error de activación expone solo metadata segura.

`server/evidence-api/activated-runtime.test.ts`

Cubre:

1. construcción live rechazada con readiness parcial;
2. construcción permitida únicamente después de 15/15 verificados.

## Gate funcional confirmado

Sobre `3abe721aabe51d1b3b22e81eb92cc7e80a504afd`:

- TypeScript — **PASS**
- Domain tests — **PASS**
- Production build — **PASS**
- Borrower journey E2E — **PASS**
- Playwright — **244/244 PASS**
- Remote Preview E2E — **SKIPPED por diseño**

Run:

`34155303291`

## Diff funcional/documental previo al STATUS contra V0.23.11

- 6 commits
- 6 archivos
- +925 / −0

Archivos:

1. `knowledge/10_DECISIONS/ADR-0008-evidence-runtime-activation-preflight.md`
2. `knowledge/60_ENGINEERING/EVIDENCE-RUNTIME-ACTIVATION-PREFLIGHT-V0.23.12.md`
3. `server/evidence-api/activated-runtime.test.ts`
4. `server/evidence-api/activated-runtime.ts`
5. `server/evidence-api/activation-preflight.test.ts`
6. `server/evidence-api/activation-preflight.ts`

## Documentación canónica

- `knowledge/00_PRODUCT/STATUS-V0.23.12.md`
- `knowledge/10_DECISIONS/ADR-0008-evidence-runtime-activation-preflight.md`
- `knowledge/60_ENGINEERING/EVIDENCE-RUNTIME-ACTIVATION-PREFLIGHT-V0.23.12.md`

## Fuera de alcance

- crear un proyecto Supabase;
- activar Auth;
- aplicar migraciones live;
- configurar service-role secrets;
- crear bucket productivo;
- habilitar signed grants live;
- desplegar rate limiter;
- desplegar audit sink;
- desplegar worker de eliminación;
- cambiar `runtime.server.ts` al runtime activado;
- crear expedientes reales;
- registrar consentimientos productivos;
- habilitar upload en UI;
- OCR;
- contratación/pago;
- representación jurídica;
- radicación o respuesta externa.

## Siguiente paso

No iniciar activación live encima de este slice hasta que el SHA documental final vuelva a pasar verify + los 244 E2E y el PR apilado sobre V0.23.11 quede abierto y verde.

Una futura activación deberá decidir explícitamente organización/proyecto, costo, región, Auth, retención, rate-limit backend, audit sink, trusted origins, secrets, migration/rollback y estrategia de despliegue progresivo antes de tocar infraestructura productiva.
