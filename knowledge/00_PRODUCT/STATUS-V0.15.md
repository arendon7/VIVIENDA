# STATUS v0.15 — Journey 4 / Inconsistency Reconciler

Date: 2026-08-26
Branch: `product/inconsistency-reconciler-v0.15`
Base: v0.14 `032f8712a597f2139e8eafa561322f58f08fe753`
Green code/test head: `3dc35234c2141bf920b6585e6300f805c210530a`

## Objective

Add a public, anonymous path for a borrower who believes something in a housing loan does not match, without turning an unexplained difference into an automatic bank error, illegality claim or legal-services conversion.

Public route:

`/revisar-diferencia`

Core promise:

**Algo no te cuadra en tu crédito. Aislemos exactamente qué es.**

## Architecture

v0.15 introduces a thin reconciliation layer:

`Declared concern → factual issue classification → evidence availability → Inconsistency Reconciler → existing Opportunity Router → contextual next action`

Responsibilities remain separate:

- Inconsistency Reconciler owns factual classification, evidence checklist and reconciliation state;
- Opportunity Router remains the canonical source for R7 and R10 eligibility;
- documentary verification/reconciliation remains the source of higher evidence precision;
- Mortgage Audit remains the assisted R7 path;
- judicial-document verification remains the R10 entry path;
- no second legal-route engine was introduced.

## Domain inputs

- product type;
- payment/judicial state;
- inconsistency kind;
- whether the user can describe a specific difference;
- declared evidence availability.

No identity, contact or document upload is required for the first result.

## Inconsistency kinds

- payment allocation / prepayment application;
- contract or statement mismatch;
- rate or modality mismatch;
- insurance, fee or unidentified charge;
- balance, remaining term or installments mismatch;
- annual projection vs. actual behavior;
- missing information;
- collection charge;
- other / not yet classified.

## Reconciliation states

- `education_first` — the reported difference may first require understanding assumptions or structure;
- `needs_information` — the concern is not yet sufficiently classifiable or evidence is missing;
- `difference_to_reconcile` — a factual comparison exists but evidence/context is not sufficient for R7;
- `possible_inconsistency` — a specific mortgage difference with declared comparable sources justifies evidence review;
- `procedural_priority` — a reported judicial state takes priority over ordinary reconciliation.

Precedence:

`procedural_priority > product/evidence classification > possible_inconsistency > difference_to_reconcile / education_first`

## Critical truth boundaries

### C0 remains C0

The public wizard is based on user declarations.

Even when the user says they have two sources, v0.15 does not claim that VIVIENDA has read, extracted or reconciled those documents.

Two declared sources do not grant C2 or C3.

### Annual projection

A difference between an annual projection and actual loan behavior is not treated automatically as an inconsistency.

The first action is to compare assumptions, periods and actual behavior.

Annual projection variance alone does not activate R7.

### Unknown product

When the user does not know whether the financing is a housing mortgage, housing leasing or another product:

- mortgage-specific escalation is blocked;
- the first action is to classify the product from the statement/contract;
- a separately reported judicial state may still trigger R10 priority.

### Housing leasing

Housing leasing can be factually reconciled, but v0.15 does not copy mortgage-specific Ley 546 procedures into leasing automatically.

### R7

R7 is exposed only in a compatible mortgage context where:

- the reported difference is specific;
- the kind is compatible with claim/audit review;
- the user declares enough comparative source context.

R7 CTA:

`/auditoria-hipotecaria` — **Auditar la diferencia**

This is a screening decision, not proof of error or entitlement.

### R10

If the user reports a judicial process or advanced judicial action:

- R10 dominates R7;
- result becomes `procedural_priority`;
- CTA goes to `/verificar`;
- v0.15 does not calculate procedural deadlines;
- v0.15 does not generate a defense strategy.

### Collections

A collection charge or collection communication is not treated as proof of a judicial process.

The value can be reconciled factually without automatically alleging an unlawful collection practice.

## Public UX

Five-step wizard:

1. what does not match;
2. whether the user can identify expected vs. observed facts;
3. what evidence/sources can be compared;
4. financing type;
5. known judicial-process boundary.

Result hierarchy:

`C0/state → declared facts → next action → possible explanations → Source A vs Source B → evidence checklist → contextual R7/R10 → notices → truth boundary`

The central interaction is reconciliation, not a risk score.

## Reconciliation presentation

The result explicitly separates:

- **Fuente A — esperado / comunicado**;
- **Fuente B — aplicado / observado**.

The UI explains that differences should be comparable by concept, period, cutoff date and source before an adverse conclusion is drawn.

## Home integration

Journey 4 is exposed from Home as a secondary contextual path for a user who recognizes an unexplained charge, rate, balance or movement.

The primary existing-borrower CTA remains unchanged.

This avoids turning Home into a legal-problem marketplace.

## Guardrails

- no automatic bank-error conclusion;
- no automatic illegality/fraud conclusion;
- no automatic refund/recovery promise;
- no probability-of-winning or probability-of-error score;
- no C2/C3 from declared evidence alone;
- no mortgage-specific escalation while product type is unknown;
- no Article 20 language copied into leasing;
- no R7 when the concern is vague or evidence is insufficient;
- R10 takes priority over R7 when a judicial state is reported;
- no generic attorney CTA;
- no identity gate before first result;
- keyboard reachability preserved;
- mobile 390 px must not overflow horizontally.

## Domain verification

Final green code/test head `3dc35234c2141bf920b6585e6300f805c210530a`:

- TypeScript: PASS;
- domain tests: **245/245 PASS**;
- production build: PASS;
- E2E: **116/116 PASS** across desktop and mobile projects.

The E2E suite protects, among other things:

- annual projection education-first behavior;
- missing-information self-service path;
- vague concern does not become R7;
- specific payment-allocation mismatch can expose contextual R7;
- one-source concern remains evidence comparison;
- balance/term reconciliation requires cutoff-aware evidence;
- R10 dominance over ordinary inconsistency;
- unknown-product classification boundary;
- leasing separation from mortgage-specific procedures;
- C0 truth boundary and prohibited claims;
- anonymous first screen;
- keyboard accessibility;
- mobile no-overflow.

## E2E hardening note

During final validation two test-quality issues were found and corrected without changing product behavior:

1. evidence radio accessible names include their explanatory text, so the test now selects the radio semantically rather than requiring an exact truncated label;
2. the judicial guardrail test validates the invariant wording rather than depending on whether the sentence says “no calcula” or “tampoco calcula”.

These changes make the test suite protect semantics instead of incidental copy punctuation/phrasing.

## Still out of scope

- automatic document upload/extraction inside the public wizard;
- C3 documentary conclusion from the public wizard;
- automatic complaint generation;
- formal complaint filing;
- automatic SFC/Defensor del Consumidor Financiero escalation;
- damages/recovery calculation;
- litigation strategy;
- court lookup;
- procedural deadline calculation;
- generic lawyer marketplace;
- live account persistence solely for this route.

## Product sequencing after v0.15

The product now has meaningful public breadth across:

- existing-loan optimization;
- prospective-buyer affordability;
- payment pressure;
- financial/legal inconsistency.

The next step should not be generic authentication or CRM infrastructure by itself.

The strongest next product candidate is a progressive **Home Profile / Índice de Preparación Hipotecaria**, reusing the existing buyer-affordability engine and adding explainable dimensions that are not already represented there.

A v0.16 contract should determine first:

- which dimensions are legitimate and independently useful;
- how a 0–100 proprietary index is computed and explained;
- what remains C0/C1 from user-declared data;
- what partial result is shown before registration;
- what additional value genuinely justifies account/persistence;
- how recommendations are generated without presenting the index as DataCrédito, bank scoring or credit approval.

Only after that product contract should persistence/account infrastructure be activated.