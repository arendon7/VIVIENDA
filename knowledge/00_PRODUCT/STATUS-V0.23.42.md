# STATUS · V0.23.42 · External Execution Authorization Dossier

## Estado

**DOCUMENTATION / GOVERNANCE SLICE — implementation CI pending.**

Branch:

`product/external-execution-authorization-dossier-v0.23.42`

Parent freeze:

`V0.23.41 @ 1af7c4cab92693ee4a8aedcc45e4e0efd1920cf2`

## Objetivo

Preparar un handoff seguro desde la arquitectura offline completa de V0.23.41 hacia una futura ejecución externa, sin crear un nuevo evidence contract ni elevar autoridad.

V0.23.42 no agrega código runtime/productivo. Documenta scopes de autorización, precondiciones, mutaciones permitidas, stop conditions y evidencia requerida.

## Hallazgo central

V0.23.41 fija el orden live después de tener un DEV apto, pero el estado actual no confirma que exista un `vivienda-dev` dedicado y calificado.

Por eso V0.23.42 introduce una Phase 0 previa y no transitiva:

```text
0A cost/organization/region approval
→ 0B dedicated DEV provisioning
→ 0C canonical infrastructure bootstrap
→ 0D DEV-only probe support installation
→ 0E DEV qualification 14/14
→ Phase A live evidence collection
→ Phase A2 external authenticity/trust verification
→ Phase B materialization grant/client materialization
→ Phase C provider parity
```

Runtime activation y deployment permanecen fuera de este dossier.

## Phase 0A

Reusa los 8 approvals definidos por V0.23.14:

1. dedicated project scope;
2. organization selection;
3. provider quote reviewed;
4. cost approved;
5. DEV region approved;
6. synthetic-only scope;
7. no existing-project reuse;
8. provisioning actor authorized.

No muta provider.

## Phase 0B

Permite, solo después de 0A, crear un único proyecto dedicado `vivienda-dev` dentro del costo/organización/región aprobados.

No autoriza SQL.

## Phase 0C

Separa siete migraciones canónicas versionadas bajo `supabase/migrations`.

No incluye DEV fixture SQL.

## Phase 0D

Separa explícitamente los dos scripts DEV-only:

- `V0.23.22_PROVIDER_FIXTURE_SUPPORT.sql`
- `V0.23.26_DEV_PROBE_SUPPORT.sql`

Siguen fuera de migrations y no deben heredarse a STAGING/PROD.

## Phase 0E

Requiere 14/14 V0.23.14 verificados:

- project existence/role/isolation/region;
- migrations;
- security advisors;
- RLS/RPC security;
- identity mapping;
- private storage;
- DB recovery;
- Storage-object recovery;
- server-only secrets;
- synthetic-only;
- runtime fail-closed.

Solo entonces:

```text
devEnvironmentVerified=true
state=qualified_for_staging_candidate
liveRuntimeAuthorized=false
```

## Phase A / A2 / B / C

El dossier conserva la secuencia V0.23.41 y la hace operativa mediante scopes independientes:

- Phase A: recolectar evidencia live synthetic-only;
- Phase A2: verificar autenticidad de receipts y trust del verifier;
- Phase B: emitir/consumir grant final y materializar clients;
- Phase C: ejecutar provider parity de seis probes.

Ningún PASS autoriza automáticamente la siguiente etapa.

## Documentos del slice

1. `knowledge/10_DECISIONS/ADR-0038-external-execution-handoff-authorization-boundary.md`
2. `knowledge/60_ENGINEERING/EXTERNAL-EXECUTION-AUTHORIZATION-DOSSIER-V0.23.42.md`
3. `knowledge/60_ENGINEERING/EXTERNAL-EXECUTION-AUTHORIZATION-REQUEST-TEMPLATE-V0.23.42.md`
4. `knowledge/00_PRODUCT/STATUS-V0.23.42.md`

## Plantilla de autorización

La plantilla exige por scope:

- authorization record ID;
- actor/approver;
- expiración/single-use;
- provider organization/project binding;
- costo máximo cuando aplique;
- mutaciones explícitamente permitidas;
- SQL manifest exacto;
- synthetic-only;
- stop conditions;
- execution receipt posterior;
- `Next Scope Authorized: NO` por defecto.

Runtime activation y deployment no son scopes disponibles en V0.23.42.

## Current truth

Al crear este slice siguen siendo falsos/no confirmados:

```text
dedicatedViviendaDevConfirmed=false
providerCostApproved=false
projectProvisioningAuthorized=false
canonicalMigrationsApplied=false
devFixtureSupportApplied=false
devEnvironmentQualified14of14=false
phaseAEvidenceCollectionAuthorized=false
providerIoLiveOccurred=false
externalTrustVerificationAuthorized=false
materializationGrantAccepted=false
clientsMaterialized=false
providerParityProven=false
runtimeActivationAuthorized=false
deploymentAuthorized=false
```

## No hechos

V0.23.42 no:

- crea proyecto;
- selecciona organización;
- aprueba costos;
- aplica migraciones;
- aplica support SQL;
- configura Auth/Storage/secrets;
- ejecuta provider I/O;
- verifica trust externo;
- emite grants;
- materializa clients;
- ejecuta provider parity;
- toca `runtime.server.ts`;
- activa runtime;
- despliega;
- fusiona PRs.

## CI requerido para freeze

Aunque sea documentation-only, el head final debe demostrar que no introdujo regresión accidental:

- TypeScript PASS;
- Domain tests PASS;
- Build PASS;
- Borrower Journey E2E PASS;
- remote-preview-e2e SKIPPED por diseño.

Después debe abrirse un draft PR apilado sobre V0.23.41 y quedar sin merge.

## Siguiente acción real después de V0.23.42

No debe crearse otro contrato offline de trust/materialization.

La próxima mutación de infraestructura o provider I/O solo es válida después de una autorización explícita usando uno de los scopes documentados. Mientras esa autorización no exista, el desarrollo puede continuar en líneas de producto/UI/UX/domain que no requieran provider live.

## Authority statement

**V0.23.42 Documentation PASS ≠ autorización real de ningún scope.**
