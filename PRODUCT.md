# VIVIENDA — Product Context

Status: Foundation V0.1  
Date: 2026-08-25

## Product thesis

VIVIENDA is a Colombian housing-finance decision and execution platform.

It helps people make better financial and legal decisions throughout the lifecycle of a home:

**Prepare → Buy → Finance → Manage → Optimize → Protect**

The product should become the place a user consults before making a material decision involving the financing or legal protection of their home.

## What VIVIENDA is not

VIVIENDA is not primarily:

- a property-listing portal;
- a bank;
- a lender;
- a credit bureau;
- a generic financial comparison site;
- a law-firm landing page;
- a “Ley 546 trick” website.

Those boundaries keep the initial product focused.

## Core strategic wedge

The initial wedge is the user who already has a housing loan and asks:

> “Am I paying for my home in the best way available to me?”

This user offers:

- real financial data;
- immediate measurable value opportunities;
- year-round optimization use cases;
- potential purchase-of-portfolio monetization;
- legal-service demand when something goes wrong;
- a natural reason to maintain a long-term relationship.

A secondary acquisition path serves users preparing to buy a home through free calculators and eligibility/preparation tools.

## Lifecycle domains

### 1. Prepare

Questions:

- How much home can I reasonably afford?
- Is buying now a good decision for me?
- How much should I save for the down payment?
- What monthly housing cost is sustainable?

Candidate tools:

- affordability calculator;
- buy vs. rent;
- real monthly home-cost calculator;
- Home Readiness Index;
- benefits/subsidies discovery.

### 2. Buy

Questions:

- Is this transaction safe?
- What should I review before signing?
- What legal and closing costs exist?

Candidate capabilities:

- buying checklist;
- promise-of-sale review;
- title/ownership review routes;
- transaction cost estimation;
- document workspace.

VIVIENDA should not become a property-listing marketplace in the initial phases.

### 3. Finance

Questions:

- Mortgage or leasing?
- COP or UVR?
- Which financing route fits my profile?
- Which option is best after considering total cost and risk?

Candidate capabilities:

- mortgage simulation;
- COP vs. UVR education/simulation;
- mortgage vs. leasing comparison;
- personalized compatibility/profile;
- bank/product comparison;
- application/origination handoff where legally and commercially appropriate.

### 4. Manage

Questions:

- What is happening with my loan?
- How much principal, interest and insurance am I paying?
- What will the loan cost if nothing changes?

Core concept:

**Mortgage Twin** — a digital model of the user's housing obligation built from user data, documents and later connected financial data when available.

Candidate capabilities:

- current state;
- amortization visualization;
- document vault;
- payment/event history;
- reminders;
- provenance for every material number.

### 5. Optimize

Questions:

- Should I prepay?
- Should I shorten term or reduce installment?
- Should I negotiate or transfer the loan?
- Should I review insurance?
- Does annual restructuring deserve analysis?

Candidate engines:

- prepayment scenarios;
- portfolio-transfer comparison;
- rate/market opportunity monitoring;
- insurance optimization;
- Law 546 annual restructuring screening;
- decision engine comparing actions, not merely products.

### 6. Protect

Questions:

- Did the lender apply a payment incorrectly?
- Was a request improperly denied?
- Is a charge unexplained or inconsistent?
- I am falling behind — what should I do?
- I received collection/legal action — what route exists?

Candidate capabilities:

- issue classification;
- guided evidence collection;
- complaint/reclamation workspace;
- escalation routing;
- lawyer handoff;
- professional legal engagement separated from ordinary platform acquisition and financial-service monetization.

## Core platform objects

### User / Household
Identity, household composition and preferences.

### Home Profile
Progressively built financial profile relevant to home decisions.

### Property Goal
Desired or existing home context.

### Financing Scenario
A modeled credit/leasing scenario with assumptions and provenance.

### Housing Loan
Current housing credit or leasing obligation.

### Mortgage Twin
Longitudinal digital representation of that obligation.

### Opportunity
A detected possible action such as prepayment, transfer, renegotiation, insurance review or legal review.

### Case
A structured execution workflow when the user chooses to act.

### Document
Uploaded/source material with metadata, extraction state and retention controls.

### Consent
Purpose-specific authorization with scope and validity.

## Decision architecture

The long-term system should separate four engines:

### Event Engine
Detects that something materially changed or a relevant window opened.

### Decision Engine
Compares available actions and explains tradeoffs.

### Execution Engine
Turns a chosen action into a guided workflow.

### Rights Engine
Maps verified legal/contractual rights and detects potential inconsistencies requiring review.

These engines must remain separable so financial recommendations do not silently become legal conclusions.

## Two user-facing indices

### Home Readiness Index
For prospective buyers. Measures preparation, not bureau credit score and not bank approval.

Candidate dimensions:

- income stability;
- current obligations;
- down-payment readiness;
- housing-cost burden;
- target-price fit;
- document readiness.

### Loan Health
For existing borrowers. Measures relative health/opportunity, not default risk scoring.

Candidate dimensions:

- rate competitiveness;
- payment burden;
- remaining term;
- modality exposure;
- insurance/cost review;
- prepayment opportunity;
- transfer opportunity;
- unresolved anomalies.

Exact formulas require separate domain contracts and validation before release.

## Trust model

Every output must carry provenance and type.

Types include:

- user-declared data;
- document-extracted data;
- public market/reference data;
- calculated value;
- estimate;
- scenario simulation;
- platform recommendation;
- third-party offer;
- third-party decision;
- automated legal screening;
- professional legal conclusion.

Never blur these categories visually or linguistically.

## Freemium value ladder

### Free / no account where possible

- basic affordability;
- buy vs. rent;
- mortgage payment;
- real home cost;
- prepayment impact;
- educational comparisons.

### Free account

- saved simulations;
- Home Profile;
- Loan Health snapshot;
- document checklist;
- alerts/preferences;
- personalized comparison.

### Connected/document-backed value

- precise Mortgage Twin;
- document extraction;
- monitoring;
- personalized optimization opportunities.

### Monetizable execution

Potentially:

- qualified financial-product/application pathways;
- portfolio transfer;
- insurance/adjacent partnerships;
- paid financial optimization;
- transaction legal services;
- legal complaints, negotiation or litigation.

Every monetization path requires its own legal/commercial validation before implementation.

## Primary activation moments

Prospective buyer:

> “I understand what range I can sustainably target and what I should improve next.”

Existing borrower:

> “I understand my loan and can see at least one quantified scenario/action I did not have before.”

Problem case:

> “I understand what kind of issue I have, what evidence matters and what the next legitimate route is.”

## Product principles

1. Decisions over products.
2. Total cost over headline installment.
3. Explainable calculations over black-box scores.
4. Value before sensitive-data capture.
5. Self-service when the user can safely do it alone.
6. Paid help where expertise or execution genuinely adds value.
7. Long-term relationship over one-off lead capture.
8. Human verification at consequential legal boundaries.
9. Mobile-first for acquisition and simple workflows.
10. Trust is a conversion strategy, not only a compliance requirement.

## Non-goals for MVP

Do not initially build:

- real-estate listings marketplace;
- own lending balance sheet;
- formal bureau score;
- native mobile application;
- complete Open Finance integration;
- all Colombian housing subsidies;
- every bank and every credit product;
- full insolvency/litigation automation;
- broad consumer-credit comparison outside housing.

## Initial MVP hypothesis

The MVP should prove that users will:

1. use a free housing-credit tool;
2. understand and trust its outputs;
3. progressively provide enough information to create a useful Home Profile or Mortgage Twin;
4. return or continue when an opportunity is identified;
5. convert into an execution path when real value exists.

Detailed scope will be frozen only after journey/offer validation.