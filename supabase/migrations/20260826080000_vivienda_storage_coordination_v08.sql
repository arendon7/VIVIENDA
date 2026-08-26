-- VIVIENDA v0.8 — service-only physical object resolvers for Storage coordination.
-- Provider-ready; not applied to a live project by this commit.

begin;

create or replace function public.vivienda_persist_resolve_intent_object(
  p_intent_id text
)
returns table(
  intent_id text,
  evidence_id text,
  case_id text,
  status text,
  expires_at timestamptz,
  storage_locator text,
  bucket_id text,
  object_path text,
  deleted_at timestamptz
)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    i.intent_id,
    i.evidence_id,
    i.case_id,
    i.status,
    i.expires_at,
    o.storage_locator,
    o.bucket_id,
    o.object_path,
    o.deleted_at
  from private.vivienda_evidence_intents i
  join private.vivienda_evidence_objects o
    on o.intent_id = i.intent_id
   and o.evidence_id = i.evidence_id
  where i.intent_id = p_intent_id
  limit 1;
$$;

revoke all on function public.vivienda_persist_resolve_intent_object(text)
  from public, anon, authenticated;
grant execute on function public.vivienda_persist_resolve_intent_object(text)
  to service_role;

create or replace function public.vivienda_persist_resolve_active_evidence_object(
  p_case_id text,
  p_evidence_id text
)
returns table(
  evidence_id text,
  case_id text,
  storage_locator text,
  bucket_id text,
  object_path text
)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    e.evidence_id,
    e.case_id,
    o.storage_locator,
    o.bucket_id,
    o.object_path
  from private.vivienda_evidence_metadata e
  join private.vivienda_evidence_objects o
    on o.storage_locator = e.storage_locator
   and o.evidence_id = e.evidence_id
  where e.case_id = p_case_id
    and e.evidence_id = p_evidence_id
    and e.lifecycle = 'active'
    and e.storage_locator is not null
    and o.deleted_at is null
    and o.deletion_requested_at is null
  limit 1;
$$;

revoke all on function public.vivienda_persist_resolve_active_evidence_object(text,text)
  from public, anon, authenticated;
grant execute on function public.vivienda_persist_resolve_active_evidence_object(text,text)
  to service_role;

commit;
