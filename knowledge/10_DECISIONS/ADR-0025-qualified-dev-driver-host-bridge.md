# ADR-0025 · Qualified DEV Driver↔Host Bridge

- Estado: **accepted for candidate validation**
- Slice: **V0.23.29**
- Parent freeze: **V0.23.28 `e3e0b4eecc3777ba5f2798bb0cf3061d097851cc`**
- Scope: synthetic-only DEV candidate

## Contexto

V0.23.25 construyó el execution driver. V0.23.28 construyó el candidate Evidence API host. Ambos contratos son correctos por separado, pero existe una frontera deliberada:

- cada método del driver recibe `ProviderCandidateFixtureLease`;
- el HTTP request construido por el driver no contiene lease, fixture ID ni namespace;
- el host exige el lease fuera del request público.

Modificar el contrato HTTP congelado para añadir fixture metadata debilitaría la frontera de autoridad. Derivar el fixture desde path/header/body público también sería incorrecto.

## Decisión

Se introduce `QualifiedDevDriverHostBridge`.

El bridge no modifica V0.23.25, V0.23.27 ni V0.23.28. En cambio:

1. envuelve el execution port congelado con `QualifiedDevScopedExecutionPort`;
2. abre un contexto out-of-band usando el lease que cada método ya recibe;
3. un HTTP client late-bound obtiene el lease desde ese contexto;
4. el client invoca el candidate host con `source=server_probe_harness` y `publicRequestDerived=false`;
5. el host vuelve a entrar al mismo scope con el mismo lease;
6. se construye un probe adapter nuevo sobre el execution wrapper.

## Contexto concurrente

El bridge usa `AsyncLocalStorage<ProviderCandidateFixtureLease>`.

Reglas:

- dos operaciones concurrentes conservan contextos independientes;
- nesting con el lease exacto es permitido;
- nesting con un fixture distinto falla cerrado;
- al terminar la operación, `currentLease()` vuelve a `null`.

El nesting exacto es necesario porque:

```text
probe adapter
  -> scoped execution
      -> frozen driver
          -> HTTP bridge client
              -> candidate host
                  -> probeScope.run(same lease)
```

## Circularidad host/client

El host necesita un HTTP client para construir la composición V0.23.27, mientras ese client necesita el host para ejecutar requests.

La solución es un `LateBoundHostHttpClient`:

1. se crea sin host;
2. se inyecta en la composición del host;
3. se construye el host;
4. se hace `bind(host)` exactamente una vez;
5. cualquier `send()` antes del bind falla cerrado.

No existe network listener ni runtime público en este mecanismo.

## Session authority única

Se introduce `QualifiedDevDriverHostSessionAuthorityPort` como autoridad candidata inyectada para ambas direcciones:

- emitir una sesión sintética para owner/intruder cuando el driver la solicita;
- resolver esa sesión al principal esperado cuando el host procesa el request.

El contrato declara:

```text
channel = candidate_session_authority
projectLabel = vivienda-dev
syntheticOnly = true
liveRuntimeAuthorized = false
publicFixtureSelectorsAccepted = false
```

V0.23.29 no implementa una estrategia real de sesión del proveedor. La suite usa una autoridad en memoria. Por tanto no se afirma que Auth/JWT live esté resuelto.

## Request bridge

El client bridge admite únicamente los headers esperados por el driver:

- `accept`
- `authorization`
- `content-type`
- `idempotency-key`
- `origin`

El fixture lease nunca se serializa en headers, query, body o path por el bridge.

## Probe certificado

El `probe` expuesto por V0.23.29 es un nuevo `SupabaseProviderCandidateProbeAdapter` construido con:

- el mismo fixture lifecycle de la composición;
- una nueva `ProviderCandidateFixtureSession`;
- `QualifiedDevScopedExecutionPort`.

El `composition.probe` crudo de V0.23.27 no es el probe certificado por este bridge porque no abre el scope externo requerido por el HTTP client bridge.

## Evidencia offline

La suite V0.23.29 ejecuta secuencialmente:

1. happy_path
2. unauthenticated_prepare
3. missing_data_authorization
4. cross_case_access
5. missing_uploaded_object
6. rate_limit_unavailable

atravesando:

```text
probe adapter
→ scoped execution
→ V0.23.25 driver
→ V0.23.27 HTTP transport
→ late-bound bridge client
→ V0.23.28 candidate host
→ canonical HTTP/domain/storage boundaries
→ support telemetry
```

Resultado del run funcional previo a documentación:

- 62 test files PASS
- 648/648 tests PASS
- runtime parity: 37/37 checks conformes
- TypeScript PASS
- Build PASS

Todo lo anterior usa dobles inyectados/in-memory. **No hubo provider I/O real.**

## Brecha restante

Para una verdadera ejecución contra un DEV del proveedor aún faltan bindings concretos autorizados para:

- session authority;
- provider persistence client;
- registry/storage client;
- signed upload;
- support RPC/admin clients;
- configuración de un proyecto DEV realmente cualificado.

Estos bindings no pueden inferirse de variables, proyectos existentes ni credenciales no autorizadas.

## Autoridad

**Driver↔Host Bridge PASS ≠ Provider Client Bindings PASS ≠ Live Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

V0.23.29 no autoriza provisioning, SQL apply, merge, runtime público, STAGING/PROD ni deployment.
