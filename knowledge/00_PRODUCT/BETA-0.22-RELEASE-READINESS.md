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

The historical product line was built as stacked draft PRs from foundation through v0.22.

Before consolidation:

- v0.22 head was 404 commits ahead of `main`;
- `main` had 2 exclusive commits;
- those 2 commits only added and then removed an accidental `noop` file and do not represent an alternative product line.

PR #28 consolidates the full product line without rewriting or deleting the historical stacked PRs.

Historical PRs remain useful as slice-level traceability until a consolidation/release decision is completed.

## 3. Current consolidation gate

The historical v0.22 slice remains frozen separately. Its versioned STATUS and ADR files intentionally preserve the test counts and SHAs that belonged to that historical slice.

The latest fully green **behavioral consolidation head before this documentation synchronization** was:

`60643fc3cc4cf6f79cb1c44d8fbb587c93671024`

GitHub Actions PR run:

`33599856405`

Validated on that head:

- TypeScript: **PASS**;
- domain/server tests: **401/401 PASS** across 30 files;
- production build: **PASS**;
- Playwright: **180/180 PASS**;
- Chromium desktop: **PASS**;
- mobile 390 px: **PASS**.

This document synchronization is intentionally documentation-only. The commit containing this updated readiness file must itself pass the same repository gates before becoming the final internally certified release candidate. A green predecessor is evidence, not permission to skip validation of the new head.

## 4. CI/release hardening added during consolidation

The consolidation branch updates `.github/workflows/frontend-ci.yml` so that:

- `pull_request` remains a mandatory validation event by process;
- push CI also runs on `main`;
- push CI also runs on `release/**`;
- existing `implementation/**`, `design/**` and `product/**` branch validation is preserved;
- superseded runs are cancelled through workflow concurrency;
- GitHub actions runtime versions use `checkout@v6`, `setup-node@v7` and current artifact handling;
- Playwright diagnostics remain uploaded only on failure.

This does not substitute repository branch protection.

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

The cross-surface Beta audit additionally confirmed or corrected the following boundaries:

- Home separates self-service value from `Acompañamiento · preview`; productive assisted execution is not represented as active;
- `/revisar` and `/verificar` distinguish a local statement reference and user transcription from real documentary verification;
- R10 procedural priority does not route judicial documents into the Mortgage Twin;
- R7 `/auditoria-hipotecaria` describes how a professional audit **would be organized** rather than implying that VIVIENDA is already performing a contracted professional review;
- buyer flows do not represent planning, readiness or quote normalization as underwriting, approval, bank ranking or live offers;
- economic quote comparison remains C2 under explicit assumptions and does not convert modeled differences into guaranteed savings or universal recommendations.

## 6. Legal/truth revalidation — 2026-09-02

Release review rechecked current official public sources and found the implemented boundaries still aligned:

- annual mortgage renegotiation guidance continues to identify the January-February special window and 28 February deadline;
- Decreto 583 de 2025 remains in force and sets the first housing-credit installment cap at 40% of qualifying family income;
- Ley 546 Article 24 continues to contemplate debtor-requested assignment after a binding offer, with authorization within a maximum of ten business days under the statutory predicates;
- the 40% rule is not treated as a generic illegality detector for any current installment;
- lender approval, underwriting and offer generation remain outside canonical legal routing.

A release audit also identified that `/ayuda` was deriving `asOfDate` from the browser's local timezone even though the Opportunity Router uses the month of that date to decide whether the Article 20 January-February window is open. That could produce a one-day/month mismatch for users outside Colombia at boundary instants.

The consolidation now uses a canonical `America/Bogota` date for that legal routing path. Coverage includes:

- four unit tests for Colombia calendar boundaries; and
- an E2E case at `2026-03-01T04:30:00Z`, which is still 28 February in Colombia and therefore must preserve the February window.

Legal/source hardening must remain a recurring release task because these rules can change.

## 7. Security/privacy readiness

### Positive findings

- Evidence runtime is `server-only`;
- evidence operations fail closed while provider wiring is absent;
- rate-limit infrastructure fails closed rather than silently allowing requests;
- trusted-origin policy requires an explicit valid configured origin;
- the three evidence API routes bind to the trusted server origin before entering the HTTP boundary;
- when trusted-origin configuration is unavailable, the route fails closed with `503`, JSON error semantics and `Cache-Control: no-store`;
- the HTTP boundary validates POST/JSON, same-origin, path identifiers, body size, idempotency where applicable and rejects privileged browser-supplied authority fields;
- browser-controlled role, subject, storage locator and provider authority are rejected by architecture;
- Case Journal is designed append-only;
- canonical database tables receive least-privilege grants and no direct DELETE grant in the provider-ready SQL;
- provider-ready Supabase code is not represented as an activated provider;
- anonymous-first user value remains available without productive auth/storage.

### Intentionally unavailable

- productive Supabase project for VIVIENDA;
- productive auth/session provider;
- productive evidence Storage;
- OCR/document extraction provider;
- C3 documentary verification runtime;
- bank/Open Finance/bureau adapters;
- live offers or application submission.

These absences are not defects for anonymous Beta surfaces if the UI continues to describe them truthfully. They are blockers for any feature that would claim the corresponding capability.

## 8. Release blockers

### BLOCKER A — branch governance

Last verified on 2026-09-02:

- `main` is `protected: false`;
- required status checks are OFF;
- no repository-level rule currently prevents an accidental direct push/merge.

Before a public release, repository governance should require at minimum:

- pull request before merge;
- `verify` required;
- `e2e` required;
- no direct accidental push to `main`;
- force pushes disabled;
- branch deletion disabled;
- explicit merge strategy.

CI configuration alone does not enforce this.

### BLOCKER B — real preview deployment

Last verified on 2026-09-02 in connected Vercel team `NNNN` / `team_f0CRhAmwxqF9rXYd89sCVkTP`:

- project count: **0**;
- VIVIENDA is not imported as a project;
- no auditable Preview URL exists.

Required before public Beta:

- real Preview Deployment of the exact final candidate SHA;
- audit all 11 Beta routes: `/`, `/revisar`, `/verificar`, `/mi-vivienda`, `/auditoria-hipotecaria`, `/ayuda`, `/revisar-diferencia`, `/comprar/cuanto-puedo-comprar`, `/comprar/preparacion`, `/comprar/financiacion`, `/comprar/comparar-cotizaciones`;
- desktop and mobile 390 px visual inspection;
- keyboard/skip-link/focus accessibility smoke test;
- network/runtime error inspection;
- no horizontal overflow;
- no accidental productive provider/network calls;
- claims/truth inspection on rendered output;
- evidence APIs remain fail-closed while providers are intentionally inactive;
- `noindex`, `nofollow`, `nocache` and defensive headers remain preserved during preview validation.

### BLOCKER C — public-release indexing policy

The current application intentionally sets global `noindex`, `nofollow` and `nocache` metadata and `X-Robots-Tag` headers.

This is correct for private preview / pre-release Beta validation.

It must be an explicit launch decision before a public SEO-indexable release; it must not be removed merely to make a preview look production-like.

## 9. Non-blocking technical debt

Tracked in issue #32 and explicitly **not** a Beta 0.22 blocker without new material evidence:

- dependency/security scanning policy;
- Content Security Policy design;
- WebKit/Firefox deliberate smoke coverage;
- automated accessibility scanning;
- Preview performance/Core Web Vitals;
- Vitest ESM/CommonJS config hygiene;
- optional remote-preview Playwright support;
- selective visual regression after Warm Path stabilizes.

Do not execute this post-Beta backlog by mutating the release candidate merely to obtain a cosmetically cleaner checklist.

## 10. Recommended closure order

1. Make this documentation-synchronized PR #28 head FULL GREEN.
2. Preserve the v0.22 historical freeze and keep historical version documents immutable unless factually wrong about their own version.
3. Resolve branch protection / required checks for `main`.
4. Import `arendon7/VIVIENDA` into the connected Vercel team.
5. Create a real Preview for the exact final consolidation candidate.
6. Run the 11-route visual/usability/accessibility/runtime/truth audit using the Housing Finance Design Orchestrator acceptance sequence.
7. Fix only demonstrated material failures; if code changes, repeat the complete gate and record the new SHA.
8. Record the Beta release SHA.
9. Decide explicitly whether to merge consolidation PR into `main`.
10. Only after the Beta baseline exists, close/retire stacked historical PRs as superseded rather than deleting history.
11. Start v0.23 from the accepted Beta baseline, not from an arbitrary old stacked branch.

## 11. Current decision

**Do not merge or promote to production yet.**

The product and internal release candidate are materially mature. Remaining release work is governance of `main`, exact-SHA Vercel Preview validation and the rendered cross-surface audit. No new product slice is authorized before that baseline exists.
