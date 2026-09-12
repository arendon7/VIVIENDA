# ADR-0022 · Supabase DEV Probe Support Plane

- **Estado:** Accepted for V0.23.26
- **Fecha:** 2026-09-12
- **Padre:** V0.23.25 · Supabase Provider Candidate Execution Driver

## Contexto

V0.23.25 congeló el execution driver con seis canales separados. Tres brechas seguían abiertas antes de poder componer un candidato DEV real:

1. seed/read de Case e intent sin crear una segunda implementación de persistencia;
2. observabilidad provider-verificable para registry, Storage y audit;
3. fault-control one-shot para `rate_limit_unavailable` sin contaminar el protocolo HTTP público.

También debía resolverse el cleanup de cualquier estado auxiliar introducido por los probes.

## Decisión

V0.23.26 introduce un support plane DEV-only dividido en tres capas.

### 1. State transport canónico

`SupabaseDevProbeStateTransport` implementa `SupabaseProviderCandidateStateTransport` sobre un `CasePersistencePort` inyectado.

No existe un RPC de seed paralelo. El transport reutiliza:

- `CasePersistenceService`;
- router/blueprint R7 canónico;
- persistence adapter normal;
- clock determinista del lease;
- IDs deterministas y namespace-scoped.

Seed ejecuta exactamente:

1. `CASE_CREATED`;
2. `DATA_AUTHORIZATION_RECORDED` cuando corresponde;
3. `SERVICE_AGREEMENT_ACCEPTED`;
4. `EVIDENCE_REQUESTED`.

La versión pre-evidence queda 4 con autorización y 3 sin autorización.

### 2. DEV support RPC

`SupabaseDevProbeSupportRpc` define exclusivamente soporte sintético:

- registrar upload-grant touch;
- registrar inspection touch;
- registrar audit event;
- observar telemetría completa;
- armar fault `rate_limit_unavailable_once`;
- consumirlo una sola vez;
- desarmarlo;
- consultar residue del support plane.

El SQL correspondiente vive en:

`supabase/dev-fixtures/V0.23.26_DEV_PROBE_SUPPORT.sql`

No está en `supabase/migrations` y no tiene autoridad para aplicarse automáticamente.

### 3. Cleanup compatibility decorator

Los contratos V0.23.21/V0.23.22 tienen cuatro flags de cleanup y no conocen `supportRows`.

En lugar de reabrir esos contratos congelados, `SupabaseDevProbeAwareFixtureAdmin` decora el admin V0.23.23:

- delega purge normal;
- consulta `vivienda_dev_probe_support_residue` después de la inspección base;
- agrega `supportRows` a `caseRows` solo para el gate de cleanup.

Por tanto, el `caseResidueAbsent` ya existente solo puede ser true cuando tanto canonical Case residue como support-plane residue son cero.

Si el RPC support no existe, falla, o devuelve un tipo inválido, cleanup falla cerrado.

## SQL support plane

Las tablas DEV-only son:

- `private.vivienda_dev_probe_metrics`;
- `private.vivienda_dev_probe_audit`;
- `private.vivienda_dev_probe_faults`.

Todas tienen RLS habilitado y no otorgan acceso a `public`, `anon` ni `authenticated`. Los RPCs son `security invoker` y service-role-only.

### Observabilidad

`vivienda_dev_probe_observe` deriva:

- `registryRegistrations` desde `private.vivienda_evidence_objects` canónico;
- `storageUploadGrantCalls` desde metrics DEV;
- `storageInspectionCalls` desde metrics DEV;
- `auditOperations` desde audit DEV ordenado por sequence.

El resultado está ligado a fixtureId, namespace y scope.

### Fault control

`vivienda_dev_probe_fault_arm`:

- solo acepta scope `rate_limit_unavailable`;
- solo `evidence.prepare`;
- solo `rate_limit_unavailable_once`;
- impide dos faults activos equivalentes.

`vivienda_dev_probe_fault_consume` usa row locking y transforma el fault en consumido una sola vez.

`vivienda_dev_probe_fault_disarm` es fixture-bound y puede cerrar un receipt ya consumido.

### Cleanup

El archivo redefine, manteniendo firmas públicas, los RPC V0.23.22:

- `vivienda_dev_fixture_purge`;
- `vivienda_dev_fixture_residue`.

El purge elimina support rows antes del Case/identity cleanup. El residue añade `supportRows` para diagnóstico, aunque el admin congelado ignore esa clave; el decorator V0.23.26 hace una consulta dedicada para que el gate no pueda omitirla.

## Instrumentation seams

V0.23.26 define además:

- `SupabaseDevProbeTelemetryRecorder`;
- `SupabaseDevProbeRateLimitFaultConsumer`.

Son seams server-only para una futura composición DEV. No están conectados a `runtime.server.ts` en este slice.

## Seguridad y autoridad

V0.23.26 no:

- aplica el SQL;
- crea/provisiona `vivienda-dev`;
- obtiene secrets;
- modifica runtime público;
- ejecuta provider parity;
- produce activation facts;
- autoriza STAGING/PROD/deployment.

Regla:

**Support Plane PASS ≠ Support SQL Applied ≠ Provider Transport PASS ≠ Provider Parity PASS ≠ Runtime Activation ≠ Deployment.**

## Consecuencias

### Positivas

- seed usa invariants canónicos, no SQL ad hoc;
- telemetry tiene señales independientes del parity evaluator;
- registry count proviene de estado provider real;
- fault injection queda fuera del request público;
- cleanup incluye soporte auxiliar sin romper contratos congelados;
- la ausencia del support plane falla cerrada.

### Pendientes

- adapters concretos de Auth/session, Storage y HTTP;
- wrappers de Storage/Audit/RateLimit que llamen recorder/consumer;
- composición DEV-only de `EvidenceHttpApi` separada de `runtime.server.ts`;
- validación SQL contra PostgreSQL real, únicamente cuando exista DEV autorizado.
