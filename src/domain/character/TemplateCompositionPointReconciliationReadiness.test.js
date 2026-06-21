import test from "node:test";
import assert from "node:assert/strict";

import { createTemplates } from "./Templates.js";
import {
  resolveTemplateComposition,
} from "./TemplateDependencyResolver.js";
import {
  evaluateTemplateCompositionPointReconciliation,
} from "./TemplatePointReconciliation.js";

function internalReference(target) {
  return {
    id: "entry-internal-dependency",
    domain: "template",
    entryType: "templateReference",
    referenceId: target,
    payload: { relation: "include" },
  };
}

function externalReference() {
  return {
    id: "entry-external-dependency",
    domain: "template",
    entryType: "templateReference",
    referenceId: "external-child",
    payload: {
      relation: "include",
      referenceScope: "external",
      externalKey: "gcs",
    },
  };
}

test("rejects blocked composition instead of totaling a partial graph", () => {
  const templates = createTemplates([{
    id: "template-root",
    importedPoints: 20,
    calculatedPoints: 20,
    entries: [internalReference("template-missing")],
  }]);
  const resolution = resolveTemplateComposition(templates, {
    rootTemplateIds: ["template-root"],
  });

  assert.equal(resolution.status, "blocked");
  assert.throws(
    () => evaluateTemplateCompositionPointReconciliation(
      templates,
      resolution,
    ),
    /requires ready resolution/,
  );
});

test("rejects pending external composition instead of reporting complete totals", () => {
  const templates = createTemplates([{
    id: "template-root",
    importedPoints: 20,
    calculatedPoints: 20,
    entries: [externalReference()],
  }]);
  const resolution = resolveTemplateComposition(templates, {
    rootTemplateIds: ["template-root"],
  });

  assert.equal(resolution.status, "pending");
  assert.throws(
    () => evaluateTemplateCompositionPointReconciliation(
      templates,
      resolution,
    ),
    /requires ready resolution/,
  );
});
