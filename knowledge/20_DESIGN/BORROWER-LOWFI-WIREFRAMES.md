# VIVIENDA — Borrower Low‑Fi Wireframes V0.1

Status: low-fi interaction contract
Surface mode: Operate with a Persuade entry
Primary journey: existing borrower asks whether the current housing credit is being paid in the best available way

## Design rule

Low-fi deliberately excludes final palette, font family, illustration style, decorative motion and brand treatment. It defines hierarchy, information order, action priority, states and trust disclosures.

The first useful result must be reachable without identity number, phone, email or document upload.

---

# Flow overview

Home / campaign
→ Borrower entry
→ 5 core questions
→ optional precision question
→ Quick Check result
→ Prepayment scenario
→ Benefit Breakdown
→ DIY / improve precision / compare alternatives
→ optional account + extract
→ extracted-data review
→ Mortgage Twin
→ opportunity routes

Desktop keeps context visible beside the active question. Mobile uses one primary question per viewport.

---

# Screen B0 — Entry: “Ya tengo crédito”

## Job
Make the user feel they can obtain value before surrendering personal data.

## Primary hierarchy
1. Outcome promise.
2. Short explanation of what will be analyzed.
3. Single primary CTA.
4. Trust strip.
5. Secondary “qué necesitarás después” disclosure.

## Low-fi structure

Top navigation

Hero copy block
- eyebrow: Crédito de vivienda
- H1 concept: “Mira tu crédito con otros ojos.”
- body: “En pocos pasos te mostramos qué sabemos, qué podemos estimar y qué vale la pena revisar.”
- primary CTA: “Revisar mi crédito”
- secondary text link: “Qué podemos analizar”

Trust strip
- “Sin cédula para empezar”
- “Sin afectar tu historial crediticio”
- “Tus resultados distinguen estimaciones de datos verificados”

Below fold
- examples of decisions: abonar, bajar plazo, comparar cartera, revisar condiciones, reestructurar when applicable
- explicit note: “Si algo puedes hacerlo gratis directamente con tu entidad, te lo diremos.”

## Do not
- use “ahorra millones” as the primary claim;
- show fabricated average savings;
- present Ley 546 as universal route;
- ask contact data before CTA.

---

# Screen B1 — Tipo de obligación

Question:
“¿Qué tienes hoy?”

Choices as large selectable rows:
- Crédito hipotecario
- Leasing habitacional
- No estoy seguro

Secondary helper:
“Si no sabes cuál tienes, puedes seguir. Lo confirmaremos después.”

Navigation:
- Back
- Continue disabled until selection

Progress:
“1 de 5” or low-pressure progress bar. Avoid fake percentage precision.

Analytics:
- borrower_check_started
- obligation_type_selected

---

# Screen B2 — Modalidad monetaria

Question:
“¿Tu crédito está en pesos o UVR?”

Choices:
- Pesos
- UVR
- No sé

Contextual explainer link:
“¿Dónde lo encuentro?”

If “No sé”:
- no modal lecture;
- accept and continue;
- precision state is reduced later.

Trust behavior:
No punishment language such as “dato requerido para continuar”.

---

# Screen B3 — Saldo aproximado

Question:
“¿Cuánto debes aproximadamente?”

Input:
COP currency input with formatting separated from raw numeric state.

Helper:
“Una cifra aproximada está bien para este primer análisis.”

Optional examples:
$80.000.000 / $180.000.000 / $350.000.000

Validation:
- positive value;
- reasonable upper bound warning, not arbitrary rejection;
- retain typed value on navigation.

Privacy cue:
“No necesitamos saber quién eres para calcular esta primera versión.”

---

# Screen B4 — Cuota mensual

Question:
“¿Cuánto pagas al mes?”

Input:
COP monthly payment.

Follow-up micro-question:
“¿Ese valor incluye seguros?”
- Sí
- No
- No sé

Why this matters disclosure:
“Los seguros pueden hacer que la cuota no coincida exactamente con la amortización del crédito.”

Do not force the user to know the insurance split.

---

# Screen B5 — Tiempo restante

Question:
“¿Cuánto tiempo te falta por pagar?”

