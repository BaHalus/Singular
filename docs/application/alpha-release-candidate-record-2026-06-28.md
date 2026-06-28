# Alpha Release Candidate Record — aplicação/domínio

## Status

Release-candidate record for the Alpha application/domain boundary.

## Candidate

```text
Alpha RC: alpha-app-domain-2026-06-28-f5b2919
Main SHA: f5b2919b23648a9804621e178ceddbc9009cd830
Date/time: 28/06/2026 20:00 America/Sao_Paulo
Test evidence: pending CI on this rebased documentation PR; expected command remains npm test
Open PR overlap: no application/domain overlap found before rebasing this record
Medium risks accepted: residual Alpha caveats from docs/application/alpha-release-risk-register.md
Release notes checked: yes, through docs/application/alpha-release-notes-verification.md
Blockers: candidate cut is held while current CI remains red on the mobile lane baseline
Decision: record application/domain RC baseline; final release cut still requires green CI on the candidate path
```

## Purpose

This record captures the current application/domain release-candidate baseline after the mobile lane integrated structured-note, trait, skill/technique, language/culture and attack editing without changing shared application/domain contracts.

It intentionally does not claim that the whole mobile UI is complete. The record only says that the application/domain boundary remains fit for Alpha release-candidate preparation if the documented CI and overlap checks stay true.

## Audited baseline

- `main`: `f5b2919b23648a9804621e178ceddbc9009cd830`.
- Open PRs before this rebase: `APP-ALPHA-RC-RECORD 1.0`, documentation-only and replaced by this rebased head.
- Latest mobile lane PRs reviewed for boundary impact:
  - `UI-MOBILE-STRUCTURED-NOTE-EDIT 1.0` (#195), scoped to `src/ui/mobile/*`.
  - `UI-MOBILE-TRAIT-INLINE-EDIT 1.0` (#196), scoped to `mobile.html` and `src/ui/mobile/*`.
  - `UI-MOBILE-SKILL-TECHNIQUE-EDIT 1.0` (#198), scoped to mobile UI files and mobile tests.
  - `UI-MOBILE-LANGUAGE-CULTURE-EDIT 1.0` (#199), scoped to mobile UI files and mobile tests.
  - `UI-MOBILE-ATTACK-EDIT 1.0` (#200), scoped to mobile UI files and mobile tests.
- Structural release chain already integrated:
  - `APP-ALPHA-RELEASE-RISK-REGISTER 1.0`;
  - `GATE ALPHA RELEASE RISK ASSESSED`;
  - `APP-ALPHA-RC-CHECKLIST 1.0`;
  - `GATE ALPHA RC CHECKLIST READY`;
  - `APP-ALPHA-RELEASE-NOTES-VERIFY 1.0`.

## Boundary confirmation

The candidate remains inside the approved application/domain release boundary:

- mobile-facing edits continue to consume canonical commands and session authority;
- application/domain readiness is separated from mobile UI completeness;
- `ApplicationSession` remains the session authority;
- `CommandExecutor` remains the command execution authority;
- snapshots remain the persistence-facing artifact;
- UI mobile remains responsible for presentation and input collection only;
- no broad importer, official catalog, visual library or concrete persistence expansion is authorized by this record.

## Required pre-cut checks

Before an actual Alpha release cut, repeat these checks on the final candidate SHA:

1. `npm test` is green.
2. No open PR overlaps `src/application/alpha/*`, shared application contracts, snapshot authority or command registry behavior.
3. No open review thread identifies authority, mutation, corruption, no-op or atomicity risk.
4. Release notes still use caveated application/domain wording.
5. Mobile PRs integrated after this record do not recalculate derived GURPS rules in the UI.

## Hold conditions

Hold the cut if any of the following is found:

- failing CI on the candidate SHA;
- open overlapping application/domain PR;
- mobile lane redefines command/session/snapshot authority;
- UI-calculated derived GURPS values;
- release notes implying complete UI, complete combat, broad importers, official catalog or cloud sync;
- unresolved review threads about mutation, authority, corruption or unsafe persistence.

## Current hold note

The record is intentionally conservative: the application/domain boundary remains unchanged, but the release cut must stay on hold until `npm test` is green again on the candidate path. The observed red CI is inherited from the mobile lane baseline after mobile-only PRs, outside this record's allowed file boundary.

## Non-goals preserved

This record does not authorize:

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
