# LOAN HEALTH INTEGRATION UX SPEC v0.21

Status: design contract draft
Base: v0.20 — Statement-Guided Mortgage Twin

## 1. Product gap

VIVIENDA already has a governed Loan Health evaluator (v0.11), but its public `/mi-vivienda` surface still uses demonstration data while the real existing-borrower journey now builds a C1 Mortgage Twin from user-transcribed statement data.

Current real path:

`Quick Check → Statement-Guided Mortgage Twin C1 → Opportunity Router → Case Plan`

Canonical Journey 1 requires:

`Quick value → better understanding → Loan Health → decision → execution`

v0.21 integrates Loan Health into the real path before route preparation.

## 2. User job

> “Ahora que ya entiendo la fotografía de mi crédito, dime qué partes están listas, cuáles necesitan información y qué merece atención antes de que yo elija una acción.”

Loan Health is not a score. It is a decision-oriented explanation of the current loan state.

## 3. Entry

Entry occurs after a Mortgage Twin exists and the user opens “Explorar mis próximas decisiones”.

Known context inherited without re-entry:

- product type;
- modality;
- current precision;
- source/provenance label.

The workspace may ask only facts required by Opportunity Router / Loan Health that are not yet known.

## 4. First value

The Loan Health summary must update from the same inputs that feed Opportunity Router.

Before the user prepares a route, show:

1. overall decision state;
2. six qualitative dimensions;
3. explanation for each state;
4. next action for each dimension;
5. provenance/precision boundary;
6. only then, route detail and Case Plan preparation.

## 5. Information hierarchy

### A. Current decision state

Use the canonical Loan Health headline. Never use green/red score language.

Display precision badge adjacent to the state.

### B. Six dimensions

1. Estructura del crédito
2. Prepago
3. Traslado / compra de cartera
4. Reestructuración anual
5. Consistencia / cobros
6. Mora / proceso

Each dimension exposes:

- qualitative status;
- plain-language explanation;
- next legitimate action;
- source route codes only as secondary detail.

### C. Router routes

Routes remain available below Loan Health.

Loan Health does not replace Opportunity Router and does not invent legal basis. It summarizes the same routed facts.

### D. Execution

`Preparar esta ruta` remains an explicit user action. Showing a Loan Health state does not create a Case, representation, filing or bank application.

## 6. Precision integration

The workspace receives a **decision precision** separate from source-document verification.

Rules:

- C1 snapshot + no compatible C2 model → Loan Health precision C1;
- C1 source + compatible deterministic model actually constructed → Loan Health may use C2 for model-dependent decision readiness, but this does not transform the underlying document/source into C2 or C3;
- C3 remains documentary verification only.

The UI must explain this distinction if C2 is used:

> “La modelación puede alcanzar C2 aunque los datos de origen sigan siendo declarados. C2 no significa que VIVIENDA haya verificado tu extracto.”

v0.21 must not silently promote precision merely because enough fields were typed. The C2 state must originate from an actually supported model handoff already returned by v0.20.

## 7. Status language

Canonical statuses and preferred UI labels:

- `ready` → “Listo para comparar”
- `explore` → “Vale la pena explorar”
- `needs_data` → “Falta información”
- `seasonal` → “Depende de la ventana”
- `attention` → “Requiere atención”
- `professional_review` → “Revisión profesional”
- `no_flag_reported` → “Sin señal reportada”
- `not_applicable` → “No aplica con estos hechos”

Do not map these to numeric health, traffic-light risk, approval probability or moral labels.

## 8. Overall-state language

- `professional_review_priority`: professional review takes precedence over optimization;
- `attention_required`: a concrete reported issue deserves attention;
- `actionable_opportunity`: at least one supported action is ready to compare;
- `improve_precision`: improve information/model precision before a material decision;
- `no_priority_action_detected`: no priority action detected from evaluated facts.

The last state must explicitly say it is not a certification that the loan is correct/problem-free.

## 9. Progressive disclosure

Default collapsed/compact view:

- overall state;
- six dimension labels + status;
- one-line explanation.

Expanded dimension:

- full explanation;
- next action;
- source route codes when applicable.

Router route cards remain below, so the page does not begin with legal rule detail before the user understands the decision picture.

## 10. Sensitive-data boundary

v0.21 remains anonymous/in-memory.

Do not add:

- name;
- email;
- phone;
- ID number;
- employer;
- bank-account/obligation identifiers;
- persistence;
- analytics containing financial values.

No account gate before this result.

## 11. Conversion point

The conversion is **route preparation**, not lead capture.

A user first sees Loan Health and route rationale. Only after choosing a route may the existing Case Plan preview appear.

No assisted-service CTA may outrank a valid self-service/education route solely for commercial reasons.

## 12. Empty / incomplete states

### Unknown product

Loan Health shows structure/prepayment/transfer/restructuring as needing classification where appropriate. Do not create a generic “bad health” state.

### No material opportunity

Show `no_priority_action_detected` with the explicit non-certification caveat.

### Payment pressure or inconsistency

Attention/professional review must outrank ordinary optimization.

### Judicial process

Professional review dominates. Do not place savings/prepayment as primary action above it.

## 13. Responsive behavior

At 390 px:

- overall state is single column;
- dimension rows/cards are single column;
- badges wrap without overflow;
- no horizontal scrolling;
- route details remain below Loan Health;
- touch targets ≥44 px;
- details/summary controls keyboard accessible.

## 14. Accessibility

- use a named region for Loan Health;
- overall state announced before dimensions in DOM order;
- status must never rely on color alone;
- expanded details use native `<details>` where suitable;
- updates caused by form changes use a controlled polite live region, not repeated assertive announcements;
- focus is not forcibly moved on every recalculation.

## 15. Analytics boundary

Future generic events may include:

- `loan_health_viewed`;
- `loan_health_dimension_opened` with dimension code/status;
- `opportunity_opened` with route code;
- `route_preparation_started` with route code.

Do not include balance, payment, income, rate, exact dates, filenames or obligation identifiers.

No analytics activation is part of v0.21.

## 16. Acceptance scenarios

1. Real C1 Mortgage Twin opens Router and immediately shows Loan Health derived from the same facts.
2. Product/modality inherited from v0.20 are not re-entered unless user corrects them.
3. Changing payment state updates both Router and Loan Health consistently.
4. Reporting an inconsistency makes Loan Health `attention_required` without claiming a violation.
5. Executive/embargo state makes `professional_review_priority` dominate optimization.
6. Valid prepago route can produce `actionable_opportunity` without implying guaranteed savings.
7. Unknown product produces `improve_precision`/needs-data states, not a fake score.
8. Absence of R7 displays “Sin señal reportada” plus non-certification language.
9. Loan Health preserves C1 unless an actually constructed compatible C2 decision model is explicitly passed.
10. C2 decision precision never renders C3 copy.
11. Route preparation remains a separate deliberate user action.
12. Existing Case Plan behavior still works after integration.
13. No account/contact gate is introduced.
14. No financial values enter URL.
15. Mobile 390 px has no horizontal overflow.
16. Keyboard user can inspect dimensions and prepare a route.

## 17. Out of scope

- numeric Loan Health score;
- current market-rate competitiveness;
- live transfer offers;
- bank matching;
- bureau/Open Finance;
- account creation;
- persistence;
- real document upload/OCR;
- C3 promotion;
- alerts/monitoring;
- automatic legal conclusion;
- automatic Case creation.

## 18. Frozen design principle candidate

> **Loan Health explains the decision state before VIVIENDA asks the user to choose an execution route.**
