# STATUS · V0.23.32

## Slice

**Provider Client Factory & Remote Identity Preflight Contract**

## Parent freeze

V0.23.31:

`caed795eaae5053f1ca7ab07277d3282caa62071`

PR padre: #60.

## Branch

`product/provider-client-factory-preflight-v0.23.32`

## Estado actual

Candidate complete; freeze pendiente del run final de `pull_request`.

## Implementación

Source:

`server/evidence-api/provider-client-factory-preflight.ts`

Version:

`V0.23.32-PROVIDER-CLIENT-FACTORY-PREFLIGHT-V1`

Test:

`server/evidence-api/provider-client-factory-preflight.test.ts`

Docs:

- `knowledge/10_DECISIONS/ADR-0028-provider-client-factory-preflight.md`
- `knowledge/60_ENGINEERING/PROVIDER-CLIENT-FACTORY-PREFLIGHT-V0.23.32.md`
- este status.

## Qué queda resuelto

V0.23.32 congela una frontera de preflight pura que exige:

- DEV qualification exacta 14/14;
- provider `supabase`;
- label exacto `vivienda-dev`;
- project binding id opaco;
- project URL HTTPS limpio;
- expected remote project ref separado;
- configuración externa inyectada;
- cero secretos embebidos;
- cero env reads requeridos por contrato;
- cinco authority handles distintos;
- authority classes exactas;
- secret broker como origen declarado;
- server-only handles;
- construction policy sin I/O.

## Qué produce un PASS

State:

`structurally_ready_for_authorized_materialization`

Y dos obligaciones para slices posteriores:

1. `remote_project_identity_attestation`;
2. `synthetic_session_bootstrap`.

Ambas se declaran `performed=false`.

## Qué NO produce

```text
providerIoAuthorized=false
clientMaterializationAuthorized=false
sdkInstantiated=false
remoteIdentityVerified=false
sessionBootstrapProven=false
runtimeServerWasUsed=false
activationFactsProduced=false
deploymentAuthorized=false
```

Por tanto no existe todavía cliente provider real autorizado.

## Verificación previa a docs

Head funcional:

`7ebd142488fc60b5eb5745044f558909b99dd935`

Run push:

`34770874139`

Verify:

- TypeScript PASS;
- Domain 65 files / 682 tests PASS;
- V0.23.32 12/12 PASS;
- Build PASS.

El run fue usado como evidencia funcional previa a documentación, no como freeze definitivo.

## Evidencia externa consultada

La documentación actual de Supabase mantiene el project ref como parte de la URL estándar del proyecto y también soporta custom domains. Por ello V0.23.32 no infiere identidad remota solo a partir del hostname y deja la equivalencia URL/project ref al futuro attestation executor.

Esto es una decisión de modelado; no ocurrió provider I/O desde VIVIENDA.

## Freeze pendiente

Antes de congelar:

1. verificar delta exacto contra V0.23.31;
2. abrir draft PR apilado sobre `product/supabase-provider-client-adapters-v0.23.31`;
3. ejecutar CI `pull_request` sobre el SHA final;
4. exigir TypeScript, Domain, Build y Borrower Journey PASS;
5. remote-preview puede quedar SKIPPED por diseño;
6. exigir `mergeable=true`;
7. registrar freeze solo en metadata del PR, sin commit posterior.

## Autoridad

**Factory Preflight PASS ≠ Client Materialization Authorized ≠ Remote Identity Verified ≠ Session Bootstrap Proven ≠ Live Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Prohibiciones mantenidas

- no merge;
- no provisioning;
- no SQL aplicado;
- no secrets;
- no env reads;
- no provider I/O live;
- no SDK Supabase instalado;
- no `runtime.server.ts` modification;
- no runtime activation;
- no deployment.
