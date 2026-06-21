import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "./Character.js";
import {
  createTrait,
  projectTraitsByRole,
  serializeTrait,
} from "./Traits.js";


test("canonical Trait persists structured point value", () => {
  const trait = createTrait({
    id: "trait-point-value",
    role: "advantage",
    name: "Aptidão",
    points: 10,
    pointValue: {
      basePoints: 5,
      pointsPerLevel: 5,
      levels: 1,
      declaredPoints: 10,
    },
  });
  const serialized = serializeTrait(trait);

  assert.equal(serialized.pointValue.mode, "base-plus-levels");
  assert.equal(serialized.pointValue.declaredPoints, 10);
  assert.equal(serialized.pointValue.calculatedPoints, null);
});


test("legacy projections keep their historical shape without pointValue", () => {
  const trait = createTrait({
    id: "trait-legacy-projection",
    role: "advantage",
    name: "Projeção",
    points: 5,
    pointValue: {
      declaredPoints: 5,
    },
  });
  const projection = projectTraitsByRole([trait]).advantages[0];

  assert.equal(Object.hasOwn(projection, "pointValue"), false);
  assert.equal(projection.points, 5);
});


test("legacy edit preserves canonical source and point value for the same id", () => {
  const original = createCharacter({
    traits: [
      {
        id: "adv-imported-preserved",
        role: "advantage",
        name: "Nome original",
        points: 15,
        source: {
          kind: "imported",
          provider: "gcs",
          format: "gcs",
          reference: "B00",
          version: 2,
        },
        pointValue: {
          importedPoints: 15,
          calculatedPoints: 15,
        },
      },
    ],
  });
  const edited = createCharacter({
    ...original,
    advantages: original.advantages.map(item => ({
      ...item,
      name: "Nome editado",
    })),
  });

  assert.equal(edited.traits[0].name, "Nome editado");
  assert.equal(edited.traits[0].source.kind, "imported");
  assert.equal(edited.traits[0].source.provider, "gcs");
  assert.equal(edited.traits[0].pointValue.importedPoints, 15);
  assert.equal(edited.traits[0].pointValue.calculatedPoints, 15);
  assert.equal(edited.traits[0].pointValue.reconciliation.status, "reconciled");
});


test("new legacy trait receives a new singular declaration", () => {
  const original = createCharacter();
  const edited = createCharacter({
    ...original,
    advantages: [
      {
        id: "adv-new-legacy",
        name: "Nova vantagem",
        points: 10,
      },
    ],
  });

  assert.equal(edited.traits[0].source.kind, "singular");
  assert.equal(edited.traits[0].pointValue.declaredPoints, 10);
  assert.equal(edited.traits[0].pointValue.reconciliation.status, "declared-only");
});


test("Character save/load preserves point authorities and reconciliation", () => {
  const original = createCharacter({
    traits: [
      {
        id: "trait-roundtrip-points",
        role: "disadvantage",
        name: "Divergente",
        points: -10,
        source: {
          kind: "imported",
          provider: "gcs",
          format: "gcs",
          reference: null,
          version: 2,
        },
        pointValue: {
          importedPoints: -10,
          calculatedPoints: -15,
        },
      },
    ],
  });
  const serialized = serializeCharacter(original);
  const restored = createCharacter(structuredClone(serialized));

  assert.equal(
    serialized.traits[0].pointValue.reconciliation.status,
    "divergent",
  );
  assert.deepEqual(serializeCharacter(restored), serialized);
});


test("editing one legacy role preserves canonical-only data in other roles", () => {
  const original = createCharacter({
    traits: [
      {
        id: "adv-edit-role",
        role: "advantage",
        name: "Vantagem",
        points: 5,
        pointValue: {
          declaredPoints: 5,
        },
      },
      {
        id: "disadv-keep-role",
        role: "disadvantage",
        name: "Desvantagem",
        points: -10,
        pointValue: {
          declaredPoints: -10,
          calculatedPoints: -10,
        },
      },
    ],
  });
  const edited = createCharacter({
    ...original,
    advantages: original.advantages.map(item => ({
      ...item,
      points: 10,
    })),
  });
  const disadvantage = edited.traits.find(item => item.id === "disadv-keep-role");

  assert.equal(disadvantage.pointValue.calculatedPoints, -10);
  assert.equal(disadvantage.pointValue.reconciliation.status, "reconciled");
});
