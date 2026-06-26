import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { createFixedClock } from "../../infrastructure/runtime/FixedClock.js";
import {
  createSequentialIdGenerator,
} from "../../infrastructure/runtime/SequentialIdGenerator.js";
import { executeCommand } from "../commands/CommandExecutor.js";
import { createCommandRegistry } from "../commands/CommandRegistry.js";
import {
  redoApplicationSession,
  undoApplicationSession,
} from "../history/ApplicationHistoryOperations.js";
import {
  createInMemorySessionRepository,
} from "../persistence/InMemorySessionRepository.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
import {
  POOL_COMMAND_TYPES,
  createPoolCommandHandlerEntries,
} from "./PoolCommandHandlers.js";

function character(overrides = {}) {
  return createCharacter({
    identity: {
      id: "character-app-pool",
      name: "Personagem de Pools",
      concept: "",
      playerId: null,
      campaignId: null,
    },
    pools: {
      HP: { current: 10, maximum: 12 },
      FP: { current: 8, maximum: 9 },
      EnergyReserve: { current: 4, maximum: 6 },
    },
    metadata: {
      createdAt: "2026-06-26T16:00:00.000Z",
      updatedAt: "2026-06-26T16:00:00.000Z",
      source: "test",
    },
    ...overrides,
  });
}

function session(input = {}) {
  return createApplicationSession({
    id: "session-app-pool",
    character: character(),
    ...input,
  });
}

function registry() {
  return createCommandRegistry(createPoolCommandHandlerEntries());
}

function runtime() {
  return {
    clock: createFixedClock("2026-06-26T16:30:00.000Z"),
    idGenerator: createSequentialIdGenerator({
      initialValue: 0,
      width: 3,
    }),
  };
}

function command(type, expectedRevision, payload, id = "command-pool") {
  return {
    id,
    type,
    expectedRevision,
    issuedAt: "2026-06-26T16:20:00.000Z",
    payload,
  };
}

test("exposes three immutable pool command handler entries", () => {
  const entries = createPoolCommandHandlerEntries();

  assert.equal(Object.isFrozen(entries), true);
  assert.deepEqual(entries.map(entry => entry.type), [
    "pool.current.set",
    "pool.current.adjust",
    "pool.current.reset-to-maximum",
  ]);
  assert.equal(entries.every(entry => Object.isFrozen(entry)), true);
});

test("sets the current pool value through the canonical executor", () => {
  const initial = session();
  const result = executeCommand(
    initial,
    command(
      POOL_COMMAND_TYPES.SET_CURRENT,
      0,
      { poolKey: "HP", current: 7 },
      "command-set-hp",
    ),
    registry(),
    runtime(),
  );

  assert.equal(result.status, "applied");
  assert.equal(result.session.revision, 1);
  assert.equal(result.session.character.pools.HP.current, 7);
  assert.equal(result.session.character.pools.HP.maximum, 12);
  assert.equal(initial.character.pools.HP.current, 10);
  assert.equal(result.session.history.length, 1);
  assert.equal(result.session.future.length, 0);
  assert.equal(result.receipt.domainReceipt.operation, "set-current");
  assert.equal(result.receipt.domainReceipt.poolKey, "HP");
  assert.equal(result.receipt.domainReceipt.previousCurrent, 10);
  assert.equal(result.receipt.domainReceipt.current, 7);
});

test("adjusts and resets a pool without placing mechanics in application", () => {
  const appRuntime = runtime();
  const appRegistry = registry();
  const initial = session();

  const adjusted = executeCommand(
    initial,
    command(
      POOL_COMMAND_TYPES.ADJUST_CURRENT,
      0,
      { poolKey: "HP", delta: -15 },
      "command-adjust-hp",
    ),
    appRegistry,
    appRuntime,
  );

  assert.equal(adjusted.status, "applied");
  assert.equal(adjusted.session.character.pools.HP.current, -5);
  assert.equal(adjusted.receipt.domainReceipt.delta, -15);

  const reset = executeCommand(
    adjusted.session,
    command(
      POOL_COMMAND_TYPES.RESET_CURRENT_TO_MAXIMUM,
      1,
      { poolKey: "HP" },
      "command-reset-hp",
    ),
    appRegistry,
    appRuntime,
  );

  assert.equal(reset.status, "applied");
  assert.equal(reset.session.revision, 2);
  assert.equal(reset.session.character.pools.HP.current, 12);
  assert.equal(reset.receipt.domainReceipt.maximum, 12);
  assert.equal(reset.session.history.length, 2);
});

test("operates on an optional Energy Reserve already present in Character", () => {
  const result = executeCommand(
    session(),
    command(
      POOL_COMMAND_TYPES.ADJUST_CURRENT,
      0,
      { poolKey: "EnergyReserve", delta: -3 },
      "command-adjust-er",
    ),
    registry(),
    runtime(),
  );

  assert.equal(result.status, "applied");
  assert.equal(result.session.character.pools.EnergyReserve.current, 1);
  assert.equal(result.session.character.pools.EnergyReserve.maximum, 6);
});

test("returns no-op when set, adjustment or reset does not change state", () => {
  const appRegistry = registry();

  const same = executeCommand(
    session(),
    command(
      POOL_COMMAND_TYPES.SET_CURRENT,
      0,
      { poolKey: "FP", current: 8 },
      "command-same-fp",
    ),
    appRegistry,
    runtime(),
  );
  assert.equal(same.status, "no-op");
  assert.equal(same.session.revision, 0);
  assert.equal(same.session.history.length, 0);
  assert.equal(same.receipt.domainReceipt.reason, "already-current");

  const zero = executeCommand(
    session(),
    command(
      POOL_COMMAND_TYPES.ADJUST_CURRENT,
      0,
      { poolKey: "FP", delta: 0 },
      "command-zero-fp",
    ),
    appRegistry,
    runtime(),
  );
  assert.equal(zero.status, "no-op");
  assert.equal(zero.receipt.domainReceipt.reason, "zero-adjustment");

  const atMaximum = executeCommand(
    session({
      character: character({
        pools: {
          HP: { current: 12, maximum: 12 },
          FP: { current: 8, maximum: 9 },
        },
      }),
    }),
    command(
      POOL_COMMAND_TYPES.RESET_CURRENT_TO_MAXIMUM,
      0,
      { poolKey: "HP" },
      "command-reset-same-hp",
    ),
    appRegistry,
    runtime(),
  );
  assert.equal(atMaximum.status, "no-op");
  assert.equal(atMaximum.receipt.domainReceipt.reason, "already-at-maximum");
});

test("rejects stale commands before invoking a pool handler", () => {
  const result = executeCommand(
    session({ revision: 2 }),
    command(
      POOL_COMMAND_TYPES.SET_CURRENT,
      1,
      { poolKey: "HP", current: 1 },
      "command-stale-pool",
    ),
    registry(),
    runtime(),
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.session.revision, 2);
  assert.equal(result.session.character.pools.HP.current, 10);
  assert.equal(
    result.diagnostics[0].code,
    "application-command-stale-revision",
  );
});

test("preserves the session when payload or domain input is invalid", () => {
  const initial = session();
  const appRegistry = registry();

  const extra = executeCommand(
    initial,
    command(
      POOL_COMMAND_TYPES.SET_CURRENT,
      0,
      { poolKey: "HP", current: 5, clamp: true },
      "command-extra-payload",
    ),
    appRegistry,
    runtime(),
  );
  assert.equal(extra.status, "failed");
  assert.equal(extra.session, initial);
  assert.match(extra.diagnostics[0].message, /unsupported properties/);

  const missing = executeCommand(
    initial,
    command(
      POOL_COMMAND_TYPES.ADJUST_CURRENT,
      0,
      { poolKey: "Mana", delta: -1 },
      "command-missing-pool",
    ),
    appRegistry,
    runtime(),
  );
  assert.equal(missing.status, "failed");
  assert.equal(missing.session, initial);
  assert.match(missing.diagnostics[0].message, /Missing pool: Mana/);

  const infinite = executeCommand(
    initial,
    command(
      POOL_COMMAND_TYPES.ADJUST_CURRENT,
      0,
      { poolKey: "HP", delta: Infinity },
      "command-infinite-delta",
    ),
    appRegistry,
    runtime(),
  );
  assert.equal(infinite.status, "failed");
  assert.equal(infinite.session, initial);
  assert.equal(initial.history.length, 0);
});

test("blocks safely when Character contains an unsupported imported pool", () => {
  const base = session();
  const customSession = {
    ...base,
    character: {
      ...base.character,
      pools: {
        ...base.character.pools,
        ManaReserve: { current: 3, maximum: 5 },
      },
    },
  };

  const result = executeCommand(
    customSession,
    command(
      POOL_COMMAND_TYPES.SET_CURRENT,
      0,
      { poolKey: "HP", current: 9 },
      "command-custom-pool-guard",
    ),
    registry(),
    runtime(),
  );

  assert.equal(result.status, "failed");
  assert.equal(result.session, customSession);
  assert.equal(result.session.character.pools.HP.current, 10);
  assert.equal(result.session.character.pools.ManaReserve.current, 3);
  assert.equal(result.session.character.pools.ManaReserve.maximum, 5);
  assert.equal(result.session.history.length, 0);
  assert.match(
    result.diagnostics[0].message,
    /cannot safely rehydrate unsupported pool keys: ManaReserve/,
  );
});

test("persists, undoes and redoes a pool command through App Core", async () => {
  const appRuntime = runtime();
  const repository = createInMemorySessionRepository();
  const initial = session();

  const applied = executeCommand(
    initial,
    command(
      POOL_COMMAND_TYPES.ADJUST_CURRENT,
      0,
      { poolKey: "FP", delta: -3 },
      "command-spend-fp",
    ),
    registry(),
    appRuntime,
  );
  assert.equal(applied.status, "applied");
  assert.equal(applied.session.character.pools.FP.current, 5);

  await repository.save(applied.session);
  const reopened = await repository.load(initial.id);
  assert.equal(reopened.character.pools.FP.current, 5);
  assert.equal(reopened.history.length, 1);

  const undone = undoApplicationSession(
    reopened,
    { expectedRevision: 1 },
    appRuntime,
  );
  assert.equal(undone.status, "undone");
  assert.equal(undone.session.revision, 2);
  assert.equal(undone.session.character.pools.FP.current, 8);
  assert.equal(undone.session.history.length, 0);
  assert.equal(undone.session.future.length, 1);

  await repository.save(undone.session);
  const reopenedUndone = await repository.load(initial.id);
  const redone = redoApplicationSession(
    reopenedUndone,
    { expectedRevision: 2 },
    appRuntime,
  );

  assert.equal(redone.status, "redone");
  assert.equal(redone.session.revision, 3);
  assert.equal(redone.session.character.pools.FP.current, 5);
  assert.equal(redone.session.history.length, 1);
  assert.equal(redone.session.future.length, 0);
});
