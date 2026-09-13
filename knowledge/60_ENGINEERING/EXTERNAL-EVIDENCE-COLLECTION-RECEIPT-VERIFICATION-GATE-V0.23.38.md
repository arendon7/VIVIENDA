# V0.23.38 · External Evidence Collection Receipt Verification Gate

## Objetivo

Validar offline la estructura, correlación, scope y temporalidad de los receipts de Phase A definidos por V0.23.37, sin aceptar su autenticidad declarada y sin introducir un verifier fake capaz de elevar autoridad.

## Parent freeze

V0.23.37:

`6ba6544edade20cefd3d3ae263a073af3db8c836`

## Source

`server/evidence-api/external-evidence-collection-receipt-verification-gate.ts`

Version:

`V0.23.38-EXTERNAL-EVIDENCE-COLLECTION-RECEIPT-VERIFICATION-GATE-V1`

Evaluator:

`evaluateExternalEvidenceCollectionReceiptVerificationGate`

## Inputs

```ts
{
  upstream: StructuralEvidenceCollectionAuthorizationResult;
  leaseReceipt: ExternalEvidenceCollectionLeaseReceiptEnvelope;
  consumptionReceipt: ExternalEvidenceCollectionConsumptionReceiptEnvelope;
  observedAt: string;
}
```

No hay verifier port, credentials, keys, SDK clients ni network transport.

## Upstream validation

V0.23.38 exige un V0.23.37 structural result exacto:

```text
version=V0.23.37-EVIDENCE-COLLECTION-AUTHORIZATION-EXECUTOR-V1
state=structural_authorization_exchange_satisfied
provider=supabase
projectLabel=vivienda-dev
structuralTransportInvoked=true
structuralLeaseEnvelopeValidated=true
externalLeaseIssuanceRequired=true
```

Y debe conservar false:

```text
externallyIssuedLeaseProven
externalLeaseReceiptAccepted
evidenceCollectionAuthorizationAccepted
evidenceCollectionProviderIoAuthorized
externalConsumptionReceiptAccepted
liveRemoteIdentityEvidenceAccepted
liveSessionBootstrapEvidenceAccepted
explicitMaterializationGrantAccepted
clientMaterializationAuthorized
materializerMayExecute
providerParityProven
runtimeActivationAuthorized
deploymentAuthorized
activationFactsProduced
```

Si upstream se auto-promueve, el gate bloquea antes de considerar receipts.

## Lease receipt envelope

Tipo:

`ExternalEvidenceCollectionLeaseReceiptEnvelope`

Claims estructurales requeridos:

```text
channel=live_materialization_evidence_collection_authorization_receipt
source=external_materialization_control_plane
provenance=externally_issued_and_boundary_verified
provider=supabase
projectLabel=vivienda-dev
```

Bindings:

- project binding ID;
- expected project ref;
- expected HTTPS origin;
- authorization ID;
- issuance receipt ID;
- issuedAt;
- expiresAt.

Scope:

- exact five actions in canonical order;
- maxUsesPerAction=1;
- syntheticFixtureOnly=true;
- providerClientMaterializationAllowed=false;
- runtimeActivationAllowed=false;
- deploymentAllowed=false.

Minimización declarada:

```text
credentialsIncluded=false
authorityHandleIdsIncluded=false
```

## Lease temporal checks

```text
MAX_TTL=300 s
MAX_CLOCK_SKEW=60 s
```

Se exige:

- parseable issuedAt/expiresAt/observedAt;
- expiresAt > issuedAt;
- expiry - issue <= 300 s;
- issue no posterior a observedAt más skew permitido.

## Consumption receipt envelope

Tipo:

`ExternalEvidenceCollectionConsumptionReceiptEnvelope`

Claims:

```text
channel=live_materialization_evidence_collection_consumption_receipt
source=external_materialization_control_plane
provenance=externally_observed_action_consumption
provider=supabase
projectLabel=vivienda-dev
```

Correlation exacta:

- project binding/ref/origin = lease;
- authorizationId = lease authorizationId;
- issuanceReceiptId = lease issuanceReceiptId.

Además requiere:

- completionReceiptId opaco;
- completedAt;
- exact five action uses in canonical order;
- `useCount=1` para cada acción;
- `providerIoObserved=true` para cada acción;
- materialization/runtime/deployment false.

Minimización declarada:

```text
credentialsIncluded=false
accessTokenValuesIncluded=false
syntheticEmailValuesIncluded=false
authorityHandleIdsIncluded=false
```

## Consumption timeline

Se exige:

```text
issuedAt <= completedAt <= expiresAt
issuedAt <= each usedAt <= completedAt
each usedAt <= expiresAt
```

## Estados

```text
receipt_envelopes_structurally_verified
blocked_receipt_envelopes_invalid
```

## Blockers

```text
upstream_structural_result_invalid
lease_receipt_envelope_invalid
lease_receipt_identity_mismatch
lease_receipt_scope_mismatch
lease_receipt_lifetime_invalid
consumption_receipt_envelope_invalid
consumption_receipt_correlation_mismatch
consumption_receipt_scope_mismatch
consumption_receipt_timeline_invalid
```

## Structural PASS

En PASS:

```text
leaseEnvelopeStructurallyVerified=true
consumptionEnvelopeStructurallyVerified=true
receiptCorrelationStructurallyVerified=true
receiptTimelineStructurallyVerified=true
authenticityVerificationStillRequired=true
```

Sin embargo permanece:

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

## Independent authenticity evidence contract

Un structural PASS emite únicamente requisitos para el próximo boundary:

```text
channel=evidence_collection_receipt_authenticity_verification
requiredSource=independent_external_receipt_verifier
requiredProvenance=out_of_process_receipt_authenticity_verification
provider=supabase
projectLabel=vivienda-dev
maxVerificationAgeSeconds=300
```

Requisitos de binding:

- verification evidence ID;
- verifier identity ref;
- verifiedAt;
- issuance receipt ID;
- consumption receipt ID;
- issuance receipt digest;
- consumption receipt digest;
- project identity.

Método permitido:

`cryptographic_signature_or_control_plane_audit_attestation`

Anti-escalation:

```text
structuralValidationAloneAccepted=false
selfReportedProvenanceAccepted=false
materializationAuthorityImplied=false
runtimeActivationImplied=false
deploymentImplied=false
```

Datos prohibidos:

- credentials;
- access token values;
- synthetic email values;
- authority handle IDs.

## Por qué el evaluator es puro

No existe un `verify(): boolean` inyectable. La autenticidad requiere una raíz de confianza que este slice no posee.

Un fake local puede probar:

- parsing;
- exactness;
- correlation;
- timeline;
- data-minimization declarations.

No puede probar:

- issuer authenticity;
- signature validity;
- control-plane audit provenance;
- out-of-process verifier identity.

## Tests

`server/evidence-api/external-evidence-collection-receipt-verification-gate.test.ts`

Vitest ejecuta **36 cases**.

Cobertura principal:

- perfect correlated envelopes => structural PASS only;
- exact independent authenticity evidence contract;
- upstream self-promotion rejection;
- structural provenance masquerading as external rejection;
- lease project drift;
- lease scope/order/max-use/escalation drift;
- lease lifetime failures;
- consumption correlation failures;
- action missing/reordered/multiple/non-observed failures;
- completion outside lifetime;
- action use after completion;
- external-looking strings do not prove authenticity;
- no activation/provider execution facts;
- no runtime/env/network/SDK imports.

## Verificación funcional inicial

Head funcional:

`a2d8fa179ffec1b03ab2f7f422f1bdc4fc1aa7e6`

Push run:

`34782036443`

Verify:

```text
TypeScript PASS
71/71 test files PASS
797/797 tests PASS
V0.23.38 36/36 PASS
Build PASS
```

El source-only run anterior fue cancelado por concurrency al ser superseded por el commit de tests; no constituye un fallo funcional.

## No-go effects/imports

No se usa:

- `runtime.server`;
- activated runtime;
- activation preflight;
- Supabase SDK;
- `createClient`;
- `process.env`;
- fetch/axios/http/https;
- credentials;
- provider I/O.

## Freeze criteria

El freeze requiere un run `pull_request` sobre el head final con docs:

- TypeScript PASS;
- 71/797 Domain PASS;
- V0.23.38 36/36 PASS;
- Build PASS;
- Borrower Journey PASS;
- remote-preview SKIPPED permitido;
- exactamente 5 archivos cambiados;
- PR draft/open/merged=false/mergeable=true.

## Autoridad

**Receipt Envelope Structural PASS ≠ Authenticity Evidence PASS ≠ External Boundary Verification Proven ≠ Receipt Acceptance ≠ Evidence Collection Provider I/O Authorized ≠ Live Evidence PASS ≠ Materialization Grant Accepted ≠ Provider Client Materialization ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**
