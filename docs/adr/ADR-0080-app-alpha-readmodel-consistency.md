# ADR-0080 — APP-ALPHA-READMODEL-CONSISTENCY 1.0

## Status

Accepted

## Context

The Alpha mobile UI consumes read models projected from authoritative `Character` and `ApplicationSession` state. After the smoke matrix, the next validation step is to ensure the existing consumable projection remains aligned with canonical snapshots without moving calculation responsibility into UI code.

The current projection used by mobile rendering lives under `src/ui/mobile`, while some authority-specific projections already come from application/domain/engine modules. This ADR validates that boundary without relocating files or redefining the projection layer.

## Decision

Add an application-level consistency test for the current mobile-consumable read model.

The test confirms that:

- the projection validates through its own validator;
- identity, declared traits, skills, techniques, languages, familiarities, attacks and equipment match the authoritative `Character` snapshot;
- attack read authority remains delegated to the application attack read projection;
- equipment totals remain delegated to the existing engine equipment authority;
- command execution updates the authoritative `ApplicationSession`, and the next projection follows that session state;
- the composed render model is a frozen read model and not a live `Character` object.

## Consequences

The Alpha validation lane gains coverage for the boundary between canonical session state and data consumed by the mobile UI.

This does not alter UI, persistence adapters, importers or GURPS calculation placement. Existing authority strings are asserted rather than redefined.
