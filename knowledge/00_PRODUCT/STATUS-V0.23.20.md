# STATUS — V0.23.20

## Provider Candidate Parity Harness

**Estado:** freeze candidate

**Parent:** V0.23.19 · Evidence Runtime Parity Contract

**Base SHA:** `3e61e9f42f083f0d373ca98a49b23845ba2094f4`

## Pregunta del slice

Después de congelar un baseline provider-neutral de paridad, ¿cómo obligamos a un futuro candidato DEV a ejecutar exactamente el happy-path y todos los escenarios fail-closed antes de que su comportamiento pueda evaluarse como equivalente?

## Respuesta

V0.23.20 añade un harness provider-neutral que ejecuta exactamente seis probes, en orden secuencial, construye una observación `dev_provider_candidate` y entrega esa observación al evaluador V0.23.19.

El harness **no** concede autoridad de activación, no produce activation facts y no autoriza deployment.

## Implementación

### `server/evidence-api/provider-candidate-parity-harness.ts`

Introduce:

- `PROVIDER_CANDIDATE_PARITY_FAILURE_SCENARIOS`;
- `EvidenceRuntimeProviderCandidateProbe`;
- `ProviderCandidateParityCertification`;
- `ProviderCandidateParityHarnessError`;
- `certifyEvidenceRuntimeProviderCandidate()`.

### Orden canónico

1. `happy_path`
2. `unauthenticated_prepare`
3. `missing_data_authorization`
4. `cross_case_access`
5. `missing_uploaded_object`
6. `rate_limit_unavailable`

La ejecución es secuencial por diseño para evitar concurrencia oculta entre fixtures stateful.

## Autoridad

Toda certificación devuelve:

- `runtimeActivationAuthorized = false`;
- `activationFactsProduced = false`;
- `deploymentAuthorized = false`.

La decisión V0.23.19 mantiene adicionalmente:

- `runtimeActivationAuthorized = false`;
- `activationDecisionEvaluated = false`.

Por tanto:

> **Provider candidate parity PASS ≠ activation preflight PASS ≠ deployment authorization.**

## Manejo fail-closed de errores del probe

Una excepción de cualquier candidate probe:

- detiene la secuencia;
- se transforma en `ProviderCandidateParityHarnessError`;
- conserva únicamente el `scope` canónico;
- no propaga el mensaje original del proveedor;
- no construye una certificación parcial como si fuera válida.

## Aislamiento

El harness no importa, de forma estática ni dinámica:

- `./runtime.server`;
- `./activated-runtime`;
- `./activation-preflight`.

No modifica `runtime.server.ts`.

## Tests

Se fijan seis casos de contrato:

1. orden secuencial exacto y observación `dev_provider_candidate`;
2. candidato equivalente → V0.23.19 `conformant`, 37/37;
3. conformance separada de activation/deployment;
4. drift cross-case con contacto indebido a Storage → desviación canónica;
5. claims de live authority/runtime server → no conformidad;
6. excepción del provider sanitizada y aislamiento mecánico de módulos.

## Incidentes de CI durante el desarrollo

Dos runs fallaron únicamente por un falso positivo del test de aislamiento. La implementación productiva del harness no fue modificada por esos fallos.

### Run `34393927256`

- TypeScript PASS;
- 517/518 domain tests PASS;
- único fallo: búsqueda textual de `createActivatedEvidenceRuntime` detectó el nombre dentro de un comentario;
- build/E2E no ejecutados por dependencia del gate.

### Run `34394151926`

- TypeScript PASS;
- 517/518 domain tests PASS;
- único fallo: un regex todavía comenzó en la palabra `import` dentro del comentario y alcanzó el nombre mencionado;
- build/E2E no ejecutados.

### Corrección final

El test ahora comprueba la propiedad real: ausencia de dependencias estáticas/dinámicas hacia los módulos prohibidos, en lugar de buscar nombres en lenguaje natural.

No hubo cambio de producción entre los runs fallidos y el head funcional verde.

## Certificación funcional

Head:

`42a9be8e73e8589e3f0893c7c2a9d53de0d4f0e0`

Run:

`34394312039`

Resultado:

- TypeScript — PASS
- Domain tests — **518/518 PASS**
- Build — PASS
- Playwright — **244/244 PASS** (`2.3m`)
- Remote Preview E2E — SKIPPED por diseño

## Certificación documental

Head:

`c89c03fcb1d1a57772a5ac2c69a941aeb517dabd`

Run:

`34394799562`

Resultado:

- TypeScript — PASS
- Domain tests — PASS
- Build — PASS
- Playwright — **244/244 PASS** (`1.7m`)
- Remote Preview E2E — SKIPPED por diseño

## Documentación canónica

- `knowledge/10_DECISIONS/ADR-0016-provider-candidate-parity-harness.md`
- `knowledge/60_ENGINEERING/PROVIDER-CANDIDATE-PARITY-HARNESS-V0.23.20.md`
- este STATUS.

## Fuera de alcance / capacidades que siguen en false

V0.23.20 no:

- crea proyecto Supabase;
- provisiona DEV;
- aplica migraciones live;
- configura Auth/RLS/Storage live;
- consume secrets;
- usa documentos personales reales;
- activa rutas públicas de intake;
- cambia `runtime.server.ts`;
- produce `EvidenceRuntimeActivationFacts`;
- invoca `createActivatedEvidenceRuntime`;
- autoriza deployment.

## Regla de freeze

El SHA que contiene este STATUS deberá repetir verify + 244 E2E antes de abrir el PR apilado sobre V0.23.19. Una vez el PR y su merge ref queden verdes, no se permiten commits posteriores al freeze.
