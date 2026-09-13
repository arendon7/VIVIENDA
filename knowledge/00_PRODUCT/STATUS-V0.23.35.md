# STATUS · V0.23.35

## Slice

**Authorized Client Materialization Gate Contract**

## Parent freeze

V0.23.34:

`39c8747001e9af331bb5c1e023eff19fdcbf48bb`

PR padre: #63.

## Branch

`product/authorized-client-materialization-gate-v0.23.35`

## Estado actual

Candidate complete; freeze pendiente del CI final de `pull_request`.

## Implementación

Source:

`server/evidence-api/authorized-client-materialization-gate.ts`

Version:

`V0.23.35-AUTHORIZED-CLIENT-MATERIALIZATION-GATE-V1`

Test:

`server/evidence-api/authorized-client-materialization-gate.test.ts`

Docs:

- `knowledge/10_DECISIONS/ADR-0031-authorized-client-materialization-gate.md`
- `knowledge/60_ENGINEERING/AUTHORIZED-CLIENT-MATERIALIZATION-GATE-V0.23.35.md`
- este status.

## Qué resuelve

V0.23.35 introduce una barrera pura entre el stack offline/injected V0.23.32–34 y cualquier futura capacidad de construir provider clients.

Un stack coherente puede producir:

```text
state=ready_for_live_materialization_authorization
configurationRevalidated=true
configurationStable=true
contractStackValidated=true
```

pero nunca produce por sí mismo:

```text
providerIoAuthorized=true
sdkInstantiationAuthorized=true
clientMaterializationAuthorized=true
materializerMayExecute=true
remoteIdentityVerified=true
sessionBootstrapProven=true
```

Todas esas autoridades permanecen false.

## Revalidación y drift

El gate recibe una snapshot estructural V0.23.32 y una current config separada.

Re-ejecuta V0.23.32 sobre ambas y luego compara internamente:

- project config;
- qualification;
- construction policy;
- los cinco authority handles exactos.

Esto cierra un punto que el resumen de V0.23.32 no puede observar: dos sets distintos de handles pueden producir el mismo `authorityHandleCount=5`.

El output V0.23.35 no expone ningún handle ID.

## Requirement producido

Cuando el stack offline es coherente, se describe la autoridad live todavía requerida:

1. `authorized_external_live_provider_attestation`;
2. `authorized_external_live_provider_session_bootstrap`;
3. grant single-use de `external_materialization_control_plane` para `materialize_qualified_dev_provider_clients`.

El grant futuro debe:

- durar máximo 300 s;
- vincular project identity;
- vincular authority handles;
- vincular evidencia live;
- consumirse atómicamente.

Antes de ese grant:

```text
providerIoBeforeGrantAllowed=false
sdkInstantiationBeforeGrantAllowed=false
```

## Hallazgo arquitectónico previo a tests

El diseño inicial intentaba detectar drift re-evaluando un único preflight input y comparando la nueva decisión con la decisión V0.23.32 previa.

Esto no podía detectar rotación de handle IDs porque V0.23.32 no devuelve esos IDs.

Se corrigió antes del freeze candidate:

- snapshot input original;
- current input separado;
- comparación exacta interna;
- blocker `preflight_configuration_drift`.

## Hallazgo del primer CI completo

Head:

`774e8435a163c2755df3e2b327aabcc0c5f6b59c`

Run:

`34773304910`

Resultado:

- TypeScript PASS;
- Domain: 710 PASS / 10 FAIL;
- 10 fallas dentro de V0.23.35.

Causa única:

V0.23.35 reutilizaba el regex de request/nonce para `projectBindingId`, pero V0.23.32 permite `_` en el binding canónico.

Corrección productiva:

- `BINDING_ID = /^[A-Za-z0-9_-]{8,80}$/` alineado con V0.23.32;
- `OPAQUE` queda reservado para request/nonce.

La suite no se debilitó.

## Verificación funcional previa a docs

Head:

`20ddd1660aed50e41f4cf6b54a330d96fbb3fe0f`

Run push:

`34773466838`

Verify:

- TypeScript PASS;
- Domain **68 files / 720 tests PASS**;
- V0.23.35 **13/13 PASS**;
- Build PASS.

## Freeze pendiente

1. verificar delta exacto contra V0.23.34;
2. confirmar que solo existan source + test + 3 docs;
3. abrir draft PR #64 con base `product/synthetic-session-bootstrap-executor-v0.23.34`;
4. usar exclusivamente el run `pull_request` del SHA final;
5. exigir TypeScript, Domain, Build y Borrower Journey PASS;
6. remote-preview puede quedar SKIPPED por diseño;
7. exigir `draft=true`, `open`, `merged=false`, `mergeable=true`;
8. registrar freeze en metadata del PR sin commit posterior.

## Próxima frontera posible

Después del freeze, una futura V0.23.36 puede definir el **Live Materialization Authorization Evidence Contract** o el control plane single-use que satisfaga —sin ejecutar aún SDK/client construction— los tres requisitos live emitidos por V0.23.35.

No debe empezar antes del freeze de este slice.

## Autoridad

**Materialization Gate PASS ≠ Live Remote Identity PASS ≠ Live Session Bootstrap PASS ≠ Materialization Grant Accepted ≠ Provider Client Materialization ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Prohibiciones mantenidas

- no merge;
- no provider I/O live;
- no SDK Supabase;
- no secrets/credentials;
- no env reads;
- no provisioning;
- no SQL aplicado;
- no `runtime.server.ts` change;
- no activation;
- no deployment.
