# V0.23.31 · Supabase JS Client Shape Adapter Pack

## Objetivo

Adaptar superficies estructurales compatibles con Supabase a los cinco bindings V0.23.30 sin instalar SDK, sin leer configuración sensible y sin ejecutar provider I/O durante construcción.

## Source

`server/evidence-api/supabase-provider-client-shape-adapters.ts`

Versión:

`V0.23.31-SUPABASE-CLIENT-SHAPE-ADAPTERS-V1`

## Output authority

```text
provider=supabase
projectLabel=vivienda-dev
syntheticOnly=true
liveRuntimeAuthorized=false
sdkInstantiated=false
remoteIdentityVerified=false
sessionBootstrapProven=false
```

## Raw client shapes

La factory recibe:

- `SupabaseRpcClientShape`;
- `SupabaseSupportRpcClientShape`;
- `SupabaseDevFixtureClient`;
- `SupabaseStorageClientShape`;
- `SupabaseSyntheticSessionBootstrapShape`.

Cada raw authority debe ser una instancia distinta. Fixture admin Storage y Evidence Storage tampoco pueden compartir el mismo objeto root.

## Adapter output

`createSupabaseProviderClientShapeAdapters()` produce:

```text
clients.runtimeRpc
clients.supportRpc
clients.fixtureAdmin
clients.storage
clients.sessions
```

Todos quedan listos para alimentar `createQualifiedDevProviderClientBindings()` de V0.23.30.

## Storage mapping

### createSignedUploadGrant

Raw:

```text
storage.from(bucket).createSignedUploadUrl(path, {upsert:false})
```

Binding:

```text
{ token, expiresAt }
```

El TTL usado es dos horas, coherente con la referencia actual de Supabase para signed upload URLs.

### uploadSigned

Raw:

```text
uploadToSignedUrl(path, token, Uint8Array, {contentType})
```

La ausencia de provider error se adapta a `{status:200}` para el contrato interno V0.23.25/V0.23.30. El adapter no afirma que 200 sea un status HTTP observado directamente; es la representación interna de operación provider exitosa.

### inspectObject

```text
exists(path)
→ download(path)
→ arrayBuffer
→ createHash('sha256')
```

El checksum se calcula en Node y nunca se toma como verdad declarada por el provider.

### createSignedDownloadGrant

Raw:

```text
createSignedUrl(path, expiresIn)
```

Solo se aceptan URLs HTTPS. `expiresAt` se deriva del clock local inyectado + `expiresIn`.

### deleteObject

`exists` permite distinguir `not_found`; `remove([path])` produce `deleted`.

## Session bootstrap

`SupabaseSyntheticSessionBootstrapShape` permanece inyectado. Tiene dos primitivas:

```text
issue({ fixtureId, namespace, actor, subjectRef, syntheticEmail })
resolve({ fixtureId, namespace, accessToken })
```

V0.23.31 adapta esta forma a `QualifiedDevSyntheticSessionClient`, pero deliberadamente no demuestra cómo se implementa `issue` o `resolve` con Supabase Auth real.

Esto evita asumir que los usuarios creados por V0.23.23 —que no tienen password configurado por ese lifecycle— pueden producir una sesión por password grant.

## Error handling

- respuestas Storage malformadas fallan con `invalid_provider_response`;
- raw Storage/provider errors pierden el mensaje interno y conservan únicamente code/status;
- excepciones raw se convierten en provider failure estable;
- support RPC también elimina message antes de subir de capa;
- runtime RPC se deja al adapter canónico V0.23.30/V0.23.x porque allí se interpretan los boundary codes permitidos.

## Construction purity

El test específico exige cero llamadas a:

```text
runtime RPC
support RPC
fixture admin
storage.from
Storage operations
session bootstrap
clock
```

al construir el pack y al pasarlo a V0.23.30.

## Tests

Archivo:

`server/evidence-api/supabase-provider-client-shape-adapters.test.ts`

12 casos:

1. authority/version/no activation facts;
2. five bindings + zero raw I/O/clock;
3. integración con V0.23.30 sin I/O;
4. separación runtime/support RPC;
5. Storage happy path completo;
6. missing object sin download/remove;
7. sanitización de raw Storage error;
8. malformed Storage fail-closed;
9. synthetic session adaptation + `sessionBootstrapProven=false`;
10. authority/client alias rejection;
11. lazy clock validation;
12. ausencia de SDK/env/public runtime/activation imports.

Head funcional validado:

`322c1e5377fca25a8a0e7d1894cbf441a63a0320`

GitHub Actions run `34770145209` verify:

- TypeScript PASS;
- 64 test files PASS;
- 670/670 tests PASS;
- V0.23.31 12/12 PASS;
- Build PASS.

El freeze definitivo requiere CI de `pull_request` sobre el head documental final.

## Restricciones

No SDK install. No env reads. No credentials. No remote identity proof. No live provider I/O. No SQL apply. No provisioning. No runtime activation. No deployment.

## Authority rule

**Client Shape Adapter PASS ≠ SDK Client Factory PASS ≠ Session Bootstrap Proven ≠ Remote Project Identity PASS ≠ Live Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**
