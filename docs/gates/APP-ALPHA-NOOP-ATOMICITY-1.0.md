# Gate — APP-ALPHA-NOOP-ATOMICITY 1.0

## Status
Proposed

## Scope

Validate no-op and failed-command atomicity for the Alpha application command surface.

## Required checks

- No-op commands keep the original `ApplicationSession` object.
- No-op commands do not advance revision.
- No-op commands do not append history.
- No-op commands do not mutate future.
- No-op commands do not mark the session dirty.
- Failed commands keep the original session snapshot and preexisting character data.
- Tests execute through canonical Alpha command catalog, registry, executor and session contracts.

## Non-goals

- UI mobile behavior.
- Concrete persistence changes.
- Importer changes.
- GURPS rule calculation.
- Generic transaction framework.

## Evidence

Expected command:

```bash
npm test
```
