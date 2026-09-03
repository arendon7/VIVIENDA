# VIVIENDA — Borrower Quick Check UX Spec V0.1

Date: 2026-08-25
Status: Low-fi interaction contract. Visual design not frozen.

## Product question

Can we give an existing Colombian housing-loan borrower enough useful, credible insight in under a few minutes that they choose to continue voluntarily — without first collecting identity, phone or a bank statement?

## Primary user intent

> “Quiero saber si estoy pagando mi crédito de vivienda de la mejor manera.”

Secondary intents that can enter the same flow:

- “Quiero terminar de pagar antes.”
- “Quiero saber si me conviene cambiar de banco.”
- “Vi algo sobre Ley 546.”
- “Mi cuota está alta.”

The flow should translate these intents into the right next analysis instead of forcing the user to pick a legal product.

## Success definition

The user reaches first meaningful value and can correctly explain:

- what the tool knows;
- what it is estimating;
- at least one relevant action;
- what additional data would improve precision;
- that no bank approval/legal guarantee has been produced.

## Entry surface

### Working headline

**Revisa si estás pagando tu vivienda de la mejor manera.**

### Supporting line

**Con unos pocos datos te mostramos cómo está tu crédito y qué vale la pena revisar. Sin pedirte cédula ni extracto para empezar.**

This is working UX copy, not final marketing copy.

### Primary CTA

**Revisar mi crédito**

### Secondary contextual routes

- Quiero comprar vivienda
- Tengo problemas para pagar

Avoid a generic “Hablar con asesor” as the hero's dominant CTA.

## Flow structure

Use one-question/one-decision rhythm on mobile; desktop may group tightly related values if comprehension remains high.

### Step 0 — Product type confidence

Question:

**¿Qué tienes hoy?**

Options:

- Crédito hipotecario de vivienda
- Leasing habitacional
- No estoy seguro
- Otro crédito con hipoteca

Why first:

It prevents treating every mortgage-backed obligation as the same legal/financial product.

If user selects “No estoy seguro,” continue with educational helper; do not block.

If “Otro crédito con hipoteca,” explain that some housing-specific rules may not apply and keep the financial snapshot route where appropriate.

### Step 1 — Currency/modalidad

**¿Tu crédito está en pesos o UVR?**

Options:

- Pesos
- UVR
- No sé

Helper:

> “Si no sabes, no pasa nada. Luego podemos identificarlo en tu extracto.”

Do not turn unknown into an error.

### Step 2 — Current balance

**¿Cuánto debes aproximadamente hoy?**

Currency input.

Helper:

> “Usa el saldo de capital si lo tienes. Si no, escribe el saldo aproximado.”

Input rules:

- numeric keyboard mobile;
- COP grouping formatting;
- allow edit without cursor fighting;
- no decimals by default;
- realistic min/max validation with non-judgmental error.

### Step 3 — Current monthly payment

**¿Cuánto pagas al mes en total?**

Helper:

> “Incluye lo que normalmente sale por tu crédito. Luego separaremos seguros si hace falta.”

Reason:

Most users know total debit better than debt-service-only payment.

Domain contract remembers this is not automatically principal+interest.

### Step 4 — Remaining term

**¿Cuánto te falta aproximadamente?**

Input modes:

- years + months;
- or “No sé”.

If user doesn't know:

- allow a weaker snapshot;
- ask optional original term/date only if it meaningfully helps;
- otherwise route to statement for precision after first value.

### Step 5 — Rate (optional)

**¿Sabes tu tasa?**

Options:

- Sí → enter rate + type helper
- No → continue

Do not force because many users do not know whether they are seeing EA, monthly or UVR + spread.

If rate is entered, ask format explicitly:

- E.A. en pesos
- UVR + X%
- No estoy seguro de qué tipo es

Do not infer rate type silently.

## First result screen

The first result should not pretend we have a full Loan Health score when inputs are approximate.

### Header

**Tu crédito, en contexto**

Subline example:

> “Esto es una estimación inicial con los datos que ingresaste.”

