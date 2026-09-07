# STATUS V0.23.10 — Assisted Evidence Readiness

## Estado

**FUNCTIONALLY FULL GREEN / DOCUMENTATION FREEZE PENDING FINAL CI**

Rama:

`product/assisted-evidence-readiness-v0.23.10`

Base congelada heredada:

**V0.23.9 — Assisted Execution Readiness**

Base SHA:

`762a597ad68f40a9d54d837d4e8033e478c71cf3`

Head funcional full green previo al STATUS:

`f183babc5a5ad78c79f6f7f2cb41a556cd3ddb9e`

GitHub Actions run funcional:

`34129278919`

El freeze definitivo de V0.23.10 corresponde al commit documental que contiene este STATUS, siempre que ese SHA vuelva a pasar verify + E2E FULL GREEN.

## Pregunta de producto

V0.23.10 responde:

> **Antes de compartir documentos sensibles, ¿qué soportes ya tengo disponibles y cuáles me falta reunir para la auditoría R7?**

## Regla central

> **Inventariar presencia no es entregar evidencia.**

Marcar `Lo tengo` o `Me falta` solo modifica un inventario local de preparación durante la sesión.

No crea hechos de Case State.

## Alcance

La nueva superficie existe únicamente en:

`R7 → Mi Decisión → Revisarlo con acompañamiento → Case Plan`

No aparece en:

- R7 autogestión;
- R1/R2;
- R3;
- R5;
- R10.

## Fuente canónica

Los soportes provienen exclusivamente de:

`MortgageAuditExecutionBlueprint.casePlan.evidenceChecklist`

El consumidor no puede agregar requisitos arbitrarios al dominio.

Las declaraciones sobre labels inexistentes se ignoran.

## Estados locales por soporte

- `not_declared`
- `user_reports_available`
- `user_reports_missing`

Estos enum son internos; la UI usa únicamente:

- `Lo tengo`
- `Me falta`
- estado textual de preparación.

## Truth boundary por soporte

Incluso después de marcar `Lo tengo`:

- uploaded = **false**;
- persisted = **false**;
- verified = **false**.

V0.23.10 no registra:

- `CASE_CREATED`;
- `DATA_AUTHORIZATION_RECORDED`;
- `EVIDENCE_ATTACHED`;
- `EVIDENCE_VERIFIED`;
- `PROFESSIONAL_REVIEW_REQUESTED`.

## Estados de preparación

### `needs_classification`

Falta clasificar al menos un soporte actual.

### `needs_collection`

Los soportes actuales ya fueron clasificados y al menos uno fue declarado faltante.

### `declared_ready_for_future_intake`

Todos los soportes actuales no condicionales fueron declarados disponibles por el usuario.

Este estado **no** significa evidencia suficiente, auténtica, cargada o verificada. Solo significa que el inventario local declara esos soportes disponibles para un futuro ingreso documental.

## Evidencia condicional

Los items `conditional` permanecen visibles, pero no bloquean la preparación actual mientras el hecho/evento que los haría relevantes todavía no exista.

No se interpreta `conditional` como `not required forever`.

## Data minimization

La superficie no solicita:

- bytes de documentos;
- filename real;
- cédula;
- número de crédito/cuenta;
- contenido libre del documento;
- poder;
- mandato;
- pago.

No existe file input ni drag-and-drop.

## UX

La UI muestra:

- disponibles según el usuario;
- faltantes;
- sin clasificar;
- condicionales;
- siguiente paso seguro;
- controles reversibles `Lo tengo / Me falta` con `aria-pressed`;
- `Reiniciar inventario local` cuando existe al menos una declaración.

En R7 asistido, este inventario reemplaza la lista documental estática duplicada.

En R7 autogestión se conserva el checklist ordinario de Case Plan.

## Relación con V0.23.9 y Case State

V0.23.9 continúa gobernando la preparación operativa real:

`case → autorización de datos → acuerdo → request evidencia → attach → verify → review request → professional review`

V0.23.10 no completa ninguno de esos pasos.

El Case Timeline local de demostración sigue siendo independiente. Cambiar una declaración del inventario no agrega eventos al timeline.

## Gate funcional confirmado

Sobre `f183babc5a5ad78c79f6f7f2cb41a556cd3ddb9e`:

- TypeScript — **PASS**
- Domain tests — **PASS**
- Production build — **PASS**
- Borrower journey E2E — **PASS**
- Playwright — **240/240 PASS**
- Desktop Chromium — **PASS**
- Mobile 390 px — **PASS**
- Remote Preview E2E — **SKIPPED por diseño**

Run: `34129278919`

## Diff funcional/documental previo al STATUS contra V0.23.9

- 10 commits
- 8 archivos
- +858 / −25

Archivos:

1. `components/vivienda/assisted-evidence-readiness-panel.tsx`
2. `components/vivienda/assisted-execution-readiness-panel.tsx`
3. `components/vivienda/case-plan-workspace.tsx`
4. `domain/assisted-execution/evidence-readiness.test.ts`
5. `domain/assisted-execution/evidence-readiness.ts`
6. `knowledge/20_UX/ASSISTED-EVIDENCE-READINESS-UX-SPEC-V0.23.10.md`
7. `knowledge/40_DOMAIN/ASSISTED-EVIDENCE-READINESS-CONTRACT-V0.23.10.md`
8. `tests/e2e/assisted-evidence-readiness.spec.ts`

## Documentación canónica

- `knowledge/00_PRODUCT/STATUS-V0.23.10.md`
- `knowledge/20_UX/ASSISTED-EVIDENCE-READINESS-UX-SPEC-V0.23.10.md`
- `knowledge/40_DOMAIN/ASSISTED-EVIDENCE-READINESS-CONTRACT-V0.23.10.md`

## Fuera de alcance

- autenticación real;
- proyecto Supabase live;
- persistencia durable;
- Storage live;
- upload documental;
- OCR;
- consentimiento productivo;
- expediente real;
- servicio contratado;
- checkout/pago;
- evidencia verificada;
- revisión profesional real;
- poder o facultad;
- radicación;
- respuesta externa;
- resultado verificado.

## Siguiente paso

No abrir V0.23.11 encima de este slice hasta que el SHA documental final vuelva a pasar verify + los 240 E2E y quede abierto el draft PR apilado sobre V0.23.9 / #38.
