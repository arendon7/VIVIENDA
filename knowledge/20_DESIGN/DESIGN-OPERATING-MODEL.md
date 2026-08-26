# VIVIENDA — Design Operating Model

Status: Foundation V0.1  
Date: 2026-08-25

## Objective

Produce a product that is simultaneously:

- unusually clear for a complicated financial/legal domain;
- commercially strong;
- visually distinctive without looking speculative or gimmicky;
- accessible and mobile-first;
- fast enough to feel trustworthy;
- scalable as new calculators, journeys, products and legal workflows are added.

The operating model prevents aesthetic iteration from outrunning product truth.

## 1. Design philosophy

### Reduce uncertainty before trying to impress

Housing finance has high perceived risk and low user confidence. A beautiful interface that hides assumptions is worse than a plain interface that explains them.

Design hierarchy:

1. understanding;
2. confidence;
3. control;
4. action;
5. expression.

Expression matters, but only after the first four.

### Value before capture

The default acquisition pattern is:

**small input → useful output → explanation → optional personalization → sensitive data only when needed**

not:

**identity → phone → document → promise of future value**.

### Calm competence

The product should feel more like a trusted decision instrument than a call-center funnel.

Working visual qualities:

- warm rather than cold-bank;
- precise rather than corporate-bureaucratic;
- premium rather than luxurious;
- technological rather than futuristic;
- optimistic without selling a dream;
- financially rigorous without becoming a spreadsheet.

These are hypotheses until visual discovery validates them.

## 2. Surface taxonomy

### Persuade

Examples:

- home;
- campaign landing;
- product/service pages;
- education-to-conversion pages.

Success = user understands relevance, trusts the proposition and begins a useful task.

### Operate

Examples:

- calculator;
- Home Profile;
- comparison;
- Mortgage Twin;
- dashboard;
- case tracker;
- upload/review flows.

Success = user completes a task accurately with minimum unnecessary cognitive load.

### Read

Examples:

- guides;
- law/financial explainers;
- methodology;
- FAQs;
- glossary.

Success = user understands a concept and can connect it to an action.

## 3. Mandatory phases

### Phase A — Problem framing

Required artifact:

- user job;
- trigger;
- current workaround;
- risk/fear;
- desired outcome;
- business value;
- product metric;
- legal/financial constraints.

Do not design screens yet.

### Phase B — Flow contract

Define:

- entry points;
- steps;
- required vs optional data;
- first-value moment;
- error and recovery paths;
- cancellation/back paths;
- human-review boundary;
- conversion moments;
- analytics events.

Output may be Mermaid/FigJam before visual design.

### Phase C — Content-first wireframe

Design hierarchy with real labels and realistic numbers.

Rules:

- no lorem ipsum;
- no decorative illustrations used to hide unresolved hierarchy;
- show mobile and desktop structure;
- include loading/error/empty states for critical flows;
- identify assumptions/disclosures inline.

### Phase D — Visual direction exploration

For major public launch surfaces, create 2–3 intentionally different directions, not cosmetic color variants.

Each direction must specify:

- conceptual idea;
- typography behavior;
- color role;
- image/illustration approach;
- layout grammar;
- motion grammar;
- trust implications;
- accessibility implications;
- implementation complexity.

Choose one direction and encode it into `DESIGN.md` before propagation.

### Phase E — Representative vertical slice

Before designing the whole product, validate one representative set:

1. home/landing;
2. one free calculator;
3. one multi-step profile flow;
4. one dashboard/Mortgage Twin state;
5. mobile variants.

If the system works across Persuade + Operate, then propagate.

### Phase F — Component system

Establish:

- primitive tokens;
- semantic tokens;
- typography scale;
- spacing/radius/elevation rules;
- form controls;
- button/action hierarchy;
- cards only where cards are semantically useful;
- result/metric patterns;
- disclosures/provenance patterns;
- chart/data patterns;
- feedback and status patterns.

Use `building-components` and Vercel composition patterns.

### Phase G — Implementation

Engineering requirements:

- type-safe domain inputs;
- separation of server/client responsibilities;
- explicit loading/error states;
- no unverified calculation logic embedded casually in components;
- shared domain functions for simulations;
- URL/shareable state where appropriate for free calculators;
- instrumentation hooks defined with the flow.

### Phase H — Acceptance

A critical flow must pass:

- functional tests;
- mobile/desktop inspection;
- keyboard path;
- accessibility audit;
- performance review;
- trust/claims audit;
- independent visual review;
- analytics sanity check.

## 4. Skill routing

### Discovery / shaping

- local Product context
- Impeccable `shape`
- specialist product UX reasoning

### Offer

- product-marketing-context
- Offers
- CRO methodology

