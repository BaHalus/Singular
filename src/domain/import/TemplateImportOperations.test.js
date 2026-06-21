import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeTemplateImport,
  executeTemplateImportPlan,
  importTemplateCatalog,
  planTemplateImport,
  TemplateImportOperationError,
} from "./TemplateImportOperations.js";

const NOW = "2026-06-21T14:00:00.000Z";

function createTemplateSource(overrides = {}) {
  return {
    type: "template",
    version: 2,
    id: "gct-template-elf",
    name: "Elfo",
    template_type: "race",
    calc: { points: 35 },
    advantages: [
      {
        type: "advantage",
        id: "adv-night-vision",
        name: "Visão Noturna",
        base_points: 5,
        calc: { points: 5 },
        categories: ["Advantage"],
      },
    ],
    ...overrides,
  };
}

test("analyzes and imports a canonical GCT template catalog", () => {
  const source = createTemplateSource();
  const analysis = analyzeTemplateImport(source);
  const result = importTemplateCatalog(source, {
    now: NOW,
    planId: "plan-import-elf",
    operationId: "operation-import-elf",
  });
  const template = result.templates[0];

  assert.equal(analysis.status, "ready");
  assert.equal(analysis.executable, true);
  assert.equal(analysis.sourceKind, "standalone-template");
  assert.deepEqual(analysis.recognizedTemplateIds, ["gct-template-elf"]);
  assert.deepEqual(analysis.opaqueTemplateIds, []);

  assert.equal(template.id, "gct-template-elf");
  assert.equal(template.templateType, "race");
  assert.equal(template.source.kind, "imported");
  assert.equal(template.source.provider, "gcs");
  assert.equal(template.source.format, "gct");
  assert.equal(template.source.version, 2);
  assert.equal(template.importedPoints, 35);
  assert.equal(template.entries.length, 1);
  assert.equal(template.entries[0].entryType, "advantage");
  assert.equal(template.importMeta.identityStrategy, "external-id");
  assert.equal(typeof template.importMeta.importFingerprint, "string");

  assert.equal(result.receipt.id, "operation-import-elf");
  assert.equal(result.receipt.recognizedCount, 1);
  assert.equal(result.receipt.opaqueCount, 0);
  assert.equal(result.report.status, "ready");
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(template), true);
});

test("assigns deterministic sovereign ids to anonymous packages", () => {
  const source = {
    type: "template",
    version: 2,
    name: "Pacote sem ID",
    template_type: "profession",
    skills: [
      {
        type: "skill",
        name: "Comércio",
        difficulty: "iq/a",
        points: 2,
      },
    ],
  };

  const first = importTemplateCatalog(source, { now: NOW });
  const second = importTemplateCatalog(structuredClone(source), { now: NOW });

  assert.match(first.templates[0].id, /^gct_template_[0-9a-f]{8}$/);
  assert.equal(first.templates[0].id, second.templates[0].id);
  assert.equal(first.templates[0].importMeta.identityStrategy, "content-hash");
  assert.equal(
    first.templates[0].importMeta.importFingerprint,
    second.templates[0].importMeta.importFingerprint,
  );
});

test("preserves unknown top-level nodes as opaque canonical templates", () => {
  const source = [{
    type: "future_template_package",
    id: "future-package-1",
    name: "Pacote futuro",
    futureRule: { value: 7 },
  }];
  const result = importTemplateCatalog(source, { now: NOW });
  const opaque = result.opaqueTemplates[0];

  assert.equal(result.status, "ready-with-warnings");
  assert.deepEqual(result.templates, []);
  assert.equal(result.unknownNodes.length, 1);
  assert.equal(result.allTemplates.length, 1);
  assert.equal(opaque.id, "future-package-1");
  assert.equal(opaque.templateType, "unknown");
  assert.equal(opaque.entries.length, 1);
  assert.equal(opaque.entries[0].entryType, "unknown");
  assert.equal(opaque.entries[0].raw.futureRule.value, 7);
  assert.equal(opaque.importMeta.opaque, true);
  assert.equal(
    result.diagnostics.some(item => (
      item.code === "template-import-unknown-node-preserved"
    )),
    true,
  );
});

test("warns about missing and unsupported GCT versions without rewriting them", () => {
  const missing = analyzeTemplateImport(createTemplateSource({
    id: "template-missing-version",
    version: undefined,
  }));
  const unsupported = importTemplateCatalog(createTemplateSource({
    id: "template-version-3",
    version: 3,
  }), { now: NOW });

  assert.equal(missing.status, "ready-with-warnings");
  assert.equal(
    missing.diagnostics.some(item => item.code === "template-import-version-missing"),
    true,
  );
  assert.equal(unsupported.status, "ready-with-warnings");
  assert.equal(unsupported.templates[0].source.version, 3);
  assert.equal(
    unsupported.diagnostics.some(item => (
      item.code === "template-import-version-unsupported"
    )),
    true,
  );
});

test("collapses exact duplicates and blocks divergent sovereign identities", () => {
  const duplicate = createTemplateSource();
  const collapsed = analyzeTemplateImport([
    duplicate,
    structuredClone(duplicate),
  ]);
  const conflicted = analyzeTemplateImport([
    createTemplateSource(),
    createTemplateSource({ name: "Elfo divergente" }),
  ]);

  assert.equal(collapsed.status, "ready-with-warnings");
  assert.equal(collapsed.templates.length, 1);
  assert.equal(
    collapsed.diagnostics.some(item => (
      item.code === "template-import-duplicate-collapsed"
    )),
    true,
  );

  assert.equal(conflicted.status, "blocked");
  assert.equal(conflicted.executable, false);
  assert.equal(
    conflicted.diagnostics.some(item => item.code === "template-import-id-conflict"),
    true,
  );
  assert.throws(
    () => importTemplateCatalog([
      createTemplateSource(),
      createTemplateSource({ name: "Elfo divergente" }),
    ]),
    error => (
      error instanceof TemplateImportOperationError &&
      error.code === "TEMPLATE_IMPORT_BLOCKED"
    ),
  );
});

test("blocks ambiguous external identities", () => {
  const analysis = analyzeTemplateImport([
    createTemplateSource({
      id: "template-a",
      uuid: "shared-uuid",
    }),
    createTemplateSource({
      id: "template-b",
      uuid: "shared-uuid",
    }),
  ]);

  assert.equal(analysis.status, "blocked");
  assert.equal(
    analysis.diagnostics.some(item => (
      item.code === "template-import-external-id-conflict" &&
      item.externalKey === "gcsUuid"
    )),
    true,
  );
});

test("revalidates the source and rejects stale import plans", () => {
  const source = createTemplateSource();
  const plan = planTemplateImport(source, {
    now: NOW,
    planId: "plan-stale-import",
    operationId: "operation-stale-import",
  });
  source.name = "Elfo alterado depois do plano";

  assert.throws(
    () => executeTemplateImportPlan(source, plan, { now: NOW }),
    error => (
      error instanceof TemplateImportOperationError &&
      error.code === "TEMPLATE_IMPORT_PLAN_STALE"
    ),
  );
});

test("returns blocked analysis for invalid legacy sources", () => {
  const analysis = analyzeTemplateImport("invalid-template-source");

  assert.equal(analysis.status, "blocked");
  assert.equal(analysis.templates.length, 0);
  assert.equal(analysis.diagnostics[0].code, "template-import-source-invalid");
  assert.equal(Object.isFrozen(analysis), true);
});
