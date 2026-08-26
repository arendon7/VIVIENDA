import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CaseJournalRecord, PersistedCaseSnapshot } from "./contracts";
import { PersistenceBoundaryError } from "./contracts";
import {
  SupabaseCasePersistenceAdapter,
  SupabaseEvidenceObjectRegistry,
  SupabasePrincipalResolver,
  type SupabaseRpcClient,
  type SupabaseRpcError,
} from "./supabase-adapter";

const iso = "2026-08-26T07:00:00-05:00";
const fingerprint = "a".repeat(64);

const firstRecord: CaseJournalRecord = {
  event: {
    eventId: "evt_create_demo",
    caseId: "case_demo",
    sequence: 1,
    type: "CASE_CREATED",
    occurredAt: iso,
    recordedAt: iso,
    actor: { kind: "client", actorId: "sub_client" },
    idempotencyKey: "idem-create-demo",
    payload: {
      routeCode: "R1_PREPAGO_PLAZO",
      routeStatus: "eligible_now",
      precision: "C2",
      track: "self_service",
    },
  },
  recordedBySubjectRef: "sub_client",
  recordedByPrincipalKind: "client",
  requestId: "req_create_demo",
  semanticFingerprint: fingerprint,
  storedAt: iso,
};

const snapshot: PersistedCaseSnapshot = {
  caseId: "case_demo",
  access: {
    ownerSubjectRef: "sub_client",
    assignedLawyerSubjectRefs: [],
  },
  journal: [firstRecord],
  dataAuthorizations: [],
  evidence: [],
};

type RpcResponse = { data: unknown | null; error: SupabaseRpcError | null };

class FakeRpcClient implements SupabaseRpcClient {
  readonly calls: Array<{ functionName: string; args?: Record<string, unknown> }> = [];
  private readonly responses: RpcResponse[] = [];

  enqueue(response: RpcResponse) {
    this.responses.push(response);
  }

  async rpc<T = unknown>(
    functionName: string,
    args?: Record<string, unknown>,
  ): Promise<{ data: T | null; error: SupabaseRpcError | null }> {
    this.calls.push(args ? { functionName, args } : { functionName });
    const response = this.responses.shift();
    if (!response) throw new Error(`No fake RPC response queued for ${functionName}`);
    return response as { data: T | null; error: SupabaseRpcError | null };
  }
}

function expectBoundaryCode(error: unknown, code: string) {
  expect(error).toBeInstanceOf(PersistenceBoundaryError);
  expect(error).toMatchObject({ code });
}

describe("SupabaseCasePersistenceAdapter v0.7", () => {
  it("maps createCaseAtomic to the exact service-only RPC contract", async () => {
    const client = new FakeRpcClient();
    client.enqueue({ data: { kind: "created", snapshot }, error: null });
    const adapter = new SupabaseCasePersistenceAdapter(client);

    const result = await adapter.createCaseAtomic({
      caseId: "case_demo",
      ownerSubjectRef: "sub_client",
      creationIdempotencyKey: "idem-create-demo",
      creationFingerprint: fingerprint,
      firstRecord,
    });

    expect(result.kind).toBe("created");
    expect(result.snapshot).toEqual(snapshot);
    expect(client.calls).toEqual([
      {
        functionName: "vivienda_persist_create_case",
        args: {
          p_case_id: "case_demo",
          p_owner_subject_ref: "sub_client",
          p_creation_idempotency_key: "idem-create-demo",
          p_creation_fingerprint: fingerprint,
          p_first_record: firstRecord,
        },
      },
    ]);
  });

  it("preserves duplicate semantics returned by Postgres", async () => {
    const client = new FakeRpcClient();
    client.enqueue({ data: { kind: "duplicate", snapshot }, error: null });
    const adapter = new SupabaseCasePersistenceAdapter(client);

    const result = await adapter.createCaseAtomic({
      caseId: "case_retry",
      ownerSubjectRef: "sub_client",
      creationIdempotencyKey: "idem-create-demo",
      creationFingerprint: fingerprint,
      firstRecord,
    });

    expect(result.kind).toBe("duplicate");
    expect(result.snapshot.caseId).toBe("case_demo");
  });

  it("maps known database conflicts to stable boundary codes", async () => {
    const client = new FakeRpcClient();
    client.enqueue({ data: null, error: { message: "vivienda:version_conflict" } });
    const adapter = new SupabaseCasePersistenceAdapter(client);

    try {
      await adapter.appendJournalAtomic({
        caseId: "case_demo",
        expectedVersion: 1,
        record: firstRecord,
      });
      throw new Error("Expected version conflict");
    } catch (error) {
      expectBoundaryCode(error, "version_conflict");
    }
  });

  it("redacts unknown provider failures instead of leaking SQL details", async () => {
    const client = new FakeRpcClient();
    client.enqueue({
      data: null,
      error: {
        message: "permission denied on private.vivienda_case_journal; secret=do-not-leak",
        details: "internal SQL detail",
      },
    });
    const adapter = new SupabaseCasePersistenceAdapter(client);

    try {
      await adapter.loadCase("case_demo");
      throw new Error("Expected provider failure");
    } catch (error) {
      expectBoundaryCode(error, "provider_error");
      expect(String((error as Error).message)).not.toContain("do-not-leak");
      expect(String((error as Error).message)).not.toContain("vivienda_case_journal");
    }
  });

  it("returns null for a missing case without inventing a snapshot", async () => {
    const client = new FakeRpcClient();
    client.enqueue({ data: null, error: null });
    const adapter = new SupabaseCasePersistenceAdapter(client);
    await expect(adapter.loadCase("case_missing")).resolves.toBeNull();
  });

  it("uses the specialized authorization RPC and preserves versioning payload", async () => {
    const client = new FakeRpcClient();
    client.enqueue({ data: { kind: "appended", snapshot }, error: null });
    const adapter = new SupabaseCasePersistenceAdapter(client);

    await adapter.grantDataAuthorizationAtomic({
      caseId: "case_demo",
      expectedVersion: 1,
      record: firstRecord,
      authorization: {
        authorizationId: "auth_demo",
        caseId: "case_demo",
        subjectRef: "sub_client",
        consentVersion: "privacy-v2",
        purposes: ["mortgage_analysis", "case_management"],
        status: "active",
        grantedAt: iso,
        revokedAt: null,
        revokedReason: null,
      },
    });

    expect(client.calls[0]).toMatchObject({
      functionName: "vivienda_persist_grant_data_authorization",
      args: {
        p_case_id: "case_demo",
        p_expected_version: 1,
      },
    });
    expect((client.calls[0]!.args!.p_authorization as Record<string, unknown>).purposes).toEqual([
      "mortgage_analysis",
      "case_management",
    ]);
  });

  it("keeps physical object registration outside CasePersistencePort", async () => {
    const client = new FakeRpcClient();
    client.enqueue({ data: null, error: null });
    const registry = new SupabaseEvidenceObjectRegistry(client);

    await registry.registerObject({
      intentId: "upl_demo",
      storageLocator: "obj_abcdef",
      objectPath: "quarantine/upl_demo/evd_demo",
    });

    expect(client.calls[0]).toEqual({
      functionName: "vivienda_persist_register_evidence_object",
      args: {
        p_intent_id: "upl_demo",
        p_storage_locator: "obj_abcdef",
        p_object_path: "quarantine/upl_demo/evd_demo",
      },
    });
  });

  it("maps orphan-cleanup rows without exposing provider naming conventions upstream", async () => {
    const client = new FakeRpcClient();
    client.enqueue({
      data: [{ intent_id: "upl_old", storage_locator: "obj_old123", object_path: "quarantine/upl_old/evd_old" }],
      error: null,
    });
    const registry = new SupabaseEvidenceObjectRegistry(client);

    await expect(registry.expireIntents(iso)).resolves.toEqual([
      { intentId: "upl_old", storageLocator: "obj_old123", objectPath: "quarantine/upl_old/evd_old" },
    ]);
  });

  it("resolves only opaque client/lawyer/admin principals from a user-scoped JWT client", async () => {
    const client = new FakeRpcClient();
    client.enqueue({ data: { subjectRef: "sub_client", kind: "client" }, error: null });
    const resolver = new SupabasePrincipalResolver(client);

    await expect(resolver.resolve()).resolves.toEqual({ kind: "client", subjectRef: "sub_client" });
    expect(client.calls[0]).toEqual({ functionName: "vivienda_resolve_principal" });
  });

  it("rejects malformed principal responses as provider errors", async () => {
    const client = new FakeRpcClient();
    client.enqueue({ data: { subjectRef: "person@example.com", kind: "owner" }, error: null });
    const resolver = new SupabasePrincipalResolver(client);

    await expect(resolver.resolve()).rejects.toMatchObject({ code: "provider_error" });
  });
});

describe("Supabase/Postgres migration contract v0.7", () => {
  const schemaSql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260826070000_vivienda_schema_v07.sql"),
    "utf8",
  );
  const rpcSql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260826070100_vivienda_rpc_v07.sql"),
    "utf8",
  );

  it("keeps canonical persistence tables in a private schema with RLS and no browser grants", () => {
    expect(schemaSql).toContain("create schema if not exists private");
    expect(schemaSql).toContain("revoke all on schema private from public, anon, authenticated");
    expect(schemaSql.match(/enable row level security/g)?.length).toBeGreaterThanOrEqual(9);
    expect(schemaSql).toContain("revoke all on all tables in schema private from anon, authenticated");
  });

  it("enforces journal uniqueness, sequence identity and opaque evidence refs without a CHECK subquery", () => {
    expect(schemaSql).toContain("primary key (case_id, sequence)");
    expect(schemaSql).toContain("unique (case_id, idempotency_key)");
    expect(schemaSql).toContain("event_id text not null unique");
    expect(schemaSql).toContain("private.vivienda_evidence_refs_valid(evidence_refs)");
    expect(schemaSql).not.toMatch(/check\s*\(\s*not exists\s*\(/i);
  });

  it("keeps exactly one active authorization per case and subject", () => {
    expect(schemaSql).toContain("vivienda_data_auth_one_active_idx");
    expect(schemaSql).toContain("where status = 'active'");
    expect(schemaSql).toContain("'active','revoked','superseded'");
  });

  it("creates a private evidence bucket and never persists a signed URL", () => {
    expect(schemaSql).toContain("'vivienda-evidence'");
    expect(schemaSql).toMatch(/'vivienda-evidence',\s*\n\s*false,/);
    expect(`${schemaSql}\n${rpcSql}`).not.toMatch(/signed[_ ]?url/i);
  });

  it("pins search_path on security-definer functions", () => {
    const definers = rpcSql.match(/security definer/g)?.length ?? 0;
    const pinned = rpcSql.match(/security definer\s+set search_path = ''/g)?.length ?? 0;
    expect(definers).toBeGreaterThanOrEqual(10);
    expect(pinned).toBe(definers);
  });

  it("uses row locking for versioned mutations and retry-before-version semantics", () => {
    expect(rpcSql.match(/for update/g)?.length).toBeGreaterThanOrEqual(4);
    const appendStart = rpcSql.indexOf("vivienda_persist_append_journal");
    const appendSql = rpcSql.slice(appendStart, rpcSql.indexOf("vivienda_persist_assign_lawyer", appendStart));
    expect(appendSql.indexOf("idempotency_key = v_key")).toBeLessThan(appendSql.indexOf("p_expected_version <>"));
  });

  it("keeps persistence RPCs service-role only while principal resolution is authenticated", () => {
    expect(rpcSql).toContain("grant execute on function public.vivienda_resolve_principal() to authenticated");
    expect(rpcSql).toContain(
      "revoke all on function public.vivienda_persist_append_journal(text,integer,jsonb) from public, anon, authenticated",
    );
    expect(rpcSql).toContain(
      "grant execute on function public.vivienda_persist_append_journal(text,integer,jsonb) to service_role",
    );
    expect(rpcSql).not.toMatch(/grant execute on function public\.vivienda_persist_[^(]+\([^;]+to authenticated/i);
  });

  it("does not allow marketing-only consent to unlock evidence", () => {
    const allowed = "'mortgage_analysis','case_management','legal_service','external_credit_data'";
    expect(rpcSql.match(new RegExp(allowed, "g"))?.length).toBeGreaterThanOrEqual(2);
    expect(rpcSql).not.toContain("'external_credit_data','marketing'\n      ]::text[]");
  });

  it("finalizes evidence only after an object registry match and updates metadata, intent, journal and version", () => {
    const start = rpcSql.indexOf("vivienda_persist_finalize_evidence");
    const end = rpcSql.indexOf("vivienda_persist_tombstone_evidence", start);
    const finalizeSql = rpcSql.slice(start, end);
    expect(finalizeSql).toContain("private.vivienda_evidence_objects");
    expect(finalizeSql).toContain("private.vivienda_evidence_metadata");
    expect(finalizeSql).toContain("private.vivienda_insert_journal_record");
    expect(finalizeSql).toContain("set status = 'finalized'");
    expect(finalizeSql).toContain("current_version = current_version + 1");
  });

  it("preserves append-only history when tombstoning evidence", () => {
    const start = rpcSql.indexOf("vivienda_persist_tombstone_evidence");
    const end = rpcSql.indexOf("vivienda_persist_expire_evidence_intents", start);
    const tombstoneSql = rpcSql.slice(start, end);
    expect(tombstoneSql).toContain("lifecycle = 'tombstoned'");
    expect(tombstoneSql).not.toMatch(/delete\s+from\s+private\.vivienda_case_journal/i);
    expect(tombstoneSql).not.toMatch(/update\s+private\.vivienda_case_journal/i);
  });
});
