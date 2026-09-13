# ADR-0036 · Independent Verifier Trust Anchor Gate & Offline Closure Boundary

## Estado

Aceptado para V0.23.40.

## Contexto

V0.23.39 puede demostrar offline que un artefacto de autenticidad referencia exactamente los receipts correctos mediante SHA-256 canónico, pero deliberadamente no acepta el claim de autenticidad hasta establecer confianza independiente en el verifier.

Continuar creando contratos offline del tipo “evidencia de la evidencia” produciría una regresión epistemológica: cada nuevo envelope podría autoafirmar la validez del anterior sin introducir una raíz de confianza real.

## Decisión

V0.23.40 es el **límite terminal de la cadena offline de trust**.

El slice:

1. valida estructuralmente una observación proveniente de un trust registry externo;
2. vincula project, verifier, trust anchor y verification artifact contra V0.23.39;
3. valida que la trust anchor estuviera registrada y efectiva antes de `verifiedAt`;
4. valida una observación reciente de revocación;
5. limita los tipos de anchor a `public_key_fingerprint` o `control_plane_attestor_identity`;
6. prohíbe credentials, private key material, authority handle IDs y autoridad de materialización/runtime/deployment;
7. nunca convierte el envelope estructural en trust externally verified;
8. en PASS emite un requisito terminal de **ejecución externa separadamente autorizada**;
9. prohíbe expresamente cualquier nueva promoción offline de confianza.

## Estados terminales offline

En PASS:

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

Pero permanecen:

```text
verifierTrustAnchorExternallyVerified=false
authenticityEvidenceAccepted=false
externalBoundaryVerificationProven=false
evidenceCollectionProviderIoAuthorized=false
clientMaterializationAuthorized=false
runtimeActivationAuthorized=false
deploymentAuthorized=false
```

## Requisito de ejecución externa

V0.23.40 emite:

```text
channel=independent_receipt_verifier_external_trust_verification
executionClass=external_authorized_trust_verification
required=true
offlineSatisfactionAllowed=false
separateAuthorizationRequired=true
externalControlPlaneIoRequired=true
performed=false
verified=false
```

La ejecución futura debe verificar externamente:

- identidad del registry;
- autenticidad de la trust anchor;
- revocation status actual;
- independencia del verifier;
- autenticidad del verification artifact;
- project identity y los IDs/digests ya enlazados.

El requisito no implica autoridad de materialización, runtime ni deployment.

## Por qué termina aquí la cadena offline

Un sistema local puede demostrar:

- coherencia estructural;
- binding entre identificadores;
- integridad de contenido mediante hash;
- coherencia temporal declarada;
- ausencia de campos prohibidos.

No puede demostrar, sin observar una fuente externa confiable, que:

- un registry exista realmente;
- una clave o attestor esté realmente registrado allí;
- no esté revocado en el mundo externo;
- el artifact haya sido realmente producido por el verifier esperado.

Agregar otro envelope local para afirmar esos hechos no aumenta la certeza. Por eso `noFurtherOfflineTrustPromotionAllowed=true` es una propiedad de autoridad, no solo documentación.

## Consecuencias

### Positivas

- evita una recursión infinita de evidence contracts;
- hace explícita la frontera entre razonamiento offline y evidencia externa;
- preserva fail-closed;
- deja una única transición futura auditable y autorizable;
- no altera ningún freeze previo.

### Pendiente

La aplicación todavía no tiene autorización para ejecutar el requisito externo. No se ha verificado ninguna trust anchor real.

## Autoridad

**Offline Trust Closure PASS ≠ External Trust Verification Authorized ≠ External Trust Verification Performed ≠ Verifier Trust Anchor PASS ≠ Authenticity Evidence Accepted ≠ Receipt Acceptance ≠ Evidence Collection Provider I/O Authorized ≠ Live Evidence PASS ≠ Materialization Grant Accepted ≠ Provider Client Materialization ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Restricciones

V0.23.40 no usa env, credentials, Supabase SDK, fetch, provider I/O, `runtime.server.ts`, materialización, runtime activation, deployment, provisioning, SQL ni merge.
