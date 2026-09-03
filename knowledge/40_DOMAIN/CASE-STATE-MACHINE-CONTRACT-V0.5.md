# CASE STATE MACHINE CONTRACT · V0.5

## 1. Objetivo

Convertir el `Case Plan` v0.4 —que expresa intención y próximos pasos— en un modelo de expediente capaz de registrar hechos reales, reconstruir el estado actual y soportar persistencia futura sin depender de una tabla mutable que pueda perder trazabilidad.

La regla central es:

> **El log guarda hechos. El estado se deriva.**

V0.5 no conecta todavía base de datos, autenticación, almacenamiento de archivos ni radicación productiva. Define el contrato de dominio que esas capas deberán respetar.

---

## 2. Separación de capas

La cadena conceptual queda así:

`Mortgage Twin → Opportunity Router → Case Plan → Case Log → Case Projection`

### Mortgage Twin
Describe el crédito a partir de datos estimados/modelados/verificados.

### Opportunity Router
Ordena rutas posibles. No aprueba, no concede derechos y no ejecuta actuaciones.

### Case Plan
Describe intención, fases, checklist y eventos futuros. No prueba que algo haya ocurrido.

### Case Log
Registra únicamente hechos ocurridos y suficientemente atribuibles a un actor/fuente.

### Case Projection
Reconstruye el estado visible del expediente por replay del Case Log.

---

## 3. Principios innegociables

### 3.1 Append-only
Un evento histórico no se edita ni se borra para “corregir” la historia. Una corrección futura debe registrarse como un nuevo evento que explique o reemplace semánticamente el dato anterior.

### 3.2 Replay determinista
La misma secuencia válida de eventos debe producir siempre la misma proyección.

### 3.3 Optimistic concurrency
Cada append declara `expectedVersion`. Si el historial cambió desde que el actor leyó el expediente, el nuevo evento debe rechazarse hasta reintentar sobre la versión actual.

### 3.4 Idempotencia
Un mismo `idempotencyKey` no puede producir dos hechos equivalentes. Reintentar la misma operación debe devolver el historial existente sin duplicar el evento.

### 3.5 Hecho ≠ intención
`SUBMISSION_PREPARED` no significa `SUBMISSION_RECORDED`.
`SERVICE_AGREEMENT_ACCEPTED` no significa que exista poder.
`RESPONSE_RECORDED` no significa que la respuesta ya haya sido jurídicamente revisada.
`RESPONSE_REVIEW_STARTED` no significa que la revisión esté completada.
`RESOLUTION_RECORDED` no significa que el resultado esté verificado.

### 3.6 Evidencia para hechos externos
Los eventos que afirman actos externos o resultados materiales deben incluir referencias de evidencia cuando el contrato lo exija. El sistema no puede inventar respuestas, radicados, decisiones ni resultados.

### 3.7 Separación de autorizaciones
Se registran por separado:
- autorización para tratamiento/persistencia de datos;
- aceptación del servicio;
- facultad/autorización extrajudicial para actuar ante entidad;
- poder judicial.

Ninguno implica automáticamente a los demás.

### 3.8 Revisión profesional
Los eventos que representan inicio o conclusión de revisión jurídica sustantiva solo pueden ser producidos por actor profesional autorizado en el modelo de dominio cuando el contrato así lo exige.

### 3.9 Lifecycle monotónico
Una proyección no debe “retroceder” semánticamente porque se registre un hecho posterior. Los hitos de análisis se representan mediante eventos explícitos cuando sea necesario distinguir recepción, inicio de revisión y finalización de revisión.

---

## 4. Identidad del expediente

Todo Case Log pertenece a un único `caseId`.

El primer evento debe ser `CASE_CREATED` y fija:
- `caseId`;
- ruta originaria;
- precisión heredada;
- status del router al crear el expediente;
- track inicial (`self_service`, `assisted`, `legal`);
- fecha de creación.

La ruta puede revaluarse después, pero la ruta de origen no debe reescribirse.

---

