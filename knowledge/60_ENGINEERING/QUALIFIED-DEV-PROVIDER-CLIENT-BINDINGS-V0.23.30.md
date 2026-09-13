# V0.23.30 · Qualified DEV Provider Client Bindings

## Objetivo

Cerrar la frontera entre el bridge V0.23.29 y futuros clientes concretos del proveedor sin ejecutar provider I/O y sin mezclar autoridades.

## Implementación

Source principal:

`server/evidence-api/qualified-dev-provider-client-bindings.ts`

Versión:

`V0.23.30-QUALIFIED-DEV-PROVIDER-CLIENT-BINDINGS-V1`

## Binding set

La factory recibe cinco clientes estructurales independientes:

1. `QualifiedDevRuntimeRpcClient`
2. `QualifiedDevSupportRpcClient`
3. `QualifiedDevFixtureAdminClient`
4. `QualifiedDevStorageClient`
5. `QualifiedDevSyntheticSessionClient`

Todos deben declarar el mismo `projectBindingId`, además de `provider=supabase`, `projectLabel=vivienda-dev`, `syntheticOnly=true` y `liveRuntimeAuthorized=false`.

### Importante

`projectBindingId` es una comprobación local de coherencia. No es una prueba de identidad remota. El output conserva `remoteIdentityVerified=false`.

## Adapters resultantes

La factory reutiliza directamente:

- `SupabaseCasePersistenceAdapter(runtimeRpc)`;
- `SupabaseStorageCoordinationRegistry(runtimeRpc)`;
- `SupabaseDevFixtureAdminControlPlane(fixtureAdmin, qualification)`.

Además construye dos adapters nuevos limitados al slice:

- Storage binding que implementa `EvidenceStorageGateway` y `QualifiedDevSignedUploadPort`;
- session authority que implementa `QualifiedDevDriverHostSessionAuthorityPort`.

## Output para V0.23.29

La salida `bridge` está diseñada para ensamblarse con `createQualifiedDevDriverHostBridge` sin alterar contratos congelados:

```text
bridge.provider
  qualification
  configuration
  fixtureAdmin
  casePersistence
  supportRpcClient
  signedUploads

bridge.server
  storageGateway
  registry

bridge.sessionAuthority
```

Audit log, rate limiter y clock siguen siendo responsabilidades del host/composition y no se convierten en provider clients artificialmente.

## Authority separation

### candidate_runtime_rpc

Único binding destinado a canonical persistence y Evidence registry.

### dev_probe_support_rpc

Solo expone la superficie V0.23.26 para telemetry/fault support.

### dev_fixture_admin

Solo satisface el control plane V0.23.23 para lifecycle y cleanup de fixtures.

### dev_storage

Cubre operaciones físicas de Evidence Storage y signed upload sintético.

### candidate_session_authority

Cubre issue/resolve de una futura sesión sintética del provider. El contrato exige que los principals resueltos pertenezcan al owner/intruder del lease activo.

## Storage validation

Antes o después del provider call, según corresponda, el adapter valida:

- bucket `vivienda-evidence`;
- object path canónico y namespace del lease;
- `upsert=false`;
- upload bytes como `Uint8Array`;
- signed capability opaca;
- signed upload 2xx;
- inspection MIME, byte count, SHA-256 e ISO date;
- signed download HTTPS y expiry ISO;
- delete result exacto.

Provider exceptions y provider error payloads se convierten en un error estable `QualifiedDevProviderClientBindingsError` sin copiar mensajes internos.

## Session validation

`issueSession`:

- valida el lease;
- deriva el subject esperado de actor owner/intruder;
- exige que la sesión retornada conserve ese subject;
- valida access token opaco y expiry ISO.

`resolvePrincipal`:

- no recibe fixture selectors del request;
- sin bearer válido retorna anonymous/null;
- resuelve el token a través del session client;
- solo admite `client` ligado a owner o intruder del lease activo.

## Construction-time behavior

La factory es deliberadamente pura respecto del proveedor:

```text
RPC calls           0
Auth Admin calls    0
Storage calls       0
Session calls       0
External HTTP       0
```

Construir bindings no califica remotamente el proyecto.

## Tests

Archivo:

`server/evidence-api/qualified-dev-provider-client-bindings.test.ts`

La suite específica tiene 10 tests:

1. version/authority/no activation facts;
2. canonical adapters + zero construction I/O;
3. cross-project binding id rejected before I/O;
4. unqualified DEV rejected before I/O;
5. Storage + signed upload happy path;
6. provider error sanitization;
7. malformed Storage grant fail-closed;
8. session issue + resolve + anonymous;
9. cross-fixture principal rejected;
10. static absence of runtime activation/env reads/public runtime import.

Validación funcional del head con tests (`599d85fb768afb1a883e5fa25e7033b4d5e9926c`):

- TypeScript PASS;
- 63 test files PASS;
- 658/658 tests PASS;
- V0.23.30 specific tests 10/10 PASS;
- Build PASS.

El freeze definitivo debe usar un run de `pull_request` sobre el head documental final, no este run de push.

## Brecha restante

V0.23.30 todavía no implementa los clientes concretos que hablarían con un proveedor real. En particular, no existe una implementación aprobada de `QualifiedDevSyntheticSessionClient` que pueda obtener una sesión real para los usuarios sintéticos creados por el fixture lifecycle.

El siguiente slice debe resolver esa capa sin introducir credenciales en source y sin ejecutar provider I/O hasta que exista autorización explícita y un proyecto DEV dedicado realmente calificado.

## Authority rule

**Client Binding Contract PASS ≠ Remote Project Identity PASS ≠ Concrete Provider Client PASS ≠ Live Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**
