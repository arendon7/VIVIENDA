# ADR-0001 — Product Scope and Design Governance

Date: 2026-08-25
Status: Accepted for foundation

## Context

The project originated as a narrow legal-service idea around Colombia's Ley 546 de 1999. Research showed that the market opportunity is broader and that many existing providers blur several distinct mechanisms: prepayment, restructuring, portfolio transfer, insurance optimization, complaints and legal defense.

At the same time, mortgage comparison and loan origination are already served by Colombian players. Competing only as a credit comparator or as a Ley 546 landing would therefore create weak differentiation.

The project also operates in a high-trust domain where aggressive CRO, financial simulation, legal claims and visual persuasion can conflict.

## Decision

### Product category

VIVIENDA will be designed as a Colombian **housing-finance decision and execution platform**, with legal protection as a consequential layer rather than as the sole entry product.

Lifecycle:

**Prepare → Buy → Finance → Manage → Optimize → Protect**

### Initial strategic wedge

The first commercial wedge is the existing housing-loan borrower asking whether their current financing is still the best available decision.

A secondary acquisition track serves prospective buyers with free tools and progressively builds a Home Profile.

### Differentiation

VIVIENDA will compete primarily on:

1. decision intelligence rather than product listings;
2. transparent source/assumption provenance;
3. longitudinal Mortgage Twin;
4. event/opportunity detection;
5. execution from recommendation into action;
6. integrated but clearly separated legal-protection routes;
7. trust-first self-service when a user can safely act without paid help.

### Product boundaries

VIVIENDA will not initially become:

- a real-estate listing portal;
- a lender;
- a credit bureau;
- a broad all-credit comparison site;
- a law-firm-only website;
- a native mobile app;
- a full Open Finance data aggregator before ecosystem readiness.

### Design governance

External skills are specialist lenses, not authority.

Precedence:

1. verified legal/financial/product truth;
2. privacy/security/ethics/accessibility;
3. calculation and domain contracts;
4. UX/customer journey;
5. conversion/content;
6. design system/craft;
7. external skills;
8. aesthetic preference.

### Trust requirement

Every consequential output must distinguish its type:

- fact;
- user-declared data;
- extracted data;
- estimate;
- simulation;
- recommendation;
- third-party offer;
- third-party approval;
- automated legal screening;
- professional legal conclusion.

### Growth requirement

VIVIENDA can use marketing, affiliates, influencers and internal commercial teams for platform and financial-product acquisition subject to legal/commercial validation. Professional legal engagement must maintain a direct attorney-client relationship and preserve ethical restrictions around powers and legal-fee sharing.

## Consequences

### Positive

- larger market and longer user lifetime;
- multiple monetization events;
- stronger differentiation than a comparator;
- organic acquisition through utilities and education;
- ability to build proprietary longitudinal intelligence;
- clearer legal/financial trust boundaries.

### Costs

- more product complexity;
- higher data/privacy/security burden;
- need for domain-rule versioning;
- careful separation of financial/commercial/legal workflows;
- need to resist premature expansion into real estate and generic credit.

## Alternatives rejected

### Ley 546 landing only

Rejected because it is narrow, seasonal in its strongest restructuring use case, easily commoditized and susceptible to misleading market framing.

### Pure mortgage comparator

Rejected as core identity because strong competitors already compare/originate and comparison alone does not create durable user relationship.

### Full property marketplace

Rejected because it would move the project into a capital- and operations-heavy category with established competitors and little leverage from the project's legal/financial advantage.

## Revisit conditions

Revisit this ADR only if evidence shows one of the following:

- existing-borrower acquisition has materially weaker economics than prospective-buyer acquisition;
- partner economics make origination the dominant defensible wedge;
- users do not value longitudinal Mortgage Twin/monitoring;
- legal or financial regulation materially prevents the intended execution model;
- a new data infrastructure opportunity materially changes category boundaries.