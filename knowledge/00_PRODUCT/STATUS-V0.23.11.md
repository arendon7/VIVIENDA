# STATUS V0.23.11 — Assisted Intake Gate

## Estado

**FUNCTIONALLY FULL GREEN / DOCUMENTATION FREEZE PENDING FINAL CI**

Rama:

`product/assisted-intake-gate-v0.23.11`

Base congelada heredada:

**V0.23.10 — Assisted Evidence Readiness**

Base SHA:

`9196da96e95ecbd9ef223a18415b6ba687c6d736`

Head funcional/documental full green previo al STATUS:

`768aeb622a6aafffdbc6058bcd6ffb0caa4cbc31`

GitHub Actions run funcional:

`34146190161`

El freeze definitivo de V0.23.11 corresponde al commit documental que contiene este STATUS, siempre que ese SHA vuelva a pasar verify + E2E FULL GREEN.

## Pregunta de producto

V0.23.11 responde:

> **Después de organizar mis soportes, ¿está realmente habilitada la plataforma para recibirlos de manera segura?**

## Regla central

> **Estar preparado para entregar evidencia no significa que la plataforma esté habilitada para recibirla.**

V0.23.10 resuelve preparación local. V0.23.11 añade una frontera explícita antes de cualquier futuro intake autenticado.

## Alcance

La nueva superficie existe únicamente en:

`R7_RECLAMACION → assisted_mortgage_audit → Assisted Evidence Readiness`

No aparece en:

- R7 autogestión;
- R1/R2;
- R3;
- R5;
- R10.

No crea endpoints nuevos ni conecta providers.

## Estados del gate

### `local_preparation_required`

El inventario local todavía no está listo.

### `platform_activation_required`

El inventario puede estar listo, pero falta infraestructura server-side necesaria para recibir evidencia de forma segura.

Este es el estado esperado del runtime actual después de completar el inventario.

### `real_case_required`

La plataforma podría estar habilitada, pero todavía no existe un expediente real.

### `data_authorization_required`

Existe expediente, pero no se ha registrado autorización de tratamiento de datos.

### `service_agreement_required`

Existe autorización de datos, pero no se ha aceptado expresamente el alcance del servicio asistido.

### `secure_upload_ready`

Todas las precondiciones fueron expresamente satisfechas y el contrato permite **ofrecer** el siguiente paso de upload seguro.

`secure_upload_ready` no significa archivo cargado, persistido o verificado.

## Orden de precedencia

El gate resuelve en este orden:

1. preparación local;
2. capacidades de plataforma;
3. expediente real;
4. autorización de datos;
5. aceptación del alcance del servicio;
6. posibilidad de ofrecer upload seguro.

No se adelantan pasos posteriores cuando falta una precondición anterior.

## Capacidades de plataforma

El contrato distingue explícitamente:

- identidad autenticada disponible;
- persistencia de caso disponible;
- almacenamiento seguro disponible;
- rate limiting disponible;
- trusted origin disponible.

Solo se exponen booleanos de capacidad. No se trasladan al browser:

- credenciales;
- tokens;
- signed URLs;
- service keys;
- bucket/path;
- subject refs;
- configuración sensible del provider.

## Hechos separados del caso

El gate distingue:

- expediente real creado;
- autorización de datos registrada;
- alcance del servicio aceptado.

Aceptar el servicio no implica:

- poder;
- mandato;
- facultad extrajudicial;
- representación judicial.

## Estado real del preview actual

`buildPreviewAssistedIntakeGate()` mantiene fail-closed:

- authenticated identity = false;
- case persistence = false;
- secure storage = false;
- rate limit = false;
- trusted origin = false;
- real case = false;
- data authorization = false;
- service agreement = false.

Por tanto:

- inventario incompleto → `local_preparation_required`;
- inventario listo → `platform_activation_required`;
- `secureUploadMayBeOffered` permanece **false**.

El journey actual no puede alcanzar `secure_upload_ready`.

## Truth boundary

Incluso en una futura activación donde `secure_upload_ready = true`:

- inventario listo ≠ evidencia recibida;
- gate listo ≠ upload;
- gate listo ≠ persistencia;
- gate listo ≠ verificación;
- gate listo ≠ revisión profesional;
- service agreement ≠ autoridad.

La operación de upload deberá continuar separada, trazable y autorizada.

## Relación con Evidence API v0.9

La infraestructura provider-ready ya define límites para prepare/complete/download, trusted origin, rate limiting, identidad y clasificación server-side.

El runtime actual (`server/evidence-api/runtime.server.ts`) usa deliberadamente:

- `UnconfiguredEvidenceApplication`;
- `FailClosedRateLimit`.

V0.23.11 **no llama** esa API y **no cambia** ese runtime.

Su función es evitar que la UI ofrezca una acción que la plataforma actual no puede ejecutar de forma legítima y segura.

## UX

El nuevo panel muestra:

- inventario local listo;
- plataforma segura habilitada;
- expediente real;
- autorización de datos;
- alcance del servicio aceptado;
- carga segura ofrecible;
- siguiente requisito.

Cuando el usuario termina el inventario local, el producto no muestra `Subir documentos`.

Muestra:

**La carga segura todavía no está habilitada en este entorno.**

No existe:

- file input;
- drag-and-drop;
- CTA ficticia de upload;
- enlace a `/verificar` como sustituto de intake real.

## Revisión con skills canónicos

La implementación fue revisada contra:

- `skills/housing-finance-design-orchestrator/SKILL.md`;
- `design-skills.lock.json`;
- `.agents/product-marketing-context.md`.

Principios preservados:

- verdad, privacidad y seguridad prevalecen sobre conversión;
- valor antes de captura sensible;
- compromiso progresivo;
- no fingir capacidades productivas;
- explicar por qué una acción sensible todavía no está disponible;
- separar preparación, consentimiento y ejecución.

## Gate funcional confirmado

Sobre `768aeb622a6aafffdbc6058bcd6ffb0caa4cbc31`:

- TypeScript — **PASS**
- Domain tests — **PASS**
- Production build — **PASS**
- Borrower journey E2E — **PASS**
- Playwright — **244/244 PASS**
- Desktop Chromium — **PASS**
- Mobile 390 px — **PASS**
- Remote Preview E2E — **SKIPPED por diseño**

Run:

`34146190161`

## Diff funcional/documental previo al STATUS contra V0.23.10

- 7 commits
- 7 archivos

Archivos:

1. `components/vivienda/assisted-evidence-readiness-panel.tsx`
2. `components/vivienda/assisted-intake-gate-panel.tsx`
3. `domain/assisted-execution/intake-gate.test.ts`
4. `domain/assisted-execution/intake-gate.ts`
5. `knowledge/20_UX/ASSISTED-INTAKE-GATE-UX-SPEC-V0.23.11.md`
6. `knowledge/40_DOMAIN/ASSISTED-INTAKE-GATE-CONTRACT-V0.23.11.md`
7. `tests/e2e/assisted-intake-gate.spec.ts`

## Documentación canónica

- `knowledge/00_PRODUCT/STATUS-V0.23.11.md`
- `knowledge/20_UX/ASSISTED-INTAKE-GATE-UX-SPEC-V0.23.11.md`
- `knowledge/40_DOMAIN/ASSISTED-INTAKE-GATE-CONTRACT-V0.23.11.md`

## Fuera de alcance

- autenticación real;
- Supabase live;
- persistencia durable;
- Storage live;
- upload de documentos;
- OCR;
- consentimiento productivo;
- expediente real;
- contratación/pago;
- signed upload grants productivos;
- facultad/poder;
- evidencia verificada;
- revisión profesional real;
- radicación;
- respuestas externas;
- ejecución ante terceros.

## Siguiente paso

No abrir el PR de V0.23.11 hasta que el SHA documental final vuelva a pasar verify + los 244 E2E. Después debe abrirse como draft apilado sobre V0.23.10 / #39, sin fusionar el stack.
