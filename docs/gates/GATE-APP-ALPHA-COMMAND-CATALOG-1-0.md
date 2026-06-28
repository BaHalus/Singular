# GATE — APP-ALPHA-COMMAND-CATALOG 1.0

## Scope

APP-ALPHA-COMMAND-CATALOG 1.0 creates the isolated and tested handler-entry catalog required before Alpha composition.

## Checks

- [x] The catalog is isolated under `src/application/alpha/*`.
- [x] The catalog includes only integrated command handler entry factories.
- [x] Handler entries are frozen and contain only `type` and `handler`.
- [x] Duplicate command types are rejected before composition.
- [x] The catalog can be consumed by the canonical `CommandRegistry`.
- [x] The stage does not alter `CommandRegistry`, composition roots, bootstrap, UI, HTML, CSS or concrete persistence.
- [x] No GURPS calculation is added to the application layer.

## Command families included

- Pools current values.
- Attacks.
- Equipment.
- Spells.
- Powers.
- Traits.
- Skills and Techniques.
- Languages and Familiarities.
- Secondary structural fields.
- Notes.

## Explicit non-goals

- Registering the catalog in production composition.
- Creating a second registry, executor, session or bootstrap.
- Wiring mobile UI controls.
- Adding new domain operations.
