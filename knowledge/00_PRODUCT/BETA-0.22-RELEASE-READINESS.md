# BETA 0.22 — RELEASE READINESS

Status: **CANDIDATE / NOT YET RELEASED**
As of: 2026-09-02 (America/Bogota)
Consolidation PR: #28 — `Beta 0.22 — Consolidación de línea de producto`
Release branch: `release/beta-0.22-consolidation`
Product freeze v0.22: `df179c25e1e547ed0cecf0eea4a07b987f3e9a1a`

## 1. Purpose

This document distinguishes four states that must not be conflated:

1. **product slice frozen** — v0.22 has a reproducible functional/documental freeze;
2. **consolidation candidate** — the stacked product history is represented by one release PR against `main`;
3. **preview-ready** — a real deployable preview exists and has been audited visually and interactively;
4. **public Beta released** — an explicitly approved commit is merged/deployed under a defined release policy.

VIVIENDA is currently in state **2**.

## 2. Consolidation state

The historical product line was built as stacked draft PRs from foundation through v0.22. PR #28 consolidates the full product line without rewriting or deleting the historical stacked PRs. Historical PRs remain useful as slice-level provenance until a consolidation/release decision is completed.

The historical v0.22 slice remains frozen separately; its STATUS/ADR counts and SHAs intentionally describe that historical slice and are not rewritten to mirror later consolidation hardening.

## 3. Current consolidation gate

Latest fully green **behavioral head** before this documentation synchronization:

`e1bcc2d3308ba48b4926332104072a703c371f7d`

GitHub Actions PR run:

`33655884786`

Validated on that head:

- TypeScript: **PASS**;
- domain/server tests: **401/401 PASS** across 30 files;
- production build: **PASS**;
- Playwright: **182/182 PASS**;
- Chromium desktop: **PASS**;
- mobile 390 px: **PASS**.

The increase from 180 to 182 E2E comes from an accessibility regression check executed in both Playwright projects.

This documentation-synchronized head must itself pass the same repository gates before it becomes the final internally certified release candidate.

## 4. CI/release hardening

The consolidation branch validates pull requests and pushes to `main`, `release/**`, `implementation/**`, `design/**` and `product/**`; cancels superseded runs; uses `actions/checkout@v6`, `actions/setup-node@v7` and `actions/upload-artifact@v6`; and uploads Playwright diagnostics on failure.

CI configuration does **not** substitute repository branch protection.

## 5. Product/truth readiness

### Existing borrower

Implemented and covered:

- Quick Check C1;
- Statement-Guided Mortgage Twin C1;
- deterministic compatible C2 model;
- Loan Health qualitative decision state;
- Opportunity Router;
- prepayment comparison R1/R2 C2 under supported assumptions;
- Case Plan / Case Timeline preview;
- assisted Mortgage Audit preview;
- Payment Pressure C0;
- Inconsistency Reconciler C0.

### Prospective buyer

Implemented and covered:

- Affordability C1→C2;
- Home Readiness;
- Financing Structures;
- Quote Normalization C1;
- Scenario-Based Economic Quote Comparison C2.

### Precision boundaries

Preserved:

- C0 orientation;
- C1 user-declared/unverified;
- C2 deterministic model under supported assumptions;
- C3 reserved for real document-derived and reconciled verification.

The presence of one C2 decision does not promote the entire Mortgage Twin, other routes or user-declared facts.

### Consolidation truth hardening

The cross-surface Beta audit confirmed or corrected:

- Home separates self-service value from `Acompañamiento · preview`;
- `/revisar` and `/verificar` distinguish local statement reference/user transcription from real documentary verification;
- R10 procedural priority does not route judicial documents into the Mortgage Twin;
- R7 `/auditoria-hipotecaria` describes how a professional audit **would be organized**, not an active contracted review;
- buyer flows do not represent planning/readiness/normalization as underwriting, approval, bank ranking or live offers;
- economic quote comparison remains C2 under explicit assumptions and does not convert modeled differences into guaranteed savings or universal recommendations.

## 6. Legal/truth revalidation — 2026-09-02

Release review rechecked current official public sources and found the implemented boundaries still aligned:

- annual mortgage renegotiation guidance continues to identify the January-February special window and 28 February deadline;
- Decreto 583 de 2025 remains in force and sets the first housing-credit installment cap at 40% of qualifying family income;
- Ley 546 Article 24 continues to contemplate debtor-requested assignment after a binding offer, with authorization within a maximum of ten business days under the statutory predicates;
- the 40% rule is not treated as a generic illegality detector for any current installment;
- lender approval, underwriting and offer generation remain outside canonical legal routing.

The consolidation now uses canonical `America/Bogota` date handling for the Article 20 routing path. Coverage includes four unit tests and an E2E boundary instant at `2026-03-01T04:30:00Z`, which is still 28 February in Colombia.

Legal/source hardening remains a recurring release task because these rules can change.

## 7. Accessibility readiness

Static and executable review confirmed:

- the global skip link targets `#contenido`;
- all 11 Beta routes expose a semantic `<main id="contenido">`;
- the skip link is moved onscreen on focus and the global focus ring remains visible;
- mobile routes preserve a reachable primary journey even when compact navigation is hidden;
- the global muted text token previously produced approximately **4.48:1** contrast against the canvas, narrowly below the WCAG AA 4.5:1 threshold for normal text;
- `--ink-muted` was hardened from `#66727b` to `#657078`, yielding approximately **4.60:1** against `--canvas: #f5f4ef`;
- E2E now locks the rendered `.nav-link` color to the hardened token so the regression cannot silently reappear.

This does not replace the post-Beta automated accessibility scanner backlog in #32 or the final rendered keyboard/visual audit on Vercel Preview.

## 8. Security/privacy readiness

Positive findings:

- Evidence runtime is `server-only`;
- trusted-origin policy is server-authoritative;
- without valid trusted-origin configuration, evidence routes fail closed with 503 and `Cache-Control: no-store`;
- provider wiring and rate limiting fail closed before grants are issued;
- HTTP boundary validates POST/JSON, same-origin, path identifiers, body size, idempotency where applicable and rejects browser-supplied privileged authority fields;
- browser-controlled role, subject, storage locator and provider authority are rejected by architecture;
- Case Journal is designed append-only;
- provider-ready SQL uses least-privilege grants;
- Supabase/Auth/Storage remain provider-ready, not active;
- anonymous-first user value remains available without productive auth/storage.

### Direct dependency review

Read-only review on 2026-09-02 found direct versions on patched lines:

- Next.js `16.3.3`;
- React `19.2.8`;
- Vitest `4.1.11`.

This is **not** represented as `npm audit = 0`; full transitive registry-backed audit remains in #32 unless a material applicable vulnerability is demonstrated.

### Intentionally unavailable

- productive Supabase project;
- productive auth/session provider;
- productive evidence storage;
- OCR/document extraction provider;
- C3 documentary verification runtime;
- bank/Open Finance/bureau adapters;
- live offers or application submission.

These absences are not defects for anonymous Beta surfaces if the UI continues to describe them truthfully.

## 9. Release blockers and launch decisions

### BLOCKER A — branch governance

Last verified 2026-09-02:

- `main` is `protected: false`;
- required status checks are OFF;
- no repository-level rule currently prevents an accidental direct push/merge.

Before public Beta release, repository governance should require at minimum PR + `verify` + `e2e`, with force pushes/deletion disabled and an explicit merge strategy.

### BLOCKER B — real Vercel Preview

Last verified 2026-09-02 in connected team `NNNN` / `team_f0CRhAmwxqF9rXYd89sCVkTP`:

- project count: **0**;
- VIVIENDA is not imported;
- no auditable Preview URL exists.

Required before public Beta:

- exact-SHA Preview Deployment;
- all 11 routes audited desktop/mobile 390 px;
- keyboard/skip-link/focus smoke test;
- runtime/network error inspection;
- no horizontal overflow;
- no accidental productive provider/network calls;
- truth/precision claims inspected in rendered output;
- evidence APIs remain fail-closed while providers are inactive;
- `noindex`, `nofollow`, `nocache` and defensive headers remain preserved during Preview validation.

### LAUNCH DECISION C — indexing policy

Global `noindex`, `nofollow`, `nocache` metadata and `X-Robots-Tag: noindex, nofollow, noarchive` remain intentional. This is correct for Preview and compatible with a deliberately unindexed public Beta. It is **not** a third Beta blocker.

## 10. Non-blocking technical debt

Tracked in #32 and not a Beta blocker without new material evidence:

- full transitive dependency/security scanning policy;
- CSP design;
- WebKit/Firefox smoke coverage;
- automated accessibility scanning;
- Preview performance/Core Web Vitals;
- Vitest config hygiene;
- optional remote-preview Playwright support;
- selective visual regression after Warm Path stabilizes.

## 11. Recommended closure order

1. Make this documentation-synchronized PR #28 head FULL GREEN.
2. Preserve historical v0.22 freeze/version documents.
3. Resolve branch protection / required checks for `main`.
4. Import `arendon7/VIVIENDA` into the connected Vercel team.
5. Create a real Preview for the exact final consolidation candidate.
6. Run the 11-route visual/usability/accessibility/runtime/truth audit.
7. Fix only demonstrated material failures; if code changes, repeat the complete gate and record the new SHA.
8. Record the Beta release SHA.
9. Decide explicitly whether to merge PR #28 into `main`.
10. After Beta acceptance, close historical stacked PRs as superseded rather than deleting provenance.
11. Start v0.23 from the accepted Beta baseline.

## 12. Current decision

**Do not merge or promote to production yet.**

The product and internal release candidate are materially mature. Remaining Beta release work is limited to governance of `main`, exact-SHA Vercel Preview validation and the rendered cross-surface audit. No new product slice is authorized before the Beta baseline exists.
