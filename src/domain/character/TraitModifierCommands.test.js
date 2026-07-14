import test from "node:test";
import assert from "node:assert/strict";

import { createTrait } from "./Traits.js";
import { evaluateTraitModifierCost } from "./TraitModifierCost.js";
import {
  addTraitModifier,
  applyTraitModifierCommands,
  editTraitModifier,
  getTraitModifierCommandTypes,
  removeTraitModifier,
  reorderTraitModifier,
  setTraitModifierEnabled,
} from "./TraitModifierCommands.js";
import { createTraitModifiers } from "./TraitModifiers.js";

function enhancement(id, value = 10) {
  return {
    id,
    name: id,
    kind: "enhancement",
    valueType: "percentage",
    value,
  };
}

test("declares canonical trait modifier command types", () => {
  assert.deepEqual(getTraitModifierCommandTypes(), [
    "add",
    "edit",
    "remove",
    "reorder",
    "set-enabled",
  ]);
});

test("adds modifiers at a declared index without mutating the source", () => {
  const source = createTraitModifiers([
    enhancement("first"),
    enhancement("last"),
  ]);
  const result = addTraitModifier(source, enhancement("middle"), 1);

  assert.deepEqual(result.map(item => item.id), ["first", "middle", "last"]);
  assert.deepEqual(source.map(item => item.id), ["first", "last"]);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result[1]), true);
});

test("edits fields while preserving id and rejects id replacement", () => {
  const source = createTraitModifiers([enhancement("editable", 10)]);
  const result = editTraitModifier(source, "editable", {
    name: "Editado",
    value: 25,
    notes: "Atualizado",
  });

  assert.equal(result[0].id, "editable");
  assert.equal(result[0].name, "Editado");
  assert.equal(result[0].value, 25);
  assert.equal(source[0].value, 10);
  assert.throws(
    () => editTraitModifier(source, "editable", { id: "replacement" }),
    /must preserve id/,
  );
});

test("removes and reorders modifiers deterministically", () => {
  const source = createTraitModifiers([
    enhancement("a"),
    enhancement("b"),
    enhancement("c"),
  ]);
  const reordered = reorderTraitModifier(source, "c", 0);
  const removed = removeTraitModifier(reordered, "b");

  assert.deepEqual(reordered.map(item => item.id), ["c", "a", "b"]);
  assert.deepEqual(removed.map(item => item.id), ["c", "a"]);
  assert.deepEqual(source.map(item => item.id), ["a", "b", "c"]);
});

test("enables and disables canonical modifiers consumed by the cost engine", () => {
  const source = createTraitModifiers([enhancement("toggle", 50)]);
  const disabled = setTraitModifierEnabled(source, "toggle", false);
  const enabled = setTraitModifierEnabled(disabled, "toggle", true);
  const base = {
    id: "trait-command-integration",
    role: "advantage",
    name: "Comandos",
    pointValue: { basePoints: 100 },
  };

  assert.equal(disabled[0].enabled, false);
  assert.equal(enabled[0].enabled, true);
  assert.equal(
    evaluateTraitModifierCost(createTrait({ ...base, modifiers: disabled }))
      .calculatedPoints,
    100,
  );
  assert.equal(
    evaluateTraitModifierCost(createTrait({ ...base, modifiers: enabled }))
      .calculatedPoints,
    150,
  );
});

test("applies command batches atomically and rejects invalid intermediate state", () => {
  const source = createTraitModifiers([
    enhancement("first", 10),
    enhancement("second", 20),
  ]);

  assert.throws(
    () => applyTraitModifierCommands(source, [
      {
        type: "edit",
        id: "first",
        patch: { value: 30 },
      },
      {
        type: "add",
        modifier: enhancement("second", 40),
      },
    ]),
    /Duplicate Trait modifier id/,
  );

  assert.deepEqual(source.map(item => [item.id, item.value]), [
    ["first", 10],
    ["second", 20],
  ]);
});

test("rejects missing ids, invalid indexes and invalid command payloads", () => {
  const source = createTraitModifiers([enhancement("only")]);

  assert.throws(
    () => removeTraitModifier(source, "missing"),
    /id not found/,
  );
  assert.throws(
    () => reorderTraitModifier(source, "only", 1),
    /destination index is invalid/,
  );
  assert.throws(
    () => setTraitModifierEnabled(source, "only", "yes"),
    /enabled state must be boolean/,
  );
  assert.throws(
    () => applyTraitModifierCommands(source, [{ type: "invented" }]),
    /command type is invalid/,
  );
});
