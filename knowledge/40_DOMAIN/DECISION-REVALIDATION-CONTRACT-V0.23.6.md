# DECISION REVALIDATION CONTRACT — V0.23.6

Status: implementation contract

## Purpose

V0.23.6 prevents a previously reviewed local decision from remaining actionable after the facts that governed it materially change.

The product rule is:

> A user preference may remain as context, but Case Plan cannot continue from a decision whose governing basis changed without an explicit new review.

## Scope

This slice remains local-preview only. It adds deterministic revalidation between **Mi Decisión** and **Case Plan**.

It does not add persistence, accounts, backend storage, bank execution, professional engagement or external approvals.

## Decision basis snapshot

When the user selects a route, VIVIENDA captures only the material basis needed to revalidate that choice:

- selected route code;
- governing route code;
- governing status;
- governing precision;
- professional-review requirement;
- blockers;
- required evidence;
- next action;
- caveat.

The snapshot is not a durable saved decision and has no production identifier.

## Revalidation states

### `current`

The material basis is unchanged. The user may continue from Mi Decisión to Case Plan.

### `review_required`

The selected route still exists, but one or more material elements changed. The user must review the current Decision Brief and explicitly accept the updated basis before Case Plan can reopen.

### `selection_invalid`

The selected route no longer exists in the current router result. The previous selection fails closed and cannot produce a Case Plan.

## Material changes

Any of the following requires re-review:

1. governing route changed;
2. governing precision changed;
3. route status changed;
4. professional-review requirement changed;
5. blockers changed;
6. required evidence changed;
7. next action changed;
8. caveat changed.

The disappearance of the selected route invalidates the selection entirely.

## Non-material changes

Router notices alone do not invalidate a decision basis when the governing route and its material fields remain unchanged.

Order-only changes in blocker/evidence lists are normalized and do not trigger re-review.

## Precision rule

A downgrade such as `R1 C2 → R1 C1` is material and blocks Case Plan until re-reviewed.

An upgrade is also material. More precision does not silently authorize execution.

## R10 rule

If R10 appears after an ordinary route was selected:

- R10 becomes the governing route under the existing Decision Object precedence;
- revalidation becomes `review_required`;
- any open ordinary Case Plan closes;
- the current Decision Brief shows R10 and its own precision;
- the user must explicitly review the changed basis;
- only then may a Case Plan be prepared from R10.

A previously selected C2 optimization never preserves C2 for a newly governing C1 legal route.

## Fail-closed behavior

V0.23.6 must not:

- keep Case Plan open after a material basis change;
- continue from a stale route;
- silently accept a new governing route;
- preserve stale precision;
- treat a user preference as approval or execution.

## Acceptance criteria

1. unchanged basis remains current;
2. removed selected route becomes invalid;
3. C2 → C1 requires review;
4. R1 → R10 requires review and adopts R10 precision;
5. blockers/evidence/next action changes require review;
6. notice-only changes remain current;
7. Case Plan closes after material change;
8. Case Plan cannot reopen until explicit re-review;
9. accepted current basis becomes the new local comparison point without implying persistence.
