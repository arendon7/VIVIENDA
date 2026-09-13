# V0.23.34 · Synthetic Session Bootstrap Executor Contract

## Objetivo

Implementar la frontera ejecutable del synthetic session bootstrap definido por V0.23.32, manteniendo separadas dos afirmaciones:

1. el contrato de issue/resolve funciona correctamente contra un transport inyectado;
2. un provider Auth real fue probado.

V0.23.34 solo demuestra la primera.

## Source

`server/evidence-api/synthetic-session-bootstrap-executor.ts`

Versión:

`V0.23.34-SYNTHETIC-SESSION-BOOTSTRAP-EXECUTOR-V1`

Executor:

`SyntheticSessionBootstrapExecutor`

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
- bootstrap plan presente y consistente con `projectBindingId`.

El plan debe conservar exactamente:

```text
channel=synthetic_session_bootstrap
strategy=provider_supported_one_time_exchange
ownerAndIntruderRequired=true
deterministicFixtureEmailRequired=true
passwordGrantAssumed=false
locallyMintedJwtAllowed=false
providerIoRequired=true
performed=false
proven=false
```

## Transport port

`SyntheticSessionBootstrapTransport`:

```text
channel=synthetic_session_bootstrap_transport
provider=supabase
projectLabel=vivienda-dev
syntheticOnly=true
liveRuntimeAuthorized=false
liveProviderSessionProven=false
```

Métodos:

- `issue(...)`
- `resolve(...)`

El transport es inyectado. El source V0.23.34 no implementa cómo Supabase Auth emitiría una sesión real.

## Fixture input

`execute(lease)` recibe un `ProviderCandidateFixtureLease` V0.23.21.

Se valida:

- contract version exacta;
- fixture id;
- namespace;
- owner subject ref;
- intruder subject ref;
- subjects distintos;
- synthetic only;
- disposable;
- issued/expires timestamps;
- lease no expirado;
- máximo 60 s de future skew;
- `expiresAt - issuedAt <= PROVIDER_CANDIDATE_MAX_FIXTURE_TTL_MS`.

`PROVIDER_CANDIDATE_MAX_FIXTURE_TTL_MS` se importa desde el lifecycle canónico V0.23.21 y actualmente equivale a 30 minutos.

## Deterministic fixture identities

Email owner:

`fixture+<namespace>.owner@vivienda.invalid`

Email intruder:

`fixture+<namespace>.intruder@vivienda.invalid`

No se usa dominio enrutable ni dirección personal.

## Execution flow

1. leer `now` desde clock inyectado;
2. validar fixture y TTL;
3. seleccionar owner subject;
4. construir owner synthetic email;
5. generar owner issue request id + nonce;
6. llamar `issue(owner)`;
7. validar respuesta, identidad, token y expiración;
8. generar owner resolve request id + nonce distintos;
9. llamar `resolve(owner)`;
10. validar identidad resuelta;
11. repetir 3–10 para intruder;
12. exigir separación owner/intruder;
13. devolver `session_bootstrap_contract_satisfied`.

## Issue observation

`SyntheticSessionIssueObservation` debe devolver:

- source `injected_transport_observation`;
- actor;
- fixture id;
- namespace;
- subject ref;
- synthetic email;
- access token;
- expiresAt;
- request id;
- nonce.

El access token:

- debe tener longitud >= 16;
- máximo 16 KiB;
- no puede contener whitespace/control characters.

La observación debe quedar exactamente vinculada al request/nonce de la llamada.

## Resolve observation

`SyntheticSessionResolveObservation` debe devolver:

- source exacto;
- actor;
- fixture id;
- namespace;
- subject ref;
- synthetic email;
- request id;
- nonce.

El subject/email resuelto debe coincidir con el actor cuya capability se emitió.

## Capability lifetime

La sesión emitida debe satisfacer:

```text
expiresAt > now
expiresAt <= lease.expiresAt
```

Una capability que sobreviva al lease se rechaza con `session_expiry_invalid`.

## Token-source isolation

Por actor se generan cuatro valores opacos:

- `issue_request`;
- `issue_nonce`;
- `resolve_request`;
- `resolve_nonce`.

Cada request/nonce debe ser estructuralmente válido y las cuatro capacidades no pueden colisionar dentro del flujo del actor.

## Owner/intruder separation

Al final:

```text
owner.subjectRef != intruder.subjectRef
owner.syntheticEmail != intruder.syntheticEmail
owner.accessToken != intruder.accessToken
```

Cualquier colisión produce `session_separation_failed`.

## Construction safety

El constructor no llama:

- `issue`;
- `resolve`;
- clock;
- token source.

Solo valida preflight, plan, transport metadata y funciones inyectadas.

## Error taxonomy

- `preflight_not_ready`
- `invalid_plan`
- `invalid_transport`
- `invalid_fixture`
- `invalid_clock`
- `invalid_token_source`
- `transport_unavailable`
- `invalid_transport_response`
- `session_identity_mismatch`
- `session_expiry_invalid`
- `session_separation_failed`

Todos exponen el mismo mensaje público:

`Synthetic session bootstrap failed.`

## Resultado PASS

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

## Tests

`server/evidence-api/synthetic-session-bootstrap-executor.test.ts`

Cobertura:

1. constructor zero-I/O;
2. owner/intruder issue+resolve happy path;
3. deterministic `.invalid` emails y ausencia de password/local JWT inputs;
4. issue request/nonce binding;
5. resolve request/nonce binding;
6. subject/email substitution rejection;
7. malformed/shared/expired/outliving session capabilities;
8. invalid/expired/overlong fixture rejection before Auth transport I/O;
9. issue/resolve transport failure sanitization;
10. transport metadata fail-closed;
11. blocked/tampered preflight/plan rejection;
12. invalid clock/token-source and token reuse rejection;
13. no env/SDK/activation/direct provider networking implementation.

## Hardening encontrado por CI

Primer test-complete head:

`093728f0b9583e37f20cafbc2e80fbaa7fddec23`

Run:

`34771801629`

Resultado:

- TypeScript PASS;
- 66 test files PASS y 1 file con 1 failure;
- 706 tests PASS / 1 failure;
- fallo exacto: lease de duración mayor a 30 minutos no era rechazado.

Corrección productiva:

`16a250069c81481095d14922aabef7c6fc445611`

Se importó `PROVIDER_CANDIDATE_MAX_FIXTURE_TTL_MS` desde V0.23.21 y se añadió el límite al fixture assertion.

## Verificación funcional previa a docs

Head funcional:

`16a250069c81481095d14922aabef7c6fc445611`

Run push:

`34771930745`

Verify:

- TypeScript PASS;
- Domain 67 files / 707 tests PASS;
- V0.23.34 13/13 PASS;
- Build PASS.

Esta verificación es evidencia del contrato offline/injected, no de Supabase Auth remoto.

## Prohibiciones

- no live provider I/O;
- no Supabase SDK;
- no env reads;
- no credentials;
- no password grant assumed;
- no local JWT minting;
- no SQL;
- no provisioning;
- no runtime public activation;
- no deployment.

## Autoridad

**Session Bootstrap Executor PASS ≠ Live Provider Session Bootstrap PASS ≠ Remote Identity Verified ≠ Client Materialization Authorized ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**
