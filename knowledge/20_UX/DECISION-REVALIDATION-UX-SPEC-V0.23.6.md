# DECISION REVALIDATION UX SPEC — V0.23.6

Status: implementation contract

## Product intent

Mi Decisión must never look permanently valid when the facts underneath it change.

The user experience therefore distinguishes:

- a reviewed decision whose basis is still current;
- a preference that still exists but needs re-review;
- a preference that is no longer valid because its route disappeared.

## Canonical flow

`Radar → Mi Decisión → Case Plan`

After a material change:

`Radar change → Mi Decisión updated → Re-review required → user acknowledges current basis → Case Plan`

## Current decision

When revalidation is `current`:

- show the normal Decision Brief;
- show the normal continuation CTA;
- preserve route-level precision;
- allow Case Plan to open.

## Review required

When a material basis change occurs:

- update the Decision Brief to the current governing route immediately;
- show a visible warning that the previous basis changed;
- list the categories of material change in human language;
- remove the Case Plan continuation CTA;
- close an already-open Case Plan;
- preserve the earlier preference only as context;
- offer `Revisé los cambios · usar fundamento actual`;
- offer `Elegir otra ruta`.

The acknowledgement updates only the local preview baseline. It is not a signature, consent, instruction or durable record.

## Selection invalid

When the selected route disappears:

- do not render a stale Decision Brief as if it were current;
- do not render Case Plan;
- explain that the previous choice is no longer supported by current data;
- offer `Volver a revisar opciones`;
- clearing the stale choice returns the user to Radar.

## R10 escalation

If an executive-process fact is introduced after a C2 optimization was already reviewed:

1. any open ordinary plan closes;
2. Mi Decisión updates to professional review;
3. governing precision becomes the precision of R10;
4. the user must acknowledge the changed basis;
5. only then does `Preparar revisión prioritaria` become available.

## Precision downgrade

If a modeled C2 route loses the model that supported C2:

- the Decision Brief must show C1;
- the old C2 Case Plan must not remain open;
- continuation is withheld until re-review;
- after acknowledgement, any new Case Plan inherits C1.

## Accessibility

The revalidation surface uses `aria-live="polite"` so a material decision change is announced without behaving like an emergency alert.

Buttons remain explicit actions; no change is accepted automatically from field edits.

## Copy constraints

Do not use language implying:

- approval;
- execution;
- legal representation;
- bank instruction;
- guaranteed savings;
- durable storage.

Use `preferencia`, `fundamento`, `revisión`, `ruta que gobierna` and `vista previa local` consistently.
