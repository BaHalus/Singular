import test from "node:test";
import assert from "node:assert/strict";

import {
  createTrait,
  createTraits,
  createTraitsFromCharacterInput,
  projectTraitsByRole,
  serializeTraits,
  validateTraitProjections,
} from "./Traits.js";
import {
  createCharacter,
  serializeCharacter,
} from "./Character.js";

function legacyTrait(id, name, points = null) {
  return {
    id,
    externalIds: {},
    name,
    notes: "",
    tags: [],
    points,
    levels: null,
    modifiers: [],
    features: [],
    weapons: [],
    prereqs: null,
    importMeta: null,
    power: null,
    alternateGroupId: null,
    isPrimaryAlternative: null,
    raw: null,
  };
}

test("creates a canonical trait with role and source", () => {
  const trait = createTrait({
    id: "trait-combat-reflexes",
    role: "advantage",
    name: "Reflexos em Combate",
    points: 15,
  });

  assert.equal(trait.role, "advantage");
  assert.equal(trait.source.kind, "singular");
  assert.equal(trait.points, 15);
  assert.equal(Object.isFrozen(trait), true);
  assert.equal(Object.isFrozen(trait.source), true);
});

test("preserves imported provenance and unknown roles", () => {
  const trait = createTrait({
    id: "trait-future",
    role: "future-role",
    name: "Trait futuro",
    importMeta: {
      source: "gcs",
      reference: "B00",
    },
    raw: {
      futureRule: true,
    },
  });

  assert.equal(trait.role, "future-role");
  assert.equal(trait.source.kind, "imported");
  assert.equal(trait.source.provider, "gcs");
  assert.equal(trait.source.reference, "B00");
  assert.equal(trait.raw.futureRule, true);
});

test("rejects duplicate sovereign ids across roles", () => {
  assert.throws(() => createTraits([
    {
      id: "shared-trait-id",
      role: "advantage",
      name: "Vantagem",
    },
    {
      id: "shared-trait-id",
      role: "disadvantage",
      name: "Desvantagem",
    },
  ]), /Duplicate Trait id/);
});

test("projects canonical traits to the four legacy collections", () => {
  const traits = createTraits([
    { id: "adv-1", role: "advantage", name: "Vantagem" },
    { id: "perk-1", role: "perk", name: "Qualidade" },
    { id: "disadv-1", role: "disadvantage", name: "Desvantagem" },
    { id: "quirk-1", role: "quirk", name: "Peculiaridade" },
    { id: "future-1", role: "future-role", name: "Futuro" },
  ]);
  const projected = projectTraitsByRole(traits);

  assert.deepEqual(projected.advantages.map(item => item.id), ["adv-1"]);
  assert.deepEqual(projected.perks.map(item => item.id), ["perk-1"]);
  assert.deepEqual(projected.disadvantages.map(item => item.id), ["disadv-1"]);
  assert.deepEqual(projected.quirks.map(item => item.id), ["quirk-1"]);
  assert.equal(
    Object.values(projected).flat().some(item => item.id === "future-1"),
    false,
  );
  assert.equal(validateTraitProjections(traits, projected), true);
});

test("converts legacy character collections into canonical traits", () => {
  const traits = createTraitsFromCharacterInput({
    advantages: [{ id: "adv-legacy", name: "Vantagem antiga" }],
    perks: [{ id: "perk-legacy", name: "Qualidade antiga" }],
    disadvantages: [{ id: "disadv-legacy", name: "Desvantagem antiga" }],
    quirks: [{ id: "quirk-legacy", name: "Peculiaridade antiga" }],
  });

  assert.deepEqual(traits.map(item => item.role), [
    "advantage",
    "perk",
    "disadvantage",
    "quirk",
  ]);
});

test("accepts equivalent canonical and legacy representations", () => {
  const canonical = createTraits([
    {
      id: "adv-equivalent",
      role: "advantage",
      name: "Equivalente",
      source: {
        kind: "imported",
        provider: "gcs",
        format: null,
        reference: null,
        version: null,
      },
    },
  ]);
  const projected = projectTraitsByRole(canonical);
  const result = createTraitsFromCharacterInput({
    traits: serializeTraits(canonical),
    ...projected,
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].source.provider, "gcs");
});

test("legacy role replacement keeps existing character operations compatible", () => {
  const original = createCharacter({
    advantages: [{ id: "adv-old", name: "Antiga" }],
    perks: [{ id: "perk-keep", name: "Mantida" }],
  });
  const changed = createCharacter({
    ...original,
    advantages: [{ id: "adv-new", name: "Nova" }],
  });

  assert.deepEqual(changed.advantages.map(item => item.id), ["adv-new"]);
  assert.deepEqual(changed.perks.map(item => item.id), ["perk-keep"]);
  assert.deepEqual(changed.traits.map(item => item.id), ["perk-keep", "adv-new"]);
});

test("Character exposes canonical traits and derived legacy projections", () => {
  const character = createCharacter({
    traits: [
      {
        id: "adv-canonical",
        role: "advantage",
        name: "Canônica",
      },
      {
        id: "unknown-canonical",
        role: "future-role",
        name: "Desconhecida",
      },
    ],
  });

  assert.equal(character.traits.length, 2);
  assert.deepEqual(character.advantages.map(item => item.id), ["adv-canonical"]);
  assert.deepEqual(character.perks, []);
  assert.equal(character.traits[1].role, "future-role");
});

test("Character save/load preserves canonical and compatibility representations", () => {
  const original = createCharacter({
    traits: [
      {
        id: "adv-roundtrip",
        role: "advantage",
        name: "Round trip",
        points: 10,
        source: {
          kind: "imported",
          provider: "gcs",
          format: "gcs",
          reference: "B10",
          version: 2,
        },
      },
    ],
  });
  const serialized = serializeCharacter(original);
  const restored = createCharacter(structuredClone(serialized));

  assert.equal(serialized.traits[0].role, "advantage");
  assert.equal(serialized.advantages[0].name, "Round trip");
  assert.deepEqual(serializeCharacter(restored), serialized);
});

test("projection divergence is detected after direct mutation", () => {
  const traits = createTraits([
    { id: "adv-stable", role: "advantage", name: "Estável" },
  ]);
  const projections = projectTraitsByRole(traits);
  projections.advantages[0].name = "Alterada fora do agregado";

  assert.throws(
    () => validateTraitProjections(traits, projections),
    /diverges from canonical traits/,
  );
});

test("legacy serialization shape remains stable", () => {
  const character = createCharacter({
    advantages: [legacyTrait("adv-shape", "Forma legada", 5)],
  });
  const serialized = serializeCharacter(character);

  assert.deepEqual(serialized.advantages[0], legacyTrait(
    "adv-shape",
    "Forma legada",
    5,
  ));
});
