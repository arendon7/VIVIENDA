# V0.23.42 · External Execution Authorization Dossier

## Propósito

Transformar el resultado terminal offline de V0.23.41 en un handoff operativo auditable para una futura ejecución externa, sin autorizar ni ejecutar ninguna mutación.

Este documento responde cuatro preguntas:

1. ¿qué falta realmente antes de cualquier provider I/O live?;
2. ¿qué debe autorizarse por separado?;
3. ¿qué evidencia debe producir cada etapa?;
4. ¿qué sigue expresamente prohibido después de cada PASS?

## Estado de partida

Freeze padre:

`V0.23.41 @ 1af7c4cab92693ee4a8aedcc45e4e0efd1920cf2`

V0.23.41 demuestra únicamente:

```text
offlineArchitectureComplete=true
offlineTrustChainClosed=true
nextProgressRequiresExternalExecution=true
noFurtherOfflineTrustPromotionAllowed=true
```

No demuestra que exista `vivienda-dev` ni autoriza external execution.

## Truth table actual

| Hecho | Estado actual |
|---|---|
| Proyecto dedicado `vivienda-dev` confirmado | NO |
| Organización Supabase seleccionada | NO confirmada |
| Quote vigente revisado | NO |
| Costo aprobado | NO |
| Provisioning autorizado | NO |
| Proyecto creado | NO confirmado |
| 7 migraciones canónicas aplicadas | NO |
| `V0.23.22_PROVIDER_FIXTURE_SUPPORT.sql` aplicado | NO |
| `V0.23.26_DEV_PROBE_SUPPORT.sql` aplicado | NO |
| DEV calificado 14/14 | NO |
| Secrets live disponibles al runtime | NO |
| Phase A autorizada | NO |
| Provider I/O live ejecutado | NO |
| Receipts live aceptados | NO |
| Trust anchor externamente verificada | NO |
| Grant final aceptado/consumido | NO |
| Clients materializados | NO |
| Provider parity live | NO |
| Runtime activation | NO |
| Deployment | NO |

## Mapa de autorización

### PHASE_0A · Provider tenancy, cost & region approval

**Tipo:** decisión humana/comercial.  
**Mutación provider:** ninguna.

Debe registrar 8 approvals V0.23.14:

1. `dedicated_project_scope_approved`
2. `organization_selection_recorded`
3. `provider_cost_quote_reviewed`
4. `provider_cost_approval_recorded`
5. `development_region_approved`
6. `synthetic_only_scope_approved`
7. `no_existing_project_reuse_approved`
8. `provisioning_actor_authorized`

Además debe quedar registrado:

- organización exacta;
- quote/costo vigente;
- moneda y periodo del costo;
- techo económico autorizado;
- región aprobada — V0.23.14 recomienda `sa-east-1`, pero no la aprueba automáticamente;
- nombre objetivo `vivienda-dev`;
- expiración de la aprobación de costo.

**Salida mínima:** Gate A V0.23.14 = `authorized_for_cost_confirmed_creation`.

**No autoriza:** proyecto, SQL, Auth, Storage, secrets, provider I/O.

---

### PHASE_0B · Dedicated DEV provisioning

**Tipo:** mutación de infraestructura / posible costo.

Precondiciones:

- PHASE_0A completa;
- quote aún vigente;
- organización exacta coincide;
- región exacta coincide;
- nombre exacto `vivienda-dev`;
- ningún proyecto existente será reutilizado.

Acción permitida:

- crear un único proyecto dedicado DEV conforme a la aprobación.

Evidencia requerida después de creación:

- provider project ref;
- clean HTTPS project URL;
- organization binding;
- región;
- timestamp de creación;
- costo/compute finalmente confirmado por provider.

**No autoriza:** migraciones, support SQL, datos reales, provider probes.

---

### PHASE_0C · Canonical infrastructure bootstrap

**Tipo:** mutación DB/Auth/Storage/configuration.

Precondiciones:

- proyecto dedicado creado;
- identidad remota del target confirmada fuera de ambigüedad;
- target sigue siendo synthetic-only;
- secrets solo mediante canal server-only autorizado.

Migraciones canónicas actualmente presentes, en orden:

1. `20260826070000_vivienda_schema_v07.sql`
2. `20260826070100_vivienda_rpc_v07.sql`
3. `20260826070200_vivienda_security_hardening_v07.sql`
4. `20260826070300_vivienda_integrity_hardening_v07.sql`
5. `20260826070400_vivienda_identity_storage_lifecycle_v07.sql`
6. `20260826080000_vivienda_storage_coordination_v08.sql`
7. `20260826080100_vivienda_storage_retry_hardening_v08.sql`

Reglas:

- aplicar únicamente mediante mecanismo versionado/trazable;
- no ejecutar SQL manual fuera del set autorizado;
- registrar hash/versión de cada migration aplicada;
- revisar security advisors después de aplicar;
- configurar identidad, private storage y recovery según V0.23.14;
- `runtime.server.ts` permanece fail-closed.

**No incluye:** los scripts bajo `supabase/dev-fixtures`.

---

### PHASE_0D · DEV-only provider probe support

**Tipo:** mutación DEV-only separada.

Scripts exactos:

1. `supabase/dev-fixtures/V0.23.22_PROVIDER_FIXTURE_SUPPORT.sql`
2. `supabase/dev-fixtures/V0.23.26_DEV_PROBE_SUPPORT.sql`

Razón de separación:

- están deliberadamente fuera de `supabase/migrations`;
- contienen fixture administration, residue inspection, observability y fault-control synthetic-only;
- no deben migrar a STAGING/PROD por herencia automática.

Precondiciones:

- target comprobado como `vivienda-dev` dedicado;
- canonical migrations ya aplicadas;
- service-role/admin execution channel controlado server-side;
- snapshot/rollback apropiado cuando el provider lo permita.

Postcondiciones a verificar:

- RPC/function signatures esperadas;
- service_role-only;
- RLS/security posture intacta;
- support residue visible y purgable;
- one-shot rate-limit fault no expuesto al HTTP público.

**No autoriza:** armar faults ni ejecutar provider parity todavía.

---

### PHASE_0E · DEV Environment Qualification 14/14

Cada requisito debe quedar `verified`, no `configured_unverified`:

1. project exists;
2. project role matches DEV;
3. project isolation verified;
4. region matches authorization;
5. migrations applied and versioned;
6. security advisors reviewed;
7. RLS and RPC security verified;
8. identity mapping verified;
9. private storage verified;
10. database recovery verified;
11. storage object recovery strategy verified;
12. secrets server-only verified;
13. synthetic-only data verified;
14. runtime fail-closed verified.

Salida requerida:

```text
state=qualified_for_staging_candidate
devEnvironmentVerified=true
liveRuntimeAuthorized=false
```

Hasta entonces, PHASE_A debe permanecer bloqueada.

---

## PHASE_A · Authorized live evidence collection

### Objetivo

Producir evidencia live del proyecto DEV y de sesiones sintéticas sin autorizar materialización final ni runtime.

Precondiciones:

- PHASE_0A–0E completas;
- exact `projectBindingId`, project ref y URL fijados;
- cinco authority channels materializables desde secret broker server-only;
- fixture TTL y cleanup V0.23.21 respetados;
- nueva autorización explícita para PHASE_A.

Scope permitido:

- synthetic owner/intruder only;
- remote identity attestation;
- provider-supported session bootstrap;
- fixture lifecycle;
- canonical Evidence API probes;
- Storage synthetic PDF;
- observability/telemetry;
- rate-limit fault one-shot exclusivamente dentro de parity scope;
- cleanup y residue verification.

Scope prohibido:

- usuarios reales;
- documentos reales;
- producción;
- runtime público;
- STAGING;
- deployment;
- materialization grant final implícito.

## PHASE_A2 · Receipt authenticity & external verifier trust

Precondiciones:

- PHASE_A produjo receipts externos completos;
- receipts conservan binding exacto y freshness aceptable.

Verificar externamente:

- canonical receipt digests;
- artifact authenticity;
- verifier identity;
- trust anchor registry;
- anchor effective time;
- revocation current status;
- verifier independence;
- project binding.

La verificación debe ocurrir fuera de la cadena puramente offline. Un envelope local no puede sustituirla.

Salida necesaria antes de PHASE_B:

```text
verifierTrustAnchorExternallyVerified=true
authenticityEvidenceAccepted=true
externalBoundaryVerificationProven=true
evidenceCollectionReceiptsVerified=true
```

Estos facts solo pueden provenir de la futura ruta externa autorizada; V0.23.42 no los produce.

## PHASE_B · Materialization grant

Precondiciones:

- PHASE_A/A2 accepted;
- live remote identity evidence aceptada;
- live session evidence aceptada;
- receipts verificados;
- exact authority set conocido.

Grant requerido:

- source: external materialization control plane;
- action exacta: `materialize_qualified_dev_provider_clients`;
- single-use;
- TTL máximo definido por contrato;
- exact project binding;
- exact live evidence IDs;
- authority-set binding;
- atomic consumption before execution.

Solo después del consumo atómico puede materializarse el client set.

## PHASE_C · Provider parity execution

Client construction no equivale a parity.

Ejecutar los seis probes canónicos V0.23.20 de forma secuencial:

1. happy path;
2. unauthenticated prepare;
3. cross-case access;
4. missing data authorization;
5. missing uploaded object;
6. rate-limit unavailable.

Exigir cleanup/residue PASS al terminar.

**Provider Parity PASS todavía no autoriza runtime activation.**

## PHASE_D · Runtime activation / deployment

Fuera de alcance de este dossier.

Debe conservarse como decisión posterior separada. No debe tocarse `runtime.server.ts` antes de cumplir sus propios gates de activación.

## Matriz de no-transitividad

| PASS de | NO implica |
|---|---|
| 0A | proyecto creado |
| 0B | SQL aplicado |
| 0C | DEV fixture support instalado |
| 0D | DEV 14/14 |
| 0E | Phase A autorizada |
| Phase A | receipts aceptados |
| Phase A2 | grant final aceptado |
| Phase B | parity PASS |
| Phase C | runtime activation |
| Runtime activation | deployment |

## Reglas de rollback y cleanup

Antes de cada scope mutante debe definirse cómo volver a estado seguro:

- provisioning: posibilidad de pausar/eliminar solo con autorización separada; no asumir rollback gratuito;
- canonical DB changes: usar versioning y recovery verificado, no SQL ad-hoc;
- DEV fixture support: conservar scripts exactos y funciones de purge/residue;
- provider probes: TTL <= 30 minutos, disposable synthetic fixtures y cleanup obligatorio;
- session capabilities: no pueden sobrevivir al fixture lease;
- faults: one-shot y disarm;
- errores: fail closed y sin secrets en logs.

## Evidencia que debe preservarse por ejecución

- authorization record ID;
- scope autorizado;
- actor;
- fecha/hora;
- organization + project identity;
- costo/quote cuando aplique;
- commit/freeze SHA del código ejecutado;
- migration/support SQL exactos aplicados;
- receipts/observation IDs sin secretos;
- cleanup outcome;
- CI/provider run outcome;
- blockers;
- no-go facts que permanezcan false.

## Exit criteria del handoff

Este dossier estará listo cuando:

- las etapas estén separadas y no transitivas;
- exista una plantilla explícita de autorización;
- el current truth esté documentado como NO autorizado;
- CI del repositorio permanezca verde;
- ningún archivo productivo/runtime sea modificado por V0.23.42.

## Autoridad

**Authorization Dossier PASS ≠ cualquier autorización real.**

V0.23.42 prepara la decisión humana; no la toma ni la ejecuta.
