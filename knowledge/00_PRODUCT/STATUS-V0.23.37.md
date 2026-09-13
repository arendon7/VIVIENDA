# STATUS · V0.23.37

## Slice

**Evidence Collection Authorization Executor / Receipt Contract**

## Parent freeze

V0.23.36:

`04fa063a4cc33dcd1de6c000b6ba7415aaf7a386`

PR padre: #65.

## Branch

`product/evidence-collection-authorization-executor-v0.23.37`

## Estado actual

Candidate complete; freeze pendiente del CI final de `pull_request`.

## Implementación

Source:

`server/evidence-api/evidence-collection-authorization-executor.ts`

Version:

`V0.23.37-EVIDENCE-COLLECTION-AUTHORIZATION-EXECUTOR-V1`

Tests:

`server/evidence-api/evidence-collection-authorization-executor.test.ts`

Docs:

- ADR-0033;
- engineering contract V0.23.37;
- este status.

## Qué resuelve

V0.23.37 permite probar offline la forma completa de la Phase A lease V0.23.36 sin permitir que un structural fake se convierta en evidencia de emisión externa.

La regla central es:

```text
structural_test_double != externally_issued_and_boundary_verified
```

## Structural transport

Metadata exacta:

```text
structuralOnly=true
externallyIssuedLeaseProven=false
providerIoAuthorized=false
clientMaterializationAuthorized=false
runtimeActivationAuthorized=false
deploymentAuthorized=false
```

Cualquier auto-promoción bloquea antes de `exercise()`.

## Structural observation

Se valida:

- source/provenance estructural exacta;
- project binding/ref/origin;
- authorization ID;
- request ID + nonce binding;
- five-action canonical scope;
- maxUsesPerAction=1;
- synthetic fixture only;
- materialization/runtime/deployment false;
- TTL <= 300 s;
- clock skew <= 60 s;
- lease vigente al terminar el structural exchange.

## External issuance receipt contract

Se define un futuro receipt externo con:

```text
requiredSource=external_materialization_control_plane
requiredProvenance=externally_issued_and_boundary_verified
structuralTestDoubleAcceptedAsExternalEvidence=false
externalBoundaryVerificationRequired=true
```

Debe bindear authorization ID, issuance receipt ID, project identity, timestamps, exact actions y synthetic-only scope.

## External consumption receipt contract

Se define un futuro receipt de consumo con:

```text
requiredProvenance=externally_observed_action_consumption
```

Debe demostrar una única ejecución de cada una de las cinco acciones, con provider I/O observado, sin duplicados ni acciones fuera de scope, antes del expiry.

## Authority mantenida en false

Incluso en structural PASS:

```text
externallyIssuedLeaseProven=false
externalLeaseReceiptAccepted=false
evidenceCollectionAuthorizationAccepted=false
evidenceCollectionProviderIoAuthorized=false
externalConsumptionReceiptAccepted=false
liveRemoteIdentityEvidenceAccepted=false
liveSessionBootstrapEvidenceAccepted=false
explicitMaterializationGrantAccepted=false
clientMaterializationAuthorized=false
materializerMayExecute=false
providerParityProven=false
runtimeActivationAuthorized=false
deploymentAuthorized=false
activationFactsProduced=false
```

## Verificación funcional previa a docs

Head:

`1e124858dfdc0a666e286a9f9248d3a4395bfcb8`

Run push:

`34781587196`

Verify:

- TypeScript PASS;
- Domain **70 files / 761 tests PASS**;
- V0.23.37 **22/22 PASS**;
- Build PASS.

## Freeze pendiente

1. verificar delta exacto contra V0.23.36;
2. exigir solo source + test + ADR + engineering + status;
3. abrir draft PR #66 con base `product/live-materialization-authorization-evidence-v0.23.36`;
4. inmovilizar el head final;
5. usar únicamente el run `pull_request` de ese SHA;
6. exigir TypeScript, Domain, Build y Borrower Journey PASS;
7. remote-preview puede quedar SKIPPED por diseño;
8. exigir PR draft/open/merged=false/mergeable=true;
9. registrar freeze solo en metadata del PR.

## Próxima frontera propuesta

V0.23.38 puede implementar un **External Evidence Collection Receipt Verifier / Acceptance Gate**.

Debe:

- aceptar únicamente receipt provenance externa verificable;
- rechazar explícitamente cualquier `structural_test_double` V0.23.37;
- validar authorization/issuance/completion receipt binding;
- validar exact five-action one-use consumption;
- producir como máximo `evidence_collection_receipts_verified`, no materialization authority;
- seguir sin ejecutar provider I/O por sí mismo;
- no aceptar access tokens, emails sintéticos, secrets ni authority handle IDs como parte del receipt público.

## Autoridad

**Structural Authorization Exchange PASS ≠ External Lease Issued ≠ External Lease Receipt Accepted ≠ Evidence Collection Provider I/O Authorized ≠ Consumption Receipt Accepted ≠ Live Evidence PASS ≠ Materialization Grant Accepted ≠ Provider Client Materialization ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Prohibiciones mantenidas

- no merge;
- no provider I/O live;
- no SDK Supabase;
- no credentials/secrets;
- no env reads;
- no provisioning;
- no SQL aplicado;
- no cambio de `runtime.server.ts`;
- no activation;
- no deployment.
