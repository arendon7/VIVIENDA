# PERSISTENCE & IDENTITY BOUNDARY CONTRACT · V0.6

## 1. Objetivo

V0.6 define la frontera entre el dominio puro del expediente (`Case State Machine v0.5`) y cualquier infraestructura productiva futura: base de datos, autenticación, almacenamiento de archivos, colas o integraciones.

La meta no es conectar Supabase/Postgres todavía. La meta es impedir que una futura integración pueda:

- convertir parámetros HTTP en identidad confiable;
- permitir IDOR / acceso cruzado a expedientes;
- dejar que un cliente elija `actor = lawyer`, `admin` o `system`;
- escribir eventos sin control de versión;
- duplicar operaciones por retries;
- almacenar PII o documentos dentro del event log;
- crear metadata de evidencia sin que el evento correspondiente exista, o viceversa;
- tratar una projection/cache mutable como fuente de verdad;
- confundir categorías jurídicas de datos con niveles internos de seguridad;
- habilitar tratamiento documental con una autorización cuya finalidad no cubra ese tratamiento;
- exponer a un read model ordinario coordenadas de storage, fingerprints o identificadores internos de auditoría.

Principio central:

> **La identidad se deriva de una frontera autenticada; los hechos se validan en dominio; la persistencia confirma atomicidad; la projection siempre puede reconstruirse desde el log.**

---

## 2. Baseline

V0.6 parte del baseline congelado de v0.5:

`1ba01145cadd19f420fa9672a33bf7d5812d5d51`

V0.5 ya garantiza:
- Case Log append-only;
- replay determinista;
- optimistic concurrency a nivel de dominio;
- idempotencia básica;
- separación de autorizaciones/poderes;
- evidencia para hechos externos;
- lifecycle monotónico de respuesta;
- cierre/cancelación/reapertura.

V0.6 NO reimplementa esas reglas en infraestructura; las preserva y añade controles en la frontera.

---

## 3. Arquitectura objetivo

`UI / API`

→ `Authenticated Principal Boundary`

→ `Case Application Service`

→ `Authorization Policy`

→ `Case State Machine v0.5`

→ `Persistence Port`

→ `Adapter futuro (Postgres/Supabase/etc.)`

La aplicación no debe importar directamente un SDK de base de datos desde componentes de UI o desde el dominio.

---

## 4. Identidad confiable

### 4.1 Principal

La frontera reconoce:
- `anonymous`;
- `client`;
- `lawyer`;
- `admin`;
- `service`.

Un `Principal` es producido exclusivamente por una capa de autenticación/infraestructura confiable.

Nunca se construye un principal confiable desde:
- body JSON;
- query params;
- headers controlados por cliente sin validación;
- campos ocultos del formulario;
- `actorId` recibido desde UI.

### 4.2 Actor del Case Event

El caller NO elige el actor.

El application service deriva el actor:
- principal `client` → actor `client`;
- principal `lawyer` → actor `lawyer`;
- principal `admin` → actor `admin`;
- principal `service` autorizado → actor `system`;
- `external_recorded` solo puede usarse como fuente del hecho mediante una ruta explícita y privilegiada.

La persona/sistema que incorpora un hecho externo queda además registrada en el envelope de persistencia como `recordedBySubjectRef`.

Esto permite distinguir:
- **fuente del hecho**: banco/tercero (`external_recorded`);
- **quién lo incorporó**: abogado, admin o integración confiable.

---

## 5. Autorización y prevención de IDOR

Cada expediente persistido tiene un `CaseAccessSnapshot` mínimo:
- `ownerSubjectRef`;
- profesionales asignados;
- estado de acceso.

Reglas iniciales:

### Cliente
- puede crear un expediente propio;
- puede leer únicamente expedientes cuyo owner coincide con su `subjectRef`;
- puede solicitar eventos que el dominio permita a actor `client`;
- nunca puede declarar actor profesional/sistema/tercero.

### Lawyer
- solo puede leer o mutar un caso si está asignado explícitamente;
- sus conclusiones profesionales siguen sujetas a reglas de transición de v0.5.

### Admin
- puede acceder según política interna del workspace;
- su acceso no cambia automáticamente la autoría profesional de un evento reservado a abogado.

### Service
- opera mediante scopes explícitos;
- no obtiene privilegio global por llamarse `service`;
- `case:read`, `case:append_system` y `case:record_external` son scopes distintos.

### Anonymous
- puede usar superficies locales/efímeras previas al guardado;
- no puede crear un expediente persistido ni acceder al Case Journal.

---

## 6. Server-owned fields

Para un evento persistido, los siguientes campos no son controlados por UI:
- `eventId`;
- `caseId` al crear un nuevo expediente;
- `recordedAt`;
- `actor`;
- `sequence`;
- `recordedBySubjectRef` del persistence envelope.

`occurredAt`:
- por defecto = tiempo del servidor;
- un timestamp histórico solo puede ser aceptado mediante una operación explícita para registrar hechos preexistentes y con permisos suficientes;
- nunca cambia `recordedAt`.

---

## 7. Atomic append

El adapter de persistencia futuro debe exponer una operación equivalente a:

`appendAtomic(caseId, expectedVersion, eventRecord)`

En una sola transacción lógica debe garantizar:

1. el expediente existe;
2. el caller ya fue autorizado por la capa de aplicación;
3. la versión actual coincide con `expectedVersion`;
4. no existe otra secuencia igual;
5. no existe `eventId` duplicado;
6. no existe un `idempotencyKey` incompatible;
7. se inserta exactamente un nuevo record;
8. la nueva versión queda definida por la secuencia insertada.

Constraints mínimos futuros de DB:
- unique `(case_id, sequence)`;
- unique `(case_id, idempotency_key)`;
- unique `event_id`;
- FK de journal → case header.

La projection NO necesita guardarse en la misma transacción para ser correcta; si existe una projection materializada será cache/rebuildable.

---

## 8. Idempotencia estricta v0.6

V0.5 evita duplicar una clave repetida.

V0.6 añade semántica estricta:
- misma `idempotencyKey` + mismo `semanticFingerprint` → retry seguro, `duplicate`;
- misma `idempotencyKey` + fingerprint diferente → `idempotency_conflict`;
- nunca se acepta silenciosamente contenido diferente bajo la misma clave.

El fingerprint:
- se calcula sobre semántica normalizada;
- excluye campos server-generated como `eventId` y `recordedAt`;
- no se usa como mecanismo criptográfico de seguridad;
- no reemplaza constraints de DB.

---

## 9. Case Journal Record

La unidad persistida no es solo el `CaseEvent`.

Debe existir un envelope con, como mínimo:
- `event`;
- `recordedBySubjectRef`;
- `recordedByPrincipalKind`;
- `requestId`;
- `semanticFingerprint`;
- `storedAt`.

El `CaseEvent` continúa siendo la única entrada al replay de dominio.

El envelope sirve para:
- auditoría;
- seguridad;
- trazabilidad operacional;
- investigar impersonation/retries/integraciones.

### 9.1 El envelope no es el read model ordinario

El envelope de seguridad se conserva en persistence/audit. No debe devolverse completo por defecto a cliente o UI.

El read model ordinario:
- no expone `recordedBySubjectRef`;
- no expone `requestId`;
- no expone `semanticFingerprint`;
- elimina `actorId` interno y conserva únicamente el `actor.kind` semántico necesario para el timeline.

Una futura superficie de auditoría privilegiada deberá tener una operación y autorización separadas.

---

## 10. Clasificación jurídica de datos vs seguridad interna

V0.6 usa **dos ejes separados**.

### 10.1 `legalDataCategory`
Clasificación orientativa de contenido, no una determinación automática de rol regulatorio de VIVIENDA:
- `non_personal`;
- `personal`;
- `financial_credit_semiprivate`;
- `private`;
- `sensitive`.

Nota jurídica de diseño:
- la Ley 1266 de 2008 califica como semiprivado el dato financiero/crediticio;
- la Ley 1581 de 2012 reserva la categoría “dato sensible” para información que afecta la intimidad o puede generar discriminación, incluyendo categorías como salud y biometría;
- etiquetar un documento como `financial_credit_semiprivate` NO significa por sí mismo que VIVIENDA sea operador, fuente o usuario de información en el sentido regulatorio de la Ley 1266;
- esa calificación institucional dependerá de la actividad real y debe revisarse antes de integrar centrales/operadores externos.

### 10.2 `securityTier`
Control técnico interno:
- `open`;
- `controlled`;
- `restricted`;
- `highly_restricted`.

Ejemplo:
- extracto hipotecario: `financial_credit_semiprivate + restricted`;
- dato biométrico, si una futura función llegara a requerirlo: `sensitive + highly_restricted`.

Una clasificación de seguridad nunca redefine la categoría jurídica.

---

## 11. Data minimization del event log

El Case Log NO debe almacenar directamente:
- nombre completo;
- cédula;
- email;
- teléfono;
- dirección residencial;
- número completo de cuenta/obligación cuando pueda evitarse;
- filename original del usuario;
- URL pública de documento;
- bytes/base64 del archivo;
- texto OCR completo;
- secretos/tokens/credenciales.

Se permiten referencias opacas:
- `subjectRef` solo en capas internas autorizadas;
- `evidenceId`;
- referencias operacionales no reversibles a PII.

La finalidad es que una solicitud de supresión o una política de retención pueda eliminar/anonimizar material personal fuera del journal sin destruir la historia operacional esencial.

---

## 12. Evidence Metadata Boundary

El blob real y el event log son capas diferentes.

Metadata mínima futura:
- `evidenceId` opaco;
- `caseId`;
- `kind`;
- `legalDataCategory`;
- `securityTier`;
- `mimeType`;
- `byteSize`;
- `checksum`;
- `storageLocator` opaco;
- `createdAt`;
- `createdBySubjectRef`;
- lifecycle/retention.

El filename original no se persiste por defecto. Un `displayName` debe ser generado/controlado por el sistema.

### 12.1 Redacción del read model

El storage metadata completo es interno. La lectura ordinaria no expone:
- `storageLocator`;
- `checksumSha256`;
- `createdBySubjectRef`.

Puede exponer metadata necesaria para UX, por ejemplo:
- `evidenceId` opaco;
- tipo;
- clasificación;
- tier;
- nombre controlado por sistema;
- MIME/tamaño si procede;
- lifecycle/tombstone.

### Regla fundamental
`EVIDENCE_ATTACHED` debe referenciar `evidenceId`, no path/URL/filename.

---

## 13. Finalización atómica de evidencia

Un blob store externo no comparte transacción ACID con Postgres. Por eso la arquitectura futura será de dos fases:

### Fase A — prepare/quarantine
1. generar `evidenceId` server-side;
2. emitir un upload intent de corta duración;
3. cargar objeto en namespace de cuarentena;
4. todavía NO existe `EVIDENCE_ATTACHED`.

### Fase B — finalize
1. verificar objeto/tamaño/MIME/checksum;
2. confirmar autorización de datos **activa y con finalidad compatible** y acceso al caso;
3. en una transacción DB:
   - crear/finalizar metadata;
   - append `EVIDENCE_ATTACHED` con ese `evidenceId`;
4. si la transacción falla, metadata no queda activa;
5. un job de limpieza elimina objetos de cuarentena huérfanos.

V0.6 implementa solo el contrato/in-memory semantics, no upload real.

---

## 14. Supresión, retención y append-only

Append-only NO significa conservar PII o blobs para siempre.

Al suprimir evidencia cuando corresponda:
- el blob/locator se elimina o invalida;
- metadata identificante/content-derived puede tombstonearse;
- el Case Event histórico permanece con el `evidenceId` opaco;
- la projection puede seguir reconstruyéndose;
- no debe afirmarse que la evidencia sigue disponible.

Un `legal_hold` futuro puede impedir eliminación física cuando exista una base jurídica/documental para conservarla. V0.6 modela lifecycle, pero no decide automáticamente bases legales de retención.

---

## 15. Authorization / consent lifecycle

La autorización registrada debe ser consultable y **versionada**.

V0.6 no conserva una única bandera mutable. Conserva un historial de `DataAuthorizationRecord` con:
- `authorizationId`;
- `consentVersion`;
- finalidades (`purposes`);
- status;
- fecha de otorgamiento;
- fecha/motivo de revocación o supersesión.

Estados iniciales:
- `active`;
- `revoked`;
- `superseded`.

Al registrar una nueva autorización válida:
- la nueva queda `active`;
- una autorización activa anterior se conserva y pasa a `superseded`;
- no se destruye su versión ni sus finalidades históricas.

Al revocar:
- se revoca la autorización activa aplicable;
- el hecho histórico de autorizaciones anteriores permanece.

### 15.1 Finalidad compatible

“Autorización activa” no significa “autorización para cualquier cosa”.

Para preparar/finalizar evidencia documental de un expediente en v0.6, la autorización activa debe incluir al menos una finalidad compatible:
- `mortgage_analysis`;
- `case_management`;
- `legal_service`.

Una autorización únicamente para `marketing`, `customer_support` o `external_credit_data` no habilita automáticamente persistencia de extractos/documentos del expediente.

No se reutiliza autorización para fines nuevos no incluidos en la versión/finalidad informada.

Marketing, consulta a operadores externos de información y prestación jurídica pueden requerir finalidades/artefactos separados.

---

## 16. Projection

Fuente de verdad:

`Case Journal`.

Una projection persistida/materializada futura:
- es descartable;
- puede reconstruirse por replay;
- no puede aceptar updates que no correspondan a eventos válidos;
- no debe contener PII que no sea indispensable para lectura operacional.

Acceptance test obligatorio:
- borrar cache/projection y reconstruir estado idéntico desde journal.

---

## 17. No provider lock-in

El dominio/application service depende de interfaces propias.

No se permiten tipos de proveedor en los contratos centrales, por ejemplo:
- `SupabaseClient`;
- `PostgrestError`;
- `PrismaClient`;
- SDK-specific user/session objects.

El adapter traduce.

Esto permite evaluar Supabase/Postgres sin volver a escribir el dominio.

---

## 18. Criterios de aceptación v0.6

El slice no se considera verde hasta probar al menos:

1. anonymous no puede crear expediente persistido;
2. client autenticado crea solo expediente propio;
3. caseId es server-generated;
4. eventId es server-generated;
5. recordedAt es server-generated;
6. actor se deriva del principal y no del command;
7. client no puede impersonar lawyer/admin/system;
8. cliente A no lee caso de cliente B;
9. cliente A no escribe caso de cliente B;
10. lawyer no asignado no lee caso;
11. lawyer asignado puede leer caso;
12. admin respeta reglas de dominio reservadas a lawyer;
13. service requiere scope para leer;
14. service requiere scope distinto para append system;
15. external_recorded requiere operación privilegiada explícita;
16. envelope conserva quién incorporó el hecho externo;
17. expectedVersion se valida atómicamente en store;
18. `(caseId, sequence)` no puede duplicarse;
19. eventId no puede duplicarse;
20. retry mismo idempotency+fingerprint no duplica;
21. mismo idempotency+semántica distinta falla;
22. journal load retorna copias defensivas;
23. projection se reconstruye exclusivamente desde CaseEvent[];
24. eliminar/mutar una projection cache no cambia el estado reconstruido;
25. event log no acepta evidenceRefs que sean paths/URLs/filenames;
26. evidenceRef debe ser un ID opaco válido;
27. metadata exige `legalDataCategory`;
28. metadata exige `securityTier`;
29. financial semiprivate y sensitive son categorías distintas;
30. filename original no entra al Case Event;
31. bytes/base64 nunca entran al Case Event;
32. prepare/finalize evidence requiere autorización activa;
33. autorización solo-marketing no habilita evidencia de expediente;
34. autorización de evidencia exige finalidad compatible;
35. autorizaciones se conservan versionadas;
36. nueva autorización supersede pero no borra la anterior;
37. revocación conserva historial;
38. finalizeEvidence requiere acceso al caso;
39. finalizeEvidence crea metadata + EVIDENCE_ATTACHED como unidad atómica lógica;
40. conflicto de versión no deja metadata activa huérfana;
41. tombstone de evidencia elimina locator sin borrar el event log;
42. un expediente sigue replayable después de tombstone;
43. ownerSubjectRef no se acepta desde payload del cliente;
44. read model normal no expone `actorId` interno;
45. read model normal no expone envelope (`recordedBySubjectRef`, requestId, fingerprint);
46. read model normal no expone storageLocator/checksum/createdBySubjectRef;
47. el store no expone provider-specific types;
48. no existe conexión real a Supabase/Postgres en este slice.

---

## 19. Fuera de alcance todavía

- login UI;
- proveedor de autenticación;
- Supabase Auth;
- tablas SQL reales;
- RLS real;
- buckets reales;
- URLs firmadas reales;
- cifrado KMS real;
- OCR productivo;
- antivirus/malware scanning real;
- política final de retención por categoría documental;
- central de riesgos/Open Finance;
- RNBD/compliance operativo final;
- notificaciones;
- payments.

---

## 20. Próximo gate

Después de validar el contrato y el adapter in-memory, el siguiente slice podrá ser:

**v0.7 — Supabase/Postgres Persistence Adapter**

Solo entonces se diseñarán:
- schema SQL;
- constraints;
- RLS;
- auth mapping;
- bucket policies;
- signed URLs;
- migrations;
- transaction/RPC para atomic append;
- recovery/cleanup de uploads huérfanos.