## 5. Actores

V0.5 reconoce:
- `client`;
- `lawyer`;
- `admin`;
- `system`;
- `external_recorded`.

`external_recorded` sirve para representar que el hecho proviene de un tercero —por ejemplo banco o autoridad— pero fue incorporado al sistema por una persona o integración confiable. No autoriza al motor a fabricar hechos externos.

---

## 6. Eventos iniciales v0.5

### Apertura y privacidad
- `CASE_CREATED`
- `DATA_AUTHORIZATION_RECORDED`

### Evidencia
- `EVIDENCE_REQUESTED`
- `EVIDENCE_ATTACHED`
- `EVIDENCE_VERIFIED`

### Relación profesional
- `PROFESSIONAL_REVIEW_REQUESTED`
- `PROFESSIONAL_REVIEW_COMPLETED`
- `SERVICE_AGREEMENT_ACCEPTED`
- `EXTRAJUDICIAL_AUTHORITY_VERIFIED`
- `JUDICIAL_POWER_VERIFIED`

### Preparación y radicación
- `SUBMISSION_PREPARED`
- `SUBMISSION_RECORDED`

### Respuesta y análisis
- `RESPONSE_RECORDED`
- `RESPONSE_REVIEW_STARTED`
- `RESPONSE_REVIEW_COMPLETED`
- `NEGOTIATION_STARTED`
- `ESCALATION_REVIEW_STARTED`

### Resultado
- `RESOLUTION_RECORDED`
- `OUTCOME_VERIFIED`
- `CASE_CLOSED`
- `CASE_REOPENED`
- `CASE_CANCELLED`

---

## 7. Reglas de autoridad

### Eventos exclusivos de abogado
- `PROFESSIONAL_REVIEW_COMPLETED`
- `RESPONSE_REVIEW_STARTED`
- `RESPONSE_REVIEW_COMPLETED`

Un `system` puede clasificar o resumir evidencia, solicitar revisión o apoyar el flujo, pero no registrar una revisión jurídica iniciada/completada como si hubiera sido realizada por un abogado.

`RESPONSE_REVIEW_COMPLETED` requiere además que exista previamente `RESPONSE_REVIEW_STARTED`. Esto permite diferenciar tres hechos y tres estados observables:

`RESPONSE_RECORDED → RESPONSE_REVIEW_STARTED → RESPONSE_REVIEW_COMPLETED`

### Radicación realizada por representante
Si `SUBMISSION_RECORDED.submittedBy = representative`, debe existir antes `EXTRAJUDICIAL_AUTHORITY_VERIFIED`.

### Actuación judicial
V0.5 no ejecuta litigio. Si en una versión futura se registra una actuación judicial realizada por representante, deberá existir `JUDICIAL_POWER_VERIFIED` y una regla específica de ruta/acto.

---

## 8. Reglas de evidencia

### `EVIDENCE_ATTACHED`
En el modelo que será persistible, requiere que exista previamente `DATA_AUTHORIZATION_RECORDED`.

### `SUBMISSION_RECORDED`
Debe incluir al menos uno de:
- referencia de radicación/operación real; o
- `evidenceRefs` que permitan probar la radicación.

Nunca se crea por haber generado un documento o plan.

Una radicación registrada deriva directamente a `awaiting_response`; no se conserva una etapa durable adicional llamada `submitted`, porque el hecho `SUBMISSION_RECORDED` ya prueba la radicación y el siguiente estado operativo es esperar respuesta.

### `RESPONSE_RECORDED`
Requiere `evidenceRefs` o una referencia externa verificable. No puede ser generado por actor `system` como hecho externo autónomo.

Su registro deriva `response_received`, no `response_under_review`. El análisis jurídico comienza solamente cuando existe el evento separado `RESPONSE_REVIEW_STARTED`.

### `RESPONSE_REVIEW_STARTED`
Requiere:
- `RESPONSE_RECORDED` previo;
- actor `lawyer`;
- una razón no vacía.

Deriva la etapa `response_under_review`.

### `RESPONSE_REVIEW_COMPLETED`
Requiere:
- `RESPONSE_RECORDED` previo;
- `RESPONSE_REVIEW_STARTED` previo;
- actor `lawyer`;
- summary no vacío.

Deriva la etapa `response_reviewed`. Completar la revisión nunca devuelve el caso a `response_received`.

### `RESOLUTION_RECORDED`
Requiere evidencia del resultado comunicado/observado.

### `OUTCOME_VERIFIED`
Requiere evidencia posterior suficiente para confirmar el efecto real —por ejemplo extracto posterior, comunicación oficial u otro documento según la ruta— y no puede basarse solamente en la promesa de una contraparte.

---

## 9. Etapas derivadas

V0.5 usa una proyección simple y legible:

1. `draft`
2. `collecting_evidence`
3. `ready_for_review`
4. `under_review`
5. `ready_to_prepare`
6. `preparing_submission`
7. `awaiting_response`
8. `response_received`
9. `response_under_review`
10. `response_reviewed`
11. `negotiating`
12. `escalation_review`
13. `resolved_unverified`
14. `resolved_verified`
15. `closed`
16. `cancelled`

No todos los casos recorren todas las etapas. El track `self_service` puede omitir revisión profesional o contrato de servicios.

`submitted` no existe como etapa durable en v0.5: `SUBMISSION_RECORDED` es el hecho auditable y, una vez registrado, el estado operativo relevante es `awaiting_response`.

El lifecycle de respuesta debe ser monotónico:

`awaiting_response → response_received → response_under_review → response_reviewed`

Las etapas posteriores —negociación, escalamiento o resultado— pueden continuar desde allí conforme a hechos adicionales.

---

## 10. Capacidades derivadas

La proyección debe exponer, como hechos separados:

- `dataAuthorizationRecorded: boolean`
- `serviceAgreementAccepted: boolean`
- `extrajudicialAuthorityVerified: boolean`
- `judicialPowerVerified: boolean`
- `professionalReviewRequested: boolean`
- `professionalReviewCompleted: boolean`
- `submissionPrepared: boolean`
- `submissionRecorded: boolean`
- `responseRecorded: boolean`
- `responseReviewStarted: boolean`
- `responseReviewCompleted: boolean`
- `negotiationStarted: boolean`
- `escalationReviewStarted: boolean`
- `resolutionRecorded: boolean`
- `outcomeVerified: boolean`

Esto evita usar una sola bandera ambigua como `authorized = true` y evita inferir que recibir una respuesta equivale a revisarla.

---

## 11. Versionado y concurrencia

Cada evento persistido recibe `sequence` empezando en 1.

Para agregar un evento:
- el caller entrega `expectedVersion`;
- `expectedVersion` debe coincidir con el número actual de eventos;
- el motor asigna `sequence = expectedVersion + 1`;
- si no coincide, devuelve error de concurrencia y no modifica el historial.

---

## 12. Idempotencia

Todo evento nuevo debe incluir `idempotencyKey`.

Si ya existe un evento con la misma clave:
- no se agrega otro;
- se retorna el historial/proyección actual;
- el resultado indica `appended: false` y razón `duplicate_idempotency_key`.

Una clave repetida con contenido diferente se tratará en una versión posterior como conflicto de integridad; v0.5 impide la duplicación como mínimo.

---

## 13. Inmutabilidad

Las funciones de dominio no deben mutar:
- el historial de entrada;
- eventos históricos;
- payloads históricos;
- el Case Plan que originó el expediente.

El append retorna un nuevo arreglo y una nueva proyección.

---

## 14. Cierre y reapertura

`CASE_CLOSED` no elimina historia.

Un expediente cerrado solo puede recibir:
- `CASE_REOPENED`, o
- eventos técnicos de auditoría que una versión posterior defina expresamente.

`CASE_CLOSED` se reserva para un expediente con `OUTCOME_VERIFIED`. Si el usuario decide terminar sin resultado verificado se utiliza `CASE_CANCELLED`, que no implica resolución favorable ni desfavorable.

`CASE_REOPENED` conserva toda la historia y vuelve a una etapa operativa derivada de los hechos previos.

---

## 15. Qué NO hace v0.5

- no almacena archivos reales;
- no crea usuarios ni sesiones;
- no cifra ni persiste PII todavía;
- no conecta Supabase/Postgres;
- no envía correos, WhatsApp ni notificaciones;
- no genera radicados;
- no interpone recursos ni demandas;
- no calcula automáticamente términos con festivos;
- no presume que una respuesta bancaria sea jurídicamente correcta;
- no convierte una revisión del sistema en revisión profesional;
- no cobra honorarios ni registra pagos.

---

## 16. Criterios de aceptación de dominio

El slice v0.5 no se considera válido hasta probar, como mínimo:

1. `CASE_CREATED` debe ser el primer evento.
2. No puede existir más de un `CASE_CREATED`.
3. Todos los eventos de un historial pertenecen al mismo `caseId`.
4. `sequence` es estrictamente consecutiva.
5. replay produce siempre la misma proyección.
6. `expectedVersion` evita lost updates.
7. `idempotencyKey` evita duplicados.
8. append no muta el historial original.
9. persistir evidencia requiere autorización de datos previa.
10. verificación de evidencia no puede ser atribuida autónomamente al `system`.
11. revisión profesional completada requiere solicitud previa y actor `lawyer`.
12. aceptar servicio no concede poder.
13. autoridad extrajudicial no concede poder judicial.
14. verificar autoridad/poder requiere evidencia.
15. submission por representante requiere autoridad extrajudicial verificada.
16. submission real requiere evidencia o referencia real.
17. una submission registrada deriva `awaiting_response`.
18. respuesta real requiere submission previa, evidencia/referencia y no puede ser inventada por `system`.
19. `RESPONSE_RECORDED` deriva `response_received`.
20. `RESPONSE_REVIEW_STARTED` requiere actor `lawyer` y deriva `response_under_review`.
21. `RESPONSE_REVIEW_COMPLETED` requiere inicio previo, actor `lawyer` y deriva `response_reviewed`.
22. completar la revisión no puede hacer retroceder la proyección a `response_received`.
23. resultado registrado requiere evidencia.
24. resultado verificado requiere evidencia posterior.
25. `CASE_CLOSED` requiere resultado verificado.
26. cerrar no borra eventos.
27. expediente cerrado/cancelado bloquea eventos ordinarios.
28. reapertura preserva historia.
29. cancelar no equivale a resolver.
30. generar/reproyectar no altera la ruta/status/precisión/track de origen.

---

## 17. Case Timeline Preview v0.5

La integración visual de v0.5 es un **Case Timeline Preview** local:
- crea un expediente de demostración desde un Case Plan;
- registra únicamente eventos internos simulados que el dominio permite;
- muestra timeline append-only, versión, actor y referencias de evidencia;
- muestra capacidades separadas;
- muestra estado derivado;
- mantiene origen route/status/precision/track visible e inmutable;
- no ofrece un botón para fingir una revisión jurídica completada;
- no ofrece acciones de radicación o respuesta externa simuladas como si fueran reales;
- declara explícitamente que no existe persistencia productiva.

Solo después de validar esta máquina de estados debe elegirse e integrar storage productivo.

---

## 18. Próximo slice

Después de congelar v0.5, el siguiente slice debe definir el **Persistence & Identity Boundary** antes de conectar una base de datos:
- repository/storage ports;
- identidad de actor y matriz RBAC;
- clasificación de datos y frontera de privacidad;
- transacción atómica de append;
- restricciones únicas para sequence e idempotency;
- metadata de evidencia separada de bytes/objetos;
- política de cifrado, retención y eliminación;
- rebuild de proyecciones;
- persistencia de optimistic concurrency;
- audit metadata.

No debe persistirse PII real hasta que ese contrato esté fijado y probado.