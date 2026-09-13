# V0.23.42 · External Execution Authorization Request Template

## Uso

Esta plantilla existe para registrar una autorización futura **acotada a un único scope**. Completarla no ejecuta ninguna acción por sí mismo.

No usar una autorización blanket. Cuando se necesiten varios scopes, registrar cada uno por separado o enumerarlos explícitamente con sus límites individuales.

---

## 1. Identificación

```text
Authorization Record ID:
Requested Scope:
Requested By:
Approved By:
Approved At:
Expires At / Single Use:
Repository Freeze SHA:
```

Scopes permitidos en esta plantilla:

- `PHASE_0A_PROVIDER_COST_AND_TENANCY_APPROVAL`
- `PHASE_0B_DEDICATED_DEV_PROVISIONING`
- `PHASE_0C_CANONICAL_INFRASTRUCTURE_BOOTSTRAP`
- `PHASE_0D_DEV_PROBE_SUPPORT_INSTALLATION`
- `PHASE_0E_DEV_QUALIFICATION`
- `PHASE_A_LIVE_EVIDENCE_COLLECTION`
- `PHASE_A2_EXTERNAL_TRUST_VERIFICATION`
- `PHASE_B_MATERIALIZATION_GRANT_AND_CLIENT_MATERIALIZATION`
- `PHASE_C_PROVIDER_PARITY_EXECUTION`

Runtime activation y deployment no están disponibles mediante esta plantilla V0.23.42.

---

## 2. Provider / target binding

```text
Provider: supabase
Organization ID / Name:
Project Label: vivienda-dev
Provider Project Ref:
Project URL:
Region:
Project Binding ID:
Synthetic Only: YES
Existing Project Reuse Allowed: NO
```

Si el project todavía no existe, `Provider Project Ref`, `Project URL` y `Project Binding ID` permanecen `N/A` hasta PHASE_0B.

---

## 3. Cost authorization — obligatorio para PHASE_0A/0B

```text
Provider Quote Captured At:
Quote Reference / Evidence:
Plan / Compute:
Currency:
Expected One-Time Cost:
Expected Recurring Cost:
Maximum Authorized Cost:
Cost Approval Expires At:
Unexpected Upsell / Auto-Upgrade Allowed: NO
```

Regla: si el costo observable supera el máximo aprobado o el quote expiró, provisioning debe detenerse y solicitar nueva aprobación.

---

## 4. Mutations explicitly allowed

Marcar únicamente las operaciones autorizadas por el scope seleccionado.

```text
[ ] Create dedicated vivienda-dev project
[ ] Apply canonical versioned migrations
[ ] Configure DEV identity mapping
[ ] Configure private Storage
[ ] Configure server-only secrets
[ ] Configure DB recovery controls
[ ] Configure Storage-object recovery controls
[ ] Apply V0.23.22_PROVIDER_FIXTURE_SUPPORT.sql
[ ] Apply V0.23.26_DEV_PROBE_SUPPORT.sql
[ ] Perform 14/14 DEV qualification checks
[ ] Execute Phase A synthetic provider I/O
[ ] Create synthetic owner/intruder sessions
[ ] Upload deterministic synthetic PDF fixture
[ ] Arm one-shot rate-limit-unavailable probe fault
[ ] Verify external receipt authenticity/trust
[ ] Issue final single-use materialization grant
[ ] Atomically consume final grant
[ ] Materialize qualified DEV provider clients
[ ] Execute six-probe provider parity harness
```

Todo ítem no marcado permanece prohibido.

---

## 5. SQL manifest

### Canonical migrations — PHASE_0C only

```text
[ ] 20260826070000_vivienda_schema_v07.sql
[ ] 20260826070100_vivienda_rpc_v07.sql
[ ] 20260826070200_vivienda_security_hardening_v07.sql
[ ] 20260826070300_vivienda_integrity_hardening_v07.sql
[ ] 20260826070400_vivienda_identity_storage_lifecycle_v07.sql
[ ] 20260826080000_vivienda_storage_coordination_v08.sql
[ ] 20260826080100_vivienda_storage_retry_hardening_v08.sql
```

### DEV-only support — PHASE_0D only

```text
[ ] V0.23.22_PROVIDER_FIXTURE_SUPPORT.sql
[ ] V0.23.26_DEV_PROBE_SUPPORT.sql
```

No se permite SQL adicional por inferencia.

---

## 6. 14/14 DEV qualification record — PHASE_0E

```text
[ ] project_exists = verified
[ ] project_role_matches_dev = verified
[ ] project_isolation_verified = verified
[ ] region_matches_authorization = verified
[ ] migrations_applied_and_versioned = verified
[ ] security_advisors_reviewed = verified
[ ] rls_and_rpc_security_verified = verified
[ ] identity_mapping_verified = verified
[ ] private_storage_verified = verified
[ ] database_recovery_verified = verified
[ ] storage_object_recovery_strategy_verified = verified
[ ] secrets_server_only_verified = verified
[ ] synthetic_only_data_verified = verified
[ ] runtime_fail_closed_verified = verified
```

Expected output only after 14/14:

```text
state=qualified_for_staging_candidate
devEnvironmentVerified=true
liveRuntimeAuthorized=false
```

---

## 7. Phase A boundaries

Obligatorio si `Requested Scope=PHASE_A_LIVE_EVIDENCE_COLLECTION`:

```text
Fixture Data Class: SYNTHETIC ONLY
Fixture Max TTL: 30 minutes
Owner Subject: synthetic
Intruder Subject: synthetic
Real Customer Data Allowed: NO
Public Runtime Allowed: NO
STAGING/PROD Allowed: NO
Cleanup Required: YES
Residue Check Required: YES
One-Shot Fault Scope: rate_limit_unavailable only
```

Canonical probe set:

```text
[ ] happy_path
[ ] unauthenticated_prepare
[ ] cross_case_access
[ ] missing_data_authorization
[ ] missing_uploaded_object
[ ] rate_limit_unavailable
```

Una autorización de Phase A no implica que los receipts obtenidos queden aceptados.

---

## 8. Phase A2 trust verification boundaries

```text
Verifier Registry:
Verifier Identity Ref:
Trust Anchor Ref:
Revocation Check Required: YES
Verifier Independence Required: YES
Receipt Digest Binding Required: YES
Project Binding Required: YES
Offline Self-Assertion Accepted: NO
```

No transportar private signature material, credentials o raw authority handles en el receipt de verificación.

---

## 9. Phase B materialization boundaries

```text
Grant Source: external_materialization_control_plane
Action: materialize_qualified_dev_provider_clients
Single Use: YES
Atomic Consumption Before Execution: YES
Max TTL: <= contract maximum
Exact Project Binding: REQUIRED
Exact Authority-Set Binding: REQUIRED
Live Evidence ID Binding: REQUIRED
Runtime Activation Included: NO
Deployment Included: NO
```

---

## 10. Phase C parity boundaries

```text
Provider: supabase
Project: exact qualified vivienda-dev only
Synthetic Data Only: YES
Six Canonical Probes Required: YES
Fixture Cleanup Required: YES
Support Residue Must Be Zero: YES
Runtime Activation Included: NO
Deployment Included: NO
```

---

## 11. Always-forbidden by this authorization template

Independientemente del scope elegido:

```text
[ X ] Reuse unrelated Supabase projects
[ X ] Real customer documents/data
[ X ] STAGING mutation
[ X ] PROD mutation
[ X ] Public runtime activation
[ X ] Modify runtime.server.ts
[ X ] Deploy application/runtime
[ X ] Merge stacked PRs
[ X ] Persist secrets in repository/logs
[ X ] Locally mint provider JWT as proof
[ X ] Assume structural/offline PASS equals live evidence
[ X ] Treat provider parity as runtime activation
```

`[ X ]` significa **prohibido**, no una casilla para habilitar.

---

## 12. Stop conditions

La ejecución debe detenerse sin ampliar scope si ocurre cualquiera de estas condiciones:

- quote/costo fuera de autorización;
- organization, project ref, URL, region o binding no coinciden;
- project no es dedicado;
- aparece dato real;
- security advisor crítico no resuelto;
- RLS/RPC verification falla;
- recovery no verificable;
- secret exposure;
- SQL fuera del manifest autorizado;
- fixture TTL excedido;
- cleanup/residue falla;
- receipt authenticity/trust no verificable;
- grant expired/reused/not atomically consumed;
- cualquier intento de activar runtime/deploy fuera de scope.

Stop condition no autoriza remediation mutante adicional. Esa remediation requiere nueva autorización si excede el scope vigente.

---

## 13. Execution receipt — completar después, nunca antes

```text
Authorization Record ID:
Scope Executed:
Started At:
Completed At:
Provider Project Ref:
Repository Freeze SHA:
Provider / SQL Mutations Performed:
Observed Cost:
Evidence / Receipt IDs:
Cleanup Result:
Residue Result:
Outcome: PASS | BLOCKED | FAILED
Blockers:
Next Scope Suggested:
Next Scope Authorized: NO
Runtime Activation Authorized: NO
Deployment Authorized: NO
```

La línea `Next Scope Authorized` debe permanecer `NO` hasta una nueva autorización explícita.

---

## Authority statement

Una plantilla completada constituye un registro de intención/autorización únicamente en la medida exacta del scope aprobado. No constituye evidencia de que la operación haya sido ejecutada o haya pasado sus gates.
