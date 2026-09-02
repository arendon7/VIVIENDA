# ADR-0006 — Beta 0.22 consolidation strategy

## Estado

Accepted — 2026-09-02

## Contexto

VIVIENDA reached v0.22 through a deliberately stacked sequence of draft PRs. This preserved slice-level reviewability while the product was being defined, but left `main` far behind the actual executable product line.

At the start of this decision:

- current v0.22 head: `4ec60aa21ba1097847adf0c60a21e4c3722576f6`;
- v0.22 official functional/documental freeze: `df179c25e1e547ed0cecf0eea4a07b987f3e9a1a`;
- `main`: `128238f4eeae724f181916a2b5e1fb7873d2adb3`;
- v0.22 was 404 commits ahead and 2 commits behind `main`;
- the two exclusive `main` commits only added and removed an accidental `noop` file.

The stacked PRs are valuable historical evidence, but they are no longer an efficient release mechanism.

## Decisión

Create a dedicated consolidation branch and draft PR:

- branch: `release/beta-0.22-consolidation`;
- PR: #28 — `Beta 0.22 — Consolidación de línea de producto`;
- base: `main`.

The consolidation PR becomes the candidate integration unit for the first coherent Beta baseline.

The historical stacked PRs are preserved during validation. They are not merged sequentially merely to reconstruct history, and they are not deleted.

## Rationale

A single consolidation PR:

1. tests the full product line against the actual current `main`;
2. avoids changing the frozen bases of dozens of historical PRs;
3. makes release readiness review possible as one coherent system;
4. preserves slice-level PRs as provenance and audit history;
5. provides a clean future branching point after Beta.

## CI hardening

During consolidation, the CI workflow is hardened so push validation covers:

- `main`;
- `release/**`;
- `implementation/**`;
- `design/**`;
- `product/**`.

Superseded runs are cancelled through concurrency, and GitHub action majors are updated to current supported runtime versions.

This hardening does not substitute repository-level branch protection.

## Release gates

PR #28 must remain draft until all of the following are satisfied:

1. TypeScript PASS;
2. all domain tests PASS;
3. production build PASS;
4. full Playwright desktop/mobile PASS;
5. consolidated-diff review;
6. security/privacy boundary review;
7. current legal/truth review;
8. repository governance for `main` resolved;
9. exact-SHA Preview Deployment available;
10. rendered visual/usability/accessibility/truth audit completed.

## Historical PR disposition

After a Beta consolidation is explicitly merged and recorded:

- historical stacked PRs should normally be closed as **superseded by the Beta consolidation**, not merged one-by-one;
- their branches and PR discussion remain historical provenance unless a separate repository-cleanup policy decides otherwise;
- references to their freeze SHAs remain valid historical evidence.

## Next development branch

v0.23 must branch from the accepted Beta baseline (or a deliberately named post-Beta development branch), not directly from the old v0.22 stacked branch.

## Non-decision

This ADR does **not** authorize:

- merge of PR #28;
- deploy;
- production Supabase/Auth/Storage activation;
- OCR/C3 activation;
- bank/Open Finance integrations;
- closure of historical PRs before Beta acceptance.