Confidence component:

- Orientación inicial
- Estimación
- Simulación modelada
- Verificado con extracto

At this stage likely C0/C1.

### Block A — Current snapshot

Show only meaningful fields:

- saldo aproximado;
- pago mensual;
- plazo restante;
- modalidad;
- rate if known.

Each field can reveal provenance (“dato que ingresaste”).

### Block B — What we can already say

Rules-based insight examples:

#### If enough fixed-peso data for simple scenario

> “Podemos estimar el efecto de hacer abonos adicionales.”

#### If rate missing

> “Podemos mostrarte escenarios de abono, pero para calcular intereses con precisión necesitamos confirmar tu tasa.”

#### If UVR

> “En UVR, el valor en pesos cambia con la inflación. Para proyectar el costo necesitamos conocer tu tasa sobre UVR y usar supuestos de inflación.”

#### If product uncertain

> “Antes de darte una conclusión jurídica necesitamos identificar qué tipo de crédito tienes.”

No fabricated score to fill space.

### Block C — One prioritized action

Use product logic to select one primary next action.

Candidates:

- Simular un abono
- Confirmar condiciones con extracto
- Comparar compra de cartera
- Revisar capacidad de pago
- Identificar el tipo de crédito

Do not show six equal opportunity cards before data supports them.

### Block D — Improve precision

Prompt:

**¿Quieres que dejemos de aproximar?**

Explanation:

> “Con tu último extracto podemos confirmar saldo, tasa, seguros y modalidad y hacer una simulación más precisa.”

CTA:

**Analizar mi extracto**

Secondary:

**Seguir sin subir documentos**

This is a key trust test.

## Prepayment micro-flow

If user chooses “Simular un abono”:

### Input

Question:

**¿Cómo quieres explorar el abono?**

Options:

- Pagar un valor extra cada mes
- Hacer un abono único

### Recurring

Slider or direct numeric input, but direct input must remain available.

Suggested quick presets are acceptable if they do not anchor irresponsibly:

- COP 100k
- COP 250k
- COP 500k

Better personalized presets can later use percentage of current payment.

### Lump sum

Direct COP amount.

### Result

Always show baseline and scenario.

Example structure:

**Si mantienes tu crédito**

- pago actual;
- plazo estimado;
- intereses proyectados if confidence supports it.

**Si agregas COP 250.000/mes**

- nuevo desembolso mensual;
- payoff approximately X months earlier;
- nominal projected interest difference;
- extra principal user contributes.

### Signature Benefit Breakdown

Title:

**¿De dónde sale este resultado?**

Rows:

- Capital adicional que tú aportarías
- Intereses futuros que el modelo estima que dejarían de causarse
- Otros costos evitados (only if modelled)
- Costos de ejecutar la estrategia (if any)

Plain-language explanation:

> “El beneficio aparece porque reduces el capital antes. No es una condonación del banco.”

This statement is foundational for current market differentiation.

## “What can I do now?” section

### DIY path

**Hacerlo directamente con mi entidad**

When bank procedure is verified:

- channel;
- what to ask;
- request term vs payment explicitly;
- what confirmation/evidence to keep;
- last verified date.

### Precision path

**Analizar mi extracto**

### Alternative path

**Comparar si cambiar de entidad sería mejor**

Only offer if enough information or context justifies it.

## Account creation timing

Do not require account to see first result.

Trigger account request when user wants to:

- save scenario;
- upload statement;
- continue later;
- monitor loan;
- start assisted execution.

Working pattern:

> “Guarda este escenario y compáralo después.”

Account options should minimize friction; exact authentication architecture is separate.

## Statement upload flow

### Before upload

Explain:

**Qué usamos del extracto**

- saldo;
- tasa;
- plazo/modalidad;
- seguros/costos where visible.

**Por qué**

> “Para reemplazar aproximaciones por datos de tu crédito.”

**Control**

- user can review/correct extraction;
- no bank password requested;
- privacy/retention details accessible.

### Upload states

