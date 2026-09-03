---
name: housing-finance-design-orchestrator
description: Route VIVIENDA product, UX, CRO, design-engineering and frontend-quality work through the correct specialist lenses while preserving legal, financial, privacy and trust constraints.
version: 1.0.0
---

# Housing Finance Design Orchestrator

## Mission

VIVIENDA must help users make consequential housing and credit decisions with unusually high clarity and trust while still being commercially effective and visually distinctive.

The orchestrator exists to prevent three failure modes:

1. a beautiful interface that is financially or legally misleading;
2. a compliant interface that is difficult, generic or commercially weak;
3. an over-engineered interface created by applying every available skill at once.

Use the minimum specialist set that fully covers the task.

## Master scorecard

Evaluate every material surface against six questions:

### CLARITY
Can a first-time user explain what this screen does and what the main number means?

### TRUST
Can the user distinguish facts, user-provided data, simulations, estimates, recommendations and third-party decisions?

### AGENCY
Does the user understand available alternatives, including what they can do themselves without paying VIVIENDA?

### VALUE
Does the user obtain meaningful value before being asked for high-friction information, account creation, documents or payment?

### PROGRESSIVE COMMITMENT
Is every new request for data or commitment proportionate to value already delivered?

### CONVERSION WITHOUT DECEPTION
Does the interface encourage action without guarantees, hidden assumptions, misleading anchoring, fake scarcity or dark patterns?

A material failure in Trust overrides gains in conversion or aesthetics.

## Phase routing

### Phase 0 — Truth and product contract

Before design work, resolve:

- user job;
- desired decision/action;
- domain definitions;
- calculation assumptions;
- legal/financial constraints;
- data required;
- output classification: fact / estimate / simulation / recommendation / offer / legal review;
- metric or acceptance criterion.

Skills do not own this phase. Product/domain truth does.

### Phase 1 — Product UX

Use for:

- information architecture;
- journey mapping;
- task flow;
- progressive disclosure;
- recovery paths;
- state model;
- mobile-first sequencing;
- human review boundaries.

Deliverable must state:

1. user intent;
2. entry point;
3. minimum information required;
4. moment of first value;
5. next best action;
6. errors/edge cases;
7. sensitive-data boundary;
8. conversion point.

### Phase 2 — Offer and conversion

Use `offers` before copy when the underlying value exchange is not settled.

Use `form-cro` for:

- lead forms;
- calculators with progressive data capture;
- Perfil Vivienda;
- uploads;
- qualification;
- application flows.

Use `onboarding-cro` for:

- account first-run;
- activation;
- empty-state guidance;
- time-to-value;
- re-engagement of incomplete profiles.

Use `page-cro` only once the page has a defined conversion objective and traffic context.

Use CRO to remove unjustified friction, never to weaken consent, disclosures or meaningful choice.

### Phase 3 — Visual direction

#### Marketing / Persuade surfaces

Primary sequence:

1. Impeccable `shape` or new-work reasoning;
2. Taste for anti-generic direction;
3. establish/refresh local DESIGN.md;
4. implement only after direction is coherent.

Taste is not the primary skill for dashboards, data tables or multi-step product flows; its current own contract excludes those surfaces.

#### Product / Operate surfaces

Primary sequence:

1. Product UX;
2. Vercel `building-components`;
3. local design system/tokens;
4. Impeccable critique/harden;
5. accessibility specialist where needed.

Operate surfaces prioritize comprehension, stable conventions and task completion over expressive novelty.

### Phase 4 — Components and engineering

Use:

- `building-components` for accessible composable primitives/components and token architecture;
- `vercel-composition-patterns` for scalable React component APIs;
- `vercel-react-best-practices` for performance, data-fetching and rendering;
- `web-design-guidelines` as a user-facing web quality review.

Engineering invariants:

- avoid boolean-prop proliferation;
- prefer explicit variants and composition;
- centralize tokens;
- isolate client interactivity;
- avoid avoidable waterfalls;
- make loading/error states first-class;
- keep third-party scripts away from critical rendering paths when possible.

