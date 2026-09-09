# Provider Candidate Parity Harness — V0.23.20

## Objetivo

Definir la única orquestación canónica para convertir un futuro runtime DEV/provider en una `EvidenceRuntimeParityObservation` evaluable por el baseline V0.23.19, sin producir autoridad de activación ni deployment.

## Dependencias canónicas

- V0.23.17 — Synthetic Evidence Runtime Rehearsal.
- V0.23.18 — Synthetic Evidence Failure Rehearsal.
- V0.23.19 — `V0.23.19-RUNTIME-PARITY-V1`, 37 checks.

## API

Archivo:

`server/evidence-api/provider-candidate-parity-harness.ts`

### `EvidenceRuntimeProviderCandidateProbe`

El adapter candidato debe declarar:

```text
externalIoOccurred
liveRuntimeAuthorized
runtimeServerWasUsed
captureHappyPath()
captureFailureScenario(scenario)
```

El contrato no concede confianza a esas declaraciones: `liveRuntimeAuthorized` y `runtimeServerWasUsed` pasan a la observación y el evaluador V0.23.19 las rechaza si son `true`.

### Orden obligatorio

```text
happy_path
→ unauthenticated_prepare
→ missing_data_authorization
→ cross_case_access
→ missing_uploaded_object
→ rate_limit_unavailable
```

Los probes se ejecutan secuencialmente. Cada implementación DEV debe crear fixtures sintéticos y aislados; no debe reutilizar estado entre escenarios salvo infraestructura compartida que no altere la semántica observable.

### Resultado

`ProviderCandidateParityCertification` contiene:

- baseline version;
- probe order;
- observación `dev_provider_candidate`;
- decisión V0.23.19;
- `runtimeActivationAuthorized = false`;
- `activationFactsProduced = false`;
- `deploymentAuthorized = false`.

## Manejo de errores del proveedor

Toda excepción de un probe se encapsula en `ProviderCandidateParityHarnessError`.

Exposición permitida:

- `code = provider_candidate_parity_probe_failed`;
- `scope` del probe.

Exposición prohibida:

- error original;
- SQL/provider details;
- secrets;
- bucket/object paths;
- tokens;
- URLs firmadas;
- datos personales.

El primer probe fallido detiene la secuencia. No se construye una observación parcial como si fuera certificable.

## Separación de capas

### Parity harness

Responsabilidad: ejecutar probes y ensamblar observación.

### Parity evaluator V0.23.19

Responsabilidad: comparar la observación contra los 37 checks del baseline.

### Activation preflight V0.23.12

Responsabilidad independiente: decidir si los 15 requisitos reales de runtime están verificados.

### Activated runtime

Responsabilidad futura: construir el runtime live solamente después del preflight correspondiente.

Estas capas no se colapsan.

## Aislamiento mecánico

Los tests verifican que el harness no importe de forma estática ni dinámica:

- `./runtime.server`;
- `./activated-runtime`;
- `./activation-preflight`.

La comprobación inspecciona módulos reales y no texto de comentarios, evitando falsos positivos de documentación.

## Tests V0.23.20

Se cubren seis propiedades:

1. ejecución secuencial exacta de 1 happy path + 5 failures;
2. candidato equivalente produce 37/37 conformance;
3. conformance no produce authority/deployment;
4. drift del proveedor reutiliza desviaciones V0.23.19;
5. claims de autoridad live/runtime server se rechazan;
6. excepción del probe se sanitiza y detiene probes posteriores, además del aislamiento mecánico del módulo.

> Nota: la suite contiene seis casos `it`; el último integra el test de aislamiento, mientras el manejo de excepción está validado en su caso dedicado.

## Historial del primer gate

Los dos primeros runs detectaron falsos positivos exclusivamente en el test de aislamiento porque buscaban nombres de funciones presentes en comentarios. La producción no fue modificada.

La corrección final inspecciona importaciones estáticas/dinámicas de módulos prohibidos, que es la propiedad arquitectónica real.

Head funcional corregido:

`42a9be8e73e8589e3f0893c7c2a9d53de0d4f0e0`

Run:

`34394312039`

Resultado:

- TypeScript PASS;
- Domain tests PASS — 518/518;
- Build PASS;
- Playwright 244/244 PASS (`2.3m`);
- remote-preview-e2e SKIPPED por diseño.

## No capacidades nuevas

Este slice no crea infraestructura ni rutas públicas. No modifica `runtime.server.ts`, no aplica migraciones, no habilita upload real, no usa Supabase live, no genera activation facts y no autoriza deployment.
