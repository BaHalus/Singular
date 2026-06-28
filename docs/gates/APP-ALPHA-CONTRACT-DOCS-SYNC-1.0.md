# Gate — APP-ALPHA-CONTRACT-DOCS-SYNC 1.0

## Status

Proposed

## Scope

Synchronize a short documentation surface for Alpha application commands after the application hardening matrices.

## Required checks

- The documentation lists every command family exposed by `AlphaCommandCatalog`.
- Each command entry names the command type and minimum payload shape.
- Each family points to the canonical handler/domain authority instead of creating a parallel contract.
- Non-goals explicitly exclude UI implementation, concrete persistence, importers, runtime schema duplication and GURPS calculation in application/UI.
- The change is documentation-only.

## Evidence

Expected command:

```bash
npm test
```

## Files

- `docs/application/alpha-command-surface.md`
- `docs/adr/ADR-0077-app-alpha-contract-docs-sync.md`
- `docs/gates/APP-ALPHA-CONTRACT-DOCS-SYNC-1.0.md`
