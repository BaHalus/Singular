# ADR-0082 — APP-ALPHA-ERROR-SURFACE 1.0

## Status

Accepted

## Context

The Alpha application layer exposes command execution results that mobile consumers can inspect after invalid input, stale revisions, missing handlers or handler-side contract errors.

The validation lane needs a compact error-surface check without adding UX, localization or a new diagnostics layer.

## Decision

Add tests for canonical command-executor error results.

The tests confirm that:

- malformed command envelopes are rejected safely;
- stale revisions are rejected with expected and actual revision data;
- missing handlers are rejected with the command type;
- handler-side contract errors are reported as failed command execution;
- rejected and failed commands preserve the original session object and serialized snapshot.

## Consequences

The Alpha has a small regression guard for safe error reporting consumed by UI work.

This ADR does not alter UI, persistence, importers or GURPS rule calculation placement.
