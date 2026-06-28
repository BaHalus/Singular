# Gate — APP-ALPHA-SAVE-SNAPSHOT-INTEGRITY 1.0

## Status

Accepted

## Scope

Validate `ApplicationSession` and `Character` snapshot integrity at the application contract boundary.

This gate does not change concrete persistence adapters, UI files, importers or runtime schemas.

## Evidence

- `test/application/alpha/AlphaSaveSnapshotIntegrity.test.js`

## Confirmations

- Applied `ApplicationSession` values serialize to JSON-portable snapshots.
- JSON snapshots rehydrate through `createApplicationSession` without drift.
- Mutating a serialized snapshot after rehydration does not mutate the rehydrated session.
- Rehydrated session objects remain frozen.
- Rehydrated character objects remain frozen through nested values used by saves.
- Serialized `Character` snapshots rehydrate independently of later serialized-value mutation.

## Non-goals

- UI implementation or visual changes.
- Concrete storage adapter changes.
- New persistence abstraction.
- New schema or normalizer layer.
- Broad import work.
- GURPS rule calculation in application or UI.

## Evidence command

```bash
npm test
```

## Next lane

After this gate is integrated, continue with `APP-ALPHA-ERROR-SURFACE 1.0` if there is no open PR from this macrofront and no overlap with the active mobile UI lane.
