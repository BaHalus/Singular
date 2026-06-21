import test from "node:test";
import assert from "node:assert/strict";

import { createTemplate } from "./Templates.js";
import {
  evaluateTemplatePointReconciliation,
} from "./TemplatePointReconciliation.js";

test("unit point reconciliation is deeply immutable", () => {
  const result = evaluateTemplatePointReconciliation(createTemplate({
    id: "template-immutable-reconciliation",
    importedPoints: 12,
    calculatedPoints: 10,
  }));

  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.diagnostics), true);
  assert.equal(Object.isFrozen(result.diagnostics[0]), true);
  assert.throws(() => {
    result.diagnostics[0].code = "changed";
  }, TypeError);
});
