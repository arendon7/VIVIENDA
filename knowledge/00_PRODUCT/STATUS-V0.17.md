# STATUS v0.17 — Financing Structures Explorer

Date: 2026-08-27
Branch: `product/financing-structures-v0.17`
Base: v0.16 `product/home-readiness-v0.16`
Base head: `50cc7b5f2141e110e1701b3a5901fd78cb0bcd7f`
Green code/test head: `5a750651f80de5b9bb738af792693c7369fc3eeb`

## Objective

Add Journey 2 Step 7 after Buyer Affordability and Home Readiness: a truthful **Financing Structures Explorer** that helps a prospective buyer decide which financing structures are worth exploring first before comparing real entities, rates or offers.

v0.17 deliberately does **not** build a bank marketplace or approval matcher.

The core product question is:

> Which financing structures are worth exploring first for the way I want to own the property and manage the obligation?

## Key product distinction

v0.17 separates two independent axes that must not be collapsed into one fake product ranking.

### Axis 1 — contractual structure

- mortgage credit;
- housing leasing.

### Axis 2 — denomination / payment behavior

- pesos;
- UVR.

A mortgage-credit decision and a pesos/UVR decision are not the same dimension.

The explorer therefore avoids flat labels such as “mortgage in pesos = option 1” versus “leasing UVR = option 2” when no real quote exists.

## Implemented

- domain contract `FINANCING-STRUCTURES-CONTRACT-V0.17.md`;
- pure evaluator `domain/financing-structures/evaluator.ts`;
- 18 financing-structures domain tests;
- UX specification `FINANCING-STRUCTURES-UX-SPEC-V0.17.md`;
- standalone public route `/comprar/financiacion`;
- two-question anonymous orientation flow;
- explicit separation of contractual structure and denomination;
- explainable routing vocabulary;
- context-notice support for a previously derived affordability constraint;
- complete real-quote checklist without a fake upload control;
- route-level navigation from Home Readiness to Financing Structures;
- desktop/mobile E2E coverage.

## Minimum user input

v0.17 asks only two preference questions.

### Ownership timing

```text
title_from_purchase
open_to_option_later_if_terms_fit
no_strong_preference
unknown
```

### Payment behavior

```text
nominal_peso_predictability
open_to_inflation_linked_variation
compare_both
unknown
```

No income, identity, phone, email, bureau permission, bank selection, rate or term is required to receive the orientation result.

## Routing vocabulary

Internal:

```text
explore_first
compare
secondary
needs_information
```

User-facing:

- **Explorar primero**;
- **Mantener para comparar**;
- **Comparar después**;
- **Falta definir preferencia**.

These labels express alignment with a declared preference. They are not approval or cost rankings.

## Contractual-structure routing

### Immediate ownership preference

`title_from_purchase`

- mortgage credit → `explore_first`;
- housing leasing → `secondary`.

### Open to later purchase option

`open_to_option_later_if_terms_fit`

- mortgage credit → `compare`;
- housing leasing → `compare`.

Accepting leasing as a possibility does not automatically make leasing the winner.

### No strong preference

- both structures → `compare`.

### Unknown

- both structures → `needs_information`.

The evaluator does not manufacture a winner from missing preference information.

## Denomination routing

### Nominal peso predictability

`nominal_peso_predictability`

- pesos → `explore_first`;
- UVR → `secondary`.

### Open to UVR / inflation-linked variation

`open_to_inflation_linked_variation`

- pesos → `compare`;
- UVR → `compare`.

Accepting UVR variation does not automatically make UVR the winner.

### Compare both

- pesos → `compare`;
- UVR → `compare`.

### Unknown

- both → `needs_information`.

The product makes no universal claim that pesos or UVR is cheaper or better.

## Provenance separation

Each result card keeps two statements visibly separate:

1. **Por qué queda en esta posición** — derived from the user's declared preference;
2. **Cómo funciona esta alternativa** — reference information about the structure.

This prevents a product-routing preference from being presented as if it were an authoritative lender or regulatory recommendation.

## Context from affordability

The evaluator accepts an optional derived context:

```text
payment
 down_payment
 both
 unknown
```

When supplied, it changes only what the user should verify in a real quote.

Examples:

- payment-constrained plan → compare actual installment/canon, insurance and recurring costs;
- down-payment-constrained plan → ask for actual financed percentage and total cash required;
- both → show both verification notices.

Important:

- this context never creates lender eligibility;
- it does not imply that leasing finances a larger percentage;
- it does not rank structures by approval likelihood.

### Current v0.17 integration state

The public Home Readiness route exposes `Explorar financiación` as navigation to `/comprar/financiacion`.

No financial amounts are serialized in the URL.

The Financing Structures component is already capable of receiving a derived `initialConstraintContext` in memory, but v0.17 does **not** wire this context across the standalone route because there is no persistence/session boundary for that handoff yet.

That capability remains intentionally unused rather than pretending persistence.

## Quote checklist

The explorer exposes a 15-item checklist for a future apples-to-apples comparison of real quotes, including:

- provider/entity and quote validity date;
- contractual structure;
- denomination;
- exact amortization/canon behavior;
- amount financed;
- actual financed percentage;
- rate convention;
- term;
- first installment/canon;
- insurance;
- one-off costs;
- prepayment/additional-payment rules;
- leasing purchase-option value/timing where applicable;
- total cash required before/during closing;
- source/document/channel of the quote.

v0.17 does not provide a fake quote-upload control.

## Truth boundaries

The evaluator explicitly reports false for:

```text
isEligibility
isApproval
isApprovalProbability
isBankMatch
isMarketQuote
isCostRanking
```

The public UI also states that the result is not:

- eligibility;
- preapproval;
- approval;
- approval probability;
- bank matching;
- lender ranking;
- a market quote;
- a cost ranking.

No bank names or current market rates are inserted into the explorer.

## Anonymous-first boundary

The substantive result is available without:

- name;
- email;
- phone;
- ID number;
- employer;
- income documents;
- bank statements;
- bureau authorization;
- central-risk query;
- exact property address.

## Public route

`/comprar/financiacion`

Flow:

`ownership preference → payment-behavior preference → structure orientation → denomination orientation → facts to verify → real-quote checklist`

The route is statically generated.

## Quality gate

Green code/test head:

`5a750651f80de5b9bb738af792693c7369fc3eeb`

CI run:

`33037321293`

Results:

- TypeScript: **PASS**;
- domain test files: **25/25 PASS**;
- domain tests: **284/284 PASS**;
- Financing Structures domain tests: **18/18 PASS**;
- Home Readiness domain tests: **21/21 PASS**;
- Next production build: **PASS**;
- `/comprar/financiacion`: static route generated successfully;
- Playwright E2E: **134/134 PASS**;
- desktop Chromium: **PASS**;
- mobile 390 px: **PASS**;
- unknown-preference no-winner invariant: **PASS**;
- leasing/UVR acceptance without automatic winner: **PASS**;
- no fake bank/approval/match claims in tested result: **PASS**;
- no horizontal overflow in primary financing-structures result: **PASS**.

## Out of scope / still not live

- bank/product marketplace;
- lender matching;
- bank-specific eligibility;
- prequalification/preapproval/approval;
- current market-rate ingestion;
- live lender offers;
- actual quote ingestion/reconciliation;
- total-cost comparison across real quotes;
- Open Finance;
- bureau integrations;
- subsidy eligibility;
- authentication/profile persistence;
- productive VIVIENDA Supabase project;
- payment/application submission;
- production deployment.

## Product implication

The prospective-buyer journey now has three bounded layers:

1. **Affordability** — what range can I reasonably plan/model?
2. **Readiness** — what is ready, incomplete or worth strengthening?
3. **Financing Structures** — which contractual/denomination structures are worth exploring before comparing actual offers?

The next finance slice should not jump directly to a bank marketplace.

A coherent next layer is a **real-quote comparator using quotes supplied by the user**, with normalization of date, rate convention, term, insurance, one-off costs, cash requirement and purchase-option economics where relevant.

That future comparator must preserve a strict distinction between:

- a quote supplied by the user;
- a quote verified from evidence;
- a lender offer obtained through an integration;
- final approval.

`Compra Segura` remains a separate candidate in the Buy domain and should not be conflated with financing comparison.
