# Alpha Mobile Handoff — aplicação/domínio

## Status

Release-preparation handoff for the SINGULAR MVP Julho mobile front.

## Purpose

This document summarizes the application/domain contracts that the mobile UI can consume without redefining authority, duplicating command contracts or recalculating GURPS rules outside the motor/domain.

## Canonical authorities

Mobile code should treat the following application/domain components as authoritative:

- `AlphaCommandCatalog` for the command surface.
- `CommandRegistry` for registered command handlers.
- `executeCommand` for command execution.
- `ApplicationSession` for session state, revision, history, future and dirty state.
- Domain factories and serializers for canonical Character structures.
- Application read models and projections for mobile-consumable views.

## Consumable command families

The Alpha command surface is available for:

- identity and character summary;
- attributes and transient pools;
- traits;
- skills;
- techniques;
- languages;
- cultural familiarities;
- secondary characteristics;
- notes;
- attacks;
- equipment;
- spells;
- powers.

## Snapshot expectations

Mobile integration should assume that snapshots are portable data, not live objects.

Expected properties:

- stable IDs are preserved across serialize/rehydrate roundtrips;
- import metadata remains portable where supported;
- raw imported payloads remain preserved where supported;
- history and future stacks are snapshot-based;
- rejected commands do not mutate the current session;
- no-op commands do not pollute history;
- dirty/revision state comes from `ApplicationSession` behavior, not UI recomputation.

## Authority strings and declared data

When the UI displays authored or imported values, it should preserve application/domain authority strings instead of inventing local meanings.

Known authority-sensitive areas include:

- attacks and declared damage data;
- equipment totals and item state;
- spells and declared/imported spell fields;
- powers and declared/imported power fields;
- read-model projections that mirror authoritative session snapshots.

The mobile front may present these fields, but must not reinterpret them as a parallel rules engine.

## Error surface

The Alpha application/domain boundary validates common failure paths:

- invalid payload shape;
- missing or empty IDs;
- incompatible field types;
- duplicate IDs where rejected by the domain;
- unknown or unsupported command payloads;
- corruption-boundary rejection where existing contracts apply.

Mobile code should surface these failures as application errors and avoid mutating local UI state as if the command had succeeded.

## Mode handoff

Mode behavior remains a UI responsibility, but structural changes should continue to flow through canonical commands.

Expected mobile behavior:

- Creation mode may dispatch structural edit commands.
- Table mode may preserve transient operational edits where already supported.
- The UI should rerender from the authoritative session/read model after commands.
- Manual persistence should save canonical snapshots, not UI-owned objects.

## Non-goals for mobile handoff

This handoff does not authorize:

- new command/session architecture;
- UI-side GURPS calculations;
- broad importers;
- complete official catalogs;
- visual libraries;
- cropper, themes, perfect printing or cloud sync;
- broad drag-and-drop implementation;
- concrete persistence adapter changes.

## Release-preparation checks

Before mobile work depends on this handoff, keep these release checks green:

```bash
npm test
```

The relevant release-preparation documents are:

- `docs/application/alpha-release-checklist.md`
- `docs/application/alpha-release-audit.md`
- `docs/application/alpha-ci-stability-check.md`
