# STATEMENT-GUIDED MORTGAGE TWIN CONTRACT V0.20

Status: implementation contract
Scope: existing-borrower journey between C1 Quick Check and future document-derived C3 verification

## 1. Product question

> **Can a borrower use a recent statement locally as a guide to build a materially better loan snapshot without VIVIENDA pretending to have uploaded, extracted or verified the document?**

v0.20 exists to close the current product gap:

`Quick Check C1 → manual C2 scenario → simulated document demo`

becomes:

`Quick Check C1 → statement-guided C1 Mortgage Twin → compatible C2 decision model → future document-derived C3`

## 2. Precision boundary

Selecting a local file does not change provenance by itself.

A value manually typed while looking at a local statement is:

`USER_DECLARED / user_transcribed_from_local_statement`

It is **not**:

- `DOCUMENT_EXTRACTED`;
- machine extracted;
- OCR-derived;
- reviewer verified;
- C3.

The local statement file is only a user-side reference in v0.20. VIVIENDA does not read its contents.

Therefore:

- the guided Mortgage Twin snapshot is C1;
- a deterministic calculation built from sufficient C1 inputs is C2;
- C3 remains governed by `DOCUMENT-VERIFICATION-CONTRACT.md` and requires real document-derived evidence plus reconciliation.

## 3. Provider/runtime boundary

The existing Evidence API/storage stack remains fail-closed and provider-ready.

v0.20 MUST NOT:

- activate Supabase;
- create production buckets;
- create an identity/session system;
- call an OCR provider;
- POST file bytes to the existing evidence routes;
- emulate a successful server upload;
- issue fake evidence IDs or storage locators.

The current provider-ready Evidence API remains a later activation path.

## 4. Local file contract

Accepted local reference types:

- `application/pdf`;
- `image/jpeg`;
- `image/png`.

Maximum client-side reference size: 15 MiB.

A non-finite or non-positive byte size is an invalid local descriptor and is distinct from a valid file that exceeds 15 MiB.

The UI must state that these checks are convenience checks only and are not equivalent to server-side content validation.

The local filename is display-only and must not enter generic analytics or domain results.

## 5. Canonical field set

### Snapshot-material fields

Required to build the v0.20 guided Mortgage Twin snapshot:

1. `product_type`
   - mortgage housing credit;
   - housing leasing;
   - unknown.
2. `cutoff_date`.
3. `modality`
   - pesos;
   - UVR;
   - unknown.
4. `principal_balance`.

A snapshot may remain partial when one of these fields is unknown/missing.

### Decision-model fields

Additional fields relevant to a constant-payment-pesos prepayment model:

5. `annual_effective_rate`.
6. `remaining_installments`.
7. `amortization_system`.

The first compatible system is:

`constant_payment_pesos`

### Context fields

Useful but not sufficient to alter precision or model readiness:

- `institution_name`;
- `current_total_payment`;
- `monthly_insurance_or_costs`.

If a numeric context field is supplied but invalid, the evaluator records a context issue and omits that value from the normalized snapshot. It must not block a valid snapshot or an otherwise valid decision-model input.

## 6. Canonical provenance per field

Every supplied field must preserve:

```ts
type StatementGuidedFieldProvenance = {
  sourceType: "user_declared";
  acquisitionMethod: "user_transcribed_from_local_statement";
  documentClass: "housing_financing_statement";
  documentReadByPlatform: false;
  userConfirmed: true;
};
```

No confidence percentage is produced because there is no extraction model.

## 7. Readiness states

### Local reference

- `no_local_statement`
- `local_statement_selected`
- `local_statement_rejected`

### Snapshot readiness

- `incomplete`
- `snapshot_ready`

`snapshot_ready` requires all snapshot-material fields to be known and valid.

### Prepayment-model readiness

- `not_applicable`
- `needs_data`
- `ready_for_constant_payment_pesos_model`

The model is ready only when:

- product = mortgage housing credit;
- modality = pesos;
- principal balance valid;
- annual effective rate explicitly supplied and valid;
- remaining installments is a positive integer;
- amortization system = constant payment in pesos.

Housing leasing does not inherit the mortgage prepayment model automatically.

UVR does not inherit the pesos model automatically.

## 8. Validation rules

### Balance

- finite;
- greater than zero.

### Current payment / insurance

When supplied:

- current total payment must be finite and greater than zero;
- monthly insurance/costs must be finite and non-negative.

Invalid context values are omitted and surfaced as `context` issues; they do not alter snapshot/model readiness.

### Annual effective rate

When supplied:

- explicitly EA;
- finite;
- `0 <= rate < 1` in canonical decimal representation.

v0.20 does not convert an ambiguous or differently-labelled rate into EA.

### Remaining installments

When supplied:

- integer;
- greater than zero.

### Cutoff date

- valid ISO date;
- cannot be after the evaluator `asOfDate` without producing a blocking issue.

v0.20 does not invent a universal staleness cutoff. It may expose age in days as context when both dates are valid.

## 9. Issues

Issue codes are deterministic and user-actionable:

- `local_statement_required`
- `unsupported_local_file_type`
- `local_file_invalid_size`
- `local_file_too_large`
- `product_type_missing`
- `cutoff_date_missing`
- `cutoff_date_invalid`
- `cutoff_date_in_future`
- `modality_missing`
- `principal_balance_missing`
- `principal_balance_invalid`
- `current_total_payment_invalid`
- `monthly_insurance_or_costs_invalid`
- `annual_effective_rate_missing`
- `annual_effective_rate_invalid`
- `remaining_installments_missing`
- `remaining_installments_invalid`
- `amortization_system_missing`
- `mortgage_model_not_applicable_to_leasing`
- `pesos_model_not_applicable_to_uvr`
- `unsupported_amortization_system`

Issue blocking classes are:

- `local_reference` — prevents the local file from being treated as the active guided reference;
- `snapshot` — prevents a complete C1 Mortgage Twin snapshot;
- `model` — prevents the compatible C2 model handoff;
- `context` — indicates an optional/context field should be corrected or omitted but does not change snapshot/model readiness.

A missing model field must not block creation of a valid snapshot if snapshot-material fields are complete.

## 10. Output

The evaluator returns:

- local reference readiness;
- snapshot readiness;
- model readiness;
- normalized C1 snapshot when possible;
- field-level provenance;
- model-input payload only when model readiness passes;
- issues and next-data requirements;
- truth-boundary notices.

The normalized snapshot MUST NOT contain the local filename.

## 11. Mortgage Twin integration

The C1 Mortgage Twin should visibly state:

> **Datos transcritos por ti desde un extracto local. VIVIENDA no leyó ni verificó el archivo.**

It may show the local filename separately in ephemeral UI, but not as canonical provenance or evidence identity.

If the user edits any field, the snapshot remains C1 and downstream C2 calculations must be recomputed from the changed inputs.

## 12. C2 decision-model integration

When `ready_for_constant_payment_pesos_model`, v0.20 may feed the existing versioned prepayment engine.

The output must retain:

- C1 input provenance;
- C2 calculation provenance;
- formula/method identity;
- assumptions;
- no claim of document verification.

The user's extra principal is not “savings generated by VIVIENDA.”

## 13. UX boundary

Before local file selection, explain:

1. which statement is useful;
2. that no password/token is requested;
3. that the file remains local in v0.20;
4. that VIVIENDA does not read/OCR the file;
5. that the user will transcribe the relevant fields;
6. that C3 requires future real document processing/reconciliation.

The interface must not retain the old simulated extracted values as if they came from the selected file.

## 14. Analytics boundary

Permitted generic events may include:

- `statement_guided_started`;
- `local_statement_selected` with generic document class/type category only;
- `guided_snapshot_completed`;
- `guided_model_ready`;
- `guided_field_missing_count`.

Never send:

- filename;
- balance;
- payment;
- rate;
- obligation reference;
- institution if it can become user-specific analytics metadata;
- raw file bytes.

## 15. Frozen non-goals

v0.20 does not implement:

- server upload;
- persistence;
- OCR/extraction;
- document-derived C3;
- identity/auth;
- provider activation;
- bank connectivity;
- portfolio-transfer offer matching;
- bank/product recommendation;
- legal conclusion.

## 16. Core invariant

> **A local document can guide the user without becoming evidence that VIVIENDA claims to have read.**

That boundary is the reason v0.20 can deliver real borrower value now without bypassing the security, identity and document-verification architecture already present in the repository.
