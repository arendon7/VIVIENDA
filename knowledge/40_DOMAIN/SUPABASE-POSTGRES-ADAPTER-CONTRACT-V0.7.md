# SUPABASE / POSTGRES ADAPTER CONTRACT v0.7

## 1. Objetivo

Implementar un adapter de infraestructura para `CasePersistencePort` sobre Supabase/Postgres sin modificar la semántica de dominio congelada en v0.6.

El adapter debe preservar:

- Case Log append-only;
- replay determinista;
- optimistic concurrency por `expectedVersion`;
- strict idempotency por `idempotencyKey + semanticFingerprint`;
- separación entre hechos, identidad que los registra y evidencia;
- historial versionado de autorizaciones;
- minimización de datos;
- read model redactado;
- evidencia en dos fases;
- tombstone sin reescritura de historia.

## 2. Estado de infraestructura

Al iniciar v0.7 no existe un proyecto Supabase dedicado a VIVIENDA en la cuenta conectada. Por tanto esta versión entrega schema, RPCs, adapter y contract tests provider-ready, pero **no aplica migraciones sobre un proyecto ajeno** ni crea un proyecto con costo sin autorización expresa.

La activación sobre un proyecto real será un gate separado.

## 3. Arquitectura objetivo

```text
Next/API
  ↓
CasePersistenceService (v0.6)
  ↓
CasePersistencePort
  ↓
SupabaseCasePersistenceAdapter
  ↓
PostgREST/RPC
  ↓
Postgres transaction
  ├─ private.vivienda_cases
  ├─ private.vivienda_case_journal
  ├─ private.vivienda_case_lawyer_assignments
  ├─ private.vivienda_data_authorizations
  ├─ private.vivienda_evidence_intents
  ├─ private.vivienda_evidence_metadata
  ├─ private.vivienda_evidence_objects
  └─ private.vivienda_identity_subjects
```

Storage queda separado:

```text
prepare intent → signed/direct authenticated upload → private bucket quarantine object
→ verify receipt → finalize RPC transaction
```

## 4. Principio de schemas

### 4.1 Datos internos

Las tablas canónicas viven en schema `private` y no se exponen directamente por Data API.

### 4.2 API

Las operaciones remotas se exponen como funciones estrechas en `public`, con:

- `security definer` solo cuando sea indispensable;
- `set search_path = ''`;
- todos los nombres de objetos schema-qualified;
- checks explícitos de identidad y acceso;
- permisos `EXECUTE` mínimos;
- sin acceso directo de `anon` a datos de expediente.

### 4.3 RLS

Aunque las tablas internas no se expongan directamente, se habilita RLS como defensa adicional. Se revocan grants de `anon` y `authenticated` sobre tablas internas.

Las funciones públicas no deben convertir RLS en un sustituto de las reglas del application service: ambas capas deben defender ownership y autoridad.

## 5. Identidad

`auth.users.id` nunca reemplaza el `subjectRef` interno del dominio.

Tabla:

`private.vivienda_identity_subjects`

Campos mínimos:

- `auth_user_id uuid unique`;
- `subject_ref text unique`;
- `principal_kind client|lawyer|admin`;
- `status active|disabled`;
- timestamps.

No persistir email, teléfono, nombre ni cédula en esta tabla.

El adapter recibe/produce `subjectRef`; la resolución entre `auth.uid()` y `subjectRef` ocurre server/database-side.

## 6. Casos

`private.vivienda_cases`

Debe contener:

- `case_id` opaco como PK;
- `owner_subject_ref`;
- `current_version integer >= 1`;
- timestamps;
- estado técnico de archivado si fuese necesario en futuro.

El estado jurídico/operativo no se guarda como verdad mutable en esta tabla; se deriva del journal.

## 7. Case Journal

`private.vivienda_case_journal`

Columnas mínimas:

- `case_id`;
- `sequence`;
- `event_id` único;
- `event_type`;
- `occurred_at`;
- `recorded_at`;
- `actor_kind`;
- `actor_subject_ref nullable`;
- `idempotency_key`;
- `semantic_fingerprint`;
- `recorded_by_subject_ref`;
- `recorded_by_principal_kind`;
- `request_id`;
- `stored_at`;
- `payload jsonb`;
- `evidence_refs text[]`.

Constraints:

- PK `(case_id, sequence)`;
- unique `(case_id, idempotency_key)`;
- `event_id` unique global;
- fingerprints SHA-256 hex;
- secuencia positiva;
- referencias de evidencia con forma opaca `evd_*`;
- no UPDATE/DELETE desde API.

## 8. Atomic append

El append debe ejecutarse dentro de una sola función/transacción Postgres:

1. bloquear la fila del caso `FOR UPDATE`;
2. resolver retry por `idempotencyKey` antes de validar versión;
3. si existe misma key + mismo fingerprint → devolver duplicate;
4. si misma key + fingerprint distinto → idempotency conflict;
5. comparar `expectedVersion` con `current_version`;
6. validar siguiente `sequence = current_version + 1`;
7. insertar journal;
8. actualizar `current_version`;
9. devolver snapshot/record necesario.

No puede existir ventana donde journal y versión discrepen.

## 9. Autorizaciones de datos

`private.vivienda_data_authorizations` es histórica, no mutable como simple booleano.

Estados:

- `active`;
- `superseded`;
- `revoked`.

Al conceder una nueva autorización:

- la active anterior del mismo case+subject pasa a `superseded`;
- se inserta la nueva versión;
- se inserta `DATA_AUTHORIZATION_RECORDED`;
- se actualiza `current_version`;
- todo ocurre en una transacción.

Debe existir como máximo una autorización `active` por case+subject.

La finalidad debe ser explícita. `marketing` por sí sola no habilita evidencia hipotecaria.

## 10. Evidence intents

`private.vivienda_evidence_intents`

Debe registrar:

- intent opaco;
- evidence id opaco único;
- case;
- creator subject ref;
- kind;
- legal data category;
- security tier;
- display label genérico;
- created/expiry;
- status `quarantine|finalized|expired`.

Un intent no constituye evidencia válida.

## 11. Evidence metadata

`private.vivienda_evidence_metadata`

Debe registrar únicamente metadata validada:

- evidence id;
- case;
- kind;
- legal category;
- security tier;
- display label genérico;
- mime type;
- byte size;
- SHA-256;
- opaque storage locator;
- lifecycle `active|legal_hold|tombstoned`;
- timestamps de tombstone y razón cuando aplique.

No se guarda signed URL.

## 12. Storage object mapping

`private.vivienda_evidence_objects`

Mapea:

- `storage_locator = obj_*`;
- bucket interno;
- object path interno;
- created_at;
- deleted_at nullable.

El `object_path` nunca aparece en el read model normal.

## 13. Bucket

Bucket objetivo: `vivienda-evidence`.

Debe ser privado.

El cliente nunca recibe una URL pública permanente.

Acceso de lectura:

- autenticado/autorizado;
- preferiblemente URL firmada de corta duración emitida desde backend después de comprobar acceso al case;
- no persistir token firmado en DB.

## 14. Two-phase evidence finalization

### Fase A — quarantine

1. autorización de datos activa y finalidad adecuada;
2. crear intent;
3. generar object path opaco/no semántico;
4. subir objeto;
5. verificación de MIME/tamaño/checksum.

### Fase B — finalize RPC

En una sola transacción:

- lock case;
- comprobar `expectedVersion`;
- comprobar intent activo/no expirado;
- comprobar autorización vigente/finalidad;
- insertar `evidence_metadata`;
- insertar `evidence_objects`;
- insertar `EVIDENCE_ATTACHED`;
- marcar intent `finalized`;
- incrementar `current_version`.

Si Fase B falla, el objeto no es evidencia y queda sujeto a orphan cleanup.

