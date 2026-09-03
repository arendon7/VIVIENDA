-- VIVIENDA v0.7 — canonical private schema and storage envelope.
-- Provider-ready only: not applied to a live project by this commit.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create or replace function private.vivienda_evidence_refs_valid(p_refs text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(ref ~ '^evd_[A-Za-z0-9_-]{3,}$'), true)
  from unnest(coalesce(p_refs, '{}'::text[])) as ref;
$$;

revoke all on function private.vivienda_evidence_refs_valid(text[]) from public, anon, authenticated;
grant execute on function private.vivienda_evidence_refs_valid(text[]) to service_role;

create table if not exists private.vivienda_identity_subjects (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  subject_ref text not null unique check (subject_ref ~ '^sub_[A-Za-z0-9_-]{3,}$'),
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
  idempotency_key text not null check (length(idempotency_key) between 1 and 200),
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
  idempotency_key text not null check (length(idempotency_key) between 1 and 200),
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
  check (private.vivienda_evidence_refs_valid(evidence_refs))
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
  created_by_subject_ref text not null check (created_by_subject_ref ~ '^(sub|svc)_[A-Za-z0-9_-]{3,}$'),
  kind text not null check (kind in ('statement','contract','bank_response','filing_proof','authority','court_document','other')),
  legal_data_category text not null check (legal_data_category in ('non_personal','personal','financial_credit_semiprivate','private','sensitive')),
  security_tier text not null check (security_tier in ('open','controlled','restricted','highly_restricted')),
  display_name text not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null check (status in ('quarantine','finalized','expired')),
  check (expires_at > created_at),
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
  mime_type text null check (mime_type is null or mime_type in ('application/pdf','image/jpeg','image/png')),
  byte_size bigint null check (byte_size is null or (byte_size > 0 and byte_size <= 26214400)),
  checksum_sha256 text null check (checksum_sha256 is null or checksum_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  storage_locator text null references private.vivienda_evidence_objects(storage_locator),
  created_at timestamptz not null,
  created_by_subject_ref text not null check (created_by_subject_ref ~ '^(sub|svc)_[A-Za-z0-9_-]{3,}$'),
  lifecycle text not null check (lifecycle in ('active','legal_hold','tombstoned')),
  tombstoned_at timestamptz null,
  tombstone_reason text null,
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

-- Defense in depth. The private schema is not a browser CRUD surface.
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

-- Private bucket. No anon/authenticated storage.objects policies are created by v0.7.
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

commit;
