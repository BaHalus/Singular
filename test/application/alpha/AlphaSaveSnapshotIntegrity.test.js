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
  serializeCharacter,
} from "../../../src/domain/character/Character.js";

const ISSUED_AT = "2026-06-28T21:00:00.000Z";
const PROCESSED_AT = "2026-06-28T21:00:01.000Z";

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

function command(index, type, payload, expectedRevision) {
  return {
    id: `command-alpha-snapshot-${String(index).padStart(2, "0")}-${type.replaceAll(".", "-")}`,
    type,
    expectedRevision,
    issuedAt: ISSUED_AT,
    payload,
  };
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createSeedSession() {
  return createApplicationSession({
    id: "session-alpha-save-snapshot-integrity",
    character: createCharacter({
      identity: {
        id: "character-alpha-save-snapshot-integrity",
        name: "Alpha Snapshot Seed",
      },
      pools: {
        HP: { current: 10, maximum: 10 },
        FP: { current: 10, maximum: 10 },
      },
    }),
    metadata: {
      lane: "APP-ALPHA-SAVE-SNAPSHOT-INTEGRITY-1.0",
    },
  });
}

function createAppliedSession() {
  const registry = createCommandRegistry(createAlphaCommandCatalogEntries());
  const runtime = createRuntime();
  let session = createSeedSession();
  const commands = [
    ["character.summary.set", {
      name: "Alpha Snapshot Character",
      concept: "Portable session snapshot",
    }],
    ["skill.add", {
      skill: {
        id: "skill-alpha-snapshot",
        name: "Snapshot Skill",
        attribute: "IQ",
        difficulty: "hard",
        points: 2,
        importMeta: { source: "snapshot-integrity" },
      },
    }],
    ["equipment.add", {
      item: {
        id: "equipment-alpha-snapshot",
        kind: "item",
        name: "Snapshot Equipment",
        quantity: 1,
        weightKg: 1,
        cost: 5,
        state: "carried",
      },
    }],
    ["notes.general.set", {
      text: "Snapshot integrity note",
    }],
  ];

  for (const [index, [type, payload]] of commands.entries()) {
    const result = executeCommand(
      session,
      command(index + 1, type, payload, session.revision),
      registry,
      runtime,
    );
    assert.equal(result.status, "applied", `${type} should apply before snapshot integrity checks`);
    session = result.session;
  }

  return session;
}

test("ApplicationSession save snapshots survive JSON roundtrip without drift", () => {
  const session = createAppliedSession();
  const snapshot = serializeApplicationSession(session);
  const jsonRoundtripSnapshot = cloneJson(snapshot);
  const rehydrated = createApplicationSession(jsonRoundtripSnapshot);

  assert.deepEqual(serializeApplicationSession(rehydrated), snapshot);
  assert.equal(rehydrated.revision, 4);
  assert.equal(rehydrated.history.length, 4);
  assert.equal(rehydrated.future.length, 0);
  assert.equal(rehydrated.dirty, true);
  assert.equal(rehydrated.lastReceipt.commandType, "notes.general.set");
  assert.equal(rehydrated.character.identity.name, "Alpha Snapshot Character");
  assert.equal(rehydrated.character.skills[0].id, "skill-alpha-snapshot");
  assert.equal(rehydrated.character.equipment[0].id, "equipment-alpha-snapshot");
  assert.equal(rehydrated.character.notes.general, "Snapshot integrity note");
});

test("ApplicationSession snapshots and live sessions do not share mutable object references", () => {
  const session = createAppliedSession();
  const snapshot = serializeApplicationSession(session);
  const rehydrated = createApplicationSession(snapshot);
  const before = serializeApplicationSession(rehydrated);

  snapshot.character.identity.name = "Mutated serialized identity";
  snapshot.character.skills[0].name = "Mutated serialized skill";
  snapshot.history[0].commandPayload.name = "Mutated payload";
  snapshot.metadata.lane = "mutated";

  assert.deepEqual(serializeApplicationSession(rehydrated), before);
  assert.equal(rehydrated.character.identity.name, "Alpha Snapshot Character");
  assert.equal(rehydrated.character.skills[0].name, "Snapshot Skill");
  assert.equal(rehydrated.metadata.lane, "APP-ALPHA-SAVE-SNAPSHOT-INTEGRITY-1.0");
});

test("ApplicationSession and Character objects remain frozen after rehydration", () => {
  const session = createApplicationSession(serializeApplicationSession(createAppliedSession()));

  assert.ok(Object.isFrozen(session));
  assert.ok(Object.isFrozen(session.character));
  assert.ok(Object.isFrozen(session.character.identity));
  assert.ok(Object.isFrozen(session.character.skills));
  assert.ok(Object.isFrozen(session.history));
  assert.throws(
    () => {
      session.character.identity.name = "mutable";
    },
    TypeError,
  );
  assert.throws(
    () => {
      session.history.push({});
    },
    TypeError,
  );
});

test("Character save snapshots rehydrate independently of the source object", () => {
  const character = createAppliedSession().character;
  const snapshot = serializeCharacter(character);
  const rehydrated = createCharacter(cloneJson(snapshot));
  const before = serializeCharacter(rehydrated);

  snapshot.identity.name = "Mutated Character snapshot";
  snapshot.skills[0].points = 99;
  snapshot.equipment[0].quantity = 99;

  assert.deepEqual(serializeCharacter(rehydrated), before);
  assert.equal(rehydrated.identity.name, "Alpha Snapshot Character");
  assert.equal(rehydrated.skills[0].points, 2);
  assert.equal(rehydrated.equipment[0].quantity, 1);
});
