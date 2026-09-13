# V0.23.32 · Provider Client Factory & Remote Identity Preflight

## Objetivo

Cerrar la frontera inmediatamente posterior al client shape adapter pack V0.23.31 sin cruzar todavía a materialización real de clientes Supabase ni provider I/O.

V0.23.32 responde una sola pregunta:

> ¿La configuración externa propuesta tiene la forma mínima y las separaciones de autoridad necesarias para que un slice posterior pueda evaluar una materialización autorizada?

No responde si el proyecto remoto existe, si corresponde a `vivienda-dev`, si las credenciales funcionan ni si las sesiones sintéticas pueden emitirse.

## Source principal

`server/evidence-api/provider-client-factory-preflight.ts`

Versión:

`V0.23.32-PROVIDER-CLIENT-FACTORY-PREFLIGHT-V1`

API principal:

`evaluateProviderClientFactoryPreflight(input)`

## Input

### Qualification

`DevEnvironmentQualificationDecision` existente.

Gate requerido:

- state `qualified_for_staging_candidate`;
- `devEnvironmentVerified=true`;
- `liveRuntimeAuthorized=false`;
- 14/14 requirements verified;
- 0 blockers.

### Manifest

`ProviderFactoryExternalConfigurationManifest` contiene únicamente metadata y handles opacos:

- provider;
- project label;
- binding id;
- project URL;
- expected project ref;
- source semantics;
- synthetic/live flags;
- secret handling flags;
- authority handles.

No contiene keys ni tokens.

### Construction policy

`ProviderFactoryConstructionPolicy` congela que el preflight sea puro:

- injected factory permitido;
- SDK dependency no requerida por contrato;
- cero provider I/O en construcción;
- cero attestation en construcción;
- cero bootstrap de sesión en construcción;
- runtime server no usado.

## Authority handles

| Channel | Authority class |
| --- | --- |
| `candidate_runtime_rpc` | `candidate_runtime` |
| `dev_probe_support_rpc` | `probe_support` |
| `dev_fixture_admin` | `fixture_admin` |
| `dev_storage` | `storage_candidate` |
| `candidate_session_authority` | `synthetic_session` |

Cada handle requiere:

- `handleId` opaco;
- `source=external_secret_broker`;
- `serverOnly=true`;
- `secretValueExposedToApplication=false`.

Los IDs deben ser distintos.

## URL normalization

Se acepta únicamente origin HTTPS limpio:

- sin username/password;
- sin pathname distinto de `/`;
- sin query;
- sin hash;
- longitud limitada;
- sin control characters.

El resultado conserva `normalizedProjectUrl` como origin.

Custom domain HTTPS puede pasar estructuralmente. La correspondencia URL ↔ project ref no se declara verificada aquí.

## Blockers

El evaluator puede producir:

- `dev_environment_unqualified`;
- `invalid_project_configuration`;
- `invalid_authority_handle`;
- `authority_handle_reuse`;
- `authority_class_mismatch`;
- `unsafe_construction_policy`.

Los blockers se acumulan.

## Resultado PASS

State:

`structurally_ready_for_authorized_materialization`

Metadata positiva limitada:

- project binding validado estructuralmente;
- project URL normalizado;
- expected project ref preservado;
- 5 authority handles válidos y distintos;
- remote attestation requirement generado;
- session bootstrap plan generado.

Metadata que permanece negativa:

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

## Remote identity requirement

El PASS crea un descriptor, no ejecuta red:

- channel `remote_project_identity_attestation`;
- expected project ref;
- expected project URL;
- `required=true`;
- `networkIoRequired=true`;
- `performed=false`;
- `verified=false`.

## Session bootstrap plan

Descriptor separado:

- channel `synthetic_session_bootstrap`;
- strategy `provider_supported_one_time_exchange`;
- owner + intruder obligatorios;
- email sintético determinista obligatorio;
- no password grant assumption;
- local JWT minting prohibido;
- provider I/O requerido en slice posterior;
- `performed=false`;
- `proven=false`.

## Tests

`server/evidence-api/provider-client-factory-preflight.test.ts`

Cobertura V0.23.32:

1. PASS estructural sin elevación de autoridad;
2. planes remotos separados y no ejecutados;
3. qualification exacta 14/14;
4. configuración de proyecto fail-closed;
5. custom domain sin identidad implícita;
6. cinco handles y authority classes exactas;
7. broker/server-only/no secret exposure;
8. handle reuse;
9. construction policy fail-closed;
10. acumulación de blockers;
11. authority map exacto;
12. ausencia de env/SDK/runtime activation/provider-I/O implementation.

Run funcional previo a documentación sobre `7ebd142488fc60b5eb5745044f558909b99dd935`:

- TypeScript PASS;
- Domain 65 files / 682 tests PASS;
- V0.23.32 12/12 PASS;
- Build PASS.

El freeze final requiere un run `pull_request` verde sobre el SHA final posterior a documentación.

## No implementación live

Este slice no incluye:

- `@supabase/supabase-js`;
- client factory concreto;
- secret broker concreto;
- provider credentials;
- remote attestation executor;
- session bootstrap executor;
- SQL;
- deployment;
- modificación de runtime público.

## Regla de autoridad

**Factory Preflight PASS ≠ Client Materialization Authorized ≠ Remote Identity Verified ≠ Session Bootstrap Proven ≠ Live Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**
