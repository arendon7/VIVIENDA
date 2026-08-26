# VIVIENDA — Warm Path Component Contracts V0.1

## Purpose
Define the behavioral, semantic and visual contract for the first reusable product components before frontend implementation.

These components are not generic UI primitives. They encode product truth and therefore must remain consistent across calculators, Mortgage Twin, marketplace and legal flows.

## 1. DecisionResult

### Job
Tell the user what VIVIENDA observed, what action deserves attention first, why, and how certain that conclusion is.

### Required slots
- eyebrow/context;
- outcome heading;
- interpretation;
- precision level C0–C3;
- primary evidence;
- recommended next action;
- alternate action;
- methodology/source affordance when relevant.

### Forbidden
- approval language unless a third party actually approved;
- guaranteed future savings;
- recommendation without an explanation;
- urgent styling when no urgency exists.

### Mobile
Recommendation precedes supporting details. Evidence may collapse, but precision status cannot disappear.

## 2. ScenarioPath

### Job
Show how a user decision changes the modeled financial trajectory.

### Structure
`baseline → intervention → modeled result`

Each node must expose:
- label;
- value;
- semantic type;
- provenance/precision;
- optional time marker.

### States
- baseline;
- active decision;
- modeled projection;
- verified state;
- alternate branch;
- unavailable/insufficient-data.

### Interaction
Selecting a scenario updates the result and Benefit Breakdown together.

### Motion
A path may animate only to clarify which value changed because of which action. Reduced-motion mode uses an immediate state swap.

## 3. BenefitBreakdown

### Job
Prevent the product from misattributing value.

### Canonical buckets
1. user additional principal;
2. future interest avoided;
3. future insurance/other cost avoided;
4. fees/implementation cost;
5. negotiated or corrected value attributable to assistance, if applicable;
6. net modeled economic effect.

### Critical rule
`user additional principal` is never styled or labeled as platform-generated savings.

### Display
- explanatory labels before promotional totals;
- negative costs explicitly signed;
- methodology accessible;
- no donut/gauge if it hides magnitude or causality.

## 4. SourceFreshness

### Job
Answer: Where did this number/rule come from, and how current is it?

### Required
- source name;
- source class: user / document / public / partner / calculation;
- date or cutoff;
- status: current / stale / needs refresh / verified;
- optional link or methodology action.

### Visual hierarchy
Compact but never hidden inside a generic footer when it materially affects interpretation.

## 5. PrecisionBadge

### Levels
- C0 Guidance
- C1 Estimate
- C2 Modeled simulation
- C3 Document-verified

### Copy
Prefer descriptive labels over confidence percentages.

### Color
Color supplements text; never color-only.

## 6. DiyAssistedChoice

### Job
Let the user choose a viable free/self-service route or paid assistance without manipulation.

### Required variants
- DIY available;
- DIY possible but complex;
- assisted recommended;
- professional legal review required;
- third-party process only.

### Rules
- a free route cannot be visually disabled merely because it does not monetize;
- paid option must state what additional value is provided;
- legal representation begins only after the professional-service boundary.

## 7. MortgageTwinSnapshot

### Job
Provide the canonical verified overview of an existing housing obligation.

### Primary fields
- institution;
- obligation type;
- balance;
- installment;
- rate and rate type;
- pesos/UVR;
- remaining term;
- insurance/other costs;
- last document/cutoff;
- precision level.

### Opportunity layer
- priority action;
- alternatives;
- no-action state;
- issues/alerts;
- next review event.

### Path layer
Show current position in the life of the obligation and one or more plausible next decisions without implying guaranteed outcomes.

## 8. FinancialNumber

A reusable number primitive for money, rates, terms and percentages.

### Must support
- COP compact/full;
- percent EA/MV/etc. with explicit unit;
- term in months/years;
- positive/negative delta;
- source/precision adjacency;
- responsive wrapping.

### Never
- omit rate convention;
- imply exactness when input precision is low;
- use color alone for good/bad.

## 9. DocumentExtractionReview

### Job
Let users verify OCR/AI-extracted financial data before it becomes trusted input.

### Row states
- high confidence;
- needs confirmation;
- user corrected;
- missing;
- conflict with previous data.

### Required actions
- edit value;
- confirm;
- see source location when available;
- mark unknown.

### Rule
No field becomes C3 solely because AI extracted it.

## 10. OpportunityCard

### Job
Summarize a possible action without reducing it to marketing claims.

### Required
- action;
- why it surfaced;
- possible effect;
- confidence/precision;
- effort/complexity;
- whether DIY exists;
- next step.

## 11. Alert / Issue

Severity is based on consequence, not sales priority.

Canonical levels:
- info;
- review;
- attention;
- urgent.

Legal urgency must be independently justified.

## 12. Button hierarchy

- Primary: continue the currently understood decision.
- Secondary: viable alternative.
- Tertiary/text: methodology, DIY, back, learn more.
- Destructive: only for genuinely destructive actions.

Never render three equally loud CTAs.

## 13. Form controls

Every financial field requires:
- unit/context in label or suffix;
- expected format;
- sensible input mode on mobile;
- clear validation;
- `No sé` when realistic;
- no silent coercion to fake precision.

## 14. Empty/loading/error states

### Loading
Explain what is being computed or verified when >300ms is perceptible. Never fake progress percentages.

### Empty
Teach what creates value next.

### Error
Preserve entered data when possible and state exactly what failed.

### Unsupported
Say why current modeling is unavailable and what additional information or human review would resolve it.

## 15. Design-system implementation order

1. typography/numeric primitives;
2. buttons/links/inputs;
3. surface/container primitives;
4. SourceFreshness + PrecisionBadge;
5. FinancialNumber;
6. DecisionResult;
7. ScenarioPath;
8. BenefitBreakdown;
9. DIY/Assisted Choice;
10. MortgageTwinSnapshot;
11. DocumentExtractionReview;
12. OpportunityCard / Alert.

Signature components should not be replaced with generic dashboard cards during implementation.