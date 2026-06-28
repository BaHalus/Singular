# ADR — APP-ALPHA-COMMAND-CATALOG 1.0

## Status

Accepted for Alpha application contracts.

## Context

Alpha now has isolated command handler modules for Pools, Attacks, Equipment, Spells, Powers, Traits, Skills, Languages/Familiarities, Secondary characteristics and Notes.

The composition step needs one authoritative list of handler entries, but registration must remain outside this stage.

## Decision

Create `src/application/alpha/AlphaCommandCatalog.js` as an isolated catalog builder.

The catalog imports only previously integrated handler entry factories, returns frozen `{ type, handler }` entries, exposes a version marker, exposes a handler-free type list, validates entry shape and rejects duplicate command types before composition.

## Boundaries

- No mobile UI, HTML, CSS, bootstrap or concrete persistence layer is changed.
- No new domain operation or GURPS calculation is added.
- No second registry, executor, session or bootstrap is created.
- The catalog contains only already integrated command types.

## Consequences

APP-ALPHA-COMPOSITION 1.0 can wire a tested catalog in a small PR. Duplicate command type detection is available before registry composition. The Alpha command surface is now inspectable without coupling it to mobile UI code.
