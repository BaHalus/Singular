# ADR — APP-NOTES 1.0

## Status

Accepted for Alpha application contracts.

## Context

The Alpha mobile read model needs a portable notes contract before UI editing can be connected safely. No canonical `Character.notes` contract existed in `main` at the start of this stage, so the application had no authority for storing general or ordered structured notes.

## Decision

Introduce a minimal `notes` aggregate on `Character`:

- `notes.general`: plain string for general notes;
- `notes.structured`: ordered array of plain structured notes;
- structured note fields: `id`, `title`, `text`, `category`, `reference`, `tags`, `metadata`.

Expose isolated application command handlers for:

- `notes.general.set`;
- `note.add`;
- `note.update`;
- `note.remove`;
- `note.reorder`.

The contract preserves text and order only. It intentionally does not introduce rich text, attachments, external libraries, UI affordances, or GURPS calculations.

## Boundaries

- The domain owns validation and serialization of the portable notes shape.
- The application command handlers translate command intent into domain operations and rehydrate a `Character` snapshot.
- The UI remains untouched in this stage.
- The command catalog and composition root remain untouched until later queue stages.

## Consequences

- Existing characters receive an empty default notes contract during `createCharacter`/snapshot rehydration.
- Invalid non-portable metadata fails before mutation is committed by the `CommandExecutor`.
- Notes can now be wired into Alpha editing later without inventing a parallel persistence shape.