## 15. Orphan cleanup

Debe existir una operación idempotente futura que:

- encuentre intents expirados no finalizados;
- marque intent expired;
- borre el objeto de cuarentena si existe;
- no cree eventos de evidencia;
- no modifique Case Log.

El cleanup no forma parte de la transacción del caso.

## 16. Tombstone

Tombstone lógico:

- actualiza metadata a `tombstoned`;
- elimina o programa eliminación del objeto físico;
- elimina/marca mapping físico;
- mantiene `evidenceId` referenciable por el journal;
- no reescribe ni elimina eventos antiguos.

`legal_hold` bloquea tombstone físico/lógico salvo flujo jurídico privilegiado futuro.

## 17. Read model

La RPC/adapter de lectura devuelve la forma v0.6 redactada.

Nunca debe entregar a cliente:

- `actorSubjectRef`;
- `recordedBySubjectRef`;
- `requestId`;
- `semanticFingerprint`;
- checksums;
- `storageLocator`;
- bucket;
- object path;
- auth UUID;
- email/nombre/cédula.

## 18. Error mapping

El adapter traduce errores SQL/RPC a `PersistenceBoundaryError` sin filtrar SQL, nombres internos o detalles de infraestructura.

Códigos mínimos:

- authentication_required;
- forbidden;
- case_not_found;
- version_conflict;
- idempotency_conflict;
- duplicate_event_id;
- duplicate_sequence;
- data_authorization_required;
- evidence_intent_not_found;
- evidence_intent_expired;
- evidence_receipt_mismatch;
- evidence_not_found;
- evidence_on_legal_hold;
- provider_error.

## 19. Adapter TypeScript

`SupabaseCasePersistenceAdapter` implementará `CasePersistencePort` sobre una interfaz mínima `SupabaseRpcClient`.

No debe importar el SDK directamente en v0.7 provider-ready; el wiring real se añadirá al activar el proyecto. Esto evita acoplar dominio/contrato a una versión concreta del SDK antes de existir backend VIVIENDA.

## 20. Contract tests

Los tests deben comprobar como mínimo:

1. nombres exactos de RPC;
2. payload snake_case correcto;
3. mapping de snapshot DB → dominio;
4. create retry;
5. append duplicate;
6. version conflict mapping;
7. idempotency conflict mapping;
8. authorization history mapping;
9. evidence intent mapping;
10. finalize mapping;
11. tombstone mapping;
12. provider error redaction;
13. migration crea schema private;
14. no grants de tablas a anon;
15. no grants de tablas a authenticated;
16. funciones security definer fijan search_path vacío;
17. append usa `FOR UPDATE`;
18. unique case+idempotency;
19. unique global event id;
20. partial unique active authorization;
21. bucket privado;
22. no public bucket;
23. no signed URLs almacenadas;
24. no UPDATE/DELETE journal API;
25. finalize SQL toca intent+metadata+object mapping+journal+version;
26. read RPC está redactada;
27. actor attribution interna se conserva;
28. storage path interno no cruza boundary;
29. financial/credit semiprivate no se renombra `sensitive`;
30. marketing-only no habilita evidencia.

## 21. Gate de activación real

Antes de aplicar migraciones:

- crear/seleccionar proyecto Supabase VIVIENDA explícito;
- confirmar organización y costo cuando aplique;
- ejecutar migración en entorno de desarrollo primero;
- generar tipos;
- ejecutar security advisor;
- ejecutar performance advisor;
- probar RLS/RPC con al menos client A/client B/lawyer/admin;
- probar storage privado;
- comprobar que service key no llegue al browser;
- solo entonces conectar Next.

## 22. Fuera de alcance v0.7

- creación automática de un proyecto Supabase con costo;
- migración a producción;
- PII real;
- OCR/antivirus productivo;
- KMS propio;
- notificaciones;
- pagos;
- Open Finance;
- bureau integrations;
- litigio automatizado.
