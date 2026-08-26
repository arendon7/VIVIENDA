export type EvidenceMode = "simulated" | "document_derived";

export type VerificationFieldStatus =
  | "extracted_high_confidence"
  | "needs_confirmation"
  | "user_corrected"
  | "missing"
  | "conflict";

export type VerificationField = {
  key: string;
  value: string;
  material: boolean;
  status: VerificationFieldStatus;
  confirmed: boolean;
};

export type VerificationBlocker =
  | { code: "document_not_selected" }
  | { code: "simulated_evidence" }
  | { code: "material_missing"; key: string }
  | { code: "material_conflict"; key: string }
  | { code: "material_unconfirmed"; key: string };

export type VerificationAssessment = {
  level: "C2" | "C3";
  reconciliationComplete: boolean;
  readyForC3: boolean;
  confirmedMaterialCount: number;
  totalMaterialCount: number;
  blockers: VerificationBlocker[];
};

export function assessDocumentVerification({
  documentSelected,
  evidenceMode,
  fields,
}: {
  documentSelected: boolean;
  evidenceMode: EvidenceMode;
  fields: VerificationField[];
}): VerificationAssessment {
  const blockers: VerificationBlocker[] = [];
  const materialFields = fields.filter((field) => field.material);

  if (!documentSelected) blockers.push({ code: "document_not_selected" });
  if (evidenceMode !== "document_derived") blockers.push({ code: "simulated_evidence" });

  for (const field of materialFields) {
    if (field.status === "missing" || field.value.trim().length === 0) {
      blockers.push({ code: "material_missing", key: field.key });
      continue;
    }

    if (field.status === "conflict") {
      blockers.push({ code: "material_conflict", key: field.key });
      continue;
    }

    if (!field.confirmed) {
      blockers.push({ code: "material_unconfirmed", key: field.key });
    }
  }

  const reconciliationComplete =
    documentSelected &&
    materialFields.every(
      (field) =>
        field.status !== "missing" &&
        field.status !== "conflict" &&
        field.value.trim().length > 0 &&
        field.confirmed,
    );

  const readyForC3 =
    reconciliationComplete &&
    evidenceMode === "document_derived";

  return {
    level: readyForC3 ? "C3" : "C2",
    reconciliationComplete,
    readyForC3,
    confirmedMaterialCount: materialFields.filter((field) => field.confirmed).length,
    totalMaterialCount: materialFields.length,
    blockers,
  };
}

export type MortgageTwinData = {
  balance: string;
  cutoff: string;
  modality: string;
  rate: string;
  remaining: string;
  system: string;
  insurance?: string;
};

export function buildMortgageTwinData(fields: VerificationField[]): MortgageTwinData {
  const byKey = new Map(fields.map((field) => [field.key, field.value.trim()]));
  const requiredKeys = ["balance", "cutoff", "modality", "rate", "remaining", "system"] as const;

  for (const key of requiredKeys) {
    if (!byKey.get(key)) {
      throw new Error(`Missing material Mortgage Twin field: ${key}`);
    }
  }

  return {
    balance: byKey.get("balance")!,
    cutoff: byKey.get("cutoff")!,
    modality: byKey.get("modality")!,
    rate: byKey.get("rate")!,
    remaining: byKey.get("remaining")!,
    system: byKey.get("system")!,
    insurance: byKey.get("insurance") || undefined,
  };
}
