import test from "node:test";
import assert from "node:assert/strict";

import { createTemplates } from "./Templates.js";
import {
  resolveTemplateComposition,
} from "./TemplateDependencyResolver.js";
import {
  evaluateTemplateCompositionPointReconciliation,
} from "./TemplatePointReconciliation.js";

function reference(id, templateId) {
  return {
    id,
    domain: "template",
    entryType: "templateReference",
    referenceId: templateId,
    payload: { relation: "include" },
  };
}

function reconcile(templates) {
  const resolution = resolveTemplateComposition(templates, {
    rootTemplateIds: templates.length === 0 ? [] : ["template-root"],
  });
  return evaluateTemplateCompositionPointReconciliation(
    templates,
    resolution,
  );
}

test("reconciles package totals independently of divergent members", () => {
  const result = reconcile(createTemplates([
    {
      id: "template-root",
      importedPoints: 30,
      calculatedPoints: 32,
      entries: [reference("entry-child", "template-child")],
    },
    {
      id: "template-child",
      importedPoints: 10,
      calculatedPoints: 8,
    },
  ]));

  assert.equal(result.status, "reconciled");
  assert.equal(result.complete, true);
  assert.equal(result.importedPoints, 40);
  assert.equal(result.calculatedPoints, 40);
  assert.equal(result.difference, 0);
  assert.deepEqual(result.divergentTemplateIds, [
    "template-child",
    "template-root",
  ]);
  assert.equal(
    result.diagnostics.some(item => (
      item.code === "template-composition-points-divergent"
    )),
    true,
  );
});

test("reports divergent complete package totals", () => {
  const result = reconcile(createTemplates([
    {
      id: "template-root",
      importedPoints: 30,
      calculatedPoints: 31,
      entries: [reference("entry-child", "template-child")],
    },
    {
      id: "template-child",
      importedPoints: 10,
      calculatedPoints: 10,
    },
  ]));

  assert.equal(result.status, "divergent");
  assert.equal(result.importedPoints, 40);
  assert.equal(result.calculatedPoints, 41);
  assert.equal(result.difference, 1);
  assert.deepEqual(result.divergentTemplateIds, ["template-root"]);
});

test("keeps known subtotals while incomplete totals remain null", () => {
  const result = reconcile(createTemplates([
    {
      id: "template-root",
      importedPoints: 30,
      entries: [reference("entry-child", "template-child")],
    },
    {
      id: "template-child",
      calculatedPoints: 12,
    },
  ]));

  assert.equal(result.status, "partial");
  assert.equal(result.complete, false);
  assert.equal(result.importedPoints, null);
  assert.equal(result.calculatedPoints, null);
  assert.equal(result.importedKnownTotal, 30);
  assert.equal(result.calculatedKnownTotal, 12);
  assert.deepEqual(result.missingImportedTemplateIds, ["template-child"]);
  assert.deepEqual(result.missingCalculatedTemplateIds, ["template-root"]);
  assert.equal(result.difference, null);
});

test("distinguishes imported-only and calculated-only packages", () => {
  const imported = reconcile(createTemplates([
    { id: "template-root", importedPoints: 20 },
  ]));
  const calculated = reconcile(createTemplates([
    { id: "template-root", calculatedPoints: 22 },
  ]));

  assert.equal(imported.status, "imported-only");
  assert.equal(imported.importedPoints, 20);
  assert.equal(imported.calculatedPoints, null);
  assert.equal(calculated.status, "calculated-only");
  assert.equal(calculated.importedPoints, null);
  assert.equal(calculated.calculatedPoints, 22);
});

test("empty resolved composition reconciles to zero", () => {
  const result = reconcile(createTemplates([]));

  assert.equal(result.status, "reconciled");
  assert.equal(result.complete, true);
  assert.equal(result.importedPoints, 0);
  assert.equal(result.calculatedPoints, 0);
  assert.equal(result.difference, 0);
  assert.deepEqual(result.evaluations, []);
});

test("package result is deeply immutable", () => {
  const result = reconcile(createTemplates([
    {
      id: "template-root",
      importedPoints: 5,
      calculatedPoints: 5,
    },
  ]));

  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.evaluations), true);
  assert.equal(Object.isFrozen(result.evaluations[0]), true);
});
