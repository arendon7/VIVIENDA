# WARM PATH VERTICAL SLICE V0.2

Status: implementation contract

## Purpose
Translate the Warm Path design direction into an implementation-ready borrower journey without introducing new product promises, financial assumptions, legal conclusions, or dark patterns.

## Slice
1. Borrower entry
2. Anonymous quick check
3. Decision Result
4. Scenario Path
5. Prepayment simulator
6. Benefit Breakdown
7. DIY / Assisted Choice
8. Extract upload explanation
9. Extraction review
10. Mortgage Twin snapshot

## Global rules
- First useful result before ID, phone, email, or extract where possible.
- Every financial output carries precision level C0-C3.
- Estimate, simulation, verified fact, partner offer, approval, automated legal screening, and professional legal conclusion must never share the same visual treatment.
- User-supplied additional principal is never presented as value created by VIVIENDA.
- DIY remains a visible, legitimate option whenever the action can reasonably be performed directly.
- Source and freshness stay close to claims whose value depends on external data.
- Motion may explain state change, path change, comparison, or consequence; it may not create urgency or imply certainty.

## Desktop frame
Reference viewport: 1440 px.
Content max width: 1180 px.
Readable explanatory column: 680-760 px.
Main results use asymmetric 7/5 or 8/4 layouts only when the side column contains evidence, source, precision, or next action. Do not create decorative sidebars.

## Mobile frame
Reference viewport: 390 px.
Single-column by default.
Minimum horizontal page padding: 20 px.
Minimum touch target: 44 px.
Path becomes vertical and remains readable without horizontal scrolling.
Sticky actions are allowed only after the user has reached the result; never cover financial content or disclosures.

# 1. Borrower entry

## Goal
Route an existing-credit user into the quick check in one decision.

## Required content
Eyebrow: `Ya tengo crédito de vivienda`
H1: `¿Estás pagando tu vivienda de la mejor manera disponible?`
Supporting copy: explain that the first result can be obtained with approximate data and no extract.
Primary CTA: `Revisar mi crédito`
Secondary CTA: `Quiero comprar vivienda`
Trust microcopy: `No necesitas cédula, teléfono ni extracto para empezar.`

## Do not
- lead with Ley 546;
- claim guaranteed savings;
- request contact data in the hero;
- show partner logos as if they were approvals.

# 2. Anonymous quick check

## Question sequence
Q1 Product: mortgage / housing leasing / not sure.
Q2 Modality: pesos / UVR / not sure.
Q3 Approximate outstanding balance.
Q4 Approximate monthly installment.
Q5 Approximate remaining term.
Optional Q6 known annual effective rate.

Unknown is always a valid answer where the calculation contract permits it.

## Interaction
- one conceptual decision per screen on mobile;
- desktop may combine compatible numeric questions, but never more than two required financial inputs in one card;
- progress shown as task progress, not fake percentage precision;
- changing a prior answer recalculates subsequent eligibility/precision.

# 3. Decision Result

## Hierarchy
1. conclusion headline;
2. plain-language explanation;
3. precision badge;
4. current-credit snapshot;
5. top opportunity;
6. 1-2 alternatives;
7. source/freshness where applicable;
8. next action.

## Example language
`Vemos una oportunidad que vale la pena simular.`
`Con los datos aproximados que ingresaste, reducir plazo mediante abonos adicionales podría tener un efecto relevante. Todavía no conocemos tu tasa ni sistema exacto.`

Never show a giant money-saved number as the first visual if precision is below C2.

# 4. Scenario Path

## Purpose
Make cause and effect understandable over time.

## Required visual grammar
Baseline node -> user decision -> modeled effect -> new trajectory.

Possible labels:
- `Hoy`
- `Abono adicional`
- `Nueva trayectoria`
- `Fin estimado`

## Desktop
Horizontal or shallow diagonal path allowed when labels remain legible.

## Mobile
Vertical path only.
No miniature chart labels.
Numbers move below each node.

# 5. Prepayment simulator

## Controls
- contribution type: one-time / recurring;
- amount;
- desired application: reduce term / reduce payment when legally-operationally available;
- optional timing assumption.

## Result
- modeled new term/payment;
- estimated future interest avoided;
- user additional principal;
- precision level;
- assumptions.

The simulator must never treat one formula as universal across pesos and UVR systems.

# 6. Benefit Breakdown

## Mandatory rows
1. `Capital adicional que aportarías`
2. `Intereses futuros que el modelo estima que dejarían de causarse`
3. `Otros costos/seguros evitados` when supported
4. `Costos de implementación` when applicable
5. `Valor atribuible a negociación/corrección profesional` only when objectively attributable
6. `Efecto económico neto estimado`

## Visual rule
User contribution is neutral, not green.
Avoided cost may use restrained positive color.
Professional-value row appears only when there is professional action; never in a pure self-service prepayment scenario.

# 7. DIY / Assisted Choice

Equal information hierarchy, different action emphasis allowed only based on user intent—not monetization priority.

DIY card:
- what the user can do;
- what to request from the bank;
- what evidence to preserve;
- limitations.

Assisted card:
- what VIVIENDA adds;
- fee model only when known;
- what remains subject to bank/third-party decision.

# 8. Extract upload explanation

Before upload, explain:
- what document is useful;
- which fields will be extracted;
- why those fields improve precision;
- that banking passwords are never requested;
- whether AI/document extraction is used;
- that extracted values will be shown for confirmation.

# 9. Extraction review

Each field can be:
- extracted-high-confidence;
- needs-confirmation;
- user-corrected;
- missing;
- conflicting.

The user must be able to correct each value without re-uploading the document.
A single low-confidence field cannot silently contaminate all downstream calculations.

# 10. Mortgage Twin snapshot

## Above the fold
- balance;
- installment;
- modality;
- rate if verified;
- remaining term;
- precision C3 only when reconciliation rules are satisfied;
- source date/cutoff.

## Below
- opportunities;
- alerts;
- scenario history;
- documents;
- next relevant event.

## Opportunity priority
Consequence and expected user value, not commission potential.

# Loading states
Prefer skeleton only for true loading. For calculations completed locally, update synchronously and announce the changed result to assistive technology where appropriate.

# Error states
Errors must identify:
- what failed;
- what remains usable;
- whether entered data is preserved;
- next recovery action.

# Accessibility
- semantic headings;
- explicit labels;
- errors associated to inputs;
- keyboard operability;
- visible focus;
- no color-only financial meaning;
- reduced-motion path fallback;
- live-region announcements for material recalculations;
- charts have text equivalents.

# Release gate
This slice cannot move to production if any of these fail:
- user cannot explain where the projected benefit comes from;
- user mistakes a simulation for an approval/offer;
- DIY is materially harder to discover than assisted action;
- mobile path requires horizontal scrolling;
- source/freshness is missing from externally sourced recommendations;
- C1 output visually looks as certain as C3;
- extracted document data can become verified without confirmation/reconciliation.