# Alpha Release Candidate Record — aplicação/domínio

## Status

Release-candidate record for the Alpha application/domain boundary.

## Candidate

```text
Alpha RC: alpha-app-domain-2026-06-29-bb41978
Main SHA: bb41978f1e5d03fac7ffe8f3d609c96bbb98be3e
Date/time: 29/06/2026 07:12 America/Sao_Paulo
Test evidence: mobile recovery PR #202 head 7ea78f0f9acb867380f6ed820a3018e070f22bfa had Tests success; mobile equipment regression PR #203 head 8e99e57f359c97c2788df6889fb7023241b28878 had Tests success before merge; mobile trait persistence render evidence PR #205 head 93d4e62f2d22e874dc066db4ceb9c67b18d7685d had Tests success before merge; this refreshed RC PR must still get Tests success on its new head before merge
Open PR overlap: no open PRs found before refreshing this record
Medium risks accepted: residual Alpha caveats from docs/application/alpha-release-risk-register.md
Release notes checked: yes, through docs/application/alpha-release-notes-verification.md
Blockers: candidate cut remains held until CI is green on the refreshed candidate path and no P1/P2 thread is actionable
Decision: refresh application/domain RC baseline after the mobile trait persistence evidence gate; final release cut still requires green CI on the candidate path
```

## Purpose

This record captures the current application/domain release-candidate baseline after the mobile lane integrated structured-note, trait, skill/technique, language/culture, attack and equipment editing, restored the Trait editor persistence/custom-role regression through the mobile hotfix path, added mobile Equipment editor regression coverage for canonical commands, manual persistence and table-mode structural blocking, and documented the mobile Trait editor persistence-shell evidence gate after `trait.update`.

It intentionally does not claim that the whole mobile UI is complete. The record only says that the application/domain boundary remains fit for Alpha release-candidate preparation if the documented CI and overlap checks stay true.

## Audited baseline

- `main`: `bb41978f1e5d03fac7ffe8f3d609c96bbb98be3e`.
- Recovery evidence: `HOTFIX UI-MOBILE-TRAIT-EDIT: preservar persistência e roles customizados` (#202) merged after its head `7ea78f0f9acb867380f6ed820a3018e070f22bfa` reached `Tests` success.
- Regression evidence: `UI-MOBILE-EQUIPMENT-EDIT REGRESSION: cobrir persistência manual` (#203) merged after its head `8e99e57f359c97c2788df6889fb7023241b28878` reached `Tests` success.
- Persistence-shell evidence: `Fix mobile trait edit persistence render` (#205) merged after its head `93d4e62f2d22e874dc066db4ceb9c67b18d7685d` reached `Tests` success; its merge commit added the gate note that records the already-integrated mobile Trait persistence-shell recovery evidence.
- Review-thread evidence: the P1/P2 threads reviewed in the mobile recovery path were resolved before the relevant record refreshes; no open PRs were found before this refresh.
- Latest mobile lane PRs reviewed for boundary impact:
  - `UI-MOBILE-STRUCTURED-NOTE-EDIT 1.0` (#195), scoped to `src/ui/mobile/*`.
  - `UI-MOBILE-TRAIT-INLINE-EDIT 1.0` (#196), scoped to `mobile.html` and `src/ui/mobile/*`.
  - `UI-MOBILE-SKILL-TECHNIQUE-EDIT 1.0` (#198), scoped to mobile UI files and mobile tests.
  - `UI-MOBILE-LANGUAGE-CULTURE-EDIT 1.0` (#199), scoped to mobile UI files and mobile tests.
  - `UI-MOBILE-ATTACK-EDIT 1.0` (#200), scoped to mobile UI files and mobile tests.
  - `UI-MOBILE-EQUIPMENT-EDIT 1.0` (#201), scoped to mobile UI files, `mobile.html` and mobile tests.
  - `HOTFIX UI-MOBILE-TRAIT-EDIT` (#202), scoped to mobile Trait editing and mobile tests; no shared application/domain authority was redefined by this RC record.
  - `UI-MOBILE-EQUIPMENT-EDIT REGRESSION` (#203), scoped to mobile Equipment editor regression tests; it strengthens coverage of canonical equipment commands and manual persistence without changing application/domain authority.
  - `Fix mobile trait edit persistence render` (#205), scoped in its merge commit to `docs/gates/UI-MOBILE-TRAIT-EDIT-PERSISTENCE-FIX.md`; it records the Trait persistence-shell evidence without changing application/domain authority.
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

The record is intentionally conservative: the application/domain boundary remains unchanged, but the release cut must stay on hold until `npm test` is green on the refreshed candidate path.

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
