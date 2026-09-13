# ADR-0035 · Independent Receipt Authenticity Evidence Contract

## Estado

Aceptado para V0.23.39.

## Contexto

V0.23.38 puede demostrar offline que los receipts de Phase A son estructuralmente válidos, correlacionados y temporalmente coherentes. Sin embargo, esa validación no puede demostrar que los receipts hayan sido realmente emitidos por el control plane declarado ni que el artefacto de verificación sea auténtico.

Un campo como `provenance=out_of_process_receipt_authenticity_verification` o un booleano equivalente sería solo una autoafirmación si la aplicación lo aceptara sin una raíz de confianza independiente.

## Decisión

V0.23.39 introduce un contrato puro que:

1. calcula SHA-256 canónico de los dos receipt envelopes exactos;
2. exige que el artefacto de autenticidad externo bindee esos digests, los receipt IDs y el `projectBindingId`;
3. acepta únicamente, como forma estructural, `cryptographic_signature` o `control_plane_audit_attestation`;
4. valida freshness con máximo 300 segundos y clock skew máximo 60 segundos;
5. prohíbe credentials, tokens, emails sintéticos, authority handle IDs y private signature material en el envelope público;
6. exige que el verifier declare ejecución out-of-process e independencia del issuer;
7. **no acepta esa declaración como prueba suficiente de confianza**;
8. emite un requisito separado para una trust anchor administrada externamente.

## Regla de no auto-promoción

Un resultado exitoso significa únicamente:

```text
authenticity_evidence_structurally_bound
```

No significa:

```text
authenticityEvidenceAccepted=true
externalBoundaryVerificationProven=true
externalLeaseReceiptAccepted=true
evidenceCollectionProviderIoAuthorized=true
```

Todos esos campos permanecen `false`.

## Trust anchor requerida

El siguiente boundary debe demostrar, fuera del mismo artefacto que pretende verificar:

- registro previo de `verifierIdentityRef`;
- registro previo de `verifierTrustAnchorRef`;
- que la trust anchor existía antes de `verifiedAt`;
- independencia del verifier respecto del receipt issuer;
- autenticidad del `verificationArtifactRef`;
- binding exacto de `verificationArtifactDigest`;
- estado de revocación vigente;
- verificación externa de la confianza.

La aplicación no puede aceptar `selfReportedVerifierTrust` ni considerar la validación local estructural como trust proof.

## Canonical receipt digests

Los receipt digests se calculan con:

- serialización JSON recursiva con claves ordenadas;
- preservación del orden de arrays;
- SHA-256;
- representación pública `sha256:<64 lowercase hex>`.

Estos digests prueban que el artefacto externo referencia exactamente los envelopes entregados al evaluador. No prueban quién los emitió.

## Consecuencias

### Positivas

- evita sustituir autenticidad por una cadena de booleans auto-reportados;
- evita TOCTOU sobre contenido de receipts mediante binding criptográfico local;
- separa integridad, autenticidad y trust establishment;
- mantiene V0.23.38 congelado;
- prepara un trust-anchor gate auditable para el siguiente slice.

### Costos

- todavía no se acepta ningún receipt externo como autoridad live;
- hace falta un trust registry/verifier boundary real o una evidencia externa equivalente;
- no se obtiene provider parity ni materialization authority.

## Autoridad

**Authenticity Evidence Structural PASS ≠ Verifier Trust Anchor PASS ≠ Authenticity Evidence Accepted ≠ External Boundary Verification Proven ≠ Receipt Acceptance ≠ Evidence Collection Provider I/O Authorized ≠ Live Evidence PASS ≠ Materialization Grant Accepted ≠ Provider Client Materialization ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Restricciones operativas

V0.23.39 no:

- lee `process.env`;
- usa `@supabase/supabase-js`;
- hace `fetch` ni provider I/O;
- usa credentials;
- toca `runtime.server.ts`;
- materializa clients;
- activa runtime;
- despliega;
- fusiona PRs;
- aplica SQL.
