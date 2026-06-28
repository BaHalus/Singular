# ADR-0078 — GATE ALPHA APPLICATION HARDENING

## Status

Accepted

## Context

The Alpha application layer now has a complete hardening sequence for the command surface already consumed by mobile UI work:

- invalid payload matrix;
- undo/redo matrix;
- JSON roundtrip matrix;
- no-op and atomicity matrix;
- corruption boundary checks;
- command surface documentation sync.

The remaining step is to consolidate the gate and make the accepted boundary explicit before future Alpha validation/release work.

## Decision

Accept `GATE ALPHA APPLICATION HARDENING` as the consolidation point for the current Alpha application contracts.

The gate confirms that:

- Alpha commands are exposed through the canonical `AlphaCommandCatalog`;
- command execution uses the canonical `CommandRegistry`, `CommandExecutor` and `ApplicationSession` contracts;
- invalid payloads are rejected without mutating the active session;
- undo/redo restores snapshots, history, future, revision, dirty state and receipts deterministically;
- JSON roundtrip preserves stable ids and portable metadata for representative families;
- no-ops do not pollute history;
- failed commands do not partially remove preexisting data;
- corrupted `ApplicationSession` snapshots are rejected where canonical contracts define that boundary;
- the application layer does not calculate GURPS rules that belong to the domain/motor;
- the UI mobile remains a consumer, not an authority for application contracts.

## Consequences

The Alpha application hardening lane is complete for the current pre-Alpha command surface.

Future work should move to validation/release preparation or a new macrofront derived from actual gaps on `main`. This ADR does not start the next macrofront and does not alter UI, persistence, importers or runtime contracts.
