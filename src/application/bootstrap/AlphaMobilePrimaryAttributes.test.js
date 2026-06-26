import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import {
  adjustAttributeBase,
} from "../../domain/character/AttributesOperations.js";
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
    clock: { now: () => "2026-06-26T21:00:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:attribute-${sequence}`;
      },
    },
  };
}

function character() {
  return createCharacter({
    identity: {
      id: "character-primary-attributes",
      name: "Ayla",
      concept: "Batedora",
    },
    attributes: {
      ST: 11,
      DX: 12,
      IQ: 10,
      HT: 11,
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
  });
}

function application() {
  return createAlphaMobilePersistenceBootstrap({
    storage: storage(),
    namespace: "test.alpha.primary-attributes",
    runtime: runtime(),
    initialSession: createApplicationSession({
      id: "session-primary-attributes",
      character: character(),
    }),
  });
}

test("adjusts a primary attribute immutably in the domain", () => {
  const before = character().attributes;
  const after = adjustAttributeBase(before, "DX", 1);

  assert.notEqual(after, before);
  assert.notEqual(after.DX, before.DX);
  assert.equal(after.DX.base, 13);
  assert.equal(after.DX.override, null);
  assert.equal(after.ST, before.ST);
  assert.equal(before.DX.base, 12);
});

test("rejects unsupported keys and non-finite deltas", () => {
  const attributes = character().attributes;

  assert.throws(
    () => adjustAttributeBase(attributes, "Will", 1),
    /Invalid attribute key/,
  );
  assert.throws(
    () => adjustAttributeBase(attributes, "DX", Number.NaN),
    /Invalid base delta/,
  );
});

test("applies the canonical attribute command with revision and history", () => {
  const app = application();
  const before = serializeCharacter(app.persistence.getActiveSession().character);

  const result = app.commands.adjustAttributeBase({
    attributeKey: "DX",
    delta: 1,
  });
  const session = app.persistence.getActiveSession();

  assert.equal(result.status, "applied");
  assert.equal(session.revision, 1);
  assert.equal(session.character.attributes.DX.base, 13);
  assert.equal(session.history.length, 1);
  assert.equal(session.history[0].commandType, "attribute.base.adjust");
  assert.deepEqual(
    serializeCharacter(session.character).identity,
    before.identity,
  );
  assert.deepEqual(
    serializeCharacter(session.character).attacks,
    before.attacks,
  );
});

test("returns no-op for a zero attribute adjustment", () => {
  const app = application();
  const before = app.persistence.getActiveSession();

  const result = app.commands.adjustAttributeBase({
    attributeKey: "ST",
    delta: 0,
  });

  assert.equal(result.status, "no-op");
  assert.equal(app.persistence.getActiveSession(), before);
  assert.equal(before.revision, 0);
});

test("does not autosave and later persists adjusted attributes", async () => {
  const app = application();

  app.commands.adjustAttributeBase({ attributeKey: "ST", delta: 1 });
  app.commands.adjustAttributeBase({ attributeKey: "IQ", delta: -1 });

  assert.deepEqual(await app.repositories.session.listIds(), []);
  await app.persistence.saveActiveSession();
  const saved = await app.repositories.session.load("session-primary-attributes");

  assert.equal(saved.revision, 2);
  assert.equal(saved.character.attributes.ST.base, 12);
  assert.equal(saved.character.attributes.IQ.base, 9);
  assert.equal(saved.character.identity.name, "Ayla");
  assert.equal(saved.character.attacks[0].id, "attack-bow");
});
