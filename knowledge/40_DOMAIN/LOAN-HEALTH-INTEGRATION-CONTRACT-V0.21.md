# LOAN HEALTH INTEGRATION CONTRACT v0.21

Status: domain integration contract
Base: v0.20 — Statement-Guided Mortgage Twin

## 1. Objective

Integrate the existing Opportunity Router and Loan Health evaluator into the real Statement-Guided Mortgage Twin journey without flattening mixed precision into a false global C2/C3 state.

v0.21 answers:

> **What is the current decision state of this real user-provided Mortgage Twin, and which route-specific model has actually reached a higher precision?**

## 2. Governing principle

> **Precision belongs to the fact/model that earned it; a C2 prepayment model does not upgrade unrelated routes or the source document.**

The Mortgage Twin created from user transcription remains C1.

A deterministic model may produce C2 for one supported decision path.

C3 remains document-derived and reconciled evidence only.

## 3. Existing authorities remain separate

### Opportunity Router

Owns:

- legal route eligibility/candidacy;
- route priority;
- legal basis;
- route blockers;
- human-review requirements;
- next procedural action.

v0.21 does not duplicate or reinterpret those rules.

### Financial model

The current v0.20 prepayment engine models a recurring additional-principal strategy that retains the contractual payment and reduces payoff term.

Therefore its modeled route is specifically:

`R1_PREPAGO_PLAZO`

It is **not** evidence that `R2_PREPAGO_CUOTA`, `R3`, `R5`, `R7` or `R10` reached C2.

### Loan Health

Summarizes the resulting decision state across dimensions after route evaluation/model integration.

It remains qualitative and explainable; it never becomes a 0–100 score.

## 4. Integration layer

v0.21 introduces a deterministic integration function over two inputs:

1. the ordinary `OpportunityRouterInput`;
2. a `DecisionModelContext`.

Initial context:

```ts
type DecisionModelContext = {
  prepaymentTermScenario: "not_modeled" | "modeled_c2";
};
```

The integration function first evaluates the canonical C1 Router result.

When `prepaymentTermScenario === "modeled_c2"` and source precision is C1:

1. evaluate the same Router input at C2;
2. take only the C2 version of `R1_PREPAGO_PLAZO`;
3. replace only R1 in the C1 result;
4. preserve every other route from the C1 result unchanged;
5. if R1 is primary, point `primaryRoute` to the integrated R1 object;
6. preserve base notices/order/priority.

This avoids string-based blocker deletion and avoids globally promoting all routes to C2.

## 5. Fail-closed rules

The integration must not promote R1 when:

- the model context says `not_modeled`;
- global precision is C0;
- R1 does not exist in both base and modeled evaluations;
- the product is not a covered mortgage;
- there is no positive extra principal;
- the caller merely has enough fields but never constructed the model.

When any required condition is absent, return the ordinary Router result.

## 6. Global vs route precision

### Global/source precision

The Statement-Guided Mortgage Twin stays C1 because its fields were transcribed by the user from a local file that VIVIENDA did not read.

### Route precision

A route can carry higher model precision when a specific supported model was actually constructed.

Example:

- Mortgage Twin source: C1;
- R1 term-reduction scenario: C2;
- R2 payment reduction: C1;
- R3 restructuring: C1;
- R5 transfer: C1;
- R7 claim: C1;
- R10 procedural review: C1.

No route receives C3 in v0.21.

## 7. Loan Health integration

`LoanHealthInput` may receive route-specific modeled context.

For a C1 source with a modeled R1 C2 scenario:

- overall/source precision remains C1;
- structure dimension must explicitly state that source data remains C1 while one route has a C2 model;
- prepayment may become `ready` if the integrated R1 route is eligible and blocker-free;
- unrelated dimensions retain their ordinary states;
- overall decision state may become `actionable_opportunity` because one action is genuinely modeled/ready.

This is not contradictory: overall source precision and route-specific model readiness are separate axes.

## 8. State precedence remains unchanged

Loan Health consequence-first precedence remains:

1. `professional_review_priority`;
2. `attention_required`;
3. `actionable_opportunity`;
4. `improve_precision`;
5. `no_priority_action_detected`.

Therefore an executive/embargo or concrete inconsistency still outranks a modeled prepayment opportunity.

## 9. Input reuse

When v0.20 already modeled an additional monthly principal amount, v0.21 may initialize the Router with:

- that extra principal amount;
- goal `finish_sooner`;
- `prepaymentTermScenario = modeled_c2`.

The user may change those values.

If the user changes the inherited extra principal or changes the goal away from the modeled term-reduction path, the C2 model context must be invalidated in the workspace unless a new matching model is constructed.

v0.21 does not silently assume the old model still applies to changed inputs.

## 10. User corrections

Changing product classification away from `mortgage_housing` invalidates the inherited modeled R1 context.

Changing inherited extra principal to another amount invalidates the modeled R1 context.

Changing the goal away from `finish_sooner` does not erase the historic model shown above, but the Router must not use it as C2 authority for the newly selected decision path.

The integration layer is therefore fed by a boolean/model state derived from **current workspace inputs matching the modeled scenario**, not from the mere existence of an earlier model object.

## 11. Truth boundaries

v0.21 must never state or imply:

- the extract was verified;
- all routes are C2 because one route is modeled;
- reducing term is better than reducing payment;
- modeled interest avoided is guaranteed savings;
- a bank will accept an instruction;
- a transfer candidate is bank compatibility/approval;
- a reported inconsistency proves illegality;
- absence of a reported inconsistency proves correctness;
- Loan Health is a credit/risk score.

## 12. Acceptance criteria

1. C1 + no model returns ordinary C1 Router output unchanged.
2. C1 + actual modeled term-prepayment replaces only R1 with its C2 Router version.
3. R2 remains C1 and preserves its model blocker.
4. R3/R5/R7/R10 remain C1.
5. C0 cannot be promoted by model context.
6. C2/C3 global inputs are not downgraded.
7. missing R1 fails closed to ordinary Router result.
8. primaryRoute points to the integrated R1 when R1 is primary.
9. model context does not change route priority/order.
10. Loan Health source precision remains C1 after route-specific R1 C2.
11. structure dimension explains partial precision rather than saying all modeled decisions lack C2.
12. prepayment can become ready from integrated R1.
13. professional-review/attention states still outrank modeled optimization.
14. changing inherited model inputs invalidates route-specific C2 in UI integration.
15. no output contains a numeric health score or approval probability.

## 13. Out of scope

- new financial formulas;
- C2 model for reducing payment;
- UVR prepayment model;
- leasing prepayment model;
- transfer economics;
- market rates;
- bank matching;
- account/persistence;
- real upload/OCR;
- C3 promotion;
- automatic legal conclusion.
