# SCENARIO-BASED ECONOMIC QUOTE COMPARISON CONTRACT v0.19

Date: 2026-08-27
Status: domain contract
Scope: Journey 2 — prospective buyer / financing quote economic comparison
Base: Quote Normalization v0.18

## 1. Objective

v0.19 converts two sufficiently normalized financing quotes into **explicit scenario-based cash-flow models**.

It answers:

1. What cash outflows would each quote imply under the scenario supplied?
2. Which parts are declared by the user and which are modeled assumptions?
3. What is the modeled nominal outflow of each quote?
4. If the user supplies a discount/opportunity-cost rate, what is the present value of those outflows?
5. Under which strict conditions may the product identify the quote with the lower modeled outflow on a defined metric?
6. When must the product refuse to rank even though it can still display modeled cash flows?

v0.19 does **not** answer:

- which bank is best;
- which lender will approve the user;
- probability of approval;
- which product is legally preferable;
- actual future UVR;
- actual future insurance cost when not explicitly modeled;
- actual market opportunity cost;
- guaranteed savings;
- final recommendation to contract.

The central wording rule is:

> **modeled difference under this scenario ≠ guaranteed savings ≠ best financing decision**

## 2. Precision and provenance

Inputs inherited from v0.18 remain:

- precision: **C1**;
- source: `user_declared`;
- verification: false.

A deterministic scenario model derived from those inputs is **C2**.

C2 means:

> a calculation produced from explicit inputs and assumptions.

It does not upgrade the underlying quote to C3.

The result must preserve both layers:

```ts
inputPrecision = "C1"
outputPrecision = "C2"
isVerified = false
```

## 3. Gate from v0.18

Economic modeling requires both quotes to pass v0.18 normalization.

The pair must be:

```text
ready_for_future_economic_model
```

If either quote is incomplete or only structurally ready, v0.19 returns a blocked result and does not invent missing economics.

v0.19 may impose additional scenario requirements beyond v0.18 readiness.

## 4. Cash-flow philosophy

v0.19 is a **quote cash-flow comparator**, not an amortization auditor.

For the recurring financing outflow, the canonical starting point is:

```text
initialMonthlyPaymentOrCanon declared in the quote
```

This choice prevents the platform from silently rebuilding a lender-specific payment from headline rate, principal and term when the quote may embed contractual mechanics not represented in the generic engine.

The rate remains material metadata and may be normalized for consistency or later analytics, but v0.19 does not overwrite the quoted payment/canon with a reconstructed payment.

## 5. Supported payment-path behaviors

### 5.1 Pesos + constant nominal payment

Supported.

The declared initial monthly payment/canon is modeled as constant for the contractual term.

```text
monthlyBaseOutflow[t] = declaredInitialMonthlyPaymentOrCanon
```

This is valid only when:

```text
amortizationBehavior = constant_nominal_payment
```

### 5.2 UVR + UVR-linked payment

Supported only under an explicit UVR scenario.

Required:

```ts
uvrScenario = {
  kind: "constant_annual_growth";
  annualGrowthRate: number;
}
```

The initial declared payment/canon is treated as the month-zero peso reference and grows with the modeled UVR index factor.

```text
monthlyUvrGrowth = (1 + annualGrowthRate)^(1/12) - 1
indexFactor[t] = (1 + monthlyUvrGrowth)^t
monthlyBaseOutflow[t] = initialPayment * indexFactor[t]
```

This is a scenario, not a forecast.

The UI must never label the annual growth input as an expected or official future UVR rate unless such a source is separately verified in a later version.

### 5.3 Constant principal

Not modeled from a single initial payment in v0.19.

Reason: a declining payment path cannot be reconstructed defensibly from only the first payment without choosing lender-specific mechanics.

Result: `unsupported_payment_path`.

A later version may support this behavior through:

- a verified schedule; or
- a separately governed amortization formula contract.

### 5.4 Other / unknown behavior

Blocked.

No interpolation, guessing or constant-payment fallback is allowed.

## 6. Insurance treatment

The recurring quote payment/canon is interpreted according to v0.18:

### included_in_initial_payment

No separate insurance outflow is added.

If a separate insurance amount was also supplied, the v0.18 warning remains visible; v0.19 must not double count it.

### excluded_from_initial_payment

The declared `monthlyInsuranceAmount` is added every month.

