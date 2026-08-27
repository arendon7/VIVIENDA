import { describe, expect, it } from "vitest";
import {
  STATEMENT_GUIDED_MAX_FILE_BYTES,
  evaluateStatementGuidedIntake,
  type StatementGuidedInput,
} from "./evaluator";

function completeInput(overrides: Partial<StatementGuidedInput> = {}): StatementGuidedInput {
  return {
    asOfDate: "2026-08-27",
    localStatement: {
      mimeType: "application/pdf",
      byteSize: 2_000_000,
    },
    fields: {
      institutionName: "Entidad A",
      productType: "mortgage_housing",
      cutoffDate: "2026-08-15",
      modality: "pesos",
      principalBalance: 180_000_000,
      currentTotalPayment: 2_100_000,
      annualEffectiveRate: 0.12,
      remainingInstallments: 204,
      amortizationSystem: "constant_payment_pesos",
      monthlyInsuranceOrCosts: 170_000,
    },
    ...overrides,
  };
}

describe("Statement-Guided Mortgage Twin v0.20", () => {
  it("keeps a complete local guided snapshot at C1", () => {
    const result = evaluateStatementGuidedIntake(completeInput());

    expect(result.precision).toBe("C1");
    expect(result.localReferenceReadiness).toBe("local_statement_selected");
    expect(result.snapshotReadiness).toBe("snapshot_ready");
    expect(result.snapshot?.precision).toBe("C1");
  });

  it("never labels local guided fields as document extracted", () => {
    const result = evaluateStatementGuidedIntake(completeInput());
    const provenance = result.snapshot?.provenanceByField.principalBalance;

    expect(provenance).toEqual({
      sourceType: "user_declared",
      acquisitionMethod: "user_transcribed_from_local_statement",
      documentClass: "housing_financing_statement",
      documentReadByPlatform: false,
      userConfirmed: true,
    });
  });

  it("does not put a local filename in the canonical input or snapshot contract", () => {
    const result = evaluateStatementGuidedIntake(completeInput());

    expect(result.snapshot).not.toHaveProperty("fileName");
    expect(result.snapshot).not.toHaveProperty("documentName");
    expect(JSON.stringify(result.snapshot)).not.toContain("extracto");
  });

  it("requires a local statement reference for guided snapshot readiness", () => {
    const input = completeInput();
    delete input.localStatement;
    const result = evaluateStatementGuidedIntake(input);

    expect(result.localReferenceReadiness).toBe("no_local_statement");
    expect(result.snapshotReadiness).toBe("incomplete");
    expect(result.issues).toContainEqual({
      code: "local_statement_required",
      field: "localStatement",
      blocks: "local_reference",
    });
  });

  it("rejects a non-allowlisted local MIME type", () => {
    const result = evaluateStatementGuidedIntake(
      completeInput({ localStatement: { mimeType: "application/zip", byteSize: 1000 } }),
    );

    expect(result.localReferenceReadiness).toBe("local_statement_rejected");
    expect(result.snapshotReadiness).toBe("incomplete");
    expect(result.issues.some((item) => item.code === "unsupported_local_file_type")).toBe(true);
  });

  it("rejects a local reference larger than 15 MiB", () => {
    const result = evaluateStatementGuidedIntake(
      completeInput({
        localStatement: {
          mimeType: "application/pdf",
          byteSize: STATEMENT_GUIDED_MAX_FILE_BYTES + 1,
        },
      }),
    );

    expect(result.localReferenceReadiness).toBe("local_statement_rejected");
    expect(result.issues.some((item) => item.code === "local_file_too_large")).toBe(true);
  });

  it("builds a snapshot with only snapshot-material fields even when decision-model fields are missing", () => {
    const input = completeInput();
    delete input.fields.annualEffectiveRate;
    delete input.fields.remainingInstallments;
    delete input.fields.amortizationSystem;

    const result = evaluateStatementGuidedIntake(input);

    expect(result.snapshotReadiness).toBe("snapshot_ready");
    expect(result.modelReadiness).toBe("needs_data");
    expect(result.snapshot?.principalBalance).toBe(180_000_000);
    expect(result.constantPaymentPesosModelInput).toBeNull();
  });

  it("blocks the snapshot when product type is unknown", () => {
    const input = completeInput();
    input.fields.productType = "unknown";
    const result = evaluateStatementGuidedIntake(input);

    expect(result.snapshotReadiness).toBe("incomplete");
    expect(result.missingSnapshotFields).toContain("productType");
  });

  it("blocks the snapshot when modality is unknown", () => {
    const input = completeInput();
    input.fields.modality = "unknown";
    const result = evaluateStatementGuidedIntake(input);

    expect(result.snapshotReadiness).toBe("incomplete");
    expect(result.missingSnapshotFields).toContain("modality");
  });

  it("blocks a non-positive balance", () => {
    const input = completeInput();
    input.fields.principalBalance = 0;
    const result = evaluateStatementGuidedIntake(input);

    expect(result.snapshotReadiness).toBe("incomplete");
    expect(result.issues.some((item) => item.code === "principal_balance_invalid")).toBe(true);
  });

  it("blocks an invalid cutoff date", () => {
    const input = completeInput();
    input.fields.cutoffDate = "2026-02-31";
    const result = evaluateStatementGuidedIntake(input);

    expect(result.snapshotReadiness).toBe("incomplete");
    expect(result.issues.some((item) => item.code === "cutoff_date_invalid")).toBe(true);
  });

  it("blocks a cutoff date after the explicit as-of date", () => {
    const input = completeInput();
    input.fields.cutoffDate = "2026-08-28";
    const result = evaluateStatementGuidedIntake(input);

    expect(result.snapshotReadiness).toBe("incomplete");
    expect(result.issues.some((item) => item.code === "cutoff_date_in_future")).toBe(true);
  });

  it("derives statement age without inventing a universal stale threshold", () => {
    const result = evaluateStatementGuidedIntake(completeInput());

    expect(result.snapshot?.statementAgeDays).toBe(12);
    expect(result.issues.map((item) => item.code).join(" ")).not.toContain("stale");
  });

  it("creates the existing constant-payment-pesos model input only when all required fields pass", () => {
    const result = evaluateStatementGuidedIntake(completeInput());

    expect(result.modelReadiness).toBe("ready_for_constant_payment_pesos_model");
    expect(result.constantPaymentPesosModelInput).toEqual({
      precision: "C1",
      principal: 180_000_000,
      annualEffectiveRate: 0.12,
      remainingMonths: 204,
      source: "statement_guided_user_declared",
    });
  });

  it("does not manufacture an EA rate when it is missing", () => {
    const input = completeInput();
    delete input.fields.annualEffectiveRate;
    const result = evaluateStatementGuidedIntake(input);

    expect(result.modelReadiness).toBe("needs_data");
    expect(result.constantPaymentPesosModelInput).toBeNull();
    expect(result.missingModelFields).toContain("annualEffectiveRate");
  });

  it("does not pass a fractional remaining-installment count", () => {
    const input = completeInput();
    input.fields.remainingInstallments = 203.5;
    const result = evaluateStatementGuidedIntake(input);

    expect(result.modelReadiness).toBe("needs_data");
    expect(result.issues.some((item) => item.code === "remaining_installments_invalid")).toBe(true);
  });

  it("does not apply the mortgage constant-payment model to housing leasing", () => {
    const input = completeInput();
    input.fields.productType = "housing_leasing";
    const result = evaluateStatementGuidedIntake(input);

    expect(result.snapshotReadiness).toBe("snapshot_ready");
    expect(result.modelReadiness).toBe("not_applicable");
    expect(result.constantPaymentPesosModelInput).toBeNull();
    expect(result.issues.some((item) => item.code === "mortgage_model_not_applicable_to_leasing")).toBe(true);
  });

  it("does not apply the pesos model to a UVR mortgage", () => {
    const input = completeInput();
    input.fields.modality = "uvr";
    const result = evaluateStatementGuidedIntake(input);

    expect(result.snapshotReadiness).toBe("snapshot_ready");
    expect(result.modelReadiness).toBe("not_applicable");
    expect(result.constantPaymentPesosModelInput).toBeNull();
    expect(result.issues.some((item) => item.code === "pesos_model_not_applicable_to_uvr")).toBe(true);
  });

  it("does not apply the model to an unsupported amortization system", () => {
    const input = completeInput();
    input.fields.amortizationSystem = "other";
    const result = evaluateStatementGuidedIntake(input);

    expect(result.modelReadiness).toBe("needs_data");
    expect(result.issues.some((item) => item.code === "unsupported_amortization_system")).toBe(true);
  });

  it("rejects an invalid internal as-of date instead of silently evaluating freshness", () => {
    expect(() =>
      evaluateStatementGuidedIntake({
        ...completeInput(),
        asOfDate: "not-a-date",
      }),
    ).toThrow("valid ISO asOfDate");
  });

  it("keeps the truth-boundary notices explicit", () => {
    const result = evaluateStatementGuidedIntake(completeInput());
    const notices = result.notices.join(" ").toLowerCase();

    expect(notices).toContain("no leyó ni verificó");
    expect(notices).toContain("siguen siendo c1");
    expect(notices).toContain("c3 requiere evidencia realmente derivada");
  });
});
