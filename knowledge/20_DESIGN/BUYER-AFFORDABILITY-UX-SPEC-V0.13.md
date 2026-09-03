# Buyer Affordability UX Spec v0.13

Date: 2026-08-26
Surface mode: Operate
Route: `/comprar/cuanto-puedo-comprar`

## 1. User intent

> “Quiero saber qué rango de vivienda tiene sentido planear sin que una calculadora me haga creer que ya tengo un crédito aprobado.”

## 2. Entry point

Public route under `Comprar vivienda`.

The page should begin directly with the task, not a long mortgage-sales landing.

Primary CTA from relevant public surfaces:

**Calcular mi rango**

## 3. Minimum information for first value

C1 asks only:

1. net monthly household income;
2. recurring monthly debt payments;
3. available down payment;
4. VIS / non-VIS / not sure.

No:

- name;
- email;
- phone;
- ID;
- employer;
- bureau score;
- document upload.

## 4. First value

After the four C1 inputs show immediately:

### Planning payment room

The monthly room left under the v0.13 30% total-debt planning benchmark after declared recurring debt payments.

Label:

**Cuota mensual para planear**

Not:

- “cuota aprobada”;
- “capacidad del banco”;
- “te prestan”.

### Down-payment structural reference

For known housing category, show the property ceiling implied only by the available down payment if financing reached the current maximum regulatory LTV.

For unknown category, show both:

- non-VIS reference;
- VIS reference.

Clearly say this ignores credit-payment capacity until rate/term are modeled.

### Regulatory context

Show as secondary information:

> La regulación vigente limita la primera cuota del crédito de vivienda al 40% de los ingresos familiares acreditables. VIVIENDA no usa ese 40% como recomendación de sostenibilidad.

Do not calculate a personalized 40% amount unless accreditable family income was explicitly supplied.

## 5. C1 result hierarchy

1. Result headline.
2. Planning monthly payment room.
3. Current debt ratio.
4. Down-payment structural reference(s).
5. “What this does not mean”.
6. Next action.

Primary next action:

**Modelar con tasa y plazo**

Secondary:

**Editar mis datos**

## 6. C2 progressive step

Only after C1 value is visible.

Ask:

1. EA rate for the scenario;
2. term in years/months;
3. optional other monthly housing costs.

The user may stop at C1 without punishment.

Explain rate:

> Usa una tasa de una cotización, simulador o escenario que quieras probar. No estamos mostrando una tasa de mercado automática en esta versión.

Explain other monthly costs:

> Administración u otros costos recurrentes que quieras reservar antes de destinar dinero a la cuota del crédito. Puedes dejarlo vacío; el resultado quedará menos completo.

## 7. C2 result hierarchy

### Headline

**Con estas suposiciones, este es tu rango modelado.**

### Primary number

`modeledPropertyCeiling`, rounded for presentation.

Label:

**Techo del escenario modelado**

Never:

- “precio aprobado”;
- “lo que puedes comprar seguro”.

### Supporting values

- modeled credit payment budget;
- modeled principal;
- down payment available;
- rate EA;
- term;
- housing category/LTV reference.

### Binding constraint

If `payment`:

**Hoy te limita más la capacidad mensual.**

If `down_payment`:

**Hoy te limita más la cuota inicial disponible.**

If `both`:

**La capacidad mensual y la inicial llegan al mismo límite en este escenario.**

This is a decision insight, not a score.

## 8. Next best action

### Payment binding

Offer:

- review monthly obligations;
- compare a different target price;
- test a different confirmed financing scenario.

Do not advise extending term automatically as “better”.

### Down-payment binding

Offer:

- model additional savings;
- adjust target price;
- verify whether the target property is VIS/non-VIS.

### Unknown housing category

Ask the user to confirm category before treating one LTV reference as applicable.

## 9. Home Profile transition

v0.13 must **not** expose fake account saving.

Allowed end-state copy:

> Más adelante podrás guardar este análisis en Mi Vivienda y completar tu perfil progresivamente.

Do not show active `Guardar`, `Crear perfil` or account persistence until auth/product state exists.

## 10. Sensitive-data boundary

No sensitive-data expansion in v0.13.

Future transition to Home Profile must separately define:

- purpose-specific consent;
- auth;
- persistence;
- progressive enrichment;
- deletion/retention controls.

## 11. Error/recovery

### Income missing/zero

Inline error:

**Necesitamos un ingreso mensual mayor que cero para calcular el benchmark.**

### Debt > planning benchmark

Do not treat as form error.

Valid result:

**Con el benchmark de planificación actual no queda espacio mensual para una nueva cuota de vivienda.**

Then explain next actions.

### Zero down payment

Valid result. Show structural property ceiling from down payment as zero; do not block C1.

### Unsupported term

Explain product model support:

**Esta versión modela entre 5 y 30 años. Prueba un plazo dentro de ese rango.**

Do not label 30 years as universal current legal maximum.

### Unknown housing category

Valid path; show two references.

## 12. Mobile behavior

- one question per visual block;
- numeric inputs use `inputMode="numeric"`/`decimal`;
- no side-by-side critical fields below 620 px;
- result number must not overflow 390 px;
- VIS/non-VIS scenarios stack vertically;
- primary action reachable without horizontal scrolling;
- focus moves to result heading after calculation.

## 13. Accessibility

- semantic form labels;
- fieldset/legend for housing category;
- errors connected with `aria-describedby`;
- result uses focus target and `aria-live="polite"` only for calculation completion, not every keystroke;
- visible keyboard focus;
- no meaning encoded by color alone;
- currency formatting has a readable textual label.

## 14. Analytics contract candidate

No raw income/debt/down-payment values in generic analytics.

Events:

- `buyer_affordability_started`;
- `buyer_affordability_c1_completed`;
- `buyer_affordability_c1_value_seen`;
- `buyer_affordability_model_started`;
- `buyer_affordability_c2_completed`;
- `buyer_affordability_binding_constraint_seen` with enum only;
- `buyer_affordability_category_unknown`;
- `buyer_affordability_abandoned` with stage only.

## 15. Acceptance criteria

1. first C1 value appears without identity/contact;
2. 30% planning benchmark and 40% regulatory ceiling are visibly distinct;
3. no payment-derived property range appears at C1;
4. C2 rate/term are explicitly supplied by user;
5. no automatic market rate;
6. binding constraint is explained in language;
7. unknown category shows both VIS/non-VIS references;
8. no score/approval/matching language;
9. mobile 390 has no overflow;
10. user may exit after C1 without account creation.
