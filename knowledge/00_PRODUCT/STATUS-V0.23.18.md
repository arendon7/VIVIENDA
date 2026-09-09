# STATUS · V0.23.18 · Synthetic Evidence Failure Rehearsal

## Estado

**Candidato de freeze documental.**

Rama:

`product/synthetic-evidence-failure-rehearsal-v0.23.18`

Base inmediata:

`product/synthetic-evidence-runtime-rehearsal-v0.23.17`

Freeze padre V0.23.17:

`b52efd7ab67f2f8c56be3bfdd1d505842c644a57`

Head funcional/documental previo a este STATUS:

`c170cf6c7c13a431163e1856886269459e8a0eed`

## Pregunta de producto/arquitectura

V0.23.17 probó que la composición real de Case + privacidad + Storage coordination + HTTP puede completar correctamente un happy path R7 asistido de manera sintética, determinística y sin infraestructura externa.

Antes de cualquier futura activación live faltaba demostrar la propiedad complementaria:

> ¿La misma composición completa falla cerrada cuando identidad, autorización de datos, ownership, objeto físico o rate limiting impiden continuar, sin fabricar evidencia ni avanzar el Case?

## Respuesta V0.23.18

Sí.

V0.23.18 incorpora un **Synthetic Evidence Failure Rehearsal** separado del happy path de V0.23.17.

La matriz usa la composición real:

`MemoryCasePersistence`
→ `CasePersistenceService`
→ `EvidenceStorageCoordinator`
→ `ServerClassifiedEvidenceApplication`
→ `EvidenceHttpApi`

Los únicos adapters sustituidos son los de infraestructura externa y todos son determinísticos/in-memory.

No se modifica `runtime.server.ts`, no se importa `createActivatedEvidenceRuntime` y no se ejecuta IO externo.

## Matriz adversarial canónica

La matriz cubre exactamente cinco escenarios:

1. `unauthenticated_prepare`
2. `missing_data_authorization`
3. `cross_case_access`
4. `missing_uploaded_object`
5. `rate_limit_unavailable`

### 1. Sin autenticación

`evidence.prepare` se ejecuta sin principal autenticado.

Resultado:

- HTTP `401`;
- error `authentication_required`;
- cero registry registrations;
- cero upload grants;
- cero inspecciones de Storage;
- cero evidencia persistida;
- cero `EVIDENCE_ATTACHED`.

La autenticación falla antes de tocar Storage.

### 2. Sin autorización de datos

Existe Case R7 asistido y service agreement, pero no existe autorización de datos activa.

Resultado:

- HTTP `409`;
- error `data_authorization_required`;
- cero registry registrations;
- cero upload grants;
- cero inspecciones de Storage;
- cero evidencia persistida;
- cero `EVIDENCE_ATTACHED`.

El Case no puede recibir material documental sin la finalidad autorizada requerida.

### 3. Acceso cruzado a otro Case

El Case pertenece al cliente propietario, pero el request resuelve otro cliente autenticado.

Resultado:

- HTTP `403`;
- error `forbidden`;
- cero registry registrations;
- cero upload grants;
- cero inspecciones de Storage;
- cero evidencia persistida;
- cero `EVIDENCE_ATTACHED`.

Ownership/authorization bloquea antes de infraestructura física.

### 4. Objeto físico ausente al completar

El upload intent se prepara correctamente, pero el objeto no existe cuando se ejecuta `evidence.complete`.

Resultado:

- prepare HTTP `200`;
- complete HTTP `404`;
- error `evidence_not_found`;
- una registry registration;
- un upload grant;
- una inspección de Storage;
- intent permanece `quarantine`;
- evidencia persistida = `0`;
- no aparece `EVIDENCE_ATTACHED`.

La ausencia física del objeto no puede convertirse en metadata o receipt de evidencia ficticio.

### 5. Rate limiter indisponible

El control de abuso responde `unavailable`.

Resultado:

- HTTP `503`;
- error `rate_limit_unavailable`;
- cero registry registrations;
- cero upload grants;
- cero inspecciones de Storage;
- cero evidencia persistida;
- cero `EVIDENCE_ATTACHED`.

La frontera HTTP es fail-closed cuando el rate limiter no puede decidir.

## Contrato común de rechazo

Para cada escenario se verifica:

- `evidenceCount = 0`;
- el timeline no contiene `EVIDENCE_ATTACHED`;
- la operación rechazada no incrementa la versión del Case;
- el error público está sanitizado;
- no se filtran locators, checksum ni tokens;
- no ocurre IO externo;
- no existe autoridad de activación live;
- `runtime.server.ts` no participa.

Un escenario verde significa que la operación **falló exactamente como debía fallar**.

## Estado final del Case

Los escenarios terminan sin evidencia persistida y sin transición derivada de una operación rechazada.

Los tests fijan las versiones esperadas según el fixture previo al rechazo:

- `unauthenticated_prepare` → versión `4`;
- `missing_data_authorization` → versión `3`;
- `cross_case_access` → versión `4`;
- `missing_uploaded_object` → versión `4`;
- `rate_limit_unavailable` → versión `4`.

Todos permanecen en `stage = draft`.

## Orden efectivo de controles

V0.23.18 demuestra una propiedad relevante de composición:

