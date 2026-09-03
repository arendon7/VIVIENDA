# VIVIENDA — DESIGN.md

Status: V0.1 selected visual direction
Canonical direction: **Warm Path**

## 1. Design thesis

VIVIENDA helps people understand how decisions change the financial and legal path of their home.

The interface should feel:
- calm;
- precise;
- human;
- transparent;
- independent;
- premium through craft, not luxury signaling.

The interface should not feel:
- like a bank portal;
- like a law firm;
- like a crypto/AI fintech;
- like a real-estate listings portal;
- like a debt-relief promise funnel.

## 2. Core visual grammar: the path

Use trajectory as a recurring structural motif when it clarifies time or choice.

Canonical sequence:
`current state → decision/action → projected or verified state`

Possible applications:
- amortization trajectory;
- scenario comparison;
- mortgage progress;
- customer journey;
- opportunity ranking;
- process status;
- legal escalation;
- document verification progression.

Never use the path purely decoratively.
Never render a projected path as guaranteed fact.

## 3. Trust hierarchy

Every material number must be legible as one of:
- user-declared;
- extracted from document;
- public reference;
- calculated;
- estimated;
- simulated;
- verified;
- third-party offer;
- third-party approval/decision.

Precision status belongs near the number, not buried in footer copy.

## 4. Color direction

### Foundation
Use warm, low-chroma neutrals rather than sterile pure white.

Suggested starting tokens, subject to contrast validation:
- `canvas`: warm off-white / light mineral;
- `surface`: near-white;
- `surface-muted`: subtle warm/blue mineral tint;
- `ink`: deep charcoal/navy, not pure black;
- `ink-muted`: neutral gray with adequate contrast;
- `border`: quiet neutral.

### Primary accent
A composed blue leaning slightly toward mineral/ink rather than saturated fintech cyan.
Use for:
- interactive links;
- active path;
- current decision context;
- selected scenario.

### Positive/benefit accent
A restrained botanical green.
Use for:
- an economically favorable modeled effect;
- verified completion;
- positive progress.

Never use green to imply approval, guarantee or certainty unless the state actually warrants it.

### Warning / legal attention
Use warm amber/earth tones rather than alarming red unless the situation is genuinely destructive/urgent.

## 5. Typography

Principles:
- highly legible;
- strong numeric rhythm;
- no display-fashion typography that weakens financial credibility;
- clear distinction between reading text and financial numbers.

Initial implementation may use a high-quality variable sans while brand typography is evaluated.

Hierarchy:
- page outcome / major recommendation;
- primary number;
- section title;
- body;
- provenance / method / freshness.

Large numbers require context immediately adjacent.

## 6. Layout

### Desktop
- generous outer margins;
- content constrained to readable widths;
- side-by-side only when comparison benefits from simultaneity;
- avoid dashboard grids simply to fill space.

### Mobile
Mobile is the primary stress test.
- one decision at a time;
- path becomes vertical;
- no tiny multi-column tables;
- sticky controls only when they reduce navigation burden;
- target sizes >= 44px where practical;
- key interpretation must not rely on hover.

## 7. Radius and surfaces

Rounded surfaces are allowed but restrained.
Use radius to communicate containment and calm, not friendliness for its own sake.

Avoid:
- pill-shaped everything;
- floating cards for every piece of text;
- excessive shadows.

Cards are reserved for units that are independently actionable, comparable or stateful.

## 8. Signature components

### Decision Result
Must answer:
1. what we observed;
2. what to consider first;
3. why;
4. confidence/precision;
5. next action.

### Scenario Path
Must visually preserve:
- baseline;
- user action;
- projected effect;
- assumptions.

### Benefit Breakdown
Must separate:
- user-supplied additional principal;
- future interest avoided;
- insurance/other costs avoided;
- fees/implementation costs;
- negotiated/corrected value attributable to professional intervention, if any.

### Source + Freshness
Compact but visible:
- source;
- source class;
- date/cutoff;
- verification/refresh status.

### DIY / Assisted Choice
The self-service option must be genuinely available where applicable.
Paid assistance cannot visually suppress a viable free route.

### Mortgage Twin
The canonical overview of the user's verified obligation:
- balance;
- installment;
- rate;
- modality;
- term;
- insurance/costs;
- source/cutoff;
- opportunity priority;
- current issues/alerts;
- trajectory.

## 9. Forms and progressive disclosure

Default rule:
> value before sensitive data.

Ask only what is necessary for the next useful output.
Allow `No sé` where realistic.
Unknown inputs lower precision; they should not automatically block the journey.

Before document upload explain:
- what document is needed;
- why;
- which fields will be extracted;
- that banking credentials are never requested;
- that extracted fields can be reviewed/corrected.

## 10. Motion

Motion explains change.

Appropriate:
- scenario trajectory morph;
- balance/plazo comparison;
- expanding methodology;
- verification progression;
- subtle state transitions.

Avoid:
- continuous decorative movement;
- bouncy financial numbers;
- confetti;
- animation that suggests guaranteed savings.

Respect reduced-motion preferences.

## 11. Iconography

Use icons sparingly.
Prefer functional symbols:
- source;
- document;
- comparison;
- warning;
- verification;
- time;
- direction.

Avoid a visual vocabulary dominated by:
- houses;
- roofs;
- keys;
- piggy banks;
- handshakes;
- shields.

A house may appear when semantically necessary, not as category wallpaper.

## 12. Imagery

Product screens should not depend on stock photography.
Marketing may use human/living context selectively, but avoid staged homebuyer cliché.

Prefer:
- real architectural detail;
- lived-in materiality;
- Colombian context without tourism clichés;
- subtle documentary framing;
- graphics built from real product trajectories/data.

## 13. Writing style

- plain Spanish;
- short sentences;
- explain financial jargon when used;
- prefer `podría`, `estimamos`, `según estos datos`, `vale la pena analizar` over certainty language;
- disclose DIY routes;
- distinguish rate/reference/offer/approval;
- no secret-law framing;
- no guarantee framing.

## 14. Accessibility

Minimum expectations:
- WCAG AA contrast;
- keyboard navigation;
- visible focus;
- semantic headings;
- accessible form labels/errors;
- charts and paths must have text equivalents;
- color is never the only state cue;
- reduced-motion support.

## 15. Conversion rule

The visual hierarchy may optimize conversion only after preserving:
1. factual accuracy;
2. legal/financial distinction;
3. uncertainty;
4. privacy;
5. accessibility;
6. viable DIY choices.

A conversion gained by misunderstanding is treated as a product failure.

## 16. Anti-patterns

Do not ship:
- blue-purple AI gradients;
- giant unsupported savings counters;
- fake approval meters;
- generic credit-score gauges;
- CTA walls;
- 20-field first forms;
- testimonial carousels used as proof of guaranteed outcome;
- crowded finance dashboards;
- legal text as visual camouflage;
- aggressive urgency around non-urgent financial decisions.

## 17. Current reference slice

Figma file:
`VIVIENDA — Visual Territories V0.1`

Selected structural territory:
`C — Path Decision Map`

Supporting influences:
- A — Warm Instrument for emotional tone;
- B — Editorial Financial Guide for information discipline.

This file is exploratory; this `DESIGN.md` is the canonical rule set going forward.
