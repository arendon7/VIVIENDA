# FINANCING STRUCTURES UX SPEC v0.17

Date: 2026-08-26
Status: product UX contract
Scope: Journey 2 — prospective buyer / Step 7

## 1. User job

After understanding purchase capacity and home readiness, the user needs to answer:

> Which financing structures are worth exploring first for the way I want to own the property and manage the obligation?

The product must help the user narrow the search space **without pretending to know bank eligibility, market pricing, approval probability or which lender is best**.

## 2. Product role

v0.17 is an **explorer of financing structures**, not a lender marketplace.

It separates two independent axes:

1. contractual structure:
   - mortgage credit;
   - housing leasing;
2. denomination / payment-behavior axis:
   - pesos;
   - UVR.

The UI must never collapse these into fake combined products such as “mortgage in pesos = option 1” and “leasing UVR = option 2” before a real quote exists.

## 3. Entry points

Primary contextual entry:

- after Home Readiness result: **Explorar cómo financiar**.

Secondary direct entry:

- `/comprar/financiacion`.

Future entry:

- from a saved `Mi Vivienda` buyer plan.

The direct route works without prior calculator data.

## 4. Minimum information required

Only two preference questions are required for a useful C1 orientation:

### Q1 — ownership timing

**¿Qué es más importante para ti respecto a la propiedad?**

Options:

- `Quiero adquirir la propiedad desde la compra.`
- `Estoy abierto a que la opción de adquisición sea posterior si las condiciones me sirven.`
- `No tengo una preferencia fuerte; quiero comparar ambas estructuras.`
- `Todavía no lo sé.`

This is not a legal advice question. It captures the user's declared preference.

### Q2 — payment behavior

**¿Cómo prefieres que se comporte la obligación?**

Options:

- `Priorizo previsibilidad nominal en pesos.`
- `Estoy dispuesto a comparar una obligación ligada a UVR/IPC.`
- `Quiero comparar pesos y UVR antes de decidir.`
- `Todavía no lo sé.`

No rate, term, income, ID, phone, email or bureau data is required.

## 5. First value

The first result appears immediately after the two questions.

Result order:

1. plain-language orientation summary;
2. contractual-structure options;
3. denomination options;
4. contextual affordability notice when available;
5. facts to verify in a real quote;
6. quote checklist.

No registration gate precedes this value.

## 6. Priority vocabulary

Internal priorities map to user-facing labels:

- `explore_first` → **Explorar primero**
- `compare` → **Mantener para comparar**
- `secondary` → **Comparar después**
- `needs_information` → **Falta definir preferencia**

Do not use:

- “mejor opción”;
- “recomendado por el banco”;
- “más conveniente” without a real comparable quote;
- percentages of compatibility;
- traffic-light approval metaphors.

## 7. Result architecture

### 7.1 Orientation hero

Eyebrow:

**Estructuras para explorar**

Heading:

**Tu siguiente comparación ya puede ser más precisa**

Supporting copy:

**Separamos la forma contractual de la financiación y el comportamiento de la obligación para que sepas qué preguntar y qué cotizaciones vale la pena traer a una comparación real.**

Trust boundary:

**Esto orienta tu búsqueda. No es elegibilidad, preaprobación, aprobación, ranking de entidades ni una cotización de mercado.**

### 7.2 Contractual structure section

Heading:

**Primero: ¿qué estructura contractual quieres comparar?**

Each card contains:

- title;
- priority label;
- reference fact;
- why the user preference routes it that way;
- `Qué debes verificar` list.

Cards:

- Crédito hipotecario.
- Leasing habitacional.

The card with `explore_first` may have stronger visual emphasis, but not success/approval styling.

### 7.3 Denomination section

Heading:

**Segundo: ¿cómo quieres evaluar el comportamiento de la obligación?**

Cards:

- Pesos.
- UVR.

The interface must explicitly explain that the exact payment path depends on the specific amortization/product terms.

### 7.4 Context notice

If Buyer Affordability/Home Readiness provides a binding constraint:

- payment constraint → remind user to compare real payment/canon, insurance and recurring costs;
- down-payment constraint → ask every provider for actual financed percentage and total cash required;
- both → show both notices.

The notice is contextual guidance, not a lender-rule inference.

### 7.5 Quote checklist

Heading:

**Cuando tengas una cotización, compárala con estos datos**

The full domain checklist is available in a `<details>` disclosure so the screen remains scannable on mobile.

CTA:

**Tengo una cotización para comparar**

In v0.17 this CTA is intentionally disabled as a future capability or links to an explanatory placeholder only if such a route already exists. It must not imply live lender ingestion.

Preferred v0.17 treatment: show the checklist and copy:

**Guárdala completa. La comparación de cotizaciones reales será una capa separada para no mezclar preferencias con precios o condiciones comerciales.**

No fake upload control.

## 8. State model

### State A — initial

- two unanswered questions;
- C0 explanation;
- primary CTA disabled until both questions have a selected value, including `unknown` as a deliberate answer.

### State B — result C1

Triggered once both questions have explicit answers.

- results rendered;
- focus moves to result heading;
- edit controls remain available;
- no account request.

### State C — incomplete knowledge

If one or both selected answers are `unknown`:

- evaluator may still return C0 or C1 according to contract;
- affected axis shows `Falta definir preferencia`;
- no artificial winner is manufactured.

## 9. Interaction design

Use radio-card controls already present in VIVIENDA.

Rules:

- native radio inputs remain keyboard-operable;
- visible focus state;
- labels are full-row click targets;
- no sliders for qualitative preferences;
- no auto-submit on radio selection;
- one primary action: **Ver qué estructuras explorar**.

After result:

- **Cambiar mis preferencias** returns to form with selections preserved.
- contextual Home Readiness embedding may also expose **Volver a mi preparación**.

## 10. Mobile behavior

At 390 px:

- one-column radio cards;
- one-column result cards;
- priority chip wraps without truncation;
- `Qué debes verificar` remains readable without horizontal scrolling;
- checklist uses disclosure to avoid an excessively long initial viewport;
- primary/secondary actions become full width.

## 11. Trust and claims boundary

Every result surface must make visible that v0.17 is not:

- eligibility;
- approval;
- approval probability;
- bank matching;
- lender ranking;
- market quote;
- cost ranking.

No bank names appear in the explorer.

No current rate is inserted.

No assumption that leasing finances a higher percentage.

No claim that pesos or UVR is universally cheaper/better.

## 12. Provenance UX

Reference facts are labeled conceptually as **Cómo funciona la estructura**.

Routing text is labeled conceptually as **Por qué la dejamos primero / para comparar**.

Do not mix the two into a single authoritative-sounding statement.

## 13. Sensitive-data boundary

v0.17 requires none of:

- name;
- email;
- phone;
- ID;
- employer;
- income documents;
- bank statements;
- bureau authorization;
- central-risk query;
- exact property address.

If embedded from Home Readiness, only the non-sensitive derived `bindingConstraint` may be passed in memory. Do not serialize household financial values into query params.

## 14. Analytics contract

Future analytics events:

- `financing_structures_viewed`
- `financing_structures_started`
- `ownership_preference_selected`
- `payment_behavior_selected`
- `financing_structures_result_viewed`
- `quote_checklist_opened`
- `financing_structures_preferences_edited`

Do not send raw financial amounts in analytics payloads.

## 15. Acceptance criteria

v0.17 is accepted when:

1. direct route works without prior profile data;
2. result requires no identity capture;
3. two axes remain visually and structurally separate;
4. unknown preferences never create a winner;
5. accepting leasing does not make leasing `explore_first` automatically;
6. accepting UVR variation does not make UVR `explore_first` automatically;
7. no bank/rate/approval claim appears;
8. quote checklist is available;
9. keyboard flow works;
10. desktop and 390 px Playwright flows pass;
11. Home Readiness can hand off without serializing financial amounts in the URL.
