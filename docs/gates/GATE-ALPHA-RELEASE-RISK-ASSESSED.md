# Gate — ALPHA RELEASE RISK ASSESSED

## Status

Accepted.

## Scope

Consolidate the Alpha release risk register for the application/domain boundary after `GATE-ALPHA-RELEASE-PREPARED`.

## Integrated evidence

- `APP-ALPHA-RELEASE-RISK-REGISTER-1.0`
- `docs/application/alpha-release-risk-register.md`
- `docs/application/alpha-release-audit.md`
- `docs/application/alpha-release-checklist.md`
- `docs/application/alpha-ci-stability-check.md`
- `docs/application/alpha-mobile-handoff.md`
- `docs/application/alpha-release-notes-draft.md`
- `docs/gates/GATE-ALPHA-RELEASE-PREPARED.md`

## Confirmations

- Residual Alpha risks are explicit and release-facing.
- Accepted Alpha caveats are separated from release blockers.
- Medium risks remain visible for mobile/release validation instead of being treated as hidden runtime blockers.
- Blocker policy covers command/session authority, UI-side GURPS recalculation, live-object persistence, failed release tests and unresolved authority reviews.
- Pre-release checks require current `main`, no overlapping application/domain PRs, green `npm test`, preserved authority after mobile merges and explicit acceptance of remaining Medium risks.
- No runtime application/domain behavior is changed by this gate.
- No UI mobile implementation is introduced by this gate.
- No concrete persistence adapter, broad importer or visual runtime is changed.
- No GURPS rules are recalculated in application or UI code by this gate.

## Release-risk baseline

The Alpha application/domain boundary now has:

- documented readiness evidence;
- documented mobile handoff expectations;
- documented CI expectations;
- documented release notes caveats;
- documented residual risks and blocker criteria.

## Remaining allowed next work

After this gate, the next safe work should address release-candidate packaging, final readiness checklists or blocker findings from mobile/release validation. It should not cross into UI implementation unless explicitly assigned to the mobile front.

## Non-goals

- UI polish.
- Broad importers.
- Official catalogs.
- Cloud sync.
- Visual libraries.
- Complete combat implementation.
- New command/session architecture.
- New persistence implementation.

## Evidence command

```bash
npm test
```
