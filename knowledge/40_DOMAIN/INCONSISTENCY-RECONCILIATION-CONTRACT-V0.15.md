# INCONSISTENCY RECONCILIATION CONTRACT v0.15

Date: 2026-08-26
Status: domain contract
Journey: 4 — Financial/legal inconsistency
Public working route: `/revisar-diferencia`
Base: v0.14 `032f8712a597f2139e8eafa561322f58f08fe753`

## 1. Purpose

Journey 4 answers a narrow user question:

**“Algo no me cuadra en mi crédito. ¿Qué exactamente debería comparar y qué hago después?”**

v0.15 is an evidence-oriented reconciler/classifier. It is not:

- an abuse detector;
- an illegality classifier;
- a complaint generator;
- an automated legal opinion;
- a bank-error probability score;
- a substitute for documentary/professional review.

The first result remains **C0** and can be produced anonymously.

## 2. Canonical chain

`Declared issue → Inconsistency Reconciler → Opportunity Router → contextual evidence/action`

Responsibilities:

- this reconciler owns issue classification, explanation, evidence gaps and next-step presentation;
- the existing Opportunity Router remains authoritative for R7 and R10;
- the existing document-verification/reconciliation contract remains authoritative for C3;
- the existing Mortgage Audit blueprint remains the assisted R7 execution path;
- a reported judicial state keeps R10 above ordinary inconsistency analysis.

No new legal route code is introduced in v0.15.

## 3. Inputs

```ts
type InconsistencyKind =
  | "payment_allocation"
  | "contract_or_statement"
  | "rate_or_modality"
  | "insurance_or_fee"
  | "balance_or_term"
  | "annual_projection"
  | "missing_information"
  | "collection_charge"
  | "other";

type EvidenceAvailability =
  | "none"
  | "one_source"
  | "two_sources"
  | "unknown";

type DifferenceSpecificity = "specific" | "unclear";

type InconsistencyReconciliationInput = {
  asOfDate: string;
  productType: ProductType;
  paymentState: PaymentState;
  kind: InconsistencyKind;
  evidenceAvailability: EvidenceAvailability;
  specificity: DifferenceSpecificity;
};
```

No identity/contact/document upload is required for C0.

## 4. Output states

```ts
type ReconciliationState =
  | "education_first"
  | "needs_information"
  | "difference_to_reconcile"
  | "possible_inconsistency"
  | "procedural_priority";
```

### `education_first`

The reported fact has a known non-irregular explanation that should be understood before escalation.

Example: annual projection differs from actual behavior. Projections use assumptions and differences can require explanation; variance alone does not prove error.

### `needs_information`

There is not enough specificity or evidence to identify a concrete discrepancy.

### `difference_to_reconcile`

The user has identified a specific comparison point, but the current evidence does not yet support calling it a possible inconsistency.

### `possible_inconsistency`

A specific issue plus sufficient source context justifies R7 screening. This wording does not establish illegality, breach, fraud or bank error.

### `procedural_priority`

A judicial state is separately reported. R10 dominates and the first action is document verification/professional review, not ordinary R7 escalation.

## 5. Primary actions

```ts
type ReconciliationActionCode =
  | "understand_rule"
  | "request_information"
  | "compare_evidence"
  | "prepare_audit"
  | "verify_judicial_document";
```

Mapping:

- `education_first` → `understand_rule`;
- `needs_information` → `request_information`;
- `difference_to_reconcile` → `compare_evidence`;
- `possible_inconsistency` → `prepare_audit`;
- `procedural_priority` → `verify_judicial_document`.

## 6. Issue-specific truth rules

### Payment allocation

A normal housing payment may be distributed among capital, current interest and insurance; mora can add other components under applicable rules. Therefore seeing less capital reduction than the full payment is not by itself evidence of wrongful application.

If the user reports a **specific** mismatch and has source material sufficient to compare what was instructed/expected with what was applied, the reconciler may feed `unexplainedChargeOrAllocationIssue: true` to the Opportunity Router.

Preferred evidence:

- statement showing the applied payment;
- payment/prepayment instruction if one existed;
- prior/subsequent statement when useful;
- lender response/radicado if already requested.

### Contract or statement

A vague feeling that “the statement looks wrong” does not activate R7.

A concrete mismatch between a contractual/communicated condition and a statement may feed `statementOrContractConflict: true` when the user reports a specific comparison and sufficient source context exists.

### Rate or modality

The relevant comparison is factual:

- contracted/communicated rate vs rate displayed/charged;
- pesos vs UVR or other material product condition;
- effective annual expression where relevant.

Do not calculate illegality from a self-entered number.

### Insurance or fee

The first question is whether the concept can be identified and supported by the statement/contract/policy/communication.

An unfamiliar charge is not automatically unauthorized.

### Balance or remaining term

Compare consistent cutoff dates and source definitions before treating two values as contradictory.

A difference caused by different cutoff dates is not a product error.

### Annual projection

A projection is not a guarantee of the actual annual path. A difference between projected and actual behavior can arise because assumptions changed and may require explanation.

`annual_projection` alone must **not** activate R7.

It may become a concrete inconsistency only if a separate specific conflict appears after the projection assumptions and actual statement history are compared.

### Missing information

Missing/unclear information routes first to `request_information`.

The user has rights to clear, sufficient and timely financial information and to make requests/complaints, but the absence perceived by the user is not automatically classified as a proven legal breach in C0.

### Collection charge

A collection-related charge or amount the user does not understand is first an evidence/reconciliation problem.

Do not infer that collection itself is judicial or unlawful. Payment Pressure v0.14 remains authoritative for stage/urgency.

## 7. Evidence sufficiency rules

`EvidenceAvailability` describes what the user says they can compare; it is not provenance verification.

- `none` → cannot produce `possible_inconsistency` from self-report alone;
- `one_source` → can isolate a question but normally remains `needs_information` or `difference_to_reconcile`;
- `two_sources` → may support R7 screening when the issue is specific and is one of the R7-compatible categories;
- `unknown` → ask for source classification first.

Even `two_sources` remains C0 until actual evidence is processed under the document-verification contract.

**C3 is impossible in this reconciler.**

## 8. R7 mapping

R7-compatible categories when `specificity === "specific"` and `evidenceAvailability === "two_sources"`:

- `payment_allocation` → `unexplainedChargeOrAllocationIssue: true`;
- `collection_charge` → `unexplainedChargeOrAllocationIssue: true`;
- `contract_or_statement` → `statementOrContractConflict: true`;
- `rate_or_modality` → `statementOrContractConflict: true`;
- `insurance_or_fee` → `statementOrContractConflict: true` only as a concrete document/condition conflict;
- `balance_or_term` → `statementOrContractConflict: true` only after cutoff/source comparability is explicitly preserved by the result caveat.

Not automatically R7-compatible:

- `annual_projection`;
- `missing_information`;
- `other` without a concrete comparison.

The Opportunity Router owns final R7 creation.

## 9. R10 precedence

If `paymentState` is `executive` or `embargo_or_auction`:

- state = `procedural_priority`;
- primary action = `verify_judicial_document`;
- R10 remains the primary route;
- R7, if also present, must not become the first CTA;
- no procedural term, defense or deadline is calculated from self-report.

## 10. Product-type boundary

Unknown product:

- classify product before applying mortgage-specific legal procedure;
- do not escalate solely because product type is unknown.

Housing leasing:

- may still have factual/documentary differences;
- does not inherit mortgage-specific Ley 546 procedures automatically;
- R7-like factual reconciliation can exist, but legal basis/next action must not falsely invoke mortgage-only mechanisms.

## 11. Evidence checklist grammar

Each result can return items with importance:

- `required_for_next_step`;
- `recommended`;
- `conditional`.

Core source types:

- latest statement;
- contract/pagaré/conditions when relevant;
- prior statement or annual projection;
- payment/prepayment instruction;
- transaction receipt;
- insurance/policy support;
- lender response or radicado;
- judicial document only when a judicial state is reported.

## 12. Explainability contract

Every result must state:

1. **Qué reportaste** — issue category and specificity;
2. **Qué podría explicarlo** — non-accusatory alternatives;
3. **Qué comparar** — exact evidence pair(s);
4. **Qué falta** — unresolved evidence/provenance;
5. **Qué hacer después** — self-service, R7 audit or R10 verification.

## 13. Forbidden claims

Self-report/C0 output must not say or imply:

- “el banco se equivocó”;
- “esto es ilegal”;
- “te cobraron de más”;
- “hubo fraude”;
- “ganarás la reclamación”;
- “te deben devolver X”;
- probability of success;
- automatic damages/refund;
- automatic procedural deadline.

## 14. Regulatory/source record

Revalidated 2026-08-26:

- Ley 546 de 1999, art. 21: housing lenders must provide certain, sufficient, timely and easily understood information regarding credit conditions.
- Ley 1328 de 2009: transparency and certain/sufficient/clear/timely information; consumer rights include understandable, verifiable information and petitions/complaints.
- SFC housing-credit guidance: extracts identify material loan fields including amortization system, contracted/charged rate, UVR where applicable, cutoff/payment dates, installment counts, balance and prior-payment breakdown among capital, interest/mora and insurance.
- SFC annual housing-credit information: annual history/projection is assumption-based; a prior projection that differs from actual behavior may be accompanied by an explanation of the causes.

These sources define comparison surfaces. They do not authorize the product to infer a violation merely because two user-entered values differ.

## 15. v0.15 acceptance tests

1. annual projection variance alone → `education_first`, no R7;
2. missing information → `needs_information`, no R7;
3. vague concern + two sources → no automatic R7 because specificity is missing;
4. specific payment-allocation mismatch + two sources → R7 candidate;
5. specific contract/statement mismatch + two sources → R7 candidate;
6. specific rate/modality mismatch + two sources → R7 candidate;
7. unfamiliar insurance/fee + one source → compare/request evidence first;
8. specific balance/term mismatch + two sources → R7 candidate with cutoff comparability caveat;
9. judicial state + mismatch → R10 primary;
10. unknown product → product classification first when mortgage regime matters;
11. leasing does not inherit mortgage Article 20 logic;
12. output contains no automatic illegality/fraud/bank-error claim;
13. result precision remains C0;
14. C3 is impossible from this engine;
15. no generic attorney CTA for vague/educational/missing-information states.

## 16. Out of scope

- live OCR/document parsing;
- automated monetary restitution calculation;
- automatic complaint drafting/submission;
- complaint deadline calculation;
- classification of abusive clauses;
- litigation strategy;
- court lookup;
- automatic DCF/SFC filing;
- auth/persistence;
- lender-specific internal policy inference.
