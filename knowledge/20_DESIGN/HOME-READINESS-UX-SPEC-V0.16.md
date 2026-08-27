# HOME READINESS UX SPEC v0.16

Date: 2026-08-26
Status: UX contract
Domain source: `HOME-READINESS-CONTRACT-V0.16.md`
Primary route: `/comprar/preparacion`
Contextual continuation: `/comprar/cuanto-puedo-comprar`

## 1. User promise

**Entiende qué tan preparado está hoy tu plan de compra y qué deberías mejorar primero.**

This is a planning/profile experience for a prospective buyer.

It is not:

- a bank application;
- a bureau consultation;
- a credit score;
- a preapproval;
- an approval-probability calculator;
- a lender marketplace.

## 2. Two entry modes, one product

### Direct entry

Route:

`/comprar/preparacion`

The user starts with the minimum buyer facts needed to create immediate partial value.

### Contextual continuation from Buyer Affordability

After a C1/C2 affordability result, expose a contextual action:

**Ver qué tan preparado está mi plan**

When invoked inside the affordability experience:

- reuse income;
- reuse recurring debt payments;
- reuse available down payment;
- reuse housing category;
- reuse planning rate/term/costs when C2 already exists;
- ask only for facts not already known, starting with target price.

Do not put financial inputs in the URL.

Do not create backend persistence merely to pass these values.

Do not ask the user to retype facts already present in the mounted buyer flow.

The reusable readiness component may receive prefilled facts as React props in contextual mode.

## 3. First-value rule

No identity/contact before either partial or complete result.

Do not request:

- name;
- ID number;
- email;
- phone;
- date of birth;
- bureau/score access;
- bank credentials;
- employer name;
- documents.

The first meaningful result appears after basic planning facts, before continuity/documentation/financing enrichment.

## 4. Progressive flow

The interaction should feel like one profile being sharpened, not multiple unrelated forms.

### Phase A — Basic plan

Ask only what is not already prefilled:

1. net monthly household income;
2. recurring monthly debt payments;
3. available down payment;
4. target property price;
5. housing category: VIS / No VIS / not sure.

In contextual mode, items 1–3 and category are prefilled from Buyer Affordability and should be summarized rather than asked again.

Primary CTA:

**Ver mi punto de partida**

### Immediate partial result

The first result must show:

- C1 badge;
- **Perfil parcial** label;
- current obligation burden dimension if scoreable;
- down-payment readiness if category is known;
- planning housing payment room from Buyer Affordability;
- why a total 0–100 is not shown yet;
- exact information needed to complete the index.

Required message:

**No completamos los datos faltantes con supuestos para fabricar un puntaje.**

CTA:

**Completar mi preparación**

No account CTA.

### Phase B — Income continuity

Question:

**¿Qué describe mejor la continuidad de los ingresos que usarías para comprar?**

Consumer labels should map to domain values:

- `established_12_plus` — **Tengo una historia comparable de 12 meses o más**
- `established_6_to_12` — **Entre 6 y 12 meses**
- `variable_with_12_plus_history` — **Mis ingresos varían, pero tengo 12 meses o más de historia**
- `recent_under_6` — **Esta fuente de ingresos tiene menos de 6 meses**
- `irregular_or_recently_changed` — **Cambió recientemente o todavía es irregular**
- `unknown` — **No estoy seguro**

Supporting copy:

**No calificamos mejor a una persona por ser asalariada ni peor por ser independiente. Aquí miramos continuidad declarada, no tipo de ocupación.**

### Phase C — Documentation readiness

Question:

**¿Qué tan organizados están hoy los soportes de los datos que estás usando para planear?**

Options:

- `ready` — **Tengo organizados los soportes principales**
- `mostly_ready` — **Tengo la mayoría**
- `partial` — **Tengo algunos, pero faltan varios**
- `not_ready` — **Todavía no los he organizado**
- `unknown` — **No estoy seguro de qué necesitaría**

Supporting copy:

Use functional examples rather than one employment-specific checklist:

**Por ejemplo: soportes de ingresos, movimientos/certificaciones cuando correspondan y estados de obligaciones actuales. Los requisitos exactos dependen después de cada entidad.**

### Phase D — Target-fit scenario

Purpose:

Complete the target-fit dimension using the existing Buyer Affordability C2 engine.

If C2 rate/term already came from contextual affordability mode, summarize and allow edit.

Otherwise ask:

- planning EA rate (%);
- planning term (5–30 years);
- optional recurring non-credit housing costs.

Headline:

**Para medir el encaje de tu objetivo necesitamos un escenario que tú elijas.**

Required explanation:

**VIVIENDA no inserta una tasa de mercado ni supone una oferta bancaria. Usa una tasa y plazo que quieras probar.**

Actions:

- **Usar este escenario y completar el índice**
- **Todavía no tengo un escenario**

If the user chooses the second action:

- keep target fit incomplete;
- show the partial profile;
- do not normalize other dimensions to 100;
- explain exactly what remains missing.

### Unknown housing category

If category remains unknown:

- down-payment readiness remains incomplete;
- target fit remains incomplete;
- do not choose VIS or No VIS silently;
- complete total remains unavailable.

CTA may say:

**Confirmar categoría para completar el índice**

The user can still complete continuity and documentation dimensions first.

## 5. Complete-result hierarchy

When all five dimensions are scoreable, render in this order:

1. C1 precision badge;
2. explicit proprietary-index boundary;
3. total score `/100`;
4. preparation band;
5. one-sentence interpretation;
6. five dimension cards;
7. weakest-dimension callout;
8. up to three next-best actions;
9. affordability facts / assumptions;
10. methodology + truth boundary;
11. edit/recalculate actions.

Do not lead with a financial-product carousel.

## 6. Required score boundary

Near the total, visibly render:

**Índice orientativo propio de VIVIENDA**

and:

**No es DataCrédito, score bancario, preaprobación ni probabilidad de aprobación.**

The boundary must not exist only in the footer.

## 7. Score visual treatment

Use the total as a decision instrument, not a gamified credit score.

Allowed:

- large `75/100` number;
- preparation-band text;
- five visible 0–20 components;
- simple progress bars where text also states score.

Avoid:

- speedometer/credit-score gauge visual language;
- red/yellow/green “approval” traffic light;
- stars;
- “excellent credit” language;
- celebration confetti;
- percentile rank;
- probability chart.

Colors can reinforce hierarchy, never carry meaning alone.

## 8. Preparation-band copy

### `foundation_needed` — Base por preparar

Interpretation:

**Hay varias piezas del plan que conviene fortalecer antes de tratar el objetivo como listo para ejecutar.**

### `developing` — En construcción

Interpretation:

**Ya tienes parte de la base; una o dos mejoras concretas pueden cambiar materialmente tu planificación.**

### `progressing` — Buen avance

Interpretation:

**El plan tiene una base útil. Revisa las dimensiones más débiles antes de comparar opciones de financiación.**

### `well_prepared` — Preparación sólida

Interpretation:

**Tus datos declarados forman un plan coherente bajo esta metodología. Eso no sustituye la evaluación de una entidad.**

Never append an implied approval probability to any band.

## 9. Dimension cards

Each card must expose:

- dimension label;
- `x/20` or **Falta información**;
- primary factual driver;
- short explanation;
- caveat;
- next action when applicable.

Recommended labels:

- **Carga actual de obligaciones**
- **Preparación de cuota inicial**
- **Continuidad de ingresos**
- **Preparación documental**
- **Encaje del objetivo**

Do not hide weights: each dimension visibly says **20 puntos máx.**

## 10. Weakest-dimension callout

Title:

**Lo que más limita tu preparación hoy**

Use the first action produced by the domain engine.

If two or more dimensions tie, preserve canonical domain tie-breaking rather than rearranging based on marketing priorities.

The UI must not invent a different weakest factor.

## 11. Next-best actions

Show maximum three.

Each action should answer:

- what can I change;
- why it matters to this planning model;
- what would need recalculation afterward.

Examples:

### Down-payment gap

**Cerrar una brecha de $X en cuota inicial**

Support:

**Es la diferencia frente a la referencia mínima de equity del escenario. No supone que una entidad vaya a financiar automáticamente el máximo LTV.**

### Obligation burden

**Recalcular cuando termine o reduzca una obligación**

### Documentation

**Organizar soportes antes de comparar entidades**

### Target fit

**Probar otro precio, inicial o escenario de tasa/plazo**

### Continuity

**Construir y documentar una historia comparable de ingresos**

No action may promise approval.

## 12. Affordability facts panel

Show supporting buyer facts separately from readiness score so users understand what is calculated vs interpreted.

Potential facts:

- current declared debt ratio;
- planning housing payment room;
- target property price;
- available down payment;
- minimum-equity reference when category is known;
- modeled property ceiling when C2 exists;
- dominant constraint: payment / down payment / both.

