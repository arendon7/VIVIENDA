# V0.23.29 · Qualified DEV Driver↔Host Bridge

## Parent

V0.23.28 — `e3e0b4eecc3777ba5f2798bb0cf3061d097851cc`

## Version

`V0.23.29-QUALIFIED-DEV-DRIVER-HOST-BRIDGE-V1`

## Main implementation

`server/evidence-api/qualified-dev-driver-host-bridge.ts`

## Purpose

Close the offline candidate loop between the frozen provider execution driver and the V0.23.28 candidate host without adding fixture selectors to public HTTP fields and without modifying frozen driver interfaces.

## Components

### `QualifiedDevDriverHostBridgeScope`

Uses Node `AsyncLocalStorage` to retain the active synthetic lease across the driver-to-host call chain.

Properties:

```text
scopeChannel = server_probe_scope
channel = server_probe_context
projectLabel = vivienda-dev
syntheticOnly = true
liveRuntimeAuthorized = false
publicRequestDerived = false
```

Behavior:

- same-lease nesting: allowed;
- cross-fixture nesting: rejected;
- concurrent scopes: isolated;
- scope after completion: empty.

### `QualifiedDevScopedExecutionPort`

Implements the frozen `SupabaseProviderCandidateProbeExecutionPort` and delegates every operation inside `scope.run(input.lease, ...)`.

The wrapper changes no method signature in V0.23.25.

### Late-bound HTTP client

The internal HTTP client is constructed before the candidate host and bound exactly once after host construction. During `send()` it requires an active bridge lease, converts the frozen driver request to a native `Request`, invokes the candidate host out-of-band, and returns the normalized response to the frozen driver.

Allowed bridge request headers are restricted to the driver contract: accept, authorization, content-type, idempotency-key and origin.

### Session authority adapter

`QualifiedDevDriverHostSessionAuthorityPort` is injected once and adapted to both:

- V0.23.27 auth-session issuance;
- V0.23.28 principal resolution.

This slice defines the binding contract only. It does not implement a live provider session strategy.

### Bridge probe

The bridge constructs a new `ProviderCandidateFixtureSession` using the composition fixture lifecycle and wraps `QualifiedDevScopedExecutionPort` with a new `SupabaseProviderCandidateProbeAdapter`.

This `bridge.probe` is the V0.23.29 certified path.

## Full offline path

```text
ProviderCandidateParityHarness
  -> SupabaseProviderCandidateProbeAdapter
  -> ProviderCandidateFixtureSession
  -> QualifiedDevScopedExecutionPort
  -> SupabaseProviderCandidateExecutionDriver
  -> QualifiedDevHttpTransport
  -> LateBoundHostHttpClient
  -> QualifiedDevCandidateEvidenceApiHost
  -> EvidenceHttpApi
  -> ServerClassifiedEvidenceApplication
  -> EvidenceStorageCoordinator / CasePersistenceService
  -> V0.23.27 instrumented ports
  -> DEV support telemetry
```

## Test contract

`server/evidence-api/qualified-dev-driver-host-bridge.test.ts`

Four high-value tests cover:

1. complete six-probe certification and 37/37 parity checks;
2. concurrent AsyncLocalStorage isolation + exact same-lease nesting;
3. invalid session-authority configuration rejected before fixture allocation;
4. zero activation facts and static isolation from public runtime.

Functional run before documentation:

```text
62 test files PASS
648/648 tests PASS
TypeScript PASS
Build PASS
```

## Important limitation

The end-to-end parity in this slice is **offline/injected**. Storage, support RPC, fixture administration and session authority in the bridge test are in-memory doubles. This proves composition and authority flow, not live provider behavior.

## Next engineering gap

The next slice should define qualified provider-client bindings that map the already frozen ports to authorized DEV clients without creating or modifying infrastructure. It must remain possible to certify the bindings statically/offline before any external I/O is permitted.

A concrete provider execution still requires a separately qualified DEV environment and explicit authority for external I/O.

## Authority separation

```text
Driver↔Host Bridge PASS
!= Provider Client Bindings PASS
!= Live Provider Parity PASS
!= Runtime Activation
!= Deployment
```
