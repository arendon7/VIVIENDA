# CASE PLAN WORKSPACE CONTRACT V0.4

Status: implementation contract
Scope: local/non-persistent action plan generated from an Opportunity Router result
Base: Opportunity Router v0.3

## Purpose
Turn an explainable route candidate into an equally explainable action plan without pretending that VIVIENDA has already opened, filed, stored or professionally accepted a case.

The Case Plan Workspace is a **planning state**, not yet a persistent client matter.

## Product boundary
Until authentication, database and secure document storage exist:

- plan state is local/ephemeral;
- leaving/reloading may lose plan selections;
- no task may say `radicado`, `enviado`, `aceptado`, `completado` or equivalent unless a real user/system action establishes that state;
- no bank response or deadline may be fabricated;
- no uploaded document is represented as stored;
- no legal representation is implied;
- no fee or engagement is implied.

Required visible disclosure:
`Vista local de planificación. Este plan todavía no crea un expediente ni guarda tu información.`

## Input contract
The planner receives one already-evaluated `OpportunityRoute` plus an `asOfDate`.

It must not re-decide legal eligibility independently from the Opportunity Router.

```ts
type CasePlanInput = {
  route: OpportunityRoute;
  asOfDate: string;
};
```

## Output contract

```ts
type CasePlan = {
  mode: "local_preview";
  routeCode: OpportunityRouteCode;
  title: string;
  objective: string;
  phases: CasePlanPhase[];
  evidenceChecklist: CasePlanEvidenceItem[];
  nextEvent: CasePlanEvent | null;
  warnings: string[];
};
```

### Phase
A phase represents a sequence of work, not a falsely completed status.

Allowed phase states:
- `ready` — can be started with current route state;
- `blocked` — one or more material prerequisites are missing;
- `conditional` — only becomes relevant after an external event/decision.

### Task
Each task must identify who performs it:
- `user`;
- `system`;
- `professional`;
- `bank_or_third_party`.

Allowed task states in v0.4:
- `todo`;
- `blocked`;
- `conditional`.

There is intentionally no `done` state in the generated plan because the generator has no evidence that execution occurred.

### Evidence checklist
Evidence items may be:
- `known_required` — already required by the route;
- `recommended` — prudent for traceability;
- `conditional` — only needed if a later state occurs.

The generated plan does not claim an item is uploaded or stored.

## Global planning invariants
1. Route status remains visible near the plan.
2. Planning never upgrades C0-C3 precision.
3. Planning never converts `candidate` into `eligible_now`.
4. `legal_review` must place professional review before procedural strategy.
5. Judicial distress never receives an automated filing/defense recipe.
6. An Art. 20 `seasonal_wait` plan prepares evidence for the next January-February window; it does not claim a request can be filed under the special window today.
7. An Art. 24 plan with no binding offer must first obtain/compare an offer; the ten-business-day authorization clock is not active.
8. An Art. 24 plan with a binding offer may instruct the user to preserve proof of delivery and, only after real delivery, control the maximum ten-business-day authorization period.
9. Prepayment plans must preserve proof of the debtor's instruction to apply the partial prepayment to term or installment reduction.
10. Claim/audit plans must separate `detect inconsistency` from `prove legal breach`.
11. No exact judicial/bank deadline date is generated from an unknown filing/service date.
12. Business-day calculations are not performed until the triggering date and applicable calendar rules are known.

## Route plan R1 — PREPAGO_PLAZO
Objective: reduce remaining term through additional principal chosen by the debtor.

Phases:
1. Compare — review modeled term-reduction scenario and assumptions.
2. Decide — choose amount/frequency and confirm reduction-of-term instruction.
3. Execute — user/bank operational step, conditional on the user's decision.
4. Verify — compare subsequent bank evidence against the instruction.

Recommended evidence:
- current statement;
- simulation inputs/result;
- proof of prepayment instruction;
- payment receipt;
- following statement.

## Route plan R2 — PREPAGO_CUOTA
Same structure as R1, but debtor instruction must explicitly preserve the chosen objective of installment reduction.

