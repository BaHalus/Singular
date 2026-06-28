# Alpha Release Candidate Checklist — aplicação/domínio

## Status

Release-candidate checklist for the Alpha application/domain boundary.

## Purpose

This checklist defines the final application/domain checks to run before cutting an Alpha release candidate. It assumes the release-preparation gates are already integrated and does not authorize runtime, UI mobile, concrete persistence, importer or catalog expansion work.

## Required baseline

Before using this checklist, confirm that `main` contains:

- `GATE-ALPHA-APPLICATION-HARDENING`;
- `GATE-ALPHA-VALIDATION-READY`;
- `GATE-ALPHA-RELEASE-PREPARED`;
- `GATE-ALPHA-RELEASE-RISK-ASSESSED`;
- `docs/application/alpha-release-risk-register.md`.

## Candidate checks

| Check | Required result | Evidence |
| --- | --- | --- |
| Branch state | Candidate is cut from current `main`. | Commit SHA recorded in release notes or tag. |
| PR overlap | No open PR changes application/domain contracts for the candidate. | PR search result reviewed before cut. |
| Test command | `npm test` is green. | CI run or local command output attached to release record. |
| Command authority | Mobile-facing edits still dispatch canonical command/session contracts. | Handoff and mobile PR audit. |
| Snapshot authority | Persistence-facing data remains portable snapshots, not live objects. | Snapshot integrity docs/tests. |
| Error behavior | Invalid commands fail without mutating session state. | Error surface and invalid-payload evidence. |
| UI boundary | UI mobile still does not recalculate GURPS-derived values. | Mobile PR review or release smoke audit. |
| Risk acceptance | Remaining Medium risks are explicit Alpha caveats. | Risk register reviewed. |
| Release notes | Notes separate application/domain readiness from mobile UI caveats. | Release notes draft updated or confirmed. |
| Non-goals | Broad importers, official catalogs, visual libraries and cloud sync remain out of scope. | Release notes and gate confirmations. |

## Blocking conditions

Do not cut an Alpha release candidate if any of the following is true:

- `npm test` fails on the candidate commit;
- an open PR overlaps application/domain authority;
- a mobile PR redefines command execution, session state, registry behavior or snapshot authority;
- UI mobile calculates GURPS-derived values that belong to the motor/domain;
- concrete persistence stores live objects instead of canonical snapshots;
- release notes claim UI completeness that has not been integrated;
- unresolved review threads identify authority, mutation or corruption risks.

## Candidate record template

When a candidate is prepared, record:

```text
Alpha RC: <identifier>
Main SHA: <sha>
Date/time: <DD/MM/YYYY HH:mm America/Sao_Paulo>
Test evidence: <CI run or npm test output>
Open PR overlap: <none or list>
Medium risks accepted: <list or none>
Release notes checked: <yes/no>
Blockers: <none or list>
Decision: <cut / hold>
```

## Non-goals preserved

This checklist does not authorize:

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
