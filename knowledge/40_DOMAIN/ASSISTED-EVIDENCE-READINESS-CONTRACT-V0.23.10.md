# ASSISTED EVIDENCE READINESS CONTRACT — V0.23.10

Status: implementation contract

## Purpose

V0.23.10 turns the canonical R7 evidence checklist into a **local preparation inventory** before any sensitive document intake exists.

It answers:

> What evidence do I already have, what am I missing, and what can I prepare before I authorize or upload anything?

This slice does not create a case, accept a service, upload files, persist evidence or verify documents.

## Product chain

`R7 → Mi Decisión → assisted execution intent → Case Plan → Assisted Execution Readiness → Assisted Evidence Readiness → future authenticated evidence intake`

V0.23.9 remains authoritative for the operational sequence. V0.23.10 only adds a safe preparation layer before the future evidence-intake step.

## Canonical source

The inventory is derived exclusively from:

`MortgageAuditExecutionBlueprint.casePlan.evidenceChecklist`

The user cannot add arbitrary evidence labels to domain truth in this slice.

Unknown declarations are ignored.

This prevents the UI from inventing requirements such as identity documents, powers or judicial records that the current R7 plan did not request.

## Declaration states

Each canonical evidence item has one local declaration:

- `not_declared`
- `user_reports_available`
- `user_reports_missing`

These states describe only what the user says they currently have available.

They are not evidence facts.

## Hard truth boundary

Every inventory item always preserves:

- `uploaded = false`
- `persisted = false`
- `verified = false`

A user declaration must never generate:

- `EVIDENCE_ATTACHED`
- `EVIDENCE_VERIFIED`
- `DATA_AUTHORIZATION_RECORDED`
- `CASE_CREATED`
- `PROFESSIONAL_REVIEW_REQUESTED`

The local inventory is not a Case Log.

## Checklist kinds

The existing Case Plan kinds remain authoritative:

- `known_required`
- `recommended`
- `conditional`

For current preparation, `known_required` and `recommended` are treated as **current items to classify**.

`conditional` items may depend on a later fact or event. They remain visible but do not block the current preparation state merely because they are undeclared.

This does not mean a conditional document will never become necessary.

## Inventory status

### `not_started`

No item has a local declaration.

### `in_progress`

At least one item is declared but some checklist items remain undeclared.

### `inventory_complete`

Every current checklist item, including conditional items if present, has a local declaration.

Inventory completeness does not mean evidence sufficiency or verification.

## Preparation state

### `needs_classification`

At least one current non-conditional item is still undeclared.

### `needs_collection`

All current non-conditional items are classified, but at least one is reported missing.

### `declared_ready_for_future_intake`

All current non-conditional items are reported available by the user.

This state means only:

> the user's local inventory says the current supports are available for a future intake.

It does **not** mean:

- the documents exist in storage;
- the documents are complete;
- the documents are authentic;
- the documents are relevant;
- the evidence is verified;
- the case is ready for professional review;
- the service has started.

## Data minimization

V0.23.10 accepts no document bytes, filenames, account numbers, identity numbers, bank identifiers or free-form document contents.

The only local interaction is a declaration against an already canonical checklist label.

The state remains in React/session memory and may disappear on route change, reload or leaving the flow.

## Future intake boundary

A future authenticated evidence intake must still independently enforce the existing v0.8/v0.9 boundaries:

1. authenticated principal;
2. server-side authorization;
3. data authorization before persistence;
4. server-side evidence classification;
5. signed storage grant;
6. completion/idempotency;
7. append-only Case State event;
8. verification by an authorized human role where required.

V0.23.10 does not bypass or satisfy any of those gates.

## Acceptance criteria

1. inventory is derived only from the canonical R7 Case Plan checklist;
2. arbitrary client evidence labels cannot enter the readiness object;
3. default state is entirely undeclared;
4. `Lo tengo` maps only to `user_reports_available`;
5. `Me falta` maps only to `user_reports_missing`;
6. declarations never change uploaded/persisted/verified flags;
7. current undeclared items derive `needs_classification`;
8. current missing items derive `needs_collection`;
9. all current items locally available derive `declared_ready_for_future_intake`;
10. conditional undeclared items do not block current preparation;
11. no Case State event is emitted;
12. no document bytes or PII are collected;
13. the inventory appears only in R7 assisted execution;
14. R7 self-service retains the ordinary Case Plan evidence list without assisted inventory;
15. reset clears all local declarations;
16. customer-visible copy does not expose internal declaration enum values.

## Out of scope

- authentication;
- Supabase activation;
- storage activation;
- document upload;
- OCR;
- file persistence;
- evidence verification;
- real case creation;
- consent capture;
- service agreement;
- professional engagement;
- payment;
- submission/filing;
- legal authority or power;
- durable evidence inventory persistence.