### Forms

- Form CRO
- UX writing
- Vercel Web Guidelines
- accessibility specialist

### Activation

- Onboarding CRO
- Impeccable onboarding/hardening

### Marketing visual direction

- Impeccable
- Taste
- Microsoft review

### Product UI

- building-components
- composition patterns
- Impeccable
- Microsoft review

### Polish/motion

- Emil/design engineering
- Make Interfaces Feel Better

### Technical acceptance

- Vercel Web Guidelines
- React Best Practices
- accessibility
- E2E
- SEO for public surfaces

## 5. UX rules for money

### Show denominators and horizons

Do not show “save $40M” without explaining period and assumptions.

### Separate nominal from comparable value

Where inflation/time value materially changes interpretation, identify methodology rather than pretending all totals are directly comparable.

### Avoid payment-only optimization

A lower monthly payment can increase total cost. Comparison should expose both when relevant.

### Scenario naming

Prefer action-oriented labels:

- Keep current loan
- Pay $200k extra monthly
- Make a $10M prepayment
- Compare transfer options

Avoid opaque labels like Scenario A/B unless used secondarily.

### Editable assumptions

Users should be able to see/edit assumptions used to generate a simulation.

### Provenance

Material numbers should carry source or calculation explanation on demand.

## 6. UX rules for legal information

### Layer complexity

Primary layer: plain-language consequence.

Secondary layer: why / legal basis / methodology.

Professional layer: detailed rule, source and case-specific reasoning where appropriate.

Do not dump statutes into the main task flow.

### Preliminary vs verified

Automated screening must clearly show when lawyer verification is required.

### Urgency

Only show urgent treatment when the user's facts imply a real deadline or procedural risk.

## 7. Forms and progressive commitment

### Level 0 — no identity

Use for basic calculators where possible.

### Level 1 — lightweight account

Use when saving or continuing adds real value.

### Level 2 — financial profile

Request only fields needed for personalization and explain the purpose.

### Level 3 — documents

Request extract/contract only when precision materially improves.

### Level 4 — professional engagement

Identity/representation/contracting requirements belong here, not at first click.

## 8. Mobile principles

Assume acquisition traffic is mobile-heavy.

- one primary task per viewport;
- numeric keyboard for numeric inputs;
- currency formatting without fighting cursor input;
- sticky action only when it improves completion and does not cover content;
- avoid horizontal data tables; provide comparative cards/rows or controlled horizontal access with accessible alternative;
- allow save/resume for longer flows;
- uploads must work from camera/files;
- summaries before detail.

## 9. Motion principles

Motion intensity varies by mode:

- Persuade: moderate, brand-defining but restrained by trust context;
- Operate: low, mostly causal/state-based;
- Read: minimal.

Never animate money values in a way that exaggerates magnitude or masks recalculation.

## 10. Working visual hypothesis

Do not freeze yet, but explore a world built around:

- warm neutral base;
- high-contrast typography;
- one controlled accent;
- extremely legible financial numbers;
- tactile but restrained surfaces;
- real diagrams/data instead of stock fintech imagery;
- occasional home/life imagery only when it contributes emotionally;
- no neon finance aesthetic;
- no law-firm navy-and-gold cliché;
- no “AI purple” default.

Potential memorable motif to explore:

**The Path / Horizon** — visual language around progression from uncertainty to a clearer financial route, using line/path structures that can become charts, progress indicators and brand geometry without turning into literal house icons everywhere.

This is a discovery hypothesis, not a design decision.

## 11. Metrics by surface

### Landing

- task-start rate;
- qualified continuation rate;
- bounce/engagement by channel;
- trust-question interactions.

### Calculator

- completion rate;
- time to result;
- result comprehension proxy;
- save/personalize rate;
- next-action rate.

### Profile

- step completion;
- abandonment by field;
- profile completeness;
- activation time.

### Upload

- upload success;
- extraction confidence;
- correction rate;
- abandonment;
- time to verified data.

### Dashboard

- opportunity engagement;
- return rate;
- alert action rate;
- comprehension/support events.

## 12. Design debt policy

A visual change does not justify a new parallel styling layer by itself.

When patterns repeat:

- consolidate token;
- create semantic component;
- document usage;
- migrate representative surfaces;
- then propagate.

Do not let iterative AI work create CSS sedimentation.

## 13. Freeze gates

### Product freeze

Jobs, outputs and claims are stable enough to design.

### UX freeze

Critical paths and recovery states have been tested/reviewed.

### Visual freeze

Representative vertical slice works across Persuade/Operate/mobile.

### Release freeze

Automated tests + accessibility + performance + trust + visual review pass.

No freeze is permanent; changes require evidence and a decision log entry.