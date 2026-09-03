import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const lifecycleSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260826070400_vivienda_identity_storage_lifecycle_v07.sql"),
  "utf8",
);

describe("Supabase v0.7 identity and Storage lifecycle hardening", () => {
  it("keeps auth-user to subjectRef mapping immutable after provisioning", () => {
    const start = lifecycleSql.indexOf("public.vivienda_persist_upsert_identity");
    const end = lifecycleSql.indexOf("public.vivienda_persist_tombstone_evidence", start);
    const identitySql = lifecycleSql.slice(start, end);

    expect(identitySql).toContain("v_existing_subject is distinct from p_subject_ref");
    expect(identitySql).toContain("vivienda:invalid_subject_ref");
    expect(identitySql).not.toMatch(/set\s+subject_ref\s*=/i);
  });

  it("distinguishes deletion request from confirmed physical deletion", () => {
    expect(lifecycleSql).toContain("add column if not exists deletion_requested_at");

    const tombstoneStart = lifecycleSql.indexOf("public.vivienda_persist_tombstone_evidence");
    const tombstoneEnd = lifecycleSql.indexOf("vivienda_persist_mark_orphan_object_deleted", tombstoneStart);
    const tombstoneSql = lifecycleSql.slice(tombstoneStart, tombstoneEnd);

    expect(tombstoneSql).toContain("set deletion_requested_at = coalesce(deletion_requested_at, p_at)");
    expect(tombstoneSql).not.toMatch(/set\s+deleted_at\s*=\s*p_at/i);
  });

  it("drops the obsolete orphan-only deletion confirmation RPC", () => {
    expect(lifecycleSql).toContain(
      "drop function if exists public.vivienda_persist_mark_orphan_object_deleted(text,timestamptz)",
    );
    expect(lifecycleSql).toContain("public.vivienda_persist_mark_evidence_object_deleted");
  });

  it("confirms physical deletion only for expired or tombstoned objects", () => {
    const start = lifecycleSql.indexOf("public.vivienda_persist_mark_evidence_object_deleted");
    const end = lifecycleSql.indexOf("public.vivienda_persist_list_pending_object_deletions", start);
    const confirmSql = lifecycleSql.slice(start, end);

    expect(confirmSql).toContain("i.status = 'expired'");
    expect(confirmSql).toContain("e.lifecycle = 'tombstoned'");
    expect(confirmSql).toContain("set deleted_at = p_deleted_at");
  });

  it("exposes pending physical coordinates only through a service-only deletion queue RPC", () => {
    const start = lifecycleSql.indexOf("public.vivienda_persist_list_pending_object_deletions");
    const queueSql = lifecycleSql.slice(start);

    expect(queueSql).toContain("deletion_requested_at is not null");
    expect(queueSql).toContain("deleted_at is null");
    expect(queueSql).toContain(
      "revoke all on function public.vivienda_persist_list_pending_object_deletions(integer) from public, anon, authenticated",
    );
    expect(queueSql).toContain(
      "grant execute on function public.vivienda_persist_list_pending_object_deletions(integer) to service_role",
    );
  });

  it("keeps all lifecycle hardening functions on invoker privileges with pinned search_path", () => {
    const functionBlocks = lifecycleSql.match(/create or replace function[\s\S]*?\$\$;/g) ?? [];
    expect(functionBlocks.length).toBeGreaterThanOrEqual(4);
    for (const block of functionBlocks) {
      expect(block).toContain("security invoker");
      expect(block).toContain("set search_path = ''");
    }
  });
});
