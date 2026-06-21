import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter, serializeCharacter } from "./Character.js";
import {
  analyzeTemplateApplicationOperation,
  compareTemplatePackageVersions,
  executeTemplateApplicationPlan,
  planTemplateApplicationOperation,
  TemplateApplicationOperationError,
} from "./TemplateApplicationOperations.js";
import {
  createTemplateApplication,
} from "./TemplateApplications.js";
import {
  incorporateTemplate,
  removeTemplateApplication,
  updateTemplateApplication,
} from "./TemplateOperations.js";

const CREATED_AT = "2026-06-21T10:00:00.000Z";
const APPLIED_AT = "2026-06-21T11:00:00.000Z";
const UPDATED_AT = "2026-06-21T12:00:00.000Z";

function templateReference(id, templateId) {
  return {
    id,
    domain: "template",
    entryType: "templateReference",
    referenceId: templateId,
    payload: { relation: "include" },
  };
}

function createTemplateCharacter() {
  return createCharacter({
    identity: {
      id: "character-template-application",
      name: "Ari",
      concept: "Pacotes soberanos",
      playerId: null,
      campaignId: null,
    },
    advantages: [{
      id: "adv-manual",
      name: "Vantagem manual",
      points: 5,
    }],
    templates: [
      {
        id: "template-body",
        name: "Corpo feérico",
        templateType: "body",
        importedPoints: 10,
        traits: {
          advantages: [{
            id: "adv-body",
            name: "Visão Noturna",
            points: 5,
          }],
        },
      },
      {
        id: "template-elf",
        name: "Elfo",
        templateType: "race",
        importedPoints: 35,
        entries: [templateReference("entry-body", "template-body")],
        skills: [{
          id: "skill-bow",
          name: "Arco",
          attribute: "DX",
          difficulty: "A",
          points: 2,
        }],
      },
    ],
    metadata: {
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      source: "singular",
    },
  });
}

function replacementElf(points = 3) {
  return {
    id: "template-elf",
    name: "Elfo revisado",
    templateType: "race",
    importedPoints: 36,
    source: {
      kind: "imported",
      provider: "test",
      format: "json",
      reference: "elf",
      version: 2,
    },
    entries: [templateReference("entry-body", "template-body")],
    skills: [{
      id: "skill-bow",
      name: "Arco",
      attribute: "DX",
      difficulty: "A",
      points,
    }],
  };
}

test("analyzes, plans and atomically applies a resolved template package", () => {
  const original = createTemplateCharacter();
  const analysis = analyzeTemplateApplicationOperation(original, {
    operation: "apply",
    templateId: "template-elf",
    choices: { preferredCulture: "culture:forest-court" },
  });
  const plan = planTemplateApplicationOperation(
    original,
    {
      operation: "apply",
      templateId: "template-elf",
      choices: { preferredCulture: "culture:forest-court" },
    },
    {
      now: APPLIED_AT,
      planId: "plan-apply-elf",
      operationId: "operation-apply-elf",
      eventId: "event-apply-elf",
      applicationId: "application-elf-v1",
    },
  );
  const executed = executeTemplateApplicationPlan(original, plan, {
    now: APPLIED_AT,
    notes: "Escolha feita na criação.",
  });
  const application = executed.character.templateApplications[0];
  const inheritedAdvantage = executed.character.advantages.find(item => (
    item.name === "Visão Noturna"
  ));
  const inheritedSkill = executed.character.skills.find(item => (
    item.name === "Arco"
  ));

  assert.equal(analysis.status, "ready");
  assert.deepEqual(analysis.resolution.orderedTemplateIds, [
    "template-body",
    "template-elf",
  ]);
  assert.equal(plan.status, "ready");
  assert.equal(executed.changed, true);
  assert.equal(executed.receipt.operation, "apply");
  assert.equal(executed.receipt.applicationId, "application-elf-v1");
  assert.deepEqual(executed.receipt.resolvedTemplateIds, [
    "template-body",
    "template-elf",
  ]);

  assert.equal(application.rootTemplateId, "template-elf");
  assert.deepEqual(application.resolvedTemplateIds, [
    "template-body",
    "template-elf",
  ]);
  assert.deepEqual(application.choices, {
    preferredCulture: "culture:forest-court",
  });
  assert.equal(application.history.length, 1);
  assert.equal(application.history[0].type, "applied");
  assert.equal(application.history[0].receipt.id, "operation-apply-elf");
  assert.equal(application.compositionFingerprint, plan.analysis.compositionFingerprint);

  assert.equal(inheritedAdvantage.importMeta.templateId, "template-body");
  assert.equal(
    inheritedAdvantage.importMeta.templateApplicationId,
    "application-elf-v1",
  );
  assert.equal(inheritedSkill.importMeta.templateId, "template-elf");
  assert.equal(original.advantages.length, 1);
  assert.equal(original.skills.length, 0);
  assert.equal(original.templateApplications.length, 0);
});

test("rejects a stale plan without exposing partial mutation", () => {
  const original = createTemplateCharacter();
  const plan = planTemplateApplicationOperation(
    original,
    { operation: "apply", templateId: "template-elf" },
    {
      now: APPLIED_AT,
      applicationId: "application-stale",
      operationId: "operation-stale",
    },
  );
  const changed = createCharacter({
    ...original,
    templates: original.templates.map(template => (
      template.id === "template-elf"
        ? { ...template, notes: "Alterado depois do planejamento." }
        : template
    )),
  });
  const before = JSON.stringify(changed);

  assert.throws(
    () => executeTemplateApplicationPlan(changed, plan, { now: APPLIED_AT }),
    error => (
      error instanceof TemplateApplicationOperationError &&
      error.code === "PLAN_STALE"
    ),
  );
  assert.equal(JSON.stringify(changed), before);
  assert.equal(changed.templateApplications.length, 0);
  assert.equal(changed.skills.length, 0);
});

test("removes an application through a reversible plan and records its receipt", () => {
  const applied = incorporateTemplate(createTemplateCharacter(), "template-elf", {
    applicationId: "application-remove",
    operationId: "operation-apply-remove",
    eventId: "event-apply-remove",
    now: APPLIED_AT,
  });
  const plan = planTemplateApplicationOperation(
    applied,
    { operation: "remove", applicationId: "application-remove" },
    {
      now: UPDATED_AT,
      operationId: "operation-remove",
      eventId: "event-remove",
    },
  );
  const executed = executeTemplateApplicationPlan(applied, plan, {
    now: UPDATED_AT,
  });
  const application = executed.character.templateApplications[0];

  assert.equal(plan.status, "ready");
  assert.equal(executed.receipt.operation, "remove");
  assert.equal(application.status, "removed");
  assert.equal(application.removedAt, UPDATED_AT);
  assert.equal(application.history.length, 2);
  assert.equal(application.history[1].type, "removed");
  assert.equal(application.history[1].receipt.id, "operation-remove");
  assert.equal(executed.character.advantages.length, 1);
  assert.deepEqual(executed.character.skills, []);
});

test("blocks removal while another active application depends on its root", () => {
  const character = createCharacter({
    ...createTemplateCharacter(),
    templateApplications: [
      createTemplateApplication({
        id: "application-body",
        templateId: "template-body",
        rootTemplateId: "template-body",
        resolvedTemplateIds: ["template-body"],
        appliedAt: APPLIED_AT,
      }),
      createTemplateApplication({
        id: "application-elf",
        templateId: "template-elf",
        rootTemplateId: "template-elf",
        resolvedTemplateIds: ["template-body", "template-elf"],
        appliedAt: APPLIED_AT,
      }),
    ],
  });
  const analysis = analyzeTemplateApplicationOperation(character, {
    operation: "remove",
    applicationId: "application-body",
  });

  assert.equal(analysis.status, "blocked");
  assert.deepEqual(analysis.activeDependentApplicationIds, ["application-elf"]);
  assert.equal(
    analysis.reasons.includes("template-active-application-dependency"),
    true,
  );
});

test("blocks removal when an active form uses a template from the application", () => {
  const applied = incorporateTemplate(createTemplateCharacter(), "template-elf", {
    applicationId: "application-active-form",
    now: APPLIED_AT,
  });
  const character = createCharacter({
    ...applied,
    alternateFormSets: [{
      id: "set-active-form",
      name: "Forma",
      mechanism: "alternateForm",
      baseFormId: "form-base",
      activeFormId: "form-elf",
      forms: [
        { id: "form-base", name: "Base" },
        {
          id: "form-elf",
          name: "Elfo",
          templateId: "template-elf",
        },
      ],
    }],
  });
  const analysis = analyzeTemplateApplicationOperation(character, {
    operation: "remove",
    applicationId: "application-active-form",
  });

  assert.equal(analysis.status, "blocked");
  assert.equal(analysis.activeFormDependencies.length, 1);
  assert.equal(
    analysis.reasons.includes("template-active-form-dependency"),
    true,
  );
});

test("compares and updates a package while preserving opaque user choices", () => {
  const applied = incorporateTemplate(createTemplateCharacter(), "template-elf", {
    applicationId: "application-elf-v1",
    operationId: "operation-apply-v1",
    eventId: "event-apply-v1",
    now: APPLIED_AT,
    choices: {
      preferredCulture: "culture:forest-court",
      selectedTraitId: "trait:keen-hearing",
    },
  });
  const comparison = compareTemplatePackageVersions(
    applied.templates,
    "template-elf",
    replacementElf(3),
  );
  const plan = planTemplateApplicationOperation(
    applied,
    {
      operation: "update",
      applicationId: "application-elf-v1",
      replacementTemplate: replacementElf(3),
    },
    {
      now: UPDATED_AT,
      operationId: "operation-update-elf",
      eventId: "event-update-elf",
      applicationId: "application-elf-v2",
    },
  );
  const executed = executeTemplateApplicationPlan(applied, plan, {
    now: UPDATED_AT,
  });
  const previous = executed.character.templateApplications.find(item => (
    item.id === "application-elf-v1"
  ));
  const current = executed.character.templateApplications.find(item => (
    item.id === "application-elf-v2"
  ));
  const bow = executed.character.skills.find(item => item.name === "Arco");

  assert.equal(comparison.changed, true);
  assert.deepEqual(comparison.changedTemplateIds, ["template-elf"]);
  assert.equal(plan.status, "ready");
  assert.equal(executed.receipt.operation, "update");
  assert.equal(previous.status, "removed");
  assert.equal(previous.replacedByApplicationId, "application-elf-v2");
  assert.equal(previous.history.at(-1).type, "updated");
  assert.equal(current.status, "active");
  assert.equal(current.replacesApplicationId, "application-elf-v1");
  assert.deepEqual(current.choices, {
    preferredCulture: "culture:forest-court",
    selectedTraitId: "trait:keen-hearing",
  });
  assert.equal(current.history[0].type, "updated");
  assert.equal(bow.points, 3);
  assert.equal(executed.character.templates.find(item => (
    item.id === "template-elf"
  )).source.version, 2);
});

test("allows an explicit choice replacement during package update", () => {
  const applied = incorporateTemplate(createTemplateCharacter(), "template-elf", {
    applicationId: "application-choice-v1",
    now: APPLIED_AT,
    choices: { selected: "old" },
  });
  const plan = planTemplateApplicationOperation(
    applied,
    {
      operation: "update",
      applicationId: "application-choice-v1",
      replacementTemplate: replacementElf(),
      choices: { selected: "new" },
    },
    {
      now: UPDATED_AT,
      applicationId: "application-choice-v2",
    },
  );
  const executed = executeTemplateApplicationPlan(applied, plan, {
    now: UPDATED_AT,
  });
  const current = executed.character.templateApplications.find(item => (
    item.id === "application-choice-v2"
  ));

  assert.deepEqual(current.choices, { selected: "new" });
});

test("returns no-op when package and choices did not change", () => {
  const applied = incorporateTemplate(createTemplateCharacter(), "template-elf", {
    applicationId: "application-no-op",
    now: APPLIED_AT,
    choices: { selected: "same" },
  });
  const currentTemplate = applied.templates.find(item => item.id === "template-elf");
  const plan = planTemplateApplicationOperation(
    applied,
    {
      operation: "update",
      applicationId: "application-no-op",
      replacementTemplate: currentTemplate,
    },
    {
      now: UPDATED_AT,
      applicationId: "application-unused",
    },
  );
  const executed = executeTemplateApplicationPlan(applied, plan, {
    now: UPDATED_AT,
  });

  assert.equal(plan.status, "no-op");
  assert.equal(executed.changed, false);
  assert.equal(executed.character, applied);
  assert.equal(executed.receipt.status, "no-op");
});

test("legacy wrappers use the sovereign flow and preserve lifecycle data", () => {
  const applied = incorporateTemplate(createTemplateCharacter(), "template-elf", {
    applicationId: "application-wrapper-v1",
    operationId: "operation-wrapper-apply",
    eventId: "event-wrapper-apply",
    now: APPLIED_AT,
    choices: { selected: "kept" },
  });
  const updated = updateTemplateApplication(
    applied,
    "application-wrapper-v1",
    replacementElf(4),
    {
      newApplicationId: "application-wrapper-v2",
      operationId: "operation-wrapper-update",
      eventId: "event-wrapper-update",
      now: UPDATED_AT,
    },
  );
  const removed = removeTemplateApplication(
    updated,
    "application-wrapper-v2",
    {
      operationId: "operation-wrapper-remove",
      eventId: "event-wrapper-remove",
      now: "2026-06-21T13:00:00.000Z",
    },
  );

  assert.equal(updated.templateApplications.length, 2);
  assert.deepEqual(updated.templateApplications[1].choices, { selected: "kept" });
  assert.equal(removed.templateApplications[1].status, "removed");
  assert.equal(removed.templateApplications[1].history.length, 2);
});

test("application lineage, choices and receipts survive save/load", () => {
  const applied = incorporateTemplate(createTemplateCharacter(), "template-elf", {
    applicationId: "application-save-v1",
    operationId: "operation-save-apply",
    eventId: "event-save-apply",
    now: APPLIED_AT,
    choices: { selected: "forest" },
  });
  const updated = updateTemplateApplication(
    applied,
    "application-save-v1",
    replacementElf(),
    {
      newApplicationId: "application-save-v2",
      operationId: "operation-save-update",
      eventId: "event-save-update",
      now: UPDATED_AT,
    },
  );
  const restored = createCharacter(serializeCharacter(updated));
  const previous = restored.templateApplications.find(item => (
    item.id === "application-save-v1"
  ));
  const current = restored.templateApplications.find(item => (
    item.id === "application-save-v2"
  ));

  assert.equal(previous.replacedByApplicationId, "application-save-v2");
  assert.equal(current.replacesApplicationId, "application-save-v1");
  assert.deepEqual(current.choices, { selected: "forest" });
  assert.equal(current.history[0].receipt.operation, "update");
  assert.equal(current.history[0].receipt.applicationId, "application-save-v2");
  assert.deepEqual(current.resolvedTemplateIds, [
    "template-body",
    "template-elf",
  ]);
});
