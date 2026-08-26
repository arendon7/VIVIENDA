# INCONSISTENCY RECONCILIATION UX SPEC v0.15

Date: 2026-08-26
Status: UX contract
Route: `/revisar-diferencia`
Domain source: `INCONSISTENCY-RECONCILIATION-CONTRACT-V0.15.md`

## 1. User promise

**Algo no te cuadra en tu crédito. Aislemos exactamente qué es.**

The route helps a user convert a vague concern into a factual, evidence-oriented comparison.

It is not an “abuse detector”, a legal opinion or a generic legal-services funnel.

## 2. First-value rule

The first result is anonymous **C0**.

Do not request before first result:

- name;
- ID;
- email;
- phone;
- lender account number;
- case number;
- document upload.

Even when the user says they have two sources, the product has not processed those sources and must remain C0.

## 3. Wizard grammar

Use five short decisions, one per screen.

### Step 1 — What does not match?

Question:

**¿Qué es lo que no te cuadra?**

Consumer labels map to canonical kinds:

- `payment_allocation` — Hice un pago o abono y no entiendo cómo lo aplicaron
- `contract_or_statement` — El extracto parece decir algo distinto a lo pactado
- `rate_or_modality` — La tasa o modalidad no coincide con lo que esperaba
- `insurance_or_fee` — Hay un seguro, tarifa o cobro que no identifico
- `balance_or_term` — El saldo, plazo o cuotas restantes no me cuadran
- `annual_projection` — La proyección anual no coincide con lo que realmente ocurrió
- `missing_information` — Me falta información que la entidad no me ha aclarado
- `collection_charge` — Hay un valor de cobranza que no entiendo
- `other` — Es otra diferencia

This is the emotional entry point and should come before legal/product classification.

### Step 2 — Specificity

Question:

**¿Puedes señalar exactamente qué esperabas y qué aparece distinto?**

- `specific` — Sí, puedo señalar la diferencia concreta
- `unclear` — No todavía; sé que algo no me cuadra

Do not ask the user to state that the lender is wrong.

### Step 3 — Evidence availability

Question:

**¿Qué puedes comparar hoy?**

- `none` — No tengo ningún soporte a la mano
- `one_source` — Tengo una sola fuente (por ejemplo un extracto)
- `two_sources` — Tengo dos fuentes para contrastar
- `unknown` — No sé qué documentos sirven

Hint:

“Dos fuentes declaradas mejoran la orientación, pero no convierten este resultado en una auditoría documental.”

### Step 4 — Product

Question:

**¿Qué tipo de financiación es?**

- `mortgage_housing` — Crédito hipotecario de vivienda
- `housing_leasing` — Leasing habitacional
- `unknown` — No estoy seguro

Unknown product must not receive mortgage-specific legal escalation merely because two sources are declared.

### Step 5 — Judicial boundary

Question:

**¿Hay hoy algún proceso o actuación judicial que conozcas?**

Options map to `PaymentState` but keep the question narrow:

- `current` — No; no conozco un proceso judicial
- `collections` — Solo tengo cobranza o comunicaciones de cobro
- `prelegal` — Me hablaron de cobro prejurídico / prelegal
- `executive` — Sí; recibí un documento de juzgado o sé que hay un proceso
- `embargo_or_auction` — Sí; conozco embargo, secuestro, remate u otra actuación avanzada
- `unknown` — No estoy seguro

Do not make the user repeat the full Payment Pressure journey.

## 4. Result states and labels

No numerical score.

- `education_first` → **Entender antes de escalar**
- `needs_information` → **Falta información**
- `difference_to_reconcile` → **Comparar fuentes**
- `possible_inconsistency` → **Vale la pena auditar**
- `procedural_priority` → **Revisión prioritaria**

Color is secondary; text is mandatory.

## 5. Result hierarchy

Render in this order:

1. C0 + state label;
2. title and plain-language explanation;
3. **Qué reportaste**;
4. **Qué podría explicarlo**;
5. **Qué comparar** — paired comparison card;
6. evidence checklist;
7. primary next action;
8. R7/R10 route context when present;
9. notices / product boundaries;
10. explicit truth boundary.

The visual centerpiece is the comparison pair, not a legal conclusion.

## 6. Comparison surface

Use a two-column card on desktop and stacked cards on mobile:

**Fuente A — Lo esperado / comunicado**

vs.

**Fuente B — Lo aplicado / observado**

The labels come from `result.whatToCompare` and must stay non-accusatory.

For annual projections, the pair becomes:

- assumptions/figures of projection;
- actual behavior during the same period.

## 7. State-specific actions

### Education first

No professional CTA.

Primary action:

**Entender primero qué significa la diferencia**

Explain that projection variance or another structurally explainable difference should be reconciled before escalation.

### Needs information

No professional CTA.

Primary action:

**Conseguir la información que falta**

Show exact evidence items and encourage a concrete written information request/radicado where relevant.

### Difference to reconcile

No generic attorney CTA.

Primary action:

**Comparar las fuentes antes de escalar**

The user should see exactly which second source is missing or what must be aligned (e.g. cutoff dates).

### Possible inconsistency / R7

Primary CTA may be:

**Auditar la diferencia** → `/auditoria-hipotecaria`

Supporting copy:

“Tu descripción justifica revisar evidencia real; todavía no demuestra que exista una infracción o error de la entidad.”

### Procedural priority / R10

Primary CTA:

**Revisar el documento judicial** → `/verificar`

R7 must not become the first CTA even if a mismatch also exists.

## 8. What the first result must never say

Do not render:

- “El banco se equivocó”;
- “Esto es ilegal”;
- “Te cobraron de más”;
- “Tienes derecho a devolución de $X”;
- “Tu reclamación tiene X% de probabilidad”;
- “Ganaremos el caso”;
- automatic deadline/countdown.

## 9. Product-type boundary

If product is unknown:

- result label = `Falta información` unless R10 overrides;
- primary action must help classify the product;
- no R7 CTA.

If leasing:

- factual/document comparison remains useful;
- no mortgage-only legal procedure language;
- no Article 20 inheritance.

## 10. Judicial boundary

If user reports `executive` or `embargo_or_auction`:

- state = `Revisión prioritaria`;
- R10 is first route;
- CTA = `/verificar`;
- result explicitly says the ordinary discrepancy can still matter but does not replace judicial-document review;
- no procedural term calculation.

Collections/prelegal remain non-judicial unless separately reported.

## 11. Source/freshness module

Show a compact source module in the result:

**Referencia estructural — información de crédito de vivienda / deber de información**

Cutoff:

`26 ago 2026`

Plain-language note:

“Los extractos de vivienda permiten contrastar campos como tasa, saldo, plazo/cuotas y discriminación del pago. Una diferencia requiere comparar fuentes equivalentes antes de concluir que existe un error.”

Do not expose long legal citations as the primary experience.

## 12. Accessibility

- first focus = skip link;
- each wizard step has a fieldset/legend;
- Continue disabled until a choice is selected;
- result `<h1>` receives programmatic focus;
- state is text, not color-only;
- comparison cards have visible labels;
- no horizontal overflow at 390 px;
- all actions keyboard reachable.

## 13. Contextual Home entry

Add a secondary borrower path, without displacing `Revisar mi crédito`:

Eyebrow:

**Algo no me cuadra**

Heading:

**¿Hay un cobro, tasa, saldo o movimiento que no entiendes?**

CTA:

**Revisar una diferencia** → `/revisar-diferencia`

This is adjacent to Payment Pressure and buyer routes but does not become the primary Home CTA.

## 14. E2E acceptance

At minimum desktop + mobile 390 must cover:

1. projection variance → education, no R7 CTA;
2. missing information → self-service, no R7 CTA;
3. vague issue + two sources → no R7 CTA;
4. payment allocation + specific + two sources + mortgage → R7 CTA;
5. contract/statement + specific + two sources → R7 CTA;
6. insurance/fee + one source → compare sources, no R7 CTA;
7. balance/term result includes cutoff-date evidence;
8. judicial process + mismatch → R10 `/verificar`, no R7 CTA;
9. unknown product + two sources → classify product, no R7;
10. leasing → no Article 20/mortgage procedure language;
11. no illegal/fraud/bank-error/refund guarantee wording;
12. first screen contains no identity/contact fields;
13. keyboard focus on result;
14. no horizontal overflow at 390 px;
15. Home contextual entry exists while primary borrower CTA remains unchanged.

## 15. Out of scope

- live upload/OCR;
- C3 verification in this route;
- automatic complaint drafting;
- DCF/SFC filing;
- automatic refund/damage calculation;
- deadlines;
- live contracting/payment;
- court lookup;
- auth/persistence.
