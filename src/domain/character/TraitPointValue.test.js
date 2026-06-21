import test from "node:test";
import assert from "node:assert/strict";

import {
  createTraitPointValue,
  validateTraitPointValue,
  serializeTraitPointValue,
} from "./TraitPointValue.js";


test("maps singular legacy points to declared authority", () => {
  const pointValue = createTraitPointValue(null, {
    points: 15,
    levels: null,
    sourceKind: "singular",
  });

  assert.equal(pointValue.mode, "total");
  assert.equal(pointValue.legacyPoints, 15);
  assert.equal(pointValue.declaredPoints, 15);
  assert.equal(pointValue.importedPoints, null);
  assert.equal(pointValue.calculatedPoints, null);
  assert.equal(pointValue.complete, true);
  assert.equal(pointValue.reconciliation.status, "declared-only");
});


test("maps imported legacy points to imported authority", () => {
  const pointValue = createTraitPointValue(null, {
    points: -10,
    levels: null,
    sourceKind: "imported",
  });

  assert.equal(pointValue.legacyPoints, -10);
  assert.equal(pointValue.declaredPoints, null);
  assert.equal(pointValue.importedPoints, -10);
  assert.equal(pointValue.reconciliation.status, "imported-only");
});


test("keeps unknown-source legacy points as compatibility evidence only", () => {
  const pointValue = createTraitPointValue(null, {
    points: 5,
    levels: null,
    sourceKind: "unknown",
  });

  assert.equal(pointValue.legacyPoints, 5);
  assert.equal(pointValue.declaredPoints, null);
  assert.equal(pointValue.importedPoints, null);
  assert.equal(pointValue.calculatedPoints, null);
  assert.equal(pointValue.reconciliation.status, "legacy-only");
});


test("reconciles matching declared imported and calculated authorities", () => {
  const pointValue = createTraitPointValue({
    declaredPoints: 20,
    importedPoints: 20,
    calculatedPoints: 20,
  }, {
    points: null,
    sourceKind: "singular",
  });

  assert.equal(pointValue.reconciliation.status, "reconciled");
  assert.deepEqual(pointValue.reconciliation.differences, {
    importedMinusDeclared: 0,
    calculatedMinusDeclared: 0,
    calculatedMinusImported: 0,
  });
});


test("reports divergence without selecting an effective value", () => {
  const pointValue = createTraitPointValue({
    declaredPoints: 10,
    importedPoints: 12,
    calculatedPoints: 15,
  });

  assert.equal(pointValue.reconciliation.status, "divergent");
  assert.deepEqual(pointValue.reconciliation.differences, {
    importedMinusDeclared: 2,
    calculatedMinusDeclared: 5,
    calculatedMinusImported: 3,
  });
  assert.equal(Object.hasOwn(pointValue, "effectivePoints"), false);
});


test("preserves leveled declarations without calculating a total", () => {
  const pointValue = createTraitPointValue({
    basePoints: 5,
    pointsPerLevel: 10,
    levels: 3,
  });

  assert.equal(pointValue.mode, "base-plus-levels");
  assert.equal(pointValue.complete, true);
  assert.equal(pointValue.calculatedPoints, null);
  assert.equal(pointValue.reconciliation.status, "unknown");
});


test("marks incomplete per-level declarations explicitly", () => {
  const pointValue = createTraitPointValue({
    mode: "per-level",
    pointsPerLevel: 5,
    levels: null,
  });

  assert.equal(pointValue.complete, false);
});


test("explicit null authority prevents fallback from legacy points", () => {
  const pointValue = createTraitPointValue({
    importedPoints: null,
  }, {
    points: 25,
    sourceKind: "imported",
  });

  assert.equal(pointValue.legacyPoints, 25);
  assert.equal(pointValue.importedPoints, null);
  assert.equal(pointValue.reconciliation.status, "legacy-only");
});


test("negative and fractional values remain valid declarations", () => {
  const pointValue = createTraitPointValue({
    basePoints: -5,
    pointsPerLevel: -2.5,
    levels: 1.5,
    declaredPoints: -8.75,
  });

  assert.equal(validateTraitPointValue(pointValue), true);
  assert.equal(pointValue.declaredPoints, -8.75);
});


test("preserves unknown top-level metadata in round trip", () => {
  const pointValue = createTraitPointValue({
    declaredPoints: 1,
    futureAuthority: {
      provider: "campaign",
    },
  });
  const serialized = serializeTraitPointValue(pointValue);

  assert.deepEqual(serialized.futureAuthority, {
    provider: "campaign",
  });
});


test("rejects stale reconciliation and completeness", () => {
  const pointValue = createTraitPointValue({
    declaredPoints: 10,
    importedPoints: 10,
  });
  const staleReconciliation = structuredClone(pointValue);
  staleReconciliation.reconciliation.status = "divergent";
  const staleCompleteness = structuredClone(pointValue);
  staleCompleteness.complete = false;

  assert.throws(
    () => validateTraitPointValue(staleReconciliation),
    /stale or inconsistent/,
  );
  assert.throws(
    () => validateTraitPointValue(staleCompleteness),
    /stale or inconsistent/,
  );
});
