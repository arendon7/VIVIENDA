-- VIVIENDA v0.7 — final privilege hardening.
-- Service-role functions do not need SECURITY DEFINER. The authenticated identity resolver does.

begin;

alter function private.vivienda_case_snapshot(text) security invoker;
alter function private.vivienda_insert_journal_record(jsonb) security invoker;

alter function public.vivienda_persist_upsert_identity(uuid,text,text) security invoker;
alter function public.vivienda_persist_create_case(text,text,text,text,jsonb) security invoker;
alter function public.vivienda_persist_load_case(text) security invoker;
alter function public.vivienda_persist_append_journal(text,integer,jsonb) security invoker;
alter function public.vivienda_persist_assign_lawyer(text,text) security invoker;
alter function public.vivienda_persist_grant_data_authorization(text,integer,jsonb,jsonb) security invoker;
alter function public.vivienda_persist_revoke_data_authorization(text,text,timestamptz,text) security invoker;
alter function public.vivienda_persist_create_evidence_intent(jsonb) security invoker;
alter function public.vivienda_persist_load_evidence_intent(text) security invoker;
alter function public.vivienda_persist_register_evidence_object(text,text,text) security invoker;
alter function public.vivienda_persist_finalize_evidence(text,integer,text,jsonb,jsonb) security invoker;
alter function public.vivienda_persist_tombstone_evidence(text,text,timestamptz,text) security invoker;
alter function public.vivienda_persist_expire_evidence_intents(timestamptz) security invoker;

-- The resolver intentionally remains SECURITY DEFINER and pinned to an empty search_path.
-- It returns only the caller's opaque subjectRef + principal kind.

commit;
