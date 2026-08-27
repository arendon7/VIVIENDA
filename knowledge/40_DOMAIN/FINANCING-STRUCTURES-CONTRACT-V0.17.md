# FINANCING STRUCTURES CONTRACT v0.17

Date: 2026-08-27
Status: domain contract
Scope: Journey 2 — Step 7 / financing comparison
Base: v0.16 Home Readiness

## 1. Objective

Add a trustworthy bridge between **buyer readiness** and a future comparison of actual financing products.

v0.17 must help a prospective buyer answer:

1. Which **contract structure** should I keep open: mortgage credit, housing leasing, or both?
2. Which **payment denomination/behavior** should I examine first: pesos, UVR, or both?
3. What facts must I request from a lender before comparing actual offers?
4. Which part of the decision is based on public/reference information and which part is only based on my declared preferences?

v0.17 must **not** answer:

- which bank will approve me;
- which bank is best;
- my probability of approval;
- what rate I will receive;
- whether I am eligible for a subsidy;
- whether leasing or mortgage is universally cheaper;
- whether pesos or UVR is universally better.

## 2. Product name and output language

Public working name:

**Explorador de estructuras de financiación**

Do not use `comparador de bancos` for v0.17.

Do not use `compatibilidad`, `match`, `apto`, `elegible` or `preaprobado` for the preference-routing result.

Preferred vocabulary:

- `Explorar primero`;
- `Mantener para comparar`;
- `Menos alineado con esta preferencia`;
- `Necesitamos una preferencia`;
- `Afinidad con tus preferencias`, only when explicitly qualified as non-underwriting.

## 3. Two independent decision axes

A central v0.17 invariant is that contractual structure and payment denomination are **not one taxonomy**.

### Axis A — contractual structure

- `mortgage_credit` — crédito hipotecario de vivienda;
- `housing_leasing` — leasing habitacional destinado a vivienda.

### Axis B — denomination/payment behavior

- `pesos`;
- `uvr`.

Do not present these as three peer cards such as:

- mortgage in pesos;
- mortgage in UVR;
- leasing.

Reason: a leasing product can itself have provider-specific denomination and amortization conditions. The commercial offer determines which combinations actually exist.

## 4. Frozen truth basis — Colombia

This contract freezes the following public/reference distinctions as of 2026-08-27.

### 4.1 Mortgage credit

Superintendencia Financiera consumer guidance defines a housing mortgage credit as a financing contract in which the financial institution lends money for acquisition of the dwelling and the borrower grants a mortgage over the property as payment security.

Product interpretation:

- the user is financing an acquisition in which the property is acquired by the purchaser and encumbered with mortgage security;
- exact lender underwriting, rate, term, percentage financed and fees remain product-specific.

### 4.2 Housing leasing

Superintendencia Financiera guidance defines housing leasing as a contract under which an authorized entity gives the locatario possession/use of a dwelling in exchange for periodic payments and, at the end, the asset is returned or transferred if the locatario exercises the agreed acquisition option and pays its value.

Product interpretation:

- title remains with the owner/entity during the leasing contract until the acquisition option is exercised and the transfer occurs;
- v0.17 must explain this ownership timing before treating leasing as an option;
- v0.17 must not generalize a particular institution's maximum financing percentage to the whole market.

### 4.3 Pesos and UVR

Superintendencia Financiera materials recognize approved housing-credit amortization systems in pesos and UVR.

Relevant explanatory facts:

- in a constant-payment pesos system, the nominal payment can be fixed in pesos for the supported structure;
- UVR is linked to inflation/IPC, so an amount expressed in pesos can change as UVR changes;
- there are multiple approved amortization systems; v0.17 does not reduce all pesos or UVR products to one exact cash-flow formula.

Superintendencia Financiera has expressly noted that no amortization system is inherently more advantageous for every borrower; suitability depends on the borrower's needs, payment capacity and cash-flow characteristics.

Therefore v0.17 may route by **declared preference**, not by a universal best-product assertion.

### 4.4 Current general credit reference

Decreto 583 de 2025 modified the general long-term individual housing-credit conditions currently used by Buyer Affordability, including:

- up to 70% financing reference for non-VIS;
- up to 80% for VIS;
- first-installment ceiling up to 40% of family income under that regulation.

These references belong to the credit-regulatory context and **must not be silently applied as universal leasing commercial limits**.

## 5. Source hierarchy

Preferred authority order for v0.17 truth claims:

1. consolidated statute/decree text — SUIN Juriscol;
2. Superintendencia Financiera current consumer/regulatory guidance;
3. institution-specific pages only as examples of an actual provider/product, never as general market rules.

A current FNA product may demonstrate that a specific provider offers particular leasing terms, but those terms cannot become generic v0.17 constants.

## 6. Input contract

```ts
type OwnershipTimingPreference =
  | "title_from_purchase"
  | "open_to_option_later_if_terms_fit"
  | "no_strong_preference"
  | "unknown";

type PaymentBehaviorPreference =
  | "nominal_peso_predictability"
  | "open_to_inflation_linked_variation"
  | "compare_both"
  | "unknown";

type FinancingConstraintContext =
  | "payment"
  | "down_payment"
  | "both"
  | "unknown";

type FinancingStructuresInput = {
  ownershipTimingPreference: OwnershipTimingPreference;
  paymentBehaviorPreference: PaymentBehaviorPreference;
  constraintContext?: FinancingConstraintContext;
};
```

No identity, bureau, bank, employer, exact salary, phone or ID field is required by this domain evaluator.

A future embedded experience may reuse the **constraint context** from Buyer Affordability/Home Readiness. It must not use Home Readiness's 0–100 total as an underwriting proxy.

## 7. Output contract

```ts
type ExplorePriority =
  | "explore_first"
  | "compare"
  | "secondary"
  | "needs_information";

type FinancingStructureOption = {
  code: "mortgage_credit" | "housing_leasing";
  priority: ExplorePriority;
  title: string;
  explanation: string;
  factsToVerify: string[];
  reasonCodes: string[];
};

type FinancingDenominationOption = {
  code: "pesos" | "uvr";
  priority: ExplorePriority;
  title: string;
  explanation: string;
  factsToVerify: string[];
  reasonCodes: string[];
};

type FinancingStructuresResult = {
  precision: "C0" | "C1";
  structureOptions: FinancingStructureOption[];
  denominationOptions: FinancingDenominationOption[];
  quoteChecklist: string[];
  contextNotices: string[];
  boundaries: {
    isEligibility: false;
    isApproval: false;
    isApprovalProbability: false;
    isBankMatch: false;
    isMarketQuote: false;
    isCostRanking: false;
  };
};
```

## 8. Precision

### C0

When both user preferences are unknown, v0.17 may only provide neutral education and ask the user to clarify the decision criteria.

No option may be ranked `explore_first` from missing preferences.

### C1

Once at least one preference is explicitly declared, v0.17 may route options according to that preference.

C1 is:

- a preference-based decision aid;
- based on declared information;
- not a lender underwriting model.

## 9. Contract-structure routing

### 9.1 User requires title from purchase

If:

```text
ownershipTimingPreference = title_from_purchase
```

then:

- `mortgage_credit` → `explore_first`;
- `housing_leasing` → `secondary`.

Explanation must be structural: leasing keeps ownership with the entity during the contract until acquisition option/transfer.

Do not say leasing is financially worse.

### 9.2 User is open to acquisition option later

If:

```text
ownershipTimingPreference = open_to_option_later_if_terms_fit
```

then:

- mortgage → `compare`;
- leasing → `compare`.

Do not rank leasing first merely because the user accepts its ownership structure. Actual commercial conditions are still missing.

### 9.3 No strong preference

If:

```text
ownershipTimingPreference = no_strong_preference
```

then both remain `compare`.

### 9.4 Unknown

If unknown, both are `needs_information` and the UI explains the ownership-timing distinction.

## 10. Denomination routing

### 10.1 Nominal-peso predictability preference

If:

```text
paymentBehaviorPreference = nominal_peso_predictability
```

then:

- pesos → `explore_first`;
- UVR → `secondary`.

Reason: the declared preference is for nominal-peso payment predictability. This is **not** a claim that pesos is cheaper.

### 10.2 Open to inflation-linked variation

If:

```text
paymentBehaviorPreference = open_to_inflation_linked_variation
```

then:

- pesos → `compare`;
- UVR → `compare`.

Do not make UVR `explore_first` solely because the user accepts inflation-linked variation; an actual rate/system/quote is still required to compare economics.

### 10.3 Compare both

Both → `compare`.

### 10.4 Unknown

Both → `needs_information`.

## 11. Constraint context

Constraint context may enrich **what to verify next** but may not manufacture commercial terms.

### `down_payment`

Add a notice similar to:

> Tu inicial es hoy una restricción relevante. Pide a cada entidad el porcentaje realmente financiable y el efectivo total requerido. VIVIENDA no supone que leasing financie más que crédito hipotecario.

### `payment`

Add a notice similar to:

> Tu capacidad mensual es hoy una restricción relevante. Compara la cuota/canon real, seguros, costos recurrentes y comportamiento de la obligación; no solo el porcentaje financiado.

### `both`

Show both notices in a condensed form.

### `unknown`

Do not infer a limiting factor.

## 12. Actual-quote checklist

Every user should leave v0.17 knowing what data is needed for a real comparison.

Minimum checklist:

- entity/provider;
- contractual structure: mortgage or leasing;
- denomination: pesos or UVR;
- exact amortization/payment system;
- amount actually financed;
- percentage of property value actually financed;
- rate and exact rate convention;
- term;
- first payment/canon;
- insurance amounts or methodology;
- one-time fees/closing charges stated by provider;
- conditions for prepayment/extra payments where applicable;
- for leasing: acquisition-option amount/percentage and timing;
- total cash required before/during closing;
- quote date/validity;
- source document or provider channel.

v0.17 does not calculate a winner from this checklist. A future quote-comparison contract may do so when enough comparable terms are supplied.

## 13. Non-ranking invariants

v0.17 must never rank by:

- lowest visible monthly payment alone;
- highest financing percentage alone;
- lowest headline rate without rate convention;
- brand popularity;
- commercial commission;
- affiliate payout;
- Home Readiness score;
- declared employment type;
- unsupported assumptions about tax treatment or subsidies.

## 14. Provenance labels

Every material statement should be distinguishable as one of:

- `public_reference` — structural/regulatory fact;
- `user_preference` — routing based on a declared preference;
- `user_context` — reused planning fact/constraint;
- `provider_quote` — future actual quote, not produced by v0.17;
- `provider_decision` — future lender decision, never produced by v0.17.

## 15. Required public UX boundaries

The result must visibly state:

> Esta guía organiza opciones por tus preferencias. No evalúa elegibilidad, score, aprobación ni condiciones de una entidad.

And:

> Para comparar costo real necesitamos cotizaciones comparables de productos concretos.

Do not use a percentage match.

Do not display a bank logo or lender name unless backed by current provider/product data with provenance and date.

## 16. Privacy / progressive commitment

The standalone explorer must work without:

- name;
- email;
- phone;
- ID;
- bureau authorization;
- account.

If embedded after Home Readiness, reuse only the minimal decision context needed in memory. Do not serialize financial/profile data into the URL.

## 17. Domain invariants to test

At minimum:

1. unknown preferences never create `explore_first`;
2. immediate-title preference routes mortgage first and leasing secondary;
3. openness to later acquisition keeps both structures comparable;
4. no-strong-preference keeps both structures comparable;
5. nominal-peso predictability routes pesos first without claiming lower cost;
6. accepting inflation-linked variation keeps pesos and UVR comparable;
7. compare-both keeps both comparable;
8. no result contains eligibility/approval/probability/bank-match/offer claims;
9. no numerical match score is returned;
10. down-payment constraint warns to obtain actual financing percentage without assuming leasing finances more;
11. payment constraint warns to compare payment/canon + insurance/costs;
12. Home Readiness total is not an evaluator input;
13. employment type is not an evaluator input;
14. quote checklist includes rate convention, term, amount financed, insurance, option-to-acquire for leasing, cash required and quote date;
15. public-reference facts remain separate from user-preference routing.

## 18. Out of scope

- lender catalogue;
- live market rates;
- actual bank/FNA matching;
- affiliate ranking;
- approval/preapproval;
- bureau data;
- Open Finance;
- subsidy eligibility;
- application submission;
- quote normalization/math;
- UVR inflation scenario modeling;
- leasing total-cost model;
- taxes or tax-benefit comparison;
- payments/contracting;
- auth/persistence.

## 19. Candidate next slice

If v0.17 proves useful, the natural next product increment is a **user-entered actual quote comparator** that can normalize two or more concrete offers with explicit provenance and assumptions before any live bank integration.