# VIVIENDA — Prepayment Calculation Contract V0.1

Date: 2026-08-25
Status: Domain/UX contract. Requires financial review and test vectors before production.

## Purpose

Model how voluntary additional principal payments can affect a Colombian housing loan while clearly separating:

- the user's additional money;
- term reduction;
- installment reduction;
- avoided future interest;
- other costs;
- value created by any separate negotiation/legal intervention.

The core product principle is:

> Do not attribute to VIVIENDA an “interest saving” that is primarily created by the user's own earlier repayment of principal.

## Legal context for product wording

For eligible housing credit under Ley 546, partial or total prepayment is permitted without penalty and a partial prepayment can be directed to reduce installment or term according to the applicable legal/operational framework.

VIVIENDA must distinguish this statutory/contractual right from:

- annual restructuring;
- negotiated rate reduction;
- portfolio transfer;
- debt forgiveness;
- correction of lender error.

“Abono inteligente” may be used only as a market/search term in education if useful; it is not treated as an autonomous legal mechanism in the domain model.

## Supported scenario types

### S0 — Baseline

User makes only scheduled payments under the modelled current loan.

### S1 — One-time principal prepayment, reduce term

User contributes a lump sum at a defined date and keeps scheduled debt-service payment approximately unchanged, subject to actual lender mechanics.

### S2 — One-time principal prepayment, reduce installment

User contributes a lump sum and keeps remaining contractual term, recalculating debt-service payment on the lower principal balance under the model assumptions.

### S3 — Recurring additional principal, target earlier payoff

User adds a specified amount to principal each period.

### S4 — Custom future lump sums

Optional later capability: planned bonuses/severance/annual contributions at specified periods.

MVP should implement S0–S3 before complex schedules.

## Confidence prerequisites

### Exact-looking prepayment output requires C2/C3 borrower model

Need enough information to model the baseline loan:

- current principal;
- amortization system;
- rate and rate type;
- remaining periods;
- debt-service payment or schedule;
- currency/modalidad;
- handling of insurance/fees.

If these are missing, provide only approximate scenario ranges and label them C1.

## Peso constant-payment algorithm

For a verified fixed-rate constant-payment peso loan:

### Monthly rate

`i = (1 + EA)^(1/12) - 1`

unless the contractual rate is already supplied in the correct periodic form.

### Baseline period

For period `t`:

`interest_t = balance_(t-1) × i`

`scheduled_principal_t = scheduled_payment - interest_t`

`balance_t = max(0, balance_(t-1) - scheduled_principal_t)`

Insurance and non-debt-service amounts are not included in `scheduled_payment` for this formula.

Stop when balance reaches zero.

### Lump-sum term-reduction scenario

At the declared prepayment timing:

`balance_after_prepayment = max(0, balance_before_prepayment - prepayment_amount)`

Subsequent scheduled debt-service payment remains the baseline scheduled payment under the simulation assumption.

Recalculate periods until balance reaches zero.

### Lump-sum installment-reduction scenario

After prepayment:

`new_payment = B_new × i / (1 - (1+i)^(-n_remaining))`

where the verified amortization system supports the constant-payment model.

Term remains `n_remaining`.

### Recurring additional-principal scenario

For each period:

1. calculate scheduled interest;
2. calculate scheduled principal;
3. apply additional principal amount;
4. clamp final payment/prepayment so balance cannot become negative;
5. continue until payoff.

The UI should identify the simulation convention for whether extra principal is assumed applied on payment date and whether the bank's actual operational timing can differ.

## Constant-principal model

If contractual system is constant principal, do not reuse constant-payment recalculation formulas.

### Baseline

Forward remaining principal amortization:

`scheduled_principal = current_balance / remaining_periods`

where this is consistent with the verified remaining contractual structure.

`interest_t = balance_(t-1) × i`

`payment_t = scheduled_principal + interest_t`

### Term-reduction prepayment

A prepayment lowers balance and can reduce number of future principal installments while the exact lender recalculation convention may require bank-specific validation.

Product rule:

If bank-specific application cannot be faithfully modelled, show a projected payoff range or state that a lender recalculation is needed rather than forcing a generic formula.

## UVR prepayment policy

UVR scenarios require separate treatment.

### In UVR terms

Where sufficient data exists, prepayment can be modelled as a reduction of UVR principal according to the identified amortization structure.

### In peso terms

Future peso payment/saving projections depend on future UVR values/inflation.

Therefore:

- show UVR mechanics distinctly;
- show peso scenarios under explicit inflation assumptions;
- do not display one future peso “saving” as guaranteed;
- allow sensitivity assumptions.

A prepayment calculation can still be useful in UVR, but its output contract must be different from fixed pesos.

## Timing assumptions

Prepayment timing materially affects interest.

Every simulation must define one of:

- immediate/current-period assumption;
- next scheduled-payment date;
- user-selected date;
- document-derived operational date.

Do not hide timing inside implementation.

MVP default may use:

> “Suponemos que el abono se aplica al capital en tu próxima fecha de pago.”

if this matches validated product behavior; otherwise require explicit selection.

## Benefit decomposition — signature VIVIENDA contract

The product must not show only a single “you save” number.

### Component A — User additional principal

Total extra capital contributed by the user above scheduled principal.

This is not a saving.

### Component B — Avoided nominal future interest

`baseline_interest_total - scenario_interest_total`

Only calculate when baseline/scenario models are C2/C3 or clearly label approximation at C1.

### Component C — Avoided recurring non-interest costs

Possible examples:

- insurance premiums avoided because the loan ends earlier;
- account-linked costs where contractually relevant.

Do not assume these automatically stop or remain constant. Model only when verified.

### Component D — Negotiated/market improvement

Separate from prepayment.

Examples:

- lower rate after portfolio transfer;
- negotiated rate reduction.

This belongs to another scenario engine but can appear in combined comparison.

### Component E — Corrected/error recovery

Separate legal/operational benefit where a verified correction changes user economics.

### Component F — Service/transaction costs

Subtract where relevant:

- VIVIENDA fees;
- appraisal/title/transfer costs;
- taxes/charges;
- other execution costs.

### Net economic comparison

A final comparison may show:

- extra user cash contributed;
- nominal future interest avoided;
- other costs avoided;
- transaction/service costs;
- projected net effect.

Do not label the full net effect “money VIVIENDA saved you.”

## Nominal vs present-value view

### MVP primary

Use nominal COP because it is understandable and auditable.

Label explicitly:

> “Valores nominales proyectados.”

### Advanced view

Optionally provide present-value/economic comparison using an explicit user-selectable discount/opportunity-cost assumption.

Do not mix nominal and present-value numbers on the same headline without explanation.

## Result hierarchy

### Headline

Action consequence, e.g.:

> “Con este abono, el modelo estima que terminarías aproximadamente 28 meses antes.”

### Secondary

- extra principal contributed;
- projected payoff date;
- nominal interest difference;
- payment effect where applicable.

### Benefit breakdown

Show the components above.

### Why

Plain language:

> “El capital baja antes. Por eso, durante menos tiempo se calculan intereses sobre un saldo alto.”

### Confidence and assumptions

- model confidence C1/C2/C3;
- rate;
- balance date;
- amortization system;
- prepayment timing;
- exclusions.

### Action

Possible:

- “Ver cómo hacerlo directamente con mi banco”
- “Guardar escenario”
- “Comparar con compra de cartera”
- “Quiero un análisis preciso”

The DIY option must remain visually legitimate.

## Scenario comparison rules

### Always include baseline

Never present only the “optimized” result; user needs counterfactual.

### Compare one changed variable at a time by default

Example:

- baseline;
- +COP 200k/month;
- +COP 400k/month;
- one-time COP 10M.

Do not combine rate change + prepayment + insurance unless the user intentionally chooses a combined plan.

### No cherry-picking

If a lower installment produces higher total cost, surface that tradeoff.

If term reduction requires materially higher monthly cash outflow, surface it next to benefit.

## Bank execution boundary

The simulator does not itself instruct the lender.

After a scenario the product should explain:

- the user's desired application (term vs installment);
- bank's current verified channel/instructions when available;
- what evidence/confirmation to retain;
- that final lender recalculation can differ due to date, outstanding daily interest, insurance and operational rules.

Where a bank publicly provides free direct modification/prepayment channels, VIVIENDA should surface them.

## Error cases

### Prepayment >= balance

Convert to payoff scenario; warn that lender's final payoff amount may include accrued amounts/charges not represented in principal balance.

### Extra monthly amount <= 0

No scenario.

### Scheduled payment <= interest

Model mismatch / unsupported loan structure; stop precise simulation.

### Loan with arrears

Do not assume extra money applies directly to principal before arrears/charges. Route to payment-status review.

### Subsidized/special product

Flag that contract/program conditions may alter modification options; require relevant product review.

### Unknown rate/system

C1 only.

## Test vectors required before code release

At minimum:

1. fixed-peso constant payment baseline with no prepayment;
2. one-time prepayment that shortens term;
3. one-time prepayment reducing payment;
4. recurring extra principal;
5. final partial period;
6. zero-interest edge case if supported;
7. high-rate sanity case;
8. prepayment larger than balance;
9. insurance excluded/included check;
10. inconsistent user input confidence downgrade;
11. constant-principal case;
12. UVR case with explicit inflation scenarios.

Test results should compare against an independently calculated reference, not only the same implementation rewritten in tests.

## Product acceptance tests

A user seeing the result must correctly understand:

- that they are contributing extra money;
- that avoided interest comes from reducing principal earlier;
- whether payment or term changes;
- that lender implementation is the final operational source;
- whether the result is approximate or verified;
- what action they can take next.

If users conclude “the law/bank gives me the projected interest amount,” the UX has failed.