# Gate — ALPHA APPLICATION HARDENING

## Status

Accepted

## Scope

Consolidate the Alpha application hardening sequence for command contracts already integrated into `main`.

This gate covers application-level contracts consumed by mobile UI work. It does not authorize UI implementation, concrete persistence changes, importers, official catalogs, visual libraries or GURPS rule calculation outside the domain/motor.

## Evidence chain

| Stage | Evidence |
| --- | --- |
| APP-ALPHA-INVALID-PAYLOAD-MATRIX 1.0 | Invalid payload matrix for Alpha command catalog commands. |
| APP-ALPHA-UNDO-REDO-MATRIX 1.0 | Undo/redo matrix for command families and session history/future snapshots. |
| APP-ALPHA-ROUNDTRIP-MATRIX 1.0 | JSON roundtrip matrix for representative Alpha command families. |
| APP-ALPHA-NOOP-ATOMICITY 1.0 | No-op and failed-command atomicity checks. |
| APP-ALPHA-CORRUPTION-BOUNDARY 1.0 | Rehydration rejection checks for corrupted `ApplicationSession` snapshots. |
| APP-ALPHA-CONTRACT-DOCS-SYNC 1.0 | Human-readable command surface documentation. |

## Required confirmations

- `AlphaCommandCatalog` is the canonical application command catalog.
- Command routing uses the canonical command registry and executor.
- Session mutation is represented through `ApplicationSession` snapshots and history/future entries.
- Invalid payloads are rejected without mutating the session.
- Undo/redo restores character snapshot, revision, history, future, dirty state and receipts.
- JSON roundtrip preserves stable ids, portable metadata and declared/imported fields in representative families.
- No-op command results do not add history entries.
- Failed commands do not partially remove or corrupt preexisting character data.
- Corrupted snapshots are rejected where canonical `ApplicationSession` contracts define that boundary.
- Application/UI do not calculate GURPS rules reserved to the domain/motor.
- UI mobile files remain consumers of these contracts and are outside this gate.

## Non-goals

- UI mobile implementation or visual polish.
- `mobile.html` or CSS changes.
- Concrete persistence changes.
- Broad importers.
- Official catalog data.
- Runtime schema duplication.
- Secondary command registry/executor/session layers.
- New snapshot normalization layer.
- GURPS rule calculation in application or UI.

## Files intentionally not touched

- `src/ui/mobile/*`
- `mobile.html`
- mobile CSS
- concrete persistence adapters
- importers

## Evidence command

Expected command:

```bash
npm test
```

## Next lane

After this gate is integrated, create the next macrofront only after auditing current `main`, open PRs, CI, gates and real gaps. Do not open the first PR of the next macrofront in the same execution that integrates this gate.
