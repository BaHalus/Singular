import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { resolveEquipmentTotals } from "../../engine/equipment/EquipmentTotalsResolver.js";
import { createFixedClock } from "../../infrastructure/runtime/FixedClock.js";
import { createSequentialIdGenerator } from "../../infrastructure/runtime/SequentialIdGenerator.js";
import { executeCommand } from "../commands/CommandExecutor.js";
import { createCommandRegistry } from "../commands/CommandRegistry.js";
import {
  redoApplicationSession,
  undoApplicationSession,
} from "../history/ApplicationHistoryOperations.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
import {
  EQUIPMENT_COMMAND_TYPES,
  createEquipmentCommandHandlerEntries,
} from "./EquipmentCommandHandlers.js";

function session() {
  return createApplicationSession({
    id: "session-equipment-modifiers",
    character: createCharacter({
      identity: { id: "character-equipment-modifiers", name: "Ferreiro" },
      equipment: [{
        id: "sword",
        name: "Espada",
        cost: 100,
        weightKg: 2,
        state: "equipped",
        modifiers: [{
          type: "eqp_modifier_container",
          id: "quality",
          name: "Qualidade",
          children: [{
            type: "eqp_modifier",
            id: "fine",
            name: "Superior",
            cost_type: "to_base_cost",
            cost: "x4",
          }],
        }],
      }],
    }),
  });
}

function runtime() {
  return {
    clock: createFixedClock("2026-07-14T15:30:00.000Z"),
    idGenerator: createSequentialIdGenerator({ initialValue: 0, width: 3 }),
  };
}

function command(type, expectedRevision, payload, id) {
  return {
    id,
    type,
    expectedRevision,
    issuedAt: "2026-07-14T15:29:00.000Z",
    payload,
  };
}

function execute(current, type, payload, id, appRuntime) {
  return executeCommand(
    current,
    command(type, current.revision, payload, id),
    createCommandRegistry(createEquipmentCommandHandlerEntries()),
    appRuntime,
  );
}

test("applies every equipment modifier intention as exactly one revision", () => {
  const appRuntime = runtime();
  const added = execute(session(), EQUIPMENT_COMMAND_TYPES.ADD_MODIFIER, {
    itemId: "sword",
    parentId: "quality",
    index: 1,
    node: {
      type: "eqp_modifier",
      id: "light",
      name: "Leve",
      weight_type: "to_base_weight",
      weight: "x0.5",
    },
  }, "add-light", appRuntime);
  const edited = execute(added.session, EQUIPMENT_COMMAND_TYPES.EDIT_MODIFIER, {
    itemId: "sword",
    modifierId: "fine",
    patch: { notes: "Acabamento magistral" },
  }, "edit-fine", appRuntime);
  const reordered = execute(edited.session, EQUIPMENT_COMMAND_TYPES.REORDER_MODIFIER, {
    itemId: "sword",
    modifierId: "light",
    parentId: "quality",
    toIndex: 0,
  }, "reorder-light", appRuntime);
  const disabled = execute(reordered.session, EQUIPMENT_COMMAND_TYPES.SET_MODIFIER_ENABLED, {
    itemId: "sword",
    modifierId: "fine",
    enabled: false,
  }, "disable-fine", appRuntime);
  const removed = execute(disabled.session, EQUIPMENT_COMMAND_TYPES.REMOVE_MODIFIER, {
    itemId: "sword",
    modifierId: "light",
  }, "remove-light", appRuntime);

  assert.deepEqual(
    [added, edited, reordered, disabled, removed].map(result => result.status),
    ["applied", "applied", "applied", "applied", "applied"],
  );
  assert.equal(removed.session.revision, 5);
  assert.equal(removed.session.history.length, 5);
  assert.deepEqual(
    removed.session.history.map(entry => entry.commandType),
    [
      "equipment.modifier.add",
      "equipment.modifier.edit",
      "equipment.modifier.reorder",
      "equipment.modifier.enabled.set",
      "equipment.modifier.remove",
    ],
  );
  assert.equal(
    removed.session.character.equipment[0].modifiers[0].children[0].id,
    "fine",
  );
  assert.equal(
    removed.session.character.equipment[0].modifiers[0].children[0].enabled,
    false,
  );
  const totals = resolveEquipmentTotals(removed.session.character.equipment).totals;
  assert.equal(totals.cost, 100);
  assert.equal(totals.weightKg, 2);
});

test("undo and redo restore the complete modifier tree through canonical history", () => {
  const appRuntime = runtime();
  const applied = execute(session(), EQUIPMENT_COMMAND_TYPES.SET_MODIFIER_ENABLED, {
    itemId: "sword",
    modifierId: "fine",
    enabled: false,
  }, "disable-fine", appRuntime);
  const undone = undoApplicationSession(
    applied.session,
    { expectedRevision: 1 },
    appRuntime,
  );
  const redone = redoApplicationSession(
    undone.session,
    { expectedRevision: 2 },
    appRuntime,
  );

  assert.equal(applied.session.history.length, 1);
  assert.equal(undone.status, "undone");
  assert.equal(undone.session.character.equipment[0].modifiers[0].children[0].enabled, undefined);
  assert.equal(resolveEquipmentTotals(undone.session.character.equipment).totals.cost, 400);
  assert.equal(redone.status, "redone");
  assert.equal(redone.session.character.equipment[0].modifiers[0].children[0].enabled, false);
  assert.equal(resolveEquipmentTotals(redone.session.character.equipment).totals.cost, 100);
});

test("rejects invalid modifier intentions without revision or partial mutation", () => {
  const original = session();
  const result = execute(original, EQUIPMENT_COMMAND_TYPES.ADD_MODIFIER, {
    itemId: "sword",
    parentId: "missing",
    index: 0,
    node: { type: "eqp_modifier", id: "new", name: "Inválido" },
  }, "invalid-add", runtime());

  assert.equal(result.status, "failed");
  assert.equal(result.session, original);
  assert.equal(result.session.revision, 0);
  assert.equal(result.session.history.length, 0);
  assert.deepEqual(result.session.character.equipment, original.character.equipment);
});

test("returns no-op without adding history when modifier state is unchanged", () => {
  const original = session();
  const result = execute(original, EQUIPMENT_COMMAND_TYPES.SET_MODIFIER_ENABLED, {
    itemId: "sword",
    modifierId: "fine",
    enabled: true,
  }, "keep-fine-enabled", runtime());

  assert.equal(result.status, "no-op");
  assert.equal(result.session, original);
  assert.equal(result.session.revision, 0);
  assert.equal(result.session.history.length, 0);
});
