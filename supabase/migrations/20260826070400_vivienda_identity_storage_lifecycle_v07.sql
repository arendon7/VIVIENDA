-- VIVIENDA v0.7 — immutable identity mapping and truthful physical deletion lifecycle.

begin;

alter table private.vivienda_evidence_objects
  add column if not exists deletion_requested_at timestamptz null;

-- auth_user_id -> subjectRef is stable once provisioned. A retry may reactivate/update the kind,
-- but may never silently replace the opaque domain identity behind existing cases.
create or replace function public.vivienda_persist_upsert_identity(
  p_auth_user_id uuid,
  p_subject_ref text,
  p_principal_kind text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existing_subject text;
begin
  select i.subject_ref
  into v_existing_subject
  from private.vivienda_identity_subjects i
  where i.auth_user_id = p_auth_user_id
  for update;

  if found then
    if v_existing_subject is distinct from p_subject_ref then
      raise exception 'vivienda:invalid_subject_ref' using errcode = 'P0001';
    end if;

    update private.vivienda_identity_subjects
    set principal_kind = p_principal_kind,
        status = 'active',
        updated_at = now()
    where auth_user_id = p_auth_user_id;
    return;
  end if;

  if exists (
    select 1
    from private.vivienda_identity_subjects i
    where i.subject_ref = p_subject_ref
  ) then
    raise exception 'vivienda:invalid_subject_ref' using errcode = 'P0001';
  end if;

  insert into private.vivienda_identity_subjects(
    auth_user_id, subject_ref, principal_kind, status
  ) values (
    p_auth_user_id, p_subject_ref, p_principal_kind, 'active'
  );
end;
$$;

revoke all on function public.vivienda_persist_upsert_identity(uuid,text,text) from public, anon, authenticated;
grant execute on function public.vivienda_persist_upsert_identity(uuid,text,text) to service_role;

-- Tombstone makes the evidence unavailable immediately but records only a deletion request for Storage.
create or replace function public.vivienda_persist_tombstone_evidence(
  p_case_id text,
  p_evidence_id text,
  p_at timestamptz,
  p_reason text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_lifecycle text;
  v_locator text;
begin
  select lifecycle, storage_locator
  into v_lifecycle, v_locator
  from private.vivienda_evidence_metadata
  where case_id = p_case_id and evidence_id = p_evidence_id
  for update;

  if not found then
    raise exception 'vivienda:evidence_not_found' using errcode = 'P0001';
  end if;

  if v_lifecycle = 'legal_hold' then
    raise exception 'vivienda:evidence_on_legal_hold' using errcode = 'P0001';
  end if;

  update private.vivienda_evidence_metadata
  set mime_type = null,
      byte_size = null,
      checksum_sha256 = null,
      storage_locator = null,
      lifecycle = 'tombstoned',
      tombstoned_at = p_at,
      tombstone_reason = p_reason
  where case_id = p_case_id and evidence_id = p_evidence_id;

  update private.vivienda_evidence_objects
  set deletion_requested_at = coalesce(deletion_requested_at, p_at)
  where storage_locator = v_locator and deleted_at is null;
end;
$$;

revoke all on function public.vivienda_persist_tombstone_evidence(text,text,timestamptz,text) from public, anon, authenticated;
grant execute on function public.vivienda_persist_tombstone_evidence(text,text,timestamptz,text) to service_role;

-- The old orphan-specific confirmation is replaced by one physical-deletion confirmation
-- usable for both expired quarantine objects and tombstoned evidence.
revoke all on function public.vivienda_persist_mark_orphan_object_deleted(text,timestamptz) from public, anon, authenticated, service_role;
drop function if exists public.vivienda_persist_mark_orphan_object_deleted(text,timestamptz);

create or replace function public.vivienda_persist_mark_evidence_object_deleted(
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
    and (
      exists (
        select 1
        from private.vivienda_evidence_intents i
        where i.intent_id = o.intent_id and i.status = 'expired'
      )
      or exists (
        select 1
        from private.vivienda_evidence_metadata e
        where e.evidence_id = o.evidence_id and e.lifecycle = 'tombstoned'
      )
    );

  if not found then
    raise exception 'vivienda:evidence_not_found' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.vivienda_persist_mark_evidence_object_deleted(text,timestamptz) from public, anon, authenticated;
grant execute on function public.vivienda_persist_mark_evidence_object_deleted(text,timestamptz) to service_role;

-- Storage coordinator reads only opaque/physical coordinates for objects whose deletion is requested.
create or replace function public.vivienda_persist_list_pending_object_deletions(
  p_limit integer default 100
)
returns table(
  storage_locator text,
  bucket_id text,
  object_path text,
  deletion_requested_at timestamptz
)
language sql
security invoker
set search_path = ''
stable
as $$
  select o.storage_locator, o.bucket_id, o.object_path, o.deletion_requested_at
  from private.vivienda_evidence_objects o
  where o.deletion_requested_at is not null
    and o.deleted_at is null
  order by o.deletion_requested_at, o.storage_locator
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

revoke all on function public.vivienda_persist_list_pending_object_deletions(integer) from public, anon, authenticated;
grant execute on function public.vivienda_persist_list_pending_object_deletions(integer) to service_role;

commit;
