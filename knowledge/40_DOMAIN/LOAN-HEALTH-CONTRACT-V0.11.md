# LOAN HEALTH CONTRACT v0.11

Date: 2026-08-26
Status: domain contract
Base: v0.10 product integration

## 1. Objective

Define a qualitative, explainable Loan Health evaluation for an existing housing-loan borrower without inventing a bureau-style score, approval probability, market-rate comparison or legal conclusion.

Loan Health is a **decision state**, not a risk score.

It answers:

> What do we understand about this loan, what deserves attention, and what is the next legitimate action?

## 2. Inputs

Loan Health may consume only already-classified product state:

- global precision C0–C3;
- product type;
- payment/collections state;
- Opportunity Router result produced from the same snapshot.

It does not independently reinterpret law or create new financial formulas.

## 3. Dimensions V1

### D1 — Structure understanding

Evaluates whether the current loan is sufficiently understood for the next decision.

- C0 → `needs_data`;
- C1 → `needs_data` for modeled decisions;
- C2 → `ready` for supported modeled scenarios;
- C3 → `ready` with documentary verification.

C2 is never relabeled C3.

### D2 — Prepayment

Derived only from R1/R2 routes.

Possible outcomes:

- `ready` — an eligible route exists without unresolved blockers;
- `explore` — route exists but exact modeled effect still needs data/precision;
- `not_applicable` — product is known not to be a covered mortgage for the current rulebook;
- `needs_data` — product classification is unknown or no supported basis is available.

Loan Health must preserve the difference between reducing term and reducing installment.

### D3 — Transfer / portfolio comparison

Derived from R5.

- binding offer + eligible route → `ready`;
- generic candidate route → `explore`;
- unknown product → `needs_data`;
- known unsupported product → `not_applicable`.

`explore` is not bank compatibility, offer or approval.

### D4 — Annual restructuring

Derived from R3.

Maps router state without changing legal meaning:

- `eligible_now` → `ready`;
- `candidate` → `explore`;
- `seasonal_wait` → `seasonal`;
- `legal_review` → `professional_review`;
- `not_recommended` → `not_applicable`.

Loan Health may not convert the Article 20 40% rule into a generic illegality detector.

### D5 — Consistency / unexplained issue

Derived from R7.

- R7 present → `attention`;
- R7 absent → `no_flag_reported`.

`no_flag_reported` means only that the evaluated facts did not report a concrete discrepancy. It does **not** prove the lender acted correctly.

### D6 — Procedural/payment state

Derived from the canonical payment state:

- `current` → `no_flag_reported`;
- `early_arrears`, `collections`, `prelegal` → `attention`;
- `executive`, `embargo_or_auction` → `professional_review`;
- `unknown` → `needs_data`.

This dimension does not calculate days, deadlines or defense strategy.

## 4. Allowed dimension statuses

- `ready`;
- `explore`;
- `needs_data`;
- `seasonal`;
- `attention`;
- `professional_review`;
- `no_flag_reported`;
- `not_applicable`.

No red/green health score is implied by these states.

## 5. Overall decision state

The evaluator produces one overall state using consequence-first precedence:

1. `professional_review_priority` — procedural state requires professional review.
2. `attention_required` — a reported inconsistency or payment-pressure state requires attention.
3. `actionable_opportunity` — at least one supported route is ready without blockers.
4. `improve_precision` — current precision is C0/C1 and no higher-priority state exists.
5. `no_priority_action_detected` — no higher-priority condition is present.

The overall state is not called “healthy”, “good”, “safe”, “approved” or “low risk”.

## 6. Output contract

Each dimension returns:

- code;
- label;
- status;
- explanation;
- nextAction;
- sourceRouteCodes when applicable.

Overall result returns:

- precision;
- decisionState;
- headline;
- dimensions;
- notices.

No numeric score field exists in v0.11.

## 7. Provenance

Loan Health is derived from:

`Mortgage/loan snapshot state → Opportunity Router → Loan Health evaluator`.

It must never silently upgrade source precision.

Route-level legal basis remains owned by Opportunity Router. Loan Health may link/summarize route outcomes but does not duplicate or reinterpret legal rules.

## 8. Guardrails

Reject by design:

- 0–100 score;
- approval probability;
- default probability;
- bureau score proxy;
- bank/product matching percentage;
- market-rate competitiveness without current external data;
- “your loan is healthy” based on absence of reported issues;
- legal violation conclusions;
- litigation strategy;
- guaranteed savings.

## 9. Acceptance criteria

1. C1 cannot produce a verified-document state.
2. R10 always dominates ordinary optimization in overall decision state.
3. collections/prelegal produces attention even without a lawsuit route.
4. R7 produces attention but does not state that a violation occurred.
5. an eligible route with blockers is `explore`, not `ready`.
6. R5 candidate is never presented as bank compatibility/approval.
7. Article 20 seasonal state is preserved.
8. absence of R7 is worded as `no_flag_reported`, not correctness.
9. evaluator output contains no score/probability.
10. evaluator is deterministic and side-effect free.

## 10. Out of scope

- calibrated numerical Loan Health score;
- current bank-rate feed;
- portfolio-transfer marketplace;
- insurer comparison;
- bureau/open-finance inputs;
- predictive default model;
- automated legal conclusion;
- notification/event monitoring.
