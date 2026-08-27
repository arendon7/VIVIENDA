# HOME READINESS CONTRACT v0.16

Date: 2026-08-26
Status: domain/product contract before UI
Depends on: Buyer Affordability v0.13

## 1. Product question

Journey 2 already answers a first question:

**¿Cuánta vivienda puedo planear de forma razonable?**

v0.16 answers a different question:

**¿Qué tan preparado está hoy mi plan de compra y qué debería mejorar primero?**

This must not become a bank underwriting simulator, a bureau score or an approval-probability tool.

## 2. User-facing name

Primary name:

**Índice de Preparación Hipotecaria**

Required descriptor wherever the total appears:

**Índice orientativo propio de VIVIENDA · no es DataCrédito, score bancario ni aprobación.**

The UI may shorten the name to **Preparación hipotecaria** after the boundary has been made explicit.

Never call it:

- score crediticio;
- score bancario;
- probabilidad de aprobación;
- preaprobación;
- elegibilidad bancaria;
- DataCrédito VIVIENDA.

## 3. Architecture

v0.16 is an interpretation layer over the existing buyer domain:

`Declared buyer facts → Buyer Affordability v0.13 → Home Readiness v0.16 → dimensions + next-best actions`

Rules:

1. v0.16 must call/reuse Buyer Affordability for affordability facts that already exist there.
2. v0.16 must not fork the 30% planning benchmark, regulatory LTV references or affordability formulas into a second implementation.
3. The readiness index owns only readiness interpretation, dimension scoring and next actions.
4. Account/persistence is not required to calculate the first complete index.

## 4. Why five dimensions and why equal weight

The first version uses five dimensions worth **20 points each**.

Equal weighting is intentional:

- no empirical lender-performance dataset currently justifies claiming one dimension predicts approval more strongly than another;
- equal weighting is transparent and easy to explain;
- later calibration may change weights only with documented evidence/research.

The index is therefore a **planning heuristic**, not a statistical probability model.

### Dimension A — Current obligation burden — 0–20

Question answered:

**¿Cuánto de mi ingreso ya está comprometido antes de comprar?**

Source:

`currentMonthlyDebtPayments / netHouseholdIncomeMonthly`

This dimension evaluates existing recurring debt burden only.

It does not score the future mortgage payment, avoiding double counting with target fit.

Bands:

- ratio `<= 10%` → 20;
- `>10% and <=20%` → 15;
- `>20% and <=30%` → 10;
- `>30% and <=40%` → 5;
- `>40%` → 0.

Boundary:

These are VIVIENDA planning bands. They are not bank approval rules.

### Dimension B — Down-payment readiness — 0–20

Question answered:

**¿Qué parte de la equity/cash reference for my target do I already have?**

Requires:

- target property price;
- known housing category (`vis` or `non_vis`);
- available down payment.

Canonical minimum-equity reference comes from Buyer Affordability:

`minimumEquityReference = targetPropertyPrice * minimumEquityRatio`

Coverage:

`downPaymentCoverage = availableDownPayment / minimumEquityReference`

Bands:

- `>= 1.25` → 20;
- `>= 1.00 and <1.25` → 15;
- `>= 0.75 and <1.00` → 10;
- `>= 0.50 and <0.75` → 5;
- `<0.50` → 0.

Why 1.25 can score above 1.00:

Meeting the reference minimum does not mean every available peso should be consumed by the down payment. A buffer is planning strength, but v0.16 does not estimate closing costs or claim that 25% is a legally required buffer.

Boundary:

The LTV/equity reference is not a promise that a lender will finance the maximum regulatory percentage.

### Dimension C — Income continuity — 0–20

Question answered:

**¿Tengo una historia de ingresos suficientemente clara para planear y explicar mi capacidad?**

This dimension must not penalize employment category itself.

A salaried worker, independent professional, business owner or other lawful income source can receive the same score when continuity is comparable.

Input enum:

- `established_12_plus` → 20;
- `established_6_to_12` → 15;
- `variable_with_12_plus_history` → 15;
- `recent_under_6` → 10;
- `irregular_or_recently_changed` → 5;
- `unknown` → dimension incomplete, not zero.

Boundary:

This is not a lender tenure requirement. It is a planning/readiness description based on user declaration.

### Dimension D — Documentation readiness — 0–20

Question answered:

**¿Puedo soportar con documentos los ingresos/obligaciones que estoy usando para planear?**

Input enum:

- `ready` → 20;
- `mostly_ready` → 15;
- `partial` → 10;
- `not_ready` → 5;
- `unknown` → dimension incomplete, not zero.

The product must describe this functionally, not by forcing one employment-specific checklist on everyone.

Examples of useful categories, depending on the person:

- income/support records;
- account movements/certifications when relevant;
- current obligation statements;
- identity/basic application records later in the process.

v0.16 does not certify document sufficiency for a specific lender.

### Dimension E — Target fit — 0–20

Question answered:

**¿El precio de vivienda que tengo en mente cabe dentro del escenario financiero que yo mismo estoy usando para planear?**

This dimension is scored only when Buyer Affordability can produce a C2 modeled property ceiling for the same known category.

Required additional inputs:

- target property price;
- known housing category;
- user-supplied planning EA rate;
- user-supplied planning term;
- monthly non-credit housing costs if the user knows them.

Canonical source:

`modeledPropertyCeiling` from Buyer Affordability v0.13.

Ratio:

`targetFitRatio = targetPropertyPrice / modeledPropertyCeiling`

If modeled ceiling is zero and target price is positive → 0 points.

Bands:

- ratio `<= 0.80` → 20;
- `>0.80 and <=0.90` → 15;
- `>0.90 and <=1.00` → 10;
- `>1.00 and <=1.10` → 5;
- `>1.10` → 0.

Target fit deliberately absorbs the affordability interaction between monthly payment room, cash and maximum-LTV structure so those same facts are not counted again in a separate “payment capacity” score.

The result should still expose payment-room facts as explanation, but they do not receive a second score.

Boundary:

The rate/term are planning inputs supplied by the user. They are not a market quote, product offer or approval.

## 5. Complete vs partial index

### Complete index

A 0–100 total is produced only when all five dimensions are scoreable.

`total = A + B + C + D + E`

All dimension points are discrete in increments of five.

The UI may show an integer such as `75/100`, but must explain that this is a planning heuristic.

### Partial profile

If any required dimension is `unknown` or cannot be computed:

- do not normalize the remaining dimensions to 100;
- do not estimate the missing score;
- return `indexStatus = incomplete`;
- return `totalScore = null`;
- show scored dimensions individually;
- show exact missing inputs needed to complete the index.

This prevents false precision.

## 6. Total-score bands

Bands describe preparation, not approval likelihood:

- `0–39` → `foundation_needed` — **Base por preparar**;
- `40–59` → `developing` — **En construcción**;
- `60–79` → `progressing` — **Buen avance**;
- `80–100` → `well_prepared` — **Preparación sólida**.

Never translate these bands into approval probability.

## 7. Precision

### C1

The Home Readiness index is C1 when it uses user-declared facts plus the canonical C1/C2 buyer calculation inputs.

The presence of a 0–100 number does not upgrade evidence precision.

### C2

The underlying Buyer Affordability scenario may be C2 when rate + term are supplied/confirmed according to v0.13, but Home Readiness still reflects declared continuity/document-readiness facts.

Therefore the total index remains labeled as an **orientative planning index**, not a document-verified profile.

### C3

v0.16 does not produce a C3 Home Readiness index.

C3 would require a future evidence-backed profile contract and must not be inferred from an account or uploaded files alone.

## 8. Minimum data and progressive value

### Quick profile — before full score

The product can provide immediate partial value from:

- net household income;
- recurring monthly debt payments;
- available down payment;
- target property price;
- housing category if known.

It should show:

- current obligation burden dimension;
- down-payment dimension when category is known;
- buyer-affordability planning facts already supported by v0.13;
- what information would unlock the complete index.

No name, ID, phone, email or bureau data is needed.

### Complete anonymous index

To unlock a complete index, progressively add:

- income continuity category;
- documentation readiness;
- user-supplied planning rate;
- user-supplied planning term;
- optional non-credit housing costs.

A complete 0–100 result is still available before registration.

This is deliberate: account creation must not be the price of seeing the substantive result.

## 9. Next-best-action engine

After scoring, sort dimensions ascending by points and produce up to three actions.

Tie-breaking order should favor actions the user can influence directly:

1. down-payment readiness;
2. current obligation burden;
3. documentation readiness;
4. target fit;
5. income continuity.

Examples:

### Low down-payment readiness

Show the quantified gap to the minimum-equity reference when computable.

Action examples:

- increase available down payment;
- reconsider target price;
- do not frame the reference as lender financing guaranteed at max LTV.

### High current obligation burden

Show current declared debt-service ratio and planning impact.

Action examples:

- evaluate reducing recurring obligations;
- recalculate the target after a specific obligation ends;
- never promise approval from debt reduction.

### Documentation not ready

Action:

- organize proof appropriate to the declared income source and current obligations;
- later compare requirements of the specific institution/product.

### Weak target fit

Action examples:

- lower target price;
- increase down payment;
- compare another user-supplied planning scenario;
- do not silently substitute a “better market rate”.

### Income continuity still developing

Action:

- document the actual income history and keep assumptions conservative;
- do not tell an independent/variable-income user they are intrinsically worse than salaried users.

## 10. Explainability contract

Every dimension must expose:

- `score` / 20, or `needs_information`;
- what input(s) were used;
- the factual ratio/category that drove the band;
- why the band exists;
- one practical next action when the score is below 20;
- a caveat when the factor is a VIVIENDA planning heuristic rather than law.

The total must expose:

- five dimension cards;
- no hidden proprietary multiplier;
- no ML/AI probability claim;
- no undisclosed behavioral or demographic data.

## 11. Sensitive/prohibited factor boundary

v0.16 must not use protected/sensitive attributes or opaque proxies to produce the score.

Do not score based on:

- race/ethnicity;
- religion;
- political affiliation;
- health/medical information;
- sexual orientation or sex life;
- criminal history;
- other sensitive data unrelated to the declared housing-planning task.

Do not score age in v0.16.

If a future financing scenario needs a term constraint related to an actual product, that belongs in the product-specific compatibility layer with an explicit source, not in this proprietary readiness index.

## 12. Account/persistence boundary

v0.16 does not require auth to calculate either the partial or complete index.

Account value should later be framed around:

- saving the profile;
- updating progress over time;
- preserving target/scenarios;
- receiving next-action reminders;
- comparing future financing options when real data/contracts exist.

Do not add a fake “Guardar” CTA until persistence is real.

## 13. Financing marketplace boundary

The readiness index is not a lender-matching score.

Future financing cards must separately label their evidence/status as:

- public/reference information;
- preliminary compatibility;
- personalized estimate;
- actual offer;
- final approval.

A high Home Readiness score alone cannot change any card into an offer or approval.

## 14. Required domain invariants

Tests must prove at least:

1. five complete dimensions sum exactly to 100 max;
2. no dimension exceeds 20 or drops below 0;
3. all scored values are increments of five;
4. missing dimension → no normalized total;
5. unknown income continuity is incomplete, not zero;
6. unknown documentation readiness is incomplete, not zero;
7. unknown housing category blocks down-payment and target-fit dimensions from a complete total;
8. target fit delegates modeled ceiling to Buyer Affordability rather than duplicating its formula;
9. rate/term absent → target fit incomplete rather than silently inserting market assumptions;
10. score never contains approval/probability output;
11. employment type itself is not scored;
12. lowering current recurring debt cannot worsen obligation-burden score;
13. increasing down payment cannot worsen down-payment score;
14. increasing target price with all else equal cannot improve target-fit score;
15. improving documentation readiness cannot worsen its score;
16. stronger continuity category cannot worsen its score;
17. next actions prioritize the weakest actionable dimensions;
18. complete index can be calculated without identity/contact fields.

## 15. Out of scope for v0.16

- DataCrédito/bureau integration;
- Open Finance;
- lender underwriting models;
- approval probability;
- actual preapproval;
- bank-specific document sufficiency;
- market-rate ingestion;
- subsidy eligibility;
- age-based underwriting;
- auth/persistence implementation;
- application submission;
- financial-product recommendation based solely on the proprietary index.

## 16. Product success criterion

v0.16 succeeds if a prospective buyer can answer three questions without creating an account:

1. **¿Cómo está mi preparación hoy?**
2. **¿Qué dimensión me está limitando realmente?**
3. **¿Qué acción concreta puedo tomar primero?**

The result must create clarity and agency without pretending to predict a bank decision.