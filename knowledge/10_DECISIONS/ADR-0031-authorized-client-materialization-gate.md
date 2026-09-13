# ADR-0031 · Authorized Client Materialization Gate Contract

## Estado

Accepted for V0.23.35 candidate freeze.

## Contexto

V0.23.32, V0.23.33 y V0.23.34 cerraron tres fronteras distintas:

1. un preflight estructural de configuración para futuros provider clients;
2. un executor de remote identity attestation sobre transport inyectado;
3. un executor de synthetic session bootstrap sobre transport inyectado.

Ninguna de esas piezas demuestra que Supabase real fue contactado, que una identidad remota real fue verificada, que Auth real emitió sesiones ni que exista autorización para materializar SDK clients.

El siguiente riesgo arquitectónico era permitir una promoción implícita:

```text
offline/injected PASS
        ↓
client materialization allowed
```

Esa promoción sería falsa y violaría la separación de autoridades mantenida desde V0.23.14.

## Decisión

V0.23.35 introduce un **Authorized Client Materialization Gate Contract** que funciona como barrera/aggregator de prerrequisitos.

Un stack coherente V0.23.32 + V0.23.33 + V0.23.34 puede alcanzar únicamente:

```text
state=ready_for_live_materialization_authorization
configurationRevalidated=true
configurationStable=true
contractStackValidated=true
```

pero conserva:

```text
liveRemoteIdentityEvidenceAccepted=false
liveSessionBootstrapEvidenceAccepted=false
explicitMaterializationGrantAccepted=false
providerIoAuthorized=false
sdkInstantiationAuthorized=false
clientMaterializationAuthorized=false
materializerMayExecute=false
remoteIdentityVerified=false
sessionBootstrapProven=false
providerParityProven=false
runtimeActivationAuthorized=false
deploymentAuthorized=false
```

## No es un materializer

V0.23.35:

- no crea Supabase clients;
- no resuelve secrets;
- no usa SDK;
- no hace fetch/RPC;
- no consume handles;
- no contacta Auth/DB/Storage;
- no ejecuta provider I/O.

Su salida es una decisión y, cuando el stack offline es coherente, un descriptor de la autoridad live que todavía falta.

## Revalidación de V0.23.32

El gate no confía ciegamente en un `ProviderClientFactoryPreflightDecision` previamente calculado.

Recibe:

1. `preflightInput`: snapshot estructural exacta que produjo la decisión congelada;
2. `currentPreflightInput`: configuración estructural actual inmediatamente antes de solicitar autoridad live;
3. `preflightDecision`: decisión V0.23.32 congelada.

El gate vuelve a ejecutar `evaluateProviderClientFactoryPreflight` sobre snapshot y current config.

## Hallazgo: authority-handle drift no es visible en el resumen V0.23.32

Durante el diseño se detectó que V0.23.32 expone:

```text
authorityHandleCount=5
```

pero deliberadamente no devuelve los cinco `handleId` opacos.

Por tanto, esta secuencia no puede detectarse comparando únicamente decisiones V0.23.32:

```text
handle.storage.A → handle.storage.B
```

si ambos handles siguen siendo válidos y el conteo permanece 5.

V0.23.35 resuelve el problema sin exponer handles en su output:

- conserva la snapshot estructural original como input;
- recibe la configuración estructural actual como input separado;
- compara internamente los cinco handles exactos y sus metadatos;
- cualquier rotación/config drift produce `preflight_configuration_drift`;
- ningún handle ID aparece en la decisión.

## Configuration drift

La comparación snapshot/current cubre:

- provider;
- project label;
- project binding;
- normalized project URL;
- expected remote project ref;
- manifest source/safety flags;
- cada authority class;
- cada handle ID;
- broker source;
- server-only flag;
- no-secret-exposure flag;
- qualification state/count/statuses;
- construction policy.

La current config también debe pasar por V0.23.32 independientemente.

## Contratos V0.23.33 y V0.23.34

El gate valida que ambos resultados sigan declarando explícitamente su naturaleza injected/offline.

### Attestation

Exige:

- version V0.23.33 exacta;
- state `attestation_contract_satisfied`;
- binding/ref/url consistentes con V0.23.32;
- request id / nonce válidos y distintos;
- timestamp parseable;
- `attestationContractSatisfied=true`;
- `injectedTransportInvoked=true`;
- todas las flags de autoridad live/materialization/runtime en `false`.

### Session bootstrap

Exige:

- version V0.23.34 exacta;
- state `session_bootstrap_contract_satisfied`;
- binding consistente;
- fixture/namespace sintéticos válidos;
- owner/intruder capabilities estructuralmente válidas;
- emails deterministas `.invalid`;
- subjects/tokens distintos;
- server-only capabilities;
- timestamp de expiración parseable;
- todas las flags de autoridad live/materialization/runtime en `false`.

## Future live authorization requirement

Un stack coherente produce un `ProviderClientMaterializationAuthorizationRequirement` que requiere tres elementos todavía ausentes:

### 1. Live remote identity evidence

```text
required=true
accepted=false
requiredSource=authorized_external_live_provider_attestation
mustBindProjectIdentity=true
```

### 2. Live session bootstrap evidence

```text
required=true
accepted=false
requiredSource=authorized_external_live_provider_session_bootstrap
ownerAndIntruderRequired=true
fixtureDisposableRequired=true
capabilityLifetimeContainmentRequired=true
```

### 3. Explicit single-use materialization grant

```text
required=true
accepted=false
requiredSource=external_materialization_control_plane
action=materialize_qualified_dev_provider_clients
maxTtlSeconds=300
mustBindProjectIdentity=true
mustBindAuthorityHandles=true
mustBindLiveEvidence=true
atomicConsumptionRequired=true
```

Antes de ese grant:

```text
providerIoBeforeGrantAllowed=false
sdkInstantiationBeforeGrantAllowed=false
```

## El gate no puede satisfacerse a sí mismo

V0.23.35 no acepta como sustituto de evidencia live:

- `attestation_contract_satisfied` V0.23.33;
- `session_bootstrap_contract_satisfied` V0.23.34;
- `structurally_ready_for_authorized_materialization` V0.23.32.

Estos resultados solo permiten formular de manera segura la siguiente autoridad requerida.

## Data minimization

La salida no contiene:

- owner access token;
- intruder access token;
- synthetic fixture emails;
- authority handle IDs;
- secrets;
- provider credentials.

Solo conserva project binding/ref/url y `authorityHandleCount=5` cuando la current config es estructuralmente válida.

## Hallazgo de CI: binding validator incompatible

La primera suite completa V0.23.35 mostró una incompatibilidad en el source del gate:

- V0.23.32 permite project binding IDs con `_` mediante `^[A-Za-z0-9_-]{8,80}$`;
- V0.23.35 había reutilizado inicialmente el regex `OPAQUE` de request IDs, que no admitía `_`.

Resultado: un preflight canónico válido se re-clasificaba falsamente como `preflight_revalidation_failed`.

La corrección fue productiva:

- introducir `BINDING_ID` alineado exactamente con V0.23.32;
- reservar `OPAQUE` para request/nonce metadata.

No se relajó ninguna frontera de seguridad.

## Blockers

- `preflight_revalidation_failed`
- `preflight_decision_mismatch`
- `preflight_configuration_drift`
- `attestation_contract_invalid`
- `session_bootstrap_contract_invalid`

No existe un blocker separado de cross-stack binding porque un binding incorrecto invalida el contrato originante y falla cerrado allí mismo.

## Autoridad

**Materialization Gate PASS ≠ Live Remote Identity PASS ≠ Live Session Bootstrap PASS ≠ Materialization Grant Accepted ≠ Provider Client Materialization ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Fuera de alcance

- proveer evidencia live;
- crear/controlar el grant single-use;
- materializar SDK/provider clients;
- leer env/secrets;
- instalar Supabase SDK;
- provisionar;
- aplicar SQL;
- modificar `runtime.server.ts`;
- activar runtime;
- desplegar.
