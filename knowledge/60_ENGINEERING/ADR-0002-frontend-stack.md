# ADR-0002 — Frontend Stack

Status: accepted for scaffold V0.1
Date: 2026-08-25

## Decision
Use a deliberately small web stack:

- Node.js >= 22.12
- Next.js 16.3.3 minimum, pinned at scaffold
- React / React DOM 19.2.8
- TypeScript 5.9.2 for the first scaffold; upgrade only through explicit compatibility PR
- Tailwind CSS 4.3.3
- CSS custom properties generated/derived from `design/tokens/warm-path.tokens.json`
- Vitest 4.1.x for calculation/domain unit tests
- Playwright 1.62.x for end-to-end, responsive, accessibility-tree and visual-regression coverage
- native semantic HTML first; accessible headless primitives only where native controls are insufficient

## Security rationale
On 2026-08-25 Next.js released 16.3.3 as the Active LTS security release addressing two critical vulnerabilities. The scaffold must not use an earlier 16.3 patch.

## React rationale
React 19.2.x is the current stable major/minor line. Do not use React 19.3 canary/experimental builds.

## TypeScript rationale
The ecosystem is in a rapid compiler transition. VIVIENDA favors a conservative, known-compatible TypeScript 5.9 line for the first scaffold instead of adopting a newly released major merely because it is newer. Upgrade after the first green build/test baseline.

## Tailwind rationale
Tailwind is used as a low-level implementation accelerator, not as the design system. Warm Path tokens remain canonical. No arbitrary palette utilities should leak into product components when an equivalent semantic token exists.

## Component-library policy
Do not adopt a pre-styled component library as the visual source of truth.

Permitted:
- native HTML controls;
- headless accessible primitives;
- selectively generated shadcn/ui source when it saves accessibility/interaction work, provided Warm Path tokens own the styling.

Not permitted:
- importing a preset visual theme and calling it VIVIENDA;
- shipping inaccessible custom controls where a native/headless control exists;
- adding a component dependency for a one-off primitive that is trivial to implement semantically.

## shadcn/ui note
As of August 2026 shadcn/ui supports Base UI, React Aria and Radix, and includes a Questionnaire pattern suitable for multi-step forms. Treat it as an implementation reference/source registry, not as brand or layout direction.

## Charts
No chart library in the initial dependency set.
Scenario Path and early amortization visuals should use HTML/CSS/SVG primitives. Add a chart library only after a real visualization exceeds those primitives.

## State management
No global state library initially.
- URL/search params for shareable anonymous scenario state where appropriate;
- local React state for ephemeral controls;
- server/domain modules for durable records later.

Adopt external state management only after a measured cross-route requirement appears.

## Forms
Prefer native FormData/server actions or controlled React only as needed.
Validation contracts belong to the domain schema, not visual components.
Do not make placeholder text serve as labels.

## Calculation architecture
Financial calculations live in pure domain modules, never inline inside React components.
Each implementation must run against the machine-readable golden vectors defined in the borrower calculation contracts.
UI formatting is separate from numerical calculation.

## Data provenance architecture
UI receives typed provenance alongside values. A financial value should be representable as:

```ts
type ProvenanceKind =
  | "user_declared"
  | "document_extracted"
  | "public_reference"
  | "partner_data"
  | "calculated"
  | "estimate"
  | "simulation"
  | "third_party_offer"
  | "third_party_decision"
  | "automated_legal_screening"
  | "professional_legal_conclusion";
```

Never infer display certainty from the numeric value alone.

## Accessibility
WCAG AA is release baseline.
Playwright must cover keyboard completion and accessibility-tree assertions for signature journeys.
Use axe additionally when the testing layer is introduced, but automated scans do not replace keyboard/manual review.

## Performance budgets
Initial goals:
- no charting library in landing/quick-check bundle;
- no client component merely to render static copy/data;
- anonymous simple calculations should execute locally when contractually safe;
- lazy-load document/OCR and authenticated-workspace code;
- no third-party marketing script before explicit performance/privacy review.

## Analytics
Analytics events use the canonical taxonomy in `knowledge/50_ANALYTICS/BORROWER-FUNNEL-EVENTS.md`.
Never send raw balances, IDs, document contents, or other financial PII to generic product analytics.

## Deployment
Vercel-compatible Next.js architecture, but avoid coupling domain logic to provider-specific APIs unless a concrete advantage justifies it.

## Upgrade policy
Framework/runtime upgrades require:
1. release/security note review;
2. build/typecheck/unit/E2E green;
3. golden calculation vectors unchanged unless a domain change is intentional;
4. visual regression review on signature components;
5. dependency lock update in the same PR.
