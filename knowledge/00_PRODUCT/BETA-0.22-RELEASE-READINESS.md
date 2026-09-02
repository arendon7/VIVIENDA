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

## 3. Functional gate inherited from v0.22

The v0.22 freeze and its validated PR head established:

- TypeScript: PASS;
- domain tests: **397/397 PASS**;
- production build: PASS;
- Playwright: **176/176 PASS**;
- Chromium desktop: PASS;
- mobile 390 px: PASS.

The release consolidation must reproduce those gates against current `main` before any merge.

## 4. CI/release hardening added during consolidation

The consolidation branch updates `.github/workflows/frontend-ci.yml` so that:

- `pull_request` remains a mandatory validation event by process;
- push CI also runs on `main`;
- push CI also runs on `release/**`;
- existing `implementation/**`, `design/**` and `product/**` branch validation is preserved;
- superseded runs are cancelled through workflow concurrency;
- GitHub actions runtime versions are updated from deprecated v4 Node-runtime actions to current majors used by GitHub documentation (`checkout@v6`, `setup-node@v7`);
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

## 6. Legal/truth revalidation — 2026-09-02

Release review rechecked current official public sources and found the implemented boundaries still aligned:

- annual mortgage renegotiation guidance continues to identify the January-February special window and 28 February deadline;
- Decreto 583 de 2025 remains in force and sets the first housing-credit installment cap at 40% of qualifying family income;
- Ley 546 Article 24 continues to contemplate debtor-requested assignment after a binding offer, with authorization within a maximum of ten business days under the statutory predicates;
- the 40% rule is not treated as a generic illegality detector for any current installment;
- lender approval, underwriting and offer generation remain outside canonical legal routing.

Legal/source hardening must remain a recurring release task because these rules can change.

## 7. Security/privacy readiness

### Positive findings

- Evidence runtime is `server-only`;
- evidence operations fail closed while provider wiring is absent;
- rate-limit infrastructure fails closed rather than silently allowing requests;
- trusted-origin policy requires an explicit valid configured origin;
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

Current `main` is not protected and has no required status checks configured at repository level.

Before a public release, repository governance should require at minimum:

- pull request before merge;
- `verify` required;
- `e2e` required;
- no direct accidental push to `main`;
- explicit merge strategy.

CI configuration alone does not enforce this.

### BLOCKER B — real preview deployment

A deployable Vercel preview has not yet been validated in the currently connected Vercel team.

Required before public Beta:

- real Preview Deployment of the exact candidate SHA;
- audit `/`, `/revisar`, `/verificar`, `/mi-vivienda`, buyer flows, `/ayuda`, `/revisar-diferencia`;
- desktop and mobile visual inspection;
- keyboard/accessibility smoke test;
- network/runtime error inspection;
- no horizontal overflow;
- no accidental provider/network calls;
- claims/truth inspection on rendered output.

### BLOCKER C — public-release indexing policy

The current application intentionally sets global `noindex`, `nofollow` and `nocache` metadata and `X-Robots-Tag` headers.

This is correct for private preview / pre-release Beta validation.

It must be an explicit launch decision before a public SEO-indexable release; it must not be removed merely to make a preview look production-like.

## 9. Non-blocking technical debt

- Vitest currently emits a config-loader warning because ESM syntax is loaded from `vitest.config.ts` in a CommonJS package context; tests still pass. Resolve deliberately rather than suppressing blindly.
- dependency/security scanning is not yet a documented release gate in this repository;
- preview performance/Core Web Vitals have not been measured against a deployed candidate;
- real-browser cross-engine coverage is Chromium-focused; Safari/WebKit and Firefox remain future release hardening candidates.

## 10. Recommended closure order

1. Consolidation PR #28 FULL GREEN on its final head.
2. Audit consolidated diff and critical security/truth files.
3. Preserve v0.22 freeze and record any consolidation-only commits separately.
4. Resolve branch protection / required checks for `main`.
5. Create a real Vercel Preview for the exact consolidation candidate.
6. Run visual/usability/accessibility/truth audit using the Housing Finance Design Orchestrator acceptance sequence.
7. Fix only demonstrated hard failures; re-run full gate.
8. Record Beta release SHA.
9. Decide explicitly whether to merge consolidation PR into `main`.
10. Only after the Beta baseline exists, close/retire stacked historical PRs as superseded rather than deleting history.
11. Start v0.23 from the Beta baseline, not from an arbitrary old stacked branch.

## 11. Current decision

**Do not merge or deploy yet.**

The codebase is materially closer to a Beta than the current Git history suggests. The remaining work is primarily release governance, preview validation and final cross-surface audit—not invention of another product slice.
