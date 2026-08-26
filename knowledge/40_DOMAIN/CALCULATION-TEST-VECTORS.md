# VIVIENDA — Golden Calculation Test Vectors

Status: draft product contract
Scope: borrower snapshot and prepayment engines
Branch: product/borrower-calculation-contracts

## Purpose

These vectors are independent acceptance cases for implementation. UI components must never be the source of truth for mortgage math. Any future calculation engine must reproduce these cases within the stated tolerances before a result can be labeled modeled or verified.

## Conventions

- Currency values are COP unless otherwise stated.
- EA means effective annual rate.
- Monthly effective rate is `(1 + EA)^(1/12) - 1`.
- Interest is calculated on opening principal balance for the period.
- Prepayments in these vectors are applied with no penalty or transaction fee.
- Insurance, taxes and administrative charges are excluded unless explicitly included.
- Rounding for display must not be reused in the calculation core.
- Results below use full precision internally; display examples may round to nearest COP 1,000.

## TV-PESOS-ANN-001 — Constant payment baseline

Inputs:
- principal: 200,000,000
- rate: 12.00% EA
- remaining term: 180 months
- system: constant payment in pesos
- extra payments: none

Expected:
- monthly effective rate: 0.789274% approximately
- modeled contractual payment excluding insurance: 2,321,974.68
- payoff month: 180
- total modeled interest: 217,955,442.33
- ending principal: 0 within tolerance

Acceptance tolerance:
- payment: ± COP 1
- total interest: ± COP 5
- ending balance: absolute value < COP 1

## TV-PESOS-ANN-002 — Recurring extra payment, reduce term

Same baseline as TV-PESOS-ANN-001 plus:
- recurring extra principal: 200,000 each month
- strategy: preserve contractual payment and apply extra amount to capital

Expected:
- payoff month: 148
- modeled term reduction: 32 months
- total modeled interest: 172,874,680.53
- modeled interest avoided versus baseline: 45,080,761.81

Important interpretation:
- the recurring capital supplied by the user is not counted as savings;
- the modeled benefit is the future interest no longer caused because principal is repaid earlier;
- insurance effects are not included in this vector.

Acceptance tolerance:
- payoff month: exact
- total interest: ± COP 5
- interest avoided: ± COP 10

## TV-PESOS-ANN-003 — One-time prepayment, reduce term

Same baseline as TV-PESOS-ANN-001 plus:
- one-time capital prepayment: 20,000,000
- timing: period 1, after ordinary period interest is accrued and together with the first payment
- strategy: preserve contractual installment; reduce term

Expected:
- payoff month: 142
- modeled term reduction: 38 months
- total modeled interest: 147,765,955.87
- modeled interest avoided versus baseline: 70,189,486.47

Acceptance tolerance:
- payoff month: exact
- total interest: ± COP 5
- interest avoided: ± COP 10

## TV-PESOS-ANN-004 — Larger recurring extra payment

Same baseline as TV-PESOS-ANN-001 plus:
- recurring extra principal: 500,000 each month
- strategy: preserve contractual installment; reduce term

Expected:
- payoff month: 119
- modeled term reduction: 61 months
- total modeled interest: 133,547,164.78
- modeled interest avoided versus baseline: 84,408,277.56

Use case:
- verifies that the engine handles the final partial payment correctly rather than blindly adding the full recurring extra amount.

## TV-PESOS-CAP-001 — Constant principal baseline

Inputs:
- principal: 120,000,000
- rate: 10.00% EA
- remaining term: 120 months
- system: constant capital amortization in pesos
- scheduled principal: 1,000,000 per month

Expected:
- first-period interest: 956,896.85
- first payment: 1,956,896.85
- second payment: 1,948,922.71
- final payment: 1,007,974.14
- payoff month: 120
- total modeled interest: 57,892,259.51

Acceptance:
- payments must decline period by period, absent external costs;
- scheduled principal must remain constant except the final adjustment if required.

## TV-UVR-ANN-001 — Constant payment in UVR units

This vector verifies the credit mathematics in UVR units only. It must not be converted to future COP without an explicit UVR/inflation path assumption.

Inputs:
- principal: 1,000,000 UVR
- real credit rate: 6.00% EA over UVR
- remaining term: 240 months
- system: constant payment in UVR

Expected:
- monthly effective real rate: 0.486755% approximately
- modeled payment: 7,072.920660 UVR
- first-period interest: 4,867.550565 UVR
- first-period principal: 2,205.370095 UVR
- balance after first period: 997,794.629905 UVR
- total modeled interest: 697,500.958407 UVR
- payoff month: 240

Critical UX rule:
- if the product does not have an explicit future UVR path, it may show the contractual path in UVR but must not present a deterministic future COP payment series.

## Negative / guardrail cases

### TV-GUARD-001 — Missing rate

Inputs:
- balance + installment + remaining term only

Expected classification:
- C1 estimate at most;
- no claim of exact amortization schedule;
- interface asks for rate/system or extract to improve precision.

### TV-GUARD-002 — UVR credit with only COP installment

Expected:
- no fixed-COP annuity assumption;
- classify as insufficient for deterministic COP projection;
- request current UVR information / extract / system details.

### TV-GUARD-003 — Payment lower than accrued interest

Expected:
- engine flags non-amortizing/inconsistent input rather than forcing a normal amortization table;
- no optimization recommendation until data is reconciled.

### TV-GUARD-004 — Extra payment greater than remaining principal

Expected:
- cap principal payment at remaining balance;
- no negative principal;
- final payment is partial;
- payoff event is emitted once.

### TV-GUARD-005 — Zero or negative term/rate/principal values

Expected:
- validation error;
- no simulation output.

## Benefit Breakdown acceptance

For every prepayment simulation the output model must expose separately:

1. `user_extra_principal`
2. `baseline_interest_remaining`
3. `scenario_interest_remaining`
4. `interest_avoided`
5. `other_costs_avoided` when modeled and sourced
6. `implementation_costs` when applicable
7. `net_modeled_benefit`
8. `term_reduction_months`
9. precision/confidence class
10. assumptions and provenance

The UI must not combine `user_extra_principal` with `interest_avoided` under a label such as “ahorro”.

## Implementation gate

Before a calculation engine can feed public-facing results:
- all golden vectors pass;
- all guardrail vectors fail safely;
- unit conversion tests pass;
- rounding is isolated from core math;
- source/provenance metadata survives calculation;
- a second implementation or independent spreadsheet/script cross-checks the outputs.
