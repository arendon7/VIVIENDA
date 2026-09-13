# ADR-0030 · Synthetic Session Bootstrap Executor Contract

## Estado

Accepted for V0.23.34 candidate freeze.

## Contexto

V0.23.32 congeló un preflight estructural con un plan explícito de synthetic session bootstrap, manteniendo correctamente:

```text
sessionBootstrapProven=false
clientMaterializationAuthorized=false
remoteIdentityVerified=false
```

V0.23.33 cerró por separado el contrato del remote identity attestation executor sin convertir observaciones inyectadas en evidencia live del provider.

La siguiente frontera pendiente es demostrar, también de forma fail-closed y offline/injected, que el sistema puede orquestar dos sesiones sintéticas separadas —owner e intruder— mediante emisión y resolución verificables, sin asumir password grant, sin minting local de JWT y sin afirmar que Supabase Auth real fue probado.

## Decisión

V0.23.34 introduce un **Synthetic Session Bootstrap Executor Contract**.

El executor:

- consume un PASS exacto de V0.23.32;
- valida el `ProviderSyntheticSessionBootstrapPlan`;
- exige un transport inyectado con metadata fail-closed;
- opera únicamente sobre un `ProviderCandidateFixtureLease` sintético y disposable;
- genera emails deterministas bajo `vivienda.invalid`;
- ejecuta `issue` y `resolve` por separado para owner e intruder;
- vincula cada operación a request id + nonce opacos;
- exige identidad exacta en issue y resolve;
- exige capabilities distintas para owner e intruder;
- exige que toda capability expire antes o al mismo tiempo que el lease;
- hereda el máximo de 30 minutos de V0.23.21 mediante `PROVIDER_CANDIDATE_MAX_FIXTURE_TTL_MS`;
- sanitiza errores del transport;
- no contiene networking directo, SDK, env reads, secrets ni activation imports.

## Semántica de autoridad

El happy path produce:

```text
state=session_bootstrap_contract_satisfied
sessionBootstrapContractSatisfied=true
injectedTransportInvoked=true
liveProviderSessionProven=false
sessionBootstrapProven=false
remoteIdentityVerified=false
clientMaterializationAuthorized=false
providerParityProven=false
runtimeActivationAuthorized=false
deploymentAuthorized=false
```

La distinción es deliberada: una emisión/resolución entregada por un fake/injected transport demuestra el comportamiento del contrato, no que Supabase Auth haya emitido ni resuelto esas sesiones en un entorno remoto real.

## Constructor sin I/O

La construcción del executor valida únicamente:

- preflight V0.23.32;
- bootstrap plan;
- metadata del transport;
- existencia de clock/token source.

No invoca:

- `issue`;
- `resolve`;
- clock;
- token source;
- red;
- Supabase SDK.

## Fixture boundary

La ejecución exige un fixture:

```text
contractVersion=V0.23.21-PROVIDER-FIXTURE-V1
syntheticOnly=true
disposable=true
```

También exige:

- fixture id válido;
- namespace `vivienda_dev_*` válido;
- owner/intruder subject refs sintéticos y distintos;
- timestamps válidos;
- lease no expirado;
- máximo 60 segundos de future clock skew;
- duración total del lease `<= PROVIDER_CANDIDATE_MAX_FIXTURE_TTL_MS`.

La última regla reutiliza el límite canónico de V0.23.21. V0.23.34 no define un TTL alternativo.

## Session lifetime containment

Una capability sintética solo es válida si:

```text
session.expiresAt > now
session.expiresAt <= lease.expiresAt
```

Por tanto, una sesión sintética no puede permanecer vigente más allá del fixture disposable que le da contexto.

## Synthetic identities

Los emails son deterministas y no enrutable/reales:

```text
fixture+<namespace>.owner@vivienda.invalid
fixture+<namespace>.intruder@vivienda.invalid
```

El executor no recibe passwords y no permite minting local de JWT.

## Issue / resolve binding

Cada actor usa cuatro capabilities opacas:

- issue request id;
- issue nonce;
- resolve request id;
- resolve nonce.

Todas deben ser válidas y distintas dentro de la operación del actor.

Las respuestas del transport deben devolver exactamente:

- actor;
- fixture id;
- namespace;
- subject ref;
- synthetic email;
- request id;
- nonce.

Una respuesta de otra ejecución, actor o identidad se rechaza.

## Owner / intruder separation

Después de validar ambas sesiones, V0.23.34 exige:

```text
owner.subjectRef != intruder.subjectRef
owner.syntheticEmail != intruder.syntheticEmail
owner.accessToken != intruder.accessToken
```

Cualquier colisión produce `session_separation_failed`.

## Transport boundary

El transport debe declarar:

```text
channel=synthetic_session_bootstrap_transport
provider=supabase
projectLabel=vivienda-dev
syntheticOnly=true
liveRuntimeAuthorized=false
liveProviderSessionProven=false
```

V0.23.34 rechaza transports que pretendan autodeclarar evidencia live.

## Error sanitization

Errores lanzados por `issue`/`resolve` y errores provider-shaped se reducen a `transport_unavailable` con mensaje público fijo:

`Synthetic session bootstrap failed.`

No se propagan provider messages, payloads o secret details.

## Hallazgo de hardening

La primera ejecución de CI del test completo detectó una omisión real: el source aceptaba un lease válido temporalmente pero superior al máximo canónico de 30 minutos.

La corrección fue en producción, no en el test:

- importar `PROVIDER_CANDIDATE_MAX_FIXTURE_TTL_MS` desde V0.23.21;
- exigir `expiresAt - issuedAt <= PROVIDER_CANDIDATE_MAX_FIXTURE_TTL_MS`.

Esto conserva una sola fuente de verdad para el TTL disposable.

## Sin implementación live

El source no implementa:

- Supabase Auth SDK;
- password grant;
- magic link / OTP provider flow;
- JWT signing local;
- direct HTTP/fetch;
- secret resolution;
- env reads.

Los tests usan transport in-memory inyectado.

## Autoridad

**Session Bootstrap Executor PASS ≠ Live Provider Session Bootstrap PASS ≠ Remote Identity Verified ≠ Client Materialization Authorized ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Fuera de alcance

- usar Supabase Auth real;
- instalar `@supabase/supabase-js`;
- resolver credentials o service keys;
- declarar `sessionBootstrapProven=true`;
- declarar `remoteIdentityVerified=true`;
- materializar provider clients;
- aplicar SQL;
- provisionar infraestructura;
- modificar `runtime.server.ts`;
- activar runtime;
- desplegar.
