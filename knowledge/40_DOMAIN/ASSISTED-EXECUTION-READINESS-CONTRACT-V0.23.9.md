# Assisted Execution Readiness — Domain Contract V0.23.9

## Purpose

V0.23.9 connects the explicit assisted execution intent introduced in V0.23.8 with the existing Mortgage Audit R7 execution blueprint without activating real persistence, contracting, document storage, professional engagement or third-party execution.

The contract answers one question only:

> After the user explicitly chooses the assisted Mortgage Audit path for R7, what would have to happen before that accompaniment could become a real operational case?

## Scope

This slice applies only to:

- route `R7_RECLAMACION`;
- execution intent `assisted_mortgage_audit`;
- case track `assisted`;
- service blueprint `MORTGAGE_AUDIT_R7_V1`.

It does not generalize assisted execution to other routes.

## Inputs

The readiness builder requires an `ExecutionIntentSelection` that preserves all three of these conditions:

1. `intentCode === "assisted_mortgage_audit"`;
2. `routeCode === "R7_RECLAMACION"`;
3. `caseTrack === "assisted"`.

The builder can be constructed from either:

- the canonical `OpportunityRouterResult`, using the full R7/R10 protection of `buildMortgageAuditBlueprint`; or
- a route that has already been established as the governing route by Mi Decisión, using `buildMortgageAuditBlueprintForGovernedRoute`.

The governed-route builder still rejects any route other than R7.

## Output

`AssistedExecutionReadiness` is always a local preview with:

- `mode: "local_preview"`;
- `status: "setup_required"`;
- R7 service and track identity preserved;
- evidence checklist inherited from the Mortgage Audit blueprint;
- execution-step order inherited from the blueprint;
- every real operational capability initially false.

## Truth boundary

The readiness object explicitly preserves:

- `realCaseCreated: false`;
- `dataAuthorizationRecorded: false`;
- `serviceAgreementAccepted: false`;
- `evidencePersisted: false`;
- `evidenceVerified: false`;
- `professionalReviewRequested: false`;
- `professionalReviewCompleted: false`;
- `externalExecutionOccurred: false`;
- `extrajudicialAuthorityGranted: false`;
- `judicialPowerGranted: false`.

Rendering the readiness object cannot mutate any of these values.

## Canonical setup sequence

The readiness sequence is inherited from `MortgageAuditExecutionBlueprint.executionSteps`:

1. `CASE_CREATED`;
2. `DATA_AUTHORIZATION_RECORDED`;
3. `SERVICE_AGREEMENT_ACCEPTED`;
4. `EVIDENCE_REQUESTED`;
5. `EVIDENCE_ATTACHED`;
6. `EVIDENCE_VERIFIED`;
7. `PROFESSIONAL_REVIEW_REQUESTED`;
8. `PROFESSIONAL_REVIEW_COMPLETED`.

V0.23.9 does not append any of those events. It only explains their required order.

Only the first step is classified as `next_real_step`; all later steps are `blocked_until_previous`.

## Existing Case State semantics remain authoritative

This slice does not alter the `case-state` state machine.

The existing state machine remains authoritative for future real events, including:

- authorization required before persisted evidence;
- verified evidence separated from attachment;
- professional review requested before completion;
- authority/power separated from service acceptance;
- external submission requiring real evidence/reference;
- verified outcomes separated from recorded outcomes.

## R7 blueprint refactor

V0.23.9 separates two valid construction contexts:

### Full router construction

`buildMortgageAuditBlueprint(routerResult, asOfDate)`:

- rejects R7 when absent;
- rejects ordinary R7 execution when R10 is the higher-priority route;
- then delegates to the governed-route builder.

### Governed route construction

`buildMortgageAuditBlueprintForGovernedRoute(route, asOfDate)`:

- requires `R7_RECLAMACION`;
- builds the same canonical blueprint after route governance has already been resolved upstream.

This avoids reconstructing router truth inside `CasePlanWorkspace` while preserving the original R10 protection at the router boundary.

## Fail-closed errors

Readiness fails closed for:

- unsupported execution intent;
- selection/route mismatch;
- selection/track mismatch;
- governed route other than R7;
- full-router situations where R10 must supersede ordinary R7 execution.

There is no silent fallback to another service, route or case track.

## Customer-language boundary

Domain identifiers remain internal.

Consumer UI must not expose raw values such as:

- `CASE_CREATED`;
- `MORTGAGE_AUDIT_R7_V1`;
- `assisted`;
- `PROFESSIONAL_REVIEW_COMPLETED`.

The UI maps the canonical sequence to Spanish consumer-language labels without changing the underlying event semantics.

## Non-goals

V0.23.9 does not implement:

- durable case creation;
- authentication or account ownership;
- real data consent capture;
- file upload/persistence for assisted execution;
- service agreement acceptance;
- price or checkout;
- professional contracting;
- extrajudicial authority;
- judicial power;
- professional review execution;
- bank/lender submission;
- external response tracking;
- verified outcome recording.

## Required tests

The contract is locked by domain and E2E tests that prove:

- only assisted R7 can build this readiness object;
- every operational capability remains false;
- the eight-step sequence is inherited in order;
- R10/full-router protections remain intact;
- R7 self-preparation does not render assisted readiness;
- internal identifiers do not leak into customer copy.
