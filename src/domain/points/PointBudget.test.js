import test from "node:test";
import assert from "node:assert/strict";

import {
  createPointBudget,
  evaluatePointBudget,
} from "./PointBudget.js";

test("preserves whitespace-only budget fields as unknown", () => {
  const budget = createPointBudget({
    declaredPoints: " \t",
    importedPoints: "\n",
    importedUnspentPoints: "   ",
  });
  const evaluation = evaluatePointBudget(budget, 0);

  assert.equal(budget.declaredPoints, null);
  assert.equal(budget.importedPoints, null);
  assert.equal(budget.importedUnspentPoints, null);
  assert.equal(evaluation.status, "unknown");
  assert.equal(evaluation.complete, false);
  assert.equal(evaluation.effectivePoints, null);
  assert.equal(evaluation.calculatedUnspentPoints, null);
  assert.ok(evaluation.diagnostics.some(item => (
    item.code === "point-budget-unknown"
  )));
});
