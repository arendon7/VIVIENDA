# STATUS · V0.23.31

## Slice

**Supabase JS Client Shape Adapter Pack**

Branch:

`product/supabase-provider-client-adapters-v0.23.31`

Parent freeze:

`1abb635dd6b0efde430788d43ca3b45891501d04` · V0.23.30

## Estado actual

Implemented and functionally validated. Freeze pending final pull-request CI on the exact documentation head.

## Entregables

- `server/evidence-api/supabase-provider-client-shape-adapters.ts`
- `server/evidence-api/supabase-provider-client-shape-adapters.test.ts`
- `knowledge/10_DECISIONS/ADR-0027-supabase-client-shape-adapter-pack.md`
- `knowledge/60_ENGINEERING/SUPABASE-PROVIDER-CLIENT-SHAPE-ADAPTERS-V0.23.31.md`
- `knowledge/00_PRODUCT/STATUS-V0.23.31.md`

## Resultado

V0.23.31 baja un nivel desde los bindings V0.23.30 a formas estructurales compatibles con clientes Supabase sin instalar el SDK.

Cubre:

- runtime RPC;
- support RPC;
- fixture admin;
- Evidence Storage;
- synthetic session bootstrap seam.

Storage refleja métodos públicos actuales (`createSignedUploadUrl`, `uploadToSignedUrl`, `exists`, `download`, `createSignedUrl`, `remove`). Inspection calcula SHA-256 localmente.

## Autoridad

```text
provider=supabase
projectLabel=vivienda-dev
syntheticOnly=true
liveRuntimeAuthorized=false
sdkInstantiated=false
remoteIdentityVerified=false
sessionBootstrapProven=false
```

La sesión sigue siendo un seam inyectado. No hay una estrategia Auth concreta aprobada o probada contra un proyecto DEV.

## Functional validation

Head:

`322c1e5377fca25a8a0e7d1894cbf441a63a0320`

Run `34770145209` verify:

- TypeScript PASS;
- Domain 64 files / 670 tests PASS;
- V0.23.31 12/12 PASS;
- Build PASS.

El freeze definitivo debe basarse en un run de `pull_request` del head documental final.

## Restricciones preservadas

- no `@supabase/supabase-js` dependency;
- no SDK client instantiation;
- no env reads;
- no credentials;
- no provider I/O en construcción;
- no remote identity claim;
- no session bootstrap claim;
- no provisioning;
- no SQL aplicado;
- no modificación de `runtime.server.ts`;
- no activation facts;
- no deployment.

## Brecha siguiente

La siguiente frontera es decidir y probar un **provider client factory / session bootstrap contract** que pueda vincular configuración externa autorizada con estas shapes. Esa capa debe separar claramente:

1. material de configuración externo;
2. creación de clientes con authority mínima;
3. remote project identity attestation;
4. synthetic session bootstrap.

No debe ejecutarse contra un proveedor real mientras no exista autorización explícita y un proyecto DEV dedicado realmente calificado.

## Authority rule

**Client Shape Adapter PASS ≠ SDK Client Factory PASS ≠ Session Bootstrap Proven ≠ Remote Project Identity PASS ≠ Live Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**
