# PRECISION STATE MACHINE — C0 TO C3

Status: implementation contract

## Purpose
Precision is a product state, not a badge chosen by copy or UI. Every result must be traceable to the evidence and calculation requirements that permit its current level.

## States

### C0 — Orientation
Allowed evidence:
- generic product category;
- public education;
- incomplete or hypothetical inputs.

Allowed outputs:
- educational explanation;
- broad route discovery;
- questions that would improve precision.

Forbidden:
- personalized monetary outcome;
- exact payoff or savings claim;
- bank/product approval language.

### C1 — Estimate
Required:
- enough user-declared inputs to create a personal snapshot;
- missing variables are explicit.

Allowed:
- personalized summary;
- approximate opportunity classification;
- directional next action.

Forbidden:
- exact amortization schedule when rate/system are unknown;
- exact savings;
- `verified` language.

Current quick check is C1.

### C2 — Modeled simulation
Required for each model:
1. model-specific required inputs explicitly entered/confirmed;
2. compatible modality/system;
3. pure domain calculation passes validation;
4. assumptions displayed;
5. provenance retained.

For initial constant-payment-pesos prepayment model:
- pesos confirmed;
- principal > 0;
- annual effective rate explicitly entered (0% must be entered as 0; empty is not 0);
- exact remaining installments explicitly confirmed;
- constant-payment-pesos system selected;
- additional principal > 0;
- simulation completes without guardrail error.

Allowed:
- modeled payment;
- baseline/scenario payoff;
- modeled interest avoided;
- Benefit Breakdown;
- Scenario Path.

Must label:
- nominal/model assumptions;
- excluded insurance/charges when excluded;
- not contractual verification;
- not bank approval.

### C3 — Document verified
C3 is not granted by OCR confidence alone.

Required:
1. source document is within accepted document class;
2. document date/cutoff captured;
3. material fields extracted;
4. user confirms or corrects extracted values;
5. conflicting fields resolved or marked unresolved;
6. cross-field reconciliation rules pass;
7. calculation model is compatible with verified modality/system;
8. provenance links result fields to document/user-correction source.

Examples of material fields:
- current principal;
- rate + rate basis;
- modality;
- amortization system when available;
- remaining installments/contract term;
- payment components;
- insurance/cost components;
- cutoff date.

If the document does not contain a required model field, C3 may apply to the snapshot field but not necessarily to the downstream scenario. Precision can be field-level and result-level.

## Transitions

C0 -> C1
Trigger: sufficient user-declared snapshot inputs.

C1 -> C2
Trigger: user explicitly supplies/validates all model-specific inputs.

C1 -> C3 snapshot
Trigger: accepted document + extraction review + reconciliation.

C2 -> C3 scenario
Trigger: the C2 model's material inputs are document-verified/reconciled.

C3 -> C2/C1 downgrade
Required when:
- verified source expires or becomes stale for the claim;
- user edits a verified field without re-verification;
- a new document conflicts materially;
- calculation model changes and prior evidence is insufficient.

## No-silent-upgrade rules
- Placeholder value does not count as confirmation.
- Pre-filled derived value does not count as confirmation unless the user explicitly accepts it.
- `Number("") === 0` or similar language coercion can never establish a financial input.
- OCR confidence >99% does not establish C3 by itself.
- Partner data does not automatically establish C3 unless its source contract meets verification criteria.

## Field-level provenance
Each material field should carry:
- value;
- unit;
- provenance kind;
- source reference;
- observed/cutoff date;
- confirmation state;
- conflict state;
- confidence where machine-extracted;
- last changed timestamp.

## UX requirement
Whenever a result changes precision:
- announce the new level;
- explain what evidence enabled the change;
- explain what remains unverified;
- do not use celebratory motion implying approval.

## Analytics
Track transitions only as categorical events, never raw balances/rates in generic analytics:
- precision_c0_to_c1
- precision_c1_to_c2
- precision_c1_to_c3
- precision_c2_to_c3
- precision_downgraded

## Release invariants
1. C1 never exposes exact savings from an underdetermined mortgage model.
2. C2 never uses a model incompatible with modality/system.
3. C3 never comes from unreviewed OCR alone.
4. `offer` and `approval` remain separate from C0-C3; precision describes our evidence/model, not a third party's decision.
