# OPPORTUNITY ROUTER RULEBOOK V0.3

Status: implementation contract
Verified: 2026-08-25 (America/Bogota)
Scope: first canonical routing layer for existing Colombian housing-credit cases

## Purpose
Convert an evidence-aware Mortgage Twin into explainable next-route candidates without converting legal possibilities into approvals, entitlements or guaranteed outcomes.

This rulebook deliberately separates three layers:

1. **Canonical legal rules** — what the current legal framework supports in general.
2. **Route readiness** — whether the facts/evidence currently available make a route useful to explore.
3. **Bank adapter** — institution-specific forms, channels, internal risk checks, operational requirements and response patterns. Bank adapters are outside this v0.3 rulebook.

A route can be legally available but operationally unready. A route can also be financially interesting without constituting a legal entitlement.

## Non-negotiable output semantics
Every route result must expose:

- `routeCode`;
- `status`;
- `reasonCodes`;
- `blockers`;
- `requiredEvidence`;
- `legalBasis`;
- `humanReviewRequired`;
- `nextAction`;
- `precision`.

Allowed route statuses:

- `eligible_now` — current facts support taking the route's next procedural step now;
- `candidate` — route is worth evaluating but material facts/evidence are incomplete;
- `seasonal_wait` — route has a legally relevant annual window that is currently closed;
- `not_recommended` — current facts make the route low-value or incompatible;
- `legal_review` — facts are too complex or legally sensitive for automated routing.

Forbidden automated outputs:

- `approved`;
- `guaranteed`;
- `bank_must_accept` without the complete legal predicates being established;
- `you_are_entitled_to_save X`;
- automatic legal conclusion in foreclosure, embargo, insolvency or material contractual dispute.

## Canonical sources verified for this version

### Ley 546 de 1999 — consolidated text
Secretaría del Senado, last update shown 16 March 2026:
https://www.secretariasenado.gov.co/senado/basedoc/ley_0546_1999.html

Relevant provisions:
- Art. 17.2: fixed interest rate for the life of the housing loan unless parties agree a reduction; increase is not the contemplated path under this regime.
- Art. 17.6: first installment is capped by the percentage set by regulation.
- Art. 17.7: amortization systems require approval; constitutional conditioning requires capital amortization.
- Art. 17.8: housing loans may be prepaid totally or partially at any time without penalty; in partial prepayment, debtor chooses reduction of installment or term.
- Art. 20: annual information/projection and debtor request for restructuring during first two months of each calendar year to adjust amortization to real payment capacity; term may be extended if necessary.
- Art. 21: information duties.
- Art. 24: debtor-requested assignment of individual housing mortgage credit and guarantees; after debtor provides a binding offer from the new creditor, authorization within maximum ten business days; statutory assignment itself does not generate notarial/registration/timbre charges.

### Corte Constitucional — Sentencia C-955 de 2000
Current Senate-hosted text:
https://www.secretariasenado.gov.co/senado/basedoc/c-955_2000.html

Relevant conditioning:
- Art. 20 is constitutional on the understanding that restructuring requested within the first two months of the year, **if objective conditions exist**, must be accepted and carried out by the financial institution.
- A controversy about whether objective conditions exist is for the supervisory authority to decide under the judgment's wording.
- `first installment` also refers to the first installment paid after restructuring.
- approved amortization plans cannot consist of interest-only monthly installments; capital must amortize.

### Decreto 583 de 2025
SUIN Juriscol:
https://www.suin-juriscol.gov.co/clp/contenidos.dll/Decretos/30054984?fn=document-frame.htm$f=templates$3.0

Current rule:
- first installment may not exceed 40% of family income for long-term individual housing credit;
- family-income definition follows the regulation's qualifying applicant relationships;
- the 40% first-installment rule also applies to family-housing leasing;
- the long-term housing-credit definition includes acquisition of new/used housing, repair, remodeling, subdivision/improvement of used housing and construction of own housing.

### Superintendencia Financiera — annual renegotiation notice for 2026
Modified 22 January 2026:
https://www.superfinanciera.gov.co/publicaciones/10115991/renegociacion-anual-del-credito-hipotecario/

Operational public guidance:
- projection for 2026 to be sent no later than 31 January;
- through 28 February each year debtor may request adjustment of the housing-loan amortization plan to payment capacity;
- debtor may ask directly about current credit state, adjustment to real payment capacity, possible rate reduction and term extension.

## Interpretation guardrails

### 40% is not a generic present-installment violation trigger
Do not implement:

`currentInstallment / currentIncome > 40% => statutory violation / mandatory restructuring`.

Implement instead:
- 40% is a cap for **first installment** under the current regulation;
- C-955 extends the concept to the **first installment after restructuring**;
- it is therefore a design/validation input for restructuring, not a magic entitlement detector for every current installment.

### Article 20 is seasonal but not the whole product
At the current product date (25 August 2026), the special 2026 January-February request window is closed.

The router must still surface year-round routes such as:
- prepayment simulation;
- rate renegotiation exploration;
- assignment / portfolio-transfer comparison;
- information/audit/claim route;
- professional legal review where disputes or collection proceedings exist.

### Bank-operational policy is not canonical law
Internal bank conditions, form requirements, digital channels, risk scoring, LTV implementation, statement layouts and representation requirements belong in versioned bank adapters.

Never hard-code a bank webpage or stale circular checklist as if it were the statute itself.

## Shared input contract

```ts
type ProductType = "mortgage_housing" | "housing_leasing" | "other_secured_credit" | "unknown";
type Modality = "pesos" | "uvr" | "unknown";
type PaymentState = "current" | "early_arrears" | "collections" | "prelegal" | "executive" | "embargo_or_auction" | "unknown";

type RouterInput = {
  asOfDate: string; // ISO local date; legal-calendar logic must not depend on server UTC accidentally
  precision: "C0" | "C1" | "C2" | "C3";
  productType: ProductType;
  modality: Modality;
  extraPaymentCapacity?: number;
  wantsLowerPayment?: boolean;
  wantsFinishSooner?: boolean;
  currentAnnualEffectiveRate?: number;
  marketComparisonRate?: number;
  hasBindingTransferOffer?: boolean;
  paymentState: PaymentState;
  materialEconomicChange?: boolean;
  currentAccreditedFamilyIncome?: number;
  proposedRestructuredFirstInstallment?: number;
  statementOrContractConflict?: boolean;
  unexplainedChargeOrAllocationIssue?: boolean;
};
```

## Shared risk gates

### G-001 — product scope
- `mortgage_housing`: canonical housing-credit routes may be evaluated.
- `housing_leasing`: evaluate only rules expressly compatible with leasing; do not copy mortgage procedures blindly.
- `other_secured_credit`: mortgage collateral alone does not establish Ley 546 housing-credit treatment; route to legal review before using special-regime claims.
- `unknown`: candidate discovery may continue but legal-right routes remain blocked pending product classification.

### G-002 — distress gate
If payment state is `executive` or `embargo_or_auction`, automated optimization routes may still be shown as background information, but the **primary route must be `R10_EXECUTIVE_DEFENSE` / `legal_review`**.

Do not auto-reject the user merely because a judicial proceeding exists. Do not tell the user that the existence of proceedings automatically grants or defeats an Art. 20 right.

### G-003 — precision gate
- C0: educational route discovery only.
- C1: personalized directional routing allowed; no exact legal/financial outcome.
- C2: modeled financial comparison allowed for supported calculation models.
- C3: document-verified facts may support stronger readiness statements, but still do not imply bank approval or legal victory.

## Route R1 — PREPAGO_PLAZO

### Canonical basis
Ley 546 art. 17.8.

### Candidate logic
Candidate when:
- product is `mortgage_housing`;
- extra payment capacity > 0;
- user wants to finish sooner or has not expressed a conflicting goal.

### Eligible-now semantics
The legal ability to make total/partial prepayments without penalty and to choose term reduction on partial prepayment can be stated for a covered housing loan.

The **economic benefit amount** requires a compatible C2/C3 financial model.

### Blockers
- product not classified as covered housing credit;
- no positive additional-principal amount for a personalized simulation;
- incompatible/unknown amortization model for exact savings.

### Human review
False by default; true if contractual/bank allocation dispute exists.

## Route R2 — PREPAGO_CUOTA

Same canonical basis as R1.

Candidate when:
- covered housing credit;
- extra payment capacity > 0;
- user prioritizes lower monthly payment.

Do not describe it as interest-maximizing. The user chooses the objective; compare term vs installment transparently when the model supports both.

## Route R3 — RESTRUCTURACION_546_20

### Canonical basis
Ley 546 art. 20 + C-955/2000 conditioning + current first-installment regulation.

### Seasonal gate
Special Art. 20 request window = January and February of each calendar year.

Router behavior:
- month 1 or 2: evaluate `eligible_now` vs `candidate` vs `legal_review`;
- months 3-12: use `seasonal_wait` for the special statutory window, while still allowing a separate year-round voluntary-negotiation route.

### Readiness indicators
Useful facts include:
- material change in real payment capacity;
- current accredited family income;
- proposed first installment after restructuring;
- product classification;
- supporting evidence of income/economic change.

### 40% validation
If both accredited family income and proposed first installment are known:

`proposedRestructuredFirstInstallment <= 0.40 * accreditedFamilyIncome`

may be used as a validation signal for the first post-restructuring installment.

Failure of that comparison does **not** mean the current credit is illegal; it means the proposed restructuring design conflicts with the current first-installment cap as implemented in this rulebook.

### Automated language
Allowed:
- `La ventana especial del artículo 20 está abierta.`
- `Tu caso reúne señales que justifican preparar la solicitud y revisar condiciones objetivas.`
- `La ventana especial está cerrada; podemos preparar evidencia para enero-febrero y revisar alternativas disponibles durante todo el año.`

Forbidden:
- `El banco está obligado a bajarte la cuota porque hoy supera 40%.`
- `Tu solicitud será aprobada.`

### Human review
Required if:
- executive proceeding / embargo / auction;
- disputed interpretation of objective conditions;
- material documentary conflict;
- unusual product classification.

## Route R4 — TASA_NEGOCIACION

### Nature
Commercial/contractual opportunity, not an automatic statutory right to a specific lower market rate.

### Candidate logic
Candidate when:
- covered housing credit or leasing product;
- current rate is known;
- a credible comparison rate is available and materially lower.

### Guardrail
Article 17.2 supports fixed-rate stability and allows agreed reduction; it does not mean the debtor can unilaterally impose any market rate.

### Human review
Usually false unless bank response/contract produces a dispute.

## Route R5 — CESION_546_24

### Canonical basis
Ley 546 art. 24.

### Candidate logic
Candidate when:
- `mortgage_housing`;
- transfer/portfolio comparison is economically relevant.

### Eligible-now procedural trigger
If a binding offer from the new creditor is actually available:
- debtor can request the statutory assignment route;
- current creditor's authorization period is maximum ten business days after delivery of the binding offer, under the statute.

### Guardrails
- obtaining the new creditor's binding offer is itself subject to that creditor's underwriting/risk process;
- do not present `10 business days` as the time to obtain a new-credit approval;
- statutory no-notarial/registration/timbre-cost language applies to the assignment described by Art. 24; do not infer that every portfolio-purchase implementation has zero ancillary cost.

### Human review
Required if the current creditor refuses/delays after verified delivery of a binding offer or if guarantees/title mechanics conflict.

## Route R6 — SEGUROS_ENDOSO

Deferred from the first executable v0.3 router. Keep route code reserved.

Reason: product-specific policy equivalence, endorsement and acceptance rules require a dedicated insurance contract and bank-adapter review before automated recommendations.

## Route R7 — RECLAMACION

### Nature
Audit / information / correction route.

Candidate when any of these are true:
- statement or contract material conflict;
- unexplained charge;
- extraordinary payment appears allocated contrary to instruction;
- rate shown differs materially from the supported contractual/document source;
- bank response is internally inconsistent or insufficient.

### Evidence requirement
At least one concrete issue + supporting document/interaction reference is required before describing a personalized claim as ready to file.

### Human review
True for legal allegations; informational requests can be templated without representing them as legal conclusions.

## Route R8 — DCF_CONCILIACION

Reserved for escalation after direct-bank interaction. Do not activate automatically in v0.3 until escalation prerequisites and institution-specific DCF data are versioned.

## Route R9 — SFC_JURISDICTIONAL

Reserved for a later procedural slice. Never route executive collection itself to the SFC jurisdictional consumer action.

## Route R10 — EXECUTIVE_DEFENSE

Primary `legal_review` route when:
- payment state = `executive`; or
- payment state = `embargo_or_auction`.

Automated product behavior:
- flag urgency without fear marketing;
- preserve other financial routes as secondary context only;
- require lawyer review before procedural advice or filing strategy.

## Route R11 — INSOLVENCY

Reserved for a later vertical. Multiple-creditor/insolvency facts may trigger `legal_review`, but v0.3 does not automate eligibility.

## Route R12 — UPAC_HISTORICAL

Specialist route only. Do not mix the historical UPAC/reliquidation regime with ordinary current mortgage optimization.

## Priority model
Priority must reflect consequence and expected user value, not revenue/commission potential.

Initial deterministic ordering:
1. urgent judicial/legal safety (`R10`);
2. concrete audit/correction issue (`R7`);
3. time-sensitive Art. 20 route while Jan-Feb window is open (`R3`);
4. binding-offer assignment route (`R5`);
5. user-goal-aligned prepayment (`R1`/`R2`);
6. rate/transfer exploration (`R4`/`R5 candidate`);
7. seasonal preparation for next Art. 20 window.

## Explanation contract
Each visible route must answer:
- **Por qué aparece** — facts that triggered it;
- **Qué sabemos** — evidence/precision;
- **Qué falta** — blockers/evidence;
- **Qué puede lograr** — only the supported objective;
- **Qué no significa** — no approval/guarantee where relevant;
- **Siguiente paso** — concrete action.

## Initial executable acceptance tests
1. August 2026 + material economic change => Art. 20 is `seasonal_wait`, not `eligible_now`.
2. January 2027 + material economic change + covered mortgage => Art. 20 can be at least `candidate`; it becomes stronger only when required facts support it.
3. Current installment > 40% of current income alone never creates an automatic statutory-violation result.
4. Proposed post-restructuring first installment > 40% of accredited family income produces a restructuring-design blocker, not a current-loan-illegality conclusion.
5. Positive extra principal + covered mortgage => prepayment route appears.
6. `wantsFinishSooner` prioritizes R1 over R2; `wantsLowerPayment` prioritizes R2 over R1.
7. Binding transfer offer + covered mortgage => R5 exposes the ten-business-day statutory authorization step.
8. Executive/embargo state => R10 is primary and requires human review.
9. Unexplained charge/allocation issue => R7 appears above ordinary optimization routes.
10. Unknown/other secured credit never silently receives special Ley 546 mortgage-right language.
11. C1 may rank routes but cannot output exact financial savings.
12. Bank-specific requirements are not emitted by the canonical router.

## Out of scope for this rulebook version
- bank-specific filing channels/forms;
- productive OCR/storage;
- external bureau pulls;
- full UVR financial engine;
- automatic legal pleadings;
- insolvency eligibility;
- insurance replacement/endoso engine;
- partner offer ingestion;
- automated DCF/SFC filing.