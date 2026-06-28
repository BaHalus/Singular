# ADR-0077 — APP-ALPHA-CONTRACT-DOCS-SYNC 1.0

## Status

Accepted

## Context

The Alpha application command contracts now have hardening coverage for invalid payloads, undo/redo, JSON roundtrip, no-op/atomicity and corruption boundaries.

The mobile UI needs a short, stable contract map that lists the canonical command surface without redefining runtime authority or duplicating validation logic.

## Decision

Add `docs/application/alpha-command-surface.md` as a compact documentation index for the Alpha command surface.

The document records:

- command type;
- minimum payload shape;
- command authority;
- direct effect;
- explicit non-goals.

The runtime authority remains the canonical command catalog and each family handler. The document does not introduce a second registry, executor, session, schema, normalizer or calculator.

## Consequences

The UI mobile front can consume Alpha commands with a single human-readable command map while preserving the existing architecture:

- the motor/domain calculates and normalizes;
- the application validates command envelopes, delegates and records receipts;
- the UI presents state and submits commands;
- persistence stores snapshots but is not redefined here.

This ADR does not alter UI mobile files, concrete persistence, importers, runtime contracts or GURPS calculations.
