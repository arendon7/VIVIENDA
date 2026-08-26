# STATUS v0.13 — Prospective Buyer / Affordability

Date: 2026-08-26
Branch: `product/buyer-affordability-v0.13`
Base: v0.12 `product/mortgage-audit-assisted-v0.12`

## Objective

Add the first public Journey 2 slice for a prospective buyer without weakening the existing-borrower wedge or inventing approval, score, market-rate or account capabilities.

## Implemented

- domain contract `BUYER-AFFORDABILITY-CONTRACT-V0.13.md`;
- pure affordability calculator outside React;
- independent golden vectors and domain tests;
- corrected property-ceiling formula that does not force financing to equal maximum LTV;
- UX specification `BUYER-AFFORDABILITY-UX-SPEC-V0.13.md`;
- public route `/comprar/cuanto-puedo-comprar`;
- C1 before identity/contact;
- optional C2 using user-supplied EA rate + term;
- separate VIS / non-VIS references when category is unknown;
- qualitative binding constraint: payment vs down payment;
- Home entry point as secondary path while `Revisar mi crédito` remains primary;
- desktop/mobile E2E coverage.

## Truth boundaries

### Planning benchmark

VIVIENDA v0.13 uses 30% of declared net household income as an educational **total recurring debt-service planning benchmark**.

This is not:

- law;
- bank underwriting;
- an approval rule.

### Regulatory reference

Current v0.13 reference records:

- first installment ceiling: 40% of family income under the current housing-credit regulation;
- max LTV non-VIS: 70%;
- max LTV VIS: 80%.

The 40% ceiling is not labeled sustainable/recommended. A personalized 40% amount is not calculated unless accreditable family income is explicitly supplied.

### C1

C1 uses:

- net household income;
- recurring debt payments;
- available down payment;
- VIS/non-VIS/unknown.

C1 does not derive a mortgage principal because rate + term are absent.

### C2

C2 additionally requires a rate and term supplied by the user. It supports only:

`pesos + fixed EA + constant payment`

It is not a market quote or lender offer.

## Corrected property-ceiling invariant

Rejected:

`modeledPrincipal / maxLtv`

Reason: it assumes every purchase is financed exactly at maximum LTV and understates scenarios where the buyer contributes more equity.

Current invariant:

`propertyCeilingFromCreditAndCash = modeledPrincipal + availableDownPayment`

`propertyCeilingFromDownPayment = availableDownPayment / (1 - maxLtv)`

`modeledPropertyCeiling = min(propertyCeilingFromCreditAndCash, propertyCeilingFromDownPayment)`

Transaction/closing costs remain out of scope and are disclosed.

## UI guardrails

- no name/email/phone/ID before first result;
- no bureau/score request;
- no automatic market rate;
- no `approved`, approval probability or bank matching;
- no fake `Guardar` / active Home Profile persistence;
- result focus moves to the result heading;
- no horizontal overflow at 390 px;
- unknown category keeps two labeled scenarios.

## Canonical product order after v0.13

1. existing borrower core — proven;
2. Mi Vivienda + Mortgage Twin — preview/proven UX;
3. Loan Health — qualitative/proven;
4. one assisted R7 route — proven as preview;
5. prospective buyer affordability — v0.13;
6. next: Home Profile contract / progressive buyer enrichment or Payment Pressure, chosen by product evidence rather than infrastructure convenience;
7. Buy / Compra Segura later;
8. bank adapters / Open Finance only after commercial/data contracts exist.

## Still not live

- auth/persistence;
- VIVIENDA Supabase project;
- VIVIENDA Vercel deployment;
- OCR/storage production;
- bank adapters;
- Open Finance;
- actual market rates;
- subsidy eligibility;
- Home Readiness score;
- application/approval;
- payments/contracting.