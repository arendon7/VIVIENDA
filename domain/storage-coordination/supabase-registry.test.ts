import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SupabaseRpcClient, SupabaseRpcError } from "@/domain/persistence-boundary/supabase-adapter";
import { EVIDENCE_BUCKET_ID } from "./coordinator";
import { SupabaseStorageCoordinationRegistry } from "./supabase-registry";

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
    if (!response) throw new Error(`No fake response queued for ${functionName}`);
    return response as { data: T | null; error: SupabaseRpcError | null };
  }
}

describe("SupabaseStorageCoordinationRegistry v0.8", () => {
  it("resolves a reserved intent object through the service-only coordination RPC", async () => {
    const client = new FakeRpcClient();
    client.enqueue({
      data: [
        {
          intent_id: "upl_demo",
          evidence_id: "evd_demo",
          case_id: "case_demo",
          status: "quarantine",
          expires_at: "2026-08-26T13:15:00.000Z",
          storage_locator: "obj_abcdef",
          bucket_id: EVIDENCE_BUCKET_ID,
          object_path: "quarantine/upl_demo/evd_demo/obj_abcdef",
          deleted_at: null,
        },
      ],
      error: null,
    });
    const registry = new SupabaseStorageCoordinationRegistry(client);

    await expect(registry.resolveIntentObject("upl_demo")).resolves.toEqual({
      intentId: "upl_demo",
      evidenceId: "evd_demo",
      caseId: "case_demo",
      status: "quarantine",
      expiresAt: "2026-08-26T13:15:00.000Z",
      storageLocator: "obj_abcdef",
      bucketId: EVIDENCE_BUCKET_ID,
      objectPath: "quarantine/upl_demo/evd_demo/obj_abcdef",
      deletedAt: null,
    });
    expect(client.calls[0]).toEqual({
      functionName: "vivienda_persist_resolve_intent_object",
      args: { p_intent_id: "upl_demo" },
    });
  });

  it("resolves only a readable physical evidence object after application-level authorization", async () => {
    const client = new FakeRpcClient();
    client.enqueue({
      data: {
        evidenceId: "evd_demo",
        caseId: "case_demo",
        storageLocator: "obj_abcdef",
        bucketId: EVIDENCE_BUCKET_ID,
        objectPath: "quarantine/upl_demo/evd_demo/obj_abcdef",
      },
      error: null,
    });
    const registry = new SupabaseStorageCoordinationRegistry(client);

    await expect(
      registry.resolveReadableEvidenceObject("case_demo", "evd_demo"),
    ).resolves.toEqual({
      evidenceId: "evd_demo",
      caseId: "case_demo",
      storageLocator: "obj_abcdef",
      bucketId: EVIDENCE_BUCKET_ID,
      objectPath: "quarantine/upl_demo/evd_demo/obj_abcdef",
    });
    expect(client.calls[0]).toEqual({
      functionName: "vivienda_persist_resolve_readable_evidence_object",
      args: { p_case_id: "case_demo", p_evidence_id: "evd_demo" },
    });
  });

  it("returns null rather than inventing coordinates when an object is not resolvable", async () => {
    const client = new FakeRpcClient();
    client.enqueue({ data: [], error: null });
    const registry = new SupabaseStorageCoordinationRegistry(client);
    await expect(registry.resolveReadableEvidenceObject("case_demo", "evd_missing")).resolves.toBeNull();
  });

  it("redacts provider errors instead of leaking SQL details", async () => {
    const client = new FakeRpcClient();
    client.enqueue({
      data: null,
      error: { message: "permission denied private.secret object_path=/do/not/leak" },
    });
    const registry = new SupabaseStorageCoordinationRegistry(client);

    try {
      await registry.resolveIntentObject("upl_demo");
      throw new Error("expected provider failure");
    } catch (error) {
      expect(error).toMatchObject({ code: "provider_error" });
      expect(String((error as Error).message)).not.toContain("/do/not/leak");
      expect(String((error as Error).message)).not.toContain("private.secret");
    }
  });

  it("rejects malformed provider rows", async () => {
    const client = new FakeRpcClient();
    client.enqueue({
      data: [
        {
          intent_id: "upl_demo",
          evidence_id: "evd_demo",
          case_id: "case_demo",
          status: "quarantine",
          expires_at: "2026-08-26T13:15:00.000Z",
          storage_locator: "obj_abcdef",
          bucket_id: "public-assets",
          object_path: "public/file.pdf",
          deleted_at: null,
        },
      ],
      error: null,
    });
    const registry = new SupabaseStorageCoordinationRegistry(client);
    await expect(registry.resolveIntentObject("upl_demo")).rejects.toMatchObject({
      code: "provider_error",
    });
  });
});

describe("Supabase Storage coordination migration v0.8", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260826080000_vivienda_storage_coordination_v08.sql"),
    "utf8",
  );

  it("keeps physical resolvers SECURITY INVOKER with an empty search_path", () => {
    expect(sql.match(/security invoker/g)?.length).toBe(2);
    expect(sql.match(/security invoker\s+set search_path = ''/g)?.length).toBe(2);
    expect(sql).not.toContain("security definer");
  });

  it("grants both physical resolvers only to service_role", () => {
    expect(sql).toContain(
      "grant execute on function public.vivienda_persist_resolve_intent_object(text)\n  to service_role",
    );
    expect(sql).toContain(
      "grant execute on function public.vivienda_persist_resolve_readable_evidence_object(text,text)\n  to service_role",
    );
    expect(sql).not.toMatch(/grant execute[\s\S]*to authenticated;/i);
  });

  it("never exposes a tombstoned object as readable and allows legal_hold to remain readable", () => {
    const start = sql.indexOf("vivienda_persist_resolve_readable_evidence_object");
    const readableSql = sql.slice(start);
    expect(readableSql).toContain("e.lifecycle in ('active','legal_hold')");
    expect(readableSql).not.toContain("'tombstoned'");
    expect(readableSql).toContain("o.deleted_at is null");
    expect(readableSql).toContain("o.deletion_requested_at is null");
  });

  it("does not generate or persist signed URLs/tokens in SQL", () => {
    expect(sql).not.toMatch(/signed[_ ]?(url|token)/i);
    expect(sql).not.toContain("service_role_key");
  });
});
