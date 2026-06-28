# Gate — APP-ALPHA-ERROR-SURFACE 1.0

## Status

Accepted

## Scope

Validate the minimal application error surface for Alpha command execution.

This gate covers command-executor result statuses, diagnostics and mutation safety. It does not add UI copy, localization, persistence behavior or a new diagnostics abstraction.

## Evidence

- `test/application/alpha/AlphaErrorSurface.test.js`

## Confirmations

- Invalid command envelopes return `rejected` with `application-command-invalid`.
- Stale revisions return `rejected` with `application-command-stale-revision` and revision details.
- Missing handlers return `rejected` with `application-command-handler-missing` and command type.
- Handler-side contract errors return `failed` with `application-command-execution-failed`.
- Rejected and failed commands keep the original session object.
- Rejected and failed commands preserve the serialized session snapshot.
- Rejected and failed commands do not emit receipts.

## Non-goals

- UI implementation or visual changes.
- New diagnostic UX or translation layer.
- Concrete persistence changes.
- Runtime schema duplication.
- Broad import work.
- GURPS rule calculation in application or UI.

## Evidence command

```bash
npm test
```

## Next lane

After this gate is integrated, continue with `APP-ALPHA-RELEASE-CHECKLIST 1.0` if there is no open PR from this macrofront and no overlap with the active mobile UI lane.
