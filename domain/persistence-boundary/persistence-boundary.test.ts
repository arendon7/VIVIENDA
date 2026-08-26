import { describe, expect, it } from "vitest";
import { MemoryCasePersistence } from "./memory-adapter";
import { CasePersistenceService } from "./service";
import {
  PersistenceBoundaryError,
  type AppendCaseEventCommand,
  type Clock,
  type GrantDataAuthorizationCommand,
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

async function grantAuthorization(
  service: CasePersistenceService,
  caseId: string,
  expectedVersion = 1,
  overrides: Partial<GrantDataAuthorizationCommand> = {},
) {
  return service.grantDataAuthorization(clientA, caseId, expectedVersion, {
    idempotencyKey: overrides.idempotencyKey ?? "grant-auth-1",
    consentVersion: overrides.consentVersion ?? "privacy-v1",
    purposes: overrides.purposes ?? ["mortgage_analysis", "case_management"],
  });
}

async function prepareStatement(service: CasePersistenceService, caseId: string) {
  return service.prepareEvidenceUpload(clientA, caseId, {
    kind: "statement",
    legalDataCategory: "financial_credit_semiprivate",
    securityTier: "restricted",
  });
}

async function finalizeStatement(service: CasePersistenceService, caseId: string, expectedVersion = 2) {
  const intent = await prepareStatement(service, caseId);
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
  it("requires authentication and creates server-owned identity fields", async () => {
    const { service } = setup();

    await expect(createCase(service, { kind: "anonymous" })).rejects.toMatchObject({ code: "authentication_required" });
    await expect(createCase(service, admin)).rejects.toMatchObject({ code: "forbidden" });

    const created = await createCase(service);
    expect(created.kind).toBe("created");
    expect(created.model.caseId).toMatch(/^case_/);
    expect(created.model.projection.version).toBe(1);
    expect(created.model.timeline[0]?.eventId).toMatch(/^evt_/);
    expect(created.model.timeline[0]?.actor).toEqual({ kind: "client" });
    expect((created.model.timeline[0]?.actor as { actorId?: string }).actorId).toBeUndefined();
  });

  it("makes case creation idempotent and rejects semantic key reuse", async () => {
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

  it("prevents client IDOR and requires explicit lawyer assignment", async () => {
    const { service } = setup();
    const created = await createCase(service);

    await expect(service.readCase(clientB, created.model.caseId)).rejects.toMatchObject({ code: "forbidden" });
    await expect(service.readCase(lawyer, created.model.caseId)).rejects.toMatchObject({ code: "forbidden" });

    await service.assignLawyer(admin, created.model.caseId, "sub_lawyer_1");
    expect((await service.readCase(lawyer, created.model.caseId)).caseId).toBe(created.model.caseId);
  });

  it("keeps service read, system-write and external-record scopes separate", async () => {
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
    expect((await service.appendEvent(writer, created.model.caseId, 1, command)).model.timeline.at(-1)?.actor.kind).toBe("system");
  });

  it("derives actor and recordedAt server-side despite runtime injection", async () => {
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
    const persisted = result.model.timeline.at(-1)!;
    expect(persisted.actor).toEqual({ kind: "client" });
    expect(persisted.recordedAt).toBe("2026-08-26T06:30:00.000Z");
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

    expect(
      (
        await service.appendEvent(lawyer, created.model.caseId, 2, {
          type: "PROFESSIONAL_REVIEW_COMPLETED",
          idempotencyKey: "review-complete-lawyer",
          payload: { summary: "Conclusión jurídica profesional." },
        })
      ).model.projection.capabilities.professionalReviewCompleted,
    ).toBe(true);
  });

  it("uses strict idempotency for event retries", async () => {
    const { service } = setup();
    const created = await createCase(service);
    const command: AppendCaseEventCommand = {
      type: "SERVICE_AGREEMENT_ACCEPTED",
      idempotencyKey: "service-accept-1",
      payload: { agreementVersion: "services-v1" },
    };

    expect((await service.appendEvent(clientA, created.model.caseId, 1, command)).kind).toBe("appended");
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

  it("rechecks version, sequence and eventId uniqueness inside the store", async () => {
    const { service, store } = setup();
    const created = await createCase(service);
    const snapshot = await store.loadCase(created.model.caseId);
    const first = snapshot!.journal[0]!;
    const forged = {
      ...first,
      semanticFingerprint: "forged-fingerprint",
      event: { ...first.event, eventId: "evt_manual_2", idempotencyKey: "manual-append", sequence: 2 },
    };

    await expect(store.appendJournalAtomic({ caseId: created.model.caseId, expectedVersion: 0, record: forged })).rejects.toMatchObject({
      code: "version_conflict",
    });
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

  it("returns defensive storage snapshots", async () => {
    const { service, store } = setup();
    const created = await createCase(service);
    const snapshot = await store.loadCase(created.model.caseId);
    snapshot!.access.assignedLawyerSubjectRefs.push("sub_intruder");
    (snapshot!.journal[0]!.event.payload as { track: string }).track = "mutated";

    const reloaded = await store.loadCase(created.model.caseId);
    expect(reloaded!.access.assignedLawyerSubjectRefs).toEqual([]);
    expect((reloaded!.journal[0]!.event.payload as { track: string }).track).toBe("self_service");
  });

  it("requires an active authorization with an evidence-compatible purpose", async () => {
    const { service } = setup();
    const created = await createCase(service);

    await expect(prepareStatement(service, created.model.caseId)).rejects.toMatchObject({ code: "data_authorization_required" });

    await grantAuthorization(service, created.model.caseId, 1, {
      idempotencyKey: "marketing-only",
      consentVersion: "marketing-v1",
      purposes: ["marketing"],
    });
    await expect(prepareStatement(service, created.model.caseId)).rejects.toMatchObject({ code: "data_authorization_required" });

    await grantAuthorization(service, created.model.caseId, 2, {
      idempotencyKey: "case-auth-v2",
      consentVersion: "privacy-v2",
      purposes: ["case_management"],
    });
    expect((await prepareStatement(service, created.model.caseId)).status).toBe("quarantine");
  });

  it("retains versioned authorization history, supersedes the prior active version and supports revocation", async () => {
    const { service, store } = setup();
    const created = await createCase(service);
    await grantAuthorization(service, created.model.caseId);
    const second = await grantAuthorization(service, created.model.caseId, 2, {
      idempotencyKey: "grant-auth-2",
      consentVersion: "privacy-v2",
      purposes: ["legal_service"],
    });

    expect(second.model.dataAuthorizations).toHaveLength(2);
    expect(second.model.dataAuthorizations[0]).toMatchObject({ consentVersion: "privacy-v1", status: "superseded" });
    expect(second.model.dataAuthorizations[1]).toMatchObject({ consentVersion: "privacy-v2", status: "active" });
    expect(second.model.dataAuthorizations.every((item) => !("subjectRef" in item))).toBe(true);

    const revoked = await service.revokeDataAuthorization(clientA, created.model.caseId, "Revocación solicitada por el titular.");
    expect(revoked.dataAuthorizations[1]).toMatchObject({ status: "revoked" });
    expect((await store.loadCase(created.model.caseId))!.dataAuthorizations).toHaveLength(2);
    await expect(prepareStatement(service, created.model.caseId)).rejects.toMatchObject({ code: "data_authorization_required" });
  });

  it("keeps legal data category separate from technical security tier", async () => {
    const { service } = setup();
    const created = await createCase(service);
    await grantAuthorization(service, created.model.caseId);

    const financial = await prepareStatement(service, created.model.caseId);
    expect(financial).toMatchObject({ legalDataCategory: "financial_credit_semiprivate", securityTier: "restricted" });

    await expect(
      service.prepareEvidenceUpload(clientA, created.model.caseId, {
        kind: "statement",
        legalDataCategory: "financial_credit_semiprivate",
        securityTier: "controlled",
      }),
    ).rejects.toMatchObject({ code: "invalid_command" });
    await expect(
      service.prepareEvidenceUpload(clientA, created.model.caseId, {
        kind: "other",
        legalDataCategory: "sensitive",
        securityTier: "restricted",
      }),
    ).rejects.toMatchObject({ code: "invalid_command" });
  });

  it("finalizes evidence atomically and keeps storage coordinates out of the normal read model", async () => {
    const { service, store } = setup();
    const created = await createCase(service);
    await grantAuthorization(service, created.model.caseId);
    const { intent, result } = await finalizeStatement(service, created.model.caseId);

    expect(result.model.projection).toMatchObject({ version: 3, stage: "collecting_evidence" });
    expect(result.model.projection.attachedEvidenceIds).toEqual([intent.evidenceId]);
    expect(result.model.evidence[0]).toMatchObject({
      evidenceId: intent.evidenceId,
      legalDataCategory: "financial_credit_semiprivate",
      securityTier: "restricted",
      displayName: "Extracto hipotecario",
      lifecycle: "active",
    });
    expect("storageLocator" in result.model.evidence[0]!).toBe(false);
    expect("checksumSha256" in result.model.evidence[0]!).toBe(false);
    expect("createdBySubjectRef" in result.model.evidence[0]!).toBe(false);

    const internal = await store.loadCase(created.model.caseId);
    expect(internal!.evidence[0]).toMatchObject({ storageLocator: "obj_statement_0001", checksumSha256: "a".repeat(64) });
    expect(result.model.timeline.at(-1)?.type).toBe("EVIDENCE_ATTACHED");
  });

  it("does not activate evidence metadata after a stale-version finalization", async () => {
    const { service, store } = setup();
    const created = await createCase(service);
    await grantAuthorization(service, created.model.caseId);
    const intent = await prepareStatement(service, created.model.caseId);

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

    expect((await store.loadCase(created.model.caseId))!.evidence).toEqual([]);
    expect((await store.loadEvidenceIntent(intent.intentId))?.status).toBe("quarantine");
  });

  it("tombstones storage material without deleting the historical event or breaking replay", async () => {
    const { service, store } = setup();
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
    expect(tombstoned.evidence[0]).toMatchObject({ evidenceId: intent.evidenceId, lifecycle: "tombstoned" });
    expect(tombstoned.timeline.some((event) => event.type === "EVIDENCE_ATTACHED")).toBe(true);
    expect(tombstoned.projection).toEqual(before);
    expect(await service.rebuildProjection(clientA, created.model.caseId)).toEqual(before);

    const internal = (await store.loadCase(created.model.caseId))!.evidence[0]!;
    expect(internal).toMatchObject({ storageLocator: null, checksumSha256: null, byteSize: null });
  });

  it("rejects emails, filenames and non-opaque evidence references from the Case Log", async () => {
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

  it("separates an external fact source from the authenticated recorder and redacts audit IDs from normal reads", async () => {
    const { service, store } = setup();
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

    expect(response.model.timeline.at(-1)?.actor).toEqual({ kind: "external_recorded" });
    expect(JSON.stringify(response.model)).not.toContain("sub_lawyer_1");
    expect(JSON.stringify(response.model)).not.toContain("semanticFingerprint");
    expect(JSON.stringify(response.model)).not.toContain("requestId");

    const internalRecord = (await store.loadCase(created.model.caseId))!.journal.at(-1)!;
    expect(internalRecord).toMatchObject({ recordedByPrincipalKind: "lawyer", recordedBySubjectRef: "sub_lawyer_1" });

    await expect(
      service.appendEvent(clientA, created.model.caseId, 3, {
        type: "RESPONSE_RECORDED",
        idempotencyKey: "client-fake-external",
        recordAsExternal: true,
        payload: { source: "Banco", reference: "RESP-201" },
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rebuilds projection only from the journal, never from a mutable read-model cache", async () => {
    const { service } = setup();
    const created = await createCase(service);
    const authorization = await grantAuthorization(service, created.model.caseId);
    const rebuilt = await service.rebuildProjection(clientA, created.model.caseId);
    expect(rebuilt).toEqual(authorization.model.projection);

    const localMutation = authorization.model.projection as typeof authorization.model.projection & { stage: string };
    localMutation.stage = "cancelled";
    const rebuiltAgain = await service.rebuildProjection(clientA, created.model.caseId);
    expect(rebuiltAgain).toMatchObject({ version: 2 });
    expect(rebuiltAgain.stage).not.toBe("cancelled");
  });

  it("surfaces typed errors for non-opaque authenticated subject references", async () => {
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
