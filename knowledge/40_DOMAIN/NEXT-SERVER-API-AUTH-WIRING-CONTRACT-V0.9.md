# NEXT SERVER API & AUTH WIRING CONTRACT v0.9

## 1. Objetivo

Definir la frontera HTTP server-side de VIVIENDA sobre el baseline v0.8 congelado, de modo que requests provenientes del navegador puedan invocar coordinación de evidencia sin convertirse en autoridad de identidad, permisos o infraestructura.

Base congelada v0.8:

`ac0b47665fdc5dc8691cdcfc7a0d8abbe32bf42b`

Gate de base:

- TypeScript PASS;
- 139/139 domain tests PASS;
- Next build PASS;
- 48/48 E2E PASS.

v0.9 continúa provider-ready: los Route Handlers reales pueden existir en modo fail-closed sin un proyecto Supabase VIVIENDA live.

## 2. Endpoints browser-facing

```text
POST /api/v1/cases/{caseId}/evidence/uploads
POST /api/v1/cases/{caseId}/evidence/uploads/{intentId}/complete
POST /api/v1/cases/{caseId}/evidence/{evidenceId}/download
```

No se expone endpoint browser para:

- delete worker;
- orphan cleanup;
- service principal;
- registry físico;
- Storage service client;
- identity upsert;
- object resolution.

Esas operaciones permanecen backend/internal-only.

## 3. Regla de autoridad

El navegador puede aportar intención de negocio mínima, nunca autoridad.

No son autoridad:

- `subjectRef`;
- `role`/`principalKind`;
- `service`/`serviceRole`;
- owner ids;
- lawyer/admin flags;
- objectPath;
- storageLocator;
- bucket interno;
- signed token existente;
- provider receipt;
- checksum declarado por browser.

La sesión normal se consume exclusivamente mediante el `PrincipalSource` user-scoped ya definido en v0.8, detrás del coordinador.

## 4. DTOs públicos

### Prepare upload request

Path:
- `caseId`.

JSON body allowlist exacta:
- `kind`;
- `legalDataCategory`;
- `securityTier`.

No se acepta ningún campo adicional.

### Prepare upload response

DTO explícito:
- intentId;
- evidenceId;
- intentExpiresAt;
- providerGrantExpiresAt;
- upload token;
- bucket/path únicamente porque el adapter Supabase browser los necesita para el upload firmado;
- `upsert:false`.

Nunca:
- storageLocator;
- subjectRef;
- checksum;
- service credentials.

### Complete upload request

Path:
- `caseId`;
- `intentId`.

Header obligatorio:
- `Idempotency-Key`.

Body allowlist exacta:
- `expectedVersion`.

El browser no suministra receipt, MIME, checksum, byteSize ni storageLocator.

### Complete upload response

DTO mínimo:
- mutation kind;
- caseId;
- resulting case version;
- resulting stage.

No serializa el snapshot/persistence result completo.

### Download request

Path:
- `caseId`;
- `evidenceId`.

Body allowlist:
- vacío; o
- `expiresInSeconds`.

### Download response

DTO explícito:
- evidenceId;
- signed URL;
- expiresAt.

Nunca:
- storageLocator;
- objectPath;
- service token.

## 5. Request parsing

Todos los endpoints mutantes usan `POST` y exigen JSON.

Reglas:

- `Content-Type` debe ser `application/json` con parámetros opcionales válidos;
- request body máximo inicial: 16 KiB;
- `Content-Length` excesivo permite rechazo temprano;
- el tamaño real se vuelve a comprobar después de leer el body;
- JSON inválido → 400;
- array/null/primitivo → 400;
- objeto debe ser plain JSON object;
- top-level fields fuera de la allowlist → 400;
- denylist privilegiada se aplica recursivamente para impedir campos escondidos en objetos anidados.

Esta API nunca transporta bytes del documento. Los bytes viajan directamente al signed upload grant de Storage.

## 6. Same-origin / CSRF

Los endpoints browser-facing exigen `Origin` válido y exactamente igual al `origin` del request URL reconstruido por el servidor.

En despliegue detrás de proxy, la reconstrucción confiable del origin pertenece al adapter de infraestructura y no debe confiar ciegamente en headers arbitrarios del usuario.

En v0.9 puro se prueba:

- missing Origin → forbidden;
- cross-origin → forbidden;
- same-origin → permitido.

Cookies de sesión, cuando se activen, deben usar configuración compatible con esta estrategia y no sustituyen la comprobación de origin.

## 7. Path identifiers

Patrones iniciales:

- case: `case_[A-Za-z0-9_-]{3,}`;
- intent: `upl_[A-Za-z0-9_-]{3,}`;
- evidence: `evd_[A-Za-z0-9_-]{3,}`.

IDs inválidos se rechazan antes de llegar a aplicación.

Path params identifican recurso, pero no prueban ownership. El coordinador/application service vuelve a autorizar.

## 8. Idempotency

`complete upload` exige `Idempotency-Key` porque la operación de finalización ya posee semántica idempotente en el persistence boundary.

Reglas HTTP:

- 1–200 caracteres;
- caracteres de control prohibidos;
- no se deriva del body;
- se pasa intacta al command de finalize;
- no se loguea su valor completo.

Prepare/download no heredan una falsa garantía de idempotencia que el dominio todavía no ofrece. Sus retries deben ser tratados explícitamente en un slice posterior si se requiere replay cache temporal.

## 9. Rate limiting

La frontera define un `ApiRateLimitPort` provider-ready.

La key efectiva debe provenir de contexto server-side y no de un `userId`/IP arbitrario declarado en JSON.

Operaciones iniciales separadas:

- evidence.prepare;
- evidence.complete;
- evidence.download.

Si el límite se excede → 429 + `Retry-After` cuando esté disponible.

No se instala Redis ni servicio externo en v0.9.

## 10. Request context

Un `ApiRequestContextSource` server-side suministra:

- requestId generado/confiable;
- rateLimitKey opaca.

No se usa como principal jurídico ni sustituye `PrincipalSource`.

Headers del cliente como `X-User-Id`, `X-Role`, `X-Forwarded-User` o `X-Subject-Ref` nunca se convierten en identidad de dominio.

## 11. Logging

Port de auditoría técnica mínimo:

- requestId;
- operation;
- outcome/status;
- errorCode público cuando exista;
- duration opcional en adapter futuro.

Nunca loguear:

- body completo;
- signed URL;
- upload token;
- objectPath;
- storageLocator;
- service key;
- subjectRef;
- email/teléfono/cédula;
- Idempotency-Key completa.

## 12. Error mapping

`PersistenceBoundaryError` se transforma a un catálogo HTTP seguro.

Ejemplos:

- authentication_required → 401;
- forbidden → 403;
- not-found family → 404;
- invalid command/identifier → 400;
- data authorization required → 409;
- version/idempotency conflict → 409;
- legal hold conflict → 409;
- provider_error → 503;
- unknown exception → 500.

La respuesta pública contiene código estable y mensaje genérico. No reenvía `error.message`, SQL, provider body, stack o hints.

## 13. Response security

Todas las respuestas API añaden al menos:

- `Cache-Control: no-store`;
- `Content-Type: application/json; charset=utf-8`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: no-referrer`;
- `X-Request-Id` generado server-side.

## 14. Route handlers y assembly

Los Route Handlers son thin adapters:

- no contienen reglas de negocio;
- no crean service credentials;
- no resuelven role desde request body;
- delegan a una instancia server-only de la frontera HTTP.

Mientras no exista infraestructura live, el assembly de producción v0.9 permanece **fail closed**: un request que supere guards pero requiera aplicación no configurada recibe error provider/unavailable seguro.

Los tests positivos usan dependency injection con fakes y no requieren Supabase.

## 15. User-scoped vs service-scoped

La frontera mantiene dos conceptos separados:

- sesión/browser → user-scoped principal resolution;
- persistencia/registry/storage físico → service-scoped adapters detrás del coordinador.

Nunca se entrega service-scoped client a un Client Component ni se crea desde un input browser.

## 16. Internal worker boundary

`EvidenceDeletionWorker` no se conecta a una ruta pública en v0.9.

Su activación futura debe usar scheduler/internal authorization separado, no la sesión ordinaria de un cliente.

## 17. Acceptance criteria

1. v0.9 nace exactamente de `ac0b476...`;
2. v0.8 no se modifica;
3. tres operaciones HTTP browser-facing explícitas;
4. no existe browser delete endpoint;
5. POST obligatorio;
6. JSON content-type obligatorio;
7. max body 16 KiB;
8. actual body size se verifica aunque falte Content-Length;
9. invalid JSON → 400;
10. primitive/array/null body → 400;
11. prepare allowlist exacta;
12. complete allowlist exacta;
13. download allowlist exacta;
14. extra top-level field → 400;
15. privileged key recursiva → 400;
16. role no es aceptado;
17. subjectRef no es aceptado;
18. objectPath no es aceptado;
19. storageLocator no es aceptado;
20. provider token/receipt no es aceptado en complete;
21. path caseId validado;
22. path intentId validado;
23. path evidenceId validado;
24. path ID no prueba ownership;
25. same-origin requerido;
26. missing Origin bloqueado;
27. cross-origin bloqueado;
28. requestId no se toma del body;
29. rateLimitKey no se toma del body;
30. rate limiter corre antes de aplicación;
31. rate-limited → 429;
32. complete exige Idempotency-Key;
33. invalid Idempotency-Key → 400;
34. key se pasa a finalize;
35. prepare no promete idempotencia inexistente;
36. response DTO de prepare es allowlisted;
37. prepare response no contiene storageLocator;
38. complete response no serializa snapshot completo;
39. download response no contiene objectPath/storageLocator;
40. signed URL no se loguea;
41. upload token no se loguea;
42. body no se loguea;
43. internal error.message no se devuelve;
44. provider error → 503 seguro;
45. unknown error → 500 seguro;
46. authentication → 401;
47. forbidden → 403;
48. not found → 404;
49. version conflict → 409;
50. data authorization required → 409;
51. no-store en responses;
52. nosniff en responses;
53. no-referrer en responses;
54. server request id en response;
55. route handlers son adapters delgados;
56. production assembly fail-closed sin infraestructura;
57. no service key en código browser-facing;
58. no `NEXT_PUBLIC_*` para credenciales privilegiadas;
59. tests no requieren Supabase live;
60. 139/139 baseline permanece verde;
61. 48/48 E2E baseline permanece verde;
62. Next build permanece verde.

## 18. Fuera de alcance v0.9

- Supabase project live;
- cookies/session provider real;
- Redis/rate limiter real;
- WAF/CDN config;
- trusted proxy deployment config;
- upload bytes through Next;
- antivirus/OCR/DLP;
- internal scheduler endpoint;
- payments;
- notifications;
- Open Finance.
