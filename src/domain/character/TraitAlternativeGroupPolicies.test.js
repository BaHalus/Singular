import test from "node:test";
import assert from "node:assert/strict";

import {
  createTraitAlternativeGroupPolicies,
  projectTraitAlternativeGroupPolicies,
  serializeTraitAlternativeGroupPolicies,
} from "./TraitAlternativeGroupPolicies.js";
import {
  createCharacter,
  serializeCharacter,
} from "./Character.js";

function groupedTrait(id, groupId) {
  return {
    id,
    role: "advantage",
    name: id,
    alternateGroupId: groupId,
    pointValue: {
      mode: "total",
      basePoints: 10,
    },
  };
}

test("derives default policies for referenced legacy groups", () => {
  const character = createCharacter({
    traits: [
      groupedTrait("ability-a", "group-default"),
      groupedTrait("ability-b", "group-default"),
    ],
  });

  assert.equal(character.traitAlternativeGroups.length, 1);
  assert.equal(character.traitAlternativeGroups[0].id, "group-default");
  assert.equal(character.traitAlternativeGroups[0].alternativeFactor, 0.2);
  assert.equal(character.traitAlternativeGroups[0].roundCostDown, false);
  assert.equal(character.traitAlternativeGroups[0].source.kind, "singular");
});

test("preserves explicit policy provenance and raw data", () => {
  const policies = createTraitAlternativeGroupPolicies([{
    id: "group-imported",
    externalIds: {
      gcs: "container-gcs",
    },
    alternativeFactor: 0.25,
    roundCostDown: true,
    source: {
      kind: "imported",
      provider: "gcs",
      format: "gcs",
      reference: "P00",
      version: 5,
    },
    importMeta: {
      source: "gcs",
    },
    raw: {
      container_type: "alternative_abilities",
    },
  }]);

  assert.deepEqual(
    serializeTraitAlternativeGroupPolicies(policies)[0],
    {
      id: "group-imported",
      externalIds: {
        gcs: "container-gcs",
      },
      alternativeFactor: 0.25,
      roundCostDown: true,
      source: {
        kind: "imported",
        provider: "gcs",
        format: "gcs",
        reference: "P00",
        version: 5,
      },
      importMeta: {
        source: "gcs",
      },
      raw: {
        container_type: "alternative_abilities",
      },
    },
  );
});

test("projects policies into the evaluator input by group id", () => {
  const policies = createTraitAlternativeGroupPolicies([{
    id: "group-projection",
    alternativeFactor: 0.3,
    roundCostDown: true,
  }]);

  assert.deepEqual(projectTraitAlternativeGroupPolicies(policies), {
    "group-projection": {
      alternativeFactor: 0.3,
      roundCostDown: true,
    },
  });
});

test("rejects duplicate policies and invalid factors", () => {
  assert.throws(
    () => createTraitAlternativeGroupPolicies([
      { id: "duplicate" },
      { id: "duplicate" },
    ]),
    /Duplicate Trait alternative group id/,
  );
  assert.throws(
    () => createTraitAlternativeGroupPolicies([{
      id: "invalid-factor",
      alternativeFactor: 1.2,
    }]),
    /between 0 and 1/,
  );
});

test("Character save/load preserves group policies", () => {
  const original = createCharacter({
    traits: [
      groupedTrait("ability-a", "group-roundtrip"),
      groupedTrait("ability-b", "group-roundtrip"),
    ],
    traitAlternativeGroups: [{
      id: "group-roundtrip",
      alternativeFactor: 0.2,
      roundCostDown: true,
    }],
  });
  const serialized = serializeCharacter(original);
  const restored = createCharacter(structuredClone(serialized));

  assert.deepEqual(serializeCharacter(restored), serialized);
  assert.equal(restored.traitAlternativeGroups[0].roundCostDown, true);
  assert.equal(Object.isFrozen(restored.traitAlternativeGroups), true);
});
