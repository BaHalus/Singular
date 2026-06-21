import test from "node:test";
import assert from "node:assert/strict";

import { createTemplates } from "../character/Templates.js";
import {
  importTemplateCatalog,
  mergeImportedTemplateCatalog,
  TemplateImportOperationError,
} from "./TemplateImportOperations.js";

const NOW = "2026-06-21T15:00:00.000Z";

function source(overrides = {}) {
  return {
    type: "template",
    version: 2,
    id: "template-merge",
    uuid: "uuid-template-merge",
    name: "Pacote importado",
    template_type: "template",
    calc: { points: 10 },
    ...overrides,
  };
}

test("adds imported templates to an existing catalog", () => {
  const existing = createTemplates([{ id: "template-existing", name: "Existente" }]);
  const imported = importTemplateCatalog(source(), { now: NOW });
  const merged = mergeImportedTemplateCatalog(existing, imported);

  assert.deepEqual(merged.report.addedTemplateIds, ["template-merge"]);
  assert.deepEqual(merged.report.replacedTemplateIds, []);
  assert.deepEqual(merged.report.resultingTemplateIds, [
    "template-existing",
    "template-merge",
  ]);
  assert.equal(merged.templates.length, 2);
  assert.equal(existing.length, 1);
});

test("recognizes equivalent sovereign definitions as unchanged", () => {
  const imported = importTemplateCatalog(source(), { now: NOW });
  const existing = createTemplates(imported.templates);
  const merged = mergeImportedTemplateCatalog(existing, imported);

  assert.deepEqual(merged.report.addedTemplateIds, []);
  assert.deepEqual(merged.report.unchangedTemplateIds, ["template-merge"]);
  assert.equal(merged.templates.length, 1);
});

test("rejects divergent sovereign ids by default", () => {
  const existing = createTemplates([{
    id: "template-merge",
    externalIds: {
      gcs: "template-merge",
      gcsUuid: "uuid-template-merge",
    },
    name: "Versão existente",
  }]);
  const imported = importTemplateCatalog(source({ name: "Versão importada" }), {
    now: NOW,
  });

  assert.throws(
    () => mergeImportedTemplateCatalog(existing, imported),
    error => (
      error instanceof TemplateImportOperationError &&
      error.code === "TEMPLATE_IMPORT_ID_CONFLICT"
    ),
  );
});

test("supports explicit keep-existing and replace policies", () => {
  const existing = createTemplates([{
    id: "template-merge",
    externalIds: {
      gcs: "template-merge",
      gcsUuid: "uuid-template-merge",
    },
    name: "Versão existente",
  }]);
  const imported = importTemplateCatalog(source({ name: "Versão importada" }), {
    now: NOW,
  });
  const kept = mergeImportedTemplateCatalog(existing, imported, {
    onIdConflict: "keep-existing",
  });
  const replaced = mergeImportedTemplateCatalog(existing, imported, {
    onIdConflict: "replace",
  });

  assert.equal(kept.templates[0].name, "Versão existente");
  assert.deepEqual(kept.report.keptTemplateIds, ["template-merge"]);
  assert.equal(replaced.templates[0].name, "Versão importada");
  assert.deepEqual(replaced.report.replacedTemplateIds, ["template-merge"]);
});

test("never merges distinct sovereign ids through an external identity", () => {
  const existing = createTemplates([{
    id: "template-existing",
    externalIds: { gcsUuid: "shared-external-id" },
    name: "Existente",
  }]);
  const imported = importTemplateCatalog(source({
    id: "template-imported",
    uuid: "shared-external-id",
  }), { now: NOW });

  assert.throws(
    () => mergeImportedTemplateCatalog(existing, imported, {
      onIdConflict: "replace",
    }),
    error => (
      error instanceof TemplateImportOperationError &&
      error.code === "TEMPLATE_IMPORT_EXTERNAL_ID_CONFLICT"
    ),
  );
});

test("includes opaque templates only by explicit request", () => {
  const imported = importTemplateCatalog([{
    type: "future_package",
    id: "opaque-package",
    name: "Opaco",
  }], { now: NOW });

  const defaultMerge = mergeImportedTemplateCatalog([], imported);
  const opaqueMerge = mergeImportedTemplateCatalog([], imported, {
    includeOpaqueTemplates: true,
  });

  assert.deepEqual(defaultMerge.templates, []);
  assert.equal(opaqueMerge.templates.length, 1);
  assert.equal(opaqueMerge.templates[0].id, "opaque-package");
  assert.equal(opaqueMerge.templates[0].templateType, "unknown");
});
