import test from "node:test";
import assert from "node:assert/strict";

import {
  createAlphaCommandCatalogEntries,
} from "../../../src/application/alpha/AlphaCommandCatalog.js";
import {
  createCommandRegistry,
} from "../../../src/application/commands/CommandRegistry.js";
import {
  executeCommand,
} from "../../../src/application/commands/CommandExecutor.js";
import {
  createApplicationSession,
  serializeApplicationSession,
} from "../../../src/application/session/ApplicationSession.js";
import {
  createCharacter,
} from "../../../src/domain/character/Character.js";

const ISSUED_AT = "2026-06-28T22:00:00.000Z";
const PROCESSED_AT = "2026-06-28T22:00:01.000Z";

function createRuntime() {
  let next = 1;
  return {
    clock: { now: () => PROCESSED_AT },
    idGenerator: { next: prefix => `${prefix}_${next++}` },
  };
}

function createSession() {
  return createApplicationSession({
    id: "session-alpha-error-surface",
    character: createCharacter({
      identity: {
        id: "character-alpha-error-surface",
        name: "Alpha Error Surface",
      },
      skills: [{
        id: "skill-alpha-error-surface",
        name: "Error Surface Skill",
        attribute: "IQ",
        difficulty: "hard",
        points: 2,
      }],
    }),
  });
}

function command(input = {}) {
  return {
    id: input.id ?? "command-alpha-error-surface",
    type: input.type ?? "skill.update",
    expectedRevision: input.expectedRevision ?? 0,
    issuedAt: input.issuedAt ?? ISSUED_AT,
    payload: input.payload ?? {
      skillId: "skill-alpha-error-surface",
      patch: { points: 4 },
    },
  };
}

function assertSafeFailure(result, before, expectedStatus, expectedCode) {
  assert.equal(result.status, expectedStatus);
  assert.strictEqual(result.session, before.sessionObject);
  assert.equal(result.receipt, null);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].code, expectedCode);
  assert.equal(result.diagnostics[0].severity, "blocked");
  assert.deepEqual(serializeApplicationSession(result.session), before.snapshot);
}

test("Alpha rejects malformed command envelopes without mutating the session", () => {
  const session = createSession();
  const before = {
    sessionObject: session,
    snapshot: serializeApplicationSession(session),
  };

  const result = executeCommand(
    session,
    null,
    createCommandRegistry(createAlphaCommandCatalogEntries()),
    createRuntime(),
  );

  assertSafeFailure(result, before, "rejected", "application-command-invalid");
});

test("Alpha rejects stale revisions with a stable diagnostic payload", () => {
  const session = createSession();
  const before = {
    sessionObject: session,
    snapshot: serializeApplicationSession(session),
  };

  const result = executeCommand(
    session,
    command({ expectedRevision: 99 }),
    createCommandRegistry(createAlphaCommandCatalogEntries()),
    createRuntime(),
  );

  assertSafeFailure(result, before, "rejected", "application-command-stale-revision");
  assert.equal(result.diagnostics[0].expectedRevision, 99);
  assert.equal(result.diagnostics[0].actualRevision, 0);
});

test("Alpha rejects missing handlers without mutating the session", () => {
  const session = createSession();
  const before = {
    sessionObject: session,
    snapshot: serializeApplicationSession(session),
  };

  const result = executeCommand(
    session,
    command({ type: "alpha.unknown.command", payload: {} }),
    createCommandRegistry(createAlphaCommandCatalogEntries()),
    createRuntime(),
  );

  assertSafeFailure(result, before, "rejected", "application-command-handler-missing");
  assert.equal(result.diagnostics[0].commandType, "alpha.unknown.command");
});

test("Alpha handler errors report safely without partial mutation", () => {
  const session = createSession();
  const before = {
    sessionObject: session,
    snapshot: serializeApplicationSession(session),
  };

  const result = executeCommand(
    session,
    command({
      payload: {
        skillId: "skill-alpha-error-surface",
        patch: { unsupportedField: "outside contract" },
      },
    }),
    createCommandRegistry(createAlphaCommandCatalogEntries()),
    createRuntime(),
  );

  assertSafeFailure(result, before, "failed", "application-command-execution-failed");
});
