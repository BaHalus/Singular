# Gate — APP-ALPHA-READMODEL-CONSISTENCY 1.0

## Status

Accepted

## Scope

Validate consistency between authoritative Alpha application/domain snapshots and the current mobile-consumable read model.

This gate observes existing projection boundaries. It does not move projection files, create a new read-model layer, alter UI, alter persistence or move GURPS rule calculation into application/UI.

## Evidence

- `test/application/alpha/AlphaReadModelConsistency.test.js`

## Confirmations

- The mobile-consumable projection validates through `validateCharacterMobileProjection`.
- Projected identity matches the authoritative `Character` snapshot.
- Projected declared Traits, Skills, Techniques, Languages and Familiarities preserve ids and declared fields used by mobile reading.
- Projected attacks keep `application.attack-read-projection` authority.
- Projected equipment totals keep `engine.equipment` authority.
- Projected state follows the active `ApplicationSession` after canonical command execution.
- The composed mobile render model is frozen and separate from the live `Character` object.

## Non-goals

- UI implementation or visual changes.
- `mobile.html`, CSS or `src/ui/mobile/*` source edits.
- Concrete persistence changes.
- New read-model architecture.
- Broad importers.
- Official catalogs.
- Runtime schema duplication.
- GURPS rule calculation in application or UI.

## Evidence command

```bash
npm test
```

## Next lane

After this gate is integrated, continue with `APP-ALPHA-SAVE-SNAPSHOT-INTEGRITY 1.0` if there is no open PR from this macrofront and no overlap with the active mobile UI lane.
