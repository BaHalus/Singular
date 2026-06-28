# ADR-0073 — APP-ALPHA-UNDO-REDO-MATRIX 1.0

## Status
Accepted

## Context

The Alpha editing contracts now expose structural command handlers through the canonical `AlphaCommandCatalog`, `CommandRegistry`, `CommandExecutor` and `ApplicationSession` path.

The next hardening step is to prove that representative structural commands from each Alpha family produce history entries that can be safely used to restore the previous and next character snapshots.

## Decision

Add an application-level undo/redo matrix test covering representative applied commands for:

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

- execute through the canonical `CommandExecutor` and `ApplicationSession`;
- assert revision, history, future, dirty flag and receipt semantics;
- restore undo/redo states from canonical history snapshots;
- avoid UI, bootstrap and persistence changes;
- avoid GURPS calculation in application code.

## Consequences

The Alpha command surface gains regression coverage for session history integrity before UI wiring depends on structural edit commands.

This ADR does not introduce a new executor, registry, session model or UI behavior.
