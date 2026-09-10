# STATUS · V0.23.24 · Supabase Provider Candidate Probe Adapter

## Estado

**Freeze candidate · final CI required.**

Rama:

`product/supabase-provider-candidate-probe-adapter-v0.23.24`

Base inmediata:

`product/supabase-dev-admin-control-plane-v0.23.23`

Freeze padre V0.23.23:

`72d136f0cdd80f3da2acf090a67f19d0ef397e77`

## Pregunta de arquitectura

¿Cómo traducimos los seis probes V0.23.20 al candidato Supabase sin permitir que la misma capa devuelva una certificación ya cocinada y sin perder aislamiento, trazabilidad o cleanup?

## Respuesta V0.23.24

Se implementa `SupabaseProviderCandidateProbeAdapter` sobre:

- `ProviderCandidateFixtureSession`;
- `SupabaseProviderCandidateProbeExecutionPort` granular.

El adapter ejecuta las operaciones y **deriva** las observaciones que V0.23.19 evalúa.

## Execution port

Solo permite primitivas:

- seed Case;
- prepare;
- upload sintético;
- complete;
- download;
- read Case;
- read intent;
- read telemetry.

No puede retornar una parity observation ni una decisión de conformidad completa.

## Provider-candidate invariants

Construcción requiere:

```text
provider=supabase
projectLabel=vivienda-dev
syntheticOnly=true
externalIoOccurred=true
liveRuntimeAuthorized=false
runtimeServerWasUsed=false
```

Por tanto, una rehearsal que declare no haber hecho I/O externo no puede presentarse a través de este adapter como provider candidate.

## Seis probes

Orden heredado de V0.23.20:

1. happy_path
2. unauthenticated_prepare
3. missing_data_authorization
4. cross_case_access
5. missing_uploaded_object
6. rate_limit_unavailable

Cada ejecución ocurre en un fixture V0.23.21 distinto y cleanup se ejecuta aun si el callback falla.

## Hardening del slice

1. Case/intent/telemetry ligados a fixtureId + namespace;
2. object path preparado ligado a intent/evidence del mismo fixture;
3. clasificación browser débil enviada de forma deliberada para comprobar autoridad server-side;
4. actor adversarial definido por scope;
5. rate-limit fault permitido solo en `rate_limit_unavailable`;
6. missing object ejecuta prepare → no upload → complete;
7. public error leakage se detecta, no se limpia artificialmente;
8. public Case read-model Storage/checksum leakage se deriva localmente;
9. telemetry counters validados;
10. provider exceptions sanitizadas;
11. external I/O declarado obligatorio;
12. cero activation facts.

## Descubrimiento TypeScript

V0.23.19 tipa como literales algunos valores que su evaluator necesita poder observar como desviaciones en runtime:

- `routeCode`;
- `caseTrack`;
- raw Storage locator exposure;
- checksum exposure.

No se modificó el contrato congelado. V0.23.24 mantiene el valor observado y hace un cast exclusivamente en la frontera de `EvidenceRuntimeHappyPathObservation`. El cast no normaliza el dato; una desviación permanece visible al evaluator.

## Tests

La suite V0.23.24 prueba, entre otros:

- una ejecución canónica que debe producir 37/37;
- seis fixtures y namespaces únicos;
- orden exacto de probes;
- cleanup por probe;
- actor/fault exactos;
- DEV no calificado bloqueado;
- foreign prepared upload bloqueado;
- Case owner tampered bloqueado;
- fuga pública detectada;
- exception del execution port sanitizada por V0.23.20;
- read-model leakage derivada localmente;
- rechazo de runtime authority;
- rechazo de `externalIoOccurred=false`;
- aislamiento de runtime/credentials.

## Evidencia CI intermedia

Antes del último invariant `externalIoOccurred=true`, el commit `822ac324444924732094cad835aef6e589911a4f` confirmó:

- TypeScript PASS;
- Domain tests PASS;
- Build PASS.

El head final documental debe volver a pasar el pipeline completo; solo entonces se declara freeze.

## Archivos del slice

1. `server/evidence-api/supabase-provider-candidate-probe-adapter.ts`
2. `server/evidence-api/supabase-provider-candidate-probe-adapter.test.ts`
3. `server/evidence-api/supabase-provider-candidate-probe-external-io.test.ts`
4. `knowledge/10_DECISIONS/ADR-0020-supabase-provider-candidate-probe-adapter.md`
5. `knowledge/60_ENGINEERING/SUPABASE-PROVIDER-CANDIDATE-PROBE-ADAPTER-V0.23.24.md`
6. `knowledge/00_PRODUCT/STATUS-V0.23.24.md`

## Autoridad

V0.23.24:

- no ejecuta provider I/O real en CI/tests;
- no contiene URL/key/env;
- no crea `vivienda-dev`;
- no aplica SQL;
- no activa Evidence Runtime;
- no produce activation facts;
- no autoriza deployment.

Regla:

**Probe Adapter PASS ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## CI requerido para freeze

Sobre el head final:

- TypeScript PASS;
- Domain tests PASS, incluida certificación 37/37 del fake canónico;
- Build PASS;
- Borrower journey E2E / Playwright PASS;
- Remote Preview E2E SKIPPED por diseño.

## Siguiente paso permitido

V0.23.25 · **Supabase Provider Candidate Execution Driver Contract**:

- traducir las primitivas del execution port a transportes concretos del Evidence API/Supabase;
- mantener Auth/JWT, HTTP, Storage upload y observabilidad separados;
- definir telemetría provider-verificable;
- definir rate-limit failure injection parity-only;
- testear con transports falsos, no con un proyecto real.

La ejecución live permanece bloqueada hasta que exista `vivienda-dev` autorizado, migrado, con soporte SQL DEV instalado y V0.23.14 observado realmente 14/14.

## Fuera de alcance

- provisioning/billing;
- reutilización de proyectos existentes;
- secrets live;
- provider parity live;
- datos reales;
- runtime público;
- STAGING/PROD;
- deployment;
- merge del stack.
