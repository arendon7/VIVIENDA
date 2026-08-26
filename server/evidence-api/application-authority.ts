import {
  PersistenceBoundaryError,
  type PrepareEvidenceUploadCommand,
} from "@/domain/persistence-boundary/contracts";
import type {
  CompletedEvidenceUpload,
  EvidenceDownloadGrant,
  PreparedEvidenceUpload,
} from "@/domain/storage-coordination/coordinator";
import type { EvidenceApiApplication } from "./http-boundary";

export type CanonicalEvidenceClassification = Pick<
  PrepareEvidenceUploadCommand,
  "legalDataCategory" | "securityTier"
>;

const CANONICAL_IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const CLASSIFICATION_BY_KIND: Record<PrepareEvidenceUploadCommand["kind"], CanonicalEvidenceClassification> = {
  statement: {
    legalDataCategory: "financial_credit_semiprivate",
    securityTier: "restricted",
  },
  contract: {
    legalDataCategory: "financial_credit_semiprivate",
    securityTier: "restricted",
  },
  bank_response: {
    legalDataCategory: "financial_credit_semiprivate",
    securityTier: "restricted",
  },
  filing_proof: {
    legalDataCategory: "private",
    securityTier: "restricted",
  },
  authority: {
    legalDataCategory: "private",
    securityTier: "highly_restricted",
  },
  court_document: {
    legalDataCategory: "private",
    securityTier: "highly_restricted",
  },
  other: {
    // Conservative operational default. Content inspection may later elevate the legal category;
    // the browser is never allowed to downgrade the security posture.
    legalDataCategory: "private",
    securityTier: "highly_restricted",
  },
};

export function canonicalClassificationForEvidenceKind(
  kind: PrepareEvidenceUploadCommand["kind"],
): CanonicalEvidenceClassification {
  return { ...CLASSIFICATION_BY_KIND[kind] };
}

export function assertCanonicalIdempotencyKey(value: string): void {
  if (!CANONICAL_IDEMPOTENCY_KEY.test(value)) {
    throw new PersistenceBoundaryError(
      "invalid_command",
      "Idempotency-Key debe usar una representación canónica de hasta 128 caracteres.",
    );
  }
}

/**
 * Server-side authority decorator.
 *
 * The HTTP body may carry legacy classification fields during v0.9, but they are not authoritative.
 * Every prepare operation is reclassified from the server-known evidence kind before it can reach
 * persistence. This prevents a browser from labelling an extract as non-personal/open.
 *
 * Complete operations also canonicalize the effective idempotency representation before it reaches
 * the persistence boundary, preventing whitespace/representation variants from creating divergent retries.
 */
export class ServerClassifiedEvidenceApplication implements EvidenceApiApplication {
  constructor(private readonly inner: EvidenceApiApplication) {}

  prepareUpload(caseId: string, command: PrepareEvidenceUploadCommand): Promise<PreparedEvidenceUpload> {
    const classification = canonicalClassificationForEvidenceKind(command.kind);
    return this.inner.prepareUpload(caseId, {
      kind: command.kind,
      ...classification,
    });
  }

  completeUpload(input: Parameters<EvidenceApiApplication["completeUpload"]>[0]): Promise<CompletedEvidenceUpload> {
    assertCanonicalIdempotencyKey(input.idempotencyKey);
    return this.inner.completeUpload(input);
  }

  createDownloadGrant(
    input: Parameters<EvidenceApiApplication["createDownloadGrant"]>[0],
  ): Promise<EvidenceDownloadGrant> {
    return this.inner.createDownloadGrant(input);
  }
}
