import test from "node:test";
import assert from "node:assert/strict";

import {
  createSnapshotFromGcs,
  importCharacter,
} from "./CharacterImporter.js";
import { importPointBudget } from "./importers/PointBudgetImporter.js";
import {
  createCharacter,
  serializeCharacter,
} from "../character/Character.js";
import {
  createPointBudget,
  evaluatePointBudget,
} from "../points/PointBudget.js";

test("imports equal aliases as one external budget authority", () => {
  const imported = importPointBudget({
    total_points: 250,
    totalPoints: "250",
    unspent_points: 15,
    profile: {
      unspentPoints: "15",
    },
    version: 5,
  });
  const budget = createPointBudget(imported);
  const evaluation = evaluatePointBudget(budget, 235);

  assert.equal(imported.importedPoints, 250);
  assert.equal(imported.importedUnspentPoints, 15);
  assert.equal(imported.importMeta.status, "ready");
  assert.equal(imported.importMeta.totalPointCandidates.length, 2);
  assert.equal(evaluation.status, "imported-only");
  assert.equal(evaluation.calculatedUnspentPoints, 15);
  assert.equal(evaluation.importedUnspentDifference, 0);
});

test("preserves divergent aliases as conflict instead of choosing precedence", () => {
  const imported = importPointBudget({
    total_points: 250,
    profile: {
      totalPoints: 275,
    },
  });
  const budget = createPointBudget(imported);
  const evaluation = evaluatePointBudget(budget, 200);

  assert.equal(imported.importedPoints, null);
  assert.equal(imported.importMeta.status, "conflict");
  assert.deepEqual(
    imported.importMeta.totalPointCandidates.map(item => item.value),
    [250, 275],
  );
  assert.equal(evaluation.status, "conflict");
  assert.equal(evaluation.effectivePoints, null);
  assert.ok(evaluation.diagnostics.some(item => (
    item.code === "point-budget-import-conflict"
  )));
});

test("records invalid external values without converting them to zero", () => {
  const imported = importPointBudget({
    total_points: "not-a-number",
  });

  assert.equal(imported.importedPoints, null);
  assert.equal(imported.importMeta.status, "conflict");
  assert.equal(
    imported.importMeta.diagnostics[0].code,
    "point-budget-import-value-invalid",
  );
});

test("snapshot and Character preserve imported point budget through save/load", () => {
  const source = {
    id: "character-budget-import",
    profile: {
      name: "Budget Hero",
      total_points_raw: 300,
      unspent_points_raw: 25,
    },
  };
  const snapshot = createSnapshotFromGcs(source);
  const character = importCharacter(source);
  const serialized = serializeCharacter(character);
  const restored = createCharacter(structuredClone(serialized));

  assert.equal(snapshot.pointBudget.importedPoints, 300);
  assert.equal(snapshot.pointBudget.importedUnspentPoints, 25);
  assert.equal(character.pointBudget.importedPoints, 300);
  assert.equal(character.pointBudget.source.provider, "gcs");
  assert.deepEqual(serializeCharacter(restored), serialized);
});

test("standalone template import does not inherit character budget fields", () => {
  const snapshot = createSnapshotFromGcs({
    type: "template",
    total_points: 100,
    id: "template-budget-isolation",
    name: "Template",
  });

  assert.equal(snapshot.pointBudget.importedPoints, null);
  assert.equal(snapshot.pointBudget.source.kind, "unknown");
});
