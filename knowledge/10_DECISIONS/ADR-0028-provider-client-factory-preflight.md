# ADR-0028 · Provider Client Factory & Remote Identity Preflight

## Estado

Accepted for V0.23.32 candidate freeze.

## Contexto

V0.23.31 congeló un adapter pack estructural para las superficies mínimas de Supabase, pero mantuvo correctamente:

```text
sdkInstantiated=false
remoteIdentityVerified=false
sessionBootstrapProven=false
```

El siguiente riesgo arquitectónico es confundir tres autoridades distintas:

1. que una configuración sea estructuralmente apta para materializar clientes;
2. que esté autorizado instanciar clientes y realizar provider I/O;
3. que el proyecto remoto y el bootstrap de sesiones hayan sido efectivamente verificados.

V0.23.32 debe resolver únicamente la primera.

## Decisión

Se introduce `provider-client-factory-preflight.ts` como contrato puro y fail-closed.

El preflight recibe:

- qualification DEV existente;
- manifest de configuración externa;
- cinco authority handles opacos;
- construction policy.

No recibe secretos, no lee env, no importa SDK, no crea clientes y no realiza red.

Un resultado exitoso solo puede producir:

```text
state=structurally_ready_for_authorized_materialization
```

pero conserva obligatoriamente:

```text
providerIoAuthorized=false
clientMaterializationAuthorized=false
sdkInstantiated=false
remoteIdentityVerified=false
sessionBootstrapProven=false
runtimeServerWasUsed=false
activationFactsProduced=false
deploymentAuthorized=false
```

## Qualification gate

El preflight exige exactamente la qualification DEV congelada:

- `state=qualified_for_staging_candidate`;
- `devEnvironmentVerified=true`;
- `liveRuntimeAuthorized=false`;
- 14 requirements totales;
- 14 requirements verified;
- 0 blockers;
- todos los requirements con status `verified`.

Cualquier desviación produce blocker `dev_environment_unqualified`.

## External configuration manifest

El manifest debe declarar:

```text
provider=supabase
projectLabel=vivienda-dev
source=external_injected_configuration
syntheticOnly=true
liveRuntimeAuthorized=false
secretValuesEmbedded=false
environmentReadRequiredByContract=false
```

También contiene:

- `projectBindingId` opaco;
- `projectUrl` HTTPS sin path/query/hash/credentials;
- `expectedRemoteProjectRef`;
- cinco authority handles.

El preflight normaliza únicamente el origin HTTPS. No contacta el endpoint.

## Project URL y project ref

V0.23.32 no exige que `projectUrl` use el hostname estándar `<project_ref>.supabase.co`.

Razón: la identidad estructural debe admitir un endpoint HTTPS válido y conservar por separado `expectedRemoteProjectRef`. La equivalencia entre URL configurada y proyecto real es responsabilidad explícita del futuro remote identity attestation.

Por tanto:

```text
projectUrl accepted
!=
remote identity verified
```

## Cinco authority handles

Se requieren exactamente las cinco fronteras congeladas:

1. `candidate_runtime_rpc` → `candidate_runtime`;
2. `dev_probe_support_rpc` → `probe_support`;
3. `dev_fixture_admin` → `fixture_admin`;
4. `dev_storage` → `storage_candidate`;
5. `candidate_session_authority` → `synthetic_session`.

Cada handle debe:

- tener identificador opaco válido;
- provenir de `external_secret_broker`;
- ser `serverOnly=true`;
- mantener `secretValueExposedToApplication=false`.

Los handle IDs no pueden reutilizarse entre autoridades.

## Construction policy

El preflight solo acepta una policy donde:

```text
sdkFactoryInjected=true
sdkDependencyRequiredByContract=false
providerIoOnConstruction=false
remoteAttestationOnConstruction=false
sessionBootstrapOnConstruction=false
runtimeServerUsed=false
```

La factory concreta futura podrá ser inyectada, pero este slice no la ejecuta.

## Remote identity attestation requirement

Cuando el preflight pasa, retorna un requirement descriptivo:

```text
channel=remote_project_identity_attestation
required=true
networkIoRequired=true
performed=false
verified=false
```

Este objeto no es evidencia de I/O. Es una obligación para un slice posterior.

## Synthetic session bootstrap plan

También retorna un plan separado:

```text
channel=synthetic_session_bootstrap
strategy=provider_supported_one_time_exchange
ownerAndIntruderRequired=true
deterministicFixtureEmailRequired=true
passwordGrantAssumed=false
locallyMintedJwtAllowed=false
providerIoRequired=true
performed=false
proven=false
```

No se asume password grant y no se permite JWT localmente fabricado.

## Error accumulation

El evaluator acumula blockers independientes en lugar de detenerse en el primero. Esto permite distinguir simultáneamente problemas de qualification, proyecto, policy y authority handles sin convertir un boundary válido en autorización para los demás.

## Autoridad

**Factory Preflight PASS ≠ Client Materialization Authorized ≠ Remote Identity Verified ≠ Session Bootstrap Proven ≠ Live Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Fuera de alcance

- instalar o importar `@supabase/supabase-js`;
- crear clientes Supabase;
- resolver secretos;
- leer variables de entorno;
- realizar RPC/Auth/Storage/fetch;
- verificar remotamente project ref;
- ejecutar session bootstrap;
- provisionar `vivienda-dev`;
- aplicar SQL;
- modificar `runtime.server.ts`;
- activar runtime;
- desplegar.
