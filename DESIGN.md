# VIVIENDA — DESIGN.md

Status: V1 brand-integrated visual direction
Canonical direction: **Casa con Criterio over Warm Path**

## 1. Design thesis

Casa con Criterio helps people understand how decisions change the financial and legal path of their home.

The interface should feel:
- calm;
- precise;
- human;
- transparent;
- independent;
- patrimonial without feeling like a bank;
- premium through craft, not luxury signaling.

The interface should not feel:
- like a bank portal;
- like a law firm;
- like a crypto/AI fintech;
- like a real-estate listings portal;
- like a debt-relief promise funnel.

### 1.1 Brand integration rule

**Casa con Criterio** is the visible masterbrand. **Warm Path** remains the structural product language underneath it.

The brand layer adds:
- editorial-patrimonial typography;
- deep navy authority;
- restrained ochre for opportunity/emphasis;
- soft green for genuinely favorable or completed states;
- warm ivory/mineral surfaces;
- architectural line motifs used sparingly.

Brand expression may never weaken the product truth hierarchy, C0–C3 precision, provenance, DIY visibility or legal/financial boundaries.

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

### Canonical palette
- Deep navy / authority: `#0B1D2D`;
- Patrimonial ochre / opportunity: `#C7922F`;
- Soft green / favorable or completed state: `#6F8F7A`;
- Mist gray / supporting neutral: `#BFC7D1`;
- Warm ivory / canvas: `#F6F3EC`.

### Foundation
Use warm, low-chroma neutrals rather than sterile pure white.

Operational tokens are centralized in `styles/casa-criterio.css` and layer over the Warm Path base tokens.

### Primary interaction
Deep navy is the default primary-action color. It signals authority and stable interaction without copying generic saturated fintech blue.

### Opportunity accent
Ochre is used for:
- opportunities worth exploring;
- selected or emphasized decision context;
- trajectory emphasis;
- editorial accents.

Ochre never means guaranteed benefit.

### Positive/benefit accent
Restrained botanical green is used for:
- an economically favorable modeled effect;
- verified completion;
- positive progress.

Never use green to imply approval, guarantee or certainty unless the state actually warrants it.

### Warning / legal attention
Use warm amber/earth tones rather than alarming red unless the situation is genuinely destructive/urgent.

## 5. Typography

Canonical typography:
- **Lora** — editorial/display, narrative outcomes and major decision statements;
- **Work Sans** — interface, controls, data, supporting copy and financial numbers.

The app loads these through `next/font/google`; font binaries are not stored in the repository.

Principles:
- highly legible;
- strong numeric rhythm;
- display typography must not weaken financial credibility;
- clear distinction between narrative interpretation and operational data.

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
- key interpretation must not rely on hover;
- product navigation may scroll horizontally inside its own bounded region, never by causing document-level overflow.

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

### Mortgage Twin / Mi Situación
The canonical overview of the user's obligation or declared/modelled state:
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

A Mortgage Twin is not C3 merely because it is visually complete. Precision must remain explicit.

### Product Chrome
Shared route-level brand primitives live in `components/brand/ProductChrome.tsx`:
- `ProductHeader`;
- `ProductFooter`;
- `ProductIntro`.

These primitives exist to prevent visual and verbal drift across calculators, verification, buyer paths and assisted routes while keeping each surface's own task semantics.

## 9. Forms and progressive disclosure

Default rule:
> value before sensitive data.

Ask only what is necessary for the next useful output.
Allow `No sé` where realistic.
Unknown inputs lower precision; they should not automatically block the journey.

Form states use the Casa con Criterio operate grammar:
- warm, quiet surfaces;
- explicit labels and hints;
- visible keyboard focus;
- ochre selection emphasis;
- disabled states that remain legible;
- minimum practical touch target around 44px;
- numeric fields with tabular rhythm where appropriate.

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

The Casa con Criterio house/double-C symbol is a masterbrand mark, not a reason to wallpaper product UI with house icons.

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

Canonical brand lines:
- **Tu vivienda merece criterio.**
- **Conoce las reglas. Haz las cuentas. Decide con criterio.**
- **Inteligencia para las decisiones de tu vivienda.**

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

Visible identity:
**Casa con Criterio**

Structural product direction:
**Warm Path / Path Decision Map**

Supporting influences:
- Warm Instrument for emotional tone;
- Editorial Financial Guide for information discipline;
- editorial-patrimonial Casa con Criterio layer for recognizable brand expression.

The exploratory Figma territories remain historical evidence. This `DESIGN.md`, together with `docs/brand/CASA_CON_CRITERIO.md`, is the canonical rule set going forward.
