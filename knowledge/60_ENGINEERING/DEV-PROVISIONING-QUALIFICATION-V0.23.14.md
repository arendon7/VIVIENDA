# V0.23.14 — DEV Provisioning Authorization & Qualification

## Purpose

This slice defines the safe boundary around the first external VIVIENDA development environment.

It answers two separate questions:

1. **Before creation:** is there enough explicit authorization to request creation of a dedicated DEV project that may incur cost?
2. **After creation:** has that real project been technically and operationally verified strongly enough to call it VIVIENDA DEV?

It deliberately does not create the project.

## Non-negotiable truth chain

```text
approved architecture
  != cost approval
  != project creation
  != provider healthy status
  != DEV qualification
  != STAGING promotion
  != production readiness
  != live evidence runtime
```

No later state may be inferred from an earlier one.

## Current provider observation

A read-only inspection of the connected Supabase inventory during this slice did not identify a project dedicated to VIVIENDA.

There are existing projects for other products. They are not candidates for reuse.

This is an operational observation at the time of the audit, not a permanent code truth.

## Recommended DEV profile

Canonical safe metadata is exposed by:

`DEV_PROVIDER_PROFILE`

Current recommendation:

| Field | Value |
| --- | --- |
| provider | `supabase` |
| project role | `development` |
| recommended project name | `vivienda-dev` |
| recommended region | `sa-east-1` |
| provider label | South America (São Paulo) |
| data policy | `synthetic_only` |
| runtime default | `fail_closed` |
| secrets | `server_only` |
| isolation | `dedicated_project` |
| DB + Storage recovery | separate controls |

The profile is a recommendation. It is not evidence that the environment exists and it is not an authorization to spend.

## Region rationale

Provider documentation currently lists `sa-east-1` as the specific South America / São Paulo region and recommends choosing a region close to users for performance.

For a Colombia-focused product, this is the preferred **DEV candidate** for latency/operational validation.

Why it is not silently locked for PROD:

- project region determines primary data location;
- production requires a distinct legal/privacy/data-residency decision;
- cost and business-continuity tradeoffs may differ from DEV;
- DEV carries synthetic-only data by contract.

Provider source:

https://supabase.com/docs/guides/platform/regions

## Cost boundary

Supabase pricing is plan- and compute-dependent. Public pricing currently describes a Pro plan and separate compute economics, but the actual project/branch creation workflow must use the organization-specific provider quote at execution time.

Therefore the repository stores only approval **state**, never a stale hard-coded price.

Before project creation:

1. select the provider organization explicitly;
2. retrieve a fresh cost quote for that organization/action;
3. present the cost for explicit approval;
4. obtain the provider cost-confirmation artifact;
5. only then execute creation.

The cost-confirmation identifier is ephemeral operational data and must not be committed to the repository.

Provider source:

https://supabase.com/pricing

## Gate A — DEV Provisioning Authorization

Implementation:

`server/evidence-api/dev-provisioning-qualification.ts`

Function:

`evaluateDevProvisioningAuthorization(blueprint, facts)`

### Parent dependency

The V0.23.13 provisioning blueprint must already have:

`provisioningMayBegin = true`

DEV-specific approval cannot bypass a parent blueprint that is still partial.

### Eight authorization requirements

#### 1. `dedicated_project_scope_approved`

DEV must be a dedicated VIVIENDA project.

#### 2. `organization_selection_recorded`

The provider organization must be explicitly selected for this operation.

No organization is inferred from whichever existing project happens to be accessible.

#### 3. `provider_cost_quote_reviewed`

A fresh organization-specific cost quote must have been obtained and reviewed.

#### 4. `provider_cost_approval_recorded`

The current cost must be explicitly approved.

`proposed` is not approval.

#### 5. `development_region_approved`

The target region must be explicitly approved.

The `sa-east-1` recommendation is not self-approving.

#### 6. `synthetic_only_scope_approved`

The actor acknowledges that DEV cannot receive real user documents or financial evidence.

#### 7. `no_existing_project_reuse_approved`

Existing non-VIVIENDA projects cannot be renamed, repurposed, cloned with real data, or otherwise treated as VIVIENDA DEV.

#### 8. `provisioning_actor_authorized`

The actor executing the provider mutation must be authorized to do so and understand the fail-closed boundary.

### Authorization states

- `not_authorized`
- `partially_authorized`
- `authorized_for_cost_confirmed_creation`

Only the final state sets:

`projectCreationMayBeRequested = true`

That name is deliberate. It does not say project-created.

## Gate B — DEV Environment Qualification

Function:

`evaluateDevEnvironmentQualification(facts)`

Requirement statuses:

- `missing`
- `configured_unverified`
- `verified`

Only `verified` counts.

### Fourteen qualification requirements

#### 1. `project_exists`

Existence must be observed from provider truth, not inferred from a local config file.

#### 2. `project_role_matches_dev`

The project must actually be VIVIENDA DEV.

