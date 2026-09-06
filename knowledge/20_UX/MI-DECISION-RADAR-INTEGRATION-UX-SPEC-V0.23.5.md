# MI DECISIÓN — RADAR INTEGRATION UX SPEC V0.23.5

Status: implementation contract

## Purpose

Insert **Mi Decisión** between Radar Vivienda and Case Plan so that selecting an opportunity route never looks like execution.

Canonical flow:

`Mi Situación → Radar Vivienda → Mi Decisión → Case Plan`

## Interaction contract

1. `Preparar esta ruta` records a local preference only.
2. Selecting a route opens Mi Decisión; it must not open Case Plan automatically.
3. Mi Decisión shows the governing route, its precision, current options, verification needs and truth disclosures.
4. Ordinary continuation uses `Continuar al plan de esta ruta`.
5. If professional review governs, the continuation CTA becomes `Preparar revisión prioritaria`.
6. `Elegir otra ruta` clears the local preference and closes any plan.
7. Closing Case Plan returns to the already-reviewed Mi Decisión state rather than discarding the preference.

## R10 precedence

When `R10_EXECUTIVE_DEFENSE` is present in legal review:

- R10 governs the decision even if the user marked R1/R2 or another optimization;
- the marked preference can remain visible as context;
- the Decision Brief must state that the preference does not displace the legal-review priority;
- Case Plan must be created from R10, not from the ordinary selected route;
- the governing precision is R10's own precision.

## Precision

Precision remains route-scoped.

A C2 prepayment route can coexist with a C1 R10. If R10 governs, Mi Decisión and the resulting Case Plan inherit C1 from R10. The C2 route remains C2 only as its own modeled option.

## Invalidation

If the selected route disappears after upstream inputs change, the local selection must be cleared and Case Plan must close. The product must not retain a stale route.

A later hardening slice may additionally require explicit re-review when the selected route remains present but its governing status, precision or blockers materially change.

## Truth boundary

This integration remains local-preview only. It does not imply:

- persistence or account storage;
- bank instruction or payment;
- bank approval;
- professional engagement or representation;
- filing before a court or authority;
- guaranteed financial benefit.

## Acceptance criteria

- Route selection does not render Case Plan before an explicit second action.
- Normal modeled R1 can show C2 in Mi Decisión and pass C2 into Case Plan when it governs.
- Executive-process R10 overrides a selected C2 R1 and produces a C1 professional-review Decision Brief and C1 Case Plan.
- Closing the plan preserves the local decision review.
- Stale selected routes fail closed.
