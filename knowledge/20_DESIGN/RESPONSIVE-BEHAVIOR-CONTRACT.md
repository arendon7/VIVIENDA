# RESPONSIVE BEHAVIOR CONTRACT

Status: canonical for Warm Path V0.2

## Principle
Responsive design is not desktop compression. Each surface must preserve comprehension, trust, agency, and action hierarchy at every supported viewport.

## Breakpoint philosophy
Use content-driven breakpoints, not device-brand breakpoints.

Reference ranges:
- compact: < 640 px
- medium: 640-1023 px
- wide: >= 1024 px

Components may switch earlier/later when their content requires it.

## Global layout
### Compact
- single column;
- 20 px minimum page inset;
- no financial table wider than viewport;
- cards stack;
- secondary metadata may collapse into disclosure rows;
- path vertical;
- dialogs avoided for primary journeys; prefer pages/sheets only when context is preserved.

### Medium
- one primary column plus optional contextual rail;
- two-column comparison allowed only when each side remains >= 280 px;
- charts may use wider horizontal form if labels remain visible.

### Wide
- max product width 1180 px;
- readable prose constrained independently;
- data comparison can use 2-3 columns;
- side rail only for source, precision, assumptions or actions.

## Typography
- no viewport-dependent text below 14 px for body/supporting content;
- financial primary numbers use responsive clamp but never overwhelm their label;
- line length for explanatory copy: target 55-75 characters;
- tabular numerals for financial values.

## Decision Result
Compact order:
1 conclusion
2 precision
3 explanation
4 credit snapshot
5 primary opportunity
6 alternatives
7 evidence/source
8 actions

Wide may place snapshot/evidence in a right rail, but conclusion and explanation remain first in DOM order.

## Scenario Path
Compact: vertical nodes, full-width labels, text alternative always visible.
Wide: horizontal path permitted.
Path must remain meaningful when motion is disabled.

## Benefit Breakdown
Compact: stacked rows with label above or beside value; no horizontal-scroll table.
Wide: aligned two-column ledger.
Contribution and avoided-cost rows must remain visually distinct without relying solely on color.

## DIY / Assisted Choice
Compact: sequential cards; DIY appears first when it is a valid path unless user explicitly selected assisted service.
Wide: side-by-side equal-height comparison allowed.
Neither card may use disabled-looking styling for a legitimate option.

## Upload
Compact: native file picker + camera/document route where supported; avoid drag-and-drop as the only affordance.
Wide: drag/drop plus explicit file button.
Required explanation appears before the control in DOM and visual order.

## Extraction review
Compact: one field row per block with extracted value, source cue, status and edit action.
Wide: tabular review allowed if keyboard order remains linear.

## Mortgage Twin
Compact above-the-fold max: 4 primary facts + precision/source. More details collapse under `Ver detalles del crédito`.
Wide: 6-8 facts may be visible if hierarchy remains clear.
Opportunity list remains single priority order on all viewports.

## Sticky UI
Allowed:
- compact result CTA after first result is visible;
- persistent save/continue on long review forms.

Forbidden:
- sticky commercial CTA before result;
- CTA obscuring assumptions/disclosures;
- multiple sticky layers.

## Touch and pointer
- target >=44x44 CSS px;
- spacing prevents destructive/confirm actions from accidental adjacent taps;
- hover is enhancement only;
- tooltip content has click/focus alternative.

## Keyboard
Visual reflow must not change logical tab sequence.
No positive tabindex.
Focus returns predictably after sheets/popovers.

## Motion
Compact prefers shorter distance and duration.
Respect `prefers-reduced-motion` and replace spatial transitions with instant state + opacity where necessary.

## Data visualization fallback
Every path/chart must have:
- textual summary;
- key values outside SVG/canvas;
- no interaction required to discover the principal conclusion.

## QA viewport set
Minimum automated/visual review:
- 360x800
- 390x844
- 412x915
- 768x1024
- 1024x768
- 1280x800
- 1440x900

## Failure conditions
- horizontal page scroll at any QA viewport;
- clipped currency/percent values;
- primary CTA becomes first content on compact result;
- source/precision disappears on compact;
- path loses baseline/decision/effect order;
- DIY becomes hidden behind overflow/menu while assisted remains visible;
- input labels become placeholders only.