# FINANCING QUOTE NORMALIZATION CONTRACT v0.18

Date: 2026-08-27
Status: domain contract
Scope: Journey 2 — prospective buyer / financing quote intake
Base: Financing Structures Explorer v0.17

## 1. Objective

Build the canonical boundary between **a quote the user has** and **a future economic comparison of quotes**.

v0.18 answers:

1. What exactly did the user enter from this quote?
2. Which material fields are present, missing or not applicable?
3. Is the quote sufficiently described for structural review?
4. Is it sufficiently complete to become an input to a later economic-comparison engine?
5. When two quotes are supplied, which material bases differ and which additional assumptions would be required before a defensible comparison?

v0.18 does **not** answer:

- which quote is cheaper;
- which bank is best;
- which quote the user should choose;
- total future cost of UVR;
- final savings versus another quote;
- lender eligibility or approval probability.

## 2. Why normalization precedes comparison

A mortgage quote cannot be ranked responsibly from one headline number.

Two quotes may differ in:

- contractual structure;
- denomination;
- financed amount;
- property value used as basis;
- financing percentage;
- term;
- rate convention;
- amortization/canon behavior;
- insurance treatment;
- one-time costs;
- required cash at closing;
- purchase option in leasing;
- validity date.

A smaller first payment is not evidence of lower total cost.

A smaller headline rate is not necessarily comparable when rate conventions, denomination or fee/insurance treatment differ.

The domain must therefore **normalize first and rank later**.

## 3. Precision and provenance

v0.18 supports only manually entered quote data.

```ts
type QuoteEvidenceSource = "user_declared";
```

A manually transcribed quote is treated as **C1 declared information**, even if the user is reading it from a real PDF.

Manual entry does not become C3 merely because the source document exists outside the system.

Future stages may support:

- document extraction with field-level provenance;
- document reconciliation;
- partner/lender feed;
- verified C3 evidence.

Those stages are outside v0.18.

## 4. Canonical quote input

```ts
type QuoteContractStructure = "mortgage_credit" | "housing_leasing";
type QuoteDenomination = "pesos" | "uvr";

type QuoteRateConvention =
  | "effective_annual"
  | "nominal_annual_monthly"
  | "monthly_effective"
  | "other"
  | "unknown";

type QuoteAmortizationBehavior =
  | "constant_nominal_payment"
  | "constant_principal"
  | "uvr_linked_payment"
  | "other"
  | "unknown";

type InsuranceTreatment =
  | "included_in_initial_payment"
  | "excluded_from_initial_payment"
  | "partially_included"
  | "unknown";

type OneTimeCostsTreatment =
  | "itemized"
  | "total_only"
  | "stated_none"
  | "unknown";

type PrepaymentInformation =
  | "rules_supplied"
  | "stated_unrestricted"
  | "unknown";

type FinancingQuoteInput = {
  quoteId: string;
  source: "user_declared";

  providerName?: string;
  quoteDate?: string;          // YYYY-MM-DD when known
  validUntil?: string;         // YYYY-MM-DD when known

  contractStructure?: QuoteContractStructure;
  denomination?: QuoteDenomination;
  amortizationBehavior?: QuoteAmortizationBehavior;
  amortizationLabel?: string;

  propertyValue?: number;
  financedAmount?: number;
  quotedFinancingPercentage?: number; // decimal, e.g. 0.70

  termMonths?: number;

  quotedRateValue?: number;            // decimal, e.g. 0.115
  rateConvention?: QuoteRateConvention;
  rateIndexOrReference?: string;       // e.g. text supplied in quote; no interpretation in v0.18

  initialMonthlyPaymentOrCanon?: number;
  insuranceTreatment?: InsuranceTreatment;
  monthlyInsuranceAmount?: number;

  oneTimeCostsTreatment?: OneTimeCostsTreatment;
  oneTimeCostsTotal?: number;

  totalCashRequiredAtClosing?: number;
  prepaymentInformation?: PrepaymentInformation;
  prepaymentRulesText?: string;

  leasingPurchaseOptionValue?: number;
  leasingPurchaseOptionPercentage?: number; // decimal
  leasingPurchaseOptionTiming?: string;

  notes?: string;
};
```

## 5. Validation

Reject a quote when:

- `quoteId` is empty;
- `source !== user_declared` in v0.18;
- any supplied monetary value is negative;
- `termMonths <= 0`;
- a supplied percentage is outside `[0, 1]`;
- a supplied quoted rate is negative;
- supplied dates are not valid `YYYY-MM-DD` strings;
- `validUntil < quoteDate` when both dates are present.

Do not reject a quote merely because a material field is missing. Missing data is a **readiness state**, not an exception.

## 6. Derived financing percentage

If both `propertyValue > 0` and `financedAmount >= 0` are supplied:

```text
derivedFinancingPercentage = financedAmount / propertyValue
```

If `quotedFinancingPercentage` is also supplied, compare it with the derived value.

v0.18 uses a tolerance of **0.5 percentage points** only as a data-consistency tolerance:

```text
abs(quotedFinancingPercentage - derivedFinancingPercentage) <= 0.005
```

This tolerance is not a legal or lender rule.

If the difference exceeds tolerance, emit a consistency flag:

`financing_percentage_mismatch`

Do not silently overwrite the quoted percentage with the derived one.

## 7. Material fields

### 7.1 Common identity fields

Required to understand quote provenance:

- provider name;
- quote date.

`validUntil` is important but not required for structural readiness because some quotes may not state it clearly. If absent, emit a warning rather than a blocker.

### 7.2 Common structural fields

Required for **structural readiness**:

- contract structure;
- denomination;
- financed amount;
- term;
- initial monthly payment/canon.

### 7.3 Common future-comparison fields

Required before a quote can be marked **comparison-input ready**:

- all common identity fields;
- all common structural fields;
- property value;
- amortization behavior;
- quoted rate value;
- rate convention other than `unknown`;
- insurance treatment other than `unknown`;
- one-time-cost treatment other than `unknown`;
- total cash required at closing;
- prepayment information other than `unknown`.

Additional rules:

- if insurance is excluded or partially included, `monthlyInsuranceAmount` is material;
- if one-time costs are itemized or total-only, `oneTimeCostsTotal` is material;
- if prepayment rules are supplied, the rule text is material;
- if denomination is UVR, `rateIndexOrReference` is material so the quoted basis is not silently treated as a peso EA rate.

### 7.4 Leasing-specific fields

For `housing_leasing`, future-comparison readiness additionally requires:

- purchase-option value **or** purchase-option percentage;
- purchase-option timing.

A leasing quote without purchase-option economics is not ready for future total-cost comparison.

### 7.5 Mortgage-specific fields

Leasing purchase-option fields are not applicable to mortgage credit and must not be counted as missing.

## 8. Readiness states

```ts
type QuoteReadiness =
  | "incomplete"
  | "structurally_ready"
  | "comparison_input_ready";
```

### incomplete

One or more common structural fields are missing.

The UI may still show entered information and missing fields.

### structurally_ready

All common structural fields are present, but one or more material future-comparison fields are missing.

This means the quote can be understood but should not be fed into a cost-ranking engine yet.

### comparison_input_ready

All material fields required by the quote's structure and denomination are present.

This means only:

> the quote contains enough declared information to become an input to a future comparison model.

It does **not** mean:

- that the data is verified;
- that the quote is still valid;
- that the user qualifies;
- that v0.18 has calculated total cost;
- that a winner can be selected.

## 9. Missing-field output

The evaluator returns explicit field codes rather than one generic completeness score.

Examples:

```text
provider_name
quote_date
contract_structure
denomination
property_value
financed_amount
term_months
amortization_behavior
quoted_rate_value
rate_convention
initial_monthly_payment_or_canon
insurance_treatment
monthly_insurance_amount
one_time_costs_treatment
one_time_costs_total
total_cash_required_at_closing
prepayment_information
prepayment_rules_text
rate_index_or_reference
leasing_purchase_option
leasing_purchase_option_timing
```

Do not produce a misleading percentage such as “82% complete” in v0.18. Materiality is not uniform across fields.

## 10. Warning flags

Warnings do not necessarily block structural readiness.

Possible warnings:

```text
validity_date_missing
quote_may_be_expired
financing_percentage_mismatch
financing_percentage_not_derivable
rate_convention_other
amortization_behavior_other
insurance_amount_without_exclusion
leasing_option_fields_on_mortgage
uvr_reference_missing
```

`quote_may_be_expired` may only be emitted when a supplied `validUntil` is before an explicitly supplied evaluation date.

Do not use the device/server current date implicitly inside the pure evaluator.

## 11. Pairwise normalization

v0.18 may inspect two normalized quotes but does **not** calculate a winner.

```ts
type QuotePairReadiness =
  | "blocked_by_missing_data"
  | "ready_for_structural_comparison"
  | "ready_for_future_economic_model";
```

### blocked_by_missing_data

At least one quote is `incomplete`.

### ready_for_structural_comparison

Both quotes are at least `structurally_ready`.

The product may compare facts such as:

- contractual structure;
- denomination;
- financed amount;
- term;
- initial payment/canon;
- declared cash requirement when supplied.

It must not select the cheaper/better quote.

### ready_for_future_economic_model

Both quotes are `comparison_input_ready` **and** the pair exposes all additional modeling requirements explicitly.

This state means an economic model may now be constructed. It does not mean v0.18 has done so.

## 12. Pairwise basis differences

The pair evaluator returns explicit differences:

```text
provider
quote_date
validity
contract_structure
denomination
property_value
financed_amount
financing_percentage
term
rate_convention
amortization_behavior
insurance_treatment
cash_required
leasing_purchase_option
```

A difference is information, not an error.

Examples:

- different terms do not invalidate the quotes; they make monthly-payment comparison incomplete;
- different financed amounts make headline-payment ranking misleading;
- mortgage vs leasing requires purchase-option economics and ownership-timing interpretation;
- pesos vs UVR requires a future scenario/schedule method before projecting total peso cost.

## 13. Future modeling requirements

Pairwise normalization returns modeling requirements, potentially including:

```text
uvr_path_or_verified_schedule
leasing_purchase_option_economics
normalize_rate_conventions
normalize_insurance_treatment
normalize_one_time_costs
normalize_financed_amount_or_equity
normalize_term_or_compare_multiple_horizons
quote_validity_alignment
```

These requirements are instructions to a future model, not calculations in v0.18.

## 14. Prohibited rankings in v0.18

The evaluator must never output:

- `winner`;
- `bestQuote`;
- `cheapestQuote`;
- `savings`;
- `totalProjectedCost`;
- `approvalProbability`;
- `bankMatch`;
- `recommendedLender`.

## 15. Result contract

```ts
type NormalizedQuote = {
  quoteId: string;
  precision: "C1";
  source: "user_declared";
  readiness: QuoteReadiness;
  missingStructuralFields: QuoteFieldCode[];
  missingComparisonFields: QuoteFieldCode[];
  warnings: QuoteWarning[];
  derived: {
    financingPercentage: number | null;
  };
  boundaries: {
    isVerified: false;
    isEconomicComparison: false;
    isCostRanking: false;
    isEligibility: false;
    isApproval: false;
    isBankMatch: false;
  };
};
```

Pair result:

```ts
type NormalizedQuotePair = {
  readiness: QuotePairReadiness;
  quoteA: NormalizedQuote;
  quoteB: NormalizedQuote;
  basisDifferences: QuoteBasisDifference[];
  modelingRequirements: ModelingRequirement[];
  boundaries: {
    hasWinner: false;
    hasSavingsCalculation: false;
    hasTotalCostProjection: false;
  };
};
```

## 16. Anonymous-first boundary

Manual normalization must not require:

- name;
- email;
- phone;
- ID number;
- employer;
- bureau authorization;
- bank login;
- Open Finance permission;
- account creation.

Provider name is quote metadata, not user identity.

## 17. Security / privacy boundary

v0.18 manual entry does not accept document uploads.

No quote data is persisted merely because the user enters it into a public client-side flow.

Future persistence must define:

- purpose;
- retention;
- deletion;
- access control;
- tenant/user ownership;
- document provenance;
- consent where applicable.

## 18. Acceptance invariants

At minimum tests must prove:

1. missing material fields produce readiness states, not exceptions;
2. no completeness percentage exists;
3. a quote cannot become `comparison_input_ready` without structural fields;
4. leasing requires purchase-option economics for future-comparison readiness;
5. mortgage does not require leasing purchase-option fields;
6. UVR requires its quoted reference/basis for future-comparison readiness;
7. user-declared data remains C1;
8. quoted and derived financing percentages are not silently reconciled when inconsistent;
9. missing validity date is warning, not structural blocker;
10. quote expiry depends on explicit evaluation date, not system clock;
11. pairwise evaluator never emits a winner;
12. different financed amounts are surfaced as a basis difference;
13. pesos vs UVR emits a future UVR modeling requirement;
14. mortgage vs leasing emits purchase-option/structure requirements when relevant;
15. different rate conventions require normalization before future economic modeling;
16. no bank-match/approval boundary is introduced;
17. negative monetary/rate/term inputs are rejected;
18. no identity data is part of the quote schema.

## 19. Out of scope

- OCR/document ingestion;
- bank API ingestion;
- automated quote scraping;
- market-rate discovery;
- rate conversion beyond explicit future contracts;
- UVR forecasting;
- projected total cost;
- NPV/IRR;
- break-even analysis;
- winner selection;
- lender application;
- approval/preapproval;
- payment/contracting.

## 20. Next layer after v0.18

Only after quote normalization is proven should VIVIENDA build an economic comparator.

That comparator should explicitly decide:

- common comparison horizon;
- cash-flow treatment;
- rate-convention normalization;
- insurance/cost inclusion;
- UVR scenario methodology;
- leasing purchase-option treatment;
- different financed amounts/equity;
- early-prepayment scenarios;
- uncertainty/provenance presentation.

No future economic engine should infer these choices silently.
