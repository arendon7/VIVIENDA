# STATUS v0.18 — Quote Normalization / Base Comparable de Cotizaciones

Date: 2026-08-27
Branch: `product/quote-normalization-v0.18`
Base: v0.17 `product/financing-structures-v0.17`
Base final documentation head: `2b824629cb0efada86d766b44110a807db415f5e`
Green code/test head: `598fad61ab3937151eedbc7edf94488fca160473`

## Objective

Add the next buyer-financing layer after Financing Structures: a manual **Quote Normalization** surface that determines whether a financing quotation contains enough material declared information to be understood and, when two quotations exist, identifies which differences prevent a clean economic comparison.

v0.18 deliberately stops before total-cost modeling, savings, ranking or lender recommendation.

The central product question is:

> **¿Estas cotizaciones contienen suficiente información y están sobre bases comparables?**

not:

> ¿Cuál gana?

## Implemented

- domain contract `QUOTE-NORMALIZATION-CONTRACT-V0.18.md`;
- pure evaluator `domain/quote-normalization/evaluator.ts`;
- **37 Quote Normalization domain tests**;
- UX specification `QUOTE-NORMALIZATION-UX-SPEC-V0.18.md`;
- standalone public route `/comprar/comparar-cotizaciones`;
- sequential manual capture of Quote A and optional Quote B;
- immediate first-value result after Quote A;
- conditional capture for UVR, insurance, one-time costs, prepayment rules and leasing purchase option;
- mechanical derivation of financing percentage when property value and financed amount are supplied;
- mismatch warning when quoted and derived financing percentages materially disagree;
- three quote-readiness states;
- three pair-readiness states;
- pairwise basis-difference detection;
- explicit future-modeling requirements;
- in-browser state preservation while adding/editing the second quotation;
- navigation from `/comprar/financiacion` to the quotation layer;
- desktop/mobile 390 px E2E coverage.

## Precision and provenance

All manually entered quotation data remains:

- **C1**;
- `user_declared`;
- unverified.

The surface does not convert typed information into C3.

The UI separates:

1. user-declared fields;
2. mechanically derived values;
3. missing structural fields;
4. missing comparison-input fields;
5. consistency warnings;
6. basis differences between quotations;
7. requirements for a future economic model.

## Single-quote readiness states

### `incomplete`

One or more structural fields are missing:

- contract structure;
- denomination;
- financed amount;
- term;
- initial payment/canon.

The evaluator returns a readiness state rather than throwing merely because material information is absent.

### `structurally_ready`

The structure can be described but one or more material comparison inputs are still missing.

Examples can include:

- provider/date;
- property value;
- rate/convention;
- amortization behavior;
- insurance treatment/amount;
- one-time costs;
- cash required at closing;
- prepayment information;
- UVR reference;
- leasing purchase-option economics/timing.

### `comparison_input_ready`

The required declared material inputs are present for a later economic model.

This state does **not** mean:

- cheaper;
- better;
- recommended;
- verified;
- eligible;
- preapproved;
- approved;
- likely to be approved.

No completeness percentage is exposed.

## Pair readiness states

### `blocked_by_missing_data`

At least one quotation lacks structural information.

### `ready_for_structural_comparison`

Both quotations have sufficient structural information to identify basis differences, but one or both still lack material comparison inputs.

### `ready_for_future_economic_model`

Both quotations are materially complete enough, as declared, to be inputs to a future economic model.

This is a data-readiness state, not an economic conclusion.

## Basis differences detected

The pair evaluator can surface differences in:

- provider;
- quote date;
- validity;
- contract structure;
- denomination;
- property value;
- financed amount;
- derived financing percentage;
- term;
- rate convention;
- amortization behavior;
- insurance treatment;
- cash required at closing;
- leasing purchase option.

The UI headline is deliberately:

> **Ahora sabemos qué no es directamente comparable**

instead of presenting a winner.

## Future-modeling requirements

Depending on the pair, the evaluator may require:

- `uvr_path_or_verified_schedule`;
- `leasing_purchase_option_economics`;
- `normalize_rate_conventions`;
- `normalize_insurance_treatment`;
- `normalize_one_time_costs`;
- `normalize_financed_amount_or_equity`;
- `normalize_term_or_compare_multiple_horizons`;
- `quote_validity_alignment`.

These outputs define prerequisites for a future cost model. They do not perform that model.

## UVR boundary

A declared UVR quotation requires its quoted index/reference basis for comparison-input readiness.

v0.18 does not:

- invent a UVR trajectory;
- use the current UVR value as a long-term forecast;
- project future peso payments;
- assert that UVR is better or worse than pesos.

A future economic comparison must use an explicit scenario path or a verified schedule appropriate to its precision level.

## Leasing boundary

A housing-leasing quotation requires purchase-option economics and timing before comparison-input readiness.

v0.18 does not collapse leasing and mortgage credit into a rate-only comparison.

## Insurance and closing-cost boundary

The normalizer distinguishes:

- insurance included in the quoted payment/canon;
- insurance excluded;
- insurance partially included;
- unknown treatment;
- itemized one-time costs;
- total-only one-time costs;
- expressly stated no one-time costs;
- unknown one-time-cost treatment;
- total declared cash required at closing.

This prevents a lower headline payment from being treated as economically superior merely because material costs are outside the quoted figure.

## Date handling

- calendar dates are validated;
- `validUntil` cannot precede `quoteDate`;
- missing validity is a warning, not an automatic structural blocker;
- the evaluator does not use the runtime system clock to silently infer expiration;
- expiration-style warnings require an explicit evaluation date.

This preserves determinism and provenance.

## Manual entry and privacy

v0.18 requires no:

- name;
- email;
- phone;
- ID number;
- employer;
- account;
- bureau authorization;
- bank-account data;
- document upload.

The public surface keeps the quotations only in current component memory. It does not claim persistence.

## Public UX flow

`/comprar/comparar-cotizaciones`

Flow:

`Quote A manual input → readiness/missing data/warnings → edit or add Quote B → Quote B input → pair basis differences → future-modeling requirements`

The user receives substantive value after Quote A and is not forced through a double form before seeing a result.

## Truth boundaries

The quote result explicitly reports:

- `isVerified = false`;
- `isEconomicComparison = false`;
- `isCostRanking = false`;
- `isEligibility = false`;
- `isApproval = false`;
- `isBankMatch = false`.

The pair result explicitly reports:

- `hasWinner = false`;
- `hasSavingsCalculation = false`;
- `hasTotalCostProjection = false`.

v0.18 does not expose:

- best quote;
- cheapest quote;
- savings amount;
- total-cost result;
- lender recommendation;
- approval probability;
- percentage bank match;
- live market rate.

## Relationship with v0.17

v0.17 answers:

> **¿Qué estructuras vale la pena explorar?**

v0.18 answers:

> **¿La cotización que ya tengo está suficientemente descrita y sobre qué base puedo compararla con otra?**

`/comprar/financiacion` links to `/comprar/comparar-cotizaciones` as the next layer.

No financial amounts are serialized into the URL. The two routes remain independently usable.

## Quality gate

Green code/test head:

`598fad61ab3937151eedbc7edf94488fca160473`

CI run:

`33039869014`

Results:

- TypeScript: **PASS**;
- domain test files: **26/26 PASS**;
- domain tests: **321/321 PASS**;
- Quote Normalization domain tests: **37/37 PASS**;
- Next production build: **PASS**;
- `/comprar/comparar-cotizaciones`: static route generated successfully;
- Playwright E2E: **142/142 PASS**;
- desktop Chromium: **PASS**;
- mobile 390 px: **PASS**;
- two-quote sequential state preservation: **PASS**;
- incomplete/complete/UVR/pair scenarios: **PASS**;
- no horizontal overflow in tested pair journey: **PASS**;
- inherited previous-version E2E: **PASS**.

## E2E hardening note

The first browser run exposed locator ambiguity rather than product failures:

- duplicate visible missing-field labels across structural/comparison sections;
- radio accessible names correctly included explanatory text.

The locators were scoped to their semantic section and accessible radio names.

A subsequent test incorrectly prohibited the phrase `más barata` even when used in the explicit disclaimer `no significa que sea ... más barata`. The test was corrected to prohibit positive ranking claims while preserving explicit truth-boundary copy.

No domain behavior was weakened to make E2E pass.

## Out of scope / still not live

- OCR or quote-document ingestion;
- C3 quote verification;
- quote persistence;
- auth/profile persistence;
- VIVIENDA Supabase project;
- total-cost economic model;
- present-value comparison;
- savings calculation;
- economic winner/ranking;
- live lender offers;
- bank adapters;
- bank-specific eligibility;
- prequalification/preapproval/approval;
- automatic market rates;
- Open Finance;
- bureau integrations;
- subsidy eligibility;
- application submission;
- payments/contracting;
- productive Vercel deployment.

## Product implication

After v0.18 the prospective-buyer finance path has four distinct truth-preserving layers:

1. **Affordability** — what can I reasonably plan/model?
2. **Home Readiness** — what is ready and what should I strengthen?
3. **Financing Structures** — which contractual/denomination structures should I explore?
4. **Quote Normalization** — are actual quotations materially complete and on comparable bases?

The next financial slice should not jump to bank matching. The coherent continuation is a **scenario-based economic comparison engine over normalized quotes**, with explicit normalization of term, equity, rate convention, insurance, closing costs, leasing purchase option and UVR path/schedule.

`Compra Segura` remains a separate candidate in the Buy domain and should not be mixed into this financial model.