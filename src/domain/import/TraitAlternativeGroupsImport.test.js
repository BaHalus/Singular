import test from "node:test";
import assert from "node:assert/strict";

import {
  createSnapshotFromGcs,
  importCharacterWithDiagnostics,
} from "./CharacterImporter.js";
import {
  createCharacter,
  serializeCharacter,
} from "../character/Character.js";
import {
  analyzeTraitCostAuthority,
} from "../character/TraitCostAuthorityAnalysis.js";
import {
  executeTraitCostAuthorityPlan,
} from "../character/TraitCostAuthorityExecutor.js";
import {
  planTraitCostAuthority,
} from "../character/TraitCostAuthorityPlan.js";

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

test("container name alone does not establish alternative-group identity", () => {
  const namedOnly = source();
  delete namedOnly.traits[0].container_type;

  const snapshot = createSnapshotFromGcs(namedOnly, {
    now: "2026-06-21T16:30:00.000Z",
  });

  assert.equal(snapshot.traits.alternativeGroups.length, 0);
  assert.deepEqual(
    snapshot.traits.advantages.map(trait => trait.alternateGroupId ?? null),
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

test("imported group reaches final authority without erasing imported points", () => {
  const imported = importCharacterWithDiagnostics(source(), {
    now: "2026-06-21T16:30:00.000Z",
  });
  const plan = planTraitCostAuthority(imported.character, {
    now: "2026-06-21T17:10:00.000Z",
    operationId: "operation-imported-group",
    planId: "plan-imported-group",
  });
  const executed = executeTraitCostAuthorityPlan(imported.character, plan, {
    now: "2026-06-21T17:11:00.000Z",
  });
  const primary = executed.character.traits.find(item => (
    item.id === "ability-primary"
  ));
  const secondary = executed.character.traits.find(item => (
    item.id === "ability-secondary"
  ));
  const serialized = serializeCharacter(executed.character);
  const restored = createCharacter(structuredClone(serialized));

  assert.equal(primary.pointValue.importedPoints, 20);
  assert.equal(primary.pointValue.calculatedPoints, 20);
  assert.equal(primary.pointValue.reconciliation.status, "reconciled");
  assert.equal(secondary.pointValue.importedPoints, 7);
  assert.equal(secondary.pointValue.calculatedPoints, 1);
  assert.equal(secondary.pointValue.reconciliation.status, "divergent");
  assert.equal(
    secondary.pointValue.reconciliation.differences.calculatedMinusImported,
    -6,
  );
  assert.equal(
    secondary.pointValue.finalCostAuthority.individualPoints,
    7,
  );
  assert.equal(
    secondary.pointValue.finalCostAuthority.contributionPoints,
    1,
  );
  assert.deepEqual(serializeCharacter(restored), serialized);
  assert.equal(analyzeTraitCostAuthority(restored).status, "no-op");
});
