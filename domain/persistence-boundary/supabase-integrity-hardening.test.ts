import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const integritySql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260826070300_vivienda_integrity_hardening_v07.sql"),
  "utf8",
);

describe("Supabase v0.7 concurrency and integrity hardening", () => {
  it("serializes concurrent case creation by owner plus idempotency key before the first lookup", () => {
    const createStart = integritySql.indexOf("public.vivienda_persist_create_case");
    const createEnd = integritySql.indexOf("public.vivienda_persist_append_journal", createStart);
    const createSql = integritySql.slice(createStart, createEnd);

    const lock = createSql.indexOf("pg_advisory_xact_lock");
    const lookup = createSql.indexOf("select * into v_existing");
    expect(lock).toBeGreaterThanOrEqual(0);
    expect(lookup).toBeGreaterThanOrEqual(0);
    expect(lock).toBeLessThan(lookup);
    expect(createSql).toContain("p_owner_subject_ref");
    expect(createSql).toContain("p_creation_idempotency_key");
  });

  it("enforces the Case Journal root and contiguous sequence through a database trigger", () => {
    expect(integritySql).toContain("create trigger vivienda_case_journal_insert_guard");
    expect(integritySql).toContain("before insert on private.vivienda_case_journal");
    expect(integritySql).toContain("new.event_type <> 'CASE_CREATED'");
    expect(integritySql).toContain("new.event_type = 'CASE_CREATED'");
    expect(integritySql).toContain("new.sequence <> v_current_version + 1");
  });

  it("keeps the journal guard SECURITY INVOKER with an empty search_path", () => {
    const start = integritySql.indexOf("private.vivienda_guard_journal_insert");
    const end = integritySql.indexOf("drop trigger", start);
    const guardSql = integritySql.slice(start, end);
    expect(guardSql).toContain("security invoker");
    expect(guardSql).toContain("set search_path = ''");
  });

  it("prevents generic append from bypassing specialized atomic operations", () => {
    const appendStart = integritySql.indexOf("public.vivienda_persist_append_journal");
    const appendEnd = integritySql.indexOf("public.vivienda_persist_mark_orphan_object_deleted", appendStart);
    const appendSql = integritySql.slice(appendStart, appendEnd);
    expect(appendSql).toContain("'CASE_CREATED', 'DATA_AUTHORIZATION_RECORDED', 'EVIDENCE_ATTACHED'");
    expect(appendSql).toContain("vivienda:reserved_operation");
  });

  it("keeps retry lookup before expectedVersion after the concurrency hardening redefinition", () => {
    const appendStart = integritySql.indexOf("public.vivienda_persist_append_journal");
    const appendEnd = integritySql.indexOf("public.vivienda_persist_mark_orphan_object_deleted", appendStart);
    const appendSql = integritySql.slice(appendStart, appendEnd);
    expect(appendSql.indexOf("idempotency_key = v_key")).toBeLessThan(
      appendSql.indexOf("p_expected_version <>"),
    );
  });

  it("marks an orphan physical mapping deleted only after its intent is already expired", () => {
    const start = integritySql.indexOf("public.vivienda_persist_mark_orphan_object_deleted");
    const cleanupSql = integritySql.slice(start);
    expect(cleanupSql).toContain("set deleted_at = p_deleted_at");
    expect(cleanupSql).toContain("i.status = 'expired'");
    expect(cleanupSql).toContain("vivienda:evidence_not_found");
  });

  it("does not mutate or delete Case Journal rows during orphan cleanup", () => {
    const start = integritySql.indexOf("public.vivienda_persist_mark_orphan_object_deleted");
    const cleanupSql = integritySql.slice(start);
    expect(cleanupSql).not.toMatch(/update\s+private\.vivienda_case_journal/i);
    expect(cleanupSql).not.toMatch(/delete\s+from\s+private\.vivienda_case_journal/i);
  });
});