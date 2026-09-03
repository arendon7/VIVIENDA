# VIVIENDA — Journey Map V0.1

Date: 2026-08-25  
Status: product hypothesis to validate with research.

## Why journey-first

VIVIENDA spans multiple moments in a housing lifecycle. The product must feel like one coherent relationship, not a collection of unrelated calculators and legal services.

The common journey grammar is:

**Trigger → Quick value → Better understanding → Optional personalization → Decision → Execution → Long-term monitoring**

## Journey 1 — Existing borrower: “Am I paying this the best way?”

### Trigger

Examples:

- sees social content about paying mortgage faster;
- hears about Law 546;
- payment feels high;
- interest rates change;
- friend transferred mortgage;
- wants to use savings for a prepayment.

### Entry surface

Primary acquisition page/tool:

**Check the health of your housing loan**

Alternative SEO/social landers may target:

- prepayment impact;
- shorten mortgage term;
- portfolio transfer;
- COP vs UVR;
- Law 546 annual restructuring.

### Step 1 — Quick input

Ask only what is needed for first useful approximation:

- current outstanding balance;
- current monthly payment;
- remaining term;
- modality if known;
- approximate rate if known.

Do not require identity or phone number.

### Step 2 — First value

Return:

- current loan snapshot;
- estimated remaining payment horizon;
- baseline cost model with explicit assumptions;
- one or more relevant scenario opportunities.

Examples:

- monthly additional prepayment;
- one-time prepayment;
- portfolio transfer worth comparing;
- insufficient data for precise rate comparison.

### Step 3 — Explain the result

For every opportunity show:

- what changes;
- why it changes;
- what the user contributes;
- what is estimated;
- limitations.

Example:

“Paying an additional COP 250,000 monthly reduces principal faster. The projected interest reduction comes primarily from your earlier capital repayment; it is not a bank discount.”

### Step 4 — Personalization offer

Prompt:

**Want a precise analysis? Add your latest statement.**

Explain benefits before upload:

- exact balance and rate extraction;
- insurance/cost visibility;
- amortization reconstruction where possible;
- more precise scenarios.

### Step 5 — Account / document

Ask minimum identity/contact required to save and continue.

Upload flow:

1. choose file/photo;
2. show security/purpose;
3. extract;
4. show fields and confidence;
5. user confirms/corrects;
6. build Mortgage Twin.

### Step 6 — Loan Health

Return categories such as:

- Current structure
- Prepayment opportunity
- Market/rate opportunity
- Insurance/cost review
- Restructuring screening
- Potential inconsistency requiring review

Use graded language, not “good/bad” moral labels.

### Step 7 — Decision

For each action:

- expected effect;
- effort;
- cost;
- user-do-it-yourself availability;
- assisted execution availability;
- confidence level.

### Step 8 — Execution

Paths:

- self-service instructions;
- assisted financial execution;
- document/checklist workflow;
- legal review when applicable.

### Step 9 — Retention

Mortgage Twin becomes persistent.

Potential future alerts:

- relevant rate changes;
- January restructuring review window;
- anniversary/payment milestones;
- document updates;
- detected opportunity changes.

### Activation event

User reaches a quantified, understandable result and identifies a legitimate next action.

### Conversion events

- precise document-backed analysis;
- assisted transfer/application;
- paid optimization;
- legal review.

### Key risks

- overpromising savings;
- confusing prepayment with legal relief;
- requesting documents too early;
- inaccurate amortization reconstruction;
- presenting market rate as user offer.

---

## Journey 2 — Prospective buyer: “What can I sustainably buy?”

### Trigger

- browsing properties;
- deciding whether to stop renting;
- planning savings;
- family/life change;
- seeing subsidized/financing content.

### Entry tool

**How much home can I reasonably afford?**

### Step 1 — Minimal inputs

- household monthly income;
- recurring debt payments;
- available down payment;
- target horizon/optional preferences.

### Step 2 — First value

Return a **sustainable range**, not an approval promise.

Show:

- estimated housing payment capacity;
- target property range;
- down-payment effect;
- major assumptions.

### Step 3 — Improve the plan

Show actions:

- save additional down payment;
- reduce monthly obligations;
- lower target property price;
- adjust purchase timeline;
- compare financing structures.

### Step 4 — Buy vs rent

Offer optional decision tool when appropriate.

Compare:

- rent;
- ownership financing cost;
- transaction costs;
- taxes/administration/maintenance;
- down-payment opportunity cost;
- expected horizon.

Do not assume buying is always superior.

### Step 5 — Home Profile

Prompt to save/personalize.

Progressively collect:

- income type/stability;
- employment/activity;
- household contributors;
- age/range where relevant;
- obligations;
- savings;
- target property.

### Step 6 — Home Readiness Index

Return explainable dimensions, not a bureau score.

Example:

- payment capacity;
- down-payment readiness;
- obligation burden;
- income/document stability;
- target-price fit.

### Step 7 — Financing comparison

Compare structures and potential products.

Every item labelled as one of:

- public/reference information;
- preliminary compatibility;
- personalized estimate;
- actual offer;
- final approval.

### Step 8 — Execution

Potential routes:

- application/partner handoff;
- document preparation;
- FNA/bank process guidance;
- legal buying checklist.

### Step 9 — Transition into homeowner lifecycle

When financing is completed, convert user to Mortgage Twin / Manage journey.

### Activation event

User knows a sustainable property target and next improvement/action.

### Key risks

- implying bank approval;
- using only regulatory maximum instead of sustainable affordability;
- ignoring ownership costs beyond mortgage payment;
- data collection overload.

---

## Journey 3 — User in payment pressure: “My payment is becoming impossible”

### Trigger

- income loss/reduction;
- household separation/change;
- increased obligations;
- accumulating arrears;
- collections communication.

### Entry surface

**Understand your options before the problem grows.**

Avoid fear-based imagery or countdown marketing.

### Step 1 — Triage

Ask:

- housing credit/leasing type;
- current status;
- number of missed payments/days if known;
- collections stage;
- legal process notification;
- approximate household income change;
- other significant debts.

### Step 2 — Urgency classification

Possible UI states:

- Preventive
- Needs prompt action
- Professional review recommended
- Procedural/legal urgency

Urgency must be evidence-based.

### Step 3 — Route candidates

Depending on facts:

- direct bank negotiation;
- restructuring analysis;
- annual Law 546 special-window screening;
- portfolio/other financial solution if still feasible;
- complaint if there is an inconsistency;
- insolvency screening;
- legal defense.

### Step 4 — Evidence checklist

Give user exact documents/data needed before asking for representation.

### Step 5 — Preliminary result

Explain:

- likely route;
- why;
- what remains uncertain;
- deadlines/urgency if verified;
- whether professional review is recommended.

### Step 6 — Professional boundary

If lawyer is needed:

- user deliberately chooses legal review;
- direct attorney-client contracting begins;
- platform acquisition/affiliate compensation does not become a share of legal fees/powers.

### Activation event

User understands urgency and next legitimate route.

### Key risks

- false reassurance;
- alarmism;
- missed procedural deadlines;
- automated definitive legal conclusions;
- ethical issues in legal lead compensation.

---

## Journey 4 — Legal/financial inconsistency: “Something is wrong with my loan”

### Trigger examples

- prepayment applied to payment amount when user requested term reduction;
- unexplained charge;
- interest/rate mismatch;
- disputed insurance charge;
- denied restructuring/request;
- contradictory lender responses.

### Entry

May originate from:

- user search;
- Mortgage Twin anomaly;
- manual issue report.

### Step 1 — Issue classifier

Ask specific factual questions rather than legal conclusions.

### Step 2 — Document/evidence collection

- instruction/request;
- statement before/after;
- lender response;
- contract/amortization docs where relevant;
- timeline.

### Step 3 — Preliminary consistency check

Output:

- what was expected;
- what appears to have happened;
- missing evidence;
- whether legal/professional review is recommended.

### Step 4 — Escalation map

Depending on verified facts:

- direct clarification;
- formal complaint;
- Consumer Financial Ombudsman route;
- SFC/judicial route;
- other professional action.

Do not present every dispute as litigation.

### Step 5 — Case tracker

If executed through VIVIENDA:

- documents;
- status;
- next action;
- response deadlines;
- lawyer notes/requests;
- outcome.

---

## Journey 5 — Content user: “I just want to understand”

Not every visitor should be pushed immediately into a sales funnel.

### Entry

SEO/social educational content such as:

- What is UVR?
- What does Law 546 actually do?
- Is prepaying a mortgage worth it?
- Mortgage vs leasing.
- What happens if I miss a payment?

### Read experience

Structure:

1. simple answer;
2. example;
3. common misconception;
4. detailed explanation;
5. relevant tool.

CTA should match intent:

- article on prepayment → prepayment calculator;
- UVR explanation → COP/UVR simulator;
- Law 546 → restructuring screener;
- buying capacity → affordability tool.

This turns content into utility rather than generic lead capture.

---

## Cross-journey design requirements

### Persistent state

A user should not re-enter known information unnecessarily.

### Explainability

Every material recommendation should expose “why this appears”.

### Exit without punishment

Back/cancel/save should be available in longer flows.

### User correction

OCR/extracted information is never unquestionable. User can confirm/correct.

### Cross-sell discipline

Only show adjacent services when triggered by user context. Avoid generic marketplace clutter.

### Human escalation

Professional review appears because the facts require it, not because the funnel needs a sale.

## Research tests required before final UX freeze

1. Can existing borrowers explain the difference between prepayment savings and negotiated/legal savings after seeing our result?
2. Do prospective buyers understand “sustainable range” vs “bank approval”?
3. At what moment are users willing to upload a statement?
4. Which trust explanations increase upload/account conversion without clutter?
5. Which terminology works better: Loan Health, Mortgage Health, Health of Your Credit, etc.?
6. Which result motivates action without making a guarantee?
7. Do users prefer DIY instructions, assisted execution, or both?
8. What information creates strongest anxiety when requested?
9. Are users comfortable with a long-term Mortgage Twin concept?
10. What content/search language do Colombian users actually use rather than our expert terminology?