# ADR-0081 — APP-ALPHA-SAVE-SNAPSHOT-INTEGRITY 1.0

## Status

Accepted

## Context

Alpha save/load boundaries use serialized `ApplicationSession` and `Character` values. This validation lane checks those contracts without changing concrete storage adapters.

## Decision

Add application tests for snapshot integrity.

The tests confirm that:

- an applied `ApplicationSession` serializes to a JSON-portable value;
- the JSON value rehydrates through `createApplicationSession` without drift;
- serialized values do not share mutable references with rehydrated sessions;
- rehydrated sessions, characters, history and nested character values remain frozen;
- serialized `Character` values rehydrate independently of later mutations to the serialized value.

## Consequences

The Alpha persistence-facing contract becomes better covered while the storage implementation remains untouched.
