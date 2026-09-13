# V0.23.35 · Authorized Client Materialization Gate Contract

## Objetivo

Agregar una barrera fail-closed entre los contratos offline/injected V0.23.32–34 y cualquier futura ejecución capaz de materializar provider clients.

El slice no autoriza I/O ni construye clients. Su resultado máximo es:

`ready_for_live_materialization_authorization`.

## Source

`server/evidence-api/authorized-client-materialization-gate.ts`

Versión:

`V0.23.35-AUTHORIZED-CLIENT-MATERIALIZATION-GATE-V1`

Función principal:

`evaluateAuthorizedClientMaterializationGate(input)`

## Inputs

`ProviderClientMaterializationGateInput` contiene:

- `preflightInput`: snapshot V0.23.32 original;
- `currentPreflightInput`: configuración actual;
- `preflightDecision`: decisión V0.23.32 suministrada;
- `attestationContract`: resultado V0.23.33;
- `sessionBootstrapContract`: resultado V0.23.34.

No contiene callbacks ni provider clients.

## Preflight revalidation

El gate ejecuta nuevamente:

`evaluateProviderClientFactoryPreflight(...)`

sobre snapshot y current config.

Ambas deben producir un V0.23.32 ready exacto.

Luego verifica que la decisión suministrada coincida con la decisión recalculada de la snapshot en:

- state;
- project binding;
- normalized URL;
- remote project ref;
- handle count;
- remote attestation requirement;
- session bootstrap plan.

## Snapshot/current drift comparison

V0.23.32 deliberadamente no expone handle IDs en su decisión. Por eso V0.23.35 compara directamente los inputs estructurales.

Se comparan los cinco authorities congelados:

1. `candidate_runtime_rpc`
2. `dev_probe_support_rpc`
3. `dev_fixture_admin`
4. `dev_storage`
5. `candidate_session_authority`

Para cada uno se exige estabilidad de:

- authority class;
- `handleId`;
- external broker source;
- `serverOnly`;
- no secret value exposure.

También se compara project config, qualification y construction policy.

Una rotación válida desde el punto de vista V0.23.32 sigue bloqueándose como drift hasta que exista una nueva snapshot/decision explícita.

## Estados

### blocked_contract_inconsistent

Existe al menos uno de:

- preflight no revalidable;
- supplied decision mismatch;
- configuration drift;
- attestation contract inválido;
- session bootstrap contract inválido.

### ready_for_live_materialization_authorization

Significa exclusivamente:

- snapshot y current config siguen siendo V0.23.32 ready;
- current config no deriva de la snapshot;
- supplied preflight corresponde a la snapshot;
- V0.23.33 contract result es coherente y no se auto-eleva;
- V0.23.34 contract result es coherente y no se auto-eleva.

No significa provider authorization.

## Decision safety flags

Incluso en el estado máximo:

```text
syntheticOnly=true
liveRuntimeAuthorized=false
liveMaterializationAuthorizationRequired=true
liveRemoteIdentityEvidenceAccepted=false
liveSessionBootstrapEvidenceAccepted=false
explicitMaterializationGrantAccepted=false
providerIoAuthorized=false
sdkInstantiationAuthorized=false
clientMaterializationAuthorized=false
materializerMayExecute=false
remoteIdentityVerified=false
sessionBootstrapProven=false
providerParityProven=false
runtimeActivationAuthorized=false
deploymentAuthorized=false
activationFactsProduced=false
```

## Authorization requirement descriptor

Cuando `contractStackValidated=true`, el gate devuelve un descriptor separado.

### Project binding

- provider `supabase`;
- project label `vivienda-dev`;
- exact project binding;
- expected project ref;
- normalized project URL;
- authority handle count `5`.

### Mandatory live evidence

Remote identity:

`authorized_external_live_provider_attestation`

Synthetic sessions:

`authorized_external_live_provider_session_bootstrap`

Ambos permanecen `accepted=false` en V0.23.35.

### Explicit grant

Future control plane source:

`external_materialization_control_plane`

Action:

`materialize_qualified_dev_provider_clients`

Properties:

- single-use;
- max TTL 300 seconds;
- project-bound;
- authority-handle-bound;
- live-evidence-bound;
- atomic consumption required.

No implementation of that grant exists in this slice.

## Data minimization

Decision output excludes:

- five authority handle IDs;
- owner access token;
- intruder access token;
- synthetic fixture emails;
- passwords;
- keys;
- secrets.

The gate only returns authority handle count, not identifiers.

## Contract validators

### V0.23.33

Requires:

- exact version/state/provider/project label;
- same binding/ref/url as V0.23.32;
- opaque request id and nonce;
- request id != nonce;
- parseable observedAt;
- contract/injected flags true;
- live evidence, remote identity, materialization, bootstrap, parity, activation, deployment false.

### V0.23.34

Requires:

- exact version/state/provider/project label;
- same binding;
- valid synthetic fixture id and namespace;
- owner/intruder subject refs;
- deterministic `.invalid` emails;
- access tokens structurally present but never copied to output;
- parseable expiration;
- server-only capabilities;
- owner/intruder subject/email/token separation;
- live/promoted flags false.

## Blocker taxonomy

- `preflight_revalidation_failed`
- `preflight_decision_mismatch`
- `preflight_configuration_drift`
- `attestation_contract_invalid`
- `session_bootstrap_contract_invalid`

## No I/O by construction

The source has no:

- `process.env`;
- `@supabase/*` imports;
- `createClient`;
- `fetch`;
- `.rpc` calls;
- public runtime imports;
- activation-preflight imports.

It is a pure evaluator.

## Tests

`server/evidence-api/authorized-client-materialization-gate.test.ts`

13 tests cover:

1. coherent offline stack and zero authority elevation;
2. exact future live authorization descriptor;
3. output data minimization;
4. opaque authority handle rotation detection;
5. project URL/config drift detection;
6. qualification/construction-policy revalidation failure;
7. supplied V0.23.32 decision mismatch;
8. V0.23.33 anti-self-promotion;
9. V0.23.33 malformed/mismatched evidence;
10. V0.23.34 anti-self-promotion;
11. V0.23.34 identity/token/email/server-only tampering;
12. cross-stack binding mismatch fails in originating contract;
13. source dependency/I-O scan.

## Hardening findings

### Finding 1 · Decision-only comparison cannot detect handle rotation

Initial design re-evaluated one preflight input and compared it to V0.23.32 decision fields.

That is insufficient because V0.23.32 intentionally stores only handle count, not handle IDs.

Fix:

- add snapshot/current inputs;
- compare handle IDs internally;
- expose no handles in output.

### Finding 2 · Project binding validator incompatibility

Initial V0.23.35 source reused request/nonce `OPAQUE` regex for project binding.

V0.23.32 canonical binding accepts `_` via:

`^[A-Za-z0-9_-]{8,80}$`

The mismatch caused canonical preflights to fail revalidation.

Fix:

- introduce separate `BINDING_ID` matching V0.23.32;
- reserve `OPAQUE` for request/nonce.

No security boundary was relaxed.

## First complete-suite failure

Head:

`774e8435a163c2755df3e2b327aabcc0c5f6b59c`

Run:

`34773304910`

Result:

- TypeScript PASS;
- 67 existing files passed;
- V0.23.35 file: 3 tests PASS / 10 FAIL;
- 710 PASS / 10 FAIL total.

All 10 failures cascaded from the binding-regex incompatibility, which made the otherwise-valid V0.23.32 preflight fail before downstream contract checks.

## Functional green head before docs

Head:

`20ddd1660aed50e41f4cf6b54a330d96fbb3fe0f`

Run:

`34773466838`

Verify:

- TypeScript PASS;
- Domain **68 files / 720 tests PASS**;
- V0.23.35 **13/13 PASS**;
- Build PASS.

This is still offline/injected evidence only.

## Authority

**Materialization Gate PASS ≠ Live Remote Identity PASS ≠ Live Session Bootstrap PASS ≠ Materialization Grant Accepted ≠ Provider Client Materialization ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Prohibitions

- no provider I/O;
- no SDK/client construction;
- no credentials or secrets;
- no env reads;
- no provisioning;
- no SQL apply;
- no runtime activation;
- no deployment;
- no merge.
