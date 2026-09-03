-- VIVIENDA v0.7 — concurrency and journal-integrity hardening.
-- Applied after schema/RPC/least-privilege migrations.

begin;

-- Enforce contiguous append semantics even if a privileged caller bypasses the TypeScript application service.
create or replace function private.vivienda_guard_journal_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current_version integer;
  v_has_history boolean;
begin
  select c.current_version
  into v_current_version
  from private.vivienda_cases c
  where c.case_id = new.case_id
  for update;

  if not found then
    raise exception 'vivienda:case_not_found' using errcode = 'P0001';
  end if;

  select exists (
    select 1
    from private.vivienda_case_journal j
    where j.case_id = new.case_id
  ) into v_has_history;

  if not v_has_history then
    if new.sequence <> 1
       or new.event_type <> 'CASE_CREATED'
       or v_current_version <> 1 then
      raise exception 'vivienda:duplicate_sequence' using errcode = 'P0001';
    end if;
  else
    if new.event_type = 'CASE_CREATED' then
      raise exception 'vivienda:duplicate_sequence' using errcode = 'P0001';
    end if;

    if new.sequence <> v_current_version + 1 then
      raise exception 'vivienda:duplicate_sequence' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.vivienda_guard_journal_insert() from public, anon, authenticated;
grant execute on function private.vivienda_guard_journal_insert() to service_role;

drop trigger if exists vivienda_case_journal_insert_guard on private.vivienda_case_journal;
create trigger vivienda_case_journal_insert_guard
before insert on private.vivienda_case_journal
for each row
execute function private.vivienda_guard_journal_insert();

-- Creation idempotency must also hold for two concurrent requests where no creation-key row exists yet.
-- A transaction-scoped advisory lock serializes only the same owner+idempotency tuple.
create or replace function public.vivienda_persist_create_case(
  p_case_id text,
  p_owner_subject_ref text,
  p_creation_idempotency_key text,
  p_creation_fingerprint text,
  p_first_record jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existing private.vivienda_case_creation_keys%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_owner_subject_ref || chr(31) || p_creation_idempotency_key,
      0
    )
  );

  select * into v_existing
  from private.vivienda_case_creation_keys
  where owner_subject_ref = p_owner_subject_ref
    and idempotency_key = p_creation_idempotency_key;

  if found then
    if v_existing.semantic_fingerprint <> p_creation_fingerprint then
      raise exception 'vivienda:idempotency_conflict' using errcode = 'P0001';
    end if;
    return jsonb_build_object(
      'kind', 'duplicate',
      'snapshot', private.vivienda_case_snapshot(v_existing.case_id)
    );
  end if;

  if (p_first_record->'event'->>'caseId') is distinct from p_case_id
     or (p_first_record->'event'->>'sequence')::integer <> 1
     or (p_first_record->'event'->>'type') is distinct from 'CASE_CREATED' then
    raise exception 'vivienda:duplicate_sequence' using errcode = 'P0001';
  end if;

  insert into private.vivienda_cases(case_id, owner_subject_ref, current_version)
  values (p_case_id, p_owner_subject_ref, 1);

  perform private.vivienda_insert_journal_record(p_first_record);

  insert into private.vivienda_case_creation_keys(
    owner_subject_ref, idempotency_key, semantic_fingerprint, case_id
  ) values (
    p_owner_subject_ref, p_creation_idempotency_key, p_creation_fingerprint, p_case_id
  );

  return jsonb_build_object(
    'kind', 'created',
    'snapshot', private.vivienda_case_snapshot(p_case_id)
  );
exception
  when unique_violation then
    raise exception 'vivienda:invalid_identifier' using errcode = 'P0001';
end;
$$;

revoke all on function public.vivienda_persist_create_case(text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.vivienda_persist_create_case(text,text,text,text,jsonb) to service_role;

-- Generic append may not bypass the specialized atomic privacy/evidence operations or create a second case root.
create or replace function public.vivienda_persist_append_journal(
  p_case_id text,
  p_expected_version integer,
  p_record jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_case private.vivienda_cases%rowtype;
  v_existing private.vivienda_case_journal%rowtype;
  v_key text := p_record->'event'->>'idempotencyKey';
  v_fp text := p_record->>'semanticFingerprint';
  v_sequence integer := (p_record->'event'->>'sequence')::integer;
  v_type text := p_record->'event'->>'type';
begin
  if v_type in ('CASE_CREATED', 'DATA_AUTHORIZATION_RECORDED', 'EVIDENCE_ATTACHED') then
    raise exception 'vivienda:reserved_operation' using errcode = 'P0001';
  end if;

  select * into v_case
  from private.vivienda_cases
  where case_id = p_case_id
  for update;

  if not found then
    raise exception 'vivienda:case_not_found' using errcode = 'P0001';
  end if;

  select * into v_existing
  from private.vivienda_case_journal
  where case_id = p_case_id and idempotency_key = v_key;

  if found then
    if v_existing.semantic_fingerprint <> v_fp then
      raise exception 'vivienda:idempotency_conflict' using errcode = 'P0001';
    end if;
    return jsonb_build_object(
      'kind', 'duplicate',
      'snapshot', private.vivienda_case_snapshot(p_case_id)
    );
  end if;

  if p_expected_version <> v_case.current_version then
    raise exception 'vivienda:version_conflict' using errcode = 'P0001';
  end if;

  if v_sequence <> v_case.current_version + 1
     or (p_record->'event'->>'caseId') is distinct from p_case_id then
    raise exception 'vivienda:duplicate_sequence' using errcode = 'P0001';
  end if;

  perform private.vivienda_insert_journal_record(p_record);

  update private.vivienda_cases
  set current_version = current_version + 1,
      updated_at = now()
  where case_id = p_case_id;

  return jsonb_build_object(
    'kind', 'appended',
    'snapshot', private.vivienda_case_snapshot(p_case_id)
  );
exception
  when unique_violation then
    raise exception 'vivienda:duplicate_event_id' using errcode = 'P0001';
end;
$$;

revoke all on function public.vivienda_persist_append_journal(text,integer,jsonb) from public, anon, authenticated;
grant execute on function public.vivienda_persist_append_journal(text,integer,jsonb) to service_role;

-- Orphan object cleanup is two-phase: mark an intent expired, delete the object from Storage,
-- then record physical deletion here. A failed Storage delete therefore never gets falsely marked deleted.
create or replace function public.vivienda_persist_mark_orphan_object_deleted(
  p_storage_locator text,
  p_deleted_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update private.vivienda_evidence_objects o
  set deleted_at = p_deleted_at
  where o.storage_locator = p_storage_locator
    and o.deleted_at is null
    and exists (
      select 1
      from private.vivienda_evidence_intents i
      where i.intent_id = o.intent_id
        and i.status = 'expired'
    );

  if not found then
    raise exception 'vivienda:evidence_not_found' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.vivienda_persist_mark_orphan_object_deleted(text,timestamptz) from public, anon, authenticated;
grant execute on function public.vivienda_persist_mark_orphan_object_deleted(text,timestamptz) to service_role;

commit;
