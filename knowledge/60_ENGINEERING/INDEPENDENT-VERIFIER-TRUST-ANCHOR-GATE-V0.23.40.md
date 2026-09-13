# V0.23.40 · Independent Verifier Trust Anchor Gate & Offline Closure Boundary

## Objetivo

Validar offline la evidencia estructural de la trust anchor exigida por V0.23.39 y cerrar explícitamente la cadena de promoción offline.

El slice no verifica una trust anchor real. Su salida exitosa significa únicamente que el sistema llegó al punto exacto donde hace falta una ejecución externa separadamente autorizada.

## Fuente

`server/evidence-api/independent-verifier-trust-anchor-gate.ts`

Versión:

```text
V0.23.40-INDEPENDENT-VERIFIER-TRUST-ANCHOR-GATE-V1
```

## Entrada

`evaluateIndependentVerifierTrustAnchorGate` recibe:

- decisión PASS estructural V0.23.39;
- `IndependentReceiptAuthenticityEvidenceEnvelope` exacto;
- `ExternalVerifierTrustRegistryEvidenceEnvelope`;
- `observedAt` inyectado.

No recibe callbacks, network clients, verifier ports, Supabase clients ni secrets.

## Trust registry envelope

Campos centrales:

```text
channel=independent_receipt_verifier_trust_anchor
source=externally_managed_verifier_trust_registry
provenance=external_trust_registry_observation
provider=supabase
projectLabel=vivienda-dev
projectBindingId
trustRegistryEvidenceId
registryIdentityRef
verifierIdentityRef
verifierTrustAnchorRef
verificationEvidenceId
verificationArtifactRef
verificationArtifactDigest
trustAnchorKind
trustAnchorDigest
registeredAt
effectiveAt
revocationCheckedAt
```

Condiciones afirmadas estructuralmente:

```text
verifierIdentityRegistered=true
trustAnchorRegistered=true
verifierIndependentFromReceiptIssuer=true
verificationArtifactAuthenticityAttested=true
verificationArtifactDigestBound=true
revocationState=not_revoked
```

## Trust anchor kinds

Únicamente:

```text
public_key_fingerprint
control_plane_attestor_identity
```

`trustAnchorDigest` y `verificationArtifactDigest` usan:

```text
sha256:<64 lowercase hex>
```

## Binding

El gate exige coincidencia exacta con V0.23.39 de:

- `projectBindingId`;
- `verifierIdentityRef`;
- `verifierTrustAnchorRef`;
- `verificationEvidenceId`;
- `verificationArtifactRef`;
- `verificationArtifactDigest`.

## Temporalidad

Se exige:

```text
registeredAt <= effectiveAt <= authenticityEvidence.verifiedAt
```

Para revocación:

- observación máxima: 300 segundos;
- future clock skew máximo: 60 segundos;
- estado exacto: `not_revoked`.

## Containment

Deben permanecer false:

```text
credentialsIncluded
privateKeyMaterialIncluded
authorityHandleIdsIncluded
materializationAuthorityIncluded
runtimeActivationAuthorityIncluded
deploymentAuthorityIncluded
```

## PASS estructural

```text
state=trust_anchor_evidence_structurally_verified
trustRegistryEvidenceStructurallyVerified=true
trustRegistryBindingVerified=true
trustAnchorTemporalPreconditionVerified=true
revocationObservationStructurallyCurrent=true
offlineClosureReached=true
offlineTrustChainClosed=true
externalTrustVerificationExecutionRequired=true
noFurtherOfflineTrustPromotionAllowed=true
```

## Requisito terminal

Se emite `ExternalTrustVerificationExecutionRequirement`:

```text
channel=independent_receipt_verifier_external_trust_verification
executionClass=external_authorized_trust_verification
required=true
offlineSatisfactionAllowed=false
separateAuthorizationRequired=true
externalControlPlaneIoRequired=true
mustVerifyRegistryIdentity=true
mustVerifyTrustAnchorAuthenticity=true
mustVerifyRevocationStatus=true
mustVerifyVerifierIndependence=true
mustVerifyVerificationArtifactAuthenticity=true
mustBindProjectIdentity=true
mustBindVerificationEvidence=true
mustBindVerificationArtifactDigest=true
noFurtherOfflineTrustPromotionAllowed=true
performed=false
verified=false
```

No implica materialization/runtime/deployment authority.

## Autoridades que siguen false

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

## Blockers

- `upstream_authenticity_evidence_invalid`
- `trust_anchor_requirement_invalid`
- `authenticity_evidence_binding_invalid`
- `trust_registry_evidence_envelope_invalid`
- `trust_registry_identity_mismatch`
- `trust_registry_artifact_mismatch`
- `trust_anchor_timeline_invalid`
- `revocation_observation_invalid`
- `trust_anchor_scope_invalid`

## Suite

`server/evidence-api/independent-verifier-trust-anchor-gate.test.ts`

Cobertura:

- PASS terminal offline sin promotion;
- requirement externo terminal exacto;
- upstream auto-promovido rechazado;
- requirement alterado;
- authenticity evidence mismatch;
- credentials/private key/authority IDs prohibidos;
- materialization/runtime/deploy authority prohibida;
- verifier/anchor registration;
- verifier independence;
- artifact authenticity/digest binding;
- revoked state;
- identity/artifact mismatch;
- timeline registration/effective/verifiedAt;
- revocation freshness/future skew;
- dos anchor kinds permitidos;
- anchor kind inválido;
- trustAnchorDigest inválido;
- ausencia de activation/provider execution facts;
- scan estático de env/SDK/fetch/runtime.server/createClient/service_role;
- scan explícito contra promoción offline (`offlineSatisfactionAllowed: true`, `verifierTrustAnchorExternallyVerified: true`).

## Verificación funcional previa a docs

Run push `34784421637` sobre `16f1ed3e78f8b59c79b6d5f0f968c1a2bcdedcbd`:

- TypeScript PASS;
- Domain: **73 files / 855 tests PASS**;
- V0.23.40: **31/31 PASS**;
- Build PASS.

## Frontera de arquitectura

Después de V0.23.40 no debe crearse otro contrato offline destinado a “probar” externamente la trust anchor. Cualquier transición hacia `verifierTrustAnchorExternallyVerified=true` debe provenir de una ejecución externa separadamente autorizada y verificable.

## Autoridad resumida

**V0.23.40 PASS ≠ External Trust Verification Authorized ≠ External Trust Verification Performed ≠ Verifier Trust Anchor PASS ≠ Authenticity Evidence Accepted ≠ Receipt Acceptance ≠ Evidence Collection Provider I/O Authorized ≠ Live Evidence PASS ≠ Materialization Grant Accepted ≠ Provider Client Materialization ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**
