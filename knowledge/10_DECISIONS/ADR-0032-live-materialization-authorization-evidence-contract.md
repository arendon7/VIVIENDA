# ADR-0032 · Live Materialization Authorization Evidence Contract

## Estado

Accepted for V0.23.36 candidate.

## Contexto

V0.23.35 congeló una barrera fail-closed entre el stack offline/injected V0.23.32–34 y cualquier futura materialización de provider clients.

Cuando el stack es coherente, V0.23.35 puede declarar:

```text
state=ready_for_live_materialization_authorization
```

pero mantiene explícitamente en `false`:

```text
liveRemoteIdentityEvidenceAccepted
liveSessionBootstrapEvidenceAccepted
explicitMaterializationGrantAccepted
providerIoAuthorized
sdkInstantiationAuthorized
clientMaterializationAuthorized
materializerMayExecute
remoteIdentityVerified
sessionBootstrapProven
runtimeActivationAuthorized
deploymentAuthorized
```

V0.23.35 exige tres elementos externos posteriores:

1. evidencia live de identidad remota;
2. evidencia live de bootstrap de sesiones sintéticas owner/intruder;
3. grant single-use de materialización que vincule identidad, authority handles y evidencia live.

También exige:

```text
providerIoBeforeGrantAllowed=false
sdkInstantiationBeforeGrantAllowed=false
```

## Problema detectado

Existe una dependencia circular si se interpreta el grant final de materialización como la única autoridad capaz de permitir cualquier I/O live:

1. el grant final debe vincular evidencia live ya existente;
2. obtener esa evidencia exige I/O contra el provider;
3. el grant final todavía no existe porque la evidencia todavía no existe.

Por tanto, permitir que el grant final sea la única autoridad produciría un deadlock lógico o forzaría a relajar V0.23.35.

Modificar V0.23.35 después de su freeze está prohibido.

## Decisión

V0.23.36 introduce un **contrato de autorización en dos fases**, sin emitir ni aceptar ninguna autoridad live.

### Fase A · Live Evidence Collection Authorization

Antes del grant final puede existir una autoridad externa distinta y estrictamente limitada:

```text
channel=live_materialization_evidence_collection_authorization
authorizationKind=scoped_live_evidence_collection_lease
requiredSource=external_materialization_control_plane
maxTtlSeconds=300
```

Su único propósito es permitir, en un futuro slice autorizado, la recolección de evidencia para:

1. `attest_remote_project_identity`;
2. `bootstrap_owner_synthetic_session`;
3. `resolve_owner_synthetic_session`;
4. `bootstrap_intruder_synthetic_session`;
5. `resolve_intruder_synthetic_session`.

La lease exige un máximo de una ejecución por acción y un único proyecto sintético.

Está expresamente prohibido que esta autoridad permita:

- RPC arbitrario;
- Storage arbitrario;
- materialización de provider clients;
- invocación del SDK factory del materializer;
- runtime activation;
- deployment.

V0.23.36 **no emite esa lease** y mantiene:

```text
evidenceCollectionAuthorizationAccepted=false
evidenceCollectionProviderIoAuthorized=false
```

### Fase B · Final Materialization Grant

Después de recolectar y verificar externamente la evidencia, el control plane puede, en un futuro slice autorizado, emitir el grant final requerido por V0.23.35.

Ese grant debe:

- provenir de `external_materialization_control_plane`;
- tener acción exacta `materialize_qualified_dev_provider_clients`;
- durar máximo 300 segundos;
- ser single-use;
- consumirse atómicamente;
- vincular project identity;
- vincular el set exacto de cinco authority handles mediante un receipt externo, sin exponer los IDs en el output del contrato;
- vincular el receipt de autorización de recolección;
- vincular el evidence ID de remote identity;
- vincular el evidence ID de session bootstrap;
- exigir que ambas evidencias precedan al grant y sigan frescas al emitirlo;
- exigir autenticidad verificada externamente.

V0.23.36 tampoco emite, acepta ni consume este grant.

## Contratos de evidencia

### Remote identity

El receipt futuro debe demostrar:

- source exacto `authorized_external_live_provider_attestation`;
- proyecto exacto `vivienda-dev`;
- `projectBindingId`, project ref y origin exactos;
- I/O live observado;
- identidad remota verificada;
- receipt de verifier externo;
- evidence ID y timestamp;
- edad máxima de 300 segundos;
- ausencia de credentials y authority handle IDs.

### Synthetic sessions

El receipt futuro debe demostrar:

- source exacto `authorized_external_live_provider_session_bootstrap`;
- owner e intruder;
- issue + resolve para ambos actores;
- subjects distintos;
- fixture desechable;
- lifetime de capabilities contenido por la fixture;
- I/O live observado;
- bootstrap probado por verifier externo;
- evidence ID y timestamp;
- edad máxima de 300 segundos;
- ausencia de access-token values, synthetic-email values y authority handle IDs.

## Interpretación de `providerIoBeforeGrantAllowed=false`

V0.23.36 no reescribe V0.23.35.

La autoridad de Fase A es un canal separado de **evidence collection** y no autoriza materialización. El `providerIoBeforeGrantAllowed=false` de V0.23.35 continúa gobernando el materializer y no se convierte en una autorización implícita para operaciones arbitrarias.

La Fase A requiere su propia autorización externa explícita antes de cualquier provider I/O.

## Seguridad y minimización

El output V0.23.36 no contiene:

- access tokens;
- fixture emails;
- service-role values;
- anon keys;
- secrets;
- authority handle IDs.

Tampoco importa:

- `runtime.server.ts`;
- activated runtime;
- activation preflight;
- Supabase SDK;
- networking libraries;
- environment variables.

## Consecuencias

### Positivas

- elimina el deadlock de evidencia/grant sin tocar el freeze V0.23.35;
- mantiene separada la autoridad para observar del provider y la autoridad para materializar clients;
- permite que futuras evidencias live sean auditables y referenciadas por ID;
- evita que access tokens o handles opaquen la frontera de seguridad;
- conserva runtime activation y deployment como autoridades posteriores e independientes.

### Coste

La ruta live gana una fase adicional de control plane y receipts. Es intencional: evita que un permiso de diagnóstico se convierta en permiso de materialización.

## Autoridad

```text
Evidence Authorization Contract PASS
≠ Evidence Collection Lease Issued
≠ Evidence Collection Provider I/O Authorized
≠ Live Remote Identity PASS
≠ Live Session Bootstrap PASS
≠ Materialization Grant Issued
≠ Materialization Grant Consumed
≠ Provider Client Materialization
≠ Provider Parity PASS
≠ Runtime Activation
≠ Deployment
```

## Prohibiciones mantenidas

- no merge;
- no provider I/O live;
- no SDK Supabase;
- no secrets/credentials;
- no env reads;
- no provisioning;
- no SQL aplicado;
- no cambio de `runtime.server.ts`;
- no activation;
- no deployment.
