# STATUS · V0.23.34

## Slice

**Synthetic Session Bootstrap Executor Contract**

## Parent freeze

V0.23.33:

`471afba1158687ba9ef3afb2e43ebc84780f8f73`

PR padre: #62.

## Branch

`product/synthetic-session-bootstrap-executor-v0.23.34`

## Estado actual

Candidate complete; freeze pendiente de CI final de `pull_request`.

## Implementación

Source:

`server/evidence-api/synthetic-session-bootstrap-executor.ts`

Version:

`V0.23.34-SYNTHETIC-SESSION-BOOTSTRAP-EXECUTOR-V1`

Test:

`server/evidence-api/synthetic-session-bootstrap-executor.test.ts`

Docs:

- `knowledge/10_DECISIONS/ADR-0030-synthetic-session-bootstrap-executor.md`
- `knowledge/60_ENGINEERING/SYNTHETIC-SESSION-BOOTSTRAP-EXECUTOR-V0.23.34.md`
- este status.

## Qué resuelve

V0.23.34 materializa la lógica de validación del session bootstrap plan V0.23.32 contra un transport inyectado:

- preflight exacto requerido;
- session bootstrap plan exacto;
- transport metadata fail-closed;
- fixture V0.23.21 synthetic/disposable requerido;
- owner/intruder separados;
- deterministic `vivienda.invalid` fixture emails;
- issue request id + nonce binding;
- resolve request id + nonce binding;
- issue/resolve identity matching;
- session capability expiration contained by fixture expiration;
- fixture TTL máximo heredado desde V0.23.21;
- sanitized transport errors;
- zero I/O on construction.

## Qué significa PASS

```text
state=session_bootstrap_contract_satisfied
sessionBootstrapContractSatisfied=true
injectedTransportInvoked=true
```

## Qué NO significa PASS

```text
liveProviderSessionProven=false
sessionBootstrapProven=false
remoteIdentityVerified=false
clientMaterializationAuthorized=false
providerParityProven=false
runtimeActivationAuthorized=false
deploymentAuthorized=false
```

No se ha probado Supabase Auth real ni se ha materializado ningún provider client.

## Hardening encontrado

El primer run con la suite completa detectó que un lease de más de 30 minutos podía superar la validación local de V0.23.34.

Head:

`093728f0b9583e37f20cafbc2e80fbaa7fddec23`

Run:

`34771801629`

Resultado relevante:

- TypeScript PASS;
- 706 tests PASS / 1 failure;
- failure: `rejects invalid, expired or overlong disposable fixture leases before auth transport I/O`.

Corrección:

`16a250069c81481095d14922aabef7c6fc445611`

El source ahora importa y aplica `PROVIDER_CANDIDATE_MAX_FIXTURE_TTL_MS` desde V0.23.21, evitando duplicar el límite disposable.

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

## Freeze pendiente

1. verificar delta exacto contra V0.23.33;
2. abrir draft PR apilado sobre `product/remote-identity-attestation-executor-v0.23.33`;
3. usar CI de `pull_request` del SHA final;
4. exigir TypeScript/Domain/Build/Borrower Journey PASS;
5. remote-preview puede quedar SKIPPED por diseño;
6. exigir PR `mergeable=true`;
7. registrar freeze en body del PR sin commit posterior.

## Próxima frontera posible

Después del freeze, V0.23.35 puede definir un **Authorized Client Materialization Gate** que combine, sin elevar autoridad por sí mismo:

- V0.23.32 structural factory preflight;
- V0.23.33 attestation contract result;
- V0.23.34 session bootstrap contract result.

Ese gate no debe confundir resultados injected/offline con evidencia live ni materializar SDK/clients sin una autoridad separada y explícita.

## Autoridad

**Session Bootstrap Executor PASS ≠ Live Provider Session Bootstrap PASS ≠ Remote Identity Verified ≠ Client Materialization Authorized ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Prohibiciones mantenidas

- no merge;
- no provisioning;
- no SQL aplicado;
- no credentials;
- no env reads;
- no Supabase SDK;
- no live provider I/O;
- no local JWT minting;
- no `runtime.server.ts` modification;
- no activation;
- no deployment.
