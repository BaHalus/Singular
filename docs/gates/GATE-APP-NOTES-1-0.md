# GATE — APP-NOTES 1.0

## Scope

APP-NOTES 1.0 prepares the application/domain contracts required for Alpha-safe notes editing.

## Checks

- [x] `Character` has a portable `notes` snapshot with defaults.
- [x] General notes preserve plain text.
- [x] Structured notes preserve IDs, text, metadata and order.
- [x] Commands exist for add, update, remove and reorder of structured notes.
- [x] Command handlers return `applied` or `no-op` receipts through the canonical handler shape.
- [x] Invalid payloads are rejected through `CommandExecutor` failure without mutating the session.
- [x] Metadata must remain JSON-portable and finite-number safe.
- [x] No UI, bootstrap, persistence concrete layer, import library or CommandRegistry file was changed.
- [x] No GURPS rule calculation was added to the application layer.

## Contract exported by this stage

- `notes.general.set`
- `note.add`
- `note.update`
- `note.remove`
- `note.reorder`

## Explicit non-goals

- Rich text editor.
- Attachments.
- Visual notes library.
- Mobile UI wiring.
- Catalog/composition registration.
