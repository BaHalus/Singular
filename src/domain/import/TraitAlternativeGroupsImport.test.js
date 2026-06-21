import test from "node:test";
import assert from "node:assert/strict";

import {
  createSnapshotFromGcs,
  importCharacterWithDiagnostics,
} from "./CharacterImporter.js";
import { serializeCharacter } from "../character/Character.js";

function source() {
  return {
    id: "character-alternative-groups",
    profile: {
      name: "Grupos alternativos",
    },
    traits: [{
      type: "trait_container",
      id: "container-alternative",
      name: "Habilidades Alternativas",
      container_type: "alternative_abilities",
      round_down: true,
      reference: "P11",
      children: [
        {
          type: "advantage",
          id: "ability-primary",
          name: "Habilidade principal",
          base_points: 20,
          calc: {
            points: 20,
          },
          tags: ["Advantage"],
        },
        {
          type: "advantage",
          id: "ability-secondary",
          name: "Habilidade alternativa",
          base_points: 7,
          calc: {
            points: 7,
          },
          tags: ["Advantage"],
        },
      ],
    }],
  };
}

test("snapshot preserves the alternative container and annotates member identity", () => {
  const snapshot = createSnapshotFromGcs(source(), {
    now: "2026-06-21T16:30:00.000Z",
  });

  assert.equal(snapshot.traits.alternativeGroups.length, 1);
  assert.equal(snapshot.traits.alternativeGroups[0].id, "container-alternative");
  assert.equal(snapshot.traits.alternativeGroups[0].alternativeFactor, 0.2);
  assert.equal(snapshot.traits.alternativeGroups[0].roundCostDown, true);
  assert.equal(snapshot.traits.alternativeGroups[0].source.provider, "gcs");
  assert.deepEqual(
    snapshot.traits.advantages.map(trait => trait.alternateGroupId),
    ["container-alternative", "container-alternative"],
  );
  assert.deepEqual(
    snapshot.traits.advantages.map(trait => trait.isPrimaryAlternative),
    [null, null],
  );
});

test("Character import materializes and round-trips the group policy", () => {
  const imported = importCharacterWithDiagnostics(source(), {
    now: "2026-06-21T16:30:00.000Z",
  });
  const character = imported.character;
  const serialized = serializeCharacter(character);

  assert.equal(character.traitAlternativeGroups.length, 1);
  assert.equal(character.traitAlternativeGroups[0].id, "container-alternative");
  assert.equal(character.traitAlternativeGroups[0].roundCostDown, true);
  assert.deepEqual(
    character.traits.map(trait => trait.alternateGroupId),
    ["container-alternative", "container-alternative"],
  );
  assert.deepEqual(
    serialized.traitAlternativeGroups,
    character.traitAlternativeGroups,
  );
});

test("nearest nested alternative container owns the member", () => {
  const nested = source();
  nested.traits[0].children = [{
    type: "trait_container",
    id: "nested-alternative",
    name: "Alternative Abilities",
    container_type: "alternative_abilities",
    children: nested.traits[0].children,
  }];

  const snapshot = createSnapshotFromGcs(nested, {
    now: "2026-06-21T16:30:00.000Z",
  });

  assert.equal(snapshot.traits.alternativeGroups.length, 2);
  assert.deepEqual(
    snapshot.traits.advantages.map(trait => trait.alternateGroupId),
    ["nested-alternative", "nested-alternative"],
  );
});
