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

function createRuntime() {
  let sequence = 0;
  return {
    clock: { now: () => "2026-06-26T22:00:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:attack-mobile-${sequence}`;
      },
    },
  };
}

function createBootstrap() {
  const character = createCharacter({
    identity: {
      id: "character-attack-commands-mobile",
      name: "Ayla",
    },
  });
  return createAlphaMobilePersistenceBootstrap({
    initialSession: createApplicationSession({
      id: "session-attack-commands-mobile",
      character,
    }),
    storage: createMemoryStorage(),
    namespace: "test.mobile.attack-commands",
    runtime: createRuntime(),
  });
}

test("exposes add, reorder and remove attacks through the canonical mobile command flow", async () => {
  const app = createBootstrap();

  const sword = app.commands.addAttack({
    name: "Espada Curta",
    category: "melee",
    skillId: "skill_sword",
    damageValue: "1d+2",
    damageType: "corte",
    reach: "C,1",
    notes: "Ataque principal",
  });
  const bow = app.commands.addAttack({
    name: "Arco Curto",
    category: "ranged",
    skillId: "skill_bow",
    damageValue: "1d",
    damageType: "perfuração",
    range: "150/200",
  });

  assert.equal(sword.status, "applied");
  assert.equal(bow.status, "applied");
  assert.equal(app.persistence.getActiveSession().revision, 2);
  assert.deepEqual(
    app.persistence.getActiveSession().character.attacks.map(attack => ({
      name: attack.name,
      category: attack.category,
      source: attack.source,
      damage: attack.damage,
    })),
    [
      {
        name: "Espada Curta",
        category: "melee",
        source: { kind: "manual", id: null },
        damage: { value: "1d+2", type: "corte", authority: "declared" },
      },
      {
        name: "Arco Curto",
        category: "ranged",
        source: { kind: "manual", id: null },
        damage: { value: "1d", type: "perfuração", authority: "declared" },
      },
    ],
  );

  const swordId = app.persistence.getActiveSession().character.attacks[0].id;
  const bowId = app.persistence.getActiveSession().character.attacks[1].id;
  const reordered = app.commands.reorderAttack({
    attackId: bowId,
    targetIndex: 0,
  });
  const removed = app.commands.removeAttack({ attackId: swordId });

  assert.equal(reordered.status, "applied");
  assert.equal(removed.status, "applied");
  assert.equal(app.persistence.getActiveSession().revision, 4);
  assert.deepEqual(
    app.persistence.getActiveSession().character.attacks.map(attack => attack.id),
    [bowId],
  );
  assert.deepEqual(
    app.persistence.getActiveSession().history.map(entry => entry.commandType),
    ["attack.add", "attack.add", "attack.reorder", "attack.remove"],
  );
  assert.deepEqual(await app.repositories.session.listIds(), []);
});
