import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const rpcSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260826070100_vivienda_rpc_v07.sql"),
  "utf8",
);
const hardeningSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260826070200_vivienda_security_hardening_v07.sql"),
  "utf8",
);

describe("Supabase v0.7 final privilege state", () => {
  it("reduces every service-role persistence RPC to SECURITY INVOKER", () => {
    const hardened = hardeningSql.match(
      /alter function public\.vivienda_persist_[^(]+\([^;]+\) security invoker;/g,
    );
    expect(hardened?.length).toBeGreaterThanOrEqual(13);
  });

  it("also reduces private persistence helpers to invoker privileges", () => {
    expect(hardeningSql).toContain(
      "alter function private.vivienda_case_snapshot(text) security invoker;",
    );
    expect(hardeningSql).toContain(
      "alter function private.vivienda_insert_journal_record(jsonb) security invoker;",
    );
  });

  it("keeps the user-scoped principal resolver as the only intentional definer exception", () => {
    const resolverStart = rpcSql.indexOf("public.vivienda_resolve_principal");
    const resolverEnd = rpcSql.indexOf("public.vivienda_persist_create_case", resolverStart);
    const resolverSql = rpcSql.slice(resolverStart, resolverEnd);

    expect(resolverSql).toContain("security definer");
    expect(resolverSql).toContain("set search_path = ''");
    expect(hardeningSql).not.toContain("vivienda_resolve_principal() security invoker");
  });

  it("does not broaden service persistence execution to authenticated users", () => {
    expect(rpcSql).toContain(
      "grant execute on function public.vivienda_resolve_principal() to authenticated",
    );
    expect(rpcSql).not.toMatch(
      /grant execute on function public\.vivienda_persist_[^(]+\([^;]+\) to authenticated;/i,
    );
  });
});
