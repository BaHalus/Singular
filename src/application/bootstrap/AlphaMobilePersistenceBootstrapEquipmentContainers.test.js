import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
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
    clock: { now: () => "2026-07-06T04:40:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:a6-container-${sequence}`;
      },
    },
  };
}

function initialSession() {
  return createApplicationSession({
    id: "session-alpha-a6-containers",
    character: createCharacter({
      identity: {
        id: "character-alpha-a6-containers",
        name: "Aldric",
        concept: "Guarda de muralha",
      },
      equipment: [
        {
          id: "equipment:backpack",
          kind: "container",
          containerKind: "physical",
          name: "Mochila",
          quantity: 1,
          weightKg: 0.5,
          cost: 60,
          state: "carried",
          notes: "Recipiente inicial",
          children: [],
        },
      ],
      metadata: {
        createdAt: "2026-07-06T04:40:00.000Z",
        updatedAt: "2026-07-06T04:40:00.000Z",
        source: "alpha-a6-container-test",
      },
    }),
  });
}

test("Alpha mobile equipment addition can target an existing container and persist", async () => {
  const storage = createMemoryStorage();
  const app = createAlphaMobilePersistenceBootstrap({
    initialSession: initialSession(),
    storage,
    namespace: "test.alpha-a6-equipment-containers",
    runtime: runtime(),
  });

  const result = app.commands.addEquipment({
    containerId: "equipment:backpack",
    name: "Corda 15 m",
    kind: "item",
    quantity: 2,
    weightKg: 1.5,
    cost: 30,
    state: "stored",
    notes: "Guardada dentro da mochila",
  });

  assert.equal(result.status, "applied");
  assert.equal(app.persistence.getActiveSession().history[0].commandType, "equipment.add-child");
  assert.equal(app.persistence.getActiveSession().character.equipment.length, 1);
  assert.equal(app.persistence.getActiveSession().character.equipment[0].children.length, 1);
  assert.equal(app.persistence.getActiveSession().character.equipment[0].children[0].name, "Corda 15 m");
  assert.equal(app.persistence.getActiveSession().character.equipment[0].children[0].quantity, 2);
  assert.equal(app.persistence.getActiveSession().character.equipment[0].children[0].weightKg, 1.5);
  assert.equal(app.persistence.getActiveSession().character.equipment[0].children[0].cost, 30);

  await app.persistence.saveActiveSession();
  const saved = await app.repositories.session.load("session-alpha-a6-containers");

  assert.equal(saved.character.equipment[0].name, "Mochila");
  assert.equal(saved.character.equipment[0].children[0].name, "Corda 15 m");
  assert.equal(saved.character.equipment[0].children[0].state, "stored");
});

test("Alpha mobile equipment addition without container stays at inventory root", () => {
  const app = createAlphaMobilePersistenceBootstrap({
    initialSession: initialSession(),
    storage: createMemoryStorage(),
    namespace: "test.alpha-a6-equipment-root",
    runtime: runtime(),
  });

  const result = app.commands.addEquipment({
    name: "Cantina",
    kind: "item",
    quantity: 1,
    weightKg: 1,
    cost: 10,
    state: "carried",
  });

  assert.equal(result.status, "applied");
  assert.equal(app.persistence.getActiveSession().history[0].commandType, "equipment.add");
  assert.equal(app.persistence.getActiveSession().character.equipment.length, 2);
  assert.equal(app.persistence.getActiveSession().character.equipment[1].name, "Cantina");
  assert.equal(app.persistence.getActiveSession().character.equipment[0].children.length, 0);
});
