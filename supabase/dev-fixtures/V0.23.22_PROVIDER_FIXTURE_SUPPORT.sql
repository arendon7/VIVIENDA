-- VIVIENDA V0.23.22 — DEV-ONLY provider candidate fixture support.
--
-- IMPORTANT:
--   1. This file is intentionally OUTSIDE supabase/migrations.
--   2. It must never be applied to STAGING or PROD.
--   3. Physical Storage objects are NOT deleted here; deletion must happen through Supabase Storage API first.
--   4. Auth users are NOT deleted here; deletion must happen through Supabase Auth Admin after DB purge.

begin;

create or replace function public.vivienda_dev_fixture_purge(
  p_project_label text,
  p_namespace text,
  p_subject_refs text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_token text;
  v_owner_ref text;
  v_intruder_ref text;
  v_case_prefix text;
begin
  if p_project_label is distinct from 'vivienda-dev' then
    raise exception 'vivienda:fixture_wrong_environment' using errcode = 'P0001';
  end if;

  if p_namespace is null or p_namespace !~ '^vivienda_dev_[A-Za-z0-9_-]{8,40}$' then
    raise exception 'vivienda:fixture_invalid_namespace' using errcode = 'P0001';
  end if;

  v_token := substring(p_namespace from '^vivienda_dev_([A-Za-z0-9_-]{8,40})$');
  v_owner_ref := 'sub_synthetic_' || v_token || '_owner';
  v_intruder_ref := 'sub_synthetic_' || v_token || '_intruder';

  if cardinality(p_subject_refs) <> 2
     or not (v_owner_ref = any(p_subject_refs))
     or not (v_intruder_ref = any(p_subject_refs)) then
    raise exception 'vivienda:fixture_subject_mismatch' using errcode = 'P0001';
  end if;

  v_case_prefix := 'case_' || p_namespace || '_';

  -- Root-case deletion intentionally relies on the canonical FK ON DELETE CASCADE graph.
  delete from private.vivienda_cases c
  where left(c.case_id, length(v_case_prefix)) = v_case_prefix;

  -- Identity mapping must be removed before Auth Admin deletes auth.users.
  delete from private.vivienda_identity_subjects i
  where i.subject_ref in (v_owner_ref, v_intruder_ref);
end;
$$;

revoke all on function public.vivienda_dev_fixture_purge(text,text,text[]) from public, anon, authenticated;
grant execute on function public.vivienda_dev_fixture_purge(text,text,text[]) to service_role;

create or replace function public.vivienda_dev_fixture_residue(
  p_project_label text,
  p_namespace text,
  p_subject_refs text[]
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
stable
as $$
declare
  v_token text;
  v_owner_ref text;
  v_intruder_ref text;
  v_case_prefix text;
  v_intent_prefix text;
  v_case_rows bigint;
  v_registry_rows bigint;
  v_identity_rows bigint;
begin
  if p_project_label is distinct from 'vivienda-dev' then
    raise exception 'vivienda:fixture_wrong_environment' using errcode = 'P0001';
  end if;

  if p_namespace is null or p_namespace !~ '^vivienda_dev_[A-Za-z0-9_-]{8,40}$' then
    raise exception 'vivienda:fixture_invalid_namespace' using errcode = 'P0001';
  end if;

  v_token := substring(p_namespace from '^vivienda_dev_([A-Za-z0-9_-]{8,40})$');
  v_owner_ref := 'sub_synthetic_' || v_token || '_owner';
  v_intruder_ref := 'sub_synthetic_' || v_token || '_intruder';

  if cardinality(p_subject_refs) <> 2
     or not (v_owner_ref = any(p_subject_refs))
     or not (v_intruder_ref = any(p_subject_refs)) then
    raise exception 'vivienda:fixture_subject_mismatch' using errcode = 'P0001';
  end if;

  v_case_prefix := 'case_' || p_namespace || '_';
  v_intent_prefix := 'upl_' || p_namespace || '_';

  select
      (select count(*) from private.vivienda_cases x where left(x.case_id, length(v_case_prefix)) = v_case_prefix)
    + (select count(*) from private.vivienda_case_creation_keys x where left(x.case_id, length(v_case_prefix)) = v_case_prefix)
    + (select count(*) from private.vivienda_case_lawyer_assignments x where left(x.case_id, length(v_case_prefix)) = v_case_prefix)
    + (select count(*) from private.vivienda_case_journal x where left(x.case_id, length(v_case_prefix)) = v_case_prefix)
    + (select count(*) from private.vivienda_data_authorizations x where left(x.case_id, length(v_case_prefix)) = v_case_prefix)
    + (select count(*) from private.vivienda_evidence_intents x where left(x.case_id, length(v_case_prefix)) = v_case_prefix)
    + (select count(*) from private.vivienda_evidence_metadata x where left(x.case_id, length(v_case_prefix)) = v_case_prefix)
  into v_case_rows;

  select count(*)
  into v_registry_rows
  from private.vivienda_evidence_objects o
  where left(o.intent_id, length(v_intent_prefix)) = v_intent_prefix;

  select count(*)
  into v_identity_rows
  from private.vivienda_identity_subjects i
  where i.subject_ref in (v_owner_ref, v_intruder_ref);

  return jsonb_build_object(
    'caseRows', v_case_rows,
    'registryRows', v_registry_rows,
    'identityRows', v_identity_rows
  );
end;
$$;

revoke all on function public.vivienda_dev_fixture_residue(text,text,text[]) from public, anon, authenticated;
grant execute on function public.vivienda_dev_fixture_residue(text,text,text[]) to service_role;

commit;
