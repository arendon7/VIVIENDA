# ADR-0016 — Provider Candidate Parity Harness

**Estado:** Aceptado en V0.23.20

## Contexto

V0.23.19 introdujo el baseline `V0.23.19-RUNTIME-PARITY-V1` y un evaluador provider-neutral capaz de certificar una `EvidenceRuntimeParityObservation` como `conformant` o `nonconformant` mediante 37 checks. Ese contrato define qué debe observarse, pero no imponía cómo un futuro entorno DEV/provider debe ejecutar todos los probes necesarios ni cómo debe ensamblar la observación.

Sin una orquestación canónica, un candidato podría omitir un escenario adversarial, correr probes en un orden distinto con estado compartido accidental, transformar excepciones del proveedor en mensajes inseguros o construir por fuera del contrato una señal de activación.

## Decisión

V0.23.20 introduce `server/evidence-api/provider-candidate-parity-harness.ts` como harness provider-neutral obligatorio para futuras certificaciones de paridad DEV.

El harness acepta una implementación de `EvidenceRuntimeProviderCandidateProbe` y ejecuta exactamente, de forma secuencial:

1. `happy_path`;
2. `unauthenticated_prepare`;
3. `missing_data_authorization`;
4. `cross_case_access`;
5. `missing_uploaded_object`;
6. `rate_limit_unavailable`.

Después ensambla una observación `dev_provider_candidate` y la entrega exclusivamente a `evaluateEvidenceRuntimeParity()` de V0.23.19.

## Contrato del candidato

Un candidato expone:

- `externalIoOccurred`;
- `liveRuntimeAuthorized`;
- `runtimeServerWasUsed`;
- `captureHappyPath()`;
- `captureFailureScenario(scenario)`.

El harness no prescribe el proveedor físico. Una futura implementación DEV puede realizar IO externo contra infraestructura DEV expresamente autorizada, siempre que sus fixtures sean sintéticos, aislados y descartables.

## Fail-closed de ejecución

Los probes se ejecutan secuencialmente para evitar concurrencia implícita entre escenarios stateful.

Si cualquier probe lanza una excepción, el harness:

- detiene los probes posteriores;
- descarta el mensaje interno del proveedor;
- lanza `ProviderCandidateParityHarnessError`;
- conserva solo `code = provider_candidate_parity_probe_failed` y el `scope` canónico.

No se propagan secretos, object paths, SQL details ni mensajes arbitrarios del proveedor.

## Separación de autoridad

Una certificación siempre devuelve literalmente:

- `runtimeActivationAuthorized: false`;
- `activationFactsProduced: false`;
- `deploymentAuthorized: false`.

Además, la decisión V0.23.19 sigue exponiendo:

- `runtimeActivationAuthorized: false`;
- `activationDecisionEvaluated: false`.

Por tanto:

**provider candidate parity PASS ≠ activation preflight PASS ≠ deployment authorization.**

El harness no importa:

- `runtime.server.ts`;
- `activated-runtime.ts`;
- `activation-preflight.ts`.

Tampoco construye `EvidenceRuntimeActivationFacts` ni invoca `createActivatedEvidenceRuntime`.

## Consecuencias

### Positivas

- todo candidato debe ejecutar el conjunto completo de probes;
- el orden queda reproducible;
- V0.23.19 sigue siendo la única autoridad sobre conformance;
- una excepción del proveedor falla cerrada y sanitizada;
- un futuro DEV puede usar IO real sin convertir paridad en activación.

### Costos

- cada proveedor DEV deberá implementar seis capturas observables;
- los fixtures deben aislarse por probe;
- un cambio intencional del baseline exige primero versionar V0.23.19 o su sucesor.

## Fuera de alcance

V0.23.20 no:

- crea `vivienda-dev`;
- configura Supabase/Auth/RLS/Storage;
- aplica migraciones;
- consume secrets;
- usa documentos reales;
- modifica `runtime.server.ts`;
- autoriza deployment o producción.
