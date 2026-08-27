export const STATEMENT_GUIDED_MAX_FILE_BYTES = 15 * 1024 * 1024;

export const STATEMENT_GUIDED_ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type StatementGuidedAcceptedMimeType = typeof STATEMENT_GUIDED_ACCEPTED_MIME_TYPES[number];

export type StatementGuidedProductType =
  | "mortgage_housing"
  | "housing_leasing"
  | "unknown";

export type StatementGuidedModality = "pesos" | "uvr" | "unknown";

export type StatementGuidedAmortizationSystem =
  | "constant_payment_pesos"
  | "other"
  | "unknown";

export type LocalStatementFileDescriptor = {
  mimeType: string;
  byteSize: number;
};

export type StatementGuidedFields = {
  productType?: StatementGuidedProductType;
  cutoffDate?: string;
  modality?: StatementGuidedModality;
  principalBalance?: number;
  annualEffectiveRate?: number;
  remainingInstallments?: number;
  amortizationSystem?: StatementGuidedAmortizationSystem;
  institutionName?: string;
  currentTotalPayment?: number;
  monthlyInsuranceOrCosts?: number;
};

export type StatementGuidedInput = {
  asOfDate: string;
  localStatement?: LocalStatementFileDescriptor;
  fields: StatementGuidedFields;
};

export type StatementGuidedFieldKey = keyof StatementGuidedFields;

export type StatementGuidedFieldProvenance = {
  sourceType: "user_declared";
  acquisitionMethod: "user_transcribed_from_local_statement";
  documentClass: "housing_financing_statement";
  documentReadByPlatform: false;
  userConfirmed: true;
};

export type StatementGuidedIssueCode =
  | "local_statement_required"
  | "unsupported_local_file_type"
  | "local_file_too_large"
  | "product_type_missing"
  | "cutoff_date_missing"
  | "cutoff_date_invalid"
  | "cutoff_date_in_future"
  | "modality_missing"
  | "principal_balance_missing"
  | "principal_balance_invalid"
  | "annual_effective_rate_missing"
  | "annual_effective_rate_invalid"
  | "remaining_installments_missing"
  | "remaining_installments_invalid"
  | "amortization_system_missing"
  | "mortgage_model_not_applicable_to_leasing"
  | "pesos_model_not_applicable_to_uvr"
  | "unsupported_amortization_system";

export type StatementGuidedIssue = {
  code: StatementGuidedIssueCode;
  field: StatementGuidedFieldKey | "localStatement";
  blocks: "local_reference" | "snapshot" | "model";
};

export type LocalReferenceReadiness =
  | "no_local_statement"
  | "local_statement_selected"
  | "local_statement_rejected";

export type StatementSnapshotReadiness = "incomplete" | "snapshot_ready";

export type StatementModelReadiness =
  | "not_applicable"
  | "needs_data"
  | "ready_for_constant_payment_pesos_model";

export type StatementGuidedSnapshot = {
  precision: "C1";
  productType: Exclude<StatementGuidedProductType, "unknown">;
  cutoffDate: string;
  modality: Exclude<StatementGuidedModality, "unknown">;
  principalBalance: number;
  statementAgeDays: number;
  provenanceByField: Partial<Record<StatementGuidedFieldKey, StatementGuidedFieldProvenance>>;
  institutionName?: string;
  currentTotalPayment?: number;
  annualEffectiveRate?: number;
  remainingInstallments?: number;
  amortizationSystem?: StatementGuidedAmortizationSystem;
  monthlyInsuranceOrCosts?: number;
};

export type ConstantPaymentPesosModelInput = {
  precision: "C1";
  principal: number;
  annualEffectiveRate: number;
  remainingMonths: number;
  source: "statement_guided_user_declared";
};

export type StatementGuidedAssessment = {
  precision: "C1";
  localReferenceReadiness: LocalReferenceReadiness;
  snapshotReadiness: StatementSnapshotReadiness;
  modelReadiness: StatementModelReadiness;
  snapshot: StatementGuidedSnapshot | null;
  constantPaymentPesosModelInput: ConstantPaymentPesosModelInput | null;
  issues: StatementGuidedIssue[];
  missingSnapshotFields: StatementGuidedFieldKey[];
  missingModelFields: StatementGuidedFieldKey[];
  notices: string[];
};

const ACCEPTED_MIME_TYPES = new Set<string>(STATEMENT_GUIDED_ACCEPTED_MIME_TYPES);
const DAY_MS = 24 * 60 * 60 * 1000;

const provenance: StatementGuidedFieldProvenance = {
  sourceType: "user_declared",
  acquisitionMethod: "user_transcribed_from_local_statement",
  documentClass: "housing_financing_statement",
  documentReadByPlatform: false,
  userConfirmed: true,
};

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed)) return false;
  return new Date(parsed).toISOString().slice(0, 10) === value;
}

function requireAsOfDate(value: string): number {
  if (!isIsoDate(value)) {
    throw new Error("Statement guided intake requires a valid ISO asOfDate.");
  }
  return Date.parse(`${value}T00:00:00Z`);
}

function validPositiveNumber(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

function validNonNegativeNumber(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value >= 0;
}

function issue(
  code: StatementGuidedIssueCode,
  field: StatementGuidedIssue["field"],
  blocks: StatementGuidedIssue["blocks"],
): StatementGuidedIssue {
  return { code, field, blocks };
}

function hasBlockingIssue(issues: StatementGuidedIssue[], target: StatementGuidedIssue["blocks"]): boolean {
  return issues.some((item) => item.blocks === target);
}

function buildProvenance(fields: StatementGuidedFields): Partial<Record<StatementGuidedFieldKey, StatementGuidedFieldProvenance>> {
  const result: Partial<Record<StatementGuidedFieldKey, StatementGuidedFieldProvenance>> = {};
  const keys = Object.keys(fields) as StatementGuidedFieldKey[];

  for (const key of keys) {
    const value = fields[key];
    const supplied = typeof value === "string" ? value.trim().length > 0 : value !== undefined;
    if (supplied) result[key] = provenance;
  }

  return result;
}

export function evaluateStatementGuidedIntake(input: StatementGuidedInput): StatementGuidedAssessment {
  const asOfMs = requireAsOfDate(input.asOfDate);
  const fields = input.fields;
  const issues: StatementGuidedIssue[] = [];
  const missingSnapshotFields: StatementGuidedFieldKey[] = [];
  const missingModelFields: StatementGuidedFieldKey[] = [];

  let localReferenceReadiness: LocalReferenceReadiness = "no_local_statement";
  if (!input.localStatement) {
    issues.push(issue("local_statement_required", "localStatement", "local_reference"));
  } else if (!ACCEPTED_MIME_TYPES.has(input.localStatement.mimeType)) {
    localReferenceReadiness = "local_statement_rejected";
    issues.push(issue("unsupported_local_file_type", "localStatement", "local_reference"));
  } else if (
    !Number.isFinite(input.localStatement.byteSize) ||
    input.localStatement.byteSize <= 0 ||
    input.localStatement.byteSize > STATEMENT_GUIDED_MAX_FILE_BYTES
  ) {
    localReferenceReadiness = "local_statement_rejected";
    issues.push(issue("local_file_too_large", "localStatement", "local_reference"));
  } else {
    localReferenceReadiness = "local_statement_selected";
  }

  if (!fields.productType || fields.productType === "unknown") {
    missingSnapshotFields.push("productType");
    issues.push(issue("product_type_missing", "productType", "snapshot"));
  }

  let cutoffDateValid = false;
  let statementAgeDays = 0;
  if (!fields.cutoffDate || fields.cutoffDate.trim() === "") {
    missingSnapshotFields.push("cutoffDate");
    issues.push(issue("cutoff_date_missing", "cutoffDate", "snapshot"));
  } else if (!isIsoDate(fields.cutoffDate)) {
    issues.push(issue("cutoff_date_invalid", "cutoffDate", "snapshot"));
  } else {
    const cutoffMs = Date.parse(`${fields.cutoffDate}T00:00:00Z`);
    if (cutoffMs > asOfMs) {
      issues.push(issue("cutoff_date_in_future", "cutoffDate", "snapshot"));
    } else {
      cutoffDateValid = true;
      statementAgeDays = Math.floor((asOfMs - cutoffMs) / DAY_MS);
    }
  }

  if (!fields.modality || fields.modality === "unknown") {
    missingSnapshotFields.push("modality");
    issues.push(issue("modality_missing", "modality", "snapshot"));
  }

  if (fields.principalBalance === undefined) {
    missingSnapshotFields.push("principalBalance");
    issues.push(issue("principal_balance_missing", "principalBalance", "snapshot"));
  } else if (!validPositiveNumber(fields.principalBalance)) {
    issues.push(issue("principal_balance_invalid", "principalBalance", "snapshot"));
  }

  if (fields.currentTotalPayment !== undefined && !validPositiveNumber(fields.currentTotalPayment)) {
    issues.push(issue("principal_balance_invalid", "currentTotalPayment", "model"));
  }

  if (fields.monthlyInsuranceOrCosts !== undefined && !validNonNegativeNumber(fields.monthlyInsuranceOrCosts)) {
    issues.push(issue("principal_balance_invalid", "monthlyInsuranceOrCosts", "model"));
  }

  const localReferenceUsable = localReferenceReadiness === "local_statement_selected";
  const snapshotFieldsValid =
    fields.productType !== undefined && fields.productType !== "unknown" &&
    fields.modality !== undefined && fields.modality !== "unknown" &&
    cutoffDateValid &&
    validPositiveNumber(fields.principalBalance);

  const snapshotReadiness: StatementSnapshotReadiness =
    localReferenceUsable && snapshotFieldsValid && !hasBlockingIssue(issues, "snapshot")
      ? "snapshot_ready"
      : "incomplete";

  let modelReadiness: StatementModelReadiness = "needs_data";

  if (fields.productType === "housing_leasing") {
    modelReadiness = "not_applicable";
    issues.push(issue("mortgage_model_not_applicable_to_leasing", "productType", "model"));
  } else if (fields.modality === "uvr") {
    modelReadiness = "not_applicable";
    issues.push(issue("pesos_model_not_applicable_to_uvr", "modality", "model"));
  } else if (snapshotReadiness === "snapshot_ready") {
    if (fields.annualEffectiveRate === undefined) {
      missingModelFields.push("annualEffectiveRate");
      issues.push(issue("annual_effective_rate_missing", "annualEffectiveRate", "model"));
    } else if (
      !Number.isFinite(fields.annualEffectiveRate) ||
      fields.annualEffectiveRate < 0 ||
      fields.annualEffectiveRate >= 1
    ) {
      issues.push(issue("annual_effective_rate_invalid", "annualEffectiveRate", "model"));
    }

    if (fields.remainingInstallments === undefined) {
      missingModelFields.push("remainingInstallments");
      issues.push(issue("remaining_installments_missing", "remainingInstallments", "model"));
    } else if (!Number.isInteger(fields.remainingInstallments) || fields.remainingInstallments <= 0) {
      issues.push(issue("remaining_installments_invalid", "remainingInstallments", "model"));
    }

    if (!fields.amortizationSystem || fields.amortizationSystem === "unknown") {
      missingModelFields.push("amortizationSystem");
      issues.push(issue("amortization_system_missing", "amortizationSystem", "model"));
    } else if (fields.amortizationSystem !== "constant_payment_pesos") {
      issues.push(issue("unsupported_amortization_system", "amortizationSystem", "model"));
    }

    const modelFieldsValid =
      fields.productType === "mortgage_housing" &&
      fields.modality === "pesos" &&
      fields.annualEffectiveRate !== undefined &&
      Number.isFinite(fields.annualEffectiveRate) &&
      fields.annualEffectiveRate >= 0 &&
      fields.annualEffectiveRate < 1 &&
      fields.remainingInstallments !== undefined &&
      Number.isInteger(fields.remainingInstallments) &&
      fields.remainingInstallments > 0 &&
      fields.amortizationSystem === "constant_payment_pesos";

    if (modelFieldsValid && !hasBlockingIssue(issues, "model")) {
      modelReadiness = "ready_for_constant_payment_pesos_model";
    }
  }

  let snapshot: StatementGuidedSnapshot | null = null;
  if (
    snapshotReadiness === "snapshot_ready" &&
    fields.productType && fields.productType !== "unknown" &&
    fields.modality && fields.modality !== "unknown" &&
    fields.cutoffDate &&
    fields.principalBalance !== undefined
  ) {
    snapshot = {
      precision: "C1",
      productType: fields.productType,
      cutoffDate: fields.cutoffDate,
      modality: fields.modality,
      principalBalance: fields.principalBalance,
      statementAgeDays,
      provenanceByField: buildProvenance(fields),
      ...(fields.institutionName?.trim() ? { institutionName: fields.institutionName.trim() } : {}),
      ...(validPositiveNumber(fields.currentTotalPayment) ? { currentTotalPayment: fields.currentTotalPayment } : {}),
      ...(fields.annualEffectiveRate !== undefined && Number.isFinite(fields.annualEffectiveRate) && fields.annualEffectiveRate >= 0 && fields.annualEffectiveRate < 1
        ? { annualEffectiveRate: fields.annualEffectiveRate }
        : {}),
      ...(fields.remainingInstallments !== undefined && Number.isInteger(fields.remainingInstallments) && fields.remainingInstallments > 0
        ? { remainingInstallments: fields.remainingInstallments }
        : {}),
      ...(fields.amortizationSystem ? { amortizationSystem: fields.amortizationSystem } : {}),
      ...(validNonNegativeNumber(fields.monthlyInsuranceOrCosts) ? { monthlyInsuranceOrCosts: fields.monthlyInsuranceOrCosts } : {}),
    };
  }

  const constantPaymentPesosModelInput =
    modelReadiness === "ready_for_constant_payment_pesos_model" &&
    snapshot &&
    snapshot.annualEffectiveRate !== undefined &&
    snapshot.remainingInstallments !== undefined
      ? {
          precision: "C1" as const,
          principal: snapshot.principalBalance,
          annualEffectiveRate: snapshot.annualEffectiveRate,
          remainingMonths: snapshot.remainingInstallments,
          source: "statement_guided_user_declared" as const,
        }
      : null;

  return {
    precision: "C1",
    localReferenceReadiness,
    snapshotReadiness,
    modelReadiness,
    snapshot,
    constantPaymentPesosModelInput,
    issues,
    missingSnapshotFields,
    missingModelFields,
    notices: [
      "El archivo local guía la transcripción, pero VIVIENDA no leyó ni verificó su contenido.",
      "Los campos del snapshot siguen siendo C1; un cálculo determinístico posterior puede ser C2.",
      "C3 requiere evidencia realmente derivada del documento y reconciliación según el contrato de verificación.",
    ],
  };
}
