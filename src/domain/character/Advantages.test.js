import test from "node:test";
import assert from "node:assert/strict";

import {
  createAdvantages,
  createAdvantage,
  validateAdvantages,
  serializeAdvantages,
} from "./Advantages.js";

test("creates empty advantages list", () => {
  const advantages = createAdvantages();

  assert.deepEqual(advantages, []);
});

test("creates advantage with defaults", () => {
  const advantage = createAdvantage();

  assert.ok(advantage.id);
  assert.equal(advantage.name, "");
  assert.equal(advantage.notes, "");
  assert.deepEqual(advantage.tags, []);
});

test("creates advantage from input", () => {
  const advantage = createAdvantage({
    id: "adv-001",
    name: "Combat Reflexes",
    notes: "Fast reactions.",
    tags: ["combat"],
  });

  assert.equal(advantage.id, "adv-001");
  assert.equal(advantage.name, "Combat Reflexes");
  assert.equal(advantage.notes, "Fast reactions.");
  assert.deepEqual(advantage.tags, ["combat"]);
});

test("creates advantages list from input", () => {
  const advantages = createAdvantages([
    {
      id: "adv-001",
      name: "Combat Reflexes",
      tags: ["combat"],
    },
  ]);

  assert.equal(advantages.length, 1);
  assert.equal(advantages[0].name, "Combat Reflexes");
});

test("validates valid advantages", () => {
  const advantages = createAdvantages();

  assert.equal(validateAdvantages(advantages), true);
});

test("serializes advantages", () => {
  const advantages = createAdvantages([
    {
      id: "adv-001",
      name: "Combat Reflexes",
      notes: "",
      tags: ["combat"],
    },
  ]);

  const json = serializeAdvantages(advantages);

  assert.equal(json.length, 1);
  assert.equal(json[0].id, "adv-001");
  assert.equal(json[0].name, "Combat Reflexes");
  assert.deepEqual(json[0].tags, ["combat"]);
});

test("throws when advantages is not array", () => {
  assert.throws(() => {
    createAdvantages("Combat Reflexes");
  });
});

test("throws when advantage name is invalid", () => {
  assert.throws(() => {
    createAdvantages([
      {
        id: "adv-001",
        name: 123,
      },
    ]);
  });
});

test("throws when advantage notes is invalid", () => {
  assert.throws(() => {
    createAdvantages([
      {
        id: "adv-001",
        name: "Combat Reflexes",
        notes: 123,
      },
    ]);
  });
});

test("throws when advantage tags is invalid", () => {
  assert.throws(() => {
    createAdvantages([
      {
        id: "adv-001",
        name: "Combat Reflexes",
        tags: "combat",
      },
    ]);
  });
});
