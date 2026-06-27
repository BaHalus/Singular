import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { createCommandRegistry } from "../commands/CommandRegistry.js";
import { executeCommand } from "../commands/CommandExecutor.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
import {
  createSpellCommandHandlerEntries,
  SPELL_COMMAND_TYPES,
} from "./SpellCommandHandlers.js";

const runtime = Object.freeze({
  clock: { now: () => "2026-06-26T23:00:00.000Z" },
  idGenerator: { next: prefix => `${prefix}-001` },
});

function session() {
  return createApplicationSession({
    id: "session-spells",
    character: createCharacter({
      identity: { id: "character-spells", name: "Mago" },
      spells: [
        {
          id: "ignite",
          name: "Ateiar Fogo",
          attribute: "iq",
          difficulty: "h",
          points: 1,
          colleges: ["Fogo"],
          spellClass: "Comum",
          castingCost: "1",
          maintenanceCost: "-",
          castingTime: "1 seg",
          duration: "Instantânea",
          resistance: "",
          reference: "M72",
        },
        {
          id: "light",
          name: "Luz",
          attribute: "iq",
          difficulty: "h",
          points: 1,
          colleges: ["Luz e Trevas"],
          spellClass: "Comum",
          castingCost: "1",
          maintenanceCost: "1",
          castingTime: "1 seg",
          duration: "1 min",
          resistance: "",
          reference: "M110",
        },
      ],
    }),
  });
}

function command(type, payload, expectedRevision = 0) {
  return {
    id: `${type}-command`,
    type,
    expectedRevision,
    issuedAt: "2026-06-26T23:00:00.000Z",
    payload,
  };
}

function registry() {
  return createCommandRegistry(createSpellCommandHandlerEntries());
}

test("adds a spell with explicit identity through the existing executor", () => {
  const result = executeCommand(
    session(),
    command(SPELL_COMMAND_TYPES.ADD, {
      spell: {
        id: "minor-healing",
        name: "Cura Menor",
        attribute: "iq",
        difficulty: "h",
        points: 1,
        colleges: ["Cura"],
        spellClass: "Comum",
        castingCost: "1-3",
        maintenanceCost: "-",
        castingTime: "1 seg",
        duration: "Permanente",
        resistance: "",
        reference: "M91",
      },
    }),
    registry(),
    runtime,
  );

  assert.equal(result.status, "applied");
  assert.equal(result.session.revision, 1);
  assert.deepEqual(result.session.character.spells.map(spell => spell.id), [
    "ignite",
    "light",
    "minor-healing",
  ]);
  assert.equal(result.receipt.domainReceipt.operation, "add-spell");
});

test("updates only declared spell fields without calculating spell values", () => {
  const result = executeCommand(
    session(),
    command(SPELL_COMMAND_TYPES.UPDATE, {
      spellId: "light",
      patch: {
        name: "Luz Brilhante",
        castingCost: "2",
        duration: "10 min",
        resistance: "Vontade",
      },
    }),
    registry(),
    runtime,
  );

  const updated = result.session.character.spells.find(spell => spell.id === "light");
  assert.equal(result.status, "applied");
  assert.equal(updated.name, "Luz Brilhante");
  assert.equal(updated.castingCost, "2");
  assert.equal(updated.duration, "10 min");
  assert.equal(updated.resistance, "Vontade");
  assert.equal(updated.points, 1);
  assert.equal(result.receipt.domainReceipt.operation, "update-spell");
});

test("removes and reorders spells deterministically", () => {
  const removed = executeCommand(
    session(),
    command(SPELL_COMMAND_TYPES.REMOVE, { spellId: "ignite" }),
    registry(),
    runtime,
  );
  assert.equal(removed.status, "applied");
  assert.deepEqual(removed.session.character.spells.map(spell => spell.id), ["light"]);

  const reordered = executeCommand(
    session(),
    command(SPELL_COMMAND_TYPES.REORDER, {
      spellId: "light",
      targetIndex: 0,
    }),
    registry(),
    runtime,
  );
  assert.equal(reordered.status, "applied");
  assert.deepEqual(reordered.session.character.spells.map(spell => spell.id), [
    "light",
    "ignite",
  ]);
});

test("unchanged spell edits and same-index reorder are real no-ops", () => {
  const unchangedEdit = executeCommand(
    session(),
    command(SPELL_COMMAND_TYPES.UPDATE, {
      spellId: "light",
      patch: { name: "Luz" },
    }),
    registry(),
    runtime,
  );
  assert.equal(unchangedEdit.status, "no-op");
  assert.equal(unchangedEdit.session.revision, 0);
  assert.equal(unchangedEdit.session.history.length, 0);
  assert.equal(unchangedEdit.receipt.domainReceipt.reason, "unchanged-spell");

  const unchangedOrder = executeCommand(
    session(),
    command(SPELL_COMMAND_TYPES.REORDER, {
      spellId: "ignite",
      targetIndex: 0,
    }),
    registry(),
    runtime,
  );
  assert.equal(unchangedOrder.status, "no-op");
  assert.equal(unchangedOrder.session.revision, 0);
  assert.equal(unchangedOrder.session.future.length, 0);
  assert.equal(unchangedOrder.receipt.domainReceipt.reason, "unchanged-index");
});

test("rejects unsupported payloads atomically", () => {
  const nonTextualName = executeCommand(
    session(),
    command(SPELL_COMMAND_TYPES.UPDATE, {
      spellId: "light",
      patch: { name: 123 },
    }),
    registry(),
    runtime,
  );
  assert.equal(nonTextualName.status, "failed");
  assert.equal(nonTextualName.session.revision, 0);
  assert.equal(nonTextualName.session.character.spells[1].name, "Luz");

  const idMutation = executeCommand(
    session(),
    command(SPELL_COMMAND_TYPES.UPDATE, {
      spellId: "light",
      patch: { id: "other" },
    }),
    registry(),
    runtime,
  );
  assert.equal(idMutation.status, "failed");
  assert.match(idMutation.diagnostics[0].message, /unsupported properties/);

  const implicitId = executeCommand(
    session(),
    command(SPELL_COMMAND_TYPES.ADD, {
      spell: { name: "Sem ID" },
    }),
    registry(),
    runtime,
  );
  assert.equal(implicitId.status, "failed");
  assert.equal(implicitId.session.character.spells.length, 2);
});