Preferred control:
- years + months inputs or a simple segmented selector;
- never a precision-hostile slider as the only input.

Examples:
8 años
14 años 6 meses
22 años

Helper:
“Si solo recuerdas los años, también sirve para empezar.”

After submission the system has the minimum C1 snapshot.

---

# Screen B6 — Optional precision booster

Purpose:
Offer additional precision without blocking first value.

Question:
“¿Conoces la tasa de tu crédito?”

Actions:
- Sí, agregarla
- No / verla después

If yes:
- capture rate value;
- capture quote type when known: EA / nominal / UVR + rate;
- never silently assume rate convention.

If no:
- continue to C1 result.

Secondary:
“También podemos confirmarla más adelante con tu extracto.”

---

# Screen R1 — Quick Check Result

This is the first signature surface.

## Goal
Deliver real personalized value without pretending the model knows more than it does.

## Above the fold hierarchy

1. Result status.
2. Precision badge.
3. User snapshot.
4. Primary next action.
5. Explainability / missing-data cue.

### Result status examples

If C1:
“Ya podemos ubicar tu crédito. Falta confirmar algunos datos para hablar de ahorro con precisión.”

If C2:
“Con estos datos ya podemos modelar escenarios de pago.”

Never:
“Encontramos $47 millones de ahorro” unless the model has sufficient data and assumptions are exposed.

## Snapshot card

- Saldo informado
- Cuota informada
- Plazo restante
- Modalidad
- Tasa when known
- source chip: “Tú nos lo dijiste”

## Precision block

Header:
“Qué sabemos y qué falta”

Three rows:
- Confirmado por ti
- Estimado / inferido
- Falta verificar

Example missing data:
- tasa
- sistema de amortización
- seguro
- fecha de corte

Primary CTA:
“Simular un abono”

Secondary CTA:
“Mejorar precisión con mi extracto”

Tertiary:
“Solo quiero entender mis opciones”

---

# Screen S1 — Prepayment input

Question:
“¿Qué te gustaría probar?”

Modes:
- Abono único
- Aporte mensual adicional

Input:
COP amount.

Choice:
“What would you prefer to optimize?”
- Terminar antes
- Bajar cuota
- Comparar ambos

If data precision is C1:
Banner:
“Te mostraremos un rango, no una cifra exacta, porque todavía no conocemos todos los datos de amortización.”

If C2/C3:
“Simulación modelada con los datos disponibles.”

CTA:
“Ver escenario”

No contact data requested.

---

# Screen S2 — Scenario Result / Path

Signature component: Scenario Path.

## Hierarchy

Headline:
“Así podría cambiar tu crédito”

Primary metric depending on selected goal:
- “Hasta X meses antes” OR
- “Cuota modelada aproximada”

Secondary metrics:
- current payoff horizon
- modeled payoff horizon
- interest remaining baseline
- interest remaining scenario

Visual:
One horizontal path on desktop; stacked path on mobile.

Baseline path:
Hoy ───────────── Fecha actual de terminación

Scenario path:
Hoy ─────── Nueva fecha modelada

Do not use green solely to indicate “good”; pair color with labels and geometry.

CTA:
“Ver de dónde sale el beneficio”

---

# Screen S3 — Benefit Breakdown

This is a signature trust surface, not merely a tooltip.

Header:
“De dónde sale el efecto económico”

Rows:
1. Capital adicional que tú aportarías
2. Intereses futuros modelados sin el cambio
3. Intereses futuros modelados con el cambio
4. Intereses que dejarían de causarse
5. Otros costos evitados, only if modeled
6. Costos de implementación, if applicable
7. Beneficio neto modelado

Mandatory explanatory copy:
“Tu aporte adicional no es ahorro: es capital que decides pagar antes. El beneficio modelado proviene principalmente de los intereses y otros costos que dejarían de causarse.”

Expandable:
- assumptions
- precision level
- calculation date
- methodology

Primary next action:
“Ver qué puedo hacer ahora”

---

# Screen A1 — Action Choice: DIY / Assisted / Compare

Header:
“¿Cómo quieres seguir?”

Three unequal cards/rows but without dark-pattern hierarchy.

## Option 1 — Hacerlo yo

Label:
“Directamente con mi entidad”

Description:
“Te mostramos qué pedir, qué revisar y qué guardar como soporte.”

Cost badge when applicable:
“Puede hacerse sin pagar a VIVIENDA.”

CTA:
“Ver pasos”

## Option 2 — Confirmar con precisión

Description:
“Sube tu extracto para confirmar tasa, sistema, seguros y fecha de corte.”

CTA:
“Analizar extracto”

## Option 3 — Comparar alternativas

Description:
“Revisa si renegociar o cambiar de entidad podría tener sentido.”

CTA:
“Comparar”

If a legal issue has been screened, legal route is shown separately and not blended into the normal financial CTA.

---

# Screen U1 — Explain document upload before asking for it

Header:
“Para mejorar la precisión necesitamos ver tu extracto.”

Three blocks:

What we use:
- saldo
- tasa
- modalidad
- plazo
- seguros/cargos
- fecha de corte

What we do not need:
- contraseña bancaria
- token
- access credentials

What happens next:
1. extract values
2. show them back to the user
3. user confirms/corrects
4. only then calculate verified scenarios

CTA:
“Seleccionar extracto”

Secondary:
“Seguir con estimaciones”

Privacy/details link visible before upload.

---

# Screen U2 — Extraction review

Header:
“Confirma lo que encontramos”

Each row shows:
- value
- source location / page when available
- confidence state
- edit action

Rows:
Saldo
Tasa
Modalidad
Sistema
Cuota
Seguros
Fecha de corte

States:
- high confidence
- needs review
- missing
- conflicting

Never auto-confirm a low-confidence field.

CTA:
“Estos datos están correctos”

Secondary:
“Corregir después” only if safe; otherwise field-specific resolution.

---

# Screen M1 — Mortgage Twin Snapshot

This is the first authenticated/home-state candidate.

Header:
“Tu crédito”

Core cards:
- saldo verified/modelled
- payment
- rate
- modality/system
- remaining term
- next relevant event

Primary visualization:
Scenario Path / amortization timeline.

Opportunity stack:
- Terminar antes
- Comparar compra de cartera
- Revisar seguros
- Reestructuración eligibility when relevant
- Possible inconsistency when screened

Each opportunity includes:
- why it appeared
- confidence
- possible value
- next action

Source/Freshness component always visible.

---

# Mobile contract

- one cognitive task per viewport;
- sticky bottom primary action only when it does not hide critical content;
- numeric keyboard for amounts;
- native-feeling select behavior;
- no horizontal tables for Benefit Breakdown;
- Scenario Path becomes vertically stacked or horizontally scrollable with clear affordance;
- upload uses device file picker/camera only if document capture quality can be validated;
- minimum touch target 44x44 CSS px or stronger project standard.

# Desktop contract

Question screens may use a two-column frame:
- left: progress + contextual reassurance;
- right: active input.

Result screens may use 12-column grid with:
- primary analysis 7–8 columns;
- precision/source/action rail 4–5 columns.

Avoid dashboard density before the user has created a Mortgage Twin.

# Empty/loading/error states

## Calculation loading
No fake long analysis animation. If calculation is local/fast, transition immediately. If asynchronous, explain what is being checked.

## Invalid combination
Example:
payment lower than modeled interest.

Message:
“Estos datos no parecen compatibles entre sí. Puede ser porque la cuota incluye valores adicionales o porque nos falta información del sistema.”

Actions:
- review inputs
- upload extract

## Unsupported / uncertain UVR
Message:
“Podemos modelar tu crédito en UVR, pero no convertir el futuro a pesos como si la inflación ya fuera conocida.”

# Low-fi acceptance gate

Before visual styling:
- user can reach R1 in <= 90 seconds in moderated test;
- no identity/contact requirement before R1;
- at least 4/5 users understand estimate vs verified result;
- at least 4/5 users correctly explain that additional principal is their money, not platform-generated savings;
- DIY option is discoverable without scrolling past a paid CTA on common mobile viewport;
- back navigation never loses entered data;
- keyboard-only flow is complete;
- all error states preserve recoverability.
