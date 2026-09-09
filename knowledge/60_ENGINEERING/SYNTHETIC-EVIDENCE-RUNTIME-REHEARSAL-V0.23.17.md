# Synthetic Evidence Runtime Rehearsal · V0.23.17

## Objetivo

V0.23.17 agrega un rehearsal sintético, determinístico e in-process para comprobar que las piezas reales del futuro runtime de evidencia pueden operar como una sola cadena coherente sin crear infraestructura externa ni activar el runtime público.

La pregunta técnica de esta slice es:

> ¿Puede Casa con Criterio ejecutar de punta a punta la semántica real de Case + consentimiento + evidencia + frontera HTTP usando únicamente adapters sintéticos, sin confundir esa prueba con una activación live?

La respuesta esperada es binaria:

- el rehearsal debe demostrar la composición completa y mantener todas las fronteras de seguridad;
- un resultado verde debe seguir produciendo **cero autorización live**.

## Alcance exacto

La slice cubre únicamente la ruta canónica:

- route: `R7_RECLAMACION`;
- track: `assisted`;
- evidencia de ejemplo: `statement`;
- identidad: cliente sintético autenticado;
- persistence: memoria;
- object registry: memoria;
- Storage gateway: memoria;
- HTTP boundary: implementación real;
- case application: implementación real.

No agrega un producto asistido nuevo, no modifica la selección de track y no cambia la precedencia R10.

## Composición real ejercitada

El rehearsal ensambla estas piezas de producción:

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

Solo son sintéticos los adapters que necesariamente representan infraestructura externa:

- `SyntheticPrincipalSource`;
- `SyntheticEvidenceObjectRegistry`;
- `SyntheticCoordinateFactory`;
- `SyntheticEvidenceStorage`;
- `SyntheticRequestContexts`;
- `SyntheticAllowedRateLimit`;
- `SyntheticAudit`;
- reloj e IDs determinísticos.

## Archivos canónicos

Implementación:

- `server/evidence-api/synthetic-rehearsal.ts`

Tests:

- `server/evidence-api/synthetic-rehearsal.test.ts`

Decisión arquitectónica:

- `knowledge/10_DECISIONS/ADR-0013-synthetic-evidence-runtime-rehearsal.md`

El rehearsal no se exporta desde `runtime.server.ts` ni se conecta a rutas públicas.

## Secuencia de Case obligatoria

La ejecución sintética debe terminar con exactamente:

1. `CASE_CREATED`
2. `DATA_AUTHORIZATION_RECORDED`
3. `SERVICE_AGREEMENT_ACCEPTED`
4. `EVIDENCE_REQUESTED`
5. `EVIDENCE_ATTACHED`

Resultado esperado:

- `finalCaseVersion = 5`;
- `finalCaseStage = collecting_evidence`.

No debe existir durante el rehearsal:

- `EVIDENCE_VERIFIED`;
- `PROFESSIONAL_REVIEW_REQUESTED`;
- `PROFESSIONAL_REVIEW_COMPLETED`;
- `SUBMISSION_PREPARED`;
- `SUBMISSION_RECORDED`;
- respuesta externa;
- negociación;
- resolución.

## Por qué el rehearsal termina en `EVIDENCE_ATTACHED`

`EvidenceStorageCoordinator.completeUpload()` realiza una comprobación técnica del objeto:

- existencia física sintética;
- MIME;
- tamaño;
- SHA-256;
- timestamp de inspección.

Esa comprobación solo permite construir un receipt técnico y adjuntar metadata de evidencia al Case.

No prueba:

- que el documento corresponda al hecho relevante;
- que sea suficiente para una conclusión;
- que sea auténtico jurídicamente;
- que un profesional haya revisado su contenido.

Por eso el hash técnico jamás puede crear `EVIDENCE_VERIFIED`.

La verificación de evidencia sigue reservada al Case State para actor `lawyer` o `admin`. Sin ese evento, el Case permanece en `collecting_evidence`.

## Autoridad server-side sobre clasificación

El request HTTP sintético de preparación envía deliberadamente una clasificación insegura para un extracto:

```text
kind = statement
legalDataCategory = non_personal
securityTier = open
```

La frontera HTTP conserva esos campos por compatibilidad de contrato, pero `ServerClassifiedEvidenceApplication` es la autoridad.

Para `statement` debe imponer:

```text
legalDataCategory = financial_credit_semiprivate
securityTier = restricted
```

La evidencia persistida y el read model final deben reflejar únicamente la clasificación canónica server-side.

Esto prueba que el navegador no puede degradar la clasificación de seguridad de la evidencia.

## Frontera HTTP ejercitada

El rehearsal ejecuta las tres operaciones existentes por `EvidenceHttpApi`:

### 1. Prepare

```text
evidence.prepare
```

Debe:

- validar request POST JSON;
- validar same-origin sintético;
- aplicar rate limit sintético permitido;
- crear un upload intent real mediante `CasePersistenceService`;
- reservar coordenadas opacas;
- emitir grant sintético temporal;
- responder HTTP 200.

### 2. Complete

```text
evidence.complete
```

Debe:

- validar `Idempotency-Key`;
- autorizar el Case antes de consultar Storage;
- resolver el intent;
- inspeccionar/hashar el objeto sintético;
- construir el receipt server-side;
- persistir `EVIDENCE_ATTACHED` atómicamente;
- responder HTTP 200.

### 3. Download

```text
evidence.download
```

Debe:

- autorizar el Case;
- resolver solo evidencia finalizada y legible;
- emitir un grant temporal sintético;
- responder HTTP 200.

El audit in-memory debe registrar en orden:

1. `evidence.prepare` → 200
2. `evidence.complete` → 200
3. `evidence.download` → 200

## Datos y determinismo

Todos los valores son sintéticos y constantes o secuenciales:

- origin: dominio `.invalid`;
- timestamp fijo;
- principal opaco `sub_*`;
- case/event/auth/evidence/upload/request IDs opacos;
- checksum fijo sintético;
- token de upload sintético;
- URL de download sintética.

Cada llamada a `runSyntheticEvidenceRuntimeRehearsal()` debe producir el mismo report observable.

El rehearsal no acepta input del usuario y no debe incorporar PII real.

## Reporte permitido

`SyntheticEvidenceRuntimeRehearsalReport` puede exponer:

- modo;
- flags de no activación;
- route y track;
- versión y stage final;
- secuencia de eventos;
- clasificación de evidencia;
- lifecycle;
- status HTTP;
- operaciones auditadas;
- booleans de fronteras verificadas.

No debe exponer:

- `storageLocator`;
- checksum SHA-256;
- upload token;
- secretos;
- bytes;
- URLs reales;
- subjectRef real;
- filename de usuario.

## Flags de verdad

Un report exitoso debe mantener:

```text
mode = synthetic_rehearsal
externalIoOccurred = false
liveRuntimeAuthorized = false
runtimeServerWasUsed = false
```

Estos flags son invariantes semánticas, no configuraciones opcionales.

Un rehearsal verde no debe reinterpretarse como:

- provider disponible;
- proyecto Supabase creado;
- infraestructura provisionada;
- migraciones live ejecutadas;
- Auth live validado;
- RLS validado;
- Storage live validado;
- secretos configurados;
- deployment listo;
- autorización para activar runtime.

## Aislamiento del runtime público

`server/evidence-api/runtime.server.ts` debe permanecer independiente.

La slice falla su contrato si cualquiera de estas condiciones aparece:

- `runtime.server.ts` importa `synthetic-rehearsal`;
- el rehearsal importa `createActivatedEvidenceRuntime`;
- el rehearsal consume `EvidenceRuntimeActivationFacts` para simular una activación;
- una route pública invoca automáticamente el rehearsal;
- se agregan credenciales o variables de provider al rehearsal;
- se realiza red externa.

El runtime público continúa con su configuración fail-closed hasta que una activación futura cumpla los gates canónicos.

## Relación con V0.23.12–V0.23.16

V0.23.17 es complementario, no sustitutivo.

Debe conservarse esta jerarquía:

- V0.23.12 → activation preflight;
- V0.23.13 → provisioning blueprint;
- V0.23.14 → DEV provisioning qualification;
- V0.23.15 → provider capacity preflight;
- V0.23.16 → provider capacity recovery;
- V0.23.17 → synthetic semantic/runtime rehearsal.

La capacidad de ejecutar el rehearsal no cambia ninguno de los gates externos anteriores.

## Criterios de aceptación

V0.23.17 se considera funcionalmente correcta únicamente si:

1. la ruta evaluada es R7 asistida;
2. el Case usa la implementación real de persistencia de dominio;
3. existe autorización de datos antes de persistir evidencia;
4. existe aceptación de servicio como evento separado de autoridad/poder;
5. las tres operaciones pasan por `EvidenceHttpApi`;
6. la clasificación débil del cliente es reemplazada server-side;
7. `complete` termina en `EVIDENCE_ATTACHED`;
8. no aparece `EVIDENCE_VERIFIED`;
9. el stage final es `collecting_evidence`;
10. el report no filtra coordenadas/checksum/token;
11. dos ejecuciones producen el mismo report;
12. no ocurre IO externo;
13. no se activa ni se importa el runtime live;
14. los tests de dominio pasan;
15. build pasa;
16. toda la suite Playwright histórica permanece verde.

## Evidencia funcional previa a la documentación

Sobre el head funcional `9af3190c53262b969ab4e03f3b7791b01950eb3c`, el workflow `34302794265` certificó:

- TypeScript: PASS;
- domain tests: PASS;
- build: PASS;
- Playwright: **244/244 PASS**.

Esta evidencia valida la implementación funcional previa. Después de incorporar esta especificación debe ejecutarse nuevamente el CI completo sobre el nuevo head documental antes de crear el STATUS/freeze.

## Fuera de alcance

V0.23.17 no implementa ni autoriza:

- creación de proyecto Supabase;
- billing o upgrade;
- pausado de proyectos existentes;
- Supabase Auth;
- RLS live;
- migrations live;
- Storage live;
- rate limiting distribuido;
- consent UI live;
- firma contractual;
- pago;
- subida de documentos reales;
- OCR;
- verificación profesional automática;
- contratación de abogado;
- poder o representación;
- radicación ante banco o tercero;
- persistencia pública activada;
- producción.
