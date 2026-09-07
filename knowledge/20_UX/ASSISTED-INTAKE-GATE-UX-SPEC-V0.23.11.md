# ASSISTED INTAKE GATE UX SPEC · V0.23.11

## 1. Pregunta UX

Después de que el usuario organiza localmente sus soportes, ¿cómo explicamos por qué todavía no puede cargarlos sin hacer parecer que existe una capacidad productiva que el runtime actual no tiene?

## 2. Principio

> **Preparación local y recepción documental son etapas distintas.**

La UI debe hacer visible esa separación antes de cualquier futuro CTA de upload.

## 3. Ubicación

El panel aparece únicamente dentro de:

`R7 → Revisarlo con acompañamiento → Case Plan → inventario local de evidencia`

Se muestra inmediatamente después del inventario.

No aparece en:

- R7 autogestión;
- R1/R2/R3/R5/R10.

## 4. Estado inicial

Mientras existan soportes actuales sin clasificar o declarados faltantes, el gate muestra:

- estado `Preparación local pendiente`;
- `Inventario local listo: No`;
- `Carga segura ofrecible: No`;
- siguiente requisito: terminar el inventario local.

No muestra file input ni botón de upload.

## 5. Inventario local listo

Cuando todos los soportes actuales no condicionales están declarados disponibles:

- el inventario pasa a `declared_ready_for_future_intake`;
- el gate pasa a `platform_activation_required`;
- la UI muestra `Plataforma segura no habilitada`;
- `Carga segura ofrecible` continúa en `No`.

Copy principal:

**La carga segura todavía no está habilitada en este entorno.**

La explicación debe indicar que el runtime falla cerrado hasta que exista infraestructura real y que no se muestra un botón que aparentaría recibir documentos.

## 6. Métricas visibles

El panel resume solo dimensiones comprensibles y no sensibles:

- inventario local listo;
- plataforma segura habilitada;
- expediente real;
- autorización de datos;
- alcance del servicio aceptado;
- carga segura ofrecible.

No muestra nombres de providers, secrets, bucket, rutas de Storage, tokens o detalles internos.

## 7. Estados futuros

El contrato soporta, para una activación posterior:

- expediente real pendiente;
- autorización de datos pendiente;
- alcance del servicio pendiente;
- ingreso seguro habilitable.

La versión actual no simula esos estados en el journey real.

## 8. CTA policy

Mientras `secureUploadMayBeOffered = false`:

- no hay botón `Subir`;
- no hay botón `Cargar`;
- no hay drag-and-drop;
- no hay file input oculto;
- no hay enlace a `/verificar` como sustituto del intake real.

Cuando una versión futura alcance `secure_upload_ready`, esa condición solo autoriza **ofrecer** el siguiente paso. El upload debe seguir siendo una operación separada.

## 9. Accesibilidad

- estado expresado con texto, no solo color;
- heading propio;
- métricas con labels explícitos;
- `role=status` para el siguiente requisito;
- no esconder información crítica detrás de hover;
- compatible con viewport móvil de 390 px.

## 10. Copy prohibido

No usar:

- `Tus documentos ya están listos para revisión`;
- `Sube tus documentos ahora`;
- `Tu expediente está abierto`;
- `Tu autorización está registrada`;
- `Servicio contratado`;
- `Carga segura disponible` en el runtime preview.

## 11. Relación con V0.23.10

V0.23.10 responde qué soportes el usuario declara tener o no tener.

V0.23.11 responde si la plataforma y el contexto jurídico/técnico permiten siquiera ofrecer el siguiente paso de intake.

Ninguno recibe documentos.

## 12. E2E requerido

Desktop + mobile deben probar:

1. R7 assisted muestra el gate;
2. inventario incompleto → `local_preparation_required`;
3. no existe file input ni CTA de upload;
4. marcar todos los soportes actuales `Lo tengo` → `platform_activation_required`;
5. `secureUploadMayBeOffered` sigue false;
6. se muestra la explicación fail-closed;
7. R7 self-service no muestra el gate.

## 13. Fuera de alcance

- diseño del uploader productivo;
- flujo de login;
- consentimiento real;
- creación de expediente;
- contrato/pago real;
- upload/progreso/retry;
- OCR;
- visualización de documentos persistidos.
