# Alpha Release Risk Register — aplicação/domínio

## Status

Release-preparation risk register for the Alpha application/domain boundary.

## Purpose

This register makes the release-facing residual risks explicit after `GATE-ALPHA-RELEASE-PREPARED`, without changing runtime behavior, mobile UI, concrete persistence, importers or GURPS calculation authority.

It complements:

- `docs/application/alpha-release-audit.md`;
- `docs/application/alpha-release-checklist.md`;
- `docs/application/alpha-ci-stability-check.md`;
- `docs/application/alpha-mobile-handoff.md`;
- `docs/application/alpha-release-notes-draft.md`;
- `docs/gates/GATE-ALPHA-RELEASE-PREPARED.md`.

## Risk scale

- **Low** — documented caveat, covered by current contracts or tests, no release blocker.
- **Medium** — allowed Alpha caveat that should remain visible during release validation.
- **High** — release blocker until mitigated or explicitly accepted.

## Current residual risks

| ID | Area | Risk | Level | Current mitigation | Release decision |
| --- | --- | --- | --- | --- | --- |
| ALPHA-RISK-001 | Mobile consumption | Mobile UI may expose only part of the application/domain command surface at a given point in the Alpha rollout. | Medium | `alpha-mobile-handoff.md` separates consumable contracts from UI implementation scope. | Accept as Alpha UI caveat while application/domain contracts remain stable. |
| ALPHA-RISK-002 | Catalog breadth | Official or broad catalogs are not complete for the Alpha. | Low | Release notes and gates mark broad catalogs as non-goals. | Accept for Alpha. |
| ALPHA-RISK-003 | Import breadth | Broad importers are outside this release-preparation lane. | Low | Release notes, audit and gate preserve importer non-goal. | Accept for Alpha. |
| ALPHA-RISK-004 | Persistence adapter scope | Concrete persistence adapter changes are outside this lane. | Low | Snapshot expectations require portable data and avoid live object persistence. | Accept if persistence front consumes canonical snapshots only. |
| ALPHA-RISK-005 | UI-side calculations | A future mobile change could accidentally reintroduce local GURPS calculations. | Medium | Handoff and gates reiterate that the engine/domain owns calculations and UI only presents/collects input. | Guard during mobile PR review; block if observed. |
| ALPHA-RISK-006 | Error presentation | Application/domain rejects invalid commands, but UI presentation of errors may still vary. | Medium | Error surface is documented as application errors that must not mutate local UI state as if commands succeeded. | Accept as handoff caveat; validate during mobile smoke. |
| ALPHA-RISK-007 | Combat completeness | Complete combat implementation remains outside this Alpha preparation. | Low | Gate and release notes list complete combat as non-goal. | Accept for Alpha. |
| ALPHA-RISK-008 | Release evidence drift | New mobile PRs can advance after release-preparation documents are written. | Medium | This register treats application/domain readiness as stable and requires revalidation from `main` before release cut. | Revalidate before final release tag/cut. |

## Blocker policy

A risk becomes a release blocker if it creates any of the following:

- mutation outside canonical command/session execution;
- UI-side recalculation of GURPS-derived values;
- persistence of live objects instead of portable snapshots;
- replacement of `ApplicationSession`, command registry or execution contracts;
- failed `npm test` on the release candidate;
- unresolved PR review thread touching application/domain authority.

## Required pre-release checks

Before cutting or announcing an Alpha release candidate, confirm:

1. `main` is current and contains all intended application/domain gates.
2. No PR is open with overlapping application/domain contract changes.
3. `npm test` is green on the candidate commit.
4. Mobile changes merged after `GATE-ALPHA-RELEASE-PREPARED` do not redefine command/session authority.
5. Release notes still separate application/domain readiness from mobile UI caveats.
6. Any remaining Medium risk above is explicitly accepted as an Alpha caveat.

## Non-goals preserved

This register does not authorize:

- UI mobile implementation;
- `mobile.html` or CSS changes;
- concrete persistence adapter changes;
- broad importers;
- official catalog expansion;
- visual libraries;
- new command/session architecture;
- GURPS rules recalculation outside the motor/domain.

## Evidence command

```bash
npm test
```
