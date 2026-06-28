import test from "node:test";
import assert from "node:assert/strict";

import {
  createAlphaCommandCatalogEntries,
  listAlphaCommandCatalogTypes,
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

const ISSUED_AT = "2026-06-28T07:00:00.000Z";
const PROCESSED_AT = "2026-06-28T07:00:01.000Z";

const INVALID_PAYLOAD_SHAPES = Object.freeze([
  Object.freeze({ label: "null", value: null }),
  Object.freeze({ label: "string", value: "not-a-payload" }),
  Object.freeze({ label: "number", value: 42 }),
  Object.freeze({ label: "boolean", value: true }),
  Object.freeze({ label: "array", value: [] }),
]);

function createRuntime() {
  let next = 1;
  return {
    clock: {
      now() {
        return PROCESSED_AT;
      },
    },
    idGenerator: {
      next(prefix) {
        return `${prefix}_${next++}`;
      },
    },
  };
}

function createSession() {
  return createApplicationSession({
    id: "session-alpha-invalid-payload-matrix",
    character: createCharacter({
      identity: {
        id: "character-alpha-invalid-payload-matrix",
        name: "Alpha Invalid Payload Matrix",
      },
    }),
  });
}

function createCommand({ type, payload, id = "command-alpha-invalid-payload", expectedRevision = 0 }) {
  return {
    id,
    type,
    expectedRevision,
    issuedAt: ISSUED_AT,
    payload,
  };
}

function assertRejectedWithoutMutation(result, session, beforeSnapshot, context) {
  assert.equal(result.status, "rejected", context);
  assert.equal(result.session, session, context);
  assert.equal(result.receipt, null, context);
  assert.deepEqual(serializeApplicationSession(result.session), beforeSnapshot, context);
  assert.equal(result.session.revision, 0, context);
  assert.equal(result.session.history.length, 0, context);
  assert.equal(result.session.future.length, 0, context);
  assert.equal(result.session.dirty, false, context);
  assert.equal(result.diagnostics.length, 1, context);
  assert.equal(result.diagnostics[0].code, "application-command-invalid", context);
}

test("rejects null, primitive and array payloads for every Alpha catalog command without mutating session", () => {
  const registry = createCommandRegistry(createAlphaCommandCatalogEntries());
  const commandTypes = listAlphaCommandCatalogTypes();

  assert.ok(commandTypes.length > 0);

  for (const type of commandTypes) {
    for (const invalidPayload of INVALID_PAYLOAD_SHAPES) {
      const runtime = createRuntime();
      const session = createSession();
      const beforeSnapshot = serializeApplicationSession(session);
      const result = executeCommand(
        session,
        createCommand({
          type,
          payload: invalidPayload.value,
          id: `command-invalid-${type.replaceAll(".", "-")}-${invalidPayload.label}`,
        }),
        registry,
        runtime,
      );

      assertRejectedWithoutMutation(
        result,
        session,
        beforeSnapshot,
        `${type} should reject ${invalidPayload.label} payload`,
      );
    }
  }
});

test("rejects empty command ids for every Alpha catalog command without mutating session", () => {
  const registry = createCommandRegistry(createAlphaCommandCatalogEntries());
  const commandTypes = listAlphaCommandCatalogTypes();

  for (const type of commandTypes) {
    const runtime = createRuntime();
    const session = createSession();
    const beforeSnapshot = serializeApplicationSession(session);
    const result = executeCommand(
      session,
      createCommand({
        type,
        payload: {},
        id: "",
      }),
      registry,
      runtime,
    );

    assertRejectedWithoutMutation(
      result,
      session,
      beforeSnapshot,
      `${type} should reject empty command id`,
    );
  }
});

test("rejects empty command types and incompatible revisions before handler resolution", () => {
  const registry = createCommandRegistry(createAlphaCommandCatalogEntries());
  const invalidCommands = [
    createCommand({ type: "", payload: {}, id: "command-empty-type" }),
    createCommand({ type: "trait.add", payload: {}, id: "command-negative-revision", expectedRevision: -1 }),
    createCommand({ type: "trait.add", payload: {}, id: "command-string-revision", expectedRevision: "0" }),
  ];

  for (const command of invalidCommands) {
    const runtime = createRuntime();
    const session = createSession();
    const beforeSnapshot = serializeApplicationSession(session);
    const result = executeCommand(session, command, registry, runtime);

    assertRejectedWithoutMutation(
      result,
      session,
      beforeSnapshot,
      `${command.id} should be rejected before handler resolution`,
    );
  }
});

test("still allows omitted payload to normalize to an empty object for backwards-compatible command envelopes", () => {
  const registry = createCommandRegistry(createAlphaCommandCatalogEntries());
  const runtime = createRuntime();
  const session = createSession();
  const beforeSnapshot = serializeApplicationSession(session);
  const result = executeCommand(
    session,
    {
      id: "command-omitted-payload",
      type: "trait.add",
      expectedRevision: 0,
      issuedAt: ISSUED_AT,
    },
    registry,
    runtime,
  );

  assert.equal(result.status, "failed");
  assert.equal(result.session, session);
  assert.equal(result.receipt, null);
  assert.deepEqual(serializeApplicationSession(result.session), beforeSnapshot);
  assert.equal(result.session.revision, 0);
  assert.equal(result.session.history.length, 0);
  assert.equal(result.diagnostics[0].code, "application-command-execution-failed");
});
