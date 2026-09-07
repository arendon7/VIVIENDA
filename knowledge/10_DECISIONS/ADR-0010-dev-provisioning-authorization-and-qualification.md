# ADR-0010 — DEV Provisioning Authorization and Qualification

Status: Proposed for V0.23.14  
Date: 2026-09-07

## Context

V0.23.12 introduced the Evidence Runtime Activation Preflight and made `runtimeMayActivate=true` depend on 15/15 verified requirements.

V0.23.13 then introduced the Production Provisioning Blueprint and separated:

`plan approved → resources provisioned → environment verified → environment promoted → controlled runtime activation`

The next unresolved boundary is the first real external environment: **VIVIENDA DEV**.

The repository already contains Supabase-oriented migrations, persistence adapters and Storage coordination, but the accessible Supabase account currently does not expose a project dedicated to VIVIENDA. Existing projects belong to other products and must not be repurposed.

Creating a Supabase project can incur cost. The provider integration requires explicit organization selection plus a fresh provider cost confirmation before creation. Therefore an autonomous development agent must not infer authorization to spend merely because the user asks to continue development.

At the same time, stopping at a prose checklist would leave an unsafe ambiguity: a project could be created and then informally treated as “ready”. V0.23.14 needs two executable gates around the creation event.

## Decision

Adopt two separate deterministic gates:

1. **DEV Provisioning Authorization Gate** — determines whether a cost-confirmed project-creation operation may be requested.
2. **DEV Environment Qualification Gate** — determines whether the project that actually exists has passed the technical/security checks required to become the verified DEV source for a later DEV → STAGING promotion.

Neither gate authorizes real user data or live evidence runtime.

## Provider profile

V0.23.14 records a conservative recommended DEV profile:

- provider: `supabase`;
- project role: `development`;
- recommended project name: `vivienda-dev`;
- recommended specific region: `sa-east-1` / South America (São Paulo);
- data policy: `synthetic_only`;
- default evidence runtime: `fail_closed`;
- project isolation: dedicated project;
- secrets: server-only;
- database recovery and Storage-object recovery: separate controls.

The recommended region is **not** equivalent to approval. Region approval remains explicit because the provider region determines primary data location and future production decisions must consider legal/data-residency requirements separately.

Official provider references audited for this decision:

- Regions: https://supabase.com/docs/guides/platform/regions
- Backups: https://supabase.com/docs/guides/platform/backups
- Pricing: https://supabase.com/pricing

## Why `sa-east-1` is only a recommendation

Supabase currently exposes South America (São Paulo) as a specific project region and recommends selecting a region close to users for performance.

VIVIENDA primarily targets Colombia, so `sa-east-1` is a reasonable DEV candidate to validate latency and operational behavior within South America.

However:

- region selection is also a data-location control;
- DEV uses synthetic-only data, so this recommendation does not decide production residency;
- production region must later be separately approved with legal, privacy, continuity and cost considerations.

## Gate A — authorization before project creation

Project creation may be requested only when:

- the parent V0.23.13 blueprint is fully approved;
- DEV is explicitly scoped as a dedicated VIVIENDA project;
- the target provider organization is selected explicitly;
- a current provider cost quote is reviewed;
- the current cost is explicitly approved;
- the DEV region is explicitly approved;
- synthetic-only scope is accepted;
- reuse of existing non-VIVIENDA projects is rejected;
- the provisioning actor is authorized.

States:

- `not_authorized`
- `partially_authorized`
- `authorized_for_cost_confirmed_creation`

The final state means only that the external project-creation action may be requested using the provider's fresh cost-confirmation mechanism.

It does not mean the project exists.

## Gate B — qualification after project creation

DEV is not considered verified merely because the provider returns an ACTIVE/HEALTHY project.

Qualification requires 14/14 verified controls:

1. project exists;
2. project role matches VIVIENDA DEV;
3. project isolation verified;
4. created region matches approved region;
5. repository migrations applied and versioned;
6. security advisors reviewed;
7. RLS/RPC security verified;
8. identity mapping verified;
9. private Storage verified;
10. database recovery verified;
11. Storage-object recovery strategy separately verified;
12. privileged secrets server-only verified;
13. synthetic-only data verified;
14. evidence runtime fail-closed verified.

Requirement state vocabulary:

- `missing`
- `configured_unverified`
- `verified`

Only `verified` counts.

Qualification states:

- `not_provisioned`
- `provisioned_unqualified`
- `qualified_for_staging_candidate`

## Database backup vs. Storage recovery

Supabase documents that database backups protect the Postgres database but do **not** include the actual objects stored through the Storage API; only Storage metadata is represented in the database.

Therefore `database_recovery_verified` and `storage_object_recovery_strategy_verified` are deliberately separate qualification controls.

A successful database restore must never be interpreted as proof that deleted/missing evidence objects were restored.

## Existing projects

During this slice, the read-only provider inventory exposed projects for other products but no project dedicated to VIVIENDA.

This observation is environment-specific and must not be persisted as a permanent domain truth.

Decision consequence:

> Do not rename, reuse, clone data from, or otherwise convert an existing project belonging to another product into VIVIENDA DEV.

## Relationship to V0.23.12

DEV qualification explicitly does not create V0.23.12 activation facts.

Even 14/14 DEV verified yields:

- `devEnvironmentVerified = true`
- `liveRuntimeAuthorized = false`
- zero Evidence Runtime Activation Facts produced by this gate.

Production activation still requires its own target-environment verification under V0.23.12.

## Relationship to V0.23.13

A qualified DEV may later satisfy the `sourceEnvironmentVerified` concept for evaluating DEV → STAGING promotion, but only when the remaining V0.23.13 promotion evidence also exists.

This ADR does not create STAGING and does not approve the full V0.23.13 blueprint on behalf of a human owner.

## Security boundary

Authorization and qualification facts contain only control states and safe metadata.

They must not persist:

- organization access tokens;
- database passwords;
- service-role keys;
- JWTs;
- signed URLs;
- upload tokens;
- real subjectRefs;
- real documents;
- real financial data.

## Consequences

### Positive

- external spending cannot be inferred from generic development intent;
- existing projects cannot be silently repurposed;
- ACTIVE/HEALTHY does not equal qualified;
- configuration does not equal verification;
- database recovery and Storage recovery are tested independently;
- DEV remains synthetic-only and fail-closed;
- future STAGING promotion gets a precise source-environment signal.

### Cost

- first DEV activation requires more explicit checks;
- provider cost and organization selection remain external approvals rather than repository defaults;
- some provider setup must be verified manually/read-only before automation can trust it.

## Out of scope

- creating the Supabase project;
- approving a provider organization;
- approving a cost;
- storing a provider cost-confirmation identifier;
- introducing secrets;
- applying migrations to a live project;
- creating Storage buckets;
- enabling Auth;
- creating STAGING/PROD;
- real user data;
- upload/OCR;
- switching `runtime.server.ts` away from fail-closed.
