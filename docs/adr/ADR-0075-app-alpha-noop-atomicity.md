# ADR-0075 — APP-ALPHA-NOOP-ATOMICITY 1.0

## Status
Accepted

## Context

The Alpha application command surface now has invalid payload, undo/redo and JSON roundtrip matrix coverage.

The next hardening risk is accidental state pollution when a command has no effective change or when command execution fails after validation reaches a family-specific handler.

## Decision

Add application-level tests confirming that representative Alpha commands:

- return `no-op` without advancing `ApplicationSession.revision`;
- do not append to `history`;
- do not clear or append `future`;
- do not mark the session dirty;
- keep the original `ApplicationSession` snapshot unchanged;
- reject failed partial updates without removing preexisting character data.

The tests must execute through the canonical `AlphaCommandCatalog`, `CommandRegistry`, `CommandExecutor` and `ApplicationSession` contracts.

## Consequences

The UI mobile can rely on no-op receipts and failed command results without defensive rollback logic.

This ADR does not introduce UI behavior, persistence behavior, a second executor, a second session model or GURPS rule calculation in application code.