- auth puede bloquear antes de Storage;
- data authorization puede bloquear antes de Storage;
- ownership puede bloquear antes de Storage;
- rate limiting puede bloquear antes de Storage;
- una vez creado un upload intent, la ausencia física del objeto bloquea finalización y mantiene quarantine.

Esto evita que controles posteriores compensen incorrectamente una falla de una capa anterior.

## Sanitización de errores

Los errores públicos no contienen:

- `storageLocator`;
- SHA/checksum;
- upload token;
- object paths internos;
- secretos;
- detalle de provider;
- PII real.

La auditoría sintética conserva únicamente material seguro como:

- operación;
- status HTTP;
- error code.

## Flags de verdad

Todos los reportes conservan:

- `mode = synthetic_failure_rehearsal`;
- `externalIoOccurred = false`;
- `liveRuntimeAuthorized = false`;
- `runtimeServerWasUsed = false`.

La matriz no genera hechos de activación.

## Relación con V0.23.17

V0.23.17 prueba:

> la composición completa puede completar correctamente un happy path sintético.

V0.23.18 prueba:

> la misma composición puede rechazar correctamente condiciones adversas sin producir estado falso.

Ambos son baseline semántico para comparar en el futuro un adapter DEV real.

Ninguno sustituye:

- V0.23.12 Activation Preflight;
- V0.23.13 Provisioning Blueprint;
- V0.23.14 DEV Qualification;
- V0.23.15 Provider Capacity Preflight;
- V0.23.16 Provider Capacity Recovery.

## Separación del runtime live

V0.23.18 no:

- modifica `runtime.server.ts`;
- importa `runtime.server.ts`;
- importa `createActivatedEvidenceRuntime`;
- construye `EvidenceRuntimeActivationFacts`;
- crea proyecto Supabase;
- ejecuta Supabase Auth;
- valida RLS live;
- usa Storage live;
- usa secretos;
- consume red externa;
- habilita nuevas rutas públicas;
- activa un Case real;
- acepta documentos reales.

## Archivos del slice antes de STATUS

1. `server/evidence-api/synthetic-failure-rehearsal.ts`
2. `server/evidence-api/synthetic-failure-rehearsal.test.ts`
3. `knowledge/10_DECISIONS/ADR-0014-synthetic-evidence-failure-rehearsal.md`
4. `knowledge/60_ENGINEERING/SYNTHETIC-EVIDENCE-FAILURE-REHEARSAL-V0.23.18.md`

Este STATUS es el quinto archivo del slice.

## Diff documental/funcional previo al STATUS

Contra el freeze padre V0.23.17:

- 4 commits;
- 4 archivos;
- +1146 / -0.

Distribución:

- ADR-0014: +206;
- engineering spec: +313;
- failure tests: +125;
- failure rehearsal: +502.

## Verificación funcional inicial

Head funcional:

`0b2885bcdf22c4b25ea26a55d1be103559004d2d`

GitHub Actions run:

`34310518478`

Resultado:

- TypeScript — **PASS**
- Domain tests — **PASS**
- Build — **PASS**
- Playwright — **244/244 PASS**
- Remote Preview E2E — **SKIPPED por diseño**

Playwright reportó:

`244 passed (2.4m)`

## Verificación funcional/documental previa al STATUS

Head:

`c170cf6c7c13a431163e1856886269459e8a0eed`

GitHub Actions run:

`34310919216`

Resultado:

- TypeScript — **PASS**
- Domain tests — **PASS**
- Build — **PASS**
- Playwright — **244/244 PASS**
- Remote Preview E2E — **SKIPPED por diseño**

Playwright reportó:

`244 passed (1.6m)`

## Invariantes de freeze

El SHA generado por este STATUS deberá repetir antes de abrir el PR:

1. TypeScript PASS;
2. Domain tests PASS;
3. Build PASS;
4. Playwright 244/244 PASS;
5. Remote Preview E2E SKIPPED por diseño.

Después del freeze definitivo:

- no se añadirán commits;
- el PR será draft;
- su base será V0.23.17/#46, no `main`;
- el CI del merge ref deberá quedar verde;
- se registrará comentario final de freeze;
- no se fusionará el stack.

## Zero semantic bridge

V0.23.18 no crea ningún puente semántico desde “failure matrix verde” hacia:

- provider disponible;
- capacidad liberada;
- proyecto Supabase creado;
- DEV provisionado;
- DEV calificado;
- Auth live verificado;
- RLS live verificado;
- Storage live verificado;
- rate limiter live disponible;
- runtime activado;
- Case real creado;
- consentimiento real registrado;
- contrato real aceptado;
- documento real almacenado;
- servicio profesional contratado;
- poder otorgado;
- radicación ejecutada.

## Fuera de alcance

- crear `vivienda-dev`;
- pausar infraestructura Supabase existente;
- cambiar organización;
- upgrade/billing;
- aplicar migrations externas;
- activar Auth/RLS/Storage;
- configurar secrets live;
- almacenar documentos reales;
- OCR;
- firma;
- pago;
- representación o poder;
- contratación profesional;
- radicación bancaria o judicial;
- STAGING/PROD;
- merge de PRs.

## Criterio de cierre

V0.23.18 queda cerrado únicamente cuando:

- este STATUS tenga freeze SHA propio;
- el freeze repita verify + 244 E2E;
- exista PR draft apilado sobre #46;
- `mergeable = true`;
- CI propio del PR pase verify + 244/244 E2E;
- se registre comentario final de freeze;
- no existan commits posteriores.