1. idle
2. uploading
3. processing
4. partial extraction
5. needs correction
6. verified by user
7. failure/retry

Do not show a generic spinner for long processing without status.

### Extraction review

Present extracted fields as an editable confirmation list.

For each:

- value;
- confidence if relevant;
- source page/label where feasible;
- edit action.

If a field changes, recalculate after confirmation rather than moving result unpredictably while user edits.

## Mortgage Twin transition

After confirmed data:

Title:

**Ahora sí conocemos mejor tu crédito.**

Show:

- verified snapshot;
- information date;
- model confidence;
- top one or two opportunities;
- what remains unknown.

Avoid fake completion such as “100% analyzed” if we lack contract/amortization detail.

## Error and recovery states

### User doesn't know data

Never dead-end. Offer:

- “No sé”;
- where to find it;
- upload later.

### Values conflict

Example:

> “Con esta tasa, saldo y plazo, el pago que calculamos no coincide con el que indicaste. Puede ser porque tu pago incluye seguros o porque tu crédito usa otro sistema de amortización.”

CTA:

- Revisar datos
- Subir extracto

Do not silently change values.

### UVR uncertainty

Explain instead of forcing peso-like result.

### Loan in arrears

If user identifies mora during later refinement, prepayment tool should not assume all additional funds go directly to principal. Route to status review.

## Accessibility contract

- labels visible, not placeholder-only;
- input error associated programmatically;
- currency formatting accessible;
- radio options keyboard-operable;
- results announced appropriately after calculation without hijacking focus;
- charts have numeric/text equivalents;
- color never carries scenario meaning alone;
- touch targets adequate;
- reduced motion supported.

## Mobile contract

### Input

One core question per screen or well-spaced grouped pair.

Persistent progress can show semantic stage, not intimidating “1/17”.

Example:

**Sobre tu crédito → Tu resultado → Mejorar precisión**

### Result

Order:

1. headline conclusion;
2. primary scenario/action;
3. key numbers;
4. explanation;
5. assumptions/source;
6. next actions.

Do not begin mobile result with a dense four-column metric grid.

## Desktop contract

Potential layout:

- left: input/scenario controls;
- right: sticky result/comparison;
- deeper explanation below.

Do not make desktop user page through one field at a time if a compact structured form is clearer.

Responsive experience can differ structurally while sharing domain state.

## Analytics

Events:

- borrower_quick_check_started
- product_type_selected
- modality_selected
- quick_input_completed
- first_value_seen
- prepayment_scenario_started
- prepayment_scenario_completed
- benefit_breakdown_opened
- diy_path_opened
- precise_analysis_clicked
- upload_started
- upload_completed
- extraction_review_started/completed
- mortgage_twin_created
- account_prompt_seen/completed

Never put raw balance/rate/income values in generic event payloads by default.

## A/B or usability questions

Do not A/B test misleading promises. Test legitimate presentation choices.

Candidates:

### Entry promise

- “Revisa si estás pagando tu vivienda de la mejor manera.”
- “Descubre qué podrías mejorar en tu crédito de vivienda.”

### Upload CTA after result

- precision framing vs save/monitor framing.

### Benefit breakdown prominence

- directly visible vs expanded by default.

### DIY + assisted layout

Test whether equal presentation improves trust without destroying assisted conversion.

## Acceptance criteria for low-fi test

At least 80% directional target (small sample, not statistical claim) should be able to:

- complete quick check without facilitator help;
- explain that first result is approximate when it is;
- identify what additional data improves accuracy;
- explain why prepayment reduces future interest;
- understand DIY path;
- identify that no bank approval has occurred.

If a participant says “ustedes lograron que el banco me perdone esos intereses” after the prepayment result, redesign before visual polish.

## Visual design handoff

Do not start final visual design until low-fi resolves:

- field sequence;
- result hierarchy;
- confidence wording;
- Benefit Breakdown comprehension;
- upload timing;
- DIY/assisted presentation.

The final visual direction should amplify these behaviors, not redefine them.