# STATUS · V0.23.38

## Slice

**External Evidence Collection Receipt Verification Gate**

## Parent freeze

V0.23.37:

`6ba6544edade20cefd3d3ae263a073af3db8c836`

PR padre: #66.

## Branch

`product/external-evidence-receipt-verification-gate-v0.23.38`

## Estado actual

Candidate complete; freeze pendiente del CI final de `pull_request`.

## Implementación

Source:

`server/evidence-api/external-evidence-collection-receipt-verification-gate.ts`

Version:

`V0.23.38-EXTERNAL-EVIDENCE-COLLECTION-RECEIPT-VERIFICATION-GATE-V1`

Tests:

`server/evidence-api/external-evidence-collection-receipt-verification-gate.test.ts`

Docs:

- ADR-0034;
- engineering contract V0.23.38;
- este status.

## Qué resuelve

V0.23.38 valida offline los envelopes de issuance y consumption definidos por V0.23.37, pero evita que strings de provenance autodeclaradas se conviertan en prueba de autenticidad.

Regla central:

```text
self_reported_provenance != independent_authenticity_verification
```

## Lease receipt

Valida:

- channel/source/provenance declarada;
- provider/project label;
- project binding/ref/origin;
- authorization ID;
- issuance receipt ID;
- issue/expiry;
- TTL <= 300 s;
- exact five-action canonical scope;
- maxUsesPerAction=1;
- synthetic-only;
- materialization/runtime/deployment false;
- no credentials/handle IDs declarados.

## Consumption receipt

Valida:

- channel/source/provenance declarada;
- exact project correlation;
- authorization/issuance IDs correlacionados;
- completion receipt ID;
- exact five actions en orden;
- `useCount=1`;
- `providerIoObserved=true` para cada acción;
- usedAt entre issue y completion;
- completion antes de expiry;
- no credentials/token/email/handle values;
- materialization/runtime/deployment false.

## Structural PASS

State:

`receipt_envelopes_structurally_verified`

Puede afirmar únicamente:

```text
leaseEnvelopeStructurallyVerified=true
consumptionEnvelopeStructurallyVerified=true
receiptCorrelationStructurallyVerified=true
receiptTimelineStructurallyVerified=true
authenticityVerificationStillRequired=true
```

## Authority conservada en false

Incluso en structural PASS:

```text
externalBoundaryVerificationProven=false
externalLeaseReceiptAccepted=false
evidenceCollectionAuthorizationAccepted=false
evidenceCollectionProviderIoAuthorized=false
externalConsumptionReceiptAccepted=false
evidenceCollectionReceiptsVerified=false
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

## Authenticity evidence futura

Structural PASS emite un contrato para:

```text
channel=evidence_collection_receipt_authenticity_verification
requiredSource=independent_external_receipt_verifier
requiredProvenance=out_of_process_receipt_authenticity_verification
authenticityMethodRequired=cryptographic_signature_or_control_plane_audit_attestation
maxVerificationAgeSeconds=300
```

Debe bindear:

- verifier identity;
- verification evidence ID;
- verifiedAt;
- issuance receipt ID + digest;
- consumption receipt ID + digest;
- project identity.

Y prohíbe:

```text
structuralValidationAloneAccepted=false
selfReportedProvenanceAccepted=false
```

## Verificación funcional previa a docs

Head:

`a2d8fa179ffec1b03ab2f7f422f1bdc4fc1aa7e6`

Run push:

`34782036443`

Verify:

- TypeScript PASS;
- Domain **71 files / 797 tests PASS**;
- V0.23.38 **36/36 PASS**;
- Build PASS.

El run source-only anterior fue cancelado por concurrency al quedar superseded por el commit de tests; no fue un fallo funcional.

## Freeze pendiente

1. verificar delta exacto contra V0.23.37;
2. exigir únicamente source + test + ADR + engineering + status;
3. abrir draft PR #67 con base `product/evidence-collection-authorization-executor-v0.23.37`;
4. inmovilizar head final;
5. usar solo CI `pull_request` del SHA final;
6. exigir TypeScript, Domain, Build y Borrower Journey PASS;
7. remote-preview SKIPPED permitido;
8. exigir draft/open/merged=false/mergeable=true;
9. registrar freeze exclusivamente en metadata del PR.

## Próxima frontera propuesta

V0.23.39 puede definir un **Independent Receipt Authenticity Evidence Adapter / Acceptance Gate**.

Ese slice debe mantener una distinción inviolable entre:

- una observación estructural fake/injected;
- un artefacto de autenticidad realmente proveniente de una raíz externa;
- la aceptación de receipts;
- cualquier autorización posterior de provider I/O/materialización.

No debe incorporar una interfaz que permita a un fake declarar unilateralmente `authentic=true` como autoridad suficiente.

## Autoridad

**Receipt Envelope Structural PASS ≠ Authenticity Evidence PASS ≠ External Boundary Verification Proven ≠ Receipt Acceptance ≠ Evidence Collection Provider I/O Authorized ≠ Live Evidence PASS ≠ Materialization Grant Accepted ≠ Provider Client Materialization ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

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