### Phase 5 — Motion

Use motion only if it improves one or more of:

- causal understanding;
- state change comprehension;
- spatial continuity;
- progress feedback;
- confirmation;
- discoverability.

For financial comparison surfaces, transitions may illustrate differences but must not manipulate perceived magnitude.

Respect reduced-motion preferences.

### Phase 6 — Review and acceptance

Required for critical flows:

1. functional journey verification;
2. Vercel Web Guidelines review;
3. accessibility/keyboard review;
4. mobile + desktop responsive inspection;
5. performance review;
6. Impeccable audit/polish as appropriate;
7. Microsoft independent review using frictionless/craft/trust pillars;
8. claims/truth review.

Stop after bounded correction passes; do not perform endless aesthetic polishing.

## Surface-specific routing

### Home / campaign landing

`truth → product marketing context → offers → page/form CRO → Impeccable → Taste → web-design-guidelines → Microsoft review`

Optimize for:

- five-second comprehension;
- one dominant next step;
- trust before sensitive capture;
- proof without fabricated evidence;
- strong mobile rhythm;
- distinctive but regulated-industry-appropriate visual identity.

### Free calculator

`truth/calculation contract → Product UX → form-cro → building-components → web-design-guidelines → accessibility → Impeccable`

Golden rule: do not gate the first meaningful result behind account creation unless technically necessary.

### Perfil Vivienda

`domain schema → Product UX → form-cro → UX writing → onboarding-cro → building-components → accessibility`

Golden rule: progressively enrich the profile instead of presenting a giant application form.

### Credit comparison

`data provenance → decision model → Product UX → building-components → Impeccable → trustworthy review`

Must visually distinguish:

- public/reference rate;
- personalized estimate;
- real offer;
- final approval.

Do not rank solely by monthly payment when total cost or risk changes materially.

### Mortgage Twin / Salud del Crédito

`domain contract → Product UX → component system → Impeccable → Vercel → Microsoft`

Priorities:

- current state first;
- opportunities second;
- provenance for each number;
- explanatory drill-down;
- actionability without alarmism.

### Legal escalation

`legal route truth → Product UX → UX writing → forms/accessibility → trust review`

Automated output must be labeled preliminary when professional verification is required.

### Upload / OCR

`data minimization → privacy contract → Product UX → form UX → error/recovery design`

Must support:

- supported formats;
- progress;
- extraction confidence;
- user correction;
- partial failure;
- deletion/retention explanation.

## Anti-patterns specific to VIVIENDA

Reject by default:

- “Te aprobamos” when a third party decides;
- “Te ahorramos X” when X is mostly generated by additional capital the user contributes;
- “Aplica Ley 546” as a definitive automated legal conclusion;
- a fake credit score presented as if it were Datacrédito/TransUnion;
- rate cards without date/provenance;
- default purple/blue AI gradient fintech visual language without brand reason;
- three equal cards as universal information architecture;
- asking phone/cédula before first value;
- hidden marketing consent inside essential product consent;
- disabled-looking text links with poor contrast;
- charts without accessible numeric alternatives;
- urgency based on unverified deadlines.

## Required design artifacts

As the project matures, maintain:

- `PRODUCT.md` — durable product context;
- `DESIGN.md` — current visual language and tokens;
- `.agents/product-marketing-context.md` — positioning/growth context;
- surface briefs for major flows;
- calculation/domain contracts;
- design decision log;
- experiment log.

Do not create DESIGN.md by aesthetic guesswork before discovery establishes a credible visual direction.

## Completion definition

A surface is not done because it looks polished. It is done when:

- the user can complete the intended task;
- outputs are truthful and appropriately qualified;
- important alternatives are understandable;
- mobile experience is first-class;
- keyboard/accessibility requirements pass;
- latency/performance is acceptable;
- conversion friction is intentional;
- errors and edge states are handled;
- design is coherent and distinctive;
- independent review finds no blocking trust issue.