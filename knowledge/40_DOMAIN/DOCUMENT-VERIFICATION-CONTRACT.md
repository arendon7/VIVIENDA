# DOCUMENT VERIFICATION CONTRACT

Status: implementation contract
Scope: housing-credit document intake, extraction review and C3 promotion

## Principle
A document improves evidence only to the extent that the document class, date, extracted fields and reconciliation can be understood. File upload is not verification; OCR is not verification; user confirmation alone does not override an internally inconsistent source.

## Accepted MVP document class
Initial MVP supports only a recent housing-credit or housing-leasing statement/extract that exposes enough of the following:
- institution/entity;
- obligation reference (masked in generic analytics/logging);
- statement/cutoff date;
- principal balance;
- installment/payment components;
- interest rate and basis when present;
- modality pesos/UVR;
- remaining installments/term when present;
- insurance/cost components when present.

Contracts, amortization tables, promissory notes and legal notices are separate document classes and must not be silently parsed as statements.

## Before upload — permission gate
The UI must explain before file selection:
1. what document is useful;
2. why it improves precision;
3. which fields will be read;
4. that credentials/passwords are never requested;
5. whether automated/AI extraction will be used;
6. that extracted fields are reviewed before use;
7. data-handling/privacy link.

The user must not need to accept legal representation to upload a statement for financial analysis.

## File constraints — initial
Allowlist at first implementation:
- PDF
- JPEG/JPG
- PNG

Reject executables/archives/office macros regardless of extension spoofing after server-side validation is introduced.

Recommended initial max file size: 15 MB, configurable.

Client extension/MIME validation is convenience only; server-side content validation is required before production ingestion.

## Extraction field model

```ts
type ExtractionFieldStatus =
  | "extracted_high_confidence"
  | "needs_confirmation"
  | "user_corrected"
  | "missing"
  | "conflict";

type ExtractedField<T> = {
  key: string;
  label: string;
  value: T | null;
  unit?: string;
  status: ExtractionFieldStatus;
  confidence?: number;
  sourcePage?: number;
  sourceTextHint?: string;
};
```

Machine confidence must not be shown as false precision when the underlying OCR/model does not expose a calibrated confidence score.

## Material fields
Material for C3 snapshot:
- balance;
- cutoff date;
- modality.

Material for C3 constant-payment-pesos prepayment scenario:
- balance;
- cutoff date;
- modality = pesos;
- annual effective rate or an unambiguous convertible rate basis;
- remaining installments/term;
- compatible amortization system.

A statement can verify some fields while leaving the scenario at C1/C2.

## Review screen
Each field displays:
- label;
- extracted/current value;
- source status;
- edit/correct action;
- optional page/source hint;
- conflict warning when needed.

The user must be able to correct one field without re-uploading the document.

## Reconciliation rules
C3 cannot be granted if any model-material field is `missing`, `needs_confirmation`, or `conflict`.

After confirmation/correction:
- numeric values must pass domain validation;
- rate basis must be explicit;
- remaining term must be internally plausible;
- modality/system combination must be supported by the selected model;
- cutoff date cannot be nonsensical/future relative to ingestion context without warning;
- payment decomposition may differ from modeled financial payment because of insurance/fees; difference is evidence, not automatic error.

## Conflict examples
- statement says UVR but user declared pesos;
- two pages show materially different outstanding balances without clear period/context;
- rate label is ambiguous between nominal/effective/monthly/annual;
- remaining installments inconsistent with amortization table section;
- statement date and user-reported balance represent different periods.

Conflict resolution requires either:
- selecting the correct source/field with explanation;
- user correction backed by the document;
- second document;
- professional/manual review.

## Promotion logic

### Snapshot C3
All snapshot-material fields confirmed/reconciled.

### Scenario C3
Snapshot C3 + all selected calculation-model material inputs verified/reconciled.

### Partial verification
Field-level C3 is allowed while the result stays C1/C2.
Example: balance and modality verified, rate missing -> snapshot may show verified facts, amortization scenario remains C1/C2 depending on other inputs.

## Downgrade logic
A C3 result downgrades when:
- user edits a verified material field;
- newer document conflicts;
- source becomes too stale for a time-sensitive recommendation;
- calculation model changes and the prior evidence does not support it.

## Privacy/logging
Never place in generic analytics:
- raw document bytes;
- obligation numbers;
- names/IDs;
- balances/rates;
- OCR text;
- file names if they may contain PII.

Generic analytics may receive:
- document_class;
- upload_success/failure category;
- extraction_field_count;
- fields_missing_count;
- conflict_count;
- precision transition category.

## Production security gate
Before real document ingestion ships:
- malware/content-type validation;
- encrypted storage and least-privilege access;
- retention/deletion policy;
- processor/subprocessor review;
- international data-transfer review where applicable;
- audit logging for document access;
- signed/short-lived file access URLs;
- no public buckets;
- secrets excluded from client bundles;
- incident response path.

## MVP prototype boundary
The first UI prototype may simulate extracted values after the user selects a local file, but it must say `Demostración / extracción simulada` and must not upload or persist the file. This is preferable to wiring a third-party OCR provider before privacy/security architecture is approved.
