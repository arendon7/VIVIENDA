# STATUS · V0.23.17 · Synthetic Evidence Runtime Rehearsal

## Estado

**Candidato de freeze documental.**

Rama:

`product/synthetic-evidence-runtime-rehearsal-v0.23.17`

Base inmediata:

`product/provider-capacity-recovery-v0.23.16`

Freeze padre V0.23.16:

`2f54f73f7ce27efa8b6b86c4f76cb77a6c191991`

Head funcional/documental previo a este STATUS:

`4e158da005bc37234923fbd4c80d018d4b8b7acf`

## Pregunta de producto/arquitectura

Mientras la activación live del Evidence Runtime continúa bloqueada por infraestructura externa y no existe autorización para ejecutar una mutación de billing o pausar otro proyecto, ¿podemos demostrar de manera reproducible que la composición real de Case + privacidad + Storage coordination + HTTP funciona de punta a punta sin simular que Supabase está activado?

## Respuesta V0.23.17

Sí, mediante un **Synthetic Evidence Runtime Rehearsal** explícitamente aislado del runtime público.

El rehearsal usa implementaciones reales del dominio y de la frontera HTTP, pero sustituye únicamente la infraestructura externa por adapters determinísticos en memoria.

Composición ejercitada:

`MemoryCasePersistence`
→ `CasePersistenceService`
→ `EvidenceStorageCoordinator`
→ `ServerClassifiedEvidenceApplication`
→ `EvidenceHttpApi`

No se modifica `runtime.server.ts` y no se invoca `createActivatedEvidenceRuntime`.

## Ruta funcional ensayada

El rehearsal usa exclusivamente:

- route: `R7_RECLAMACION`;
- track: `assisted`;
- evidencia: `statement`;
- principal: cliente sintético autenticado;
- persistence: memoria;
- registry: memoria;
- Storage provider: memoria;
- HTTP boundary: real.

La secuencia de Case resultante es exactamente:

1. `CASE_CREATED`
2. `DATA_AUTHORIZATION_RECORDED`
3. `SERVICE_AGREEMENT_ACCEPTED`
4. `EVIDENCE_REQUESTED`
5. `EVIDENCE_ATTACHED`

Resultado:

- `finalCaseVersion = 5`;
- `finalCaseStage = collecting_evidence`.

## Frontera semántica crítica

La inspección técnica del objeto verifica únicamente:

- existencia;
- MIME;
- tamaño;
- checksum SHA-256;
- timestamp técnico.

Esa inspección **no equivale** a `EVIDENCE_VERIFIED`.

El rehearsal no produce dicho evento y no puede llevar el Case a `ready_for_review`.

La verificación profesional de evidencia sigue reservada al Case State para actor `lawyer` o `admin`.

Por tanto:

> hash técnico ≠ verificación jurídica/profesional.

## Autoridad server-side sobre clasificación

La solicitud HTTP sintética intenta declarar un `statement` como:

- `legalDataCategory = non_personal`;
- `securityTier = open`.

La aplicación server-side reemplaza esos valores por la clasificación canónica:

- `financial_credit_semiprivate`;
- `restricted`.

La evidencia persistida refleja solo la clasificación server-side.

Así se demuestra que el navegador no controla la clasificación efectiva de seguridad.

## HTTP ejercitado

Las tres operaciones existentes pasan por `EvidenceHttpApi`:

1. `evidence.prepare` → HTTP 200
2. `evidence.complete` → HTTP 200
3. `evidence.download` → HTTP 200

El audit sintético conserva el mismo orden.

No se agregaron endpoints públicos.

## Reporte y no filtración

`SyntheticEvidenceRuntimeRehearsalReport` expone solo información técnica segura de la prueba.

El report no expone:

- `storageLocator`;
- checksum SHA-256;
- upload token;
- secretos;
- bytes del documento;
- PII real;
- filenames reales.

Dos ejecuciones consecutivas deben producir el mismo report.

## Flags de verdad

El resultado exitoso conserva obligatoriamente:

- `mode = synthetic_rehearsal`;
- `externalIoOccurred = false`;
- `liveRuntimeAuthorized = false`;
- `runtimeServerWasUsed = false`.

Estos flags impiden interpretar el rehearsal como una activación live.

## Separación del runtime público

V0.23.17 no:

- importa `runtime.server.ts`;
- modifica `runtime.server.ts`;
- importa `createActivatedEvidenceRuntime`;
- construye `EvidenceRuntimeActivationFacts` falsos;
- consume Supabase;
- consume red externa;
- usa secretos;
- habilita rutas públicas;
- crea infraestructura.

El runtime público conserva `UnconfiguredEvidenceApplication` + `FailClosedRateLimit` hasta que una activación real cumpla sus gates canónicos.

## Relación con V0.23.12–V0.23.16

V0.23.17 no sustituye ningún gate externo.

Secuencia de responsabilidades:

- V0.23.12 → Evidence Runtime Activation Preflight;
- V0.23.13 → Production Provisioning Blueprint;
- V0.23.14 → DEV Provisioning Qualification;
- V0.23.15 → Provider Capacity Preflight;
- V0.23.16 → Provider Capacity Recovery;
- V0.23.17 → Synthetic Evidence Runtime Rehearsal.

Un rehearsal verde no implica que exista capacidad, proyecto DEV, Auth, RLS, Storage real, secrets o deployment válido.

## Qué demuestra realmente V0.23.17

Demuestra que, dentro del proceso Node y usando contratos reales:

- Case State acepta la secuencia R7 asistida esperada;
- la autorización de datos precede a la persistencia de evidencia;
- la aceptación del servicio permanece separada de poder/representación;
- el Evidence Storage Coordinator puede preparar y finalizar evidencia;
- el HTTP boundary puede conducir prepare/complete/download;
- la clasificación server-side prevalece;
- el read model no filtra material físico privilegiado;
- el objeto técnico puede adjuntarse sin fabricar verificación profesional;
- la composición es determinística.

## Qué NO demuestra

No demuestra:

- Supabase Auth;
- RLS real;
- Storage real;
- migrations live;
- secretos desplegados;
- trusted origins live;
- rate limiting distribuido;
- backup/recovery;
- observabilidad externa;
- performance de provider;
- disponibilidad;
- billing;
- producción.

## Archivos del slice antes de STATUS

1. `server/evidence-api/synthetic-rehearsal.ts`
2. `server/evidence-api/synthetic-rehearsal.test.ts`
3. `knowledge/10_DECISIONS/ADR-0013-synthetic-evidence-runtime-rehearsal.md`
4. `knowledge/60_ENGINEERING/SYNTHETIC-EVIDENCE-RUNTIME-REHEARSAL-V0.23.17.md`

Este STATUS es el quinto archivo del slice.

## Verificación funcional inicial

Head funcional:

`9af3190c53262b969ab4e03f3b7791b01950eb3c`

GitHub Actions run:

`34302794265`

Resultado:

- TypeScript — **PASS**
- Domain tests — **PASS**
- Build — **PASS**
- Playwright — **244/244 PASS**
- Remote Preview E2E — **SKIPPED por diseño**

## Verificación funcional/documental previa al STATUS

Head:

`4e158da005bc37234923fbd4c80d018d4b8b7acf`

GitHub Actions run:

`34309345693`

Resultado:

- TypeScript — **PASS**
- Domain tests — **PASS**
- Build — **PASS**
- Playwright — **244/244 PASS**
- Remote Preview E2E — **SKIPPED por diseño**

Playwright reportó:

`244 passed (1.7m)`

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
- su base será V0.23.16/#45, no `main`;
- el CI del merge ref deberá quedar verde;
- se registrará comentario final de freeze;
- no se fusionará el stack.

## Zero semantic bridge

V0.23.17 no crea ningún puente semántico desde “rehearsal verde” hacia:

- provider disponible;
- capacidad liberada;
- proyecto Supabase creado;
- DEV provisionado;
- DEV calificado;
- runtime activado;
- usuario real autenticado;
- Case real creado;
- consentimiento real registrado;
- contrato real aceptado;
- documento real almacenado;
- servicio profesional contratado;
- poder otorgado;
- radicación ejecutada.

## Fuera de alcance

- crear `vivienda-dev`;
- pausar proyectos Supabase;
- cambiar organización;
- ejecutar upgrade/billing;
- activar Supabase Auth;
- aplicar migrations externas;
- validar RLS live;
- habilitar Storage live;
- almacenar documentos reales;
- OCR;
- firma;
- pago;
- poder o representación;
- contratación profesional;
- radicación bancaria o judicial;
- STAGING/PROD;
- merge de PRs.

## Criterio de cierre

V0.23.17 queda cerrado únicamente cuando:

- este STATUS tenga freeze SHA propio;
- el freeze repita verify + 244 E2E;
- exista PR draft apilado sobre #45;
- `mergeable = true`;
- CI propio del PR pase verify + 244/244 E2E;
- se registre comentario final de freeze;
- no existan commits posteriores.
