# STATUS · V0.23.25 · Supabase Provider Candidate Execution Driver

## Estado

**Freeze candidate · final CI required.**

Rama:

`product/supabase-provider-candidate-execution-driver-v0.23.25`

Base inmediata:

`product/supabase-provider-candidate-probe-adapter-v0.23.24`

Freeze padre V0.23.24:

`8e6f5dcf99ecb252324f3a9c50687cda8b123b11`

## Pregunta de arquitectura

¿Cómo traducir el execution port V0.23.24 a Auth/JWT, Evidence API HTTP, Storage, state, observability y fault-control reales sin acoplar la certificación al runtime público ni introducir secrets o infraestructura no autorizada?

## Respuesta V0.23.25

Se implementa `SupabaseProviderCandidateExecutionDriver` con seis transportes separados e inyectados:

1. Supabase Auth;
2. Evidence API HTTP;
3. Supabase Storage;
4. Supabase state;
5. Supabase observability;
6. parity-only fault control.

El driver implementa directamente `SupabaseProviderCandidateProbeExecutionPort` y no produce una decisión de paridad.

## HTTP boundary confirmada

Las únicas rutas públicas existentes y usadas por el driver son:

```text
POST /api/v1/cases/{caseId}/evidence/uploads
POST /api/v1/cases/{caseId}/evidence/uploads/{intentId}/complete
POST /api/v1/cases/{caseId}/evidence/{evidenceId}/download
```

`runtime.server.ts` continúa fail-closed y no fue modificado.

`seedCase`, `readCase`, `readIntent`, observability y fault-control permanecen fuera de esa API pública.

## Provider transport invariants

Todos los transportes declaran:

```text
projectLabel=vivienda-dev
syntheticOnly=true
liveRuntimeAuthorized=false
```

y un canal exacto.

El driver declara además:

```text
provider=supabase
externalIoOccurred=true
runtimeServerWasUsed=false
```

## Scope binding

V0.23.25 endurece actor/fault antes de cualquier transporte:

```text
happy_path                 -> owner     + no fault
unauthenticated_prepare    -> anonymous + no fault
missing_data_authorization -> owner     + no fault
cross_case_access          -> intruder  + no fault
missing_uploaded_object    -> owner     + no fault
rate_limit_unavailable     -> owner     + rate_limit_unavailable
```

Una combinación distinta falla `invalid_input` sin tocar Auth, HTTP ni fault-control.

## Storage upload

- bucket exacto `vivienda-evidence`;
- object path ligado al fixture;
- signed capability opaca;
- `application/pdf`;
- 2048 bytes sintéticos deterministas;
- `upsert=false`;
- solo 2xx aceptado.

## Fault injection

`rate_limit_unavailable`:

- no usa headers ni body público;
- se arma por canal separado `parity_fault_control`;
- one-shot;
- receipt fixture-bound;
- disarm obligatorio;
- disarm se intenta aunque HTTP falle.

## Provider-verifiable observability

El driver exige un envelope completo con:

- source exacto `supabase_dev_observability`;
- observationId;
- fixtureId;
- namespace;
- scope;
- observedAt;
- complete=true;
- registry/storage counters;
- audit operations.

No acepta telemetría foreign o incompleta.

## Error boundary

Solo expone:

```text
invalid_configuration
invalid_input
invalid_transport_response
transport_failure
fault_cleanup_failed
```

Mensaje estable y sanitizado.

## Tests

Archivos de tests:

- `server/evidence-api/supabase-provider-candidate-execution-driver.test.ts`;
- `server/evidence-api/supabase-provider-candidate-execution-driver-scope.test.ts`.

Cubren rutas, Auth actors, signed upload, state, telemetry, one-shot fault lifecycle, transport tampering, scope binding y aislamiento de credentials/runtime.

## Evidencia CI previa al cierre documental

Run `34709064317`, head `bb763944fb307e3456bd482ff805aa66048ab119`:

- TypeScript PASS;
- Domain tests PASS;
- Build PASS;
- Borrower Journey E2E pendiente al momento de cerrar el documento.

El head documental final debe volver a pasar el pipeline completo antes de declarar freeze.

## Archivos del slice

1. `server/evidence-api/supabase-provider-candidate-execution-driver.ts`
2. `server/evidence-api/supabase-provider-candidate-execution-driver.test.ts`
3. `server/evidence-api/supabase-provider-candidate-execution-driver-scope.test.ts`
4. `knowledge/10_DECISIONS/ADR-0021-supabase-provider-candidate-execution-driver.md`
5. `knowledge/60_ENGINEERING/SUPABASE-PROVIDER-CANDIDATE-EXECUTION-DRIVER-V0.23.25.md`
6. `knowledge/00_PRODUCT/STATUS-V0.23.25.md`

## Autoridad

V0.23.25:

- no provisiona Supabase;
- no reutiliza proyectos existentes;
- no usa credentials live;
- no aplica migraciones/SQL;
- no ejecuta Auth/Storage/RPC reales;
- no modifica `runtime.server.ts`;
- no ejecuta parity live;
- no produce activation facts;
- no autoriza STAGING/PROD/deployment.

Regla:

**Execution Driver PASS ≠ Provider Transport PASS ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## CI requerido para freeze

Sobre el head final:

- TypeScript PASS;
- Domain tests PASS;
- Build PASS;
- Borrower Journey E2E / Playwright PASS;
- Remote Preview E2E SKIPPED por diseño.

## Siguiente paso permitido

V0.23.26 · **Supabase DEV Probe Support Plane Contract**:

- definir soporte DEV-only para seed determinista de fixtures;
- definir lecturas provider-verificables de state/intent;
- definir observability counters/audit ligados a fixtureId + namespace + scope;
- definir fault-control one-shot para `rate_limit_unavailable`;
- reutilizar los adapters Supabase existentes donde corresponda;
- mantener soporte parity-only separado del runtime público;
- probar exclusivamente con clientes/RPC falsos;
- si requiere SQL de soporte DEV, mantenerlo fuera de `supabase/migrations` hasta autorización explícita.

Después de ese soporte podrán implementarse los transport adapters concretos de Auth/HTTP/Storage/state/observability/fault y su composición server-only.

La ejecución live continúa bloqueada hasta que exista un `vivienda-dev` autorizado, migrado, con soporte DEV instalado y V0.23.14 observado realmente 14/14.

## Fuera de alcance

- provisioning/billing;
- capacity workaround;
- secrets live;
- aplicar SQL;
- provider parity live;
- datos reales;
- runtime público;
- STAGING/PROD;
- deployment;
- merge del stack.
