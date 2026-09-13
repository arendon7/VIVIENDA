# V0.23.39 · Independent Receipt Authenticity Evidence Contract

## Objetivo

Cerrar la brecha entre:

1. receipts de Phase A estructuralmente válidos (V0.23.38), y
2. receipts cuya autenticidad haya sido demostrada por una fuente independiente.

Este slice **no** verifica una trust anchor real y **no** eleva autoridad. Solo construye el binding exacto entre los receipts y el artefacto externo de autenticidad, y emite el contrato de trust necesario para un slice posterior.

## Fuente

`server/evidence-api/independent-receipt-authenticity-evidence-contract.ts`

Versión:

```text
V0.23.39-INDEPENDENT-RECEIPT-AUTHENTICITY-EVIDENCE-CONTRACT-V1
```

## Entrada

`evaluateIndependentReceiptAuthenticityEvidence` recibe:

- decisión V0.23.38;
- lease receipt exacto;
- consumption receipt exacto;
- `IndependentReceiptAuthenticityEvidenceEnvelope`;
- `observedAt` inyectado.

No recibe network client, Supabase client, verifier port, secrets ni callbacks capaces de auto-reportar confianza.

## Digest canónico

`computeExternalEvidenceCollectionReceiptDigests` calcula dos digests:

```text
issuanceReceiptDigest
consumptionReceiptDigest
```

Formato:

```text
sha256:<64 lowercase hex>
```

La serialización canónica:

- ordena lexicográficamente las claves de objetos;
- mantiene el orden de arrays;
- serializa recursivamente;
- usa SHA-256 de Node;
- no usa red ni provider I/O.

El digest sirve como **content binding**, no como autenticación del issuer.

## Envelope de autenticidad

Campos principales:

```text
channel=evidence_collection_receipt_authenticity_verification
source=independent_external_receipt_verifier
provenance=out_of_process_receipt_authenticity_verification
provider=supabase
projectLabel=vivienda-dev
projectBindingId
verificationEvidenceId
verifierIdentityRef
verifierTrustAnchorRef
verificationArtifactRef
verificationArtifactDigest
verifiedAt
issuanceReceiptId
completionReceiptId
issuanceReceiptDigest
consumptionReceiptDigest
authenticityMethod
authenticityClaim=receipts_authentic
```

Métodos permitidos estructuralmente:

```text
cryptographic_signature
control_plane_audit_attestation
```

## Containment obligatorio

El envelope debe afirmar exactamente:

```text
verifierExecutedOutOfProcess=true
verifierIndependentFromReceiptIssuer=true
verificationArtifactExternallyRetained=true
credentialsIncluded=false
accessTokenValuesIncluded=false
syntheticEmailValuesIncluded=false
authorityHandleIdsIncluded=false
signaturePrivateMaterialIncluded=false
materializationAuthorityIncluded=false
runtimeActivationAuthorityIncluded=false
deploymentAuthorityIncluded=false
```

Un mismatch bloquea el slice.

## Freshness

- edad máxima del artefacto: 300 s;
- clock skew futuro máximo: 60 s.

Un `verifiedAt` stale o excesivamente futuro bloquea.

## Trust-anchor requirement

En structural PASS se emite:

```text
channel=independent_receipt_verifier_trust_anchor
requiredSource=externally_managed_verifier_trust_registry
```

El contrato exige:

- verifier identity registrada;
- trust anchor registrada;
- trust anchor anterior a la verificación;
- independencia del verifier;
- autenticidad del verification artifact;
- binding del digest del artifact;
- revocation status check;
- trust externally verified.

Y prohíbe:

```text
selfReportedVerifierTrustAccepted=true
localStructuralValidationAcceptedAsTrustProof=true
```

## Estados

### PASS estructural

```text
state=authenticity_evidence_structurally_bound
canonicalReceiptDigestsComputed=true
authenticityEvidenceEnvelopeStructurallyVerified=true
authenticityEvidenceReceiptBindingVerified=true
authenticityEvidenceFreshnessStructurallyVerified=true
authenticityClaimObserved=true
independentVerifierTrustStillRequired=true
verifierTrustAnchorExternallyVerified=false
authenticityEvidenceAccepted=false
```

### BLOCKED

```text
state=blocked_authenticity_evidence_invalid
```

Blockers:

- `upstream_receipt_gate_invalid`
- `authenticity_requirement_invalid`
- `receipt_envelope_binding_invalid`
- `authenticity_evidence_envelope_invalid`
- `authenticity_evidence_identity_mismatch`
- `authenticity_evidence_digest_mismatch`
- `authenticity_evidence_freshness_invalid`
- `authenticity_evidence_scope_invalid`

## Autoridades que permanecen false

Incluso en PASS:

```text
verifierTrustAnchorExternallyVerified=false
authenticityEvidenceAccepted=false
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

## Suite

`server/evidence-api/independent-receipt-authenticity-evidence-contract.test.ts`

Cobertura principal:

- happy structural binding sin authority elevation;
- SHA-256 determinista;
- cambio de digest ante cambio del receipt;
- upstream auto-promovido;
- upstream requirement alterado;
- receipt IDs desacoplados;
- credentials/tokens/emails/authority IDs/private material prohibidos;
- verifier no independiente;
- artifact no retenido externamente;
- digest de artifact malformado;
- identity mismatch;
- receipt digest mismatch;
- stale/future evidence;
- ambos métodos permitidos;
- método no soportado;
- claim no canónico;
- trust-anchor requirement exacto;
- ausencia de activation/provider execution facts;
- ausencia estática de env, SDK, fetch, runtime activation y `runtime.server`.

## Verificación funcional

Run push `34783863992` sobre `fa356780af851f07ec4b2d2dd972a44b00c85ca6`:

- TypeScript PASS;
- Domain: **72 files / 824 tests PASS**;
- V0.23.39: **27/27 PASS**;
- Build PASS.

El primer run `34783745974` falló únicamente porque una prueba hostil intentó asignar `true` a un literal TypeScript `false`; la prueba fue corregida mediante cast adversarial a través de `unknown`, sin modificar el contrato productivo.

## Autoridad resumida

**V0.23.39 PASS ≠ Verifier Trust Anchor PASS ≠ Authenticity Evidence Accepted ≠ External Receipt Acceptance ≠ Evidence Collection Provider I/O Authorized ≠ Live Evidence PASS ≠ Materialization Grant Accepted ≠ Provider Client Materialization ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**
