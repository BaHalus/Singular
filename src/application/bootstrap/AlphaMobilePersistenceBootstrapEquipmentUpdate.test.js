import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
} from "../../domain/character/Character.js";
import {
  createApplicationSession,
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
    clock: { now: () => "2026-06-30T08:20:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:equipment-update-${sequence}`;
      },
    },
  };
}

test("alpha mobile bootstrap exposes canonical equipment.update for value and notes", () => {
  const character = createCharacter({
    identity: {
      id: "character-equipment-update",
      name: "Equipamento Alpha",
      concept: "Regressão mobile",
    },
    equipment: [
      {
        id: "equipment:rations",
        name: "Rações",
        quantity: 2,
        weightKg: 1,
        cost: 10,
        state: "carried",
        notes: "Secas",
      },
    ],
  });
  const initialSession = createApplicationSession({
    id: "session-equipment-update",
    character,
  });
  const app = createAlphaMobilePersistenceBootstrap({
    storage: createMemoryStorage(),
    namespace: "test.alpha.equipment-update-facade",
    initialSession,
    runtime: runtime(),
  });

  const result = app.commands.updateEquipment({
    itemId: "equipment:rations",
    patch: {
      weightKg: 2.5,
      cost: 17,
      notes: "Secas\nSeparar por dia.",
    },
  });

  assert.equal(result.status, "applied");
  assert.equal(result.receipt.commandType, "equipment.update");
  assert.equal(app.persistence.getActiveSession().revision, 1);
  const [updated] = app.persistence.getActiveSession().character.equipment;
  assert.equal(updated.name, "Rações");
  assert.equal(updated.quantity, 2);
  assert.equal(updated.state, "carried");
  assert.equal(updated.weightKg, 2.5);
  assert.equal(updated.cost, 17);
  assert.equal(updated.notes, "Secas\nSeparar por dia.");
});
