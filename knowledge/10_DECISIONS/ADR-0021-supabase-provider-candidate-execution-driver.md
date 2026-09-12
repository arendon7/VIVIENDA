# ADR-0021 · Supabase Provider Candidate Execution Driver

- **Estado:** Accepted for V0.23.25
- **Fecha:** 2026-09-12
- **Padre:** V0.23.24 · Supabase Provider Candidate Probe Adapter

## Contexto

V0.23.24 congeló el `SupabaseProviderCandidateProbeAdapter`: el harness ya sabe ejecutar seis probes y construir observaciones sin permitir auto-certificación. Faltaba traducir sus primitivas a canales concretos de un futuro candidato Supabase DEV sin conectar todavía credenciales, infraestructura o runtime live.

La revisión del repositorio confirmó dos hechos relevantes:

1. las rutas públicas existentes cubren únicamente `prepare`, `complete` y `download` del Evidence API;
2. `runtime.server.ts` permanece deliberadamente fail-closed y no debe usarse como atajo para certificar el proveedor.

Además, `seedCase`, lecturas autoritativas, telemetría y fault injection no son endpoints HTTP públicos y no deben inventarse como tales.

## Decisión

Se introduce `SupabaseProviderCandidateExecutionDriver`, implementación de `SupabaseProviderCandidateProbeExecutionPort`, con seis transportes inyectados y separados:

1. `supabase_auth` — emisión de sesión/JWT sintético owner/intruder;
2. `evidence_api` — POST únicamente a las tres rutas canónicas de Evidence API;
3. `supabase_storage` — upload físico por capability firmada;
4. `supabase_state` — seed y lecturas autoritativas de Case/intent;
5. `supabase_observability` — telemetría provider-verificable;
6. `parity_fault_control` — fault one-shot exclusivo de certificación.

Todos los transportes deben declarar:

- `projectLabel = vivienda-dev`;
- `syntheticOnly = true`;
- `liveRuntimeAuthorized = false`;
- canal exacto.

El driver no lee variables de entorno, no contiene URL Supabase concreta y no importa el runtime público ni superficies de activación.

## HTTP público

El driver usa Evidence API solo para:

- `POST /api/v1/cases/{caseId}/evidence/uploads`;
- `POST /api/v1/cases/{caseId}/evidence/uploads/{intentId}/complete`;
- `POST /api/v1/cases/{caseId}/evidence/{evidenceId}/download`.

El origin es inyectado y debe ser un origin HTTPS limpio, sin userinfo, path, query ni fragment.

Owner/intruder reciben Bearer token del Auth transport. `anonymous` no consulta Auth y no envía Authorization.

## Signed upload

La respuesta `prepare` se valida contra el DTO real del Evidence API:

- intentId;
- evidenceId;
- bucket `vivienda-evidence`;
- objectPath canónico;
- token/capability opaco;
- `upsert=false`.

El driver genera únicamente un PDF sintético determinista de 2048 bytes y lo entrega al Storage transport con `application/pdf` y `upsert=false`.

## Seed/state

`seedCase` fija el escenario R7:

- `routeCode = R7_RECLAMACION`;
- `caseTrack = assisted`;
- request code `R7_STATEMENT_DIFFERENCE`;
- owner derivado del lease.

La versión esperada antes de la operación de evidencia es:

- 4 con data authorization;
- 3 sin data authorization.

Case, intent y subject refs permanecen ligados al namespace del fixture.

## Observabilidad

El transporte de observabilidad no puede devolver una decisión de paridad. Devuelve un envelope provider-verificable con:

- `source = supabase_dev_observability`;
- observationId;
- fixtureId;
- namespace;
- scope;
- observedAt;
- `complete=true`;
- contadores registry/Storage;
- audit operations.

El driver valida el envelope y solo entonces lo reduce a la telemetría V0.23.24.

## Fault injection parity-only

`rate_limit_unavailable` no se transmite mediante headers ni body público.

El control de fault es un canal separado, `parity_fault_control`, con:

- `parityOnly=true`;
- arm one-shot para `evidence.prepare`;
- receipt ligado a fixture + namespace;
- disarm obligatorio.

Si el request HTTP falla, el driver igualmente intenta desarmar el fault. Si el disarm falla, el error es `fault_cleanup_failed`.

Como defensa en profundidad, V0.23.25 liga actor y fault al scope del lease:

- `unauthenticated_prepare` → anonymous + no fault;
- `cross_case_access` → intruder + no fault;
- `rate_limit_unavailable` → owner + rate-limit fault obligatorio;
- los demás scopes → owner + no fault.

Una combinación distinta falla antes de tocar Auth, HTTP o fault-control.

## Error boundary

Los errores expuestos por el driver son únicamente:

- `invalid_configuration`;
- `invalid_input`;
- `invalid_transport_response`;
- `transport_failure`;
- `fault_cleanup_failed`.

El mensaje público es estable y no incorpora detalle del provider.

## Separación de autoridad

V0.23.25 no:

- crea cliente Supabase real;
- lee secrets/env;
- aplica SQL;
- crea usuarios/casos live;
- modifica `runtime.server.ts`;
- ejecuta provider parity live;
- produce activation facts;
- autoriza deployment.

Regla:

**Execution Driver PASS ≠ Provider Transport PASS ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Consecuencias

### Positivas

- cada canal externo queda explícito y sustituible;
- el runtime público permanece separado y fail-closed;
- Auth/JWT no se mezcla con state/admin operations;
- signed Storage upload queda acotado al objeto preparado;
- telemetry no puede auto-certificar paridad;
- fault injection queda fuera del protocolo público;
- actores/faults quedan scope-bound;
- el siguiente slice puede implementar soporte DEV específico sin modificar el contrato de probe.

### Costos

- aún faltan adapters concretos para los transportes;
- observabilidad y fault-control requieren soporte DEV verificable;
- la suite actual usa fakes y no constituye provider parity real.

## Fuera de alcance

- provisioning/billing;
- secretos live;
- aplicación de SQL;
- reutilización de proyectos existentes;
- ejecución contra Supabase real;
- runtime público;
- STAGING/PROD;
- deployment o merge del stack.
