# ADR-0029 · Remote Project Identity Attestation Executor Contract

## Estado

Accepted for V0.23.33 candidate freeze.

## Contexto

V0.23.32 congeló un preflight estructural que puede producir un requirement de attestation remota, pero mantuvo correctamente:

```text
remoteIdentityVerified=false
clientMaterializationAuthorized=false
providerIoAuthorized=false
```

El siguiente riesgo es confundir que el executor de attestation funcione correctamente contra un transport inyectado con haber verificado realmente el proyecto Supabase remoto.

## Decisión

V0.23.33 introduce un executor de **contrato** para la attestation de identidad remota.

El executor:

- consume un PASS exacto de V0.23.32;
- valida el requirement de remote identity;
- exige un transport inyectado con metadata fail-closed;
- crea request id y nonce opacos;
- vincula la observación a request id + nonce;
- valida project binding id, project ref y project URL;
- valida freshness y clock skew;
- sanitiza errores del transport;
- no contiene networking directo, SDK, env reads ni secrets.

## Semántica de autoridad

El happy path produce:

```text
state=attestation_contract_satisfied
attestationContractSatisfied=true
injectedTransportInvoked=true
liveProviderEvidenceProven=false
remoteIdentityVerified=false
clientMaterializationAuthorized=false
sessionBootstrapProven=false
providerParityProven=false
runtimeActivationAuthorized=false
deploymentAuthorized=false
```

La distinción es deliberada: una observación entregada por un fake/injected transport demuestra el comportamiento del contrato, no la identidad de un proyecto remoto real.

## Constructor sin I/O

La construcción del executor valida únicamente:

- preflight V0.23.32;
- requirement;
- metadata del transport;
- existencia de clock/token source.

No invoca:

- transport;
- clock;
- token source;
- red;
- Supabase SDK.

## Request binding

Cada ejecución genera dos capabilities opacas distintas:

- `requestId`;
- `nonce`.

La observación debe devolver exactamente ambos valores. Una respuesta con request id o nonce distintos se considera `invalid_transport_response`.

Esto impide que una observación válida para una ejecución distinta sea aceptada por accidente dentro del contrato.

## Identity matching

La observación debe coincidir exactamente con el requirement en:

- provider `supabase`;
- project label `vivienda-dev`;
- project binding id;
- expected project ref;
- normalized HTTPS project URL.

Cualquier diferencia material produce `identity_mismatch`.

## Freshness

V0.23.33 aplica:

- máximo 5 minutos de edad de observación;
- máximo 60 segundos de clock skew tolerado.

Una observación demasiado antigua o futura produce `stale_observation`.

Los timestamps inválidos se rechazan como respuesta inválida o clock inválido, según su origen.

## Transport boundary

El transport debe declarar:

```text
channel=remote_project_identity_attestation_transport
provider=supabase
projectLabel=vivienda-dev
syntheticOnly=true
liveRuntimeAuthorized=false
liveProviderEvidenceProven=false
```

V0.23.33 rechaza cualquier transport que pretenda autodeclarar live evidence.

## Error sanitization

Errores lanzados por el transport y errores provider-shaped se reducen a `transport_unavailable` con mensaje público fijo.

No se propagan:

- provider messages;
- secret details;
- upstream payloads.

## Sin implementación live

El source no implementa:

- `fetch`;
- HTTP requests;
- Supabase RPC;
- Supabase SDK;
- secret resolution;
- env reads.

Los tests usan transport in-memory inyectado.

## Autoridad

**Attestation Executor PASS ≠ Live Remote Identity PASS ≠ Client Materialization Authorized ≠ Session Bootstrap Proven ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Fuera de alcance

- realizar una consulta real a Supabase;
- instalar `@supabase/supabase-js`;
- resolver project credentials;
- declarar `remoteIdentityVerified=true`;
- materializar provider clients;
- session bootstrap;
- aplicar SQL;
- provisionar infraestructura;
- modificar `runtime.server.ts`;
- activar runtime;
- desplegar.
