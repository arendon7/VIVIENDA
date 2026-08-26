-- VIVIENDA v0.8 — retry-safe cleanup for expired quarantine objects.
-- An object whose first Storage delete fails must remain discoverable on later worker runs.
-- Expired intents that never acquired a physical object are intentionally not returned.

begin;

create or replace function public.vivienda_persist_expire_evidence_intents(
  p_before timestamptz default now()
)
returns table(intent_id text, storage_locator text, object_path text)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update private.vivienda_evidence_intents i
  set status = 'expired'
  where i.status = 'quarantine'
    and i.expires_at <= p_before;

  -- Return every expired intent whose reserved physical object is still unconfirmed as deleted,
  -- not only rows transitioned by this invocation. INNER JOIN deliberately excludes intents that
  -- never acquired a physical mapping, because there is nothing for the Storage worker to delete.
  return query
  select i.intent_id, o.storage_locator, o.object_path
  from private.vivienda_evidence_intents i
  join private.vivienda_evidence_objects o
    on o.intent_id = i.intent_id
   and o.evidence_id = i.evidence_id
  where i.status = 'expired'
    and i.expires_at <= p_before
    and o.deleted_at is null
  order by i.expires_at, i.intent_id;
end;
$$;

revoke all on function public.vivienda_persist_expire_evidence_intents(timestamptz)
  from public, anon, authenticated;
grant execute on function public.vivienda_persist_expire_evidence_intents(timestamptz)
  to service_role;

commit;
