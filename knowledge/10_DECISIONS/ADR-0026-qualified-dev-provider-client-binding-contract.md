# ADR-0026 · Qualified DEV Provider Client Binding Contract

## Estado

Accepted for V0.23.30 candidate freeze.

## Contexto

V0.23.29 cerró el loop offline/injected entre probe adapter, execution driver, bridge, candidate host y límites canónicos de dominio. Sin embargo, ese slice todavía recibía implementaciones inyectadas de persistence, support RPC, fixture admin, Storage y sesiones sintéticas.

La siguiente frontera no es activar Supabase ni ejecutar provider I/O. Es definir cómo deben presentarse esas capacidades al candidate runtime para evitar tres errores de arquitectura:

1. mezclar autoridad administrativa con el camino normal de Evidence API;
2. aceptar clientes que no declaren pertenecer al mismo candidato DEV;
3. convertir una composición local coherente en una afirmación falsa de identidad remota o live parity.

## Decisión

V0.23.30 introduce `QualifiedDevProviderClientBindings` y separa cinco autoridades estructurales:

| Binding | Channel | Authority |
| --- | --- | --- |
| canonical persistence / registry RPC | `candidate_runtime_rpc` | `candidate_runtime` |
| DEV probe support RPC | `dev_probe_support_rpc` | `probe_support` |
| fixture lifecycle admin | `dev_fixture_admin` | `fixture_admin` |
| Evidence Storage + signed upload | `dev_storage` | `storage_candidate` |
| synthetic session issue / resolve | `candidate_session_authority` | `synthetic_session` |

Cada binding debe declarar exactamente:

- `provider=supabase`;
- `projectLabel=vivienda-dev`;
- un `projectBindingId` común;
- `syntheticOnly=true`;
- `liveRuntimeAuthorized=false`;
- channel y authority exactos para su función.

El `projectBindingId` es un identificador opaco, no secreto, suministrado por configuración. Su propósito es detectar mezcla accidental de bindings dentro de la composición. **No verifica por sí mismo que dos clientes estén conectados al mismo proyecto remoto.** Por esa razón el resultado declara explícitamente `remoteIdentityVerified=false`.

## Reutilización obligatoria de adapters existentes

V0.23.30 no duplica infraestructura ya implementada:

- `SupabaseCasePersistenceAdapter` permanece como `CasePersistencePort` canónico;
- `SupabaseStorageCoordinationRegistry` permanece como Evidence registry canónico;
- `SupabaseDevFixtureAdminControlPlane` permanece como adapter de fixture admin V0.23.23;
- V0.23.26 sigue siendo la autoridad para support telemetry / fault RPC;
- V0.23.27 sigue siendo la composición de transports e instrumentation;
- V0.23.29 sigue siendo la autoridad del driver↔host bridge.

## Separación de autoridad

Un cliente RPC con capacidad administrativa no se reutiliza implícitamente como canonical runtime RPC. La composición exige bindings separados por channel/authority incluso cuando, en una implementación futura, varias capacidades pertenezcan al mismo proyecto remoto.

Esta separación es deliberada: la pertenencia al mismo proyecto y la capacidad para realizar una operación son dos propiedades diferentes.

## Storage binding

El binding de Storage implementa simultáneamente:

- `EvidenceStorageGateway` para grants, inspección, download y delete;
- `QualifiedDevSignedUploadPort` para el upload sintético del execution driver.

El adapter valida:

- bucket canónico `vivienda-evidence`;
- object paths ligados al namespace DEV;
- `upsert=false`;
- signed capabilities opacas;
- status de signed upload 2xx;
- inspección con checksum SHA-256 e ISO timestamps;
- signed download HTTPS;
- respuesta de delete limitada a `deleted | not_found`.

Errores del proveedor se sanitizan y no propagan mensajes internos.

## Session binding

V0.23.30 define una `QualifiedDevSyntheticSessionClient` y la adapta al `QualifiedDevDriverHostSessionAuthorityPort` congelado en V0.23.29.

La autoridad:

- emite sesión únicamente para owner/intruder del lease activo;
- resuelve bearer tokens únicamente dentro del fixture activo;
- rechaza principals fuera del owner/intruder del fixture;
- acepta anonymous cuando no existe bearer válido;
- declara `publicFixtureSelectorsAccepted=false`.

Este contrato **no define todavía el mecanismo concreto del proveedor para obtener una sesión sintética**. No introduce passwords, JWT fabrication, credenciales embebidas ni una suposición sobre Supabase Auth.

## Constructor sin I/O

`createQualifiedDevProviderClientBindings` valida configuración y construye adapters, pero no debe ejecutar:

- RPC;
- Auth Admin;
- Storage;
- sesión;
- HTTP externo.

La suite verifica esta propiedad mediante contadores de I/O en todos los bindings.

## Qualification gate

La construcción requiere la qualification V0.23.14 completa:

- state `qualified_for_staging_candidate`;
- `devEnvironmentVerified=true`;
- `liveRuntimeAuthorized=false`;
- 14/14 requirements verified;
- cero blockers.

Una qualification incompleta falla antes de cualquier provider I/O.

## Autoridad y límites

V0.23.30 conserva:

```text
provider=supabase
projectLabel=vivienda-dev
syntheticOnly=true
liveRuntimeAuthorized=false
remoteIdentityVerified=false
```

La cadena de autoridad es:

**Client Binding Contract PASS ≠ Remote Project Identity PASS ≠ Concrete Provider Client PASS ≠ Live Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Fuera de alcance

V0.23.30 no:

- provisiona un proyecto Supabase;
- aplica SQL;
- usa variables de entorno o credenciales;
- implementa un SDK/client factory real;
- verifica remotamente `vivienda-dev`;
- ejecuta provider I/O live;
- modifica `runtime.server.ts`;
- produce activation facts;
- autoriza deployment.
