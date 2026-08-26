# Surface Brief — Borrower Quick Check

Status: V0.1
Mode: Operate after a short Persuade entry
Primary device: mobile first; desktop parity required

## Purpose

Help an existing housing-credit borrower understand the current obligation, obtain a useful first result without surrendering sensitive identity/contact data, and choose the next action with clear uncertainty and no deceptive savings claims.

## Audience

Primary:
- Colombian borrower with mortgage or housing lease;
- understands monthly payment and approximate balance better than amortization terminology;
- may arrive from TikTok/Instagram/Google/content about Ley 546, prepayments, high monthly payment or purchase of portfolio;
- distrusts intermediaries promising magical reductions.

Secondary:
- financially sophisticated borrower who expects methodology, assumptions and source freshness.

## User success

Within one short session the user can answer:
1. What does VIVIENDA actually know about my credit?
2. What is only estimated?
3. Is there at least one scenario worth exploring?
4. Can I act directly with my bank?
5. What additional information would materially improve precision?

## Business success

A successful session is not defined only as lead capture.

Primary success metrics:
- quick-check completion;
- scenario exploration;
- understood uncertainty;
- return intent / account creation after value;
- extract upload after explicit purpose disclosure;
- downstream financial/legal action when justified.

Negative success signals:
- early phone/email capture with low result engagement;
- users believing a simulation is a bank offer;
- users believing their own extra principal is platform-generated savings;
- legal consultation CTA shown to users with no legal issue.

## Interaction thesis

The product earns permission progressively.

Permission ladder:
1. anonymous numeric inputs;
2. personalized first result;
3. deeper scenario;
4. optional contact/account;
5. optional document;
6. verified Mortgage Twin;
7. execution route.

No step should request more trust than the value already delivered supports.

## Information hierarchy

Every result surface follows:

1. Answer
2. Confidence/precision
3. Why
4. Evidence/source
5. Alternative paths
6. Action
7. Assumptions/details

Never invert this by leading with disclaimers or by hiding uncertainty after the CTA.

## Signature interactions

### A. Precision ladder
C1 estimate → C2 modeled → C3 document-verified.

The user should perceive improving precision as progress, not as correction of a previous lie.

### B. Scenario Path
A time-based representation of current vs changed trajectory.

### C. Benefit Breakdown
Separate user contribution from modeled avoided cost.

### D. DIY / Assisted split
Show self-service and paid/assisted routes as legitimate alternatives.

### E. Source + Freshness
A compact provenance layer for rates, policies and extracted data.

## Trust copy constraints

Allowed:
- “estimamos”
- “modelamos”
- “podría”
- “con los datos que nos diste”
- “según esta referencia pública”
- “la aprobación depende de la entidad”

Avoid unless independently substantiated and contextually precise:
- “garantizado”
- “te ahorramos”
- “aplica para todos”
- “el banco debe aprobar”
- “tu tasa ideal es”
- “98% de éxito”

## Visual behavior before visual styling

- one dominant action per question;
- question typography outranks progress decoration;
- helper copy visually quieter but never illegible;
- uncertainty is visible close to the number it qualifies;
- avoid success-green for all recommended actions;
- no stock-photo trust theater;
- no generic bank-building imagery;
- no AI-purple gradients as default visual language;
- no decorative house icon repeated as category marker.

## Motion contract

Motion is only allowed to explain:
- progress between questions;
- recalculation of scenario;
- difference between baseline and changed path;
- expansion of assumptions;
- successful document reconciliation.

Avoid:
- looping hero effects;
- bouncing monetary values;
- confetti for financial decisions;
- animated counters implying pseudo-precision.

Reduced-motion behavior must preserve all meaning.

## Accessibility

Target WCAG 2.2 AA where practical.

Must support:
- keyboard-only;
- screen-reader labels for currency/rates;
- error summary + inline error;
- focus restoration after step change;
- non-color confidence states;
- zoom/reflow at 200%;
- reduced motion;
- adequate touch targets.

## Responsive strategy

Mobile:
- one question or one decision cluster at a time;
- actions reachable but not covering explanatory text;
- long methodology details collapsed after summary.

Desktop:
- context rail may persist;
- result can expose more assumptions simultaneously;
- do not turn question flow into a dense admin form.

## Completion states

Anonymous completion:
User may leave with a meaningful result and no account.

Account conversion:
Asked when saving, monitoring, comparing over time or document verification creates real benefit.

Document conversion:
Asked only after the interface explains why the document changes precision.

Legal conversion:
Only after a legal rule/problem is plausibly triggered and the professional relationship is clearly separated.

## Preflight before high fidelity

The surface cannot enter high fidelity until:
- low-fi usability passes;
- mathematical fixtures exist;
- UVR behavior is explicit;
- Benefit Breakdown comprehension is tested;
- source/provenance states are represented;
- mobile and desktop layouts are both represented;
- all major error/empty/loading states exist.
