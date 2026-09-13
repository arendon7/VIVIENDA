# ADR-0038 · External Execution Handoff & Scoped Authorization Boundary

## Estado

Aceptado para V0.23.42.

## Contexto

V0.23.41 cerró el trabajo arquitectónico offline de la línea Evidence Runtime y declaró:

```text
offlineArchitectureComplete=true
offlineTrustChainClosed=true
nextProgressRequiresExternalExecution=true
noFurtherOfflineTrustPromotionAllowed=true
```

Sin embargo, ese resultado no significa que exista hoy un entorno DEV listo para ejecutar la secuencia live. V0.23.14 registró que no se identificó un proyecto dedicado a VIVIENDA y definió una autorización de provisioning y una calificación posterior 14/14. V0.23.22 y V0.23.26, además, contienen support SQL DEV-only que deliberadamente permanece fuera de `supabase/migrations` y nunca ha sido aplicado.

Por tanto, saltar directamente desde V0.23.41 a “ejecutar Phase A” mezclaría cuatro autoridades diferentes:

1. aceptar costo y organización del provider;
2. crear/mutar infraestructura;
3. instalar soporte DEV-only;
4. ejecutar provider I/O para recolectar evidencia live.

Esa mezcla sería incompatible con la disciplina fail-closed del stack.

## Decisión

V0.23.42 define un **handoff operativo y de autorización**, no un nuevo evidence contract.

No crea capabilities, no modifica runtime y no intenta satisfacer ninguna condición live. Su función es dividir el siguiente trabajo en scopes de autorización no transitivos.

### Regla principal

> **Autorizar una etapa no autoriza la siguiente.**

En particular:

```text
aprobar costo ≠ crear proyecto
crear proyecto ≠ aplicar migraciones
aplicar migraciones ≠ instalar DEV probe support
DEV 14/14 ≠ autorizar Phase A
Phase A ≠ aceptar receipts
aceptar receipts ≠ emitir grant de materialización
materializar clients ≠ provider parity PASS
provider parity PASS ≠ runtime activation
deployment ≠ implícito en ninguna etapa anterior
```

## Phase 0 · Establish Qualified DEV

Antes de la secuencia externa de V0.23.41 deben existir cinco subetapas independientes.

### 0A · Commercial / tenancy authorization

Debe resolver explícitamente:

- organización Supabase elegida;
- quote vigente del provider;
- aprobación del costo;
- región DEV;
- proyecto dedicado;
- synthetic-only;
- prohibición de reutilizar proyectos ajenos;
- actor autorizado para provisioning.

Corresponde al Gate A V0.23.14 y sus 8/8 approvals.

No crea infraestructura.

### 0B · Dedicated DEV provisioning

Únicamente después de 0A puede solicitarse creación de:

`vivienda-dev`

Esta autorización permite creación del proyecto dedicado dentro del límite económico y organizacional expresamente aprobado.

No autoriza SQL, Auth bootstrap, Storage, Phase A ni provider parity.

### 0C · Canonical infrastructure bootstrap

Autoriza, solo en el `vivienda-dev` previamente creado y verificado por identidad, la aplicación versionada de las migraciones canónicas presentes en `supabase/migrations` y la configuración necesaria para poder verificar los controles V0.23.14.

No autoriza scripts de `supabase/dev-fixtures`.

### 0D · DEV-only probe support installation

Autorización separada para instalar exclusivamente en el DEV dedicado:

- `supabase/dev-fixtures/V0.23.22_PROVIDER_FIXTURE_SUPPORT.sql`
- `supabase/dev-fixtures/V0.23.26_DEV_PROBE_SUPPORT.sql`

Estos scripts no son migraciones de producto y contienen soporte sintético/fixture/probe/fault-control. Deben conservar esa naturaleza DEV-only.

0D no autoriza provider evidence execution.

### 0E · DEV qualification

Verificar los 14 requisitos V0.23.14:

1. project exists;
2. role matches DEV;
3. dedicated isolation;
4. region matches authorization;
5. migrations applied and versioned;
6. security advisors reviewed;
7. RLS/RPC security verified;
8. identity mapping verified;
9. private storage verified;
10. database recovery verified;
11. storage-object recovery strategy verified;
12. secrets server-only verified;
13. synthetic-only data verified;
14. runtime fail-closed verified.

Solo 14/14 permite tratar el entorno como `qualified_for_staging_candidate`; incluso entonces `liveRuntimeAuthorized=false`.

## Phase A · Live evidence collection

Solo después de Phase 0 completa y mediante autorización nueva puede ejecutarse:

1. autorización externa Phase A;
2. remote project identity evidence;
3. owner + intruder session evidence;
4. fixture lifecycle sintético;
5. Evidence API provider probes;
6. observability y cleanup;
7. emisión/consumo de receipts correspondientes.

La autorización debe ser synthetic-only y bound al project ref/URL exactos.

## Phase A2 · Independent authenticity / trust verification

La evidencia obtenida en Phase A no se acepta solo porque exista.

Se requiere una autorización separada para verificar externamente:

- autenticidad de los receipts;
- verifier identity;
- trust anchor;
- revocation status;
- independencia del verifier;
- project binding y digests.

V0.23.40 prohíbe sustituir esta ejecución por otro envelope offline.

## Phase B · Final materialization grant

Solo después de receipts live aceptados y trust externamente verificado puede considerarse un grant final:

- single-use;
- TTL limitado;
- exact authority binding;
- bind a live evidence IDs;
- consumo atómico antes de ejecución.

El grant no implica runtime activation ni deployment.

## Phase C · Provider parity

Materializar clients habilitados no demuestra parity.

La suite provider candidate debe ejecutarse separadamente y producir evidencia live de los seis probes canónicos. Un PASS aquí sigue sin autorizar runtime público.

## Phase D · Runtime activation / deployment

Permanece fuera del alcance de V0.23.42. Requiere gates y autoridad separados. `runtime.server.ts` continúa fail-closed.

## No blanket authorization

Una frase genérica como:

> “continúa con Supabase”

no debe interpretarse, por sí sola, como aprobación simultánea de costo, provisioning, SQL, secrets, provider I/O, materialization, parity, runtime activation y deployment.

La autorización operativa futura debe identificar por lo menos:

- scope exacto;
- organización/proyecto afectados;
- límite económico cuando aplique;
- mutaciones permitidas;
- datos permitidos (`synthetic_only`);
- expiración o single-use cuando corresponda;
- exclusiones explícitas.

## Estado actual al aprobar este ADR

```text
dedicatedViviendaDevConfirmed=false
providerCostApproved=false
projectProvisioningAuthorized=false
canonicalMigrationsApplied=false
devFixtureSupportApplied=false
devEnvironmentQualified14of14=false
phaseAEvidenceCollectionAuthorized=false
externalTrustVerificationAuthorized=false
materializationGrantAccepted=false
providerParityProven=false
runtimeActivationAuthorized=false
deploymentAuthorized=false
```

V0.23.42 no cambia ninguno de esos hechos.

## Consecuencias

### Positivas

- convierte la frontera V0.23.41 en un plan operable sin diluir autoridad;
- separa costo, infraestructura, SQL y provider I/O;
- evita reutilización accidental de proyectos existentes;
- hace auditable cada mutación futura;
- preserva la distinción entre migraciones canónicas y support SQL DEV-only;
- permite pedir una autorización mínima y reversible en cada paso.

### Negativas / costo operativo

- una activación real requerirá varias decisiones explícitas;
- el proceso es más lento que una autorización blanket;
- exige conservar evidencias de costo, identidad de proyecto, qualification y cleanup.

El costo se acepta deliberadamente a cambio de trazabilidad y reducción del blast radius.

## Autoridad

**Handoff Dossier PASS ≠ Provisioning Authorized ≠ Project Created ≠ SQL Applied ≠ DEV Qualified ≠ Phase A Authorized ≠ Live Evidence Accepted ≠ Trust Verified ≠ Materialization Authorized ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Restricciones

Este ADR no provisiona, no aplica SQL, no usa credentials, no lee env, no usa Supabase SDK, no ejecuta provider I/O, no toca `runtime.server.ts`, no materializa clients, no activa runtime, no despliega y no hace merge.
