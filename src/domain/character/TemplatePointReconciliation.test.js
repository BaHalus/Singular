import test from "node:test";
import assert from "node:assert/strict";

import { createTemplate } from "./Templates.js";
import {
  evaluateTemplatePointReconciliation,
  getTemplatePointReconciliationStatuses,
  serializeTemplatePointReconciliation,
  withTemplateCalculatedPoints,
} from "./TemplatePointReconciliation.js";

test("keeps unknown imported-only and calculated-only states distinct", () => {
  const unknown = evaluateTemplatePointReconciliation(createTemplate({
    id: "template-unknown",
  }));
  const imported = evaluateTemplatePointReconciliation(createTemplate({
    id: "template-imported",
    importedPoints: 25,
  }));
  const calculated = evaluateTemplatePointReconciliation(createTemplate({
    id: "template-calculated",
    calculatedPoints: 30,
  }));

  assert.equal(unknown.status, "unknown");
  assert.equal(unknown.complete, false);
  assert.equal(unknown.difference, null);
  assert.equal(unknown.diagnostics[0].code, "template-points-unknown");
  assert.equal(imported.status, "imported-only");
  assert.equal(imported.diagnostics[0].code, "template-calculated-points-missing");
  assert.equal(calculated.status, "calculated-only");
  assert.equal(calculated.diagnostics[0].code, "template-imported-points-missing");
});

test("reconciles equal values without overwriting either authority", () => {
  const template = createTemplate({
    id: "template-equal",
    importedPoints: 40,
    calculatedPoints: 40,
  });
  const result = evaluateTemplatePointReconciliation(template);

  assert.equal(result.status, "reconciled");
  assert.equal(result.complete, true);
  assert.equal(result.reconciled, true);
  assert.equal(result.difference, 0);
  assert.equal(result.absoluteDifference, 0);
  assert.equal(template.importedPoints, 40);
  assert.equal(template.calculatedPoints, 40);
});

test("exposes signed divergence including negative template costs", () => {
  const positive = evaluateTemplatePointReconciliation(createTemplate({
    id: "template-positive",
    importedPoints: 45,
    calculatedPoints: 52,
  }));
  const negative = evaluateTemplatePointReconciliation(createTemplate({
    id: "template-negative",
    importedPoints: -20,
    calculatedPoints: -25,
  }));

  assert.equal(positive.status, "divergent");
  assert.equal(positive.difference, 7);
  assert.equal(positive.absoluteDifference, 7);
  assert.equal(positive.diagnostics[0].code, "template-points-divergent");
  assert.equal(negative.status, "divergent");
  assert.equal(negative.difference, -5);
  assert.equal(negative.absoluteDifference, 5);
});

test("records calculated points immutably and preserves imported points", () => {
  const original = createTemplate({
    id: "template-record",
    importedPoints: 50,
  });
  const recorded = withTemplateCalculatedPoints(original, 47);
  const cleared = withTemplateCalculatedPoints(recorded.template, null);

  assert.equal(original.calculatedPoints, null);
  assert.equal(recorded.template.importedPoints, 50);
  assert.equal(recorded.template.calculatedPoints, 47);
  assert.equal(recorded.reconciliation.status, "divergent");
  assert.equal(recorded.reconciliation.difference, -3);
  assert.equal(cleared.template.importedPoints, 50);
  assert.equal(cleared.template.calculatedPoints, null);
  assert.equal(cleared.reconciliation.status, "imported-only");
  assert.equal(Object.isFrozen(recorded), true);
});

test("rejects non-finite calculated values", () => {
  const template = createTemplate({ id: "template-invalid" });

  assert.throws(
    () => withTemplateCalculatedPoints(template, Number.NaN),
    /finite number or null/,
  );
  assert.throws(
    () => withTemplateCalculatedPoints(template, Number.POSITIVE_INFINITY),
    /finite number or null/,
  );
});

test("serializes detached results and exposes stable status vocabulary", () => {
  const result = evaluateTemplatePointReconciliation(createTemplate({
    id: "template-serialized",
    importedPoints: 12,
    calculatedPoints: 10,
  }));
  const serialized = serializeTemplatePointReconciliation(result);
  serialized.diagnostics[0].code = "changed";

  assert.equal(result.diagnostics[0].code, "template-points-divergent");
  assert.deepEqual(getTemplatePointReconciliationStatuses(), [
    "unknown",
    "imported-only",
    "calculated-only",
    "partial",
    "reconciled",
    "divergent",
  ]);
});