## Route plan R3 — RESTRUCTURACION_546_20

### If `seasonal_wait`
Phases:
1. Prepare capacity evidence.
2. Design sustainable proposal, including first-post-restructure installment validation when data exists.
3. Re-open route during January-February.
4. File only when window/procedural conditions are actually active.

Next event:
`Próxima ventana especial del artículo 20: enero-febrero de <next applicable year>.`

This is a calendar window, not a guaranteed filing appointment.

### If `candidate` / `eligible_now`
Phases:
1. Complete objective-condition evidence.
2. Validate proposed structure.
3. Prepare request.
4. File and retain proof of filing.
5. Review bank response.

If route status is `legal_review`, professional review precedes procedural preparation.

## Route plan R5 — CESION_546_24

### Without binding offer (`candidate`)
1. Obtain comparable creditor proposals.
2. Compare cost/term/insurance/conditions.
3. Obtain actual binding offer.
4. Only then prepare Art. 24 delivery to current creditor.

Ten-business-day clock is **inactive** at this stage.

### With binding offer (`eligible_now`)
1. Validate offer identity/date/material terms.
2. Deliver/radicate binding offer to current creditor.
3. Preserve proof of delivery.
4. After actual delivery, control max 10 business days for authorization.
5. Review authorization/refusal/delay and route exceptions to professional review.

No exact deadline date is calculated in v0.4 because actual filing date is not captured as verified execution evidence.

## Route plan R7 — RECLAMACION
1. Isolate the concrete discrepancy.
2. Build evidence packet.
3. Decide whether first step is information/correction request or legal claim.
4. File only after chosen path and document are ready.
5. Analyze actual response before escalation.

Warnings:
- inconsistency is not yet proven breach;
- escalation route is not assumed in advance.

## Route plan R10 — EXECUTIVE_DEFENSE
1. Collect judicial/collection documents.
2. Record known procedural dates exactly as shown by evidence.
3. Lawyer reviews urgency, jurisdiction and procedural posture.
4. Only the professional review may define defense/filing strategy.

Forbidden generated tasks:
- `file exception X`;
- `oppose auction using Y`;
- any defense conclusion without professional review.

## Product-classification plan
When R3 exists only because `housing_regime_not_established` and product is unknown:
1. inspect statement/contract product name and purpose;
2. classify mortgage housing / leasing / other secured / unknown;
3. re-run Opportunity Router;
4. do not prepare Art. 20 filing yet.

## Next-event semantics
`nextEvent` may be:
- a known calendar window;
- a relative procedural clock whose trigger is not yet established;
- an evidence-driven event (`cuando recibas el siguiente extracto`);
- professional review required.

It must expose:
- `label`;
- `timingKind`: `calendar_window | relative_after_trigger | evidence_event | professional_review`;
- `timingText`;
- `triggerEstablished: boolean`.

If `triggerEstablished=false`, the UI must not display a fake due date.

## Acceptance tests
1. Generated plans always have `mode=local_preview`.
2. No generated task is `done`.
3. R1 includes explicit term-reduction instruction evidence.
4. R2 includes explicit installment-reduction instruction evidence.
5. R3 seasonal wait points to next Jan-Feb window and contains no `file now` task.
6. R3 current-window candidate does not become eligible merely because a plan exists.
7. R5 candidate has no active 10-business-day clock.
8. R5 eligible with binding offer expresses a relative 10-business-day clock after real delivery, not an exact deadline date.
9. R7 preserves the distinction between discrepancy and proven breach.
10. R10 puts lawyer review before strategy and contains no generated defense recipe.
11. Unknown product creates classification plan, not Art. 20 filing plan.
12. Planning does not mutate the original route status or precision.

## Out of scope v0.4
- persistence/authentication;
- real task completion;
- notifications/reminders;
- bank adapters;
- exact Colombia business-day deadline engine;
- generated legal pleadings;
- signatures/powers;
- payment/fees;
- document upload/storage beyond the existing local demo boundary.