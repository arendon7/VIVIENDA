# Synthetic Evidence Failure Rehearsal · V0.23.18

## Objetivo

V0.23.18 extiende el baseline sintético de V0.23.17 con una matriz adversarial integrada.

La pregunta es:

> ¿La composición real de Case + privacidad + Storage coordination + HTTP permanece fail-closed cuando faltan identidad, consentimiento, ownership, objeto físico o rate limiting?

La condición de éxito no es completar una operación: es **rechazarla correctamente sin producir estado falso**.

## Implementación

Archivos:

- `server/evidence-api/synthetic-failure-rehearsal.ts`
- `server/evidence-api/synthetic-failure-rehearsal.test.ts`
- `knowledge/10_DECISIONS/ADR-0014-synthetic-evidence-failure-rehearsal.md`

Funciones públicas:

- `runSyntheticEvidenceFailureRehearsal(scenario)`
- `runSyntheticEvidenceFailureMatrix()`

## Composición ejercitada

La matriz reutiliza las implementaciones reales:

```text
MemoryCasePersistence
        ↓
CasePersistenceService
        ↓
EvidenceStorageCoordinator
        ↓
ServerClassifiedEvidenceApplication
        ↓
EvidenceHttpApi
```

Los adapters externos son exclusivamente sintéticos y determinísticos.

No existe IO de red, provider, secreto, sesión real ni documento real.

## Fixture canónico

Salvo el escenario `missing_data_authorization`, el Case de prueba inicia con:

1. `CASE_CREATED`
2. `DATA_AUTHORIZATION_RECORDED`
3. `SERVICE_AGREEMENT_ACCEPTED`
4. `EVIDENCE_REQUESTED`

Versión previa al intento rechazado: `4`.

En `missing_data_authorization` la secuencia es:

1. `CASE_CREATED`
2. `SERVICE_AGREEMENT_ACCEPTED`
3. `EVIDENCE_REQUESTED`

Versión previa al intento rechazado: `3`.

`SERVICE_AGREEMENT_ACCEPTED` no sustituye ni implica autorización de tratamiento de datos.

## Matriz canónica

| Scenario | Operación rechazada | HTTP | Error público | Storage esperado |
|---|---|---:|---|---|
| `unauthenticated_prepare` | prepare | 401 | `authentication_required` | no tocado |
| `missing_data_authorization` | prepare | 409 | `data_authorization_required` | no tocado |
| `cross_case_access` | prepare | 403 | `forbidden` | no tocado |
| `missing_uploaded_object` | complete | 404 | `evidence_not_found` | una inspección, sin finalize |
| `rate_limit_unavailable` | prepare | 503 | `rate_limit_unavailable` | no tocado |

## Invariante común

Después de cualquier rechazo:

```text
evidenceCount = 0
EVIDENCE_ATTACHED absent
finalCaseVersion = versionBeforeRejectedOperation
```

El Case no puede avanzar por una operación fallida.

## 1. Unauthenticated prepare

La frontera HTTP llega al coordinator con `PrincipalSource.resolve() = null`.

Orden esperado:

1. HTTP guards válidos;
2. rate limiter permitido;
3. coordinator solicita principal;
4. `authentication_required`;
5. respuesta 401 sanitizada.

No deben ocurrir:

- creación de upload intent;
- reserva física;
- signed grant;
- inspección;
- persistencia de evidencia.

## 2. Missing data authorization

El propietario está autenticado y tiene acceso al Case, pero no existe autorización activa de tratamiento.

`CasePersistenceService.prepareEvidenceUpload()` debe rechazar antes de crear el intent.

Resultado:

- HTTP 409;
- `data_authorization_required`;
- cero registry;
- cero Storage;
- Case versión 3 intacta.

Esto prueba una frontera distinta de service agreement: aceptar alcance de servicio no autoriza tratamiento documental.

## 3. Cross-case access

El Case pertenece al owner sintético pero el principal HTTP es otro cliente.

`assertCaseAccess` debe producir `forbidden` antes de crear upload intent.

Resultado:

- HTTP 403;
- cero registry;
- cero Storage;
- Case owner intacto;
- cero evidencia.

Este escenario funciona como baseline integrado contra IDOR lógico en la capa de aplicación.

