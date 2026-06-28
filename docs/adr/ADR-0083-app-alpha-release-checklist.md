# ADR-0083 — APP-ALPHA-RELEASE-CHECKLIST 1.0

## Status

Accepted

## Context

After smoke, read-model consistency, snapshot integrity and error-surface validation, the Alpha needs a short pre-release checklist for the application/domain boundary.

## Decision

Add `docs/application/alpha-release-checklist.md` as the checklist for application/domain readiness.

The checklist records:

- canonical application contracts;
- accepted gates;
- expected Alpha command families;
- test evidence;
- pre-Alpha non-goals;
- remaining handoff notes for the mobile lane.

## Consequences

Release preparation has a compact document for current validation status without adding runtime behavior.
