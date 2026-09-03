import { describe, expect, it } from "vitest";
import {
  assessDocumentVerification,
  buildMortgageTwinData,
  type VerificationField,
} from "./reconciliation";

const materialFields: VerificationField[] = [
  { key: "balance", value: "180000000", material: true, status: "needs_confirmation", confirmed: true },
  { key: "cutoff", value: "2026-08-15", material: true, status: "needs_confirmation", confirmed: true },
  { key: "modality", value: "Pesos", material: true, status: "needs_confirmation", confirmed: true },
  { key: "rate", value: "12 % EA", material: true, status: "needs_confirmation", confirmed: true },
  { key: "remaining", value: "204", material: true, status: "needs_confirmation", confirmed: true },
  { key: "system", value: "Cuota constante en pesos", material: true, status: "needs_confirmation", confirmed: true },
  { key: "insurance", value: "", material: false, status: "missing", confirmed: false },
];

describe("document verification reconciliation", () => {
  it("does not grant C3 to simulated evidence even when every material value is confirmed", () => {
    const result = assessDocumentVerification({
      documentSelected: true,
      evidenceMode: "simulated",
      fields: materialFields,
    });

    expect(result.reconciliationComplete).toBe(true);
    expect(result.readyForC3).toBe(false);
    expect(result.level).toBe("C2");
    expect(result.blockers).toContainEqual({ code: "simulated_evidence" });
  });

  it("grants C3 only when material fields are confirmed and document-derived", () => {
    const result = assessDocumentVerification({
      documentSelected: true,
      evidenceMode: "document_derived",
      fields: materialFields,
    });

    expect(result.reconciliationComplete).toBe(true);
    expect(result.readyForC3).toBe(true);
    expect(result.level).toBe("C3");
    expect(result.blockers).toEqual([]);
  });

  it("blocks a conflicting material field regardless of document-derived provenance", () => {
    const fields = materialFields.map((field) =>
      field.key === "rate" ? { ...field, status: "conflict" as const } : field,
    );

    const result = assessDocumentVerification({
      documentSelected: true,
      evidenceMode: "document_derived",
      fields,
    });

    expect(result.level).toBe("C2");
    expect(result.blockers).toContainEqual({ code: "material_conflict", key: "rate" });
  });

  it("does not let a high-confidence extraction bypass user confirmation", () => {
    const fields = materialFields.map((field) =>
      field.key === "balance"
        ? { ...field, status: "extracted_high_confidence" as const, confirmed: false }
        : field,
    );

    const result = assessDocumentVerification({
      documentSelected: true,
      evidenceMode: "document_derived",
      fields,
    });

    expect(result.level).toBe("C2");
    expect(result.blockers).toContainEqual({ code: "material_unconfirmed", key: "balance" });
  });

  it("allows non-material missing insurance without blocking C3", () => {
    const result = assessDocumentVerification({
      documentSelected: true,
      evidenceMode: "document_derived",
      fields: materialFields,
    });

    expect(result.readyForC3).toBe(true);
  });

  it("builds the canonical Mortgage Twin payload without inventing missing optional values", () => {
    expect(buildMortgageTwinData(materialFields)).toEqual({
      balance: "180000000",
      cutoff: "2026-08-15",
      modality: "Pesos",
      rate: "12 % EA",
      remaining: "204",
      system: "Cuota constante en pesos",
    });
  });
});
