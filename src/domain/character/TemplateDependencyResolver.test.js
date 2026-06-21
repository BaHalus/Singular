import test from "node:test";
import assert from "node:assert/strict";

import { createTemplate, createTemplates, serializeTemplates } from "./Templates.js";
import {
  createSpecialRuleContribution,
  createTemplateReferenceContribution,
} from "./TemplateComposition.js";
import {
  getTemplateDependencyEntries,
  resolveTemplateComposition,
  serializeResolvedTemplateComposition,
  validateResolvedTemplateComposition,
} from "./TemplateDependencyResolver.js";

function reference(id, target, payload = {}) {
  return createTemplateReferenceContribution({
    id,
    templateId: target,
    declaration: {
      relation: "include",
      ...payload,
    },
  });
}

function rule(id, conflictKey, value) {
  return createSpecialRuleContribution({
    id,
    declaration: {
      conflictKey,
      value,
    },
  });
}

test("orders dependencies before dependants deterministically", () => {
  const templates = createTemplates([
    {
      id: "template-root",
      entries: [
        reference("entry-root-b", "template-b"),
        reference("entry-root-c", "template-c"),
        rule("entry-root-rule", null, "root"),
      ],
    },
    {
      id: "template-b",
      entries: [
        reference("entry-b-d", "template-d"),
        rule("entry-b-rule", null, "b"),
      ],
    },
    {
      id: "template-c",
      entries: [
        reference("entry-c-d", "template-d"),
        rule("entry-c-rule", null, "c"),
      ],
    },
    {
      id: "template-d",
      entries: [rule("entry-d-rule", null, "d")],
    },
  ]);

  const result = resolveTemplateComposition(templates, {
    rootTemplateIds: ["template-root"],
  });

  assert.equal(result.status, "ready");
  assert.equal(result.complete, true);
  assert.deepEqual(result.orderedTemplateIds, [
    "template-d",
    "template-b",
    "template-c",
    "template-root",
  ]);
  assert.deepEqual(result.reachableTemplateIds, result.orderedTemplateIds);
  assert.equal(result.dependencies.length, 4);
  assert.deepEqual(result.cycles, []);
  assert.deepEqual(result.conflicts, []);

  const origin = result.contributions.find(item => (
    item.key === "template-d::entry-d-rule"
  ));
  assert.deepEqual(origin.originPaths, [
    ["template-root", "template-b", "template-d"],
    ["template-root", "template-c", "template-d"],
  ]);
});

test("keeps declaration order as the deterministic tie breaker", () => {
  const first = createTemplates([
    {
      id: "root",
      entries: [
        reference("entry-z", "z"),
        reference("entry-a", "a"),
      ],
    },
    { id: "a" },
    { id: "z" },
  ]);
  const second = createTemplates(serializeTemplates(first));

  assert.deepEqual(
    resolveTemplateComposition(first, { rootTemplateIds: ["root"] })
      .orderedTemplateIds,
    ["z", "a", "root"],
  );
  assert.deepEqual(
    resolveTemplateComposition(second, { rootTemplateIds: ["root"] })
      .orderedTemplateIds,
    ["z", "a", "root"],
  );
});

test("blocks a missing internal dependency without linking by name", () => {
  const templates = createTemplates([
    {
      id: "root",
      entries: [reference("entry-missing", "Lobo")],
    },
    {
      id: "template-wolf",
      name: "Lobo",
    },
  ]);
  const result = resolveTemplateComposition(templates, {
    rootTemplateIds: ["root"],
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.complete, false);
  assert.equal(result.dependencies[0].status, "missing");
  assert.equal(result.dependencies[0].resolvedTemplateId, null);
  assert.equal(
    result.diagnostics.some(item => item.code === "template-dependency-missing"),
    true,
  );
  assert.deepEqual(result.orderedTemplateIds, ["root"]);
});

test("leaves an unresolved external reference pending", () => {
  const templates = createTemplates([
    {
      id: "root",
      entries: [reference("entry-external", "external-wolf", {
        referenceScope: "external",
        externalKey: "gcs",
      })],
    },
  ]);
  const result = resolveTemplateComposition(templates, {
    rootTemplateIds: ["root"],
  });

  assert.equal(result.status, "pending");
  assert.equal(result.dependencies[0].status, "unresolved-external");
  assert.equal(result.dependencies[0].externalKey, "gcs");
  assert.equal(
    result.diagnostics.some(item => (
      item.code === "template-external-reference-unresolved" &&
      item.severity === "pending"
    )),
    true,
  );
});

test("resolves an external reference only through explicit externalIds", () => {
  const templates = createTemplates([
    {
      id: "root",
      entries: [reference("entry-external", "external-wolf", {
        referenceScope: "external",
        externalKey: "gcs",
      })],
    },
    {
      id: "template-wolf",
      externalIds: { gcs: "external-wolf" },
      name: "Lobo",
    },
  ]);
  const result = resolveTemplateComposition(templates, {
    rootTemplateIds: ["root"],
  });

  assert.equal(result.status, "ready");
  assert.equal(result.dependencies[0].status, "resolved");
  assert.equal(result.dependencies[0].resolvedTemplateId, "template-wolf");
  assert.deepEqual(result.orderedTemplateIds, ["template-wolf", "root"]);
});

test("blocks ambiguous external identities and reports the candidates", () => {
  const templates = createTemplates([
    {
      id: "root",
      entries: [reference("entry-external", "external-wolf", {
        referenceScope: "external",
        externalKey: "gcs",
      })],
    },
    { id: "wolf-a", externalIds: { gcs: "external-wolf" } },
    { id: "wolf-b", externalIds: { gcs: "external-wolf" } },
  ]);
  const result = resolveTemplateComposition(templates, {
    rootTemplateIds: ["root"],
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.dependencies[0].status, "ambiguous-external");
  assert.deepEqual(result.dependencies[0].candidateTemplateIds, [
    "wolf-a",
    "wolf-b",
  ]);
  assert.equal(result.conflicts[0].type, "ambiguous-external-reference");
  assert.equal(
    result.diagnostics.some(item => item.code === "template-external-id-conflict"),
    true,
  );
});

test("detects a dependency cycle and preserves a closed path", () => {
  const templates = createTemplates([
    { id: "a", entries: [reference("entry-a-b", "b")] },
    { id: "b", entries: [reference("entry-b-c", "c")] },
    { id: "c", entries: [reference("entry-c-a", "a")] },
  ]);
  const result = resolveTemplateComposition(templates, {
    rootTemplateIds: ["a"],
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.cycles.length, 1);
  assert.deepEqual(result.cycles[0].templateIds, ["a", "b", "c", "a"]);
  assert.equal(
    result.diagnostics.some(item => item.code === "template-dependency-cycle"),
    true,
  );
});

test("reports conflicts only when contributions declare the same conflictKey", () => {
  const templates = createTemplates([
    {
      id: "root",
      entries: [
        reference("entry-root-a", "a"),
        reference("entry-root-b", "b"),
      ],
    },
    { id: "a", entries: [rule("entry-a-body", "body-plan", "organic")] },
    { id: "b", entries: [rule("entry-b-body", "body-plan", "mechanical")] },
  ]);
  const result = resolveTemplateComposition(templates, {
    rootTemplateIds: ["root"],
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].type, "explicit-contribution-conflict");
  assert.equal(result.conflicts[0].conflictKey, "body-plan");
  assert.deepEqual(result.conflicts[0].templateIds, ["a", "b"]);
});

test("does not invent a conflict for equivalent declarations or absent keys", () => {
  const templates = createTemplates([
    {
      id: "root",
      entries: [
        reference("entry-root-a", "a"),
        reference("entry-root-b", "b"),
      ],
    },
    {
      id: "a",
      entries: [
        rule("entry-a-same", "shared", "same"),
        rule("entry-a-free", null, "alpha"),
      ],
    },
    {
      id: "b",
      entries: [
        rule("entry-b-same", "shared", "same"),
        rule("entry-b-free", null, "beta"),
      ],
    },
  ]);
  const result = resolveTemplateComposition(templates, {
    rootTemplateIds: ["root"],
  });

  assert.equal(result.status, "ready");
  assert.deepEqual(result.conflicts, []);
});

test("blocks an explicitly requested missing root", () => {
  const result = resolveTemplateComposition(createTemplates([{ id: "present" }]), {
    rootTemplateIds: ["missing"],
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.orderedTemplateIds, []);
  assert.equal(result.diagnostics[0].code, "template-root-missing");
});

test("limits composition to the selected roots and their dependencies", () => {
  const templates = createTemplates([
    { id: "root", entries: [reference("entry-root-child", "child")] },
    { id: "child", entries: [rule("entry-child", null, "included")] },
    { id: "unrelated", entries: [rule("entry-unrelated", null, "excluded")] },
  ]);
  const result = resolveTemplateComposition(templates, {
    rootTemplateIds: ["root"],
  });

  assert.deepEqual(result.orderedTemplateIds, ["child", "root"]);
  assert.equal(
    result.contributions.some(item => item.templateId === "unrelated"),
    false,
  );
});

test("dependency entries and resolved projections are detached and immutable", () => {
  const template = createTemplate({
    id: "root",
    entries: [reference("entry-root-child", "child")],
  });
  const dependencyEntries = getTemplateDependencyEntries(template);
  const result = resolveTemplateComposition(createTemplates([
    template,
    { id: "child" },
  ]), { rootTemplateIds: ["root"] });
  const serialized = serializeResolvedTemplateComposition(result);

  serialized.dependencies[0].declaration.relation = "changed";

  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.dependencies), true);
  assert.equal(Object.isFrozen(result.dependencies[0]), true);
  assert.equal(result.dependencies[0].declaration.relation, "include");
  assert.equal(Object.isFrozen(dependencyEntries), true);
  assert.equal(dependencyEntries[0].id, "entry-root-child");
  assert.equal(validateResolvedTemplateComposition(result), true);
});
