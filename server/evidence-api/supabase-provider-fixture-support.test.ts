import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SUPPORT_PATH = "supabase/dev-fixtures/V0.23.22_PROVIDER_FIXTURE_SUPPORT.sql";
const SQL = readFileSync(join(process.cwd(), SUPPORT_PATH), "utf8");

describe("Supabase DEV fixture support plane V0.23.22", () => {
  it("lives outside the canonical migrations directory", () => {
    expect(SUPPORT_PATH.startsWith("supabase/migrations/")).toBe(false);
    expect(SUPPORT_PATH.startsWith("supabase/dev-fixtures/")).toBe(true);
  });

  it("requires the explicit vivienda-dev project label in both RPCs", () => {
    const guards = SQL.match(/p_project_label is distinct from 'vivienda-dev'/g) ?? [];
    expect(guards).toHaveLength(2);
    expect(SQL).toContain("vivienda:fixture_wrong_environment");
  });

  it("fails closed on null, malformed or mismatched namespaces and subject arrays", () => {
    expect(SQL).toContain("p_namespace is null");
    expect(SQL).toContain("^vivienda_dev_[A-Za-z0-9_-]{8,40}$");
    expect(SQL.match(/coalesce\(cardinality\(p_subject_refs\), 0\) <> 2/g) ?? []).toHaveLength(2);
    expect(SQL.match(/not coalesce\(v_owner_ref = any\(p_subject_refs\), false\)/g) ?? []).toHaveLength(2);
    expect(SQL.match(/not coalesce\(v_intruder_ref = any\(p_subject_refs\), false\)/g) ?? []).toHaveLength(2);
  });

  it("deletes only fixture-scoped case roots and synthetic identity mappings", () => {
    expect(SQL).toContain("delete from private.vivienda_cases");
    expect(SQL).toContain("left(c.case_id, length(v_case_prefix)) = v_case_prefix");
    expect(SQL).toContain("delete from private.vivienda_identity_subjects");
    expect(SQL).toContain("i.subject_ref in (v_owner_ref, v_intruder_ref)");
  });

  it("never deletes physical Storage objects or auth.users through SQL", () => {
    expect(SQL).not.toMatch(/delete\s+from\s+storage\.objects/i);
    expect(SQL).not.toMatch(/delete\s+from\s+auth\.users/i);
  });

  it("grants DEV fixture RPC execution only to service_role", () => {
    expect(SQL).toContain(
      "revoke all on function public.vivienda_dev_fixture_purge(text,text,text[]) from public, anon, authenticated;",
    );
    expect(SQL).toContain(
      "grant execute on function public.vivienda_dev_fixture_purge(text,text,text[]) to service_role;",
    );
    expect(SQL).toContain(
      "revoke all on function public.vivienda_dev_fixture_residue(text,text,text[]) from public, anon, authenticated;",
    );
    expect(SQL).toContain(
      "grant execute on function public.vivienda_dev_fixture_residue(text,text,text[]) to service_role;",
    );
  });

  it("reports case, registry and identity residue without manufacturing Storage/Auth evidence", () => {
    expect(SQL).toContain("'caseRows', v_case_rows");
    expect(SQL).toContain("'registryRows', v_registry_rows");
    expect(SQL).toContain("'identityRows', v_identity_rows");
    expect(SQL).not.toContain("'storageObjects'");
    expect(SQL).not.toContain("'authUsers'");
  });
});