Required note:

**Estos datos provienen del mismo motor de capacidad de compra; el índice no vuelve a contarlos como dimensiones adicionales.**

This makes the anti-double-counting design visible.

## 13. Incomplete-result UX

Incomplete does not mean “bad”.

Never display:

`0/100`

when data is missing.

Display instead:

**Perfil incompleto**

and:

**Ya podemos leer algunas dimensiones, pero faltan datos para construir un total honesto.**

Show:

- scored dimension cards normally;
- unscored cards as **Falta información**;
- exact missing inputs;
- next action to complete.

Do not dim or shame the user for missing data.

## 14. Editability

From any result:

- **Editar datos base**;
- **Cambiar continuidad**;
- **Cambiar preparación documental**;
- **Probar otro escenario**.

A changed input must recompute from domain source; do not patch score points manually in UI.

## 15. Contextual integration into affordability

After either C1 or C2 result, add a separate section after the core affordability decision, not inside the primary numeric result.

Suggested copy:

Eyebrow:

**Siguiente paso opcional**

Heading:

**El rango es solo una parte del plan. ¿Quieres ver qué tan preparado está el resto?**

Copy:

**Usaremos los datos que ya ingresaste y solo preguntaremos por tu precio objetivo, continuidad y preparación documental. Si ya modelaste tasa y plazo, también los reutilizamos.**

CTA:

**Ver mi preparación**

This CTA expands/mounts the readiness continuation in the same client flow.

Do not navigate financial facts through query parameters.

## 16. Direct-route navigation

Page header should keep buyer context:

- VIVIENDA brand → `/`
- `Cuánto puedo comprar` → `/comprar/cuanto-puedo-comprar`
- `Revisar mi crédito` → `/revisar`

Do not add a generic “Créditos” marketplace tab yet.

## 17. Privacy and storage copy

Direct and contextual first screen:

**No necesitas nombre, cédula, correo, teléfono ni consulta a centrales para ver tu preparación.**

Until real persistence exists:

- do not say “guardamos tu perfil”;
- do not show a fake save control;
- do not imply server persistence;
- do not claim account benefits are live.

If the page is refreshed, losing unsaved state is acceptable in v0.16 and preferable to hidden pseudo-persistence.

## 18. Accessibility

Required:

- semantic labels/legends for all controls;
- score meaning available as text, not color only;
- result heading receives focus after result/recalculation;
- progress step exposes `aria-valuenow` / text;
- incomplete dimensions state **Falta información** textually;
- keyboard path reaches skip link first;
- no horizontal overflow at 390 px;
- touch targets remain usable;
- errors connected via `aria-describedby` / `role=alert` as appropriate.

## 19. Mobile behavior

At <= 820 px:

- total score stack before dimensions;
- dimension cards single column or compact two-column only when readable;
- actions full width when needed;
- no horizontal score rail.

At <= 390 px:

- large score must not force overflow;
- fact labels wrap safely;
- progress and `/100` remain readable;
- no fixed-width card greater than viewport.

## 20. E2E contract

Must cover at least desktop + mobile for:

1. direct anonymous first screen;
2. partial profile does not manufacture `/100`;
3. unknown continuity remains missing, not zero;
4. unknown documentation remains missing, not zero;
5. unknown category blocks complete index;
6. no rate/term path remains incomplete and says no market rate was inserted;
7. complete high-readiness scenario produces exact domain score/band;
8. weak scenario produces correct weakest actions;
9. independent/variable-income wording is not penalizing employment type;
10. visible `not DataCrédito / not bank score / not approval` boundary;
11. no approval-probability copy;
12. edit changes recompute score;
13. contextual affordability continuation reuses existing base facts;
14. contextual C2 continuation reuses rate/term;
15. no financial values appear in URL query parameters;
16. keyboard focus/result behavior;
17. 390 px no-overflow.

## 21. Out of scope in UI v0.16

- sign-in/account creation;
- save profile;
- longitudinal progress chart;
- lender matching;
- bank cards;
- approval probability;
- DataCrédito integration;
- Open Finance;
- document upload;
- subsidy matching;
- application submission;
- alerts/reminders.

## 22. Activation event

A user reaches either:

- an honest partial profile and understands exactly what information is missing; or
- a complete five-dimension index and identifies a legitimate first improvement action.

The success metric is **clarity + next action**, not account capture.