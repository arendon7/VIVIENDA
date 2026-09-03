# VIVIENDA — Borrower Snapshot Calculation Contract V0.1

Date: 2026-08-25
Status: Domain contract for product/UX design. Not production code yet.

## Objective

Define what VIVIENDA may calculate from a small set of borrower inputs, what level of precision can be claimed, and when the product must stop and request more information.

This contract protects UX from implying precision that the underlying loan data does not support.

## Source principles

The Superintendencia Financiera describes multiple authorized housing-loan amortization systems in Colombia, including:

### Pesos

- constant installment / gradual amortization;
- constant principal amortization.

### UVR

- constant installment in UVR;
- constant principal amortization in UVR;
- decreasing/cyclical UVR structures recognized in the historical regulatory framework.

The UVR is a daily unit of account tied exclusively to IPC methodology certified/calculated by Banco de la República.

Therefore, a monthly payment + balance + term is not always enough to reconstruct a loan exactly.

## Output confidence levels

Every borrower snapshot must carry one of four calculation-confidence classes.

### C0 — Orientation only

Inputs are incomplete or inconsistent.

Allowed outputs:

- descriptive ratios;
- rough remaining-payment amount;
- questions needed for a better analysis;
- educational scenarios clearly labelled illustrative.

Not allowed:

- “total remaining interest” stated as precise;
- precise term reduction;
- precise savings amount;
- precise market comparison.

### C1 — Approximate simulation

We know:

- current balance;
- current payment attributable to debt service or a reasonable approximation;
- approximate remaining term;
- currency/modalidad.

But we lack enough data to identify the exact amortization contract.

Allowed:

- approximate baseline;
- rough scenario range;
- a strong CTA to confirm statement/contract data.

Language:

> “Estimación con los datos que ingresaste.”

### C2 — Modelled calculation

We know enough to identify the mathematical loan structure with reasonable confidence.

For a peso fixed-rate constant-payment loan, for example:

- current principal balance;
- effective annual rate or equivalent contractual rate;
- remaining periods;
- payment periodicity;
- amortization type;
- whether reported payment includes insurance/fees.

Allowed:

- amortization schedule generated from current state;
- interest/principal projections under stated assumptions;
- prepayment scenarios;
- break-even comparisons.

Language:

> “Simulación basada en las condiciones confirmadas de tu crédito.”

### C3 — Document-verified / externally reconciled

C2 inputs plus source documents have been extracted and user/operational review reconciles key fields.

Where possible, generated schedule is checked against known next installment/payment composition or lender schedule.

Allowed:

- strongest product confidence short of actual lender quote/decision;
- precise-looking outputs with explicit assumptions/version/provenance.

Language:

> “Simulación verificada con la información de tu extracto/documentos.”

Still not equivalent to a future bank statement or official lender calculation.

## Minimal quick-input borrower snapshot

### Required for first anonymous result

1. Current outstanding balance
2. Current total monthly payment
3. Approximate months/years remaining
4. Currency/modalidad: pesos / UVR / no sé

### Optional but valuable

5. Interest rate
6. Whether payment includes insurance
7. Bank/entity
8. Original loan date

Do not require phone, ID or statement for C0/C1.

## Derived values allowed at quick stage

### Payment-to-balance indicator

Useful as descriptive context only.

Do not interpret it as affordability or loan quality by itself.

### Nominal remaining cash outflow if payment stayed constant

For peso scenarios where user enters a constant monthly payment assumption:

`nominal_remaining_outflow = current_payment × remaining_periods`

This is not “interest remaining” because payment can include principal, insurance, fees and may change.

UI wording:

> “Si tu pago total se mantuviera igual, desembolsarías aproximadamente…”

The product must not show this for UVR as though the peso payment were fixed unless explicitly modelling a scenario.

### Current payment burden

Only when household income is voluntarily provided:

`payment_burden = housing_payment / household_income`

This is descriptive. Do not convert it automatically into a legal conclusion or bank-approval rule.

## Rate conversion

If `EA` effective annual rate is supplied and monthly equivalent is required:

`i_m = (1 + i_EA)^(1/12) - 1`

Store both the source rate and derived rate.

Never silently treat nominal annual rate, EA rate, UVR spread or monthly rate as interchangeable.

Rate metadata:

- value;
- rate type;
- currency/base;
- source;
- date;
- user confirmed yes/no.

## Peso constant-payment model

When the loan is identified as fixed-rate constant installment in pesos and the service-of-debt payment excludes insurance/fees:

`P = B × i / (1 - (1+i)^(-n))`

Where:

- `P` = monthly debt-service payment;
- `B` = current principal balance;
- `i` = effective monthly rate;
- `n` = remaining periods.

Use this relationship for reconciliation, not to overwrite lender data.

### Reconciliation checks

If the modelled payment differs materially from lender-reported debt-service payment:

Possible causes:

- insurance included/excluded incorrectly;
- rate type misread;
- term wrong;
- amortization system different;
- payment timing/date effect;
- additional charges/subsidies;
- data extraction error.

Result should downgrade confidence rather than force a fit.

## Constant-principal peso model

If verified as constant principal:

`principal_amortization = B_initial_remaining / n`

For each period:

`interest_t = balance_(t-1) × i`

`payment_t = principal_amortization + interest_t`

The monthly installment declines over time in normal conditions.

Current-balance reconstruction must respect the current point in the schedule rather than assume original balance equals current balance unless generating forward-only schedule.

For forward-only modelling from current state, remaining principal can be divided across remaining periods if contractual structure supports that interpretation.

## Insurance and ancillary amounts

Housing statement payments may include insurance and other items that are not debt service.

Store separately when possible:

- principal;
- remuneratory interest;
- life insurance;
- property insurance;
- other insurance;
- fees/other charges;
- arrears/default charges where present.

### UI requirement

Never call the entire monthly debit “cuota de capital e intereses” unless verified.

Loan snapshot should ideally show:

**Pago total**

then breakdown where known.

## UVR model policy

### Important limitation

UVR is tied to IPC and its peso value changes over time. A future peso schedule therefore requires assumptions about future UVR/inflation or an externally supplied projection.

### Quick-input UVR result

C0/C1 only unless enough UVR-specific inputs are available.

Default UI should explain:

> “En UVR, el valor en pesos puede cambiar con la inflación. Para proyectar el crédito necesitamos separar la tasa sobre UVR y definir un supuesto de inflación.”

### Inputs needed for a modelled UVR scenario

Depending on amortization system:

- current principal expressed in UVR or current peso balance + current UVR value/date;
- spread/effective rate over UVR;
- remaining periods;
- identified UVR amortization system;
- current UVR value/date;
- inflation/UVR projection assumption for peso display.

### Simulation output

Show two conceptual layers where useful:

1. balance/payment in UVR;
2. projected peso equivalents under an explicit inflation assumption.

### Inflation scenarios

Do not silently use a single future inflation assumption as truth.

Prefer:

- user-editable assumption;
- base scenario;
- optionally lower/higher sensitivity.

Source/date for any macro assumption must be visible.

## Unknown amortization system

Do not guess from bank name alone.

Attempt identification from:

- statement labels;
- contract/amortization table;
- lender documentation;
- payment behavior;
- user confirmation.

If not known:

- remain C1;
- offer statement upload or manual field confirmation;
- avoid “exact savings.”

## Loan snapshot UI data model

Suggested canonical fields:

```text
loan_id
lender
product_type
currency_mode
amortization_type
balance_value
balance_unit
balance_as_of
monthly_total_payment
monthly_debt_service_payment
monthly_insurance
rate_value
rate_type
rate_basis
remaining_periods
payment_frequency
source_confidence
last_verified_at
```

Each material field should also have provenance metadata.

## Data provenance model

For each field:

```text
source_type = user | document | lender_public | partner | calculation | reviewer
source_reference
source_date
extraction_confidence
user_confirmed
reviewer_verified
method_version
```

## Sanity checks

### Negative/zero values

Reject impossible values with specific explanations.

### Payment lower than accrued interest

If model suggests debt-service payment does not cover current interest in a structure where that should not occur, flag data mismatch rather than produce schedule.

### Remaining term mismatch

If payment/rate/balance imply a materially different term than the reported term, show “datos no concilian” and request verification.

### Rate reasonableness

Do not auto-correct unusual rates. Flag and ask whether rate format/type was entered correctly.

### Currency ambiguity

If user says UVR but enters a rate that appears like a peso EA rate, ask for clarification; do not infer silently.

## Result anatomy

### Level 1 — headline

Current state in plain language.

### Level 2 — key numbers

- balance;
- total payment;
- remaining term;
- modality;
- verified rate when known.

### Level 3 — confidence

Example:

> “Resultado aproximado — falta confirmar tasa y tipo de amortización.”

### Level 4 — opportunity

Only actions supported by available data.

### Level 5 — methodology

Expandable:

- inputs;
- formula/model;
- assumptions;
- exclusions;
- source freshness.

## UX acceptance criteria

A test user must be able to answer:

1. Which numbers came from me?
2. Which are calculated?
3. Is this exact or approximate?
4. What information would make it more precise?
5. Is this a bank offer/decision? (Correct answer: no, unless explicitly labelled otherwise.)

## Production gate

Before implementation of a calculation model:

- financial/domain review;
- test vectors;
- rounding policy;
- source references;
- edge-case tests;
- copy/disclosure review;
- versioned method identifier.

A UI mockup must not become the calculation specification.