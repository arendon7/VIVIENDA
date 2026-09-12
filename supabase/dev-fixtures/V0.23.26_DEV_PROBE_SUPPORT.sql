-- VIVIENDA V0.23.26 — DEV-ONLY provider parity support plane.
--
-- IMPORTANT:
--   1. This file is intentionally OUTSIDE supabase/migrations.
--   2. It must never be applied to STAGING or PROD.
--   3. It is service-role-only support for synthetic provider parity fixtures.
--   4. It does not activate runtime.server.ts and does not authorize deployment.
--   5. Canonical Case/intent state remains in the normal persistence schema; this file stores
--      only DEV probe telemetry and one-shot fault-control state.

begin;

create table if not exists private.vivienda_dev_probe_metrics (
  fixture_id text primary key,
  namespace text not null,
  scope text not null,
  storage_upload_grant_calls bigint not null default 0 check (storage_upload_grant_calls >= 0),
  storage_inspection_calls bigint not null default 0 check (storage_inspection_calls >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fixture_id ~ '^fx_[A-Za-z0-9_-]{8,40}$'),
  check (namespace ~ '^vivienda_dev_[A-Za-z0-9_-]{8,40}$'),
  check (scope in (
    'happy_path',
    'unauthenticated_prepare',
    'missing_data_authorization',
    'cross_case_access',
    'missing_uploaded_object',
    'rate_limit_unavailable'
  ))
);

create table if not exists private.vivienda_dev_probe_audit (
  sequence bigint generated always as identity primary key,
  fixture_id text not null,
  namespace text not null,
  scope text not null,
  operation text not null,
  status integer not null check (status between 100 and 599),
  error_code text null,
  recorded_at timestamptz not null default clock_timestamp(),
  check (fixture_id ~ '^fx_[A-Za-z0-9_-]{8,40}$'),
  check (namespace ~ '^vivienda_dev_[A-Za-z0-9_-]{8,40}$'),
  check (scope in (
    'happy_path',
    'unauthenticated_prepare',
    'missing_data_authorization',
    'cross_case_access',
    'missing_uploaded_object',
    'rate_limit_unavailable'
  )),
  check (operation in ('evidence.prepare','evidence.complete','evidence.download')),
  check (error_code is null or length(error_code) between 1 and 128)
);

create index if not exists vivienda_dev_probe_audit_fixture_idx
  on private.vivienda_dev_probe_audit(fixture_id, sequence);

create table if not exists private.vivienda_dev_probe_faults (
  receipt_id text primary key,
  fixture_id text not null,
  namespace text not null,
  scope text not null,
  operation text not null,
  mode text not null,
  armed_at timestamptz not null default clock_timestamp(),
  consumed_at timestamptz null,
  disarmed_at timestamptz null,
  check (receipt_id ~ '^fault_[A-Za-z0-9_-]{6,}$'),
  check (fixture_id ~ '^fx_[A-Za-z0-9_-]{8,40}$'),
  check (namespace ~ '^vivienda_dev_[A-Za-z0-9_-]{8,40}$'),
  check (scope = 'rate_limit_unavailable'),
  check (operation = 'evidence.prepare'),
  check (mode = 'rate_limit_unavailable_once'),
  check (disarmed_at is null or disarmed_at >= armed_at),
  check (consumed_at is null or consumed_at >= armed_at)
);

create unique index if not exists vivienda_dev_probe_one_active_fault_idx
  on private.vivienda_dev_probe_faults(fixture_id, operation, mode)
  where consumed_at is null and disarmed_at is null;

alter table private.vivienda_dev_probe_metrics enable row level security;
alter table private.vivienda_dev_probe_audit enable row level security;
alter table private.vivienda_dev_probe_faults enable row level security;

revoke all on private.vivienda_dev_probe_metrics from public, anon, authenticated;
revoke all on private.vivienda_dev_probe_audit from public, anon, authenticated;
revoke all on private.vivienda_dev_probe_faults from public, anon, authenticated;
grant select, insert, update, delete on private.vivienda_dev_probe_metrics to service_role;
grant select, insert, update, delete on private.vivienda_dev_probe_audit to service_role;
grant select, insert, update, delete on private.vivienda_dev_probe_faults to service_role;

create or replace function private.vivienda_dev_probe_assert_fixture(
  p_project_label text,
  p_fixture_id text,
  p_namespace text,
  p_scope text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_token text;
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

  if p_scope is null or p_scope not in (
    'happy_path',
    'unauthenticated_prepare',
    'missing_data_authorization',
    'cross_case_access',
    'missing_uploaded_object',
    'rate_limit_unavailable'
  ) then
    raise exception 'vivienda:probe_invalid_scope' using errcode = 'P0001';
  end if;

  return v_token;
end;
$$;

revoke all on function private.vivienda_dev_probe_assert_fixture(text,text,text,text) from public, anon, authenticated;
grant execute on function private.vivienda_dev_probe_assert_fixture(text,text,text,text) to service_role;

create or replace function private.vivienda_dev_probe_ensure_metrics(
  p_fixture_id text,
  p_namespace text,
  p_scope text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existing private.vivienda_dev_probe_metrics%rowtype;
begin
  select * into v_existing
  from private.vivienda_dev_probe_metrics m
  where m.fixture_id = p_fixture_id
  for update;

  if found then
    if v_existing.namespace is distinct from p_namespace
       or v_existing.scope is distinct from p_scope then
      raise exception 'vivienda:probe_fixture_mismatch' using errcode = 'P0001';
    end if;
    return;
  end if;

  insert into private.vivienda_dev_probe_metrics(fixture_id, namespace, scope)
  values (p_fixture_id, p_namespace, p_scope);
end;
$$;

revoke all on function private.vivienda_dev_probe_ensure_metrics(text,text,text) from public, anon, authenticated;
grant execute on function private.vivienda_dev_probe_ensure_metrics(text,text,text) to service_role;

create or replace function public.vivienda_dev_probe_record_storage_touch(
  p_project_label text,
  p_fixture_id text,
  p_namespace text,
  p_scope text,
  p_kind text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.vivienda_dev_probe_assert_fixture(
    p_project_label, p_fixture_id, p_namespace, p_scope
  );

  if p_kind not in ('upload_grant','inspection') then
    raise exception 'vivienda:probe_invalid_storage_touch' using errcode = 'P0001';
  end if;

  perform private.vivienda_dev_probe_ensure_metrics(p_fixture_id, p_namespace, p_scope);

  update private.vivienda_dev_probe_metrics m
  set storage_upload_grant_calls = m.storage_upload_grant_calls + case when p_kind = 'upload_grant' then 1 else 0 end,
      storage_inspection_calls = m.storage_inspection_calls + case when p_kind = 'inspection' then 1 else 0 end,
      updated_at = clock_timestamp()
  where m.fixture_id = p_fixture_id;
end;
$$;

create or replace function public.vivienda_dev_probe_record_audit(
  p_project_label text,
  p_fixture_id text,
  p_namespace text,
  p_scope text,
  p_operation text,
  p_status integer,
  p_error_code text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.vivienda_dev_probe_assert_fixture(
    p_project_label, p_fixture_id, p_namespace, p_scope
  );

  if p_operation not in ('evidence.prepare','evidence.complete','evidence.download')
     or p_status is null or p_status < 100 or p_status > 599
     or (p_error_code is not null and (length(p_error_code) < 1 or length(p_error_code) > 128)) then
    raise exception 'vivienda:probe_invalid_audit' using errcode = 'P0001';
  end if;

  insert into private.vivienda_dev_probe_audit(
    fixture_id, namespace, scope, operation, status, error_code
  ) values (
    p_fixture_id, p_namespace, p_scope, p_operation, p_status, p_error_code
  );
end;
$$;

create or replace function public.vivienda_dev_probe_observe(
  p_project_label text,
  p_fixture_id text,
  p_namespace text,
  p_scope text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
stable
as $$
declare
  v_token text;
  v_intent_prefix text;
  v_registry bigint;
  v_upload_grants bigint;
  v_inspections bigint;
  v_audit jsonb;
  v_observation_id text;
  v_observed_at timestamptz := clock_timestamp();
begin
  v_token := private.vivienda_dev_probe_assert_fixture(
    p_project_label, p_fixture_id, p_namespace, p_scope
  );
  v_intent_prefix := 'upl_' || p_namespace || '_';

  select count(*) into v_registry
  from private.vivienda_evidence_objects o
  where left(o.intent_id, length(v_intent_prefix)) = v_intent_prefix;

  select
    coalesce(m.storage_upload_grant_calls, 0),
    coalesce(m.storage_inspection_calls, 0)
  into v_upload_grants, v_inspections
  from (select 1) x
  left join private.vivienda_dev_probe_metrics m
    on m.fixture_id = p_fixture_id
   and m.namespace = p_namespace
   and m.scope = p_scope;

  select coalesce(
    jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'operation', a.operation,
        'status', a.status,
        'errorCode', a.error_code
      )) order by a.sequence
    ),
    '[]'::jsonb
  ) into v_audit
  from private.vivienda_dev_probe_audit a
  where a.fixture_id = p_fixture_id
    and a.namespace = p_namespace
    and a.scope = p_scope;

  v_observation_id := 'obs_' || v_token || '_' ||
    floor(extract(epoch from v_observed_at) * 1000)::bigint::text;

  return jsonb_build_object(
    'source', 'supabase_dev_observability',
    'observationId', v_observation_id,
    'fixtureId', p_fixture_id,
    'namespace', p_namespace,
    'scope', p_scope,
    'observedAt', to_char(v_observed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'complete', true,
    'registryRegistrations', v_registry,
    'storageUploadGrantCalls', v_upload_grants,
    'storageInspectionCalls', v_inspections,
    'auditOperations', v_audit
  );
end;
$$;

create or replace function public.vivienda_dev_probe_fault_arm(
  p_project_label text,
  p_fixture_id text,
  p_namespace text,
  p_scope text,
  p_operation text,
  p_mode text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_token text;
  v_receipt_id text;
  v_existing bigint;
begin
  v_token := private.vivienda_dev_probe_assert_fixture(
    p_project_label, p_fixture_id, p_namespace, p_scope
  );

  if p_scope <> 'rate_limit_unavailable'
     or p_operation <> 'evidence.prepare'
     or p_mode <> 'rate_limit_unavailable_once' then
    raise exception 'vivienda:probe_invalid_fault' using errcode = 'P0001';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_fixture_id || chr(31) || p_operation || chr(31) || p_mode, 0)
  );

  select count(*) into v_existing
  from private.vivienda_dev_probe_faults f
  where f.fixture_id = p_fixture_id
    and f.operation = p_operation
    and f.mode = p_mode
    and f.consumed_at is null
    and f.disarmed_at is null;

  if v_existing <> 0 then
    raise exception 'vivienda:probe_fault_already_armed' using errcode = 'P0001';
  end if;

  v_receipt_id := 'fault_' || v_token || '_' ||
    floor(extract(epoch from clock_timestamp()) * 1000000)::bigint::text;

  insert into private.vivienda_dev_probe_faults(
    receipt_id, fixture_id, namespace, scope, operation, mode
  ) values (
    v_receipt_id, p_fixture_id, p_namespace, p_scope, p_operation, p_mode
  );

  return jsonb_build_object(
    'receiptId', v_receipt_id,
    'fixtureId', p_fixture_id,
    'namespace', p_namespace,
    'operation', p_operation,
    'mode', p_mode,
    'armed', true
  );
end;
$$;

create or replace function public.vivienda_dev_probe_fault_consume(
  p_project_label text,
  p_fixture_id text,
  p_namespace text,
  p_scope text,
  p_operation text,
  p_mode text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_receipt_id text;
begin
  perform private.vivienda_dev_probe_assert_fixture(
    p_project_label, p_fixture_id, p_namespace, p_scope
  );

  if p_scope <> 'rate_limit_unavailable'
     or p_operation <> 'evidence.prepare'
     or p_mode <> 'rate_limit_unavailable_once' then
    raise exception 'vivienda:probe_invalid_fault' using errcode = 'P0001';
  end if;

  select f.receipt_id into v_receipt_id
  from private.vivienda_dev_probe_faults f
  where f.fixture_id = p_fixture_id
    and f.namespace = p_namespace
    and f.scope = p_scope
    and f.operation = p_operation
    and f.mode = p_mode
    and f.consumed_at is null
    and f.disarmed_at is null
  order by f.armed_at, f.receipt_id
  limit 1
  for update skip locked;

  if not found then
    return false;
  end if;

  update private.vivienda_dev_probe_faults f
  set consumed_at = clock_timestamp()
  where f.receipt_id = v_receipt_id;

  return true;
end;
$$;

create or replace function public.vivienda_dev_probe_fault_disarm(
  p_project_label text,
  p_fixture_id text,
  p_namespace text,
  p_scope text,
  p_receipt_id text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$;
begin
  perform private.vivienda_dev_probe_assert_fixture(
    p_project_label, p_fixture_id, p_namespace, p_scope
  );

  update private.vivienda_dev_probe_faults f
  set disarmed_at = coalesce(f.disarmed_at, clock_timestamp())
  where f.receipt_id = p_receipt_id
    and f.fixture_id = p_fixture_id
    and f.namespace = p_namespace
    and f.scope = p_scope
    and f.operation = 'evidence.prepare'
    and f.mode = 'rate_limit_unavailable_once';

  if not found then
    raise exception 'vivienda:probe_fault_not_found' using errcode = 'P0001';
  end if;
end;
$$;

-- Extend the V0.23.22 cleanup RPC without changing its public signature.
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
  v_fixture_id text;
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
  v_fixture_id := 'fx_' || v_token;
  v_owner_ref := 'sub_synthetic_' || v_token || '_owner';
  v_intruder_ref := 'sub_synthetic_' || v_token || '_intruder';

  if coalesce(cardinality(p_subject_refs), 0) <> 2
     or not coalesce(v_owner_ref = any(p_subject_refs), false)
     or not coalesce(v_intruder_ref = any(p_subject_refs), false) then
    raise exception 'vivienda:fixture_subject_mismatch' using errcode = 'P0001';
  end if;

  -- Probe-support rows must disappear in the same database purge as canonical fixture state.
  delete from private.vivienda_dev_probe_audit a
  where a.fixture_id = v_fixture_id and a.namespace = p_namespace;

  delete from private.vivienda_dev_probe_faults f
  where f.fixture_id = v_fixture_id and f.namespace = p_namespace;

  delete from private.vivienda_dev_probe_metrics m
  where m.fixture_id = v_fixture_id and m.namespace = p_namespace;

  v_case_prefix := 'case_' || p_namespace || '_';
  delete from private.vivienda_cases c
  where left(c.case_id, length(v_case_prefix)) = v_case_prefix;

  delete from private.vivienda_identity_subjects i
  where i.subject_ref in (v_owner_ref, v_intruder_ref);
end;
$$;

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
  v_fixture_id text;
  v_owner_ref text;
  v_intruder_ref text;
  v_case_prefix text;
  v_intent_prefix text;
  v_case_rows bigint;
  v_registry_rows bigint;
  v_identity_rows bigint;
  v_support_rows bigint;
begin
  if p_project_label is distinct from 'vivienda-dev' then
    raise exception 'vivienda:fixture_wrong_environment' using errcode = 'P0001';
  end if;

  if p_namespace is null or p_namespace !~ '^vivienda_dev_[A-Za-z0-9_-]{8,40}$' then
    raise exception 'vivienda:fixture_invalid_namespace' using errcode = 'P0001';
  end if;

  v_token := substring(p_namespace from '^vivienda_dev_([A-Za-z0-9_-]{8,40})$');
  v_fixture_id := 'fx_' || v_token;
  v_owner_ref := 'sub_synthetic_' || v_token || '_owner';
  v_intruder_ref := 'sub_synthetic_' || v_token || '_intruder';

  if coalesce(cardinality(p_subject_refs), 0) <> 2
     or not coalesce(v_owner_ref = any(p_subject_refs), false)
     or not coalesce(v_intruder_ref = any(p_subject_refs), false) then
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

  select count(*) into v_registry_rows
  from private.vivienda_evidence_objects o
  where left(o.intent_id, length(v_intent_prefix)) = v_intent_prefix;

  select count(*) into v_identity_rows
  from private.vivienda_identity_subjects i
  where i.subject_ref in (v_owner_ref, v_intruder_ref);

  select
      (select count(*) from private.vivienda_dev_probe_metrics m where m.fixture_id = v_fixture_id and m.namespace = p_namespace)
    + (select count(*) from private.vivienda_dev_probe_audit a where a.fixture_id = v_fixture_id and a.namespace = p_namespace)
    + (select count(*) from private.vivienda_dev_probe_faults f where f.fixture_id = v_fixture_id and f.namespace = p_namespace)
  into v_support_rows;

  return jsonb_build_object(
    'caseRows', v_case_rows,
    'registryRows', v_registry_rows,
    'identityRows', v_identity_rows,
    'supportRows', v_support_rows
  );
end;
$$;

-- Public DEV support RPCs are service-role only.
revoke all on function public.vivienda_dev_probe_record_storage_touch(text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.vivienda_dev_probe_record_audit(text,text,text,text,text,integer,text) from public, anon, authenticated;
revoke all on function public.vivienda_dev_probe_observe(text,text,text,text) from public, anon, authenticated;
revoke all on function public.vivienda_dev_probe_fault_arm(text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.vivienda_dev_probe_fault_consume(text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.vivienda_dev_probe_fault_disarm(text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.vivienda_dev_fixture_purge(text,text,text[]) from public, anon, authenticated;
revoke all on function public.vivienda_dev_fixture_residue(text,text,text[]) from public, anon, authenticated;

grant execute on function public.vivienda_dev_probe_record_storage_touch(text,text,text,text,text) to service_role;
grant execute on function public.vivienda_dev_probe_record_audit(text,text,text,text,text,integer,text) to service_role;
grant execute on function public.vivienda_dev_probe_observe(text,text,text,text) to service_role;
grant execute on function public.vivienda_dev_probe_fault_arm(text,text,text,text,text,text) to service_role;
grant execute on function public.vivienda_dev_probe_fault_consume(text,text,text,text,text,text) to service_role;
grant execute on function public.vivienda_dev_probe_fault_disarm(text,text,text,text,text) to service_role;
grant execute on function public.vivienda_dev_fixture_purge(text,text,text[]) to service_role;
grant execute on function public.vivienda_dev_fixture_residue(text,text,text[]) to service_role;

commit;
