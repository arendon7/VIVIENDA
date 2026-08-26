-- VIVIENDA v0.7 — provider-ready Supabase/Postgres persistence schema.
-- Not applied to a live project by this commit.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.vivienda_identity_subjects (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  subject_ref text not null unique check (subject_ref ~ '^(sub)_[A-Za-z0-9_-]{3,}$'),
  principal_kind text not null check (principal_kind in ('client','lawyer','admin')),
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.vivienda_cases (
  case_id text primary key check (case_id ~ '^case_[A-Za-z0-9_-]{3,}$'),
  owner_subject_ref text not null references private.vivienda_identity_subjects(subject_ref),
  current_version integer not null default 1 check (current_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vivienda_cases_owner_idx
  on private.vivienda_cases(owner_subject_ref);

create table if not exists private.vivienda_case_creation_keys (
  owner_subject_ref text not null references private.vivienda_identity_subjects(subject_ref),
  idempotency_key text not null,
  semantic_fingerprint text not null check (semantic_fingerprint ~ '^[A-Fa-f0-9]{64}$'),
  case_id text not null references private.vivienda_cases(case_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_subject_ref, idempotency_key),
  unique (case_id)
);

create table if not exists private.vivienda_case_lawyer_assignments (
  case_id text not null references private.vivienda_cases(case_id) on delete cascade,
  lawyer_subject_ref text not null references private.vivienda_identity_subjects(subject_ref),
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz null,
  primary key (case_id, lawyer_subject_ref),
  check (revoked_at is null or revoked_at >= assigned_at)
);

create index if not exists vivienda_case_lawyer_active_idx
  on private.vivienda_case_lawyer_assignments(lawyer_subject_ref, case_id)
  where revoked_at is null;

create table if not exists private.vivienda_case_journal (
  case_id text not null references private.vivienda_cases(case_id) on delete cascade,
  sequence integer not null check (sequence >= 1),
  event_id text not null unique check (event_id ~ '^evt_[A-Za-z0-9_-]{3,}$'),
  event_type text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null,
  actor_kind text not null check (actor_kind in ('client','lawyer','admin','system','external_recorded')),
  actor_subject_ref text null,
  idempotency_key text not null,
  semantic_fingerprint text not null check (semantic_fingerprint ~ '^[A-Fa-f0-9]{64}$'),
  recorded_by_subject_ref text not null,
  recorded_by_principal_kind text not null check (recorded_by_principal_kind in ('client','lawyer','admin','service')),
  request_id text not null check (request_id ~ '^req_[A-Za-z0-9_-]{3,}$'),
  stored_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  evidence_refs text[] not null default '{}'::text[],
  primary key (case_id, sequence),
  unique (case_id, idempotency_key),
  check (actor_kind = 'external_recorded' or actor_subject_ref is not null),
  check (actor_subject_ref is null or actor_subject_ref ~ '^(sub|svc)_[A-Za-z0-9_-]{3,}$'),
  check (recorded_by_subject_ref ~ '^(sub|svc)_[A-Za-z0-9_-]{3,}$'),
  check (not exists (
    select 1 from unnest(evidence_refs) as ref
    where ref !~ '^evd_[A-Za-z0-9_-]{3,}$'
  ))
);

create index if not exists vivienda_case_journal_event_type_idx
  on private.vivienda_case_journal(case_id, event_type, sequence);

create table if not exists private.vivienda_data_authorizations (
  authorization_id text primary key check (authorization_id ~ '^auth_[A-Za-z0-9_-]{3,}$'),
  case_id text not null references private.vivienda_cases(case_id) on delete cascade,
  subject_ref text not null references private.vivienda_identity_subjects(subject_ref),
  consent_version text not null,
  purposes text[] not null check (cardinality(purposes) >= 1),
  status text not null check (status in ('active','revoked','superseded')),
  granted_at timestamptz not null,
  revoked_at timestamptz null,
  revoked_reason text null,
  created_at timestamptz not null default now(),
  check (purposes <@ array[
    'mortgage_analysis','case_management','legal_service',
    'customer_support','external_credit_data','marketing'
  ]::text[]),
  check ((status = 'revoked') = (revoked_at is not null))
);

create unique index if not exists vivienda_data_auth_one_active_idx
  on private.vivienda_data_authorizations(case_id, subject_ref)
  where status = 'active';

create index if not exists vivienda_data_auth_history_idx
  on private.vivienda_data_authorizations(case_id, subject_ref, granted_at desc);

create table if not exists private.vivienda_evidence_intents (
  intent_id text primary key check (intent_id ~ '^upl_[A-Za-z0-9_-]{3,}$'),
  evidence_id text not null unique check (evidence_id ~ '^evd_[A-Za-z0-9_-]{3,}$'),
  case_id text not null references private.vivienda_cases(case_id) on delete cascade,
  created_by_subject_ref text not null,
  kind text not null check (kind in ('statement','contract','bank_response','filing_proof','authority','court_document','other')),
  legal_data_category text not null check (legal_data_category in ('non_personal','personal','financial_credit_semiprivate','private','sensitive')),
  security_tier text not null check (security_tier in ('open','controlled','restricted','highly_restricted')),
  display_name text not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null check (status in ('quarantine','finalized','expired')),
  check (expires_at > created_at),
  check (created_by_subject_ref ~ '^(sub|svc)_[A-Za-z0-9_-]{3,}$'),
  check (legal_data_category <> 'sensitive' or security_tier = 'highly_restricted'),
  check (legal_data_category not in ('financial_credit_semiprivate','private') or security_tier in ('restricted','highly_restricted')),
  check (legal_data_category <> 'personal' or security_tier <> 'open')
);

create index if not exists vivienda_evidence_intents_case_idx
  on private.vivienda_evidence_intents(case_id, status, expires_at);

create table if not exists private.vivienda_evidence_objects (
  storage_locator text primary key check (storage_locator ~ '^obj_[A-Za-z0-9_-]{6,}$'),
  intent_id text not null unique references private.vivienda_evidence_intents(intent_id) on delete cascade,
  evidence_id text not null unique references private.vivienda_evidence_intents(evidence_id) on delete cascade,
  bucket_id text not null check (bucket_id = 'vivienda-evidence'),
  object_path text not null unique,
  created_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists private.vivienda_evidence_metadata (
  evidence_id text primary key check (evidence_id ~ '^evd_[A-Za-z0-9_-]{3,}$'),
  case_id text not null references private.vivienda_cases(case_id) on delete cascade,
  kind text not null check (kind in ('statement','contract','bank_response','filing_proof','authority','court_document','other')),
  legal_data_category text not null check (legal_data_category in ('non_personal','personal','financial_credit_semiprivate','private','sensitive')),
  security_tier text not null check (security_tier in ('open','controlled','restricted','highly_restricted')),
  display_name text not null,
  mime_type text null,
  byte_size bigint null check (byte_size is null or (byte_size > 0 and byte_size <= 26214400)),
  checksum_sha256 text null check (checksum_sha256 is null or checksum_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  storage_locator text null references private.vivienda_evidence_objects(storage_locator),
  created_at timestamptz not null,
  created_by_subject_ref text not null,
  lifecycle text not null check (lifecycle in ('active','legal_hold','tombstoned')),
  tombstoned_at timestamptz null,
  tombstone_reason text null,
  check (created_by_subject_ref ~ '^(sub|svc)_[A-Za-z0-9_-]{3,}$'),
  check (legal_data_category <> 'sensitive' or security_tier = 'highly_restricted'),
  check (legal_data_category not in ('financial_credit_semiprivate','private') or security_tier in ('restricted','highly_restricted')),
  check (legal_data_category <> 'personal' or security_tier <> 'open'),
  check (
    (lifecycle = 'tombstoned' and tombstoned_at is not null and storage_locator is null and checksum_sha256 is null)
    or lifecycle <> 'tombstoned'
  )
);

create index if not exists vivienda_evidence_case_idx
  on private.vivienda_evidence_metadata(case_id, lifecycle, created_at);

-- Defense in depth: internal tables are never direct client API surfaces.
alter table private.vivienda_identity_subjects enable row level security;
alter table private.vivienda_cases enable row level security;
alter table private.vivienda_case_creation_keys enable row level security;
alter table private.vivienda_case_lawyer_assignments enable row level security;
alter table private.vivienda_case_journal enable row level security;
alter table private.vivienda_data_authorizations enable row level security;
alter table private.vivienda_evidence_intents enable row level security;
alter table private.vivienda_evidence_objects enable row level security;
alter table private.vivienda_evidence_metadata enable row level security;

revoke all on all tables in schema private from anon, authenticated;
grant select, insert, update, delete on all tables in schema private to service_role;
alter default privileges in schema private revoke all on tables from anon, authenticated;

-- Private Supabase Storage bucket. No authenticated/anon storage.objects policies are added.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vivienda-evidence',
  'vivienda-evidence',
  false,
  26214400,
  array['application/pdf','image/jpeg','image/png']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.vivienda_case_snapshot(p_case_id text)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'caseId', c.case_id,
    'access', jsonb_build_object(
      'ownerSubjectRef', c.owner_subject_ref,
      'assignedLawyerSubjectRefs', coalesce((
        select jsonb_agg(a.lawyer_subject_ref order by a.lawyer_subject_ref)
        from private.vivienda_case_lawyer_assignments a
        where a.case_id = c.case_id and a.revoked_at is null
      ), '[]'::jsonb)
    ),
    'journal', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'event', jsonb_build_object(
            'eventId', j.event_id,
            'caseId', j.case_id,
            'sequence', j.sequence,
            'type', j.event_type,
            'occurredAt', j.occurred_at,
            'recordedAt', j.recorded_at,
            'actor', case
              when j.actor_kind = 'external_recorded' then jsonb_build_object('kind', j.actor_kind)
              else jsonb_build_object('kind', j.actor_kind, 'actorId', j.actor_subject_ref)
            end,
            'idempotencyKey', j.idempotency_key,
            'payload', j.payload,
            'evidenceRefs', to_jsonb(j.evidence_refs)
          ),
          'recordedBySubjectRef', j.recorded_by_subject_ref,
          'recordedByPrincipalKind', j.recorded_by_principal_kind,
          'requestId', j.request_id,
          'semanticFingerprint', j.semantic_fingerprint,
          'storedAt', j.stored_at
        ) order by j.sequence
      )
      from private.vivienda_case_journal j
      where j.case_id = c.case_id
    ), '[]'::jsonb),
    'dataAuthorizations', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'authorizationId', a.authorization_id,
          'caseId', a.case_id,
          'subjectRef', a.subject_ref,
          'consentVersion', a.consent_version,
          'purposes', to_jsonb(a.purposes),
          'status', a.status,
          'grantedAt', a.granted_at,
          'revokedAt', a.revoked_at,
          'revokedReason', a.revoked_reason
        ) order by a.granted_at, a.authorization_id
      )
      from private.vivienda_data_authorizations a
      where a.case_id = c.case_id
    ), '[]'::jsonb),
    'evidence', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'evidenceId', e.evidence_id,
          'caseId', e.case_id,
          'kind', e.kind,
          'legalDataCategory', e.legal_data_category,
          'securityTier', e.security_tier,
          'displayName', e.display_name,
          'mimeType', e.mime_type,
          'byteSize', e.byte_size,
          'checksumSha256', e.checksum_sha256,
          'storageLocator', e.storage_locator,
          'createdAt', e.created_at,
          'createdBySubjectRef', e.created_by_subject_ref,
          'lifecycle', e.lifecycle,
          'tombstonedAt', e.tombstoned_at,
          'tombstoneReason', e.tombstone_reason
        ) order by e.created_at, e.evidence_id
      )
      from private.vivienda_evidence_metadata e
      where e.case_id = c.case_id
    ), '[]'::jsonb)
  )
  from private.vivienda_cases c
  where c.case_id = p_case_id;
$$;

revoke all on function private.vivienda_case_snapshot(text) from public, anon, authenticated;
grant execute on function private.vivienda_case_snapshot(text) to service_role;

-- Authenticated identity resolution. This is the only v0.7 RPC intended for an end-user JWT.
create or replace function public.vivienda_resolve_principal()
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select case
    when (select auth.uid()) is null then null
    else (
      select jsonb_build_object('subjectRef', i.subject_ref, 'kind', i.principal_kind)
      from private.vivienda_identity_subjects i
      where i.auth_user_id = (select auth.uid()) and i.status = 'active'
    )
  end;
$$;

revoke all on function public.vivienda_resolve_principal() from public, anon;
grant execute on function public.vivienda_resolve_principal() to authenticated;

-- Server-only helper that materializes one journal record supplied by the v0.6 boundary.
create or replace function private.vivienda_insert_journal_record(p_record jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event jsonb := p_record->'event';
  v_evidence_refs text[] := coalesce(
    array(select jsonb_array_elements_text(coalesce(v_event->'evidenceRefs','[]'::jsonb))),
    '{}'::text[]
  );
begin
  insert into private.vivienda_case_journal (
    case_id, sequence, event_id, event_type, occurred_at, recorded_at,
    actor_kind, actor_subject_ref, idempotency_key, semantic_fingerprint,
    recorded_by_subject_ref, recorded_by_principal_kind, request_id, stored_at,
    payload, evidence_refs
  ) values (
    v_event->>'caseId',
    (v_event->>'sequence')::integer,
    v_event->>'eventId',
    v_event->>'type',
    (v_event->>'occurredAt')::timestamptz,
    (v_event->>'recordedAt')::timestamptz,
    v_event->'actor'->>'kind',
    v_event->'actor'->>'actorId',
    v_event->>'idempotencyKey',
    p_record->>'semanticFingerprint',
    p_record->>'recordedBySubjectRef',
    p_record->>'recordedByPrincipalKind',
    p_record->>'requestId',
    (p_record->>'storedAt')::timestamptz,
    coalesce(v_event->'payload','{}'::jsonb),
    v_evidence_refs
  );
end;
$$;

revoke all on function private.vivienda_insert_journal_record(jsonb) from public, anon, authenticated;
grant execute on function private.vivienda_insert_journal_record(jsonb) to service_role;

create or replace function public.vivienda_persist_create_case(
  p_case_id text,
  p_owner_subject_ref text,
  p_creation_idempotency_key text,
  p_creation_fingerprint text,
  p_first_record jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing private.vivienda_case_creation_keys%rowtype;
  v_snapshot jsonb;
begin
  select * into v_existing
  from private.vivienda_case_creation_keys
  where owner_subject_ref = p_owner_subject_ref
    and idempotency_key = p_creation_idempotency_key;

  if found then
    if v_existing.semantic_fingerprint <> p_creation_fingerprint then
      raise exception 'vivienda:idempotency_conflict' using errcode = 'P0001';
    end if;
    return jsonb_build_object(
      'kind','duplicate',
      'snapshot',private.vivienda_case_snapshot(v_existing.case_id)
    );
  end if;

  if (p_first_record->'event'->>'caseId') is distinct from p_case_id
     or (p_first_record->'event'->>'sequence')::integer <> 1 then
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

  v_snapshot := private.vivienda_case_snapshot(p_case_id);
  return jsonb_build_object('kind','created','snapshot',v_snapshot);
exception
  when unique_violation then
    if exists (select 1 from private.vivienda_cases where case_id = p_case_id) then
      raise exception 'vivienda:invalid_identifier' using errcode = 'P0001';
    end if;
    raise;
end;
$$;

create or replace function public.vivienda_persist_load_case(p_case_id text)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select private.vivienda_case_snapshot(p_case_id);
$$;

create or replace function public.vivienda_persist_append_journal(
  p_case_id text,
  p_expected_version integer,
  p_record jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_case private.vivienda_cases%rowtype;
  v_existing private.vivienda_case_journal%rowtype;
  v_key text := p_record->'event'->>'idempotencyKey';
  v_fp text := p_record->>'semanticFingerprint';
  v_sequence integer := (p_record->'event'->>'sequence')::integer;
begin
  select * into v_case from private.vivienda_cases where case_id = p_case_id for update;
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
    return jsonb_build_object('kind','duplicate','snapshot',private.vivienda_case_snapshot(p_case_id));
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
  set current_version = current_version + 1, updated_at = now()
  where case_id = p_case_id;

  return jsonb_build_object('kind','appended','snapshot',private.vivienda_case_snapshot(p_case_id));
exception
  when unique_violation then
    raise exception 'vivienda:duplicate_event_id' using errcode = 'P0001';
end;
$$;

create or replace function public.vivienda_persist_assign_lawyer(
  p_case_id text,
  p_lawyer_subject_ref text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from private.vivienda_cases where case_id = p_case_id) then
    raise exception 'vivienda:case_not_found' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from private.vivienda_identity_subjects
    where subject_ref = p_lawyer_subject_ref and principal_kind = 'lawyer' and status = 'active'
  ) then
    raise exception 'vivienda:invalid_subject_ref' using errcode = 'P0001';
  end if;

  insert into private.vivienda_case_lawyer_assignments(case_id, lawyer_subject_ref, assigned_at, revoked_at)
  values (p_case_id, p_lawyer_subject_ref, now(), null)
  on conflict (case_id, lawyer_subject_ref)
  do update set revoked_at = null, assigned_at = excluded.assigned_at;
end;
$$;

create or replace function public.vivienda_persist_grant_data_authorization(
  p_case_id text,
  p_expected_version integer,
  p_record jsonb,
  p_authorization jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_case private.vivienda_cases%rowtype;
  v_existing private.vivienda_case_journal%rowtype;
  v_key text := p_record->'event'->>'idempotencyKey';
  v_fp text := p_record->>'semanticFingerprint';
begin
  select * into v_case from private.vivienda_cases where case_id = p_case_id for update;
  if not found then raise exception 'vivienda:case_not_found' using errcode='P0001'; end if;

  select * into v_existing from private.vivienda_case_journal
  where case_id = p_case_id and idempotency_key = v_key;
  if found then
    if v_existing.semantic_fingerprint <> v_fp then
      raise exception 'vivienda:idempotency_conflict' using errcode='P0001';
    end if;
    return jsonb_build_object('kind','duplicate','snapshot',private.vivienda_case_snapshot(p_case_id));
  end if;

  if p_expected_version <> v_case.current_version then
    raise exception 'vivienda:version_conflict' using errcode='P0001';
  end if;

  update private.vivienda_data_authorizations
  set status = 'superseded'
  where case_id = p_case_id
    and subject_ref = p_authorization->>'subjectRef'
    and status = 'active';

  insert into private.vivienda_data_authorizations(
    authorization_id, case_id, subject_ref, consent_version, purposes,
    status, granted_at, revoked_at, revoked_reason
  ) values (
    p_authorization->>'authorizationId',
    p_case_id,
    p_authorization->>'subjectRef',
    p_authorization->>'consentVersion',
    array(select jsonb_array_elements_text(p_authorization->'purposes')),
    'active',
    (p_authorization->>'grantedAt')::timestamptz,
    null,
    null
  );

  perform private.vivienda_insert_journal_record(p_record);
  update private.vivienda_cases set current_version=current_version+1, updated_at=now()
  where case_id=p_case_id;

  return jsonb_build_object('kind','appended','snapshot',private.vivienda_case_snapshot(p_case_id));
end;
$$;

create or replace function public.vivienda_persist_revoke_data_authorization(
  p_case_id text,
  p_subject_ref text,
  p_revoked_at timestamptz,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.vivienda_data_authorizations
  set status='revoked', revoked_at=p_revoked_at, revoked_reason=p_reason
  where authorization_id = (
    select a.authorization_id
    from private.vivienda_data_authorizations a
    where a.case_id=p_case_id and a.subject_ref=p_subject_ref and a.status='active'
    order by a.granted_at desc
    limit 1
  );
  if not found then
    raise exception 'vivienda:data_authorization_subject_mismatch' using errcode='P0001';
  end if;
end;
$$;

create or replace function public.vivienda_persist_create_evidence_intent(p_intent jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from private.vivienda_cases where case_id=p_intent->>'caseId') then
    raise exception 'vivienda:case_not_found' using errcode='P0001';
  end if;

  if not exists (
    select 1 from private.vivienda_data_authorizations a
    where a.case_id=p_intent->>'caseId'
      and a.subject_ref=p_intent->>'createdBySubjectRef'
      and a.status='active'
      and a.purposes && array['mortgage_analysis','case_management','legal_service','external_credit_data']::text[]
  ) then
    raise exception 'vivienda:data_authorization_required' using errcode='P0001';
  end if;

  insert into private.vivienda_evidence_intents(
    intent_id,evidence_id,case_id,created_by_subject_ref,kind,
    legal_data_category,security_tier,display_name,created_at,expires_at,status
  ) values (
    p_intent->>'intentId',p_intent->>'evidenceId',p_intent->>'caseId',p_intent->>'createdBySubjectRef',
    p_intent->>'kind',p_intent->>'legalDataCategory',p_intent->>'securityTier',p_intent->>'displayName',
    (p_intent->>'createdAt')::timestamptz,(p_intent->>'expiresAt')::timestamptz,p_intent->>'status'
  );
end;
$$;

create or replace function public.vivienda_persist_load_evidence_intent(p_intent_id text)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'intentId',i.intent_id,
    'evidenceId',i.evidence_id,
    'caseId',i.case_id,
    'createdBySubjectRef',i.created_by_subject_ref,
    'kind',i.kind,
    'legalDataCategory',i.legal_data_category,
    'securityTier',i.security_tier,
    'displayName',i.display_name,
    'createdAt',i.created_at,
    'expiresAt',i.expires_at,
    'status',i.status
  )
  from private.vivienda_evidence_intents i
  where i.intent_id=p_intent_id;
$$;

-- Separate object registry keeps physical storage coordinates outside CasePersistencePort.
create or replace function public.vivienda_persist_register_evidence_object(
  p_intent_id text,
  p_storage_locator text,
  p_object_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intent private.vivienda_evidence_intents%rowtype;
begin
  select * into v_intent from private.vivienda_evidence_intents where intent_id=p_intent_id for update;
  if not found then raise exception 'vivienda:evidence_intent_not_found' using errcode='P0001'; end if;
  if v_intent.status <> 'quarantine' or v_intent.expires_at <= now() then
    raise exception 'vivienda:evidence_intent_expired' using errcode='P0001';
  end if;
  if p_object_path !~ '^quarantine/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+$' then
    raise exception 'vivienda:evidence_receipt_mismatch' using errcode='P0001';
  end if;

  insert into private.vivienda_evidence_objects(storage_locator,intent_id,evidence_id,bucket_id,object_path)
  values (p_storage_locator,p_intent_id,v_intent.evidence_id,'vivienda-evidence',p_object_path);
end;
$$;

create or replace function public.vivienda_persist_finalize_evidence(
  p_case_id text,
  p_expected_version integer,
  p_intent_id text,
  p_metadata jsonb,
  p_record jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_case private.vivienda_cases%rowtype;
  v_intent private.vivienda_evidence_intents%rowtype;
  v_existing private.vivienda_case_journal%rowtype;
  v_key text := p_record->'event'->>'idempotencyKey';
  v_fp text := p_record->>'semanticFingerprint';
  v_locator text := p_metadata->>'storageLocator';
begin
  select * into v_case from private.vivienda_cases where case_id=p_case_id for update;
  if not found then raise exception 'vivienda:case_not_found' using errcode='P0001'; end if;

  select * into v_existing from private.vivienda_case_journal
  where case_id=p_case_id and idempotency_key=v_key;
  if found then
    if v_existing.semantic_fingerprint <> v_fp then
      raise exception 'vivienda:idempotency_conflict' using errcode='P0001';
    end if;
    return jsonb_build_object('kind','duplicate','snapshot',private.vivienda_case_snapshot(p_case_id));
  end if;

  if p_expected_version <> v_case.current_version then
    raise exception 'vivienda:version_conflict' using errcode='P0001';
  end if;

  select * into v_intent from private.vivienda_evidence_intents
  where intent_id=p_intent_id and case_id=p_case_id for update;
  if not found then raise exception 'vivienda:evidence_intent_not_found' using errcode='P0001'; end if;
  if v_intent.status <> 'quarantine' or v_intent.expires_at <= now() then
    raise exception 'vivienda:evidence_intent_expired' using errcode='P0001';
  end if;

  if v_intent.evidence_id is distinct from p_metadata->>'evidenceId'
     or v_intent.kind is distinct from p_metadata->>'kind'
     or v_intent.legal_data_category is distinct from p_metadata->>'legalDataCategory'
     or v_intent.security_tier is distinct from p_metadata->>'securityTier' then
    raise exception 'vivienda:evidence_receipt_mismatch' using errcode='P0001';
  end if;

  if not exists (
    select 1 from private.vivienda_data_authorizations a
    where a.case_id=p_case_id
      and a.subject_ref=v_intent.created_by_subject_ref
      and a.status='active'
      and a.purposes && array['mortgage_analysis','case_management','legal_service','external_credit_data']::text[]
  ) then
    raise exception 'vivienda:data_authorization_required' using errcode='P0001';
  end if;

  if not exists (
    select 1 from private.vivienda_evidence_objects o
    where o.intent_id=p_intent_id
      and o.evidence_id=v_intent.evidence_id
      and o.storage_locator=v_locator
      and o.deleted_at is null
  ) then
    raise exception 'vivienda:evidence_receipt_mismatch' using errcode='P0001';
  end if;

  insert into private.vivienda_evidence_metadata(
    evidence_id,case_id,kind,legal_data_category,security_tier,display_name,
    mime_type,byte_size,checksum_sha256,storage_locator,created_at,
    created_by_subject_ref,lifecycle,tombstoned_at,tombstone_reason
  ) values (
    p_metadata->>'evidenceId',p_case_id,p_metadata->>'kind',p_metadata->>'legalDataCategory',
    p_metadata->>'securityTier',p_metadata->>'displayName',p_metadata->>'mimeType',
    (p_metadata->>'byteSize')::bigint,p_metadata->>'checksumSha256',v_locator,
    (p_metadata->>'createdAt')::timestamptz,p_metadata->>'createdBySubjectRef',
    p_metadata->>'lifecycle',null,null
  );

  perform private.vivienda_insert_journal_record(p_record);
  update private.vivienda_evidence_intents set status='finalized' where intent_id=p_intent_id;
  update private.vivienda_cases set current_version=current_version+1, updated_at=now() where case_id=p_case_id;

  return jsonb_build_object('kind','appended','snapshot',private.vivienda_case_snapshot(p_case_id));
end;
$$;

create or replace function public.vivienda_persist_tombstone_evidence(
  p_case_id text,
  p_evidence_id text,
  p_at timestamptz,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lifecycle text;
  v_locator text;
begin
  select lifecycle, storage_locator into v_lifecycle, v_locator
  from private.vivienda_evidence_metadata
  where case_id=p_case_id and evidence_id=p_evidence_id
  for update;

  if not found then raise exception 'vivienda:evidence_not_found' using errcode='P0001'; end if;
  if v_lifecycle='legal_hold' then raise exception 'vivienda:evidence_on_legal_hold' using errcode='P0001'; end if;

  update private.vivienda_evidence_metadata
  set mime_type=null, byte_size=null, checksum_sha256=null, storage_locator=null,
      lifecycle='tombstoned', tombstoned_at=p_at, tombstone_reason=p_reason
  where case_id=p_case_id and evidence_id=p_evidence_id;

  update private.vivienda_evidence_objects set deleted_at=p_at
  where storage_locator=v_locator;
end;
$$;

-- Mark expired intents. Physical object deletion is performed by the storage coordinator.
create or replace function public.vivienda_persist_expire_evidence_intents(p_before timestamptz default now())
returns table(intent_id text, storage_locator text, object_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with expired as (
    update private.vivienda_evidence_intents i
    set status='expired'
    where i.status='quarantine' and i.expires_at <= p_before
    returning i.intent_id
  )
  select e.intent_id, o.storage_locator, o.object_path
  from expired e
  left join private.vivienda_evidence_objects o on o.intent_id=e.intent_id and o.deleted_at is null;
end;
$$;

-- Service-only persistence functions. The service key must never be shipped to a browser.
revoke all on function public.vivienda_persist_create_case(text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.vivienda_persist_load_case(text) from public, anon, authenticated;
revoke all on function public.vivienda_persist_append_journal(text,integer,jsonb) from public, anon, authenticated;
revoke all on function public.vivienda_persist_assign_lawyer(text,text) from public, anon, authenticated;
revoke all on function public.vivienda_persist_grant_data_authorization(text,integer,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.vivienda_persist_revoke_data_authorization(text,text,timestamptz,text) from public, anon, authenticated;
revoke all on function public.vivienda_persist_create_evidence_intent(jsonb) from public, anon, authenticated;
revoke all on function public.vivienda_persist_load_evidence_intent(text) from public, anon, authenticated;
revoke all on function public.vivienda_persist_register_evidence_object(text,text,text) from public, anon, authenticated;
revoke all on function public.vivienda_persist_finalize_evidence(text,integer,text,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.vivienda_persist_tombstone_evidence(text,text,timestamptz,text) from public, anon, authenticated;
revoke all on function public.vivienda_persist_expire_evidence_intents(timestamptz) from public, anon, authenticated;

grant execute on function public.vivienda_persist_create_case(text,text,text,text,jsonb) to service_role;
grant execute on function public.vivienda_persist_load_case(text) to service_role;
grant execute on function public.vivienda_persist_append_journal(text,integer,jsonb) to service_role;
grant execute on function public.vivienda_persist_assign_lawyer(text,text) to service_role;
grant execute on function public.vivienda_persist_grant_data_authorization(text,integer,jsonb,jsonb) to service_role;
grant execute on function public.vivienda_persist_revoke_data_authorization(text,text,timestamptz,text) to service_role;
grant execute on function public.vivienda_persist_create_evidence_intent(jsonb) to service_role;
grant execute on function public.vivienda_persist_load_evidence_intent(text) to service_role;
grant execute on function public.vivienda_persist_register_evidence_object(text,text,text) to service_role;
grant execute on function public.vivienda_persist_finalize_evidence(text,integer,text,jsonb,jsonb) to service_role;
grant execute on function public.vivienda_persist_tombstone_evidence(text,text,timestamptz,text) to service_role;
grant execute on function public.vivienda_persist_expire_evidence_intents(timestamptz) to service_role;

commit;
