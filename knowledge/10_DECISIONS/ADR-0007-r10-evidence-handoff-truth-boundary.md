# ADR-0007 — R10 evidence handoff truth boundary

Date: 2026-09-02
Status: **Accepted for Beta 0.22 consolidation**
Applies to: `/ayuda`, `/revisar-diferencia`, `/verificar`, R10 procedural-priority handoffs
Supersedes only the conflicting CTA clauses in the historical v0.14/v0.15 UX specifications.

## Context

The v0.14 Payment Pressure and v0.15 Inconsistency Reconciliation UX specifications routed procedural-priority R10 users to `/verificar` with copy such as `Revisar el documento que recibí` or `Revisar el documento judicial`.

The product later evolved. `/verificar` is now the **Statement-Guided Mortgage Twin** route. It accepts a mortgage/leasing statement as a local reference, does not upload/read/process/verify the file, and asks the user to transcribe housing-loan fields manually. It is not a judicial-document intake and does not support court orders, payment orders, embargo notices, auction notices or other procedural documents.

Keeping the old R10 handoff would therefore create a product-truth mismatch precisely in a high-stakes legal context.

## Decision

For Beta 0.22:

1. R10 continues to dominate ordinary optimization and R7 when a user reports a judicial process or advanced judicial action.
2. R10 does **not** link a judicial document to `/verificar`.
3. The primary R10 action is `Ver qué documentos preparar`, anchored to the contextual evidence checklist already rendered on the current surface.
4. The result continues to state that real documents and professional review are required.
5. The product does not calculate procedural deadlines, generate a defense strategy, claim representation, or pretend to review the judicial document.
6. `/verificar` remains reserved for the Statement-Guided Mortgage Twin until a separate judicial-document capability is explicitly designed, legally reviewed and implemented.
7. R7 Mortgage Audit may expose `/verificar` only with truthful wording such as `Extracto como guía`; its evidence-preparation CTA must stay within the R7 evidence checklist rather than implying general document verification.

## Historical-spec interpretation

The following historical clauses are preserved as provenance but are no longer authoritative for the Beta 0.22 consolidated product:

- `PAYMENT-PRESSURE-UX-SPEC-V0.14.md` — R10 CTA to `/verificar`;
- `INCONSISTENCY-RECONCILIATION-UX-SPEC-V0.15.md` — R10 CTA/judicial boundary to `/verificar`;
- corresponding historical E2E acceptance wording that assumes that handoff.

When historical versioned documents conflict with this ADR for the consolidated Beta, **ADR-0007 wins**.

## Acceptance criteria

- R10 remains the primary route for declared judicial urgency.
- no R10 CTA sends a judicial document to `/verificar`;
- R10 exposes a contextual evidence-preparation action;
- no deadline/defense/representation is fabricated;
- `/verificar` continues to state that the statement file remains local and does not grant C3;
- desktop and mobile E2E remain green;
- R7 and R10 remain distinct.

## Future capability

A future judicial-document intake must be a separately scoped capability with, at minimum:

- supported document taxonomy;
- legal/professional review boundary;
- privacy and evidence-handling contract;
- upload/storage/OCR truth contract if those providers are activated;
- deadline-calculation policy, if ever supported;
- explicit separation between orientation, professional review and representation.

Until then, evidence preparation is the safe and truthful handoff.
