import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260826080100_vivienda_storage_retry_hardening_v08.sql"),
  "utf8",
);

describe("Supabase Storage retry hardening v0.8", () => {
  it("returns all expired unconfirmed objects, not only intents transitioned in the current invocation", () => {
    expect(sql).toContain("update private.vivienda_evidence_intents i");
    expect(sql).toContain("set status = 'expired'");
    expect(sql).toContain("where i.status = 'quarantine'");
    expect(sql).toContain("where i.status = 'expired'");
    expect(sql).toContain("o.deleted_at is null");
    expect(sql).not.toMatch(/with\s+expired\s+as\s*\(\s*update/i);
  });

  it("keeps the retryable cleanup RPC service-only and SECURITY INVOKER", () => {
    expect(sql).toContain("security invoker");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain(
      "revoke all on function public.vivienda_persist_expire_evidence_intents(timestamptz)\n  from public, anon, authenticated",
    );
    expect(sql).toContain(
      "grant execute on function public.vivienda_persist_expire_evidence_intents(timestamptz)\n  to service_role",
    );
    expect(sql).not.toContain("security definer");
  });

  it("never mutates Case Journal while retrying Storage cleanup", () => {
    expect(sql).not.toMatch(/update\s+private\.vivienda_case_journal/i);
    expect(sql).not.toMatch(/delete\s+from\s+private\.vivienda_case_journal/i);
    expect(sql).not.toContain("vivienda_insert_journal_record");
  });
});
