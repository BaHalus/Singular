import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter, serializeCharacter } from "../../domain/character/Character.js";
import {
  clearSecondaryCharacteristicOverride,
  findSecondaryCharacteristic,
  setSecondaryCharacteristicBase,
  setSecondaryCharacteristicOverride,
} from "../../domain/character/SecondaryCharacteristicsOperations.js";
import { createCommandRegistry } from "../commands/CommandRegistry.js";
import { executeCommand } from "../commands/CommandExecutor.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
import {
  createSecondaryCommandHandlerEntries,
  SECONDARY_COMMAND_TYPES,
} from "./SecondaryCommandHandlers.js";

function runtime() {
  let nextId = 0;
  return {
    clock: { now: () => "2026-06-27T15:00:00.000Z" },
    idGenerator: { next: prefix => `${prefix}:secondary-edit:${++nextId}` },
  };
}

function character() {
  return createCharacter({
    identity: { id: "character-secondary-edit", name: "Cora", concept: "Sentinela" },
    secondaryCharacteristics: {
      HP: { base: 10, override: null },
      FP: { base: 10, override: null },
      Will: { base: 11, override: null },
      Per: { base: 12, override: null },
      BasicSpeed: { base: 5.25, override: null },
      BasicMove: { base: 5, override: null },
    },
    pools: {
      HP: { current: 9, maximum: 10 },
      FP: { current: 8, maximum: 10 },
    },
  });
}

function session() {
  return createApplicationSession({ id: "session-secondary-edit", character: character() });
}

function registry() {
  return createCommandRegistry(createSecondaryCommandHandlerEntries());
}

function command(type, payload, expectedRevision = 0) {
  return {
    id: `command:${type}`,
    type,
    expectedRevision,
    issuedAt: "2026-06-27T15:00:00.000Z",
    payload,
  };
}

function diagnosticMessage(result) {
  return result.diagnostics.map(diagnostic => diagnostic.message ?? "").join("\n");
}

test("edits declared secondary characteristics immutably without calculating derived values", () => {
  const before = character().secondaryCharacteristics;
  const withWillBase = setSecondaryCharacteristicBase(before, "Will", 12);
  const withPerOverride = setSecondaryCharacteristicOverride(withWillBase, "Per", 14);
  const clearedPer = clearSecondaryCharacteristicOverride(withPerOverride, "Per");

  assert.equal(before.Will.base, 11);
  assert.equal(withWillBase.Will.base, 12);
  assert.equal(withPerOverride.Per.override, 14);
  assert.equal(clearedPer.Per.override, null);
  assert.equal(findSecondaryCharacteristic(withWillBase, "BasicSpeed").base, 5.25);
});

test("rejects unknown secondary keys and non-finite declared values", () => {
  const secondary = character().secondaryCharacteristics;

  assert.throws(() => setSecondaryCharacteristicBase(secondary, "Dodge", 8), /Invalid secondary characteristic key/);
  assert.throws(() => setSecondaryCharacteristicOverride(secondary, "Will", Number.NaN), /Invalid override value/);
  assert.throws(() => setSecondaryCharacteristicBase(secondary, "Per", Infinity), /Invalid base value/);
});

test("applies secondary commands through CommandExecutor with revision and history", () => {
  const beforeSession = session();
  const beforeCharacter = serializeCharacter(beforeSession.character);
  const appRuntime = runtime();
  const first = executeCommand(
    beforeSession,
    command(SECONDARY_COMMAND_TYPES.SET_SECONDARY_OVERRIDE, {
      characteristicKey: "Will",
      override: 13,
    }),
    registry(),
    appRuntime,
  );
  const second = executeCommand(
    first.session,
    command(SECONDARY_COMMAND_TYPES.SET_SECONDARY_BASE, {
      characteristicKey: "BasicMove",
      base: 6,
    }, 1),
    registry(),
    appRuntime,
  );

  assert.equal(first.status, "applied");
  assert.equal(first.session.revision, 1);
  assert.equal(first.session.history[0].commandType, "secondary.override.set");
  assert.equal(first.session.character.secondaryCharacteristics.Will.override, 13);
  assert.equal(second.status, "applied");
  assert.equal(second.session.revision, 2);
  assert.equal(second.session.character.secondaryCharacteristics.BasicMove.base, 6);
  assert.deepEqual(serializeCharacter(second.session.character).identity, beforeCharacter.identity);
  assert.deepEqual(serializeCharacter(second.session.character).pools, beforeCharacter.pools);
});

test("sets HP and FP maximums as structural declarations without changing current pools", () => {
  const result = executeCommand(
    session(),
    command(SECONDARY_COMMAND_TYPES.SET_POOL_MAXIMUM, {
      poolKey: "HP",
      maximum: 12,
    }),
    registry(),
    runtime(),
  );

  assert.equal(result.status, "applied");
  assert.equal(result.session.character.pools.HP.maximum, 12);
  assert.equal(result.session.character.pools.HP.current, 9);
  assert.equal(result.session.character.pools.FP.maximum, 10);
});

test("returns no-op for unchanged secondary declarations and maximums", () => {
  const sameWill = executeCommand(session(), command(SECONDARY_COMMAND_TYPES.SET_SECONDARY_BASE, {
    characteristicKey: "Will",
    base: 11,
  }), registry(), runtime());
  const clearEmptyOverride = executeCommand(session(), command(SECONDARY_COMMAND_TYPES.CLEAR_SECONDARY_OVERRIDE, {
    characteristicKey: "Per",
  }), registry(), runtime());
  const sameMaximum = executeCommand(session(), command(SECONDARY_COMMAND_TYPES.SET_POOL_MAXIMUM, {
    poolKey: "FP",
    maximum: 10,
  }), registry(), runtime());

  assert.equal(sameWill.status, "no-op");
  assert.equal(sameWill.session.revision, 0);
  assert.equal(clearEmptyOverride.status, "no-op");
  assert.equal(clearEmptyOverride.session.revision, 0);
  assert.equal(sameMaximum.status, "no-op");
  assert.equal(sameMaximum.session.revision, 0);
});

test("rejects unsupported command payloads and unsupported structural pools", () => {
  const unsupportedPayload = executeCommand(session(), command(SECONDARY_COMMAND_TYPES.SET_SECONDARY_BASE, {
    characteristicKey: "Will",
    base: 12,
    formula: "IQ+2",
  }), registry(), runtime());
  const unsupportedPool = executeCommand(session(), command(SECONDARY_COMMAND_TYPES.SET_POOL_MAXIMUM, {
    poolKey: "EnergyReserve",
    maximum: 3,
  }), registry(), runtime());

  assert.equal(unsupportedPayload.status, "failed");
  assert.match(diagnosticMessage(unsupportedPayload), /unsupported properties/);
  assert.equal(unsupportedPool.status, "failed");
  assert.match(diagnosticMessage(unsupportedPool), /Unsupported structural pool maximum/);
});

test("fails safely instead of dropping unsupported imported pools during secondary rehydration", () => {
  const customSession = session();
  customSession.character.pools.ManaReserve = { current: 2, maximum: 4 };

  const result = executeCommand(customSession, command(SECONDARY_COMMAND_TYPES.SET_SECONDARY_BASE, {
    characteristicKey: "Will",
    base: 12,
  }), registry(), runtime());

  assert.equal(result.status, "failed");
  assert.equal(result.session.character.pools.ManaReserve.maximum, 4);
  assert.match(diagnosticMessage(result), /cannot safely rehydrate unsupported pool keys: ManaReserve/);
});
