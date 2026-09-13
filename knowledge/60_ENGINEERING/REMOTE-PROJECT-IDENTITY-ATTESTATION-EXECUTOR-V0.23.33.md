# V0.23.33 · Remote Project Identity Attestation Executor Contract

## Objetivo

Implementar la frontera ejecutable inmediatamente posterior al preflight V0.23.32 sin convertir una prueba offline/injected en evidencia live del provider.

El slice demuestra que una observación con binding correcto puede ser validada de forma fail-closed. No demuestra que Supabase haya emitido esa observación.

## Source

`server/evidence-api/remote-project-identity-attestation-executor.ts`

Versión:

`V0.23.33-REMOTE-IDENTITY-ATTESTATION-EXECUTOR-V1`

Factory:

`createRemoteProjectIdentityAttestationExecutor`

## Dependencia de entrada

El executor exige un `ProviderClientFactoryPreflightDecision` V0.23.32 con:

- version exacta;
- state `structurally_ready_for_authorized_materialization`;
- provider `supabase`;
- project label `vivienda-dev`;
- synthetic only;
- live runtime false;
- provider I/O unauthorized;
- client materialization unauthorized;
- SDK not instantiated;
- remote identity false;
- session bootstrap false;
- runtime server unused;
- activation facts false;
- deployment false;
- blockers vacíos;
- remote identity requirement presente y consistente con summary fields.

## Transport port

`RemoteIdentityAttestationTransport`:

```text
channel=remote_project_identity_attestation_transport
provider=supabase
projectLabel=vivienda-dev
syntheticOnly=true
liveRuntimeAuthorized=false
liveProviderEvidenceProven=false
```

Método:

`observe(...)`

Input:

- provider;
- project label;
- project binding id;
- expected project ref;
- expected project URL;
- request id;
- nonce;
- requested timestamp.

Output observado:

- provider;
- project label;
- project binding id;
- project ref;
- project URL;
- request id;
- nonce;
- observedAt;
- source `injected_transport_observation`.

## Construction safety

El constructor no llama:

- `observe`;
- clock;
- token source.

Solo valida estructura y conserva el requirement.

## Execution flow

1. leer `requestedAt` del clock inyectado;
2. generar `requestId` opaco;
3. generar `nonce` opaco diferente;
4. llamar una vez al transport inyectado;
5. reducir transport failure a error público sanitizado;
6. leer `completedAt`;
7. validar metadata estructural;
8. validar request/nonce binding;
9. validar identity triple;
10. validar freshness/skew;
11. producir `attestation_contract_satisfied`.

## Identity triple

Se exige match exacto de:

```text
projectBindingId
projectRef
projectUrl
```

Además provider/label deben permanecer exactos.

La URL se normaliza como origin HTTPS limpio.

## Replay/request binding

Una observación de otro request o nonce es inválida aunque el proyecto coincida.

`requestId === nonce` también se bloquea desde el token source.

## Temporal validity

Constantes:

```text
MAX_ATTESTATION_AGE_MS=300000
MAX_CLOCK_SKEW_MS=60000
```

Se rechaza:

- observación demasiado antigua;
- observación demasiado futura;
- clock final incompatible;
- timestamps no parseables.

## Error taxonomy

- `preflight_not_ready`
- `invalid_requirement`
- `invalid_transport`
- `invalid_clock`
- `invalid_token_source`
- `transport_unavailable`
- `invalid_transport_response`
- `identity_mismatch`
- `stale_observation`

Todos exponen el mismo message sanitizado:

`Remote project identity attestation failed.`

## Resultado PASS

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

## Tests

`server/evidence-api/remote-project-identity-attestation-executor.test.ts`

Cobertura:

1. constructor zero-I/O;
2. happy path sin elevación de autoridad;
3. request id + nonce binding;
4. project binding/ref/URL mismatch;
5. malformed provider/source metadata;
6. freshness/skew;
7. transport failure sanitization;
8. invalid transport metadata before I/O;
9. blocked/tampered V0.23.32 preflight;
10. requirement/summary tamper;
11. clock/token source validation;
12. no env/SDK/activation/direct network implementation.

## Verificación previa a docs

Head funcional:

`c4fa12f01858500b5c5ec63c8c16d02f4536bbe6`

Run push:

`34771314922`

Verify:

- TypeScript PASS;
- Domain 66 files / 694 tests PASS;
- V0.23.33 12/12 PASS;
- Build PASS.

Esta verificación es evidencia del contrato offline, no del provider remoto.

## Prohibiciones

- no live provider I/O;
- no Supabase SDK;
- no env reads;
- no credentials;
- no SQL;
- no provisioning;
- no runtime public activation;
- no deployment.

## Autoridad

**Attestation Executor PASS ≠ Live Remote Identity PASS ≠ Client Materialization Authorized ≠ Session Bootstrap Proven ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**
