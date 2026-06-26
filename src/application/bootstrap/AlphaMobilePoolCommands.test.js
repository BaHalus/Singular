import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  createApplicationSession,
  serializeApplicationSession,
} from "../session/ApplicationSession.js";
import {
  createAlphaMobilePersistenceBootstrap,
} from "./AlphaMobilePersistenceBootstrap.js";

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(String(key)) ? values.get(String(key)) : null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
  };
}

function runtime() {
  let sequence = 0;
  return {
    clock: { now: () => "2026-06-26T20:00:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:pool-${sequence}`;
      },
    },
  };
}

function initialSession() {
  return createApplicationSession({
    id: "session-pool-controls",
    character: createCharacter({
      identity: {
        id: "character-pool-controls",
        name: "Ayla",
      },
      pools: {
        HP: { current: 9, maximum: 11 },
        FP: { current: 8, maximum: 11 },
      },
      metadata: {
        createdAt: "2026-06-26T18:00:00.000Z",
        updatedAt: "2026-06-26T18:00:00.000Z",
        source: "test",
      },
    }),
  });
}

function application() {
  return createAlphaMobilePersistenceBootstrap({
    storage: createMemoryStorage(),
    namespace: "test.alpha.pool-controls",
    initialSession: initialSession(),
    runtime: runtime(),
  });
}

test("applies a pool adjustment through CommandExecutor and replaces the active session", () => {
  const app = application();
  const before = app.persistence.getActiveSession();

  const result = app.commands.adjustPoolCurrent({
    poolKey: "HP",
    delta: -1,
  });
  const after = app.persistence.getActiveSession();

  assert.equal(result.status, "applied");
  assert.notEqual(after, before);
  assert.equal(after.id, before.id);
  assert.equal(after.revision, 1);
  assert.equal(after.character.pools.HP.current, 8);
  assert.equal(after.character.pools.FP.current, 8);
  assert.equal(after.history.length, 1);
  assert.equal(after.future.length, 0);
  assert.equal(after.dirty, true);
  assert.equal(after.lastReceipt.commandType, "pool.current.adjust");
  assert.equal(after.history[0].commandPayload.poolKey, "HP");
  assert.equal(after.history[0].commandPayload.delta, -1);
});

test("does not autosave a pool command and later saves the updated canonical session", async () => {
  const app = application();

  app.commands.adjustPoolCurrent({ poolKey: "FP", delta: -2 });

  assert.deepEqual(await app.repositories.session.listIds(), []);
  const saved = await app.persistence.saveActiveSession();
  const persisted = await app.repositories.session.load("session-pool-controls");

  assert.equal(saved.status, "saved");
  assert.equal(persisted.revision, 1);
  assert.equal(persisted.character.pools.FP.current, 6);
  assert.deepEqual(
    serializeApplicationSession(persisted),
    serializeApplicationSession(app.persistence.getActiveSession()),
  );
});

test("preserves the active session when a pool command fails", () => {
  const app = application();
  const before = app.persistence.getActiveSession();

  const result = app.commands.adjustPoolCurrent({
    poolKey: "MissingPool",
    delta: -1,
  });

  assert.equal(result.status, "failed");
  assert.equal(app.persistence.getActiveSession(), before);
  assert.equal(before.revision, 0);
  assert.equal(result.diagnostics[0].code, "application-command-execution-failed");
});

test("rejects replacing the active session with another session id", () => {
  const app = application();
  const foreign = createApplicationSession({
    id: "session-foreign",
    character: app.persistence.getActiveSession().character,
  });

  assert.throws(
    () => app.persistence.replaceActiveSession(foreign),
    /must preserve the ApplicationSession id/,
  );
});

test("exposes frozen command and persistence facades", () => {
  const app = application();

  assert.equal(Object.isFrozen(app.commands), true);
  assert.equal(Object.isFrozen(app.persistence), true);
  assert.equal(typeof app.commands.adjustPoolCurrent, "function");
  assert.equal(typeof app.persistence.replaceActiveSession, "function");
});
