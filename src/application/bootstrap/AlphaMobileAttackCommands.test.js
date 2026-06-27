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

test("exposes the complete canonical attack command flow to mobile", async () => {
  const app = createBootstrap();

  assert.equal(app.commands.addAttack({
    name: "Espada Curta",
    category: "melee",
    skillId: "skill_sword",
    damageValue: "1d+2",
    damageType: "corte",
    reach: "C,1",
    notes: "Ataque principal",
  }).status, "applied");
  assert.equal(app.commands.addAttack({
    name: "Arco Curto",
    category: "ranged",
    skillId: "skill_bow",
    damageValue: "1d",
    damageType: "perfuração",
    range: "150/200",
  }).status, "applied");

  const swordId = app.persistence.getActiveSession().character.attacks[0].id;
  const bowId = app.persistence.getActiveSession().character.attacks[1].id;
  const originalSource = app.persistence.getActiveSession().character.attacks[0].source;
  const patch = {
    attackId: swordId,
    name: "Espada Curta Afiada",
    category: "melee",
    skillId: "skill_sword",
    damageValue: "2d",
    damageType: "corte",
    reach: "1",
    range: "",
    notes: "Lâmina melhorada",
  };

  const updated = app.commands.updateAttack(patch);
  const noOp = app.commands.updateAttack(patch);

  assert.equal(updated.status, "applied");
  assert.equal(noOp.status, "no-op");
  assert.equal(app.persistence.getActiveSession().revision, 3);
  assert.deepEqual(
    app.persistence.getActiveSession().character.attacks[0],
    {
      id: swordId,
      name: "Espada Curta Afiada",
      category: "melee",
      skillId: "skill_sword",
      source: originalSource,
      damage: { value: "2d", type: "corte", authority: "declared" },
      reach: "1",
      range: null,
      notes: "Lâmina melhorada",
      importMeta: null,
      raw: null,
    },
  );

  assert.equal(app.commands.reorderAttack({
    attackId: bowId,
    targetIndex: 0,
  }).status, "applied");
  assert.equal(app.commands.removeAttack({ attackId: swordId }).status, "applied");

  assert.equal(app.persistence.getActiveSession().revision, 5);
  assert.deepEqual(
    app.persistence.getActiveSession().character.attacks.map(attack => attack.id),
    [bowId],
  );
  assert.deepEqual(
    app.persistence.getActiveSession().history.map(entry => entry.commandType),
    ["attack.add", "attack.add", "attack.update", "attack.reorder", "attack.remove"],
  );
  assert.deepEqual(await app.repositories.session.listIds(), []);
});
