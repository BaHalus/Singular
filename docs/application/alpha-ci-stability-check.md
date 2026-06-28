# Alpha CI Stability Check — aplicação/domínio

## Status

Release preparation check for expected CI and local validation commands.

## Scope

This document records the CI expectations for the Alpha application/domain release lane. It does not change workflows, runtime code, UI, concrete persistence, importers or visual assets.

## Required baseline

Before treating the Alpha application/domain boundary as release-prepared, the following gates must already be integrated:

- `GATE-ALPHA-APPLICATION-HARDENING`
- `GATE-ALPHA-VALIDATION-READY`
- `APP-ALPHA-RELEASE-AUDIT-1.0`

## Required command

The canonical validation command for this repository remains:

```bash
npm test
```

The command is expected to cover:

- application/domain command matrices;
- invalid payload rejection;
- undo/redo behavior;
- JSON roundtrip stability;
- no-op and atomicity behavior;
- corruption-boundary behavior;
- Alpha command-surface documentation assumptions;
- smoke validation of catalog, registry, executor and session;
- read-model consistency for mobile consumption;
- snapshot serialization and rehydration;
- stable application error surface;
- mobile regression tests owned by the mobile front.

## CI expectation

For every release-preparation PR in this macrofront:

1. create a dedicated branch from current `main`;
2. keep exactly one release-front PR open at a time;
3. run the repository `Tests` workflow against the PR head;
4. require the full test job to complete successfully;
5. inspect reviews and review threads before merge;
6. merge only after the PR remains mergeable and no blocking review/thread is present;
7. revalidate `main` before opening the next release-front PR.

## Stability notes

- Documentation-only release-preparation PRs still require the same CI path as runtime PRs.
- CI results from a previous base commit are not reused as release evidence for a new PR head.
- Workflow changes are out of scope unless a minimal, objective CI defect is found and fixed with separate evidence.
- Flaky or truncated logs are not accepted as green evidence; the final workflow conclusion must be successful.

## Non-goals

- No new workflow design.
- No CI optimization.
- No release automation.
- No deployment pipeline.
- No change to UI, concrete persistence or importers.

## Release handoff

This check provides evidence for the next release-preparation steps:

- `APP-ALPHA-HANDOFF-MOBILE-1.0`
- `APP-ALPHA-RELEASE-NOTES-DRAFT-1.0`
- `GATE-ALPHA-RELEASE-PREPARED`
