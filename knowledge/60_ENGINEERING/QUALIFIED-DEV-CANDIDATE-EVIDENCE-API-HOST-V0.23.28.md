# V0.23.28 · Qualified DEV Candidate Evidence API Host

Parent: V0.23.27 `fdc467c9e60a92e07fc424066ab8dd3246a303d7`.

Version: `V0.23.28-QUALIFIED-DEV-CANDIDATE-HOST-V1`.

This slice adds an isolated development candidate host that reuses the canonical persistence service, evidence storage coordinator, server-side classification layer, HTTP boundary, and V0.23.27 composition. The public runtime remains unchanged.

The host supports the three canonical Evidence API operations: prepare upload, complete upload, and create download grant. Candidate requests execute only inside the active synthetic fixture scope. Identifiers and storage coordinates are scoped to that fixture.

The test suite verifies the complete candidate flow plus the required negative scenarios. Before documentation, TypeScript, all 644 domain tests, and build passed.

The next slice must connect the execution-driver client port to this host through an isolated development bridge. This slice does not establish provider parity, runtime activation, or deployment authority.
