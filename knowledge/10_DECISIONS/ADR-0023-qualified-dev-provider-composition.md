# ADR-0023 · Qualified DEV Provider Composition

## Estado

Aceptada para V0.23.27.

## Contexto

V0.23.24 definió el probe provider-candidate sin permitir auto-certificación. V0.23.25 definió el execution driver mediante seis transportes separados. V0.23.26 añadió state canónico, observability, one-shot fault-control y cleanup DEV-only.

La brecha siguiente no era crear otro runtime ni ejecutar Supabase live. Era demostrar que esos contratos pueden ensamblarse de forma única, fail-closed y verificable, sin que la composición adquiera autoridad de activación.

## Decisión

Crear `QualifiedDevProviderComposition` como composition root exclusivo para un candidato Supabase DEV ya calificado 14/14.

La composición:

- exige `projectLabel=vivienda-dev`;
- exige qualification exacta 14/14;
- conserva `liveRuntimeAuthorized=false`;
- conserva `runtimeServerWasUsed=false`;
- declara `externalIoOccurred=true` porque modela la forma de ejecución provider-candidate;
- recibe todos los clientes, transports y gateways desde afuera;
- no crea URLs Supabase, secretos, SDK clients ni infraestructura;
- no importa `runtime.server.ts`, `activated-runtime` ni `activation-preflight`.

## Fronteras de transporte

### Auth

`QualifiedDevAuthTransport` solo puede solicitar owner/intruder y entrega al issuer el `expectedSubjectRef` derivado del lease.

### Evidence API HTTP

`QualifiedDevHttpTransport` permite únicamente HTTPS same-origin y los tres POST canónicos de Evidence API. No abre un cliente HTTP genérico.

### Signed upload

`QualifiedDevStorageTransport` permite únicamente:

- bucket `vivienda-evidence`;
- path canónico de quarantine;
- path perteneciente al namespace del lease;
- `application/pdf`;
- 2048 bytes sintéticos;
- `upsert=false`.

## Instrumentación server-only

La telemetría no se inventa desde el parity evaluator. Se captura alrededor de operaciones reales del candidato DEV.

Se crean wrappers para:

- `EvidenceStorageGateway`;
- `ApiAuditLogPort`;
- `ApiRateLimitPort`.

El context resolver que vincula esas operaciones con un fixture debe declarar explícitamente:

```text
channel=server_probe_context
projectLabel=vivienda-dev
syntheticOnly=true
liveRuntimeAuthorized=false
publicRequestDerived=false
```

Un resolver derivado del request público no es aceptable.

## Storage fail-closed

Para upload grants e inspection:

1. se valida shape del objectPath;
2. se resuelve el lease por el context server-only;
3. se prueba que el path pertenece al namespace del lease;
4. solo entonces puede ejecutarse el delegate provider;
5. tras éxito se registra telemetría DEV.

Un path de otro fixture no toca Storage.

## Audit

El lease se resuelve por un canal confiable antes de ejecutar el audit delegate. La señal support se registra únicamente después de que el audit real haya sido aceptado.

## Rate limit fault

`rate_limit_unavailable` permanece out-of-band. Solo si:

```text
lease.scope=rate_limit_unavailable
operation=evidence.prepare
```

se intenta consumir el one-shot fault V0.23.26. Si se consume, el wrapper retorna `unavailable`; de lo contrario usa el rate limiter real.

Nunca se transporta el fault en header, body, query string o ruta pública.

## Composición resultante

El root ensambla:

1. Support RPC V0.23.26;
2. telemetry recorder/fault consumer;
3. probe-aware fixture admin;
4. fixture lifecycle V0.23.22;
5. fixture session V0.23.21;
6. Auth/HTTP/Storage transports V0.23.27;
7. state/observability/fault transports V0.23.26;
8. execution driver V0.23.25;
9. probe adapter V0.23.24;
10. server-only Storage/Audit/RateLimit wrappers.

## Consecuencias

### Positivas

- existe un único lugar para ensamblar el candidato DEV;
- qualification 14/14 precede cualquier provider I/O;
- no se relaja `runtime.server.ts`;
- los seis transportes mantienen identidad contractual;
- observability/fault support quedan ligados a operaciones reales;
- los object paths quedan ligados al fixture antes de Storage I/O;
- browser/public request no puede declarar el contexto del probe.

### Costos

- todavía faltan los adapters concretos/host para ejecutar la Evidence API candidate end-to-end;
- qualification 14/14 sigue siendo un hecho externo que no existe en este repositorio por sí solo;
- ningún test offline demuestra provider parity live.

## Autoridad

**Qualified Composition PASS ≠ Dedicated DEV Exists ≠ Support SQL Applied ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

V0.23.27 no autoriza merge del stack, provisioning, billing, SQL apply, secrets live, datos reales, STAGING/PROD ni deployment.

## Próxima decisión

V0.23.28 debe definir el **Qualified DEV Candidate Evidence API Host Contract**: una composición aislada de la aplicación/HTTP boundary que use los wrappers V0.23.27 sin tocar `runtime.server.ts` y que pueda probarse completamente con fakes antes de cualquier ejecución provider real.
