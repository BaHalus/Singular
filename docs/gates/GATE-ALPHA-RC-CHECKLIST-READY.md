# Gate — ALPHA RC CHECKLIST READY

## Status

Accepted.

## Scope

Consolidate the Alpha release-candidate checklist for the application/domain boundary after release risk assessment.

## Integrated evidence

- `APP-ALPHA-RC-CHECKLIST-1.0`
- `docs/application/alpha-release-candidate-checklist.md`
- `docs/application/alpha-release-risk-register.md`
- `docs/gates/GATE-ALPHA-RELEASE-RISK-ASSESSED.md`
- `docs/gates/GATE-ALPHA-RELEASE-PREPARED.md`

## Confirmations

- Release-candidate baseline requirements are explicit.
- Candidate checks cover current `main`, PR overlap, `npm test`, command authority, snapshot authority, error behavior, UI boundary, risk acceptance, release notes and non-goals.
- Blocking conditions are explicit for failed tests, overlapping PRs, command/session replacement, UI-side GURPS calculations, live-object persistence, overstated release notes and unresolved authority reviews.
- A candidate record template is available for the eventual Alpha RC cut.
- No runtime application/domain behavior is changed by this gate.
- No UI mobile implementation is introduced by this gate.
- No concrete persistence adapter, broad importer or visual runtime is changed.
- No GURPS rules are recalculated in application or UI code by this gate.

## RC-readiness baseline

The Alpha application/domain boundary now has:

- documented release preparation;
- documented residual risks;
- documented blocker policy;
- documented release-candidate checklist;
- documented candidate record template.

## Remaining allowed next work

After this gate, safe follow-up work should be limited to final release notes verification, candidate record creation, or blocker findings discovered during release/mobile validation.

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
