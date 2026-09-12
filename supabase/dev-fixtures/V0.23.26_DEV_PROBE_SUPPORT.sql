-- VIVIENDA V0.23.26 — DEV-ONLY provider parity support plane.
-- Intentionally OUTSIDE supabase/migrations. Never apply to STAGING/PROD.
-- Service-role only. Synthetic fixtures only. No runtime activation authority.

begin;

create table if not exists private.vivienda_dev_probe_metrics (
  fixture_id text primary key check (fixture_id ~ '^fx_[A-Za-z0-9_-]{8,40}$'),
  namespace text not null check (namespace ~ '^vivienda_dev_[A-Za-z0-9_-]{8,40}$'),
  scope text not null check (scope in ('happy_path','unauthenticated_prepare','missing_data_authorization','cross_case_access','missing_uploaded_object','rate_limit_unavailable')),
  storage_upload_grant_calls bigint not null default 0 check (storage_upload_grant_calls >= 0),
  storage_inspection_calls bigint not null default 0 check (storage_inspection_calls >= 0),
  updated_at timestamptz not null default clock_timestamp()
);

create table if not exists private.vivienda_dev_probe_audit (
  sequence bigint generated always as identity primary key,
  fixture_id text not null check (fixture_id ~ '^fx_[A-Za-z0-9_-]{8,40}$'),
  namespace text not null check (namespace ~ '^vivienda_dev_[A-Za-z0-9_-]{8,40}$'),
  scope text not null check (scope in ('happy_path','unauthenticated_prepare','missing_data_authorization','cross_case_access','missing_uploaded_object','rate_limit_unavailable')),
  operation text not null check (operation in ('evidence.prepare','evidence.complete','evidence.download')),
  status integer not null check (status between 100 and 599),
  error_code text null check (error_code is null or length(error_code) between 1 and 128),
  recorded_at timestamptz not null default clock_timestamp()
);
create index if not exists vivienda_dev_probe_audit_fixture_idx
  on private.vivienda_dev_probe_audit(fixture_id, sequence);

create table if not exists private.vivienda_dev_probe_faults (
  receipt_id text primary key check (receipt_id ~ '^fault_[A-Za-z0-9_-]{6,}$'),
  fixture_id text not null check (fixture_id ~ '^fx_[A-Za-z0-9_-]{8,40}$'),
  namespace text not null check (namespace ~ '^vivienda_dev_[A-Za-z0-9_-]{8,40}$'),
  scope text not null check (scope = 'rate_limit_unavailable'),
  operation text not null check (operation = 'evidence.prepare'),
  mode text not null check (mode = 'rate_limit_unavailable_once'),
  armed_at timestamptz not null default clock_timestamp(),
  consumed_at timestamptz null,
  disarmed_at timestamptz null,
  check (consumed_at is null or consumed_at >= armed_at),
  check (disarmed_at is null or disarmed_at >= armed_at)
);
create unique index if not exists vivienda_dev_probe_one_active_fault_idx
  on private.vivienda_dev_probe_faults(fixture_id, operation, mode)
  where consumed_at is null and disarmed_at is null;

alter table private.vivienda_dev_probe_metrics enable row level security;
alter table private.vivienda_dev_probe_audit enable row level security;
alter table private.vivienda_dev_probe_faults enable row level security;
revoke all on private.vivienda_dev_probe_metrics, private.vivienda_dev_probe_audit, private.vivienda_dev_probe_faults from public, anon, authenticated;
grant select, insert, update, delete on private.vivienda_dev_probe_metrics, private.vivienda_dev_probe_audit, private.vivienda_dev_probe_faults to service_role;
grant usage, select on all sequences in schema private to service_role;