No sustituye una futura prueba RLS live.

## 4. Missing uploaded object

Prepare sí es válido y produce:

- upload intent en `quarantine`;
- registro opaco en registry;
- signed upload grant sintético.

El rehearsal deliberadamente **no coloca el objeto** en el Storage sintético.

Al ejecutar complete:

1. se reautoriza el Case;
2. se resuelve el intent;
3. Storage inspecciona el path reservado;
4. no encuentra objeto;
5. retorna `evidence_not_found`;
6. HTTP responde 404;
7. no se invoca finalize persistente.

Resultado final:

- intent permanece `quarantine`;
- evidenceCount 0;
- no `EVIDENCE_ATTACHED`;
- Case versión 4.

Un grant emitido no constituye prueba de upload efectivo.

## 5. Rate limit unavailable

El rate-limit port devuelve:

```text
{ kind: unavailable }
```

`EvidenceHttpApi` debe responder 503 antes de invocar la aplicación.

Resultado:

- `rate_limit_unavailable`;
- cero registry;
- cero signed grants;
- cero Storage inspections;
- cero evidencia.

La indisponibilidad del control protector es fail-closed.

## Audit

Cada error se registra de forma estructurada con:

- `requestId` sintético;
- operation;
- status;
- errorCode.

La última entrada de cada escenario debe coincidir con la operación rechazada y su error canónico.

Para `missing_uploaded_object`, el audit contiene primero `evidence.prepare` 200 y después `evidence.complete` 404.

## Sanitización

El report valida que el cuerpo público de error no contenga:

- `storageLocator`;
- checksum;
- upload token;
- object locator interno.

La matriz tampoco expone material real porque todos los datos son sintéticos.

## Determinismo

`runSyntheticEvidenceFailureMatrix()` ejecuta siempre los escenarios en este orden:

1. unauthenticated
2. missing data authorization
3. cross-case
4. missing object
5. rate-limit unavailable

Dos matrices consecutivas deben ser estructuralmente iguales.

No se usa reloj real ni IDs aleatorios.

## Fronteras de verdad

Cada report conserva:

```text
mode = synthetic_failure_rehearsal
externalIoOccurred = false
liveRuntimeAuthorized = false
runtimeServerWasUsed = false
```

Un PASS no debe convertirse en activation fact.

## Aislamiento live

El módulo no debe:

- importar `runtime.server.ts`;
- importar `createActivatedEvidenceRuntime`;
- construir `EvidenceRuntimeActivationFacts`;
- usar variables Supabase;
- realizar fetch externo;
- abrir rutas públicas;
- mutar provider;
- modificar billing.

## Tests de contrato

La suite V0.23.18 fija:

1. status/error code exactos para los cinco escenarios;
2. cero evidencia y cero `EVIDENCE_ATTACHED` en todos;
3. no tocar Storage en auth/consent/ownership/rate-limit failures;
4. mantener intent `quarantine` si falta objeto;
5. sanitización pública y cero live authority;
6. determinismo de la matriz.

## Certificación funcional previa

Head funcional:

`0b2885bcdf22c4b25ea26a55d1be103559004d2d`

GitHub Actions:

`34310518478`

Resultado:

- TypeScript — PASS
- Domain tests — PASS
- Build — PASS
- Playwright — **244/244 PASS** (`244 passed (2.4m)`)
- Remote Preview E2E — SKIPPED por diseño

Después de incorporar ADR + esta especificación deberá repetirse el CI completo antes del STATUS/freeze.

## Fuera de alcance

V0.23.18 no prueba ni activa:

- Supabase Auth real;
- RLS real;
- Storage real;
- expiración real distribuida;
- concurrencia multi-worker;
- provider outages reales;
- retry/backoff distribuido;
- signed URLs reales;
- secrets;
- migrations;
- proyecto DEV;
- billing;
- producción;
- documentos reales;
- OCR;
- revisión profesional;
- radicación.

## Regla para futuros escenarios

No añadir un failure scenario a esta matriz solo porque exista una excepción unitaria.

Debe incorporarse únicamente cuando pruebe una frontera integrada relevante para la futura activación live y tenga un estado esperado claro que pueda verificarse sin infraestructura externa.
