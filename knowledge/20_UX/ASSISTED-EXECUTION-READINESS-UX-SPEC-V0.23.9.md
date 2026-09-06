# Assisted Execution Readiness — UX Spec V0.23.9

## Product question

After a user explicitly chooses **Revisarlo con acompañamiento** for an R7 Mortgage Audit route, how do we explain the next real operational requirements without pretending that the service, case or professional relationship already exists?

## Placement in the journey

Canonical local-preview flow:

`Mi Situación → Radar Vivienda → Mi Decisión → Cómo quieres avanzar → Revisarlo con acompañamiento → Case Plan → Preparación del acompañamiento`

The readiness panel appears only after all prior boundaries have already been crossed deliberately.

## Visibility rule

Render Assisted Execution Readiness only when:

- governing route is R7;
- selected execution intent is **Revisarlo con acompañamiento**;
- selected case track is the assisted track.

Do not render it for:

- R7 + **Prepararlo por mi cuenta**;
- ordinary R1/R2 self-service preparation;
- R10 professional-review preparation;
- any route without the Mortgage Audit assisted blueprint.

## Primary message

The panel must answer:

> **Qué tendría que ocurrir para iniciar este acompañamiento de verdad.**

The state is explicitly shown as **Preparación pendiente**.

The user must also see that:

> **Ningún paso operativo ha ocurrido todavía.**

## Real-state summary

The panel exposes a compact real-state section with negative truth states, including:

- expediente real: No;
- autorización de datos registrada: No;
- servicio aceptado: No;
- revisión profesional completada: No.

The purpose is not to show a fake progress tracker. It is to distinguish planned prerequisites from events that actually happened.

## Setup sequence

The UI maps the canonical eight-event blueprint to consumer-language steps:

1. Abrir el expediente de acompañamiento;
2. Registrar autorización de datos;
3. Aceptar el alcance del servicio;
4. Definir la evidencia necesaria;
5. Incorporar la evidencia autorizada;
6. Verificar la evidencia;
7. Solicitar la revisión profesional;
8. Completar la revisión profesional.

The first item may be labeled as the next real step. Later items must remain visibly dependent on previous steps.

## What this panel must not do

The panel is explanatory only.

It must not provide controls that imply or perform:

- aceptar el servicio;
- contratar;
- pagar;
- subir evidencia persistente;
- abrir un expediente real;
- registrar consentimiento;
- solicitar una revisión profesional real;
- conceder poder o autoridad;
- radicar ante banco/tercero.

## Evidence language

Evidence requirements come from the existing R7 Case Plan / Mortgage Audit blueprint.

The UI may explain what would be useful or required later, but must not imply that any document is already uploaded, retained, reviewed or verified.

## Professional boundary

The assisted path requires professional review in its blueprint, but this preview does not create a professional engagement.

The UI must preserve the distinction between:

- planning a professional review;
- requesting a professional review in a real case;
- completing a professional review.

Only the first exists in V0.23.9.

## Authority boundary

Service readiness must not imply:

- facultad extrajudicial;
- poder judicial;
- representation before a lender;
- authority to submit documents or negotiate.

These remain separate future capabilities governed by Case State.

## Customer-language firewall

Visible customer copy stays in Spanish and avoids engineering/domain identifiers.

Raw identifiers such as the following must not appear as exact customer text:

- `CASE_CREATED`;
- `assisted`;
- `MORTGAGE_AUDIT_R7_V1`;
- `PROFESSIONAL_REVIEW_COMPLETED`.

The application may continue to use those values internally and in `data-*` attributes needed for deterministic E2E targeting.

## Accessibility

- readiness is contained in a semantically identifiable section;
- setup steps are accessible as ordered articles/items;
- real-state summary has an accessible label;
- headings preserve hierarchy within Case Plan;
- status is not communicated by color alone;
- no horizontal-overflow regression on mobile 390 px.

## E2E acceptance criteria

### R7 assisted

After selecting R7 and **Revisarlo con acompañamiento**:

- Case Plan opens;
- track shows Acompañamiento;
- readiness panel is visible;
- status says Preparación pendiente;
- real-state summary remains negative;
- eight setup steps are visible in canonical order;
- no activation/contract/payment/upload CTA exists.

### Language firewall

Within readiness customer copy:

- raw event identifiers are absent;
- raw service code is absent;
- internal track name is absent.

### R7 self preparation

After selecting the same R7 route but **Prepararlo por mi cuenta**:

- Case Plan opens in Autogestión;
- Assisted Execution Readiness is absent.

This proves that readiness follows explicit execution intent rather than the route's human-review flag alone.

## Deferred

A later slice may introduce a real activation boundary, but only after product/legal/operational requirements for authentication, consent, service agreement, persistence, pricing and professional engagement are defined.
