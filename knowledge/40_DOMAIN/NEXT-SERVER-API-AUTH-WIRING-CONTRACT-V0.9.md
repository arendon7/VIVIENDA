# NEXT SERVER API & AUTH WIRING CONTRACT v0.9

## 1. Objetivo

Definir la frontera HTTP server-side de VIVIENDA sobre el baseline v0.8 congelado, de modo que requests provenientes del navegador puedan invocar coordinación de evidencia sin convertirse en autoridad de identidad, permisos, clasificación de seguridad o infraestructura.

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
- `legalDataCategory`;
- `securityTier`;
- objectPath;
- storageLocator;
- bucket interno;
- signed token existente;
- provider receipt;
- checksum declarado por browser.

La sesión normal se consume exclusivamente mediante el `PrincipalSource` user-scoped ya definido en v0.8, detrás del coordinador.

### 3.1 Clasificación documental server-side

La clasificación persistida se deriva server-side desde `kind` mediante `ServerClassifiedEvidenceApplication`.

Defaults operativos mínimos v0.9:

- `statement` → `financial_credit_semiprivate + restricted`;
- `contract` → `financial_credit_semiprivate + restricted`;
- `bank_response` → `financial_credit_semiprivate + restricted`;
- `filing_proof` → `private + restricted`;
- `authority` → `private + highly_restricted`;
- `court_document` → `private + highly_restricted`;
- `other` → `private + highly_restricted` como default conservador, sujeto a reclasificación posterior por contenido.

Durante la transición v0.9 el parser HTTP conserva compatibilidad con `legalDataCategory` y `securityTier` en el body, pero esos valores son **advisory/non-authoritative**: el application decorator los reemplaza antes de persistencia. Un browser no puede degradar un extracto a `non_personal/open`.

Un slice posterior puede retirar esos dos campos del DTO browser una vez actualizado el consumidor.

## 4. DTOs públicos

### Prepare upload request

Path:
- `caseId`.

JSON body de transición v0.9:
- `kind` — única decisión de clasificación con efecto funcional;
- `legalDataCategory` — compatibilidad temporal, no autoridad;
- `securityTier` — compatibilidad temporal, no autoridad.

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
- el tamaño real UTF-8 se vuelve a comprobar después de leer el body;
- JSON inválido → 400;
- array/null/primitivo → 400;
- objeto debe ser plain JSON object;
- top-level fields fuera de la allowlist → 400;
- denylist privilegiada se aplica recursivamente para impedir campos escondidos en objetos anidados.

Esta API nunca transporta bytes del documento. Los bytes viajan directamente al signed upload grant de Storage.

## 6. Trusted origin / CSRF

`request.url` no es fuente de autoridad de origin por sí sola.

Antes de entrar a `EvidenceHttpApi`, cada Route Handler pasa el request por `bindRequestToTrustedOrigin()`:

1. lee `VIVIENDA_TRUSTED_ORIGIN` únicamente server-side;
2. si falta o es inválido, falla cerrado con 503;
3. solo acepta HTTPS, excepto `http://localhost`, `127.0.0.1` o loopback explícito para desarrollo;
4. conserva path/query del request;
5. reconstruye `request.url` sobre el origin configurado;
6. el inner boundary exige después `Origin` browser presente y exactamente igual al origin reconstruido.

Así, un `Host` o proxy-derived URL manipulado no puede convertirse en su propia autoridad de same-origin.

No se usa `NEXT_PUBLIC_*` para esta política.

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

Reglas HTTP v0.9:

- no vacía;
- máximo 200 caracteres;
- caracteres de control prohibidos;
- no se deriva del body;
- se pasa intacta al command de finalize;
- no se loguea su valor completo.

Prepare/download no heredan una falsa garantía de idempotencia que el dominio todavía no ofrece. Sus retries deben ser tratados explícitamente si se requiere replay cache temporal.

## 9. Rate limiting

La frontera define un `ApiRateLimitPort` provider-ready.

La key efectiva debe provenir de contexto server-side y no de un `userId`/IP arbitrario declarado en JSON.

Operaciones iniciales separadas:

- evidence.prepare;
- evidence.complete;
- evidence.download.

Si el límite se excede → 429 + `Retry-After` cuando esté disponible.

Si el provider de rate limit está indisponible → fail closed 503.

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

Todas las respuestas del inner API añaden al menos:

- `Cache-Control: no-store`;
- `Content-Type: application/json; charset=utf-8`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: no-referrer`;
- `X-Request-Id` generado server-side.

El fail-closed del trusted-origin binder aplica la misma política mínima de cache/content/referrer/request-id.

## 14. Route handlers y assembly

Los Route Handlers son thin adapters:

- no contienen reglas de negocio;
- no crean service credentials;
- no resuelven role desde request body;
- no leen directamente env de infraestructura;
- primero aplican trusted-origin binding;
- luego delegan a una instancia server-only de la frontera HTTP.

El runtime v0.9 compone obligatoriamente `ServerClassifiedEvidenceApplication` alrededor de la aplicación concreta.

Mientras no exista infraestructura live, el assembly permanece **fail closed**: rate limiting y application wiring reales no se inventan.

Los tests positivos usan dependency injection con fakes y no requieren Supabase.

## 15. User-scoped vs service-scoped

La frontera mantiene dos conceptos separados:

- sesión/browser → user-scoped principal resolution;
- persistencia/registry/storage físico → service-scoped adapters detrás del coordinador.

Nunca se entrega service-scoped client a un Client Component ni se crea desde un input browser.

## 16. Internal worker boundary

`EvidenceDeletionWorker` no se conecta a una ruta pública en v0.9.

Su activación futura debe usar scheduler/internal authorization separado, no la sesión ordinaria de un cliente.

## 17. Test discovery

Los contract tests de v0.9 viven bajo `server/**/*.test.ts`.

El runner Vitest debe incluir explícitamente:

- `domain/**/*.test.ts`;
- `server/**/*.test.ts`.

Un green build que excluya los tests server-side **no** satisface el gate v0.9.

Este requisito se añadió después de detectar que la configuración inicial de Vitest ejecutaba únicamente `domain/**/*.test.ts`.

## 18. Acceptance criteria

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
11. prepare allowlist exacta de transición;
12. complete allowlist exacta;
13. download allowlist exacta;
14. extra top-level field → 400;
15. privileged key recursiva → 400;
16. role no es autoridad;
17. subjectRef no es autoridad;
18. objectPath no es autoridad;
19. storageLocator no es autoridad;
20. provider token/receipt no es aceptado en complete;
21. legalDataCategory browser no es autoridad;
22. securityTier browser no es autoridad;
23. statement se persiste como financial_credit_semiprivate/restricted;
24. authority/court/other usan default highly_restricted;
25. clasificación pasa por decorator server-side;
26. path caseId validado;
27. path intentId validado;
28. path evidenceId validado;
29. path ID no prueba ownership;
30. trusted origin proviene de configuración server-side;
31. trusted origin ausente/inválido → fail closed;
32. `NEXT_PUBLIC_*` no se usa para trusted origin;
33. Host/request URL recibido no define el origin autorizado;
34. missing Origin bloqueado;
35. cross-origin bloqueado;
36. same-origin contra trusted origin permitido;
37. requestId no se toma del body;
38. rateLimitKey no se toma del body;
39. rate limiter corre antes de aplicación;
40. rate-limited → 429;
41. rate-limit unavailable → 503;
42. complete exige Idempotency-Key;
43. invalid Idempotency-Key → 400;
44. key se pasa a finalize;
45. prepare no promete idempotencia inexistente;
46. response DTO de prepare es allowlisted;
47. prepare response no contiene storageLocator;
48. complete response no serializa snapshot completo;
49. download response no contiene objectPath/storageLocator;
50. signed URL no se loguea;
51. upload token no se loguea;
52. body no se loguea;
53. internal error.message no se devuelve;
54. provider error → 503 seguro;
55. unknown error → 500 seguro;
56. authentication → 401;
57. forbidden → 403;
58. not found → 404;
59. version conflict → 409;
60. data authorization required → 409;
61. no-store en responses;
62. nosniff en responses;
63. no-referrer en responses;
64. server request id en response;
65. route handlers siguen delgados;
66. production assembly fail-closed sin infraestructura;
67. no service key en código browser-facing;
68. no `NEXT_PUBLIC_*` para credenciales privilegiadas;
69. tests no requieren Supabase live;
70. Vitest ejecuta domain + server tests;
71. baseline v0.8 permanece verde;
72. 48/48 E2E baseline permanece verde;
73. Next build permanece verde.

## 19. Fuera de alcance v0.9

- Supabase project live;
- cookies/session provider real;
- Redis/rate limiter real;
- WAF/CDN config;
- proxy trust productivo distinto del trusted-origin explícito;
- upload bytes through Next;
- antivirus/OCR/DLP;
- internal scheduler endpoint;
- payments;
- notifications;
- Open Finance.
