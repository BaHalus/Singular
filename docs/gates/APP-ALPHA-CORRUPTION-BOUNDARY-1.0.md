# Gate — APP-ALPHA-CORRUPTION-BOUNDARY 1.0

## Status
Proposed

## Scope

Validate the application boundary for corrupted `ApplicationSession` snapshots where canonical session contracts already provide authority.

## Required checks

- Corrupted history fingerprints are rejected.
- Current character snapshots disconnected from the latest history entry are rejected.
- Entries duplicated between `history` and `future` are rejected.
- A valid snapshot remains rehydratable after failed corrupted rehydration attempts.
- Tests use canonical Alpha command catalog, registry, executor and session contracts.

## Non-goals

- UI mobile behavior.
- Concrete persistence changes.
- Importer changes.
- New corruption inspection product surface.
- New snapshot normalizer.
- GURPS rule calculation.

## Evidence

Expected command:

```bash
npm test
```