### partially_included

The declared `monthlyInsuranceAmount` is treated as the **additional recurring insurance amount outside the quoted payment/canon**.

### unknown

Blocked by v0.18 readiness.

v0.19 does not infer insurance growth.

A future explicit insurance trajectory may replace the flat assumption.

## 7. Initial cash and one-time costs

`totalCashRequiredAtClosing` is the canonical initial outflow.

It is assumed to already represent the quote's total cash requirement at closing.

Therefore:

> `oneTimeCostsTotal` must **not** be added a second time.

`oneTimeCostsTotal` remains useful for decomposition and consistency review but not as an additive cash flow when `totalCashRequiredAtClosing` is present.

Canonical month-zero flow:

```text
cashFlow[0] = totalCashRequiredAtClosing
```

## 8. Leasing purchase option

A housing-leasing quote cannot reach a full-acquisition economic model unless the scenario explicitly handles the purchase option.

Scenario choice:

```ts
leasingOptionScenario = {
  exercise: true;
  timing: "contract_end";
  percentageBase?: "property_value" | "financed_amount";
}
```

v0.19 supports only `contract_end`.

If an absolute `leasingPurchaseOptionValue` exists, use it.

If only a percentage exists, `percentageBase` is mandatory.

```text
optionValue = percentage * selectedBase
```

No base may be inferred from wording alone.

If the user does not assume the option is exercised, the quote may be modeled as a lease cash flow but **cannot** be ranked against a mortgage as an equivalent full-acquisition path.

## 9. Scenario input

Canonical scenario:

```ts
type EconomicComparisonScenario = {
  scenarioId: string;
  uvrScenario?: {
    kind: "constant_annual_growth";
    annualGrowthRate: number;
  };
  annualDiscountRate?: number;
  leasingOptions?: Record<string, {
    exercise: boolean;
    timing?: "contract_end";
    percentageBase?: "property_value" | "financed_amount";
  }>;
};
```

`annualDiscountRate` is optional.

It is the user's/modeler's explicit time-value assumption. It is not a market rate, lender rate or recommendation.

## 10. Validation

Reject scenario inputs when:

- `scenarioId` is empty;
- annual UVR growth is non-finite or `<= -1`;
- annual discount rate is non-finite or `<= -1`;
- a leasing percentage base is supplied outside the supported enum.

Negative but greater-than-`-1` UVR or discount scenarios are mathematically permitted for sensitivity analysis.

The UI may choose a narrower input range, but the pure domain contract remains explicit.

## 11. Quote model readiness

Each quote receives one of:

```ts
type EconomicQuoteModelStatus =
  | "blocked_by_quote_readiness"
  | "missing_scenario_assumption"
  | "unsupported_payment_path"
  | "modeled";
```

### blocked_by_quote_readiness

v0.18 quote is not `comparison_input_ready`.

### missing_scenario_assumption

Examples:

- UVR quote without `uvrScenario`;
- leasing percentage option without explicit percentage base;
- leasing full-acquisition comparison without an exercise decision.

### unsupported_payment_path

Examples:

- constant principal in v0.19;
- `other`;
- `unknown`;
- pesos paired with `uvr_linked_payment`;
- UVR paired with a payment behavior not explicitly supported.

### modeled

All cash flows for the governed model can be generated.

## 12. Per-quote modeled cash flow

A modeled quote returns:

```ts
type ModeledQuoteCashFlow = {
  quoteId: string;
  inputPrecision: "C1";
  outputPrecision: "C2";
  status: "modeled";
  initialCashOutflow: number;
  recurringBaseOutflow: number;
  recurringInsuranceOutflow: number;
  purchaseOptionOutflow: number;
  nominalTotalOutflow: number;
  presentValueOutflow: number | null;
  periods: Array<{
    month: number;
    baseOutflow: number;
    insuranceOutflow: number;
    purchaseOptionOutflow: number;
    totalOutflow: number;
    discountFactor: number | null;
    presentValueOutflow: number | null;
  }>;
};
```

Month zero is represented by `initialCashOutflow` and is included in totals.

## 13. Discounting

If `annualDiscountRate` is supplied:

```text
monthlyDiscountRate = (1 + annualDiscountRate)^(1/12) - 1
PV_t = cashFlow_t / (1 + monthlyDiscountRate)^t
```

Month-zero cash is not discounted.

Present value is a scenario metric, not a forecast.

## 14. Nominal metric

For every modeled quote:

```text
nominalTotalOutflow = initialCashOutflow
                        + sum(monthly total outflows)
```

This is a full-contract nominal cash-outflow total.

It is not automatically a comparable ranking metric when:

- property values differ;
- financed amounts differ;
- terms differ;
- one quote does not lead to full acquisition while the other does.

The totals may still be displayed with those caveats.

## 15. Present-value metric

When a discount rate is supplied, v0.19 may compute present-value outflows even when financing amounts or terms differ.

However pairwise ranking on present value requires:

1. same property value within tolerance;
2. both quotes fully modeled;
3. both paths modeled to completion;
4. if leasing is involved, the purchase option is assumed exercised and included;
5. both quotes use the same scenario and discount rate.

This makes the financed-amount/equity timing difference explicit through discounting rather than pretending cash today equals cash years later.

## 16. Property-value equivalence

Ranking metrics require the quotes to refer to the same acquisition basis.

Tolerance:

```text
abs(propertyValueA - propertyValueB) <= 1 COP
```

This is a computational identity tolerance, not a valuation tolerance.

If property values differ, v0.19 may model both quotes but must not identify a lower-cost quote.

A future normalized-property scenario may relax this rule.

## 17. Nominal comparability gate

A lower nominal modeled outflow may be identified only when all are true:

- both quotes are modeled;
- same property value;
- same financed amount within 1 COP;
- same term;
- both paths end in equivalent full acquisition;
- no unresolved scenario requirement affects cash-flow completeness.

Only then may the result expose:

```ts
lowerNominalOutflowQuoteId
nominalOutflowDifference
```

The label must be:

> **Menor desembolso nominal modelado bajo este escenario**

Never:

- ganador;
- mejor crédito;
- mejor banco;
- ahorro garantizado.

## 18. Present-value comparability gate

A lower present-value modeled outflow may be identified only when all are true:

- both quotes are modeled;
- same property value;
- annual discount rate supplied;
- both full-acquisition paths are complete;
- no unresolved scenario requirement affects cash-flow completeness.

Different financed amounts and terms are permitted because the time-value assumption is explicit.

Output:

```ts
lowerPresentValueOutflowQuoteId
presentValueOutflowDifference
```

Label:

> **Menor valor presente de desembolsos bajo tu tasa de comparación**

This is not a recommendation.

## 19. Pair status

```ts
type EconomicPairStatus =
  | "blocked"
  | "modeled_not_rankable"
  | "nominally_comparable"
  | "present_value_comparable";
```

Priority:

1. `blocked` if one or both quotes cannot be modeled;
2. `present_value_comparable` if PV gate passes;
3. `nominally_comparable` if nominal gate passes and no discount rate creates a PV metric;
4. otherwise `modeled_not_rankable`.

A pair can produce cash-flow totals without producing a lower-cost identifier.

## 20. Result boundaries

Canonical pair boundaries:

```ts
boundaries: {
  isVerified: false;
  isScenarioModel: true;
  isMarketForecast: false;
  isEligibility: false;
  isApproval: false;
  isBankMatch: false;
  isLegalRecommendation: false;
  isGuaranteedSavings: false;
  hasBestBank: false;
}
```

Do not add a generic `winner` field.

## 21. Difference language

Permitted:

- “Bajo este escenario, la cotización A modela COP X de desembolsos nominales.”
- “La diferencia modelada es COP Y.”
- “Con una tasa de comparación de Z%, el valor presente modelado es…”
- “No las rankeamos porque financian montos distintos y no definiste una tasa de comparación.”

Prohibited:

- “Ahorrarás COP Y.”
- “Esta es la mejor opción.”
- “Este banco te conviene más.”
- “Tienes X% de probabilidad de aprobación.”
- “La UVR crecerá Z%.”

## 22. UVR language

Every UVR result must expose:

- scenario growth rate;
- explicit statement that it is an assumption;
- sensitivity warning;
- no forecast claim.

Required concept:

> **Si la UVR cambia, este resultado cambia.**

## 23. Different financed amounts

If financed amounts differ:

- nominal totals may be shown;
- nominal lower-cost ranking is blocked;
- present-value ranking requires an explicit discount rate and same property value.

Reason:

A higher down payment shifts cash toward month zero. Comparing only nominal totals without valuing timing can falsely present higher upfront capital as economically free.

## 24. Different terms

If terms differ:

- nominal totals may be shown;
- nominal ranking is blocked;
- present-value ranking may proceed with explicit discount rate if all full-acquisition obligations are modeled.

## 25. Mortgage vs leasing

Cross-structure cash-flow modeling is permitted.

Cross-structure ranking requires:

- same property value;
- leasing purchase option explicitly exercised and included;
- all modeled outflows captured;
- applicable nominal/PV gate.

Even when a metric is comparable, the UI must retain a structural caveat:

> ownership timing and contractual/legal characteristics differ and are not reduced to this cash-flow metric.

## 26. One-time cost decomposition

Because `totalCashRequiredAtClosing` is canonical month-zero cash, v0.19 never adds `oneTimeCostsTotal` again.

A test must prove no double counting.

## 27. Quote validity

Expired or differently dated quotes may still be modeled for analysis.

Validity warnings from v0.18 propagate.

The pair must not claim that a historical/expired quote remains available.

## 28. Tie handling

If modeled differences are within COP 1:

```text
metricTie = true
lower...QuoteId = null
```

Do not fabricate a lower-cost quote from floating-point noise.

## 29. Acceptance invariants

At minimum tests must prove:

1. a v0.18-unready quote blocks economic modeling;
2. C1 quote input produces C2 modeled output without becoming verified;
3. pesos + constant nominal payment generates a flat base path;
4. UVR quote without UVR scenario blocks;
5. UVR constant-growth scenario compounds monthly from an explicit annual assumption;
6. UVR result never marks the scenario as forecast;
7. excluded insurance is added exactly once;
8. included insurance is not double counted;
9. partially included insurance adds only the declared external amount;
10. total cash at closing is included at month zero;
11. one-time costs are not added again on top of total cash at closing;
12. mortgage has no purchase-option cash flow;
13. leasing absolute purchase option is added at contract end when exercise=true;
14. leasing percentage option requires an explicit percentage base;
15. leasing percentage option uses exactly the selected base;
16. constant-principal path is unsupported in v0.19 rather than silently flattened;
17. `other` / `unknown` path is blocked;
18. nominal total equals month-zero plus all modeled monthly flows;
19. discount rate produces deterministic monthly discounting;
20. without discount rate, PV output is null;
21. different property values block both ranking metrics;
22. different financed amounts block nominal ranking;
23. different financed amounts may be PV-comparable with explicit discount rate and same property value;
24. different terms block nominal ranking;
25. different terms may be PV-comparable under an explicit discount rate;
26. mortgage vs leasing cannot be full-acquisition ranked if leasing option is not exercised;
27. mortgage vs leasing may be economically comparable when the option is explicitly exercised and all other gates pass;
28. a pair may be modeled but not rankable;
29. rankable nominal output uses `lowerNominalOutflowQuoteId`, never `winner`;
30. rankable PV output uses `lowerPresentValueOutflowQuoteId`, never `bestBank`;
31. ties within COP 1 produce no lower-cost identifier;
32. no approval, eligibility or bank-match output exists;
33. no guaranteed-savings boundary is introduced;
34. quote validity warnings propagate without asserting offer availability;
35. no system clock or automatic market rate enters the pure model.

## 30. Out of scope

- C3 document ingestion or OCR;
- actual lender amortization verification;
- variable insurance trajectories unless explicitly supplied in a future contract;
- future property appreciation;
- taxes or legal costs not represented in the quote input;
- prepayment optimization;
- refinancing application;
- Open Finance;
- bureau integration;
- lender eligibility;
- bank marketplace ranking;
- live lender offers;
- official UVR forecasting;
- market-rate auto-fill;
- product recommendation;
- application submission;
- payment or contracting;
- production persistence.

## 31. Next layer after v0.19

After this model is proven, the product may add a UX that lets the user:

1. choose/confirm UVR scenario assumptions;
2. optionally define a time-value/discount rate;
3. confirm leasing purchase-option treatment;
4. see modeled nominal flows before any ranking;
5. understand exactly why a pair is or is not comparable;
6. run sensitivity scenarios instead of receiving one opaque answer.

The next layer must preserve the same hierarchy:

**declared quote → explicit assumptions → modeled cash flows → comparability gate → metric difference → decision support**.
