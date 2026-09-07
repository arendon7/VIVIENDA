# ASSISTED INTAKE GATE CONTRACT · V0.23.11

## 1. Objetivo

Definir la frontera que separa la preparación documental local de V0.23.10 de un futuro ingreso documental autenticado para la Auditoría Hipotecaria R7.

V0.23.11 no activa upload, autenticación, persistencia, Storage ni contratación. Su función es impedir que la UI ofrezca una carga segura antes de que todas las precondiciones estén explícitamente satisfechas.

Regla central:

> **Estar preparado para entregar evidencia no significa que la plataforma esté habilitada para recibirla.**

## 2. Alcance

Aplica únicamente a:

`R7_RECLAMACION → assisted_mortgage_audit → Assisted Evidence Readiness`

No altera R7 autogestión ni las rutas R1, R2, R3, R5 o R10.

## 3. Fuentes canónicas

El gate compone verdades ya existentes:

- V0.23.10 `AssistedEvidenceReadiness`;
- V0.12 `MORTGAGE_AUDIT_R7_V1`;
- Case State V0.5;
- Persistence/Auth/Storage boundaries V0.6–V0.9;
- `server/evidence-api/runtime.server.ts`, que actualmente falla cerrado sin providers live.

No reemplaza ninguno de esos contratos.

## 4. Estados

### `local_preparation_required`

El inventario local todavía no está en `declared_ready_for_future_intake`.

### `platform_activation_required`

El inventario puede estar listo, pero falta al menos una capacidad server-side necesaria para recibir evidencia de manera segura:

- identidad autenticada;
- persistencia de caso;
- almacenamiento seguro;
- rate limiting;
- trusted origin.

Este es el estado esperado del runtime actual.

### `real_case_required`

La plataforma está disponible pero todavía no existe un expediente real y trazable.

### `data_authorization_required`

Existe expediente, pero no se ha registrado autorización de tratamiento de datos.

### `service_agreement_required`

Existe autorización de datos, pero no se ha aceptado explícitamente el alcance del servicio asistido.

### `secure_upload_ready`

Todas las precondiciones son verdaderas y el contrato permite **ofrecer** el siguiente paso de carga segura.

No significa que ningún archivo haya sido recibido.

## 5. Capacidades de plataforma

`AssistedIntakePlatformCapabilities` contiene únicamente booleanos de capacidad:

- `authenticatedIdentityAvailable`;
- `casePersistenceAvailable`;
- `secureStorageAvailable`;
- `rateLimitAvailable`;
- `trustedOriginAvailable`.

El contrato no acepta credenciales, tokens, URLs firmadas, service keys, subject refs ni detalles internos del provider.

## 6. Hechos del caso

`AssistedIntakeCaseFacts` separa:

- `realCaseCreated`;
- `dataAuthorizationRecorded`;
- `serviceAgreementAccepted`.

Aceptar el servicio no implica poder, mandato ni representación.

## 7. Orden de precedencia

El estado visible se resuelve en este orden:

1. preparación local;
2. disponibilidad de plataforma;
3. expediente real;
4. autorización de datos;
5. aceptación del alcance del servicio;
6. posibilidad de ofrecer upload seguro.

Esto evita pedir al usuario acciones posteriores cuando la infraestructura anterior todavía no existe.

## 8. Blockers explícitos

El dominio puede exponer:

- `evidence_inventory_not_ready`;
- `authenticated_identity_unavailable`;
- `case_persistence_unavailable`;
- `secure_storage_unavailable`;
- `rate_limit_unavailable`;
- `trusted_origin_unavailable`;
- `real_case_missing`;
- `data_authorization_missing`;
- `service_agreement_missing`.

La UI no necesita mostrar todos los códigos técnicos; puede resumirlos como una frontera de plataforma segura.

## 9. Preview actual

`buildPreviewAssistedIntakeGate()` usa una postura fail-closed:

- todas las capacidades productivas server-side = false;
- expediente real = false;
- autorización de datos = false;
- service agreement = false.

Por tanto:

- inventario incompleto → `local_preparation_required`;
- inventario listo → `platform_activation_required`.

El preview no puede alcanzar `secure_upload_ready`.

## 10. Truth boundary

Incluso si un contexto futuro alcanza `secure_upload_ready`:

- gate ready ≠ upload;
- gate ready ≠ persistencia;
- gate ready ≠ verificación;
- gate ready ≠ revisión profesional;
- inventario listo ≠ evidencia recibida;
- service agreement ≠ autoridad o poder.

El upload real deberá seguir siendo una operación separada y trazable.

## 11. Relación con Evidence API v0.9

La API provider-ready ya define prepare/complete/download y controles de trusted origin, rate limiting, identidad y clasificación server-side.

V0.23.11 no llama esa API.

Su responsabilidad es asegurar que el producto visible no ofrezca una acción que la infraestructura actual rechazaría o que carecería de contexto jurídico/técnico suficiente.

## 12. Seguridad y minimización

El gate no recibe:

- archivos;
- contenido documental;
- PII;
- números de crédito;
- tokens;
- signed URLs;
- storage paths;
- service credentials.

No crea nuevos endpoints.

## 13. Criterios de aceptación

1. inventario incompleto bloquea cualquier oferta de upload;
2. inventario completo no supera la falta de plataforma;
3. preview actual siempre falla cerrado antes del upload;
4. plataforma completa sin caso real exige caso;
5. caso real sin autorización exige autorización;
6. autorización sin service agreement exige aceptación explícita;
7. solo todas las precondiciones verdaderas permiten `secureUploadMayBeOffered = true`;
8. `secure_upload_ready` no registra upload ni persistencia;
9. no se infiere poder desde service agreement;
10. el gate no aparece en R7 self-service;
11. no se introducen endpoints ni providers live;
12. no se exponen detalles sensibles de infraestructura al browser.

## 14. Fuera de alcance

- Supabase live;
- autenticación real;
- creación real de Case Log;
- consentimiento productivo;
- firma electrónica;
- upload de bytes;
- OCR;
- signed upload grants productivos;
- pago/checkout;
- representación;
- verificación de evidencia;
- revisión profesional real.
