# VIVIENDA — MVP Scope V0.1

Date: 2026-08-25
Status: Proposed foundation scope; validate before implementation freeze.

## MVP objective

Prove that a Colombian user can obtain credible value from VIVIENDA before a sales interaction, trust the explanation enough to progressively provide more data, and convert into a legitimate next action when one exists.

The MVP is not intended to prove every future business line.

## Primary wedge

### Existing housing-loan borrower

Core job:

> “Help me understand whether I am paying my housing loan in the best way and what I should do next.”

The MVP should be unusually good at moving this user through:

**quick estimate → precise loan model → opportunity → action**

## Secondary acquisition path

### Prospective buyer

Core job:

> “Help me understand what home I can sustainably target and what I should improve before financing.”

This path should establish future acquisition potential without consuming the majority of MVP complexity.

## MVP public information architecture

### Home

Purpose:

- explain category and trust proposition;
- route user by intent;
- start a useful tool rather than generic lead form.

Primary intents:

- I already have a housing loan;
- I want to buy a home;
- I am having trouble paying;
- I want to understand a topic.

### Existing-loan entry

Working task:

**Check the health of your housing loan.**

First result requires minimal financial inputs and no mandatory identity.

### Prepayment calculator

Purpose:

- demonstrate immediate value;
- transparently explain why term/interest changes when principal is repaid earlier;
- provide a natural next step into precise loan analysis.

### Affordability calculator

Purpose:

- provide sustainable purchase range;
- acquire prospective buyers;
- route into Home Profile.

### Education hub

Initial high-intent topics:

- What Ley 546 actually does;
- prepayment and term reduction;
- COP vs UVR;
- mortgage vs leasing;
- portfolio transfer;
- what to do when payment becomes difficult.

Content must route to a relevant tool, not a generic contact form.

## MVP authenticated product

### Account

Minimum capabilities:

- sign in/sign out;
- basic profile;
- consent/preferences;
- saved simulations.

Avoid collecting full identity unless a later execution route requires it.

### Home Profile

Progressive profile, not one long application.

Initial fields only as required by chosen journey.

### Mortgage Twin V1

Minimum:

- manually confirmed current balance;
- payment;
- term;
- modality;
- rate when available;
- insurance/other costs when extractable;
- source/provenance per field;
- date of information;
- user-correction capability.

### Document upload V1

Support:

- PDF/image statement;
- upload status;
- extraction attempt;
- confidence/unknown fields;
- user confirmation/correction;
- retention/purpose explanation.

Do not require full OCR automation accuracy for MVP launch; human-assisted verification is acceptable behind the scenes if clearly controlled.

### Loan Health V1

Initial dimensions:

1. Current structure understanding
2. Prepayment opportunity
3. Rate/market comparison readiness
4. Portfolio-transfer comparison readiness
5. Annual restructuring screening
6. Possible inconsistency / needs review

The MVP need not fully automate every dimension. A dimension can state “not enough information” rather than manufacture a result.

### Opportunity detail

For each detected opportunity show:

- action;
- expected effect;
- assumptions;
- confidence/precision;
- user effort;
- costs if known;
- DIY path if valid;
- assisted path if available.

### Case / execution tracker V1

Only for one or two initial assisted pathways.

Recommended first candidates:

- precise optimization study / guided prepayment plan;
- portfolio-transfer assistance or lead handoff if partner/business model is validated;
- legal review handoff for identified issue.

Do not build a universal workflow engine before one route is proven.

## Legal screening in MVP

### Ley 546

Include:

- education;
- distinction between art. 17.8 prepayment and art. 20 restructuring;
- annual restructuring preliminary screening;
- clear Jan-Feb special-window context;
- human review boundary.

Do not output “you qualify” as definitive legal conclusion.

### Legal problem triage

Include basic classifier for:

- payment applied incorrectly;
- unexplained charge;
- denied/unclear request;
- payment difficulty;
- collections/legal notice.

Output next-step classification and evidence checklist.

Full litigation/insolvency workflows are out of MVP.

## MVP calculators

