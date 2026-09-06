# DECISION OBJECT + DECISION BRIEF CONTRACT — V0.23.4

Status: implementation contract

## 1. Purpose

V0.23.4 introduces **Mi Decisión** as a decision layer between opportunity discovery/modeling and any later execution surface.

The product question is:

> Given the routes that VIVIENDA can currently support with explicit precision and provenance, what is the user's current decision state, what option governs the next step, what still needs verification, and what can happen next without pretending that a bank, lawyer, court or other third party has already decided or acted?

This slice does not create a new financial model. It composes already-evaluated Opportunity Router routes into a deterministic, auditable decision object and a derived Decision Brief.

## 2. Scope of the first slice

V0.23.4 is intentionally narrow:

- existing-borrower mortgage route selection;
- local-preview mode only;
- consumes `OpportunityRouterResult` as its canonical route input;
- can record a local user preference;
- derives a governing route;
- preserves route-level C0/C1/C2/C3 precision;
- exposes verification needs and next action;
- produces a deterministic Decision Brief;
- applies legal-review precedence before ordinary optimization.

It does **not** activate persistence, authentication, bank connectivity, Open Finance, contracting, professional representation or execution.

## 3. Inputs

Canonical input:

```ts
{
  routerResult: OpportunityRouterResult;
  selectedRouteCode?: OpportunityRouteCode;
}
```

The decision layer does not independently recompute eligibility. The Opportunity Router remains the authority for route status, priority, blockers, required evidence, human-review boundary, next action and precision.

A selected route must exist in the current router result. A stale or invented route code fails closed.

## 4. Decision states

### `insufficient_options`

No route is currently available. The decision layer must not manufacture one.

### `ready_for_choice`

At least one route exists and no user preference has been recorded locally. The primary router route can orient the user, but it is not silently converted into a user decision.

### `selection_recorded_local`

The user has marked a route as a preference in the current local preview.

This means only:

- the preference can organize the next product step;
- no payment has occurred;
- no instruction has been sent to a bank;
- no service has been contracted;
- no professional representation has begun;
- no third party has approved anything.

### `professional_review_required`

The governing route requires professional review, is itself `legal_review`, or the executive-defense route R10 is present.

This state blocks any interpretation that an ordinary optimization route can safely become the governing next step without first resolving the professional-review boundary.

## 5. Governing-route precedence

The governing route is resolved in this order:

1. `R10_EXECUTIVE_DEFENSE` in `legal_review`, when present;
2. the user's selected route, when valid;
3. the current router primary route;
4. `null` when no route exists.

### R10 invariant

If R10 exists because an executive proceeding, embargo or auction state was reported, it governs the next step even if the user marked R1, R2, R3, R5 or R7 as a preference.

The user's preference may remain visible as context, but it cannot displace the legal-review precedence.

## 6. Precision invariant

Precision belongs to the route/decision that earned it.

Example:

- R1 may be C2 because a compatible prepago-plazo model was actually built;
- R2 may still be C1;
- R7 may be C1;
- the Mortgage Twin source may still be C1.

Selecting R1 does not upgrade R2, R7, the full Mortgage Twin or the user profile.

`decisionPrecision` is the precision of the **governing route**, not a new global precision badge.

C3 is preserved only when the governing route already carries C3 under the existing verification contracts. Mi Decisión never creates C3 by itself.

## 7. Decision Object

The first-slice Decision Object contains:

- `mode = local_preview`;
- `kind = mortgage_route_selection`;
- `asOfDate`;
- `state`;
- current route options;
- router primary route code;
- locally selected route code, if any;
- governing route code;
- governing-route precision;
- professional-review flag;
- warnings;
- explicit truth boundary.

Each option retains:

- route code;
- title;
- status;
- precision;
- human-review requirement;
- blockers;
- required evidence;
- next action;
- caveat when present.

The object deliberately has no durable `decisionId` in V0.23.4 because this slice does not claim production persistence.

## 8. Truth boundary

Every Decision Object carries explicit invariants:

```ts
{
  precisionIsNotApproval: true;
  thirdPartyDecisionOccurred: false;
  executionOccurred: false;
  guaranteedOutcome: false;
}
```

These flags are product truth, not decorative copy.

Mi Decisión must never imply that:

- a bank approved a loan, transfer, restructuring or other request;
- a bank accepted a prepayment instruction;
- a lawyer has taken representation;
- a court has adopted a position;
- an estimated/modelled benefit is guaranteed;
- selecting an option executes that option.

## 9. Decision Brief

The Decision Brief is a deterministic projection of the Decision Object. It is not an LLM-generated legal or financial opinion.

It contains:

1. title;
2. state/status label;
3. summary of the current governing decision state;
4. current option summaries with per-option precision and route status;
5. blockers/evidence that still require verification;
6. next action from the governing route;
7. standard truth disclosures.

The initial brief deliberately does not invent a narrative of the user's finances beyond facts already encoded in the route result.

## 10. Required disclosures

The brief must communicate that:

- C0–C3 describes evidence/modeling precision, not approval;
- the local preview performs no payment or bank instruction;
- no professional representation is created;
- a C2 simulation is not guaranteed savings or contractual verification.

## 11. Relationship with existing modules

V0.23.4 composes, but does not replace:

- Mortgage Twin;
- Statement-Guided Intake;
- Loan Health;
- Opportunity Router;
- Prepayment Choice Comparison;
- Case Plan.

Expected flow after UI integration:

`Mortgage Twin → Loan Health → Opportunity Router / modeled choices → Mi Decisión → Case Plan → future execution boundary`

Mi Decisión answers **what am I deciding and what governs next?**

Case Plan answers **what would I need to do if I pursue that route?**

They are separate concepts and should remain separate components/contracts.

## 12. Failure rules

Fail closed when:

- a selected route no longer exists in the current router result;
- there are no current options;
- a legal-review route governs the case;
- upstream precision has been downgraded.

A future slice that persists decisions must also invalidate or supersede a saved decision when material upstream inputs change.

## 13. Acceptance criteria

1. A mixed C2/C1 route set remains mixed after decision creation.
2. Selecting a C2 route does not silently promote sibling routes.
3. Selection remains local-preview semantics and never sets execution/approval flags.
4. R10 dominates an ordinary selected route.
5. A selected code not present in the router result throws/fails closed.
6. No route result produces `insufficient_options` without invention.
7. C3 is preserved only when already earned upstream.
8. Decision Brief derives its next action and verification needs from the governing route.
9. No copy claims approval, guaranteed savings or completed execution.

## 14. Deferred work

Explicitly deferred:

- durable decision persistence and supersession history;
- stable decision IDs;
- identity/account binding;
- buyer-side decision objects;
- quote-comparison decisions;
- bank/product offers and approval states;
- execution orchestration;
- signatures/consents;
- professional engagement state;
- PDF/export of Decision Brief;
- analytics beyond categorical decision-state events;
- LLM explanation layer.

These should be added only after the local deterministic contract is green and the relevant upstream source-of-truth contracts exist.
