# AUTH & STORAGE COORDINATION CONTRACT v0.8

## 1. Objetivo

Definir la frontera server-side que coordina identidad autenticada, `CasePersistenceService`, Supabase Storage y el object registry sin exponer privilegios de infraestructura al navegador ni degradar los invariantes congelados en v0.7.

v0.8 sigue siendo provider-ready: no requiere todavía un proyecto Supabase VIVIENDA live, service key real, PII real ni documentos reales.

## 2. Baseline

Base congelada v0.7:

`2d48fee45cc2e05391c0349700e74301268dc094`

Gate de base:

- TypeScript PASS;
- 107/107 domain tests PASS;
- Next build PASS;
- 48/48 E2E PASS.

## 3. Principios

1. El navegador nunca recibe service-role/secret key.
2. Una sesión no se convierte directamente en autorización de expediente.
3. El principal se resuelve server-side a `subjectRef` opaco.
4. `CasePersistenceService` sigue siendo la autoridad de ownership y permisos de caso.
5. Storage no decide si un archivo es evidencia válida.
6. Un objeto físico en cuarentena no implica `EVIDENCE_ATTACHED`.
7. Un signed upload grant no amplía la vigencia del evidence intent.
8. URLs/tokens firmados son efímeros y nunca se persisten en Case Log ni metadata canónica.
9. Object paths son generados por servidor y no incorporan filename, email, cédula, nombre ni términos semánticos del documento.
10. `upsert` está prohibido para evidencia: cada upload utiliza un path nuevo.
11. Tombstone lógico y borrado físico son hechos distintos.
12. El coordinador no muta Case Log directamente; usa el application service existente.

## 4. Arquitectura

```text
Browser
  ↓ request con sesión normal
Next server boundary
  ↓
User-scoped PrincipalResolver
  ↓ subjectRef opaco
EvidenceStorageCoordinator
  ├─ CasePersistenceService
  ├─ EvidenceObjectRegistry
  ├─ StorageGateway (server privileged)
  ├─ ObjectVerifier
  └─ OpaqueObjectCoordinateFactory
```

El delete worker usa:

```text
service scheduler/worker
  ↓
EvidenceDeletionWorker
  ├─ EvidenceObjectRegistry
  └─ StorageGateway
```

## 5. Principal resolution

La entrada de una operación autenticada debe resolver un principal mediante una fuente server-side/user-scoped.

No se aceptan como autoridad:

- role enviado por request body;
- subjectRef enviado por navegador;
- ownerCaseId enviado como prueba de ownership;
- email como identificador de dominio;
- claims no verificados usados directamente por UI.

La salida autorizada es únicamente:

- client + subjectRef;
- lawyer + subjectRef;
- admin + subjectRef;
- null/no authenticated principal.

Service principals se construyen únicamente en backend controlado y no provienen de una sesión browser.

## 6. Upload flow

### Fase 1 — prepare

1. resolver principal autenticado;
2. `CasePersistenceService.prepareEvidenceUpload()` valida ownership, autorización de datos y clasificación;
3. obtener `intentId`, `evidenceId` y `intentExpiresAt`;
4. generar `storageLocator` y `objectPath` opacos server-side;
5. registrar/reservar las coordenadas físicas antes de emitir el grant;
6. emitir signed upload grant con `upsert:false`;
7. devolver al navegador únicamente lo mínimo necesario para subir.

Registrar primero la reserva evita un upload firmado cuyo path no pueda reconciliarse posteriormente.

Si la emisión del signed grant falla después de reservar coordenadas, la reserva queda en cuarentena y es recuperable por cleanup.

## 7. Ventanas temporales

El evidence intent de VIVIENDA mantiene la ventana de 15 minutos definida en v0.6.

La implementación actual de Supabase puede emitir signed upload grants con una vigencia de proveedor mayor (documentación vigente: 2 horas).

Estas ventanas **no son equivalentes**.

Regla:

- el token puede permitir físicamente una subida tardía;
- `finalizeEvidenceUpload()` debe rechazar un intent expirado;
- la subida tardía permanece como objeto huérfano/no-evidencia;
- orphan cleanup debe eliminarla posteriormente.

Nunca se extiende el intent de negocio para igualarlo silenciosamente al token del proveedor.

## 8. Object path

Formato conceptual:

`quarantine/<opaque-intent>/<opaque-evidence>/<opaque-object>`

Propiedades:

- generado exclusivamente server-side;
- no filename original;
- no extensión derivada del nombre del usuario;
- no caseId si no es necesario;
- no subjectRef;
- no email/teléfono/cédula;
- no tipo de proceso jurídico;
- no nombre de banco;
- no overwrite.

`storageLocator` es un identificador opaco distinto del physical path.

## 9. Signed upload grant

El grant read model puede contener:

- intentId;
- evidenceId;
- provider token/signed upload URL según adapter;
- object path solo si el SDK cliente lo exige;
- provider expiry informativa;
- intent expiry autoritativa;
- `upsert:false`.

El grant:

- no se persiste;
- no se registra en Case Log;
- no cambia precisión C2/C3;
- no prueba que el objeto exista;
- no prueba MIME, tamaño ni checksum.

## 10. Upload verification

Después de la subida, el backend debe inspeccionar el objeto reservado y producir un `VerifiedUploadReceipt` con:

- evidenceId correcto;
- storageLocator reservado;
- MIME permitido;
- byteSize dentro de límites;
- SHA-256 calculado/verificado;
- verifiedAt.

La verificación nunca confía en MIME, size o checksum enviados exclusivamente por navegador.

Si el objeto no existe o no coincide con la reserva, no se llama `finalizeEvidenceUpload()`.

## 11. Finalize

El coordinador llama:

`CasePersistenceService.finalizeEvidenceUpload(principal, caseId, command)`

El servicio existente vuelve a comprobar:

- acceso;
- autorización de tratamiento;
- expectedVersion;
- idempotency;
- intent activo;
- evidenceId;
- receipt;
- expiración;
- transición de dominio.

Solo la transacción DB final convierte el objeto en evidencia y crea `EVIDENCE_ATTACHED`.

## 12. Download flow

1. resolver principal;
2. `CasePersistenceService.readCase()` valida ownership/assignment/admin;
3. confirmar en read model que evidenceId existe, está visible y no está tombstoned;
4. resolver coordenadas físicas con RPC service-only;
5. emitir signed URL efímera desde backend;
6. devolver URL al cliente;
7. no persistir URL/token.

TTL inicial de VIVIENDA:

- default 60 segundos;
- máximo 300 segundos.

Una nueva descarga requiere nueva autorización y nuevo grant.

## 13. Storage gateway

Port mínimo:

- createSignedUploadGrant(bucketId, objectPath, upsert=false);
- inspectAndHashObject(bucketId, objectPath);
- createSignedDownloadGrant(bucketId, objectPath, expiresInSeconds);
- deleteObject(bucketId, objectPath).

`deleteObject` se considera idempotente: object-not-found puede tratarse como estado final borrado siempre que el path haya sido resuelto desde registry autorizado.

## 14. Registry queries v0.8

El registry necesita, además de v0.7:

- resolve reserved object by `intentId`;
- resolve active physical object by `(caseId,evidenceId)`;
- list pending physical deletions;
- mark physical deletion confirmed.

Todas son service-role only y no exponen rutas físicas al browser.

## 15. Orphan cleanup

Worker:

1. expirar intents vencidos;
2. recibir coordenadas físicas reservadas;
3. borrar Storage si existe;
4. confirmar `deleted_at` únicamente después de delete success/not-found;
5. no crear eventos en Case Log;
6. continuar procesando otros objetos si uno falla;
7. dejar fallidos pendientes para retry.

## 16. Tombstone deletion worker

1. listar `deletion_requested_at` no confirmados;
2. borrar objeto físico;
3. confirmar `deleted_at`;
4. nunca restaurar metadata;
5. nunca modificar eventos históricos;
6. respetar que `legal_hold` impide que se cree la solicitud de borrado.

## 17. Errores

Errores de aplicación permanecen en `PersistenceBoundaryError`.

Errores de Storage no deben filtrar:

- bucket interno;
- object path;
- SQL;
- service role key;
- signed token;
- provider response body sensible.

Código público recomendado: `provider_error` salvo códigos de dominio ya conocidos.

## 18. Next server boundary

Todo wiring privilegiado debe vivir en módulos marcados/server-only o rutas server-side.

Prohibido:

- importar service client desde Client Components;
- exportar service key en variables `NEXT_PUBLIC_*`;
- enviar `storageLocator` al browser;
- aceptar objectPath arbitrario del cliente;
- aceptar role/subjectRef del cliente como autoridad.

## 19. Provider adapters

v0.8 puede implementar ports sin instalar aún `@supabase/supabase-js`.

Cuando se active infraestructura real:

- user-scoped client: publishable key + sesión/JWT normal;
- service client: secret/service role únicamente server-side;
- Storage privileged operations: service client;
- browser upload: signed upload token/grant, nunca service key.

## 20. Current Supabase behavior captured by contract

A la fecha de v0.8:

- private buckets aplican control de acceso también a downloads;
- private download puede usar JWT/RLS o signed URL;
- signed download URL tiene TTL configurable;
- signed upload URL es time-limited y la documentación JavaScript vigente indica 2 horas;
- signed upload admite opción `upsert`; VIVIENDA debe usar `false`;
- new-path uploads son preferibles a overwrites.

Estos datos son adapter/provider facts, no reglas de dominio.

## 21. Acceptance criteria

1. principal se resuelve server-side;
2. anonymous no prepara upload;
3. client no puede suministrar subjectRef efectivo;
4. service key no forma parte de ningún tipo browser-facing;
5. prepare llama primero al application service;
6. coordenadas son opacas;
7. no filename en path;
8. registry reservation existe antes del signed upload grant;
9. signed upload usa upsert false;
10. grant no cambia C2/C3;
11. grant no crea event;
12. intent expiry y provider expiry son campos distintos;
13. intent expirado no finaliza aunque token aún funcione;
14. upload verifier no confía en metadata browser;
15. receipt usa storageLocator reservado;
16. finalize usa expectedVersion;
17. finalize usa idempotency key;
18. object missing no finaliza;
19. checksum inválido no finaliza;
20. MIME inválido no finaliza;
21. size inválido no finaliza;
22. download exige readCase previo;
23. download exige evidence activa;
24. tombstoned no recibe signed download;
25. storageLocator no se devuelve en download grant;
26. download TTL default 60;
27. download TTL máximo 300;
28. signed URL no se persiste;
29. signed token no entra al journal;
30. object path no entra al journal;
31. pending deletion query es service-only;
32. delete worker marca DB solo tras delete success/not-found;
33. delete failure queda pendiente;
34. worker continúa después de un fallo individual;
35. orphan cleanup no crea EVIDENCE_ATTACHED;
36. tombstone cleanup no modifica journal;
37. resolve-by-intent es service-only;
38. resolve-active-evidence es service-only;
39. resolver físico comprueba lifecycle active;
40. user cannot choose object path;
41. user cannot request upsert;
42. provider error redacta paths/tokens;
43. user-scoped principal resolver no devuelve service principal;
44. service principal no proviene del navegador;
45. coordination layer no modifica Case State Machine;
46. coordination layer no modifica Opportunity Router;
47. no proyecto Supabase live requerido para contract tests;
48. baseline v0.7 permanece verde;
49. tests verifican orden prepare→reserve→grant;
50. tests verifican readCase→resolve physical→sign download.

## 22. Fuera de alcance v0.8

- proyecto Supabase VIVIENDA live;
- service key real;
- PII/documentos reales;
- antivirus productivo;
- OCR productivo;
- DLP;
- KMS propio;
- resumable upload UI;
- background scheduler productivo;
- notificaciones;
- pagos;
- Open Finance.