### Required

1. Prepayment / finish sooner
2. Basic housing-loan snapshot
3. Sustainable affordability

### Strong candidate after core

4. Buy vs rent
5. Real monthly ownership cost
6. COP vs UVR scenario explainer

Do not launch ten mediocre calculators simultaneously.

## MVP bank coverage

Do not hardcode an unsupported promise of full Colombian-bank integration.

For V1:

- support generic manual/document-backed analysis across housing loans;
- create bank-specific adapters only where verified operational differences matter;
- prioritize highest-volume/strategically relevant institutions based on research and user data.

Candidate initial adapters to investigate:

- Bancolombia;
- Davivienda;
- Banco Caja Social;
- BBVA;
- FNA.

Coverage requires a separate current-process research artifact.

## Data provenance requirements

Every material field should store:

- value;
- source type;
- source document/URL if applicable;
- effective/cutoff date;
- extraction confidence when machine-derived;
- user-confirmed status;
- last updated timestamp.

This is a product requirement, not an optional technical detail.

## Calculation architecture requirements

No financial calculator logic should live only inside presentation components.

Each calculation needs:

- domain contract;
- units;
- formula/model;
- assumptions;
- edge cases;
- rounding policy;
- test vectors;
- disclosure text;
- version identifier where methodology may change.

## Analytics events for MVP

At minimum instrument:

- landing_intent_selected;
- calculator_started;
- calculator_completed;
- first_value_seen;
- assumptions_opened;
- save_result_clicked;
- account_started/completed;
- upload_started/completed/failed;
- extraction_corrected;
- loan_health_viewed;
- opportunity_opened;
- diy_path_selected;
- assisted_path_selected;
- legal_review_selected;
- journey_abandoned with stage where ethically/technically appropriate.

Do not send sensitive financial field values to generic analytics platforms unless explicitly designed and permitted.

## MVP success metrics

Before launch, establish exact targets. Directionally measure:

### Acquisition quality

- tool start rate by source;
- tool completion rate;
- qualified first-value rate.

### Trust / activation

- result-to-personalization rate;
- statement-upload willingness after first value;
- extracted-data confirmation rate;
- support/confusion events.

### Business

- opportunity-to-action rate;
- assisted-path conversion;
- qualified financial-partner conversion where applicable;
- legal-review conversion where factually appropriate.

### Product quality

- calculation error rate;
- extraction correction rate;
- accessibility defects;
- Core Web Vitals;
- critical-flow test pass rate.

## Explicit non-goals

MVP will not include:

- property search/listing marketplace;
- own loan underwriting/approval;
- formal credit bureau score;
- complete bank API integrations;
- native mobile apps;
- automated legal representation;
- general consumer debt marketplace;
- broad insurance marketplace;
- all Colombian subsidy programs;
- fully autonomous AI financial/legal advisor.

## Release gates

### Gate 0 — Legal/business model

Validate:

- marketing/commercial vs legal-fee compensation boundaries;
- data/consent architecture;
- language for simulations/recommendations;
- financial-partner/referral structure before activating monetized integrations.

### Gate 1 — Domain contracts

Validated formulas and legal classification rules for launched features.

### Gate 2 — UX evidence

At least lightweight testing of primary borrower and buyer flows using realistic scenarios.

### Gate 3 — Visual system

Representative vertical slice approved across marketing + product + mobile.

### Gate 4 — Engineering quality

Critical functional, accessibility, responsive and performance checks pass.

### Gate 5 — Trust review

No material output blurs simulation/estimate with external approval or guaranteed legal/financial outcome.

## Recommended implementation sequence

1. Foundation/governance
2. Research + IA + copy/offer
3. Calculation contracts
4. Low-fi borrower tool
5. Visual direction + design system slice
6. Public home + prepayment/loan-health entry
7. Account/profile
8. Document upload + Mortgage Twin V1
9. Loan Health/opportunity detail
10. One assisted execution path
11. Buyer affordability path
12. Content/SEO expansion

This sequence deliberately proves value before building marketplace breadth.