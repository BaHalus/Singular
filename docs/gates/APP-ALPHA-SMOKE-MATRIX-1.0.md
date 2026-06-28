# Gate — APP-ALPHA-SMOKE-MATRIX 1.0

## Status

Accepted

## Scope

Validate a compact application smoke path after Alpha application hardening.

This gate covers canonical catalog, registry, executor and `ApplicationSession` behavior. It does not authorize UI implementation, concrete persistence changes, importers, visual libraries or GURPS rule calculation outside the domain/motor.

## Evidence

- `test/application/alpha/AlphaSmokeMatrix.test.js`

## Confirmations

- `AlphaCommandCatalog` remains the source for Alpha command entries.
- `CommandRegistry` is created from catalog entries without a secondary registry.
- Registry command types match `listAlphaCommandCatalogTypes()` exactly.
- A representative command sequence applies through `executeCommand` only.
- Each applied command advances revision exactly once.
- Each applied command appends exactly one history entry.
- Future remains empty during forward-only smoke execution.
- Dirty state and last receipt are updated by `ApplicationSession` transitions.
- The final serialized session rehydrates through `createApplicationSession` without snapshot drift.

## Non-goals

- UI mobile implementation or visual polish.
- `mobile.html`, CSS or `src/ui/mobile/*` changes.
- Concrete persistence adapter changes.
- Broad importer work.
- Official catalog data.
- Runtime schema duplication.
- New command/session normalization layer.
- GURPS rule calculation in application or UI.

## Evidence command

```bash
npm test
```

## Next lane

After this gate is integrated, continue with `APP-ALPHA-READMODEL-CONSISTENCY 1.0` if there is no open PR from this macrofront and no overlap with the active mobile UI lane.
