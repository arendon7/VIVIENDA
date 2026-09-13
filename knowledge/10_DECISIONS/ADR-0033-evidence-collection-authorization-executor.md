# ADR-0033 · Evidence Collection Authorization Executor / Receipt Contract

## Estado

Accepted for V0.23.37 candidate.

## Contexto

V0.23.36 congeló un modelo de autorización en dos fases para romper la dependencia circular entre evidencia live y el grant final de materialización.

La Phase A requiere, en el futuro, una lease:

```text
channel=live_materialization_evidence_collection_authorization
authorizationKind=scoped_live_evidence_collection_lease
requiredSource=external_materialization_control_plane
maxTtlSeconds=300
```

con exactamente cinco acciones:

1. `attest_remote_project_identity`;
2. `bootstrap_owner_synthetic_session`;
3. `resolve_owner_synthetic_session`;
4. `bootstrap_intruder_synthetic_session`;
5. `resolve_intruder_synthetic_session`.

V0.23.36 solo definió el contrato; no emitió ni aceptó una lease.

## Problema

Para desarrollar el executor de Phase A sin acceso live existen dos riesgos:

1. que un test double estructural sea tratado accidentalmente como una lease realmente emitida por el control plane;
2. que un executor de prueba se convierta, por su propia metadata, en una fuente de autoridad de provider I/O o materialización.

Ambos serían una escalada de autoridad falsa.

## Decisión

V0.23.37 implementa un executor **estructural/offline** que puede ejercitar y validar la forma completa de una lease, pero que está tipado para ser incapaz de probar emisión externa.

El transport obligatorio declara:

```text
channel=evidence_collection_authorization_structural_transport
structuralOnly=true
externallyIssuedLeaseProven=false
providerIoAuthorized=false
clientMaterializationAuthorized=false
runtimeActivationAuthorized=false
deploymentAuthorized=false
```

Si cualquiera de esas fronteras aparece auto-promovida, el constructor falla antes de invocar el transport.

## Structural lease observation

El transport de prueba puede devolver un envelope con:

- `provenance=structural_test_double`;
- `source=injected_structural_test_observation`;
- project binding exacto;
- authorization ID opaco;
- request ID + nonce exactos;
- `issuedAt` / `expiresAt`;
- action set canónico;
- `maxUsesPerAction=1`;
- `syntheticFixtureOnly=true`;
- materialization/runtime/deployment false.

El executor valida:

- project identity;
- origin HTTPS exacto;
- request/nonce binding;
- action set exacto y orden canónico;
- ausencia de scope escalation;
- TTL máximo de 300 s;
- lease no vencida al completar el exchange;
- clock skew máximo de 60 s.

## Resultado estructural

Un structural PASS produce únicamente:

```text
state=structural_authorization_exchange_satisfied
structuralTransportInvoked=true
structuralLeaseEnvelopeValidated=true
externalLeaseIssuanceRequired=true
externallyIssuedLeaseProven=false
externalLeaseReceiptAccepted=false
evidenceCollectionAuthorizationAccepted=false
evidenceCollectionProviderIoAuthorized=false
externalConsumptionReceiptAccepted=false
clientMaterializationAuthorized=false
materializerMayExecute=false
runtimeActivationAuthorized=false
deploymentAuthorized=false
```

Por tanto:

**Structural Lease PASS ≠ External Lease Issuance PASS.**

## External issuance receipt contract

V0.23.37 define, pero no acepta, el receipt que un boundary externo futuro deberá producir.

Requiere:

```text
channel=live_materialization_evidence_collection_authorization_receipt
requiredSource=external_materialization_control_plane
requiredProvenance=externally_issued_and_boundary_verified
maxTtlSeconds=300
externalBoundaryVerificationRequired=true
structuralTestDoubleAcceptedAsExternalEvidence=false
```

Además debe vincular:

- authorization ID;
- issuance receipt ID;
- project identity exacta;
- issuedAt / expiresAt;
- action set exacto;
- máximo un uso por acción;
- synthetic fixture only.

No puede contener credentials ni authority handle IDs.

## Consumption receipt contract

V0.23.37 define también un receipt externo para demostrar el consumo de la lease durante la ejecución futura de Phase A.

Requiere:

```text
channel=live_materialization_evidence_collection_consumption_receipt
requiredSource=external_materialization_control_plane
requiredProvenance=externally_observed_action_consumption
```

Debe vincular:

- accepted authorization ID;
- accepted issuance receipt ID;
- project identity;
- completion receipt ID;
- completedAt;
- completion antes del expiry;
- las cinco acciones exactas;
- `exactUseCount=1` para cada acción;
- `providerIoObservedRequired=true` para cada uso.

No permite:

- duplicate action use;
- unlisted action use;
- structural test double como evidencia externa;
- client materialization;
- runtime activation;
- deployment.

Tampoco puede transportar credentials, access tokens, synthetic emails o authority handle IDs.

## Por qué no se acepta evidencia externa todavía

Un test fake puede copiar cualquier string o booleano. Por ello V0.23.37 no incorpora una bandera inyectable como `externallyVerified=true` que pueda elevar autoridad.

En su lugar:

- el transport actual está estructuralmente limitado a `externallyIssuedLeaseProven=false`;
- el output siempre conserva external receipt acceptance en false;
- los contratos de receipts externos se modelan como requisitos para un boundary posterior;
- la aceptación real queda fuera de este slice.

## Seguridad

El source no usa:

- Supabase SDK;
- network clients;
- env reads;
- secrets;
- credentials;
- runtime activation;
- `runtime.server.ts`.

Un transport inválido falla antes de cualquier `exercise()`.

## Autoridad

```text
Structural Authorization Exchange PASS
≠ External Lease Issued
≠ External Lease Receipt Accepted
≠ Evidence Collection Provider I/O Authorized
≠ External Consumption Receipt Accepted
≠ Live Remote Identity PASS
≠ Live Session Bootstrap PASS
≠ Materialization Grant Accepted
≠ Provider Client Materialization
≠ Provider Parity PASS
≠ Runtime Activation
≠ Deployment
```

## Consecuencia para el siguiente slice

Un futuro slice puede implementar un **External Evidence Collection Receipt Verifier / Acceptance Gate**. Ese boundary deberá recibir artefactos de proveniencia externa reales y no podrá aceptar el structural result V0.23.37 como sustituto.

## Prohibiciones mantenidas

- no merge;
- no provider I/O live;
- no SDK Supabase;
- no secrets/credentials;
- no env reads;
- no provisioning;
- no SQL aplicado;
- no runtime activation;
- no deployment.
