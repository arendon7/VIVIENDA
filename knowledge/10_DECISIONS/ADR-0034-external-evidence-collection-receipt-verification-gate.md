# ADR-0034 · External Evidence Collection Receipt Verification Gate

## Estado

Accepted for V0.23.38 candidate.

## Contexto

V0.23.37 congeló un executor estructural/offline para Phase A. Ese executor puede validar la forma de una lease, pero deliberadamente no puede demostrar que la lease fue emitida por el control plane externo.

V0.23.37 también definió dos futuros receipt contracts:

1. issuance receipt:
   - `channel=live_materialization_evidence_collection_authorization_receipt`;
   - `source=external_materialization_control_plane`;
   - `provenance=externally_issued_and_boundary_verified`.
2. consumption receipt:
   - `channel=live_materialization_evidence_collection_consumption_receipt`;
   - `source=external_materialization_control_plane`;
   - `provenance=externally_observed_action_consumption`.

Sin un gate intermedio existiría el riesgo de tratar esas strings de provenance como prueba de autenticidad.

## Problema

Un objeto JSON puede declarar cualquier provenance. Que un envelope contenga:

```text
provenance=externally_issued_and_boundary_verified
```

no demuestra que:

- provenga realmente del control plane;
- haya sido firmado o auditado por una autoridad externa;
- no haya sido construido por un test double;
- no haya sido modificado después de su emisión.

Aceptar self-reported provenance sería equivalente a permitir que el objeto se autoautentique.

## Decisión

V0.23.38 implementa un gate puro con dos responsabilidades estrictamente separadas:

1. **structural/correlation/timeline verification** de los envelopes;
2. definición del contrato de **independent authenticity verification evidence** requerido después.

V0.23.38 no incluye un verifier port inyectable capaz de devolver `verified=true`.

Esta ausencia es deliberada: evita que un fake local sea interpretado como autenticidad externa.

## Structural verification

El gate recibe:

- `StructuralEvidenceCollectionAuthorizationResult` V0.23.37;
- external lease receipt envelope;
- external consumption receipt envelope;
- `observedAt`.

### Lease envelope

Se valida:

- channel exacto;
- source exacto;
- provenance declarada exacta;
- provider/project label;
- authorization ID;
- issuance receipt ID;
- project binding/ref/origin;
- issuedAt/expiresAt;
- TTL máximo 300 s;
- exact five-action set y orden canónico;
- `maxUsesPerAction=1`;
- synthetic fixture only;
- credentials/authority handles ausentes;
- materialization/runtime/deployment false.

### Consumption envelope

Se valida:

- channel/source/provenance declarada;
- exact project identity;
- authorization ID = lease;
- issuance receipt ID = lease;
- completion receipt ID;
- exact five-action sequence;
- `useCount=1` por acción;
- `providerIoObserved=true` por acción;
- cada `usedAt` dentro del lease lifetime y antes de completion;
- completion dentro del lease lifetime;
- ausencia de credentials, token values, synthetic emails y authority handle IDs;
- materialization/runtime/deployment false.

## Resultado structural

Si todos los checks pasan:

```text
state=receipt_envelopes_structurally_verified
leaseEnvelopeStructurallyVerified=true
consumptionEnvelopeStructurallyVerified=true
receiptCorrelationStructurallyVerified=true
receiptTimelineStructurallyVerified=true
authenticityVerificationStillRequired=true
```

pero mantiene:

```text
externalBoundaryVerificationProven=false
externalLeaseReceiptAccepted=false
evidenceCollectionAuthorizationAccepted=false
evidenceCollectionProviderIoAuthorized=false
externalConsumptionReceiptAccepted=false
evidenceCollectionReceiptsVerified=false
```

Por tanto:

**Structural Receipt PASS ≠ Authenticity PASS.**

## Independent authenticity verification evidence

Un structural PASS produce un contrato para el artefacto que un verifier independiente futuro deberá aportar.

Contrato:

```text
channel=evidence_collection_receipt_authenticity_verification
requiredSource=independent_external_receipt_verifier
requiredProvenance=out_of_process_receipt_authenticity_verification
maxVerificationAgeSeconds=300
```

Debe vincular:

- verification evidence ID;
- verifier identity reference;
- verifiedAt;
- issuance receipt ID;
- consumption receipt ID;
- digest del issuance receipt;
- digest del consumption receipt;
- project identity.

Método permitido:

```text
authenticityMethodRequired=cryptographic_signature_or_control_plane_audit_attestation
```

Y declara explícitamente:

```text
structuralValidationAloneAccepted=false
selfReportedProvenanceAccepted=false
```

## Por qué no se usa un verifier fake en este slice

Un port como:

```ts
verify(...): { verified: true }
```

sería insuficiente: una implementación in-memory podría producir ese booleano sin ninguna raíz de confianza externa.

V0.23.38, por diseño:

- no tiene verifier transport;
- no tiene network access;
- no lee keys/certificates;
- no acepta authenticity evidence;
- solo especifica qué evidencia independiente será requerida en el siguiente boundary.

## Temporalidad

Lease:

- TTL máximo: 300 segundos.
- issue no puede quedar fuera de la ventana razonable respecto de `observedAt`.

Consumption:

- completion debe ocurrir entre issue y expiry;
- cada action use debe ocurrir entre issue y completion;
- todos los action uses deben ocurrir antes de expiry.

La autenticidad futura tendrá su propia frescura máxima de 300 segundos.

## Minimización

El gate no requiere ni acepta en su output:

- credentials;
- access tokens;
- synthetic emails;
- authority handle IDs;
- service-role values;
- anon keys.

El authenticity evidence contract también prohíbe esos valores.

## Seguridad

V0.23.38 no importa ni ejecuta:

- `runtime.server.ts`;
- activated runtime;
- activation preflight;
- Supabase SDK;
- network libraries;
- environment variables.

Tampoco hace provider I/O.

## Consecuencias

### Positivas

- self-reported provenance deja de confundirse con autenticidad;
- correlation/timeline defects se detectan antes del futuro verifier externo;
- la raíz de confianza queda expresamente fuera del proceso local;
- receipts pueden ser auditados por digest sin publicar secretos;
- se mantiene separación entre evidence collection y materialization authority.

### Coste

La ruta live requiere un artefacto adicional de autenticidad y una autoridad verificadora externa. Es una restricción intencional.

## Autoridad

```text
Receipt Envelopes Structural PASS
≠ Independent Authenticity PASS
≠ External Boundary Verification Proven
≠ External Lease Receipt Accepted
≠ Evidence Collection Authorization Accepted
≠ Evidence Collection Provider I/O Authorized
≠ Consumption Receipt Accepted
≠ Live Evidence PASS
≠ Materialization Grant Accepted
≠ Provider Client Materialization
≠ Provider Parity PASS
≠ Runtime Activation
≠ Deployment
```

## Prohibiciones mantenidas

- no merge;
- no provider I/O live;
- no SDK Supabase;
- no credentials/secrets;
- no env reads;
- no provisioning;
- no SQL aplicado;
- no runtime activation;
- no deployment.
