# GATE — APP-ALPHA-INVALID-PAYLOAD-MATRIX 1.0

## Scope

This gate hardens the Alpha command catalog against malformed command envelopes before UI wiring consumes the structural editing surface.

## Checks

- [x] Every command type in `AlphaCommandCatalog` is exercised by the invalid payload matrix.
- [x] `payload: null` is rejected and no longer treated as omitted payload.
- [x] Primitive payloads are rejected.
- [x] Array payloads are rejected.
- [x] Empty command ids are rejected.
- [x] Incompatible revisions are rejected before handler resolution.
- [x] Rejected commands return the original `ApplicationSession` instance.
- [x] Rejected commands do not create receipts, history entries, future entries or dirty state.
- [x] Omitted payload remains backwards-compatible as an empty object envelope and is left to handler-specific validation.
- [x] No mobile UI, concrete persistence, bootstrap or importer code is changed.

## Explicit non-goals

- Implementing UI controls.
- Creating handler-specific payload schemas for every command family.
- Reopening command contracts closed by the Alpha editing gate.
- Adding GURPS calculations to the application layer.
