# NEXT SERVER API & AUTH WIRING — HARDENING ADDENDUM v0.9

Status: normative addendum to `NEXT-SERVER-API-AUTH-WIRING-CONTRACT-V0.9.md`.

Where this addendum conflicts with the earlier v0.9 contract text, this addendum is authoritative for the frozen v0.9 candidate.

## 1. Test discovery correction

The initial v0.9 green run was incomplete because `vitest.config.ts` included only `domain/**/*.test.ts`.

Effective v0.9 requires both:

- `domain/**/*.test.ts`;
- `server/**/*.test.ts`.

A CI result that excludes server-side HTTP/security tests is not a valid v0.9 gate.

## 2. Server-controlled evidence classification

`legalDataCategory` and `securityTier` received from a browser are not authority.

The runtime must compose `ServerClassifiedEvidenceApplication`, which derives the persisted classification from the evidence `kind`.

Effective defaults:

| kind | legalDataCategory | securityTier |
| --- | --- | --- |
| statement | financial_credit_semiprivate | restricted |
| contract | financial_credit_semiprivate | restricted |
| bank_response | financial_credit_semiprivate | restricted |
| filing_proof | private | restricted |
| authority | private | highly_restricted |
| court_document | private | highly_restricted |
| other | private | highly_restricted |

`other` is a conservative operational default, not a final legal conclusion about document contents. Later inspection may elevate classification; browser input cannot downgrade it.

## 3. Trusted origin is server authority

`request.url.origin` is not trusted by itself.

Every browser-facing evidence Route Handler must call `bindRequestToTrustedOrigin()` before invoking `EvidenceHttpApi`.

Effective policy:

1. trusted origin is read only from server-side `VIVIENDA_TRUSTED_ORIGIN`;
2. missing/invalid configuration fails closed with 503;
3. HTTPS is required except explicit localhost/loopback development origins;
4. username/password, path, query or fragment in trusted-origin configuration are rejected;
5. request path/query are retained;
6. request URL origin is rebound to the configured origin;
7. browser `Origin` header is deliberately preserved;
8. the inner same-origin guard then compares browser Origin with the rebound trusted URL.

A manipulated Host/request URL therefore cannot bootstrap its own trusted origin.

No `NEXT_PUBLIC_*` variable may hold this policy.

## 4. Canonical Idempotency-Key

The effective production assembly is stricter than the initial HTTP parser.

Before the persistence application is invoked, `ServerClassifiedEvidenceApplication` requires:

```text
^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$
```

Therefore:

- effective maximum = 128 characters;
- first character must be alphanumeric;
- allowed subsequent characters = alphanumeric, `.`, `_`, `:`, `-`;
- leading/trailing whitespace is invalid;
- embedded whitespace is invalid;
- slash/control characters are invalid;
- valid keys are forwarded unchanged; they are not trimmed or rewritten.

This supersedes the earlier contract statement allowing up to 200 control-free characters.

## 5. Authority ordering

For the browser evidence surface, effective authority order is:

```text
Route Handler
  → trusted-origin binding
  → EvidenceHttpApi guards/rate limit/parser
  → ServerClassifiedEvidenceApplication
  → EvidenceStorageCoordinator
  → CasePersistenceService / registry / Storage adapters
```

No outer layer may grant authority that a deeper layer does not revalidate.

## 6. Freeze requirements

v0.9 may be frozen only when the same final SHA demonstrates:

- TypeScript PASS;
- all `domain/**/*.test.ts` PASS;
- all `server/**/*.test.ts` PASS;
- Next build PASS;
- inherited 48/48 Playwright E2E PASS;
- PR remains mergeable;
- no unresolved review thread;
- runtime remains fail-closed without live infrastructure.

The baseline v0.8 remains `ac0b47665fdc5dc8691cdcfc7a0d8abbe32bf42b` and must remain unchanged.
