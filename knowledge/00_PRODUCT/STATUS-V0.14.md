# STATUS v0.14 — Journey 3 / Payment Pressure

Date: 2026-08-26
Branch: `product/payment-pressure-v0.14`
Base: v0.13 `1dd5ab2dba7d57911f3aee4f3f6fd11dcc401b64`

## Objective

Add a public, calm and evidence-oriented path for borrowers under payment pressure without turning ordinary difficulty or collections into automatic legal conversion.

Public route:

`/ayuda`

Core promise:

**Entiende qué tan urgente es y qué puedes hacer ahora.**

## Architecture

v0.14 introduces a thin triage layer:

`Declared payment state → Payment Pressure Triage → Opportunity Router → contextual next action`

Responsibilities remain separate:

- Payment Pressure Triage owns urgency/evidence/next-action presentation;
- Opportunity Router remains the source of mortgage/legal route eligibility;
- Case Plan/State are not expanded for ordinary lender contact;
- R7 assisted execution remains the contextual Mortgage Audit path;
- R10 remains professional/judicial review and is not sent to the R7 audit.

## Domain inputs

- product type;
- canonical payment state;
- material economic change: yes/no/unknown;
- next payment outlook;
- explicit inconsistency signal when separately reported.

No identity/contact/document is required for first result.

## Urgency states

- `preventive` — current credit with payment pressure/risk but no judicial state;
- `prompt_action` — early arrears / collections / prelegal;
- `professional_review` — explicit inconsistency such as R7 without procedural urgency;
- `procedural_urgency` — executive / embargo-or-auction report;
- `needs_information` — stage cannot yet be classified.

Precedence:

`procedural_urgency > professional_review > prompt_action > preventive > needs_information`

## Critical truth boundaries

### Collections

A collection contact is not treated as proof of a filed lawsuit.

`collections` and `prelegal` remain extrajudicial states unless a judicial process is separately reported.

Current-source record revalidated 2026-08-26:

- SFC: mora, including one installment, may trigger collection; prejudicial and judicial collection are distinct stages;
- Ley 2300 de 2023: collection contacts are subject to authorized-channel, timing and frequency rules.

v0.14 does not conclude a collection-practice violation from self-report alone.

### Judicial state

When the user reports an executive process or embargo/auction-stage event:

- R10 dominates;
- result is `procedural_urgency`;
- CTA goes to `/verificar` for the document first;
- no procedural deadline is calculated from self-reported dates;
- no defense is automated.

### Inconsistency

Only an explicit reported charge/allocation/contract discrepancy activates R7 context.

R7 may expose `/auditoria-hipotecaria` contextually.

High installment, UVR, arrears or collection alone do not infer irregularity.

### Article 20

Article 20 remains delegated to the existing Opportunity Router.

It may appear for mortgage + material economic change under its existing seasonal/legal conditions.

R10 always retains priority when a judicial state coexists.

### Leasing

Housing leasing does not inherit mortgage-specific Ley 546 procedures automatically.

## Public UX

Five-step wizard:

1. financing type;
2. current payment/collection stage;
3. material economic change;
4. next-payment outlook;
5. separately reported inconsistency.

Result hierarchy:

`urgency → declared facts → next action → evidence → opportunity routes → collection module → professional boundary`

No identity gate.

No generic legal-service grid.

## Contextual CTAs

- preventive → no attorney CTA;
- early arrears/collections/prelegal → no attorney CTA;
- R7 professional review → `/auditoria-hipotecaria`;
- R10 procedural urgency → `/verificar`;
- unknown state → classify with statement/communication first.

## Guardrails

- no fear marketing;
- no countdown;
- no automated procedural deadline;
- no guarantee of restructuring;
- no automatic illegal/unlawful conclusion;
- no attorney CTA from ordinary collections alone;
- no fake Case creation;
- no name/email/phone/ID before first result;
- urgency text is not color-only;
- mobile 390 px must not overflow horizontally.

## Current source record

Revalidated 2026-08-26:

1. Ley 2300 de 2023 — SUIN Juriscol — collection contact channels, periodicity and permitted hours.
2. Superintendencia Financiera — Honorarios de Cobranza — distinction between prejudicial and judicial collection; collection can start after mora.
3. Existing VIVIENDA Article 20 / Ley 546 / Decreto 583 contracts remain canonical for restructuring screening.

## E2E contract

Covers:

- preventive at-risk;
- early arrears;
- collections;
- prelegal;
- executive;
- embargo/auction;
- unknown stage;
- R7 inconsistency;
- R10 + R7 coexistence;
- leasing boundary;
- first-screen privacy;
- keyboard reachability;
- mobile no-overflow.

## Still out of scope

- insolvency eligibility;
- debt-settlement automation;
- court lookup;
- procedural deadlines;
- litigation strategy;
- live lawyer engagement/payment;
- lender-specific hardship programs;
- collection-practice violation classifier;
- live persistence/auth;
- automatic complaint generation.

## Next product decision after v0.14

Do not return to infrastructure automatically.

Compare:

1. Journey 4 — Financial/legal inconsistency public classifier, which can deepen R7 and reuse the existing assisted audit; versus
2. buyer progressive Home Profile, which should wait until account/persistence is justified by enough visible product value.

Current product sequencing favors finishing public journey breadth before activating horizontal account infrastructure.