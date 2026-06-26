import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import {
  setCharacterSummary,
} from "../../domain/character/CharacterSummaryOperations.js";
import {
  createApplicationSession,
} from "../session/ApplicationSession.js";
import {
  createAlphaMobilePersistenceBootstrap,
} from "./AlphaMobilePersistenceBootstrap.js";

function storage() {
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
    clock: { now: () => "2026-06-26T20:30:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:summary-${sequence}`;
      },
    },
  };
}

function character() {
  return createCharacter({
    identity: {
      id: "character-summary-alpha",
      name: "Ayla",
      concept: "Batedora",
      playerId: "player-one",
      campaignId: "campaign-alpha",
    },
    attacks: [
      {
        id: "attack-bow",
        name: "Disparo",
        category: "ranged",
        damage: { value: "thr+1", type: "imp" },
        range: "x15/x20",
      },
    ],
    metadata: {
      createdAt: "2026-06-26T18:00:00.000Z",
      updatedAt: "2026-06-26T18:00:00.000Z",
      source: "test",
    },
  });
}

function application() {
  return createAlphaMobilePersistenceBootstrap({
    storage: storage(),
    namespace: "test.alpha.character-summary",
    runtime: runtime(),
    initialSession: createApplicationSession({
      id: "session-character-summary",
      character: character(),
    }),
  });
}

test("updates name and concept immutably while preserving the remaining summary", () => {
  const before = character().identity;
  const after = setCharacterSummary(before, {
    name: "  Ayla do Norte  ",
    concept: "  Batedora veterana  ",
  });

  assert.notEqual(after, before);
  assert.equal(after.name, "Ayla do Norte");
  assert.equal(after.concept, "Batedora veterana");
  assert.equal(after.id, before.id);
  assert.equal(after.playerId, "player-one");
  assert.equal(after.campaignId, "campaign-alpha");
  assert.equal(before.name, "Ayla");
});

test("rejects empty names and unsupported character summary fields", () => {
  const current = character().identity;

  assert.throws(
    () => setCharacterSummary(current, { name: " ", concept: "Teste" }),
    /non-empty string/,
  );
  assert.throws(
    () => setCharacterSummary(current, {
      name: "Ayla",
      concept: "Teste",
      playerId: "injected",
    }),
    /unsupported properties/,
  );
});

test("applies the canonical summary command with revision and history", () => {
  const app = application();
  const beforeSnapshot = serializeCharacter(app.persistence.getActiveSession().character);

  const result = app.commands.setCharacterSummary({
    name: "Ayla do Norte",
    concept: "Batedora veterana",
  });
  const session = app.persistence.getActiveSession();

  assert.equal(result.status, "applied");
  assert.equal(session.revision, 1);
  assert.equal(session.character.identity.name, "Ayla do Norte");
  assert.equal(session.character.identity.concept, "Batedora veterana");
  assert.equal(session.history.length, 1);
  assert.equal(session.history[0].commandType, "character.summary.set");
  assert.equal(session.history[0].commandPayload.name, "Ayla do Norte");
  assert.deepEqual(
    serializeCharacter(session.character).attacks,
    beforeSnapshot.attacks,
  );
});

test("returns no-op for an unchanged character summary", () => {
  const app = application();
  const before = app.persistence.getActiveSession();

  const result = app.commands.setCharacterSummary({
    name: "Ayla",
    concept: "Batedora",
  });

  assert.equal(result.status, "no-op");
  assert.equal(app.persistence.getActiveSession(), before);
  assert.equal(before.revision, 0);
});

test("does not autosave and later persists the updated character summary", async () => {
  const app = application();

  app.commands.setCharacterSummary({
    name: "Ayla Salva",
    concept: "Exploradora",
  });

  assert.deepEqual(await app.repositories.session.listIds(), []);
  await app.persistence.saveActiveSession();
  const saved = await app.repositories.session.load("session-character-summary");

  assert.equal(saved.revision, 1);
  assert.equal(saved.character.identity.name, "Ayla Salva");
  assert.equal(saved.character.identity.concept, "Exploradora");
  assert.equal(saved.character.attacks[0].id, "attack-bow");
});
