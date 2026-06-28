# ADR-0079 — APP-ALPHA-SMOKE-MATRIX 1.0

## Status

Accepted

## Context

After `GATE ALPHA APPLICATION HARDENING`, the Alpha command contracts are already hardened individually. The next validation lane needs a small end-to-end smoke path for the canonical application pieces that the mobile UI consumes.

This is not a UI test and does not introduce another registry, executor, session type or normalizer.

## Decision

Add an application smoke matrix that validates:

- `AlphaCommandCatalog` entries can be used directly to create the canonical `CommandRegistry`;
- the registry exposes exactly the command types listed by the Alpha catalog;
- a realistic sequence of Alpha commands remains executable through `executeCommand`;
- `ApplicationSession` revision, dirty flag, history, future and last receipt move deterministically after each applied command;
- the final serialized `ApplicationSession` can be rehydrated by the canonical session factory without snapshot drift.

The smoke sequence intentionally uses representative commands across character summary, attributes, pools, skills, languages, attacks, equipment, spells, powers and notes.

## Consequences

Future validation work can rely on a compact guard that checks the application wiring expected by mobile consumers.

This ADR does not alter UI, persistence adapters, importers, visual libraries or GURPS rule calculation boundaries.
