# ADR-0027 · Supabase JS Client Shape Adapter Pack

## Estado

Accepted for V0.23.31 candidate freeze.

## Contexto

V0.23.30 definió cinco provider client bindings separados por autoridad, pero deliberadamente no instanció un SDK ni definió cómo adaptar la superficie pública de un cliente Supabase a esos bindings.

El repositorio tampoco depende de `@supabase/supabase-js`. Introducir el SDK, URLs o credenciales en este punto confundiría adaptación estructural con configuración real de un proyecto DEV, que todavía no está autorizada ni verificada.

## Decisión

V0.23.31 introduce un **client shape adapter pack**. El pack refleja las formas mínimas que un cliente compatible debe exponer, las adapta a los cinco bindings V0.23.30 y conserva explícitamente:

```text
sdkInstantiated=false
remoteIdentityVerified=false
sessionBootstrapProven=false
liveRuntimeAuthorized=false
```

El pack no crea clientes, no lee environment variables y no conoce credenciales.

## Separación de autoridades

La factory recibe cinco objetos crudos distintos:

1. runtime RPC;
2. support RPC;
3. fixture admin;
4. Storage;
5. synthetic session bootstrap.

El constructor rechaza reutilizar la misma instancia entre dos autoridades. También rechaza compartir el mismo objeto `storage` entre fixture admin y Evidence Storage.

Esta validación evita que una composición futura reduzca accidentalmente todas las capacidades a un único cliente privilegiado.

## RPC adapters

### Runtime RPC

Conserva la firma estructural compatible con el `SupabaseRpcClient` canónico y entrega el binding:

```text
channel=candidate_runtime_rpc
authority=candidate_runtime
```

### Support RPC

Conserva la forma requerida por V0.23.26 y entrega:

```text
channel=dev_probe_support_rpc
authority=probe_support
```

Los errores del support client se reducen a code/status antes de subir de capa.

## Fixture admin adapter

El adapter reutiliza la forma estructural ya exigida por V0.23.23:

- `auth.admin.createUser/deleteUser/getUserById`;
- `storage.from(...).list/remove`;
- `rpc(...)`.

V0.23.31 solo añade identidad de binding. No cambia la lógica de lifecycle o cleanup.

## Storage adapter

La forma refleja métodos públicos actuales de Supabase Storage:

- `createSignedUploadUrl`;
- `uploadToSignedUrl`;
- `exists`;
- `download`;
- `createSignedUrl`;
- `remove`.

La referencia actual de Supabase documenta que un signed upload URL tiene una vigencia fija de dos horas. V0.23.31 usa ese TTL únicamente para construir el `expiresAt` esperado por el contrato V0.23.30.

### Signed upload

- el grant se solicita con `upsert=false`;
- el token retornado se trata como capability opaca;
- `uploadToSignedUrl` recibe path, token, bytes y `contentType`;
- una llamada del provider sin error se mapea a status 200 para el contrato interno del execution driver.

### Inspection

El adapter no inventa metadata del objeto. Ejecuta:

```text
exists(path)
→ download(path)
→ arrayBuffer()
→ SHA-256 local
```

Produce:

- MIME type del objeto descargado;
- byte size;
- checksum SHA-256 calculado localmente;
- `verifiedAt` del clock inyectado.

Si `exists=false`, retorna `null` sin descargar.

### Signed download

`createSignedUrl(path, expiresIn)` se adapta a `{url, expiresAt}`. Solo se admite HTTPS.

### Delete

Para conservar la semántica `deleted | not_found` del dominio:

```text
exists(path)
false -> not_found
true  -> remove([path]) -> deleted
```

## Synthetic session bootstrap

V0.23.31 **no implementa una estrategia Supabase Auth concreta**.

Existe una posibilidad técnica documentada en Supabase alrededor de Auth Admin link generation y OTP verification, pero no ha sido probada para los usuarios sintéticos ni contra un proyecto DEV dedicado de VIVIENDA. Por lo tanto, el pack mantiene un `SupabaseSyntheticSessionBootstrapShape` inyectado y declara `sessionBootstrapProven=false`.

El adapter sí normaliza la identidad del fixture:

```text
fixture+<namespace>.<owner|intruder>@vivienda.invalid
```

pero no genera passwords, JWTs ni tokens por su cuenta.

## Constructor sin I/O

La factory:

- valida label/binding id;
- valida separación por identidad de objetos;
- construye wrappers.

No llama:

- RPC;
- Storage;
- Auth;
- bootstrap de sesión;
- clock.

## Sin SDK

V0.23.31 no agrega `@supabase/supabase-js` a `package.json` y el source no lo importa. El objetivo es congelar la frontera de compatibilidad antes de autorizar cualquier client factory real.

## Autoridad

**Client Shape Adapter PASS ≠ SDK Client Factory PASS ≠ Session Bootstrap Proven ≠ Remote Project Identity PASS ≠ Live Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Fuera de alcance

- instalar Supabase SDK;
- crear clientes reales;
- leer URL/key desde env;
- verificar un proyecto remoto;
- ejecutar provider I/O live;
- implementar una estrategia real de Auth session bootstrap;
- provisionar infraestructura;
- aplicar SQL;
- modificar `runtime.server.ts`;
- producir activation facts;
- desplegar.
