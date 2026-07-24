# ADR-0069 — APP-ALPHA-INVALID-PAYLOAD-MATRIX

## Status

Accepted for Alpha hardening.

## Context

The Alpha command catalog exposes the command surface consumed by the mobile UI through the canonical `CommandRegistry`, `CommandExecutor` and `ApplicationSession` path.

The previous editing gate already proved that invalid payloads are rejected without session mutation for representative commands. The hardening queue now needs a catalog-wide invalid payload matrix so every registered Alpha command has the same envelope-level protection before handler-specific validation runs.

## Decision

Add a test matrix that executes every command type returned by `listAlphaCommandCatalogTypes()` with invalid payload shapes: `null`, primitive values and arrays.

The command envelope continues to treat an omitted payload as `{}` for backwards compatibility, but `payload: null` is now rejected instead of being silently normalized to an empty object.

The matrix also verifies empty command ids and incompatible revisions without invoking command handlers.

## Boundaries

- No mobile UI, HTML, CSS, concrete persistence or importer code is changed.
- No second registry, executor, session or bootstrap is created.
- No command handler is redefined.
- No GURPS calculation is introduced in the application layer.
- Handler-specific validation remains owned by each command family; this ADR only hardens the shared command envelope boundary.

## Consequences

The UI can rely on a consistent command-envelope rejection boundary across the whole Alpha catalog.

Null payloads are no longer accepted as omitted payloads, reducing the risk of accidental structural edits caused by malformed transport data.
