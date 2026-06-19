import test from "node:test";
import assert from "node:assert/strict";

import {
  createTemplateApplications,
  serializeTemplateApplications,
} from "./TemplateApplications.js";

test("creates active template application", () => {
  const applications = createTemplateApplications([
    {
      id: "application-001",
      templateId: "template-001",
      templateName: "Anão",
      templateType: "race",
      importedPoints: 35,
      status: "active",
      appliedAt: "2026-06-19T12:00:00.000Z",
      componentIds: {
        advantages: ["adv-applied-001"],
        disadvantages: ["disadv-applied-001"],
        skills: ["skill-applied-001"],
      },
      notes: "Aplicação inicial.",
    },
  ]);

  const application = applications[0];

  assert.equal(application.status, "active");
  assert.equal(application.removedAt, null);
  assert.equal(application.importedPoints, 35);
  assert.deepEqual(application.componentIds.advantages, ["adv-applied-001"]);
  assert.deepEqual(application.componentIds.disadvantages, ["disadv-applied-001"]);
  assert.deepEqual(application.componentIds.skills, ["skill-applied-001"]);
  assert.deepEqual(application.componentIds.equipment, []);
});

test("creates removed template application", () => {
  const applications = createTemplateApplications([
    {
      id: "application-001",
      templateId: "template-001",
      templateName: "Anão",
      status: "removed",
      appliedAt: "2026-06-19T12:00:00.000Z",
      removedAt: "2026-06-19T13:00:00.000Z",
    },
  ]);

  assert.equal(applications[0].status, "removed");
  assert.equal(applications[0].removedAt, "2026-06-19T13:00:00.000Z");
});

test("serializes template applications", () => {
  const applications = createTemplateApplications([
    {
      id: "application-001",
      templateId: "template-001",
      templateName: "Máquina",
      templateType: "metaTrait",
      importedPoints: 25,
      appliedAt: "2026-06-19T12:00:00.000Z",
      componentIds: {
        advantages: ["adv-applied-001"],
        equipment: ["eq-applied-001"],
      },
    },
  ]);

  const json = serializeTemplateApplications(applications);

  assert.equal(json[0].templateType, "metaTrait");
  assert.equal(json[0].importedPoints, 25);
  assert.deepEqual(json[0].componentIds.advantages, ["adv-applied-001"]);
  assert.deepEqual(json[0].componentIds.equipment, ["eq-applied-001"]);
});

test("rejects invalid template application lifecycle", () => {
  assert.throws(() => {
    createTemplateApplications("applications");
  });

  assert.throws(() => {
    createTemplateApplications([
      {
        id: "application-001",
        templateId: "",
      },
    ]);
  });

  assert.throws(() => {
    createTemplateApplications([
      {
        id: "application-001",
        templateId: "template-001",
        status: "active",
        removedAt: "2026-06-19T13:00:00.000Z",
      },
    ]);
  });

  assert.throws(() => {
    createTemplateApplications([
      {
        id: "application-001",
        templateId: "template-001",
        status: "removed",
        removedAt: null,
      },
    ]);
  });

  assert.throws(() => {
    createTemplateApplications([
      {
        id: "application-001",
        templateId: "template-001",
        componentIds: {
          advantages: "adv-001",
        },
      },
    ]);
  });
});

test("rejects duplicate application ids", () => {
  assert.throws(() => {
    createTemplateApplications([
      {
        id: "application-001",
        templateId: "template-001",
      },
      {
        id: "application-001",
        templateId: "template-002",
      },
    ]);
  });
});