#### 3. `project_isolation_verified`

DB, Auth, Storage and credentials must be isolated from other products and future STAGING/PROD.

#### 4. `region_matches_authorization`

Provider-reported region must match the approved target exactly.

#### 5. `migrations_applied_and_versioned`

All canonical repository migrations must be applied in sequence.

Current repository migration lineage includes:

- V0.7 base schema;
- V0.7 RPC layer;
- V0.7 security hardening;
- V0.7 integrity hardening;
- V0.7 identity/storage lifecycle;
- V0.8 Storage coordination;
- V0.8 Storage retry hardening.

No untracked manual SQL qualifies.

#### 6. `security_advisors_reviewed`

Provider security advisors run after DDL changes and blockers are reviewed.

#### 7. `rls_and_rpc_security_verified`

RLS, RPC privileges and server-authority assumptions are actively tested.

#### 8. `identity_mapping_verified`

The auth-user → subjectRef model remains server-authoritative and immutable.

#### 9. `private_storage_verified`

Evidence Storage must be private and server-coordinated.

#### 10. `database_recovery_verified`

The DEV database can be reconstructed/restored through a reproducible route appropriate to the selected plan.

#### 11. `storage_object_recovery_strategy_verified`

Storage object recovery is assessed separately from Postgres recovery.

Supabase explicitly documents that database backups do not include Storage API objects. The DB contains Storage metadata, not the object bytes themselves.

Provider source:

https://supabase.com/docs/guides/platform/backups

#### 12. `secrets_server_only_verified`

Privileged credentials are not present in repository, client bundle, fixtures, logs or browser payloads.

#### 13. `synthetic_only_data_verified`

DEV test data is synthetic-only.

A convenient real statement is still prohibited test data.

#### 14. `runtime_fail_closed_verified`

The existing evidence HTTP runtime remains fail-closed.

Creating and qualifying DEV does not switch `runtime.server.ts` to an activated runtime.

## Qualification states

### `not_provisioned`

No provider project existence has been verified.

### `provisioned_unqualified`

A project exists but at least one qualification control is not verified.

### `qualified_for_staging_candidate`

All 14 controls are verified.

This is the strongest state V0.23.14 can produce.

It still returns:

`liveRuntimeAuthorized = false`

## Deliberate non-bridge to V0.23.12

Function:

`devQualificationProducesNoRuntimeActivationFacts()`

returns:

`{}`

This is a deliberate safety assertion.

DEV qualification cannot populate:

- `dedicated_vivienda_project`
- `migrations_applied`
- `security_advisors_reviewed`
- or any other V0.23.12 production activation fact.

Those facts must later be verified against the actual activation target environment.

## Relationship to DEV → STAGING

V0.23.13 already requires:

- approved blueprint;
- verified source environment;
- verified target isolation;
- rehearsed rollback;
- verified backup/restore;
- complete security review.

A future orchestration slice may map:

`qualified DEV → sourceEnvironmentVerified`

but only alongside the remaining independent promotion evidence.

V0.23.14 itself does not perform that promotion.

## Secrets and safe metadata

Safe to persist in code/tests/docs:

- provider name;
- project role;
- recommended project name;
- recommended region;
- control codes;
- control states;
- verification criteria.

Not safe to commit:

- database password;
- service-role secret;
- access token;
- JWT;
- cost-confirmation token/id;
- signed URL;
- upload token;
- real subjectRef;
- real evidence/document;
- real financial payload.

## Tests

`server/evidence-api/dev-provisioning-qualification.test.ts`

Covers:

1. empty authorization fails closed;
2. DEV approvals cannot bypass an unapproved V0.23.13 blueprint;
3. `proposed` cost/region do not count as approval;
4. only parent + 8/8 approvals permit requesting project creation;
5. provider profile remains synthetic-only/fail-closed;
6. no project means `not_provisioned`;
7. existing partial project means `provisioned_unqualified`;
8. `configured_unverified` never qualifies;
9. DB recovery and Storage-object recovery are separate;
10. only 14/14 verified qualifies DEV;
11. qualified DEV still cannot authorize live runtime;
12. qualified DEV produces zero V0.23.12 activation facts.

## Acceptance criteria

V0.23.14 is complete when:

- authorization gate is deterministic and fail-closed;
- qualification gate is deterministic and fail-closed;
- region recommendation is explicit but not self-approved;
- cost approval remains external/fresh;
- existing non-VIVIENDA projects cannot qualify by default;
- DB and Storage recovery are distinct;
- qualified DEV cannot authorize live runtime;
- TypeScript passes;
- domain tests pass;
- production build passes;
- the complete borrower E2E suite remains green.

## Out of scope

- calling provider project creation;
- incurring cost;
- selecting an organization on behalf of the user;
- applying migrations to an external project;
- introducing credentials;
- Storage bucket creation;
- Auth activation;
- STAGING/PROD;
- real data;
- upload/OCR;
- changing current fail-closed runtime.
