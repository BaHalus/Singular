import test from "node:test";
import assert from "node:assert/strict";

import {
  createTraitModifiers,
  isCanonicalPercentageModifier,
  serializeTraitModifiers,
} from "./TraitModifiers.js";
import { createTrait, serializeTrait } from "./Traits.js";
import { createCharacter, serializeCharacter } from "./Character.js";

function enhancement(overrides = {}) {
  return {
    id: "modifier-area-effect",
    name: "Área de Efeito",
    kind: "enhancement",
    valueType: "percentage",
    value: 50,
    source: { book: "B", page: 102 },
    notes: "Raio ampliado",
    ...overrides,
  };
}

function limitation(overrides = {}) {
  return {
    id: "modifier-limited-use",
    name: "Uso Limitado",
    kind: "limitation",
    valueType: "percentage",
    value: 20,
    source: null,
    notes: "Três usos por dia",
    ...overrides,
  };
}

test("creates ordered, immutable enhancement and limitation modifiers", () => {
  const modifiers = createTraitModifiers([
    enhancement(),
    limitation(),
  ]);

  assert.deepEqual(modifiers.map(item => item.id), [
    "modifier-area-effect",
    "modifier-limited-use",
  ]);
  assert.equal(isCanonicalPercentageModifier(modifiers[0]), true);
  assert.equal(isCanonicalPercentageModifier(modifiers[1]), true);
  assert.equal(Object.isFrozen(modifiers), true);
  assert.equal(Object.isFrozen(modifiers[0]), true);
  assert.equal(Object.isFrozen(modifiers[0].source), true);
});

test("rejects duplicate ids inside one trait modifier collection", () => {
  assert.throws(
    () => createTraitModifiers([
      enhancement(),
      limitation({ id: "modifier-area-effect" }),
    ]),
    /Duplicate Trait modifier id/,
  );
});

test("validates kind, percentage, source and notes", () => {
  assert.throws(
    () => createTraitModifiers([enhancement({ kind: "fixed" })]),
    /kind must be enhancement or limitation/,
  );
  assert.throws(
    () => createTraitModifiers([enhancement({ value: 0 })]),
    /percentage must be a positive finite number/,
  );
  assert.throws(
    () => createTraitModifiers([enhancement({ source: "B102" })]),
    /source must be object or null/,
  );
  assert.throws(
    () => createTraitModifiers([enhancement({ notes: 42 })]),
    /notes must be string/,
  );
});

test("serializes without sharing nested modifier references", () => {
  const modifiers = createTraitModifiers([enhancement()]);
  const serialized = serializeTraitModifiers(modifiers);

  assert.deepEqual(serialized, [enhancement()]);
  assert.notEqual(serialized[0], modifiers[0]);
  assert.notEqual(serialized[0].source, modifiers[0].source);
});

test("Trait defaults to an empty canonical modifier collection", () => {
  const trait = createTrait({
    id: "trait-alpha-compatible",
    role: "advantage",
    name: "Traço Alpha",
  });

  assert.deepEqual(trait.modifiers, []);
  assert.deepEqual(serializeTrait(trait).modifiers, []);
});

test("Trait and Character roundtrip preserve modifier order and fields", () => {
  const character = createCharacter({
    traits: [{
      id: "trait-innate-attack",
      role: "advantage",
      name: "Ataque Inato",
      points: 25,
      modifiers: [enhancement(), limitation()],
    }],
  });
  const serialized = serializeCharacter(character);
  const restored = createCharacter(structuredClone(serialized));

  assert.deepEqual(
    restored.traits[0].modifiers.map(item => item.id),
    ["modifier-area-effect", "modifier-limited-use"],
  );
  assert.deepEqual(serializeCharacter(restored), serialized);
});

test("preserves pre-M1 opaque imported modifiers without heuristic migration", () => {
  const legacyModifier = {
    id: "legacy-gcs-modifier",
    name: "Imported modifier",
    cost: "-10%",
    notes: "Opaque legacy payload",
  };
  const trait = createTrait({
    id: "trait-imported",
    role: "advantage",
    name: "Importado",
    modifiers: [legacyModifier],
  });

  assert.deepEqual(serializeTrait(trait).modifiers, [legacyModifier]);
  assert.equal(isCanonicalPercentageModifier(trait.modifiers[0]), false);
});
