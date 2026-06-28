# ADR-0068 — GATE ALPHA EDITING CONTRACTS

## Status

Accepted for Alpha editing contracts.

## Context

The Alpha application layer now has structural editing contracts for the sections that were previously read-only in the mobile Alpha flow: Traits, Skills, Techniques, Languages, Familiarities, Secondary structural fields and Notes.

The Alpha command catalog is integrated and consumed by the mobile bootstrap through the canonical `CommandRegistry`, `CommandExecutor` and `ApplicationSession` composition path.

The final gate needs to consolidate the command surface without reopening finished contracts, duplicating UI work or moving GURPS calculations into application code.

## Decision

Create a gate manifest under `src/application/alpha/AlphaEditingContractsGate.js` that groups every Alpha command type by contract family and records the authority and boundary for each family.

The gate manifest must be validated against the isolated Alpha command catalog so the documented families and the registered catalog remain in lockstep.

Add tests that confirm:

- every catalog command type appears in exactly one gate family;
- every family command type is present in the catalog;
- Alpha commands execute through the canonical `CommandExecutor` and `ApplicationSession`;
- JSON roundtrip preserves portable snapshots and stable IDs;
- invalid payloads are rejected without mutating the session;
- application commands do not add calculated Skill level, relative level or Trait calculated cost fields.

## Boundaries

- No UI mobile, HTML, CSS, concrete persistence or importer is changed.
- No second registry, executor, session or bootstrap is created.
- No new domain calculation is introduced.
- No full library, catalog, GCS/GCA importer, cloud flow or visual editor is introduced.

## Consequences

The UI can now rely on a documented Alpha editing command surface while still routing through the canonical application path.

Further Alpha work should focus on wiring existing commands into UI affordances, hardening mobile flows and validating save/restore behavior, without redefining the application contracts closed by this gate.
