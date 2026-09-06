# DECISION ACTION PROFILE CONTRACT — V0.23.7

Status: implementation contract

## Purpose

V0.23.7 completes the existing **Mi Decisión** comparison with the dimensions already required by the product Journey Map:

- expected effect;
- effort;
- cost;
- self-service availability;
- assisted-execution availability;
- confidence/precision.

The slice does not introduce pricing, underwriting, bank offers or a new execution service. It translates current route and Case Plan truth into a comparable action profile.

## Canonical input

Each profile is built from an existing `OpportunityRoute` plus its `asOfDate`.

`buildDecisionActionProfiles(routerResult)` creates exactly one profile for each current route.

The `DecisionObject` embeds those profiles so the UI does not independently reconstruct route truth.

## Expected effect

Expected effect is categorical and route-specific:

- R1 — shorten remaining term;
- R2 — lower payment;
- R3 — prepare a sustainable restructuring path;
- R5 — prepare/activate creditor transfer when supported;
- R7 — clarify or correct a concrete inconsistency;
- R10 — protect the user's legal position by prioritizing professional review.

The effect label describes the purpose of the route. It is never a guaranteed result.

No numeric benefit is invented by this layer. Existing modeled amounts remain owned by the financial model that earned them.

## Effort

V0.23.7 deliberately does **not** create a subjective `low / medium / high` effort score.

Effort is represented with objective signals derived from the existing Case Plan:

- user task count;
- professional task count;
- bank/third-party task count;
- conditional task count;
- evidence item count;
- unresolved external-trigger count.

This keeps the comparison explainable and auditable.

## Self-service availability

Allowed states:

### `available`

Used for R1/R2 when the current route is suitable for the supported self-service preparation/instruction path.

### `preparation_only`

The user can prepare the route and evidence, but the outcome or next act depends on a bank, third party or later review.

### `not_appropriate`

Ordinary self-service is not appropriate with the current facts, including legal-review routes and R10.

This state does not mean the user has no rights or options. It means the product must not present ordinary self-service execution as sufficient.

## Assisted availability

Allowed states:

### `mortgage_audit_preview`

Only R7 currently has a defined assisted-execution blueprint: **Auditoría Hipotecaria v0.12**.

This is a preview blueprint. It does not imply live contracting, payment, SLA or professional engagement.

### `not_productized`

No assisted execution product is currently defined for that route.

A route requiring professional review is not automatically converted into an assisted service.

## Professional review

The profile preserves the route's `humanReviewRequired` truth as:

- `required`;
- `not_required`.

This is distinct from assisted-product availability.

Example:

`R10 professional review = required` while `R10 assisted product = not_productized`.

## Cost

V0.23.7 separates three concepts.

### User capital

R1/R2 require user-funded additional principal for actual prepayment execution.

That capital:

- belongs to the user;
- is not a Casa con Criterio fee;
- is not platform-generated savings.

### Assisted-service pricing

Allowed states:

- `not_applicable` — no assisted service price is modeled for the self-service route;
- `not_quoted_preview` — a preview assisted blueprint exists but final pricing is not defined;
- `not_available_in_preview` — no productized assisted service/pricing exists here.

R7 uses `not_quoted_preview` because its v0.12 contract explicitly leaves final price/SLA/payment out of scope.

### External costs

`externalCosts = not_modeled` unless a future source-of-truth contract supports specific costs.

The Decision layer must not invent bank fees, taxes, professional fees, insurance, third-party charges or transaction costs.

## Precision

Each action profile preserves the precision of its own route.

A C2 R1 profile can coexist with a C1 R7 or C1 R10. The action-comparison layer never promotes sibling routes.

## Truth boundaries

The profile must never imply:

- bank approval;
- guaranteed financial benefit;
- completed execution;
- a quoted price when none exists;
- availability of an assisted service that has not been productized;
- legal representation or professional engagement;
- that user-supplied capital is a platform fee.

## Relationship with Decision Revalidation

Action profiles are rebuilt from the current router result whenever Mi Decisión is rebuilt.

V0.23.6 remains authoritative for whether a previously reviewed decision basis is still current. V0.23.7 does not bypass revalidation.

## Acceptance criteria

1. one action profile exists per current route;
2. route precision remains independent;
3. R1/R2 expose self-service availability and user-funded capital separately from fees;
4. R7 exposes the existing assisted audit blueprint only as preview and shows price as not quoted;
5. R10 is not presented as ordinary self-service and does not imply a productized legal service;
6. effort uses objective Case Plan signals rather than a subjective score;
7. external costs remain unmodeled unless supported by a future source;
8. expected effect remains directional/categorical, never guaranteed;
9. Mi Decisión displays the action profiles without weakening V0.23.4–V0.23.6 truth boundaries.

## Out of scope

- final service pricing;
- checkout/payment;
- SLA commitments;
- bank/product marketplace;
- commissions/referral economics;
- automated application submission;
- professional contracting;
- durable decision persistence;
- personalized bank offers or approvals.
