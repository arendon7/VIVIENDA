# PAYMENT PRESSURE UX SPEC v0.14

Date: 2026-08-26
Status: UX contract
Route: `/ayuda`
Domain source: `PAYMENT-PRESSURE-CONTRACT-V0.14.md`

## 1. User promise

**Entiende qué tan urgente es y qué puedes hacer ahora.**

The route is for a borrower who feels payment pressure, is already behind, is receiving collection activity or reports a judicial process.

It is not a legal-services directory and must not use fear as conversion.

## 2. First-value rule

No identity/contact before first result.

Do not request:

- name;
- ID;
- phone;
- email;
- employer;
- court case number;
- documents.

The first result comes from declared state only and remains C0/orientation.

## 3. Progressive input

Use a short wizard with one decision per screen.

### Step 1 — Product

Question:

**¿Qué tipo de financiación tienes?**

Options:

- Crédito hipotecario de vivienda
- Leasing habitacional
- No estoy seguro

Do not expose `other_secured_credit` as a primary consumer option in v0.14. If needed later, add via “otro”.

### Step 2 — Payment / collection state

Question:

**¿Cuál describe mejor lo que está pasando hoy?**

Options map exactly to canonical `PaymentState`:

- `current` — Estoy al día
- `early_arrears` — Me atrasé recientemente
- `collections` — Ya me están contactando para cobrar
- `prelegal` — Me informaron que está en cobro prejurídico / prelegal
- `executive` — Recibí un documento de juzgado o sé que hay un proceso judicial
- `embargo_or_auction` — Ya conozco un embargo, secuestro, remate u otra actuación avanzada
- `unknown` — No sé en qué etapa estoy

Guardrail: do not label a collection call as a lawsuit.

### Step 3 — Economic change

Question:

**¿Cambió de forma importante tu capacidad de pago?**

Options:

- Sí
- No
- No estoy seguro

Hint:

“Por ejemplo: pérdida o reducción de ingresos, cambio relevante del hogar o una nueva carga económica. No necesitamos documentos todavía.”

### Step 4 — Next payment outlook

Question:

**Pensando en la próxima cuota, ¿cómo estás?**

Options:

- Puedo pagarla
- Está en riesgo
- No puedo pagarla completa
- No estoy seguro

This does not replace the declared arrears state; it adds forward-looking pressure context.

### Step 5 — Separate inconsistency signal

Question:

**Además de la dificultad de pago, ¿hay algo que no te cuadra?**

Options:

- No / solo quiero resolver la presión de pago
- Hay un cobro o aplicación de pago que no entiendo
- Un extracto o condición parece no coincidir con lo pactado

Map only explicit positive answers into R7 inputs.

Do not infer an inconsistency from high payment, UVR or arrears alone.

## 4. Result hierarchy

Result must appear in this order:

1. urgency label;
2. title + plain-language explanation;
3. “Lo que sabemos” declared facts;
4. primary next action;
5. evidence checklist;
6. relevant route candidates from Opportunity Router;
7. collection-contact information when applicable;
8. professional boundary / contextual CTA only when supported.

## 5. Urgency presentation

Do not use a numerical risk score.

Labels:

- `preventive` → **Prevención**
- `prompt_action` → **Actuar pronto**
- `professional_review` → **Revisar una diferencia**
- `procedural_urgency` → **Revisión prioritaria**
- `needs_information` → **Falta ubicar la etapa**

Color may reinforce but text is mandatory.

Never use:

- “RIESGO CRÍTICO”;
- countdown;
- blinking alerts;
- “última oportunidad”;
- eviction imagery.

## 6. Result-specific actions

### Preventive

Primary action is self-service:

**Preparar conversación con mi entidad**

Show a short inline checklist:

- current payment capacity;
- what changed;
- what the user can sustain;
- questions to ask;
- preserve written response/radicado.

No attorney CTA.

### Prompt action

Primary action remains lender/evidence oriented:

**Ordenar mi situación y contactar la entidad**

Show collections evidence checklist when applicable.

No attorney CTA merely because collections exists.

### Professional review (R7)

Primary visible CTA may point contextually to:

`/auditoria-hipotecaria`

Copy:

**Revisar la diferencia**

The R7 assisted preview remains subject to its own evidence/service boundaries.

### Procedural urgency (R10)

Primary CTA:

**Revisar el documento que recibí** → `/verificar`

Secondary copy:

“Después de verificar el documento, una revisión profesional puede definir la estrategia. Este triage no calcula términos ni defensas.”

Do **not** link R10 to the R7 Mortgage Audit page.

### Needs information

Primary action:

**Buscar mi último extracto o comunicación**

No lawyer CTA.

## 7. Opportunity route display

Only display routes returned by the payment-pressure domain layer.

For each route show:

- route title;
- status in plain language;
- why it appeared;
- what evidence is missing;
- caveat.

Do not expose internal priority score.

Status language:

- `eligible_now` → “Se puede preparar ahora”
- `candidate` → “Vale la pena evaluar”
- `seasonal_wait` → “Preparar para su ventana”
- `legal_review` → “Requiere revisión profesional”
- `not_recommended` → “No es la ruta prioritaria”

R10 visually precedes all other routes.

## 8. Collections information module

Only when state = collections/prelegal.

Title:

**Cobranza no es lo mismo que proceso judicial**

Explain briefly:

- collection can be prejudicial before a lawsuit;
- channels/timing/frequency have consumer-contact rules;
- VIVIENDA does not conclude a violation from the declaration alone.

If the user wants to challenge a specific charge/contact practice, route later to inconsistency/consumer-protection analysis, not automatic litigation.

## 9. Product-specific guardrails

### Mortgage

Article 20 may appear only from existing router logic.

### Leasing

Display:

“Leasing habitacional requiere reglas propias. No aplicamos automáticamente procedimientos del crédito hipotecario.”

### Unknown

Recommend classification from statement/contract first.

## 10. Mobile

At 390 px:

- single-column wizard;
- CTA full width;
- urgency/title before evidence;
- no horizontal tables;
- route cards stack;
- long legal labels wrap;
- no sticky conversion CTA covering content.

## 11. Accessibility

- semantic fieldsets/radio choices;
- progress uses `aria-valuenow`;
- result heading receives programmatic focus;
- urgency conveyed by text;
- errors in `role=alert`;
- skip link remains first keyboard focus;
- all interactive targets >= 44 px.

## 12. E2E scenarios

Must cover desktop + mobile:

1. current + at risk + economic change → preventive, no attorney CTA;
2. early arrears → prompt action;
3. collections → prompt action + “not judicial” module;
4. prelegal → prompt action, not judicial urgency;
5. executive → priority review + `/verificar` CTA;
6. embargo/auction → priority review;
7. unknown state → classify first;
8. current + explicit inconsistency → R7 + contextual Mortgage Audit CTA;
9. executive + inconsistency → R10 remains primary; no Mortgage Audit CTA as primary;
10. leasing + economic change → no mortgage Article 20 card;
11. no horizontal overflow at 390 px;
12. no identity/contact field before first result;
13. no countdown / guaranteed restructuring / automated deadline copy.

## 13. Analytics events (future instrumentation contract)

Names only; no live analytics required in v0.14:

- `payment_pressure_started`
- `payment_state_selected`
- `payment_pressure_result_viewed`
- `payment_pressure_evidence_clicked`
- `payment_pressure_r7_clicked`
- `payment_pressure_document_review_clicked`

Do not fire these until an analytics implementation contract exists.