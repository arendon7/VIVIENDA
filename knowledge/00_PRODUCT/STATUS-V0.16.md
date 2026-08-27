# STATUS v0.16 — Home Readiness / Índice de Preparación Hipotecaria

Date: 2026-08-27
Branch: `product/home-readiness-v0.16`
Base: v0.15 `product/inconsistency-reconciler-v0.15`
Green code/test head: `50de28509bbbb9a733382861231ef5981d2db487`

## Objective

Add the next prospective-buyer decision layer after Buyer Affordability: an explainable **Índice de Preparación Hipotecaria** that helps a person understand what is already strong, what is incomplete, and what to improve before comparing financing.

The index is a product-planning instrument. It is not a bureau score, bank underwriting score, approval model, approval probability or lender offer.

## Implemented

- domain contract `HOME-READINESS-CONTRACT-V0.16.md`;
- pure evaluator `domain/home-readiness/evaluator.ts`;
- 21 Home Readiness domain tests;
- UX specification `HOME-READINESS-UX-SPEC-V0.16.md`;
- standalone public route `/comprar/preparacion`;
- anonymous partial profile before a numeric total;
- complete 0–100 result only when all five dimensions are scoreable;
- five explainable dimensions of 20 points each;
- next-best-action prioritization based on weakest/missing dimensions;
- quantified down-payment gap when available;
- Buyer Affordability reuse for modeled capacity/target fit;
- in-memory continuation from `/comprar/cuanto-puedo-comprar` without re-entering validated facts;
- preservation of previous affordability values when returning to edit;
- Home entry as a secondary buyer path without displacing the existing-borrower primary CTA;
- desktop/mobile E2E coverage.

## Five dimensions

Each complete dimension contributes a maximum of 20 points:

1. `obligation_burden` — current recurring obligation burden;
2. `down_payment_readiness` — down-payment readiness against the applicable structural reference;
3. `income_continuity` — continuity/history of income;
4. `documentation_readiness` — readiness of supporting documents;
5. `target_fit` — fit between the stated target property and the modeled affordability scenario.

Scores use coarse, explainable increments rather than false decimal precision.

## No artificial normalization

If a required dimension cannot be evaluated, v0.16 does **not** rescale the remaining dimensions to manufacture a score out of 100.

Instead:

- `indexStatus = incomplete`;
- `totalScore = null`;
- the missing dimension is shown as `Falta información`;
- the next action tells the user what information is required.

This preserves comparability and avoids presenting incomplete information as a complete assessment.

## Relationship with Buyer Affordability

Home Readiness is an interpretation layer over the existing Buyer Affordability engine, not a second mortgage calculator.

### Reused facts

- declared net household income;
- recurring debt payments;
- available down payment;
- VIS / non-VIS category;
- optional user-supplied planning rate, term and non-credit housing costs.

### Separate responsibilities

Buyer Affordability calculates planning capacity and, at C2, a modeled property ceiling.

Home Readiness uses those outputs where appropriate but keeps them visually separate from the five index dimensions so the same financial fact is not intentionally counted twice.

`target_fit` delegates modeled affordability to `calculateBuyerAffordability` rather than reproducing the property-ceiling formula.

## Precision model

The Home Readiness index itself remains an orientative planning assessment based on declared information.

The underlying affordability component may be:

- **C1** when rate/term are absent;
- **C2** when the user supplies a planning EA rate and term.

A C2 affordability scenario does not turn Home Readiness into a bank offer or approval model.

## Financing assumptions

v0.16 does not insert a market rate or choose a bank product.

To score target fit with a modeled financing scenario, the user must supply:

- EA rate;
- term;
- optional recurring non-credit housing costs.

If those assumptions are absent, the index stays incomplete instead of silently inventing them.

## Anonymous value before account

A user can receive:

- the partial profile;
- missing-information guidance;
- the five dimension results;
- and the complete 0–100 index when sufficient information exists

without providing:

- name;
- email;
- phone;
- ID number;
- bureau authorization;
- account registration.

Future account/persistence capability may be used to save and continue progress, not to gate the substantive first result.

## Standalone route

`/comprar/preparacion`

Flow:

`base facts → partial profile → income continuity → documentation → planning financing → complete/incomplete result → next action`

The route is statically built and remains public.

## Embedded continuation from affordability

From `/comprar/cuanto-puedo-comprar`, the user can choose `Conocer mi preparación` after C1 or C2.

The continuation:

- reuses validated income, debt, down payment and category in memory;
- also reuses user-supplied C2 rate/term/costs when present;
- keeps the URL on `/comprar/cuanto-puedo-comprar`;
- does not serialize financial data into query parameters;
- does not claim persistence;
- asks only the additional facts required for Home Readiness;
- preserves the affordability state when the user returns to edit.

## Home hierarchy

Home now exposes two buyer actions:

- `Calcular cuánto puedo planear`;
- `Conocer mi preparación`.

The existing-borrower hero and primary CTA `Revisar mi crédito` remain unchanged in hierarchy.

## Truth boundaries

v0.16 explicitly states that the index is **not**:

- DataCrédito;
- a bureau score;
- a bank score;
- a preapproval;
- a final approval;
- an approval probability;
- a lender offer;
- a market-rate quote.

Additional rules:

- employment type itself is not scored;
- continuity/history of income is scored;
- a missing fact is not converted to zero when the correct state is unknown;
- no personalized lender matching is inferred from the index;
- no financing recommendation is generated merely from a high score.

## Quality gate

Green code/test head:

`50de28509bbbb9a733382861231ef5981d2db487`

CI run:

`33028681651`

Results:

- TypeScript: **PASS**;
- domain test files: **24/24 PASS**;
- domain tests: **266/266 PASS**;
- Home Readiness domain tests: **21/21 PASS**;
- Next production build: **PASS**;
- `/comprar/preparacion`: static route generated successfully;
- Playwright E2E: **126/126 PASS**;
- desktop Chromium: **PASS**;
- mobile 390 px: **PASS**;
- no horizontal-overflow check in the completed readiness journey: **PASS**;
- existing-borrower primary Home CTA preserved: **PASS**.

## Out of scope / still not live

- authentication;
- Home Profile persistence;
- VIVIENDA Supabase project;
- bureau integrations;
- bank underwriting models;
- bank/product matching;
- live lender offers;
- automatic market rates;
- Open Finance;
- subsidy eligibility determination;
- mortgage application submission;
- approval/preapproval;
- payment/contracting flows;
- productive Vercel deployment.

## Product implication

After v0.16 the buyer journey has two proven layers:

1. **Affordability** — what range can I reasonably plan/model?
2. **Readiness** — what is already ready, what is missing, and what should I strengthen next?

The next slice should be selected from product evidence. A likely next layer is financing-structure comparison/preliminary compatibility **without live lender claims**, or `Compra Segura` in the Buy domain. Horizontal account/Open Finance infrastructure should not be opened merely because a profile concept now exists.