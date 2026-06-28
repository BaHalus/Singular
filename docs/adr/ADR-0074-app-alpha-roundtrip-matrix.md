# ADR-0074 — APP-ALPHA-ROUNDTRIP-MATRIX 1.0

## Status
Accepted

## Context

The Alpha editing surface is registered through the canonical command catalog and now has invalid-payload and undo/redo matrix coverage.

The next hardening risk is snapshot portability: every structural command family must preserve stable IDs and portable metadata after serialization and rehydration through the application session contract.

## Decision

Add an application-level roundtrip matrix test covering representative applied commands for:

- Traits;
- Skills;
- Techniques;
- Languages;
- Familiarities;
- Secondary characteristics;
- Notes;
- Attacks;
- Equipment;
- Spells;
- Powers.

The matrix must:

- execute through `AlphaCommandCatalog`, `CommandRegistry`, `CommandExecutor` and `ApplicationSession`;
- serialize the resulting `ApplicationSession` to JSON-compatible data;
- rehydrate through `createApplicationSession`;
- assert stable IDs, portable metadata and command history payloads;
- avoid UI, bootstrap and persistence changes;
- avoid GURPS calculation in application code.

## Consequences

The Alpha command surface gains regression coverage for JSON roundtrip behavior before mobile UI editing depends on these contracts.

This ADR does not introduce new schema normalization, a second session model, a second executor, UI behavior or rule calculations.
