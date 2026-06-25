import test from "node:test";
import assert from "node:assert/strict";

import {
  createSnapshotFromGcs,
  importCharacter,
  importCharacterWithDiagnostics,
} from "./CharacterImporter.js";

function powerSource(overrides = {}) {
  return {
    id: "character-power-import",
    profile: {
      name: "Importado com Poder",
    },
    rows: [
      {
        id: "power-fire",
        type: "trait_container",
        container_type: "power",
        name: "Poder do Fogo",
        power_source: "Fogo",
        talent_trait_id: "trait-fire-talent",
        power_modifier: {
          name: "Poder do Fogo",
          value_percent: -10,
        },
        children: [
          {
            id: "trait-fire-talent",
            name: "Talento do Fogo",
            base_points: 5,
            tags: ["Vantagem"],
          },
          {
            id: "trait-burning-attack",
            name: "Ataque Ardente",
            base_points: 20,
            tags: ["Vantagem"],
          },
        ],
      },
    ],
    ...overrides,
  };
}

test("adds imported Powers and diagnostics to ImportSnapshot", () => {
  const snapshot = createSnapshotFromGcs(powerSource());

  assert.equal(snapshot.powers.length, 1);
  assert.deepEqual(snapshot.powers[0].memberTraitIds, [
    "trait-burning-attack",
  ]);
  assert.equal(snapshot.powers[0].talentTraitId, "trait-fire-talent");
  assert.equal(snapshot.powers[0].source, "Fogo");
  assert.deepEqual(snapshot.powers[0].powerModifier, {
    name: "Poder do Fogo",
    valuePercent: -10,
    notes: "",
  });
  assert.deepEqual(snapshot.unresolvedPowerLinks, []);
});

test("imports Powers into the canonical Character", () => {
  const character = importCharacter(powerSource());

  assert.equal(character.powers.length, 1);
  assert.equal(character.powers[0].id, "power-fire");
  assert.equal(character.powers[0].talentTraitId, "trait-fire-talent");
  assert.deepEqual(character.powers[0].memberTraitIds, [
    "trait-burning-attack",
  ]);
  assert.deepEqual(
    character.traits.map(trait => trait.id),
    ["trait-fire-talent", "trait-burning-attack"],
  );
});

test("preserves unresolved Power links without invalidating Character import", () => {
  const source = powerSource({
    rows: [
      {
        id: "power-unresolved",
        type: "trait_container",
        container_type: "power",
        name: "Poder sem Talento Resolvido",
        talent_trait_id: "missing-talent",
        children: [
          {
            id: "trait-member",
            name: "Habilidade",
            base_points: 10,
          },
        ],
      },
    ],
  });

  const result = importCharacterWithDiagnostics(source);

  assert.equal(result.character.powers[0].talentTraitId, null);
  assert.deepEqual(result.character.powers[0].memberTraitIds, ["trait-member"]);
  assert.deepEqual(result.snapshot.unresolvedPowerLinks, [
    {
      powerId: "power-unresolved",
      kind: "talent-trait",
      externalTraitId: "missing-talent",
    },
  ]);
});

test("does not infer a Power talent from a Trait name", () => {
  const source = powerSource({
    rows: [
      {
        id: "power-name-only",
        type: "trait_container",
        container_type: "power",
        name: "Poder do Fogo",
        children: [
          {
            id: "trait-name-only",
            name: "Talento do Fogo",
            base_points: 5,
          },
        ],
      },
    ],
  });

  const character = importCharacter(source);

  assert.equal(character.powers[0].talentTraitId, null);
  assert.deepEqual(character.powers[0].memberTraitIds, ["trait-name-only"]);
});

test("keeps Power snapshot fields empty for sources without Powers", () => {
  const snapshot = createSnapshotFromGcs({
    id: "character-without-power",
    profile: { name: "Sem Poder" },
  });

  assert.deepEqual(snapshot.powers, []);
  assert.deepEqual(snapshot.unresolvedPowerLinks, []);
});
