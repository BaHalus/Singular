# GATE — ALPHA EDITING CONTRACTS

## Scope

This gate closes the application-contract layer required for safe structural editing in the Alpha mobile flow.

## Checks

- [x] The command surface is declared by the isolated Alpha command catalog.
- [x] The gate manifest maps every catalog command type to one documented family.
- [x] The gate rejects catalog/family drift.
- [x] Commands execute through the canonical `CommandExecutor`.
- [x] Command execution returns canonical `ApplicationSession` revisions, history entries and receipts.
- [x] JSON roundtrip preserves snapshots and stable IDs.
- [x] Invalid payloads are rejected without session mutation.
- [x] Portable fields are preserved for traits, skills, languages, familiarities, secondary fields and notes.
- [x] Application commands do not calculate mechanical derived values.
- [x] No mobile UI, HTML, CSS, concrete persistence or importer code is changed by this gate.

## UI-facing contract families

The authoritative family list is `ALPHA_EDITING_CONTRACT_FAMILIES` in `src/application/alpha/AlphaEditingContractsGate.js`.

The canonical command list remains `listAlphaCommandCatalogTypes()` from `src/application/alpha/AlphaCommandCatalog.js`.

## Explicit non-goals

- Creating UI controls.
- Reopening previously integrated contracts.
- Replacing `CommandRegistry`, `CommandExecutor` or `ApplicationSession`.
- Adding rules calculations to application handlers.
- Creating a full catalog, broad importer or visual library.
