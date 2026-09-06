# DECISION ACTION PROFILE UX SPEC — V0.23.7

Status: implementation contract

## Product intent

Mi Decisión should let a user compare not only **what** an option is, but **what pursuing it actually implies**.

For each current route, the decision surface shows:

1. expected effect;
2. visible effort;
3. execution mode;
4. known cost/pricing state;
5. route precision.

## Comparison principle

Do not rank routes with a generic score.

The product must not say that one option is “easy”, “cheap” or “best” unless a source-of-truth model actually supports that conclusion.

Instead, expose the underlying facts so the user can compare them.

## Expected effect

Use directional language such as:

- `buscar una reducción del plazo`;
- `buscar una reducción de la cuota`;
- `preparar una estructura de pago más sostenible`;
- `aclarar o corregir una diferencia concreta`;
- `priorizar revisión jurídica`.

Do not convert these into promised outcomes.

## Effort

Render objective signals from Case Plan, for example:

`3 tareas del usuario · 4 evidencias · 1 paso profesional · 1 paso de banco/tercero`

Do not render `esfuerzo bajo/medio/alto`.

Where a route depends on an unresolved external trigger, state that dependency explicitly.

## Execution mode

### Self-service available

Explain that the supported route can be prepared/executed through the self-service instruction path, subject to its existing truth boundaries.

### Preparation only

Explain that the user can prepare the route but the final outcome/action depends on a bank, third party or later review.

### Self-service not appropriate

Use this for legal-review routes/R10. It does not remove user agency; it prevents the product from making an ordinary DIY flow look sufficient.

## Assisted execution

Only R7 may display:

`Auditoría Hipotecaria asistida: blueprint de preview disponible.`

This must be paired with the fact that live contracting, payment, SLA and final price are not active.

Other routes display that no assisted product is currently productized.

Professional-review requirement is shown separately from assisted-product availability.

## Cost / pricing

The surface must distinguish:

- user-funded principal from a platform fee;
- a service whose price has not been quoted;
- a service that is not productized;
- external costs that are not modeled.

Never render a fabricated COP amount or fee percentage.

For R1/R2, explicitly state that additional principal is supplied by the user and is not a Casa con Criterio fee.

For R7, explicitly state that final assisted-service pricing is not quoted in the preview.

For R10, do not imply that a legal service can be purchased merely because professional review is required.

## Precision

Show the existing route precision beside each option. A C2 option does not upgrade sibling C1 options.

## Placement

Action comparison belongs inside **Mi Decisión**, after the governing-route summary and before verification needs/warnings.

The user should be able to compare all current routes before continuing into Case Plan.

## Revalidation interaction

When V0.23.6 detects a material basis change:

- action profiles refresh with the current router result;
- the Decision Brief displays current action implications;
- Case Plan remains blocked until the user accepts the new basis.

The comparison must not preserve stale effort, cost or execution-mode text from the previous route state.

## Accessibility

The comparison uses semantic headings/articles and remains inside the existing `aria-live="polite"` Decision surface.

Do not encode route meaning only through color or icons.

## Acceptance criteria

- every current option can expose an action profile;
- R1/R2 state user capital vs fee truth explicitly;
- R7 shows assisted-audit preview and unquoted pricing;
- R10 shows self-service not appropriate and no productized assisted service;
- visible effort is objective, not scored;
- no numeric price is invented;
- route precision remains visible and independent;
- existing decision/revalidation CTA behavior remains unchanged.
