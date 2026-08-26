# VIVIENDA — Visual Territory Scorecard V0.1

Purpose: choose a visual direction using product criteria rather than aesthetic preference alone.

Candidate territories currently defined:
- A — Warm Instrument
- B — Editorial Financial Guide
- C — Path / Decision Map

## Evaluation method

Each territory is applied to the same vertical slice:
1. borrower entry hero;
2. one question screen;
3. Quick Check result;
4. Scenario Path;
5. Benefit Breakdown;
6. Mortgage Twin;
7. mobile result state.

Score 1–5 per criterion. Weight is applied after scoring.

## Criteria

| Criterion | Weight | What a 5 means |
|---|---:|---|
| First-view clarity | 12 | User understands purpose and next action in seconds |
| Financial trust | 14 | Feels credible without looking like a bank clone |
| Legal/compliance fit | 10 | Uncertainty, provenance and disclosures fit naturally |
| Numerical readability | 12 | Dense financial information remains effortless to scan |
| Mobile usability | 10 | Signature components work naturally on small screens |
| Distinctiveness | 10 | Memorably VIVIENDA, not generic fintech/AI |
| Conversion potential | 9 | Clear action without dark-pattern pressure |
| Warmth / approachability | 6 | Human enough for mainstream borrowers |
| Component scalability | 8 | Extends from landing to Mortgage Twin and future tools |
| Motion potential | 3 | Supports useful scenario/path motion without dependence on spectacle |
| Accessibility robustness | 6 | Contrast, hierarchy, non-color semantics and reflow are straightforward |

Total weight: 100.

## Mandatory failure rules

Regardless of total score, reject a territory if:
- Benefit Breakdown makes user contribution look like platform savings;
- estimate/verified states are hard to distinguish;
- mobile requires horizontal financial tables for core comprehension;
- Source + Freshness becomes visually negligible;
- it only looks good on landing and collapses in Mortgage Twin;
- it depends on animation to explain meaning;
- it creates bank/official-government visual confusion;
- it looks materially similar to a major Colombian competitor without a stronger product rationale.

## Territory hypotheses

### A — Warm Instrument

Hypothesis:
A precise financial instrument softened by humane spacing, tactile controls and restrained warmth can maximize mainstream trust.

Strengths expected:
- clear forms;
- approachable;
- adaptable product UI;
- safer accessibility path.

Risks:
- may become generic “friendly fintech”;
- can drift into beige lifestyle branding;
- signature path metaphor may feel secondary.

### B — Editorial Financial Guide

Hypothesis:
Strong information design, typography and explanatory hierarchy can make complex housing-finance decisions feel understandable and premium.

Strengths expected:
- excellent education/content;
- strong long-form SEO surfaces;
- sophisticated methodology/assumptions display;
- high perceived expertise.

Risks:
- can become text-heavy;
- mobile may feel slow/dense;
- product controls can look secondary to content.

### C — Path / Decision Map

Hypothesis:
Representing housing finance as trajectories through time can unify brand, amortization, comparison and lifecycle monitoring into one recognizable language.

Strengths expected:
- strongest product-specific differentiation;
- naturally explains term and scenarios;
- can connect landing promise to Mortgage Twin;
- good motion semantics.

Risks:
- could become overly diagrammatic;
- path metaphor must not obscure numbers;
- requires exceptional mobile adaptation;
- decorative curves without information would become gimmicky.

## Scoring protocol

Round 1 — internal expert review
- Product/UX
- visual/design engineering
- finance/domain
- legal/trust
- growth/CRO

Round 2 — 5-user preference + comprehension test
Do not ask only “which is prettier?”

Ask:
- Which would you trust with a mortgage statement?
- Which makes the result easiest to understand?
- Which feels least like it is trying to sell you something before helping?
- Which makes current vs alternative path clearest?
- Which feels most memorable after 10 minutes?

Round 3 — implementation risk
Assess:
- component complexity;
- performance;
- accessibility;
- responsive cost;
- maintainability.

## Selection rule

Preferred territory must:
- score >= 80/100 weighted;
- have no mandatory failure;
- win or tie on Financial Trust;
- score >=4/5 on Numerical Readability;
- score >=4/5 on Mobile Usability;
- survive the complete vertical slice.

If no territory passes, iterate or hybridize only after identifying which specific product requirements are unmet. Do not average all three into a generic compromise by default.

## After selection

Only after territory selection:
1. freeze `DESIGN.md`;
2. define semantic tokens;
3. select typography;
4. select accent strategy;
5. define component primitives;
6. define motion grammar;
7. build the vertical slice;
8. run Impeccable/Vercel/Microsoft reviews;
9. test mobile/desktop;
10. propagate to other routes.
