# V0.23.16 · Provider Capacity Recovery Decision

## Objetivo

Convertir un `capacity_exhausted` verificado por V0.23.15 en una decisión operacional explícita, reversible y fail-closed.

V0.23.16 no libera cuota ni crea infraestructura. Define cuándo una estrategia de recuperación podría ejecutarse y cuándo debe permanecer bloqueada.

## Posición en la cadena

1. V0.23.13 — provisioning blueprint
2. V0.23.14 — DEV authorization
3. V0.23.15 — provider capacity preflight
4. **V0.23.16 — capacity recovery decision**
5. eventual recovery mutation/context change
6. V0.23.15 — fresh capacity recheck
7. provider create-project
8. V0.23.14 — DEV qualification

## API

Archivo:

`server/evidence-api/provider-capacity-recovery.ts`

Función:

`evaluateProviderCapacityRecovery(capacity, strategy, facts)`

## Precondición

Solo aplica si:

`capacity.state === "capacity_exhausted"`

De lo contrario:

`state = recovery_not_applicable`

Esto impide usar el recovery gate como bypass cuando la capacidad está apenas unknown/unverified.

## Estrategias

### 1. `defer_provisioning`

No ejecuta mutación y conserva el bloqueo externo.

### 2. `pause_existing_project`

Gates:

- candidateProjectId no vacío;
- candidateProjectPauseSafety = `verified_safe_to_pause`;
- candidateImpactReview = `approved`;
- candidateRestorePath = `verified`;
- pauseApproval = `approved`.

Si todos pasan:

- state = `authorized_for_recovery_mutation`;
- externalMutationMayExecute = true;
- capacityRecheckRequired = true;
- projectCreationMayExecute = false.

### 3. `alternate_organization`

Gates:

- alternateOrganizationId;
- selection = approved;
- capacity = available;
- current cost quote = verified;
- cost approval = approved.

Si todos pasan:

- state = `ready_for_capacity_recheck`;
- externalMutationMayExecute = false;
- capacityRecheckRequired = true;
- projectCreationMayExecute = false.

La capacidad indicada aquí es evidencia de selección; V0.23.15 debe volver a observarla antes de crear.

### 4. `plan_upgrade`

Gates:

- current planUpgradeQuote = verified;
- billingOwnerApproval = approved;
- planUpgradeApproval = approved.

Si todos pasan:

- state = `authorized_for_recovery_mutation`;
- externalMutationMayExecute = true;
- capacityRecheckRequired = true;
- projectCreationMayExecute = false.

## Estados

- `recovery_not_applicable`
- `awaiting_explicit_strategy`
- `deferred`
- `recovery_blocked`
- `authorized_for_recovery_mutation`
- `ready_for_capacity_recheck`

## Blockers tipados

- `capacity_exhaustion_not_verified`
- `explicit_strategy_required`
- `candidate_project_required`
- `candidate_project_not_verified_safe_to_pause`
- `candidate_impact_review_missing`
- `candidate_restore_path_unverified`
- `pause_approval_missing`
- `alternate_organization_required`
- `alternate_organization_selection_missing`
- `alternate_organization_capacity_unavailable`
- `alternate_organization_cost_quote_unverified`
- `alternate_organization_cost_approval_missing`
- `plan_upgrade_quote_unverified`
- `billing_owner_approval_missing`
- `plan_upgrade_approval_missing`

## Regla de no creación directa

Todos los estados, incluso los autorizados, mantienen:

`projectCreationMayExecute = false`

Esto es deliberado.

La operación de recuperación invalida el snapshot de capacidad que originó la decisión. El sistema debe observar nuevamente:

- organización;
- cuota/capacidad;
- pricing;
- cost confirmation.

Solo V0.23.15 puede volver a producir `ready_for_provider_creation`.

## Regla de pausa conservadora

Un proyecto no es seguro de pausar por evidencia negativa o incompleta.

`candidateProjectPauseSafety` admite:

- unknown
- unsafe_to_pause
- verified_safe_to_pause

Solo la última satisface el gate.

Esto refleja el hallazgo operacional actual:

- `superbid-deal-intelligence` presenta actividad material;
- `greenatics-ops` no pudo demostrarse seguro de pausar.

Por ello, el estado actual no autoriza ninguna pausa.

## Pricing

No hay importes hardcoded.

Los costos de plan, organización o proyecto deben provenir del proveedor en el momento de la decisión y convertirse en facts verificados/aprobados.

## Tests

Archivo:

`server/evidence-api/provider-capacity-recovery.test.ts`

Cobertura:

1. recovery no aplica sin exhaustion verificada;
2. estrategia explícita obligatoria;
3. defer no otorga mutación;
4. pause candidate unknown bloquea;
5. pausa exige impact + restore + approval;
6. pausa completa autoriza únicamente la mutación de recuperación;
7. alternate org completa solo prepara capacity recheck;
8. alternate org incompleta bloquea;
9. upgrade requiere quote + billing owner + explicit approval.

## Seguridad semántica

V0.23.16 no implica:

- que exista `vivienda-dev`;
- que se haya liberado cuota;
- que un upgrade haya ocurrido;
- que una organización alternativa exista o esté contratada;
- que DEV esté calificado;
- que runtime live esté habilitado.

## Aceptación

- TypeScript PASS
- Domain tests PASS
- Build PASS
- 244/244 E2E existentes PASS
- remote preview conserva política actual
- cero mutaciones externas durante el slice

## Fuera de alcance

- pausar proyectos;
- cambiar plan;
- crear organización;
- crear proyecto;
- migraciones;
- Auth/Storage;
- datos reales;
- STAGING/PROD;
- runtime live.
