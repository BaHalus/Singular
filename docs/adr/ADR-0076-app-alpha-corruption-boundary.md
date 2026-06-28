# ADR-0076 — APP-ALPHA-CORRUPTION-BOUNDARY 1.0

## Status
Accepted

## Context

The Alpha application command surface now has invalid payload, undo/redo, JSON roundtrip and no-op/atomicity matrix coverage.

The next hardening risk is accepting corrupted `ApplicationSession` snapshots at the application boundary after serialization, rehydration or external storage handoff.

## Decision

Add application-level tests confirming that `createApplicationSession` rejects corrupted snapshots when the existing contract can detect the corruption:

- inconsistent history fingerprints;
- current character snapshots disconnected from the top of history;
- duplicated command entries between `history` and `future`.

The tests must build a valid snapshot through the canonical Alpha command catalog, registry, executor and session contracts before mutating copies for rejection checks.

## Consequences

The Alpha application boundary gains regression coverage for rejecting structurally corrupted snapshots before mobile editing depends on restored sessions.

This ADR does not alter concrete persistence, introduce a new corruption inspector, create a normalization layer, modify UI behavior or calculate GURPS rules in application code.
