# QUOTE NORMALIZATION UX SPEC v0.18

Date: 2026-08-27
Surface: `/comprar/comparar-cotizaciones`
Domain: `domain/quote-normalization/evaluator.ts`
Precedence: legal/financial truth → provenance → Product UX → accessibility/trust → CRO → visual polish.

## User job

A prospective buyer already has one or more financing quotations and needs to answer a more basic question before comparing headline rates or monthly payments:

> **¿Estas cotizaciones contienen suficiente información y están sobre bases comparables?**

v0.18 does not answer which quote is cheaper or better. It prepares declared quote data so a later economic model can do that without mixing incompatible bases.

## Entry points

Primary route:

`/comprar/comparar-cotizaciones`

Natural upstream context:

`/comprar/financiacion`

A user who already has quotations may enter the normalizer directly without completing the structure-preference explorer first.

## Anonymous-first boundary

The first substantive result must not require:

- name;
- email;
- phone;
- ID number;
- account;
- bureau authorization;
- employer;
- bank-account data;
- document upload.

v0.18 is manual entry only. It does not claim document verification or persistence.

## Precision

All manually entered quotation data remains **C1 / user-declared / unverified**.

The UI must keep separate:

1. fields typed by the user;
2. values derived mechanically from those fields, such as financing percentage;
3. missing material fields;
4. consistency warnings;
5. pairwise basis differences;
6. future modeling requirements.

No field entered manually becomes C3.

## Primary journey

### Step 1 — Explain the task

Hero:

**Pon tu cotización sobre una base comparable**

Support:

**No basta con mirar la tasa o la cuota. Primero identifica estructura, plazo, seguros, costos de cierre, efectivo requerido y condiciones que cambian el significado económico de la oferta.**

Trust line:

**La información se evalúa como declarada por ti. En esta versión no subes documentos, no consultamos centrales y no guardamos tu cotización.**

Primary CTA is the form itself; avoid a redundant splash step.

### Step 2 — Capture quote A progressively

The form is divided into four visible sections rather than one undifferentiated application form.

#### A. Identificación y vigencia

- entidad/proveedor;
- fecha de cotización;
- vigencia hasta (optional).

#### B. Base de financiación

- crédito hipotecario / leasing habitacional;
- pesos / UVR;
- valor del inmueble;
- monto financiado;
- porcentaje financiado quoted (optional consistency check);
- plazo in months;
- initial payment/canon.

#### C. Tasa y comportamiento

- quoted rate value;
- rate convention;
- amortization/payment behavior;
- UVR/index reference when denomination = UVR.

#### D. Costs and conditions

- insurance treatment;
- monthly insurance when not fully included;
- one-time costs treatment;
- one-time costs total when applicable;
- total cash required at closing;
- prepayment information;
- rule text when rules are supplied;
- leasing purchase-option economics and timing when applicable.

Conditional fields only appear when the selected structure makes them material.

### Step 3 — First value: quote readiness

CTA:

**Revisar esta cotización**

Possible states:

#### `incomplete`

Headline:

**Todavía faltan datos estructurales**

Meaning: the quotation cannot yet be described reliably enough even at structure level.

#### `structurally_ready`

Headline:

**Ya entendemos la estructura; aún faltan datos materiales**

Meaning: structure-level review is possible, but the quote is not ready to feed a future economic model.

#### `comparison_input_ready`

Headline:

**La cotización ya tiene una base material suficiente**

Meaning: required declared inputs are present for a later economic model. This is not a winner, approval, verification or recommendation.

The result must display:

- PrecisionBadge C1;
- readiness state;
- derived financing percentage when available, labeled as derived from declared values;
- missing structural fields;
- missing comparison fields;
- warnings;
- explicit truth boundary.

Do not display a percentage-complete score.

### Step 4 — Add quote B

After quote A has a substantive result, show:

**Añadir otra cotización**

Quote A remains summarized in-page while the user enters quote B.

Do not force account creation or persistence before adding quote B.

### Step 5 — Pair normalization result

When both quotations have been submitted, run `normalizeFinancingQuotePair`.

Headline:

**Ahora sabemos qué no es directamente comparable**

Show:

1. readiness of quote A;
2. readiness of quote B;
3. basis differences;
4. modeling requirements.

Examples of basis differences:

- structure;
- denomination;
- financed amount/equity;
- term;
- rate convention;
- insurance treatment;
- cash required;
- leasing purchase option;
- quote dates/validity.

Examples of future modeling requirements:

- normalize rate conventions;
- normalize financed amount/equity;
- normalize terms or compare common horizons;
- normalize insurance treatment;
- model UVR path or use verified schedule;
- include leasing purchase-option economics.

## What v0.18 must never show

- `Mejor opción`;
- `Más barata`;
- `Te ahorrarías`;
- total cost projection;
- lender recommendation;
- approval probability;
- percentage bank match;
- preapproval/approval;
- verified-document badge;
- current market rate unless a later sourced layer exists.

## Error and recovery

- Missing data is primarily a readiness state, not a form error.
- Invalid numeric/date data should block normalization and show a plain-language error near the form action.
- The user can edit quote A or B without losing the other quote in current browser memory.
- If a conditional field becomes irrelevant after changing structure/treatment, do not send it to the evaluator.
- No automatic expiry inference from the system clock in v0.18.

## Sensitive-data boundary

No personal identity is required. Provider name and quotation economics are financial context but not sufficient reason to request personal identity.

Manual data lives in component state only for this surface. The UI must not claim that it was saved.

## Conversion point

There is no paid conversion in v0.18.

The product conversion is progression to a future trustworthy economic comparison layer after the pair is normalized. Until that layer exists, the CTA should be educational/actionable rather than fake-commercial.

## Accessibility

- every input has an explicit label;
- fieldsets/legends for grouped radio choices;
- conditional controls remain keyboard reachable;
- result heading receives focus after submission;
- errors use a specific `role=alert` element without relying on global alert-role locators in tests;
- mobile 390 px must have no horizontal overflow;
- buttons remain at least touch-target sized through existing global button primitives.

## E2E acceptance scenarios

1. A minimally incomplete quote returns `incomplete` and missing structural fields without throwing.
2. A complete peso mortgage quote becomes materially ready but never produces winner/savings language.
3. A UVR quote requests reference/index basis.
4. A leasing quote requests purchase-option economics/timing.
5. Two materially ready quotations expose basis differences and future modeling requirements without ranking them.
6. Quote A remains available while editing/adding quote B.
7. Desktop and mobile 390 px have no horizontal overflow.
8. No upload input, account gate, lender application or identity capture appears.

## Warm Path

`cotización real en manos del usuario → entrada manual → diagnóstico de completitud → corrección de faltantes → segunda cotización → diferencias de base → requisitos para futura comparación económica`

This is the correct bridge between v0.17 structure orientation and a later cost-comparison engine.