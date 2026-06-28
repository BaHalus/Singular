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
  restoreCharacterFromHistorySnapshot,
} from "../../../src/application/history/ApplicationHistory.js";
import {
  createCharacter,
} from "../../../src/domain/character/Character.js";

const ISSUED_AT = "2026-06-28T08:00:00.000Z";
const PROCESSED_AT = "2026-06-28T08:00:01.000Z";

const COMMAND_CASES = Object.freeze([
  Object.freeze({
    family: "Traits",
    type: "trait.add",
    payload: {
      trait: {
        id: "trait-alpha-undo-redo",
        name: "Alpha Trait",
        role: "advantage",
        points: 1,
      },
    },
  }),
  Object.freeze({
    family: "Skills",
    type: "skill.add",
    payload: {
      skill: {
        id: "skill-alpha-undo-redo",
        name: "Alpha Skill",
        attribute: "DX",
        difficulty: "average",
        points: 1,
      },
    },
  }),
  Object.freeze({
    family: "Techniques",
    type: "technique.add",
    payload: {
      technique: {
        id: "technique-alpha-undo-redo",
        name: "Alpha Technique",
        skillName: "Alpha Skill",
        difficulty: "hard",
        points: 1,
      },
    },
  }),
  Object.freeze({
    family: "Languages",
    type: "language.add",
    payload: {
      language: {
        id: "language-alpha-undo-redo",
        name: "Alpha Language",
        spokenLevel: "accented",
        writtenLevel: "broken",
        isNative: false,
      },
    },
  }),
  Object.freeze({
    family: "Familiarities",
    type: "familiarity.add",
    payload: {
      familiarity: {
        id: "familiarity-alpha-undo-redo",
        name: "Alpha Culture",
        isNative: false,
      },
    },
  }),
  Object.freeze({
    family: "Secondary",
    type: "secondary.base.set",
    payload: {
      characteristicKey: "Will",
      base: 1,
    },
  }),
  Object.freeze({
    family: "Notes",
    type: "notes.general.set",
    payload: {
      text: "Alpha general note",
    },
  }),
  Object.freeze({
    family: "Attacks",
    type: "attack.add",
    payload: {
      attack: {
        id: "attack-alpha-undo-redo",
        name: "Alpha Attack",
        category: "melee",
        source: { kind: "manual", id: null },
        damage: { value: "1d", type: "cut" },
      },
    },
  }),
  Object.freeze({
    family: "Equipment",
    type: "equipment.add",
    payload: {
      item: {
        id: "equipment-alpha-undo-redo",
        kind: "item",
        name: "Alpha Equipment",
        quantity: 1,
        weightKg: 0,
        cost: 0,
        state: "carried",
      },
    },
  }),
  Object.freeze({
    family: "Spells",
    type: "spell.add",
    payload: {
      spell: {
        id: "spell-alpha-undo-redo",
        spellType: "standard",
        name: "Alpha Spell",
        attribute: "IQ",
        difficulty: "hard",
        points: 1,
      },
    },
  }),
  Object.freeze({
    family: "Powers",
    type: "power.add",
    payload: {
      power: {
        id: "power-alpha-undo-redo",
        name: "Alpha Power",
        source: "manual",
        memberTraitIds: [],
        tags: [],
      },
    },
  }),
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
    id: "session-alpha-undo-redo-matrix",
    character: createCharacter({
      identity: {
        id: "character-alpha-undo-redo-matrix",
        name: "Alpha Undo Redo Matrix",
      },
    }),
  });
}

function createCommand({ type, payload, id, expectedRevision }) {
  return {
    id,
    type,
    expectedRevision,
    issuedAt: ISSUED_AT,
    payload,
  };
}

function undoAppliedTransition(session) {
  const entry = session.history.at(-1);
  assert.ok(entry, "undo requires one history entry");

  return createApplicationSession({
    id: session.id,
    revision: entry.beforeRevision,
    character: restoreCharacterFromHistorySnapshot(entry.beforeCharacter),
    history: session.history.slice(0, -1),
    future: [...session.future, entry],
    dirty: true,
    lastReceipt: {
      commandId: entry.commandId,
      commandType: entry.commandType,
      status: "undone",
      previousRevision: session.revision,
      revision: entry.beforeRevision,
    },
    metadata: session.metadata,
  });
}

