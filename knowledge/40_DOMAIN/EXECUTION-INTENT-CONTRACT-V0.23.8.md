# EXECUTION INTENT CONTRACT — V0.23.8

Status: implementation contract

## Purpose

V0.23.8 inserts an explicit boundary between **Mi Decisión** and **Case Plan**:

`Radar → Mi Decisión → How to proceed → Case Plan → Case Log demo`

The user must choose how they want to organize the selected route before the plan is shown.

The slice fixes an architectural ambiguity: `CaseTrack` must represent the chosen execution mode, not be inferred from `humanReviewRequired`.

## Core rule

> A professional-review requirement and an execution track are different facts.

Examples:

- R7 may require professional review while the user is still preparing the route in `self_service` mode;
- R7 may instead use its existing `assisted` mortgage-audit blueprint;
- R10 uses `legal` because ordinary self-service is not appropriate;
- choosing `assisted` does not mean a service agreement was accepted;
- choosing `legal` does not mean a lawyer was retained.

## Inputs

The resolver receives:

- one current `OpportunityRoute`;
- the current `DecisionActionProfile` for that exact route.

The route/profile codes must match. A mismatch fails closed.

## Output

`resolveExecutionIntents()` returns:

- `mode = local_preview`;
- route code;
- available intent options;
- `requiresExplicitUserChoice = true`;
- `selectedIntent = null`.

There is intentionally no automatic default selection.

## Intent codes

### `prepare_self`

Case track: `self_service`.

Meaning:

- the user organizes steps/documents and performs applicable external acts themselves;
- the plan may still contain later professional or third-party tasks;
- the product does not send, file, pay or execute anything.

Available when `DecisionActionProfile.selfService` is not `not_appropriate`.

### `assisted_mortgage_audit`

Case track: `assisted`.

Available only when:

- route = `R7_RECLAMACION`;
- the existing Action Profile exposes `mortgage_audit_preview`.

This maps to the existing Auditoría Hipotecaria v0.12 blueprint.

Selecting it does not:

- accept a service agreement;
- authorize data persistence;
- create a professional engagement;
- grant extrajudicial authority;
- grant judicial power;
- create a real case;
- initiate payment.

### `professional_review`

Case track: `legal`.

Available when ordinary self-service is `not_appropriate` and professional review is required.

This includes R10 and any other route whose current status legitimately requires legal/professional review before ordinary execution.

Selecting it does not retain counsel or determine legal strategy.

## Route behavior

### R1 / R2

Expected option:

- `prepare_self` only.

The plan remains local and the bank instruction is not sent by VIVIENDA.

### R3 / R5

When ordinary preparation is appropriate:

- `prepare_self`.

When the route itself is in `legal_review` and ordinary self-service is not appropriate:

- `professional_review`.

### R7

Expected options while R7 governs:

- `prepare_self`;
- `assisted_mortgage_audit`.

This is the key distinction from the previous timeline heuristic. `humanReviewRequired=true` does not force R7 into `legal`.

### R10

Expected option:

- `professional_review` only.

No ordinary self-service or assisted-audit option is exposed.

## Selection contract

`selectExecutionIntent()` accepts only an option present in the current resolution.

Attempting to select an unavailable mode fails closed with `execution_intent_not_available`.

Every local selection explicitly preserves these false states:

- `createsCase = false`;
- `executesExternally = false`;
- `grantsAuthority = false`;
- `serviceAgreementAccepted = false`;
- `dataAuthorizationRecorded = false`;
- `professionalEngagementCreated = false`.

## Case Plan boundary

Case Plan is not displayed until an execution intent has been selected.

The same route-level Case Plan remains authoritative for phases, tasks, evidence and next events. V0.23.8 does not create competing plan generators per mode.

The plan displays the selected mode as context and allows the user to return to the chooser.

Changing the local mode does not mutate route eligibility or precision.

## Case Log / CaseTrack boundary

`CaseTimelinePreview` receives the selected `CaseTrack` explicitly.

Forbidden heuristic:

`humanReviewRequired || legal_review ? legal : self_service`

That heuristic was incorrect because it collapsed professional-review need into execution mode and incorrectly classified assisted R7 as legal.

The initial demo `CASE_CREATED` event must preserve the explicitly selected track.

## Service acceptance boundary

Only an `assisted` demo may expose the safe demonstration event `SERVICE_AGREEMENT_ACCEPTED`.

A `legal` track must not expose service acceptance merely because professional review is required.

Professional review and service engagement remain independent capabilities.

## Revalidation

V0.23.6 remains authoritative.

If the material decision basis changes:

- any open Case Plan closes;
- the execution chooser/selection is unmounted with the plan workspace;
- the user must re-review the decision;
- after accepting the new basis, the user must make a new execution-mode choice.

A stale execution intent must never survive a changed governing route.

## Truth boundaries

V0.23.8 must never imply:

- persistent case creation;
- service contracting;
- payment;
- bank submission;
- external execution;
- legal representation;
- power/authority;
- completed professional review;
- acceptance or approval by a third party.

## Acceptance criteria

1. no Case Plan appears before explicit execution-mode choice;
2. R1/R2 expose self preparation only;
3. R7 exposes self preparation plus assisted mortgage audit;
4. selecting R7 assisted produces `caseTrack=assisted`;
5. selecting R7 self preparation produces `caseTrack=self_service` even though professional review may later be required;
6. R10 exposes professional review only and produces `caseTrack=legal`;
7. unavailable intent selection fails closed;
8. route/profile mismatch fails closed;
9. timeline never infers track from `humanReviewRequired`;
10. service-acceptance demo is available only for assisted track;
11. legal track does not imply service acceptance;
12. revalidation removes any stale execution selection;
13. all visible UI remains consumer-language Spanish and does not expose internal track/code vocabulary.

## Out of scope

- persistent execution intent;
- authentication;
- creating a production Case Log;
- actual data consent;
- actual service agreement;
- payments;
- signatures;
- powers;
- document persistence;
- bank integrations;
- filings/submissions;
- legal engagement;
- assisted products beyond the existing R7 blueprint.
