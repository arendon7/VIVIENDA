# STATUS · V0.23.30

## Slice

**Qualified DEV Provider Client Binding Contract**

Branch:

`product/qualified-dev-provider-client-bindings-v0.23.30`

Parent freeze:

`242b7ddad1136c1529c3363c6303ba94a9f8d89d` · V0.23.29

## Estado actual

Implemented and functionally validated. Freeze pending final pull-request CI on the exact final head.

## Entregables

- `server/evidence-api/qualified-dev-provider-client-bindings.ts`
- `server/evidence-api/qualified-dev-provider-client-bindings.test.ts`
- `knowledge/10_DECISIONS/ADR-0026-qualified-dev-provider-client-binding-contract.md`
- `knowledge/60_ENGINEERING/QUALIFIED-DEV-PROVIDER-CLIENT-BINDINGS-V0.23.30.md`
- `knowledge/00_PRODUCT/STATUS-V0.23.30.md`

## Decisión central

Los provider clients se separan en cinco authority channels:

1. canonical runtime RPC;
2. probe support RPC;
3. fixture admin;
4. Storage candidate;
5. synthetic session authority.

Todos deben compartir `projectLabel=vivienda-dev` y un `projectBindingId` común, pero el slice declara expresamente `remoteIdentityVerified=false`.

## Reutilización

V0.23.30 reutiliza sin modificar:

- canonical Supabase persistence adapter;
- canonical Supabase Evidence registry;
- V0.23.23 fixture admin control plane;
- V0.23.26 support plane contract;
- V0.23.27 provider composition;
- V0.23.29 driver↔host bridge.

## Validación funcional antes de docs

Head probado:

`599d85fb768afb1a883e5fa25e7033b4d5e9926c`

GitHub Actions run `34769573743`:

- TypeScript PASS;
- Domain 63 files / 658 tests PASS;
- V0.23.30 tests 10/10 PASS;
- Build PASS.

El run era de push y no constituye todavía freeze metadata. El freeze exige un run de `pull_request` sobre el head documental final.

## Autoridad

```text
provider=supabase
projectLabel=vivienda-dev
syntheticOnly=true
liveRuntimeAuthorized=false
remoteIdentityVerified=false
```

**Client Binding Contract PASS ≠ Remote Project Identity PASS ≠ Concrete Provider Client PASS ≠ Live Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Restricciones preservadas

- no merge;
- no provisioning;
- no SQL aplicado;
- no provider I/O live;
- no credenciales en source;
- no env reads en el binding contract;
- no modificación de `runtime.server.ts`;
- no activation facts;
- no deployment.

## Brecha siguiente

La siguiente frontera es una implementación concreta y verificable de los provider client seams, especialmente session issue/resolve. Debe permanecer separada de runtime activation y no podrá afirmar remote identity o live parity sin evidencia real de un proyecto DEV dedicado y autorización explícita para operar contra él.