function redoAppliedTransition(session) {
  const entry = session.future.at(-1);
  assert.ok(entry, "redo requires one future entry");

  return createApplicationSession({
    id: session.id,
    revision: entry.afterRevision,
    character: restoreCharacterFromHistorySnapshot(entry.afterCharacter),
    history: [...session.history, entry],
    future: session.future.slice(0, -1),
    dirty: true,
    lastReceipt: {
      commandId: entry.commandId,
      commandType: entry.commandType,
      status: "redone",
      previousRevision: session.revision,
      revision: entry.afterRevision,
    },
    metadata: session.metadata,
  });
}

test("Alpha structural command families preserve canonical history through undo and redo", () => {
  const registry = createCommandRegistry(createAlphaCommandCatalogEntries());

  for (const commandCase of COMMAND_CASES) {
    const session = createSession();
    const before = serializeApplicationSession(session);
    const runtime = createRuntime();
    const command = createCommand({
      type: commandCase.type,
      payload: commandCase.payload,
      id: `command-alpha-undo-redo-${commandCase.type.replaceAll(".", "-")}`,
      expectedRevision: session.revision,
    });

    const applied = executeCommand(session, command, registry, runtime);

    assert.equal(applied.status, "applied", `${commandCase.family} command should apply`);
    assert.equal(applied.session.revision, 1, `${commandCase.family} revision should advance`);
    assert.equal(applied.session.history.length, 1, `${commandCase.family} history should receive one entry`);
    assert.equal(applied.session.future.length, 0, `${commandCase.family} future should stay empty after apply`);
    assert.equal(applied.session.dirty, true, `${commandCase.family} apply should mark session dirty`);
    assert.equal(applied.receipt.commandType, commandCase.type, `${commandCase.family} receipt should preserve command type`);
    assert.equal(applied.session.lastReceipt.commandType, commandCase.type, `${commandCase.family} session should store last receipt`);

    const historyEntry = applied.session.history[0];
    assert.equal(historyEntry.beforeRevision, 0, `${commandCase.family} history should store before revision`);
    assert.equal(historyEntry.afterRevision, 1, `${commandCase.family} history should store after revision`);
    assert.equal(historyEntry.commandPayload, commandCase.payload, `${commandCase.family} history should preserve payload reference`);
    assert.deepEqual(historyEntry.commandPayload, commandCase.payload, `${commandCase.family} history should preserve payload value`);
    assert.notDeepEqual(
      serializeApplicationSession(applied.session).character,
      before.character,
      `${commandCase.family} command should change character snapshot`,
    );

    const undone = undoAppliedTransition(applied.session);
    assert.equal(undone.revision, 0, `${commandCase.family} undo should restore previous revision`);
    assert.equal(undone.history.length, 0, `${commandCase.family} undo should pop history`);
    assert.equal(undone.future.length, 1, `${commandCase.family} undo should push future`);
    assert.equal(undone.dirty, true, `${commandCase.family} undo should keep session dirty`);
    assert.equal(undone.lastReceipt.status, "undone", `${commandCase.family} undo should record receipt`);
    assert.equal(undone.lastReceipt.commandType, commandCase.type, `${commandCase.family} undo receipt should preserve command type`);
    assert.deepEqual(
      serializeApplicationSession(undone).character,
      before.character,
      `${commandCase.family} undo should restore beforeCharacter snapshot`,
    );

    const redone = redoAppliedTransition(undone);
    assert.equal(redone.revision, 1, `${commandCase.family} redo should restore applied revision`);
    assert.equal(redone.history.length, 1, `${commandCase.family} redo should restore history`);
    assert.equal(redone.future.length, 0, `${commandCase.family} redo should clear future`);
    assert.equal(redone.dirty, true, `${commandCase.family} redo should keep session dirty`);
    assert.equal(redone.lastReceipt.status, "redone", `${commandCase.family} redo should record receipt`);
    assert.equal(redone.lastReceipt.commandType, commandCase.type, `${commandCase.family} redo receipt should preserve command type`);
    assert.deepEqual(
      serializeApplicationSession(redone).character,
      serializeApplicationSession(applied.session).character,
      `${commandCase.family} redo should restore afterCharacter snapshot`,
    );
  }
});
