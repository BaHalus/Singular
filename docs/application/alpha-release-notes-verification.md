# Alpha Release Notes Verification — aplicação/domínio

## Status

Release-notes verification for the Alpha application/domain boundary.

## Purpose

This document verifies that the Alpha release notes remain aligned with the current application/domain release-preparation chain and do not overstate UI, catalog, importer, persistence or combat completeness.

## Verified sources

- `docs/application/alpha-release-notes-draft.md`
- `docs/application/alpha-release-audit.md`
- `docs/application/alpha-release-checklist.md`
- `docs/application/alpha-release-risk-register.md`
- `docs/application/alpha-release-candidate-checklist.md`
- `docs/gates/GATE-ALPHA-RELEASE-PREPARED.md`
- `docs/gates/GATE-ALPHA-RELEASE-RISK-ASSESSED.md`
- `docs/gates/GATE-ALPHA-RC-CHECKLIST-READY.md`

## Confirmed release-note boundaries

The Alpha release notes may safely claim application/domain readiness for:

- canonical command catalog and registry evidence;
- command execution through the canonical session boundary;
- `ApplicationSession` state, revision, dirty flag, history and future behavior;
- portable character/session snapshots;
- representative JSON roundtrips;
- invalid payload rejection without session mutation;
- no-op and atomicity behavior;
- corruption-boundary rejection where contracts apply;
- mobile-consumable read models and projections;
- documented error surface;
- documented CI expectation through `npm test`;
- documented residual risks and blocker policy;
- documented release-candidate checklist.

## Claims that must remain caveated

The notes must not imply completion of:

- every mobile UI interaction;
- visual polish, themes, cropper, perfect printing or cloud sync;
- broad importers;
- official or broad catalogs;
- complete combat implementation;
- concrete persistence adapter changes;
- visual libraries;
- broad drag-and-drop behavior.

## Required wording discipline

Use wording such as:

- application/domain boundary is prepared;
- command/session contracts are documented and gate-backed;
- mobile front can consume canonical commands and read models;
- remaining UI work belongs to the mobile front;
- residual Alpha risks are explicit and accepted or blocked according to the risk register.

Avoid wording such as:

- Alpha UI is complete;
- all character interactions are complete;
- complete official catalog is available;
- import is complete;
- persistence is fully finalized by this lane;
- combat is complete;
- UI calculates derived GURPS values.

## Verification result

The current release-note chain is fit for Alpha release preparation if the candidate still satisfies:

1. current `main` baseline;
2. no overlapping application/domain PRs;
3. green `npm test` evidence;
4. no unresolved authority review threads;
5. explicit acceptance or blocking of residual Medium risks.

## Non-goals preserved

This verification does not authorize:

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