create or replace function private.vivienda_dev_probe_assert_fixture(
  p_project_label text, p_fixture_id text, p_namespace text, p_scope text
)
returns text language plpgsql security invoker set search_path = '' as $$
declare v_token text;
begin
  if p_project_label is distinct from 'vivienda-dev' then
    raise exception 'vivienda:probe_wrong_environment' using errcode = 'P0001';
  end if;
  if p_namespace is null or p_namespace !~ '^vivienda_dev_[A-Za-z0-9_-]{8,40}$' then
    raise exception 'vivienda:probe_invalid_namespace' using errcode = 'P0001';
  end if;
  v_token := substring(p_namespace from '^vivienda_dev_([A-Za-z0-9_-]{8,40})$');
  if p_fixture_id is distinct from ('fx_' || v_token) then
    raise exception 'vivienda:probe_fixture_mismatch' using errcode = 'P0001';
  end if;
  if p_scope is null or p_scope not in ('happy_path','unauthenticated_prepare','missing_data_authorization','cross_case_access','missing_uploaded_object','rate_limit_unavailable') then
    raise exception 'vivienda:probe_invalid_scope' using errcode = 'P0001';
  end if;
  return v_token;
end;
$$;

create or replace function private.vivienda_dev_probe_ensure_metrics(
  p_fixture_id text, p_namespace text, p_scope text
)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_existing private.vivienda_dev_probe_metrics%rowtype;
begin
  select * into v_existing from private.vivienda_dev_probe_metrics where fixture_id = p_fixture_id for update;
  if found then
    if v_existing.namespace is distinct from p_namespace or v_existing.scope is distinct from p_scope then
      raise exception 'vivienda:probe_fixture_mismatch' using errcode = 'P0001';
    end if;
    return;
  end if;
  insert into private.vivienda_dev_probe_metrics(fixture_id, namespace, scope)
  values (p_fixture_id, p_namespace, p_scope);
end;
$$;

create or replace function public.vivienda_dev_probe_record_storage_touch(
  p_project_label text, p_fixture_id text, p_namespace text, p_scope text, p_kind text
)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform private.vivienda_dev_probe_assert_fixture(p_project_label,p_fixture_id,p_namespace,p_scope);
  if p_kind not in ('upload_grant','inspection') then
    raise exception 'vivienda:probe_invalid_storage_touch' using errcode = 'P0001';
  end if;
  perform private.vivienda_dev_probe_ensure_metrics(p_fixture_id,p_namespace,p_scope);
  update private.vivienda_dev_probe_metrics
  set storage_upload_grant_calls = storage_upload_grant_calls + case when p_kind='upload_grant' then 1 else 0 end,
      storage_inspection_calls = storage_inspection_calls + case when p_kind='inspection' then 1 else 0 end,
      updated_at = clock_timestamp()
  where fixture_id = p_fixture_id;
end;
$$;

create or replace function public.vivienda_dev_probe_record_audit(
  p_project_label text, p_fixture_id text, p_namespace text, p_scope text,
  p_operation text, p_status integer, p_error_code text
)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform private.vivienda_dev_probe_assert_fixture(p_project_label,p_fixture_id,p_namespace,p_scope);
  if p_operation not in ('evidence.prepare','evidence.complete','evidence.download')
     or p_status is null or p_status < 100 or p_status > 599
     or (p_error_code is not null and (length(p_error_code) < 1 or length(p_error_code) > 128)) then
    raise exception 'vivienda:probe_invalid_audit' using errcode = 'P0001';
  end if;
  insert into private.vivienda_dev_probe_audit(fixture_id,namespace,scope,operation,status,error_code)
  values (p_fixture_id,p_namespace,p_scope,p_operation,p_status,p_error_code);
end;
$$;

create or replace function public.vivienda_dev_probe_observe(
  p_project_label text, p_fixture_id text, p_namespace text, p_scope text
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_token text; v_prefix text; v_registry bigint; v_upload bigint; v_inspect bigint;
  v_audit jsonb; v_at timestamptz := clock_timestamp();
begin
  v_token := private.vivienda_dev_probe_assert_fixture(p_project_label,p_fixture_id,p_namespace,p_scope);
  v_prefix := 'upl_' || p_namespace || '_';
  select count(*) into v_registry from private.vivienda_evidence_objects where left(intent_id,length(v_prefix)) = v_prefix;
  select coalesce(max(storage_upload_grant_calls),0), coalesce(max(storage_inspection_calls),0)
    into v_upload,v_inspect
    from private.vivienda_dev_probe_metrics
    where fixture_id=p_fixture_id and namespace=p_namespace and scope=p_scope;
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('operation',operation,'status',status,'errorCode',error_code)) order by sequence),'[]'::jsonb)
    into v_audit from private.vivienda_dev_probe_audit
    where fixture_id=p_fixture_id and namespace=p_namespace and scope=p_scope;
  return jsonb_build_object(
    'source','supabase_dev_observability',
    'observationId','obs_' || v_token || '_' || floor(extract(epoch from v_at)*1000)::bigint::text,
    'fixtureId',p_fixture_id,'namespace',p_namespace,'scope',p_scope,
    'observedAt',to_char(v_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'complete',true,
    'registryRegistrations',v_registry,'storageUploadGrantCalls',v_upload,'storageInspectionCalls',v_inspect,
    'auditOperations',v_audit
  );
end;
$$;

create or replace function public.vivienda_dev_probe_fault_arm(
  p_project_label text, p_fixture_id text, p_namespace text, p_scope text,
  p_operation text, p_mode text
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_token text; v_receipt text;
begin
  v_token := private.vivienda_dev_probe_assert_fixture(p_project_label,p_fixture_id,p_namespace,p_scope);
  if p_scope <> 'rate_limit_unavailable' or p_operation <> 'evidence.prepare' or p_mode <> 'rate_limit_unavailable_once' then
    raise exception 'vivienda:probe_invalid_fault' using errcode = 'P0001';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_fixture_id || chr(31) || p_operation || chr(31) || p_mode,0));
  if exists(select 1 from private.vivienda_dev_probe_faults where fixture_id=p_fixture_id and operation=p_operation and mode=p_mode and consumed_at is null and disarmed_at is null) then
    raise exception 'vivienda:probe_fault_already_armed' using errcode = 'P0001';
  end if;
  v_receipt := 'fault_' || v_token || '_' || floor(extract(epoch from clock_timestamp())*1000000)::bigint::text;
  insert into private.vivienda_dev_probe_faults(receipt_id,fixture_id,namespace,scope,operation,mode)
  values(v_receipt,p_fixture_id,p_namespace,p_scope,p_operation,p_mode);
  return jsonb_build_object('receiptId',v_receipt,'fixtureId',p_fixture_id,'namespace',p_namespace,'operation',p_operation,'mode',p_mode,'armed',true);
end;
$$;

create or replace function public.vivienda_dev_probe_fault_consume(
  p_project_label text, p_fixture_id text, p_namespace text, p_scope text,
  p_operation text, p_mode text
)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_receipt text;
begin
  perform private.vivienda_dev_probe_assert_fixture(p_project_label,p_fixture_id,p_namespace,p_scope);
  if p_scope <> 'rate_limit_unavailable' or p_operation <> 'evidence.prepare' or p_mode <> 'rate_limit_unavailable_once' then
    raise exception 'vivienda:probe_invalid_fault' using errcode = 'P0001';
  end if;
  select receipt_id into v_receipt from private.vivienda_dev_probe_faults
    where fixture_id=p_fixture_id and namespace=p_namespace and scope=p_scope and operation=p_operation and mode=p_mode
      and consumed_at is null and disarmed_at is null
    order by armed_at,receipt_id limit 1 for update skip locked;
  if not found then return false; end if;
  update private.vivienda_dev_probe_faults set consumed_at=clock_timestamp() where receipt_id=v_receipt;
  return true;
end;
$$;

create or replace function public.vivienda_dev_probe_fault_disarm(
  p_project_label text, p_fixture_id text, p_namespace text, p_scope text, p_receipt_id text
)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform private.vivienda_dev_probe_assert_fixture(p_project_label,p_fixture_id,p_namespace,p_scope);
  update private.vivienda_dev_probe_faults
    set disarmed_at=coalesce(disarmed_at,clock_timestamp())
    where receipt_id=p_receipt_id and fixture_id=p_fixture_id and namespace=p_namespace and scope=p_scope
      and operation='evidence.prepare' and mode='rate_limit_unavailable_once';
  if not found then raise exception 'vivienda:probe_fault_not_found' using errcode = 'P0001'; end if;
end;
$$;

create or replace function public.vivienda_dev_probe_support_residue(
  p_project_label text, p_namespace text
)
returns bigint language plpgsql security invoker set search_path = '' stable as $$
declare v_token text; v_fixture text; v_count bigint;
begin
  if p_project_label is distinct from 'vivienda-dev' or p_namespace is null or p_namespace !~ '^vivienda_dev_[A-Za-z0-9_-]{8,40}$' then
    raise exception 'vivienda:probe_invalid_namespace' using errcode = 'P0001';
  end if;
  v_token := substring(p_namespace from '^vivienda_dev_([A-Za-z0-9_-]{8,40})$');
  v_fixture := 'fx_' || v_token;
  select
      (select count(*) from private.vivienda_dev_probe_metrics where fixture_id=v_fixture and namespace=p_namespace)
    + (select count(*) from private.vivienda_dev_probe_audit where fixture_id=v_fixture and namespace=p_namespace)
    + (select count(*) from private.vivienda_dev_probe_faults where fixture_id=v_fixture and namespace=p_namespace)
    into v_count;
  return v_count;
end;
$$;

-- Extend V0.23.22 cleanup under the same public signatures.
create or replace function public.vivienda_dev_fixture_purge(
  p_project_label text, p_namespace text, p_subject_refs text[]
)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_token text; v_fixture text; v_owner text; v_intruder text; v_case_prefix text;
begin
  if p_project_label is distinct from 'vivienda-dev' or p_namespace is null or p_namespace !~ '^vivienda_dev_[A-Za-z0-9_-]{8,40}$' then
    raise exception 'vivienda:fixture_wrong_environment' using errcode = 'P0001';
  end if;
  v_token := substring(p_namespace from '^vivienda_dev_([A-Za-z0-9_-]{8,40})$');
  v_fixture := 'fx_' || v_token;
  v_owner := 'sub_synthetic_' || v_token || '_owner';
  v_intruder := 'sub_synthetic_' || v_token || '_intruder';
  if coalesce(cardinality(p_subject_refs),0) <> 2 or not coalesce(v_owner=any(p_subject_refs),false) or not coalesce(v_intruder=any(p_subject_refs),false) then
    raise exception 'vivienda:fixture_subject_mismatch' using errcode = 'P0001';
  end if;
  delete from private.vivienda_dev_probe_audit where fixture_id=v_fixture and namespace=p_namespace;
  delete from private.vivienda_dev_probe_faults where fixture_id=v_fixture and namespace=p_namespace;
  delete from private.vivienda_dev_probe_metrics where fixture_id=v_fixture and namespace=p_namespace;
  v_case_prefix := 'case_' || p_namespace || '_';
  delete from private.vivienda_cases where left(case_id,length(v_case_prefix))=v_case_prefix;
  delete from private.vivienda_identity_subjects where subject_ref in (v_owner,v_intruder);
end;
$$;

create or replace function public.vivienda_dev_fixture_residue(
  p_project_label text, p_namespace text, p_subject_refs text[]
)
returns jsonb language plpgsql security invoker set search_path = '' stable as $$
declare
  v_token text; v_fixture text; v_owner text; v_intruder text; v_case_prefix text; v_intent_prefix text;
  v_case bigint; v_registry bigint; v_identity bigint; v_support bigint;
begin
  if p_project_label is distinct from 'vivienda-dev' or p_namespace is null or p_namespace !~ '^vivienda_dev_[A-Za-z0-9_-]{8,40}$' then
    raise exception 'vivienda:fixture_wrong_environment' using errcode = 'P0001';
  end if;
  v_token := substring(p_namespace from '^vivienda_dev_([A-Za-z0-9_-]{8,40})$');
  v_fixture := 'fx_' || v_token; v_owner := 'sub_synthetic_' || v_token || '_owner'; v_intruder := 'sub_synthetic_' || v_token || '_intruder';
  if coalesce(cardinality(p_subject_refs),0) <> 2 or not coalesce(v_owner=any(p_subject_refs),false) or not coalesce(v_intruder=any(p_subject_refs),false) then
    raise exception 'vivienda:fixture_subject_mismatch' using errcode = 'P0001';
  end if;
  v_case_prefix := 'case_' || p_namespace || '_'; v_intent_prefix := 'upl_' || p_namespace || '_';
  select
      (select count(*) from private.vivienda_cases where left(case_id,length(v_case_prefix))=v_case_prefix)
    + (select count(*) from private.vivienda_case_creation_keys where left(case_id,length(v_case_prefix))=v_case_prefix)
    + (select count(*) from private.vivienda_case_lawyer_assignments where left(case_id,length(v_case_prefix))=v_case_prefix)
    + (select count(*) from private.vivienda_case_journal where left(case_id,length(v_case_prefix))=v_case_prefix)
    + (select count(*) from private.vivienda_data_authorizations where left(case_id,length(v_case_prefix))=v_case_prefix)
    + (select count(*) from private.vivienda_evidence_intents where left(case_id,length(v_case_prefix))=v_case_prefix)
    + (select count(*) from private.vivienda_evidence_metadata where left(case_id,length(v_case_prefix))=v_case_prefix)
    into v_case;
  select count(*) into v_registry from private.vivienda_evidence_objects where left(intent_id,length(v_intent_prefix))=v_intent_prefix;
  select count(*) into v_identity from private.vivienda_identity_subjects where subject_ref in (v_owner,v_intruder);
  select public.vivienda_dev_probe_support_residue(p_project_label,p_namespace) into v_support;
  return jsonb_build_object('caseRows',v_case,'registryRows',v_registry,'identityRows',v_identity,'supportRows',v_support);
end;
$$;

revoke all on function private.vivienda_dev_probe_assert_fixture(text,text,text,text) from public,anon,authenticated;
revoke all on function private.vivienda_dev_probe_ensure_metrics(text,text,text) from public,anon,authenticated;
grant execute on function private.vivienda_dev_probe_assert_fixture(text,text,text,text) to service_role;
grant execute on function private.vivienda_dev_probe_ensure_metrics(text,text,text) to service_role;

revoke all on function public.vivienda_dev_probe_record_storage_touch(text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.vivienda_dev_probe_record_audit(text,text,text,text,text,integer,text) from public,anon,authenticated;
revoke all on function public.vivienda_dev_probe_observe(text,text,text,text) from public,anon,authenticated;
revoke all on function public.vivienda_dev_probe_fault_arm(text,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.vivienda_dev_probe_fault_consume(text,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.vivienda_dev_probe_fault_disarm(text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.vivienda_dev_probe_support_residue(text,text) from public,anon,authenticated;
revoke all on function public.vivienda_dev_fixture_purge(text,text,text[]) from public,anon,authenticated;
revoke all on function public.vivienda_dev_fixture_residue(text,text,text[]) from public,anon,authenticated;

grant execute on function public.vivienda_dev_probe_record_storage_touch(text,text,text,text,text) to service_role;
grant execute on function public.vivienda_dev_probe_record_audit(text,text,text,text,text,integer,text) to service_role;
grant execute on function public.vivienda_dev_probe_observe(text,text,text,text) to service_role;
grant execute on function public.vivienda_dev_probe_fault_arm(text,text,text,text,text,text) to service_role;
grant execute on function public.vivienda_dev_probe_fault_consume(text,text,text,text,text,text) to service_role;
grant execute on function public.vivienda_dev_probe_fault_disarm(text,text,text,text,text) to service_role;
grant execute on function public.vivienda_dev_probe_support_residue(text,text) to service_role;
grant execute on function public.vivienda_dev_fixture_purge(text,text,text[]) to service_role;
grant execute on function public.vivienda_dev_fixture_residue(text,text,text[]) to service_role;

commit;
