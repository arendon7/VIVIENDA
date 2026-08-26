# ADR-0003 — Rebalance v0.10 toward product integration

Date: 2026-08-26
Status: accepted for v0.10

## Context

VIVIENDA progressed from the borrower Warm Path through Opportunity Router, Case Plan, Case State, persistence, Storage/Auth coordination and an HTTP server boundary.

That work produced strong domain/security foundations, but implementation depth outpaced the visible product sequence defined in `MVP-SCOPE.md`.

At v0.9 the repository had provider-ready persistence and evidence infrastructure while the following remained unmaterialized as coherent product surfaces:

- Account/Home Profile;
- persistent-product shell (`Mi Vivienda`);
- Mortgage Twin as the primary recurring workspace;
- validated Loan Health output;
- prospective-buyer path.

## Decision

Pause new horizontal infrastructure after v0.9 and use v0.10 to integrate the existing foundation into the visible recurring product.

The first integration surface is `/mi-vivienda`.

Until real auth/persistence is connected, it must be explicitly presented as a preview and may not imply that user data is saved, synced, monitored or verified.

## Canonical sequence after v0.10

1. Mi Vivienda / Mortgage Twin integration.
2. Loan Health V1 domain contract and validated output.
3. One real assisted execution path.
4. Prospective-buyer affordability/Home Profile.
5. Payment-pressure and inconsistency journeys.
6. Buy / Compra Segura.
7. Bank/partner adapters and marketplace only after commercial validation.

## Consequences

### Positive

- engineering follows product evidence again;
- existing Case/Evidence architecture gets tested against a real surface before expanding;
- prevents a universal workflow/backend from growing without user value;
- preserves the primary wedge of existing borrowers;
- reduces risk of fabricated scores, offers or account state.

### Cost

- some provider-ready backend code remains dormant until live infrastructure is intentionally activated;
- Account/Profile and buyer breadth are delayed until the primary borrower loop is coherent.

## Guardrails

- `Home Readiness Index` and `Loan Health` may not expose numerical scores until a separate validated contract exists;
- bank compatibility/matching requires verified adapter rules and provenance;
- provider-ready infrastructure must not be described as live capability;
- Case Plan remains intention; Case State records real execution only when corresponding evidence/authority exists;
- professional legal engagement remains separated from ordinary acquisition/affiliate economics.

## Alternatives rejected

### Continue v1.0+ infrastructure first

Rejected because it would deepen the product/engineering imbalance and violate the MVP principle of proving one or two execution routes before universal workflow breadth.

### Jump directly to buyer/marketplace breadth

Rejected because the existing-borrower wedge already has the deepest validated domain value and is the most efficient place to prove the full loop.

### Add numerical health/readiness scores immediately

Rejected because no validated formula, calibration dataset or public methodology exists yet.
