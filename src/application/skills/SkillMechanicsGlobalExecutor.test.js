import test from "node:test";
import assert from "node:assert/strict";

import { createAttributes } from "../../domain/character/Attributes.js";
import { createSkill } from "../../domain/character/Skills.js";
import { createTechnique } from "../../domain/character/Techniques.js";
import {
  resolveAttributeLevels,
} from "../../engine/attributes/AttributeLevelResolver.js";
import {
  createSkillDefaultCandidate,
} from "../../engine/skills/SkillDefaultCandidate.js";
import {
  executeSkillMechanicsResolutionPlan,
  getSkillMechanicsGlobalReportSchemaVersion,
  serializeSkillMechanicsGlobalReport,
  validateSkillMechanicsGlobalReport,
} from "./SkillMechanicsGlobalExecutor.js";
import {
  createSkillMechanicsResolutionPlan,
} from "./SkillMechanicsResolutionPlan.js";

function skill(id, overrides = {}) {
  return createSkill({
    id,
    name: id,
    attribute: "DX",
    difficulty: "A",
    points: 4,
    ...overrides,
  });
}

function technique(id, overrides = {}) {
  return createTechnique({
    id,
    name: id,
    skillId: "skill-judo",
    difficulty: "A",
    points: 2,
    defaultPenalty: -4,
    maximumRelativeLevel: 0,
    ...overrides,
  });
}

function plan(overrides = {}) {
  return createSkillMechanicsResolutionPlan({
    characterId: "character-one",
    attributeLevels: resolveAttributeLevels(createAttributes({
      ST: 10,
      DX: 12,
      IQ: 14,
      HT: 10,
    })),
    skills: [],
    techniques: [],
    defaultCandidates: [],
    ...overrides,
  });
}

function skillReport(report, skillId) {
  return report.skillReports.find(item => item.skillId === skillId);
}

function techniqueResult(report, techniqueId) {
  return report.techniqueResults.find(item => item.entityId === techniqueId);
}

test("executes the complete global Skills and Techniques plan", () => {
  const resolutionPlan = plan({
    skills: [skill("skill-judo")],
    techniques: [technique("technique-arm-lock")],
  });

  const report = executeSkillMechanicsResolutionPlan(resolutionPlan);
  const judo = report.skillReports[0];
  const armLock = report.techniqueResults[0];

  assert.equal(
    report.schemaVersion,
    getSkillMechanicsGlobalReportSchemaVersion(),
  );
  assert.equal(report.characterId, "character-one");
  assert.equal(judo.trainedResult.level, 13);
  assert.equal(judo.finalResult.level, 13);
  assert.equal(armLock.status, "resolved");
  assert.equal(armLock.level, 11);
  assert.equal(armLock.relativeLevel, -2);
  assert.deepEqual(armLock.basis, {
    kind: "technique",
    sourceId: "skill-judo",
    attribute: null,
  });
  assert.equal(validateSkillMechanicsGlobalReport(report), true);
});

test("uses only the trained Skill result as a Technique source", () => {
  const resolutionPlan = plan({
    skills: [skill("skill-judo", { points: 0 })],
    techniques: [technique("technique-arm-lock")],
    defaultCandidates: [createSkillDefaultCandidate({
      id: "default-judo-from-dx",
      targetSkillId: "skill-judo",
      sourceType: "attribute",
      sourceId: null,
      attribute: "DX",
      modifier: -1,
    })],
  });

  const report = executeSkillMechanicsResolutionPlan(resolutionPlan);
  const judo = report.skillReports[0];
  const armLock = report.techniqueResults[0];

  assert.equal(judo.trainedResult.status, "blocked");
  assert.equal(judo.finalResult.status, "resolved");
  assert.equal(judo.finalResult.level, 11);
  assert.equal(armLock.status, "blocked");
  assert.equal(
    armLock.diagnostics[0].code,
    "TECHNIQUE_SKILL_SOURCE_BLOCKED",
  );
});

test("blocks a Technique whose Skill reference is absent", () => {
  const resolutionPlan = plan({
    techniques: [technique("technique-unknown", {
      skillId: "skill-missing",
    })],
  });

  const report = executeSkillMechanicsResolutionPlan(resolutionPlan);
  const result = report.techniqueResults[0];

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.diagnostics, [{
    code: "TECHNIQUE_TRAINED_SKILL_SOURCE_MISSING",
    severity: "blocked",
    skillId: "skill-missing",
  }]);
});

test("keeps independent Technique results when another source is blocked", () => {
  const resolutionPlan = plan({
    skills: [
      skill("skill-judo"),
      skill("skill-karate", { points: 0 }),
    ],
    techniques: [
      technique("technique-arm-lock"),
      technique("technique-kicking", {
        skillId: "skill-karate",
        points: 1,
      }),
    ],
  });

  const report = executeSkillMechanicsResolutionPlan(resolutionPlan);

  assert.deepEqual(
    report.techniqueResults.map(item => item.entityId),
    ["technique-arm-lock", "technique-kicking"],
  );
  assert.equal(
    techniqueResult(report, "technique-arm-lock").status,
    "resolved",
  );
  assert.equal(
    techniqueResult(report, "technique-kicking").status,
    "blocked",
  );
  assert.equal(
    techniqueResult(report, "technique-kicking").diagnostics[0].code,
    "TECHNIQUE_SKILL_SOURCE_BLOCKED",
  );
});

test("preserves the declared order of Skills and Techniques", () => {
  const resolutionPlan = plan({
    skills: [
      skill("skill-karate"),
      skill("skill-judo"),
    ],
    techniques: [
      technique("technique-kicking", { skillId: "skill-karate" }),
      technique("technique-arm-lock"),
    ],
  });

  const report = executeSkillMechanicsResolutionPlan(resolutionPlan);

  assert.deepEqual(
    report.skillReports.map(item => item.skillId),
    ["skill-karate", "skill-judo"],
  );
  assert.deepEqual(
    report.techniqueResults.map(item => item.entityId),
    ["technique-kicking", "technique-arm-lock"],
  );
});

test("returns a valid empty global report", () => {
  const report = executeSkillMechanicsResolutionPlan(plan());

  assert.deepEqual(report.skillReports, []);
  assert.deepEqual(report.techniqueResults, []);
  assert.deepEqual(report.diagnostics, []);
  assert.equal(validateSkillMechanicsGlobalReport(report), true);
});

test("does not mutate the plan and deeply freezes the report", () => {
  const resolutionPlan = plan({
    skills: [skill("skill-judo")],
    techniques: [technique("technique-arm-lock")],
  });
  const before = structuredClone(resolutionPlan);

  const report = executeSkillMechanicsResolutionPlan(resolutionPlan);

  assert.deepEqual(resolutionPlan, before);
  assert.equal(Object.isFrozen(report), true);
  assert.equal(Object.isFrozen(report.skillReports), true);
  assert.equal(Object.isFrozen(report.skillReports[0]), true);
  assert.equal(Object.isFrozen(report.techniqueResults), true);
  assert.equal(Object.isFrozen(report.techniqueResults[0]), true);
});

test("serializes a detached global report", () => {
  const report = executeSkillMechanicsResolutionPlan(plan({
    skills: [skill("skill-judo")],
    techniques: [technique("technique-arm-lock")],
  }));

  const serialized = serializeSkillMechanicsGlobalReport(report);

  assert.deepEqual(serialized, report);
  assert.notEqual(serialized, report);
  assert.notEqual(serialized.skillReports, report.skillReports);
  assert.notEqual(serialized.techniqueResults, report.techniqueResults);
  assert.equal(Object.isFrozen(serialized), false);
});

test("rejects tampered Skill reports", () => {
  const report = serializeSkillMechanicsGlobalReport(
    executeSkillMechanicsResolutionPlan(plan({
      skills: [skill("skill-judo")],
    })),
  );
  report.skillReports[0].finalResult.level = 99;

  assert.throws(
    () => validateSkillMechanicsGlobalReport(report),
    /finalResult is inconsistent/,
  );
});

test("rejects duplicate or non-Technique result identities", () => {
  const report = serializeSkillMechanicsGlobalReport(
    executeSkillMechanicsResolutionPlan(plan({
      skills: [skill("skill-judo")],
      techniques: [
        technique("technique-arm-lock"),
        technique("technique-throw"),
      ],
    })),
  );
  report.techniqueResults[1].entityId = "technique-arm-lock";

  assert.throws(
    () => validateSkillMechanicsGlobalReport(report),
    /must not repeat entityId/,
  );

  const wrongType = serializeSkillMechanicsGlobalReport(
    executeSkillMechanicsResolutionPlan(plan({
      skills: [skill("skill-judo")],
      techniques: [technique("technique-arm-lock")],
    })),
  );
  wrongType.techniqueResults[0].entityType = "skill";
  assert.throws(
    () => validateSkillMechanicsGlobalReport(wrongType),
    /must be a Technique result/,
  );
});

test("rejects invalid resolved Technique basis", () => {
  const report = serializeSkillMechanicsGlobalReport(
    executeSkillMechanicsResolutionPlan(plan({
      skills: [skill("skill-judo")],
      techniques: [technique("technique-arm-lock")],
    })),
  );
  report.techniqueResults[0].basis.kind = "trained";

  assert.throws(
    () => validateSkillMechanicsGlobalReport(report),
    /invalid basis kind/,
  );
});

test("rejects invalid global schema, properties and diagnostics", () => {
  const original = serializeSkillMechanicsGlobalReport(
    executeSkillMechanicsResolutionPlan(plan()),
  );

  const wrongSchema = structuredClone(original);
  wrongSchema.schemaVersion = 2;
  assert.throws(
    () => validateSkillMechanicsGlobalReport(wrongSchema),
    /schemaVersion is invalid/,
  );

  const extra = structuredClone(original);
  extra.cache = {};
  assert.throws(
    () => validateSkillMechanicsGlobalReport(extra),
    /contains unsupported properties/,
  );

  const invalidDiagnostic = structuredClone(original);
  invalidDiagnostic.diagnostics.push({
    code: "GLOBAL_WARNING",
    severity: "unknown",
  });
  assert.throws(
    () => validateSkillMechanicsGlobalReport(invalidDiagnostic),
    /severity is invalid/,
  );
});

test("validates reconstructed global reports independently of key order", () => {
  const original = serializeSkillMechanicsGlobalReport(
    executeSkillMechanicsResolutionPlan(plan({
      skills: [skill("skill-judo")],
      techniques: [technique("technique-arm-lock")],
    })),
  );
  const reconstructed = {
    diagnostics: original.diagnostics,
    techniqueResults: original.techniqueResults,
    skillReports: original.skillReports,
    attributeLevels: original.attributeLevels,
    characterId: original.characterId,
    schemaVersion: original.schemaVersion,
  };

  assert.equal(validateSkillMechanicsGlobalReport(reconstructed), true);
  assert.equal(skillReport(reconstructed, "skill-judo").finalResult.level, 13);
});
