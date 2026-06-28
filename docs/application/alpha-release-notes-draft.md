# Alpha Release Notes Draft — aplicação/domínio

## Status

Draft release notes for the Alpha application/domain boundary.

## Summary

This Alpha release-preparation lane validates and documents the application/domain contracts that support the mobile character sheet without moving GURPS rules into the UI and without replacing the canonical session, command or domain structures.

## Ready in application/domain

The Alpha application/domain boundary is prepared around:

- canonical command catalog and command registry;
- canonical command execution through `executeCommand`;
- canonical `ApplicationSession` state, revision, dirty flag, history and future;
- validated command families for identity, attributes, pools, traits, skills, techniques, languages, familiarities, secondary characteristics, notes, attacks, equipment, spells and powers;
- portable session and character snapshots;
- stable JSON roundtrips for representative Alpha data;
- safe invalid-payload rejection without session mutation;
- undo/redo behavior across representative Alpha families;
- no-op and atomicity behavior;
- corruption-boundary rejection where existing contracts apply;
- mobile-consumable read models and projections;
- documented application error surface.

## Release evidence

The following gates and release-preparation artifacts are part of the evidence chain:

- `GATE-ALPHA-APPLICATION-HARDENING`
- `GATE-ALPHA-VALIDATION-READY`
- `docs/application/alpha-release-checklist.md`
- `docs/application/alpha-release-audit.md`
- `docs/application/alpha-ci-stability-check.md`
- `docs/application/alpha-mobile-handoff.md`

## User-visible scope caveat

These notes describe application/domain readiness. They do not claim that every mobile UI interaction, visual state, layout, theme or release-polish item is complete.

The mobile front remains responsible for:

- presenting the validated read models;
- dispatching canonical commands;
- preserving Creation/Table mode behavior;
- rerendering from authoritative session/read-model state;
- avoiding UI-side GURPS recalculation.

## Not included in this Alpha preparation

This application/domain release preparation does not include:

- complete official catalogs;
- broad importers;
- visual libraries;
- UI polish, themes, cropper, perfect printing or cloud sync;
- complete combat implementation;
- broad drag-and-drop behavior;
- replacement command/session architecture;
- concrete persistence adapter changes.

## Validation command

```bash
npm test
```

## Next release-preparation step

Consolidate the release-preparation evidence in `GATE-ALPHA-RELEASE-PREPARED` after this draft is integrated and CI remains green.
