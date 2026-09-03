# BUYER AFFORDABILITY CONTRACT v0.13

Date: 2026-08-26
Status: domain contract
Scope: Journey 2 — prospective buyer

## 1. Objective

Build the first trustworthy buyer-affordability engine for VIVIENDA.

The engine must answer progressively:

1. How much monthly housing payment can this household reasonably plan for with the data declared?
2. What regulatory references constrain a housing-credit scenario?
3. If rate and term are explicitly supplied, what principal/property range can be modeled under the supported financing case?
4. Which constraint is binding: monthly capacity or available down payment?

It must **not** answer “how much a bank will approve”.

## 2. Output classification

### C1 — planning estimate

Available from minimal inputs:

- net household monthly income;
- current recurring monthly debt payments;
- available down payment;
- housing category when known.

C1 may show:

- current debt-service ratio;
- planning total-debt benchmark;
- remaining planning room for a housing payment;
- structural property ceiling implied only by available down payment and maximum regulatory LTV.

C1 may not show a payment-derived mortgage principal without rate/term.

### C2 — modeled financing scenario

Requires additionally:

- financing mode `pesos_fixed_constant`;
- EA rate explicitly supplied/confirmed;
- term explicitly supplied/confirmed;
- optional estimated monthly non-credit housing costs.

C2 may show:

- modeled monthly credit-payment budget;
- modeled maximum principal under the supported annuity formula;
- credit-and-cash property ceiling;
- down-payment/LTV structural property ceiling;
- modeled target ceiling = minimum of applicable constraints.

C2 remains a simulation, not an offer or approval.

### C3

Out of scope for v0.13. A future buyer C3 would require verified income/obligations/property/product evidence and a separate reconciliation contract.

## 3. Input contract

```ts
type HousingCategory = "vis" | "non_vis" | "unknown";
type BuyerFinancingMode = "pesos_fixed_constant";

type BuyerAffordabilityInput = {
  netHouseholdIncomeMonthly: number;
  currentMonthlyDebtPayments: number;
  availableDownPayment: number;
  housingCategory: HousingCategory;
  accreditableFamilyIncomeMonthly?: number;
  financing?: {
    mode: BuyerFinancingMode;
    annualEffectiveRate: number;
    termMonths: number;
    monthlyNonCreditHousingCosts?: number;
  };
};
```

## 4. Planning benchmark — not law

For v0.13, VIVIENDA uses a **30% total recurring debt-service planning benchmark over declared net monthly household income**.

Source rationale:

- Banca de las Oportunidades, 2025 financial-education facilitator manual, describes debt-service ratio as monthly debt payments / net monthly income and classifies 0–30% as the preferred/ideal band, 31–40% as caution.

This is an educational planning benchmark, **not**:

- a bank underwriting rule;
- a legal ceiling for total indebtedness;
- a promise that a 30% ratio is affordable for every household.

Constants:

```text
PLANNING_TOTAL_DEBT_RATIO = 0.30
```

Formulas:

```text
currentDebtRatio = currentMonthlyDebtPayments / netHouseholdIncomeMonthly
planningTotalDebtPaymentCap = netHouseholdIncomeMonthly * 0.30
planningHousingPaymentRoom = max(
  0,
  planningTotalDebtPaymentCap - currentMonthlyDebtPayments
)
```

If current monthly debt payments already consume the benchmark, planning housing-payment room is zero. The engine must not produce a negative payment or manufacture borrowing capacity.

## 5. Current regulatory first-installment reference

As of 2026-08-26, Decreto 583 de 2025 modified article 2.1.11.1 of Decreto 1077 de 2015 so the first installment of an individual long-term housing credit may not represent more than **40% of family income**.

The same provision retains:

- maximum financing up to 70% of property value for non-VIS;
- maximum financing up to 80% for VIS.

Regulatory constants:

```text
REGULATORY_FIRST_INSTALLMENT_RATIO = 0.40
MAX_LTV_NON_VIS = 0.70
MAX_LTV_VIS = 0.80
```

The 40% value is a **regulatory ceiling for the first installment**, not VIVIENDA's sustainable-payment recommendation.

VIVIENDA computes this reference only when `accreditableFamilyIncomeMonthly` is supplied:

```text
regulatoryFirstInstallmentCeiling = accreditableFamilyIncomeMonthly * 0.40
```

Do not silently substitute declared net income and label the result as a verified regulatory ceiling.

## 6. Down-payment structural ceiling

The LTV rule gives a structural upper bound only if a lender actually finances at the regulatory maximum.

For a known housing category:

```text
minimumEquityRatio = 1 - maxLtv
propertyCeilingFromDownPayment = availableDownPayment / minimumEquityRatio
```

Thus:

- non-VIS maximum regulatory LTV 70% → minimum equity component 30%;
- VIS maximum regulatory LTV 80% → minimum equity component 20%.

This calculation does **not** mean:

- the bank will finance at maximum LTV;
- closing costs are covered;
- the user has enough cash for taxes/notary/registration/other costs;
- the property will appraise at purchase price.

For `housingCategory = unknown`, output both VIS and non-VIS structural references rather than guessing classification.

## 7. C2 supported financing model

v0.13 supports only:

```text
pesos + fixed EA rate + constant monthly payment
```

It does not model:

- UVR;
- leasing;
- variable-rate structures;
- subsidies;
- insurance-premium schedules;
- bank-specific underwriting;
- financed closing costs.

### 7.1 Rate conversion

For EA rate `iEA` expressed as decimal:

```text
monthlyRate = (1 + iEA)^(1/12) - 1
```

### 7.2 Term

The current consolidated Ley 546 article 17 requires a minimum amortization term of five years. v0.13's tested product model accepts:

```text
60 <= termMonths <= 360
```

The upper bound of 360 months is a **v0.13 modeling/support limit**, not a claim that every current legal or commercial product has that exact maximum.

### 7.3 Credit-payment budget

Optional `monthlyNonCreditHousingCosts` represents declared planning costs outside principal/interest, such as administration/other recurring ownership costs. v0.13 does not claim completeness.

```text
nonCreditCosts = monthlyNonCreditHousingCosts ?? 0
planningCreditPaymentBudget = max(
  0,
  planningHousingPaymentRoom - nonCreditCosts
)
```

If an accreditable-income regulatory ceiling is available:

```text
modeledCreditPaymentBudget = min(
  planningCreditPaymentBudget,
  regulatoryFirstInstallmentCeiling
)
```

Otherwise:

```text
modeledCreditPaymentBudget = planningCreditPaymentBudget
```

Because the 30% planning benchmark and 40% legal ceiling use different income concepts, neither may be silently substituted for the other.

### 7.4 Principal formula

For monthly rate `r`, term `n`, payment `PMT`:

```text
principal = PMT * (1 - (1 + r)^(-n)) / r
```

For a zero EA rate test case only:

```text
principal = PMT * n
```

Public product UI should not use a 0% default scenario.

## 8. Modeled property ceiling

The modeled principal is a ceiling on the credit amount created by the payment budget. It **must not** be divided by maximum LTV as if every purchase necessarily used exactly that financing percentage.

A buyer may use more equity than the regulatory minimum. Therefore, with available down payment `D`:

```text
propertyCeilingFromCreditAndCash = modeledPrincipal + D
propertyCeilingFromDownPayment = D / (1 - maxLtv)
modeledPropertyCeiling = min(
  propertyCeilingFromCreditAndCash,
  propertyCeilingFromDownPayment
)
```

Interpretation:

- `propertyCeilingFromCreditAndCash` asks how much property value can be assembled from the modeled credit principal plus the declared cash available;
- `propertyCeilingFromDownPayment` independently enforces the minimum equity implied by the maximum regulatory LTV;
- the tighter value is the modeled ceiling.

This corrects a rejected formula:

```text
modeledPrincipal / maxLtv
```

That rejected expression assumes financing exactly at maximum LTV and can understate the property value reachable when the user contributes more equity.

Also return:

```text
bindingConstraint = "payment" | "down_payment" | "both"
```

If `propertyCeilingFromCreditAndCash` is tighter, the scenario is `payment` constrained. If the structural LTV/down-payment ceiling is tighter, the scenario is `down_payment` constrained.

The calculation still does **not** reserve transaction costs, taxes, notary/registration costs or other uses of the declared cash unless a future contract explicitly does so.

This is a modeled ceiling under explicit assumptions, not a purchase recommendation or approval.

For unknown housing category, calculate two labeled scenarios:

- VIS reference using 80% max LTV;
- non-VIS reference using 70% max LTV.

Do not determine VIS status from price alone in v0.13.

## 9. Minimum validations

Reject:

- `netHouseholdIncomeMonthly <= 0`;
- negative debt payments;
- negative down payment;
- non-finite values;
- accreditable family income <= 0 when supplied;
- EA rate < 0 or non-finite;
- term outside supported 60–360 months;
- negative non-credit housing costs.

Allow:

- zero current debts;
- zero down payment;
- financing omitted (C1 only);
- housing category unknown.

## 10. Rounding

Internal calculations retain floating precision.

Public money outputs round to nearest COP only at serialization/presentation boundary.

Ratios may be shown to one decimal percentage point in UI, but domain values remain decimal ratios.

Do not round intermediate monthly rate or principal calculations.

## 11. Required output/provenance

C1 output must identify:

- declared values;
- planning benchmark methodology version;
- regulatory constants version/date;
- warnings/limitations.

C2 must additionally identify:

- user-confirmed rate;
- user-confirmed term;
- model type;
- whether non-credit housing costs were omitted;
- binding constraint.

Suggested methodology IDs:

```text
buyer_planning_benchmark_v1_2026_08
colombia_housing_regulatory_reference_2026_08
pesos_fixed_constant_affordability_v1
```

## 12. UX claim rules

Allowed:

- “Rango de planificación”;
- “Cuota mensual para planear”;
- “Escenario modelado”;
- “Con estas suposiciones…”;
- “Tu cuota inicial disponible limita este escenario”.

Reject:

- “Te prestan hasta…”;
- “Aprobado”;
- “Tienes 90% de probabilidad”;
- “Este banco te presta…”;
- “Puedes comprar con seguridad una vivienda de…”;
- “Tu score es…”;
- “40% es una cuota sostenible”.

## 13. Current-source record

Revalidated 2026-08-26:

1. **Decreto 583 de 2025**, SUIN Juriscol / MinVivienda — vigente; first-installment ceiling 40% for housing-credit conditions; retains 70% non-VIS / 80% VIS financing maxima.
2. **Ley 546 de 1999, art. 17**, consolidated Secretaría del Senado, update shown 2026-03-16 — housing-credit framework and minimum five-year amortization term.
3. **Banca de las Oportunidades, Manual para la facilitación Programa de Educación Financiera 2025** — educational debt-service ratio benchmark; 0–30% described as ideal/preferred band, 31–40% caution.

Important freshness note: several older SFC informational pages still display the former 30% first-installment rule. They must not override Decreto 583 de 2025 for the current regulatory reference.

## 14. Acceptance criteria

1. C1 produces no payment-derived principal without rate + term.
2. planning benchmark and regulatory ceiling are separate fields and labels.
3. 40% is never called sustainable/recommended.
4. existing debts reduce planning housing-payment room.
5. room floors at zero.
6. unknown housing category produces VIS + non-VIS references, not a guessed classification.
7. C2 uses EA→monthly conversion and constant-payment formula outside UI components.
8. non-credit costs reduce modeled credit-payment budget when supplied.
9. down-payment/LTV and credit-plus-cash constraints are both calculated independently.
10. modeled property ceiling uses the tighter constraint without assuming exact max LTV financing.
11. extra equity may increase modeled property value until the structural LTV/down-payment ceiling binds.
12. no bank approval/offer/matching field exists.
13. no numerical Home Readiness score exists.
14. unsupported UVR/leasing are not silently routed through the pesos formula.
15. calculation fixtures/golden vectors must be independent of React/UI.

## 15. Out of scope

- Home Readiness score;
- bureau/Open Finance data;
- partner-bank adapters;
- actual market rates;
- subsidy eligibility;
- VIS price-threshold classifier;
- buy-vs-rent;
- full monthly ownership-cost engine;
- leasing model;
- UVR buyer model;
- application/underwriting;
- approval prediction.