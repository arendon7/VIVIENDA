import { describe, expect, it } from "vitest";
import { MemoryCasePersistence } from "./memory-adapter";
import { CasePersistenceService } from "./service";
import {
  PersistenceBoundaryError,
  type AppendCaseEventCommand,
  type Clock,
  type IdGenerator,
  type Principal,
} from "./contracts";

class FakeClock implements Clock {
  constructor(public current = "2026-08-26T06:30:00.000Z") {}

  now() {
    return this.current;
  }

  advanceMinutes(minutes: number) {
    this.current = new Date(Date.parse(this.current) + minutes * 60 * 1000).toISOString();
  }
}

class FakeIds implements IdGenerator {
  private readonly counters = new Map<string, number>();

  next(prefix: "case" | "evt" | "auth" | "evd" | "upl" | "req") {
    const value = (this.counters.get(prefix) ?? 0) + 1;
    this.counters.set(prefix, value);
    return `${prefix}_${value.toString().padStart(4, "0")}`;
  }
}

const clientA: Principal = { kind: "client", subjectRef: "sub_client_a" };
const clientB: Principal = { kind: "client", subjectRef: "sub_client_b" };
const lawyer: Principal = { kind: "lawyer", subjectRef: "sub_lawyer_1" };
const admin: Principal = { kind: "admin", subjectRef: "sub_admin_1" };

function setup() {
  const store = new MemoryCasePersistence();
  const clock = new FakeClock();
  const ids = new FakeIds();
  const service = new CasePersistenceService(store, clock, ids);
  return { store, clock, ids, service };
}

async function createCase(service: CasePersistenceService, principal: Principal = clientA, idempotencyKey = "create-1") {
  return service.createCase(principal, {
    idempotencyKey,
    routeCode: "R1_PREPAGO_PLAZO",
    routeStatus: "eligible_now",
    precision: "C2",
    track: "self_service",
  });
}

async function grantAuthorization(service: CasePersistenceService, caseId: string, expectedVersion = 1) {
  return service.grantDataAuthorization(clientA, caseId, expectedVersion, {
    idempotencyKey: "grant-auth-1",
    consentVersion: "privacy-v1",
    purposes: ["mortgage_analysis", "case_management"],
  });
}

async function finalizeStatement(service: CasePersistenceService, caseId: string, expectedVersion = 2) {
  const intent = await service.prepareEvidenceUpload(clientA, caseId, {
    kind: "statement",
    legalDataCategory: "financial_credit_semiprivate",
    securityTier: "restricted",
    displayName: "Juan-Perez-CC-123456789.pdf",
  });

  const result = await service.finalizeEvidenceUpload(clientA, caseId, {
    idempotencyKey: "finalize-statement-1",
    intentId: intent.intentId,
    expectedVersion,
    receipt: {
      evidenceId: intent.evidenceId,
      storageLocator: "obj_statement_0001",
      mimeType: "application/pdf",
      byteSize: 1_024,
      checksumSha256: "a".repeat(64),
      verifiedAt: "2026-08-26T06:31:00.000Z",
    },
  });

  return { intent, result };
}

describe("Persistence & Identity Boundary v0.6", () => {
  it("requires authentication and only lets the client create its own persisted case", async () => {
    const { service } = setup();

    await expect(createCase(service, { kind: "anonymous" })).rejects.toMatchObject({ code: "authentication_required" });
    await expect(createCase(service, admin)).rejects.toMatchObject({ code: "forbidden" });

    const created = await createCase(service);
    expect(created.kind).toBe("created");
    expect(created.model.caseId).toMatch(/^case_/);
    expect(created.model.projection.version).toBe(1);
    expect(created.model.journal[0]?.event.eventId).toMatch(/^evt_/);
    expect(created.model.journal[0]?.event.actor).toEqual({ kind: "client", actorId: "sub_client_a" });
    expect(created.model.journal[0]?.recordedBySubjectRef).toBe("sub_client_a");
  });

  it("makes create-case retries idempotent and rejects semantic reuse of the same key", async () => {
    const { service } = setup();
    const first = await createCase(service);
    const retry = await createCase(service);

    expect(retry.kind).toBe("duplicate");
    expect(retry.model.caseId).toBe(first.model.caseId);

    await expect(
      service.createCase(clientA, {
        idempotencyKey: "create-1",
        routeCode: "R2_PREPAGO_CUOTA",
        routeStatus: "candidate",
        precision: "C2",
        track: "self_service",
      }),
    ).rejects.toMatchObject({ code: "idempotency_conflict" });
  });

  it("prevents cross-client IDOR and requires explicit lawyer assignment", async () => {
    const { service } = setup();
    const created = await createCase(service);

    await expect(service.readCase(clientB, created.model.caseId)).rejects.toMatchObject({ code: "forbidden" });
    await expect(service.readCase(lawyer, created.model.caseId)).rejects.toMatchObject({ code: "forbidden" });

    await service.assignLawyer(admin, created.model.caseId, "sub_lawyer_1");
    const lawyerView = await service.readCase(lawyer, created.model.caseId);
    expect(lawyerView.caseId).toBe(created.model.caseId);
  });

  it("keeps service read and system-append scopes separate", async () => {
    const { service } = setup();
    const created = await createCase(service);
    const noScopes: Principal = { kind: "service", subjectRef: "svc_worker_1", scopes: [] };
    const readOnly: Principal = { kind: "service", subjectRef: "svc_worker_2", scopes: ["case:read"] };
    const writer: Principal = {
      kind: "service",
      subjectRef: "svc_worker_3",
      scopes: ["case:read", "case:append_system"],
    };

    await expect(service.readCase(noScopes, created.model.caseId)).rejects.toMatchObject({ code: "forbidden" });
    expect((await service.readCase(readOnly, created.model.caseId)).projection.version).toBe(1);

    const command: AppendCaseEventCommand = {
      type: "PROFESSIONAL_REVIEW_REQUESTED",
      idempotencyKey: "system-review-request",
      payload: { reason: "Ruta requiere revisión humana." },
    };
    await expect(service.appendEvent(readOnly, created.model.caseId, 1, command)).rejects.toMatchObject({ code: "forbidden" });

    const result = await service.appendEvent(writer, created.model.caseId, 1, command);
    expect(result.model.journal.at(-1)?.event.actor.kind).toBe("system");
    expect(result.model.journal.at(-1)?.recordedBySubjectRef).toBe("svc_worker_3");
  });

  it("derives actor server-side even when a malicious runtime object tries to inject one", async () => {
    const { service } = setup();
    const created = await createCase(service);

    const malicious = {
      type: "PROFESSIONAL_REVIEW_REQUESTED",
      idempotencyKey: "malicious-actor",
      actor: { kind: "lawyer", actorId: "sub_fake_lawyer" },
      recordedAt: "1999-01-01T00:00:00Z",
      payload: { reason: "Solicitar revisión." },
    } as unknown as AppendCaseEventCommand;

    const result = await service.appendEvent(clientA, created.model.caseId, 1, malicious);
    const persisted = result.model.journal.at(-1)!;
    expect(persisted.event.actor).toEqual({ kind: "client", actorId: "sub_client_a" });
    expect(persisted.event.recordedAt).toBe("2026-08-26T06:30:00.000Z");
  });

  it("does not let admin impersonate a lawyer for professional conclusions", async () => {
    const { service } = setup();
    const created = await createCase(service);
    await service.assignLawyer(admin, created.model.caseId, "sub_lawyer_1");

    await service.appendEvent(admin, created.model.caseId, 1, {
      type: "PROFESSIONAL_REVIEW_REQUESTED",
      idempotencyKey: "review-request-admin",
      payload: { reason: "Caso remitido a revisión." },
    });

    await expect(
      service.appendEvent(admin, created.model.caseId, 2, {
        type: "PROFESSIONAL_REVIEW_COMPLETED",
        idempotencyKey: "review-complete-admin",
        payload: { summary: "Conclusión jurídica." },
      }),
    ).rejects.toThrow(/solo un actor lawyer/i);

    const lawyerResult = await service.appendEvent(lawyer, created.model.caseId, 2, {
      type: "PROFESSIONAL_REVIEW_COMPLETED",
      idempotencyKey: "review-complete-lawyer",
      payload: { summary: "Conclusión jurídica profesional." },
    });
    expect(lawyerResult.model.projection.capabilities.professionalReviewCompleted).toBe(true);
  });

  it("uses strict idempotency for event retries and rejects incompatible reuse", async () => {
    const { service } = setup();
    const created = await createCase(service);
    const command: AppendCaseEventCommand = {
      type: "SERVICE_AGREEMENT_ACCEPTED",
      idempotencyKey: "service-accept-1",
      payload: { agreementVersion: "services-v1" },
    };

    const first = await service.appendEvent(clientA, created.model.caseId, 1, command);
    expect(first.kind).toBe("appended");

    const retry = await service.appendEvent(clientA, created.model.caseId, 1, command);
    expect(retry.kind).toBe("duplicate");
    expect(retry.model.projection.version).toBe(2);

    await expect(
      service.appendEvent(clientA, created.model.caseId, 2, {
        ...command,
        payload: { agreementVersion: "services-v2" },
      }),
    ).rejects.toMatchObject({ code: "idempotency_conflict" });
  });

  it("rechecks expectedVersion and uniqueness inside the persistence adapter", async () => {
    const { service, store } = setup();
    const created = await createCase(service);
    const snapshot = await store.loadCase(created.model.caseId);
    const first = snapshot!.journal[0]!;

    const forged = {
      ...first,
      semanticFingerprint: "forged-fingerprint",
      event: {
        ...first.event,
        eventId: "evt_manual_2",
        idempotencyKey: "manual-append",
        sequence: 2,
      },
    };

    await expect(
      store.appendJournalAtomic({ caseId: created.model.caseId, expectedVersion: 0, record: forged }),
    ).rejects.toMatchObject({ code: "version_conflict" });

    await expect(
      store.appendJournalAtomic({
        caseId: created.model.caseId,
        expectedVersion: 1,
        record: { ...forged, event: { ...forged.event, sequence: 1 } },
      }),
    ).rejects.toMatchObject({ code: "duplicate_sequence" });

    await expect(
      store.appendJournalAtomic({
        caseId: created.model.caseId,
        expectedVersion: 1,
        record: { ...forged, event: { ...forged.event, eventId: first.event.eventId, sequence: 2 } },
      }),
    ).rejects.toMatchObject({ code: "duplicate_event_id" });
  });

  it("returns defensive snapshots instead of mutable storage references", async () => {
    const { service, store } = setup();
    const created = await createCase(service);
    const snapshot = await store.loadCase(created.model.caseId);

    snapshot!.access.assignedLawyerSubjectRefs.push("sub_intruder");
    (snapshot!.journal[0]!.event.payload as { track: string }).track = "mutated";

    const reloaded = await store.loadCase(created.model.caseId);
    expect(reloaded!.access.assignedLawyerSubjectRefs).toEqual([]);
    expect((reloaded!.journal[0]!.event.payload as { track: string }).track).toBe("self_service");
  });

  it("requires active, purpose-bound data authorization before preparing evidence", async () => {
    const { service } = setup();
    const created = await createCase(service);

    await expect(
      service.prepareEvidenceUpload(clientA, created.model.caseId, {
        kind: "statement",
        legalDataCategory: "financial_credit_semiprivate",
        securityTier: "restricted",
        displayName: "ignored.pdf",
      }),
    ).rejects.toMatchObject({ code: "data_authorization_required" });

    const granted = await grantAuthorization(service, created.model.caseId);
    expect(granted.model.dataAuthorization?.status).toBe("active");
    expect(granted.model.dataAuthorization?.purposes).toEqual(["case_management", "mortgage_analysis"]);

    await service.revokeDataAuthorization(clientA, created.model.caseId, "El titular revocó autorización para nuevos tratamientos.");
    await expect(
      service.prepareEvidenceUpload(clientA, created.model.caseId, {
        kind: "statement",
        legalDataCategory: "financial_credit_semiprivate",
        securityTier: "restricted",
        displayName: "ignored.pdf",
      }),
    ).rejects.toMatchObject({ code: "data_authorization_required" });
  });

  it("keeps legal data category separate from technical security tier", async () => {
    const { service } = setup();
    const created = await createCase(service);
    await grantAuthorization(service, created.model.caseId);

    const financial = await service.prepareEvidenceUpload(clientA, created.model.caseId, {
      kind: "statement",
      legalDataCategory: "financial_credit_semiprivate",
      securityTier: "restricted",
      displayName: "not-used.pdf",
    });
    expect(financial.legalDataCategory).toBe("financial_credit_semiprivate");
    expect(financial.securityTier).toBe("restricted");

    await expect(
      service.prepareEvidenceUpload(clientA, created.model.caseId, {
        kind: "statement",
        legalDataCategory: "financial_credit_semiprivate",
        securityTier: "controlled",
        displayName: "not-used.pdf",
      }),
    ).rejects.toMatchObject({ code: "invalid_command" });

    await expect(
      service.prepareEvidenceUpload(clientA, created.model.caseId, {
        kind: "other",
        legalDataCategory: "sensitive",
        securityTier: "restricted",
        displayName: "not-used.pdf",
      }),
    ).rejects.toMatchObject({ code: "invalid_command" });
  });

  it("finalizes evidence as metadata + EVIDENCE_ATTACHED without leaking original filename", async () => {
    const { service } = setup();
    const created = await createCase(service);
    await grantAuthorization(service, created.model.caseId);

    const { intent, result } = await finalizeStatement(service, created.model.caseId);
    expect(result.model.projection.version).toBe(3);
    expect(result.model.projection.stage).toBe("collecting_evidence");
    expect(result.model.projection.attachedEvidenceIds).toEqual([intent.evidenceId]);
    expect(result.model.evidence).toHaveLength(1);
    expect(result.model.evidence[0]).toMatchObject({
      evidenceId: intent.evidenceId,
      legalDataCategory: "financial_credit_semiprivate",
      securityTier: "restricted",
      displayName: "Extracto hipotecario",
      lifecycle: "active",
    });

    const serializedJournal = JSON.stringify(result.model.journal);
    expect(serializedJournal).not.toContain("Juan-Perez");
    expect(serializedJournal).not.toContain("123456789.pdf");
    expect(serializedJournal).not.toContain("obj_statement_0001");
    expect(result.model.journal.at(-1)?.event.type).toBe("EVIDENCE_ATTACHED");
  });

  it("does not activate evidence metadata when a stale expectedVersion blocks finalization", async () => {
    const { service, store } = setup();
    const created = await createCase(service);
    await grantAuthorization(service, created.model.caseId);

    const intent = await service.prepareEvidenceUpload(clientA, created.model.caseId, {
      kind: "statement",
      legalDataCategory: "financial_credit_semiprivate",
      securityTier: "restricted",
      displayName: "ignored.pdf",
    });

    await service.appendEvent(clientA, created.model.caseId, 2, {
      type: "SERVICE_AGREEMENT_ACCEPTED",
      idempotencyKey: "intervening-event",
      payload: { agreementVersion: "services-v1" },
    });

    await expect(
      service.finalizeEvidenceUpload(clientA, created.model.caseId, {
        idempotencyKey: "stale-finalize",
        intentId: intent.intentId,
        expectedVersion: 2,
        receipt: {
          evidenceId: intent.evidenceId,
          storageLocator: "obj_statement_stale",
          mimeType: "application/pdf",
          byteSize: 512,
          checksumSha256: "b".repeat(64),
          verifiedAt: "2026-08-26T06:31:00.000Z",
        },
      }),
    ).rejects.toThrow(/expectedVersion 2/i);

    const snapshot = await store.loadCase(created.model.caseId);
    expect(snapshot!.evidence).toEqual([]);
    expect((await store.loadEvidenceIntent(intent.intentId))?.status).toBe("quarantine");
  });

  it("tombstones document location without deleting the historical event or breaking replay", async () => {
    const { service } = setup();
    const created = await createCase(service);
    await grantAuthorization(service, created.model.caseId);
    const { intent, result } = await finalizeStatement(service, created.model.caseId);
    const before = result.model.projection;

    const tombstoned = await service.tombstoneEvidence(
      clientA,
      created.model.caseId,
      intent.evidenceId,
      "Solicitud de supresión aplicable al objeto almacenado.",
    );

    expect(tombstoned.evidence[0]).toMatchObject({
      evidenceId: intent.evidenceId,
      lifecycle: "tombstoned",
      storageLocator: null,
      checksumSha256: null,
      byteSize: null,
    });
    expect(tombstoned.journal.some((item) => item.event.type === "EVIDENCE_ATTACHED")).toBe(true);
    expect(tombstoned.projection).toEqual(before);
    expect(await service.rebuildProjection(clientA, created.model.caseId)).toEqual(before);
  });

  it("rejects filenames, URLs, emails, base64-like material and non-opaque evidence references from the journal", async () => {
    const { service } = setup();
    const created = await createCase(service);

    await expect(
      service.appendEvent(clientA, created.model.caseId, 1, {
        type: "PROFESSIONAL_REVIEW_REQUESTED",
        idempotencyKey: "unsafe-email",
        payload: { reason: "Escribir a persona@example.com" },
      }),
    ).rejects.toMatchObject({ code: "unsafe_persistence_material" });

    await expect(
      service.appendEvent(admin, created.model.caseId, 1, {
        type: "EXTRAJUDICIAL_AUTHORITY_VERIFIED",
        idempotencyKey: "unsafe-ref",
        evidenceRefs: ["poder-cliente.pdf"],
        payload: { scope: "Gestión ante entidad." },
      }),
    ).rejects.toMatchObject({ code: "invalid_evidence_reference" });
  });

  it("records an external response source separately from the authenticated lawyer who incorporated it", async () => {
    const { service } = setup();
    const created = await createCase(service);
    await service.assignLawyer(admin, created.model.caseId, "sub_lawyer_1");

    await service.appendEvent(clientA, created.model.caseId, 1, {
      type: "SUBMISSION_RECORDED",
      idempotencyKey: "client-submission",
      payload: { submittedBy: "client", channel: "PQR", reference: "RAD-100" },
    });

    const response = await service.appendEvent(lawyer, created.model.caseId, 2, {
      type: "RESPONSE_RECORDED",
      idempotencyKey: "external-response",
      recordAsExternal: true,
      payload: { source: "Banco", reference: "RESP-200" },
    });

    const record = response.model.journal.at(-1)!;
    expect(record.event.actor.kind).toBe("external_recorded");
    expect(record.recordedByPrincipalKind).toBe("lawyer");
    expect(record.recordedBySubjectRef).toBe("sub_lawyer_1");

    await expect(
      service.appendEvent(clientA, created.model.caseId, 3, {
        type: "RESPONSE_RECORDED",
        idempotencyKey: "client-fake-external",
        recordAsExternal: true,
        payload: { source: "Banco", reference: "RESP-201" },
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rebuilds projection only from journal records, with no mutable projection source of truth", async () => {
    const { service } = setup();
    const created = await createCase(service);
    const authorization = await grantAuthorization(service, created.model.caseId);

    const rebuilt = await service.rebuildProjection(clientA, created.model.caseId);
    expect(rebuilt).toEqual(authorization.model.projection);

    const localMutation = authorization.model.projection as typeof authorization.model.projection & { stage: string };
    localMutation.stage = "cancelled";
    const rebuiltAgain = await service.rebuildProjection(clientA, created.model.caseId);
    expect(rebuiltAgain.stage).not.toBe("cancelled");
    expect(rebuiltAgain.version).toBe(2);
  });

  it("surfaces typed boundary errors for invalid opaque subject references", async () => {
    const { service } = setup();
    const badPrincipal: Principal = { kind: "client", subjectRef: "person@example.com" };

    try {
      await createCase(service, badPrincipal);
      throw new Error("Expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(PersistenceBoundaryError);
      expect((error as PersistenceBoundaryError).code).toBe("invalid_subject_ref");
    }
  });
});
