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
  executeSkillBatchResolution,
  getSkillBatchResolutionReportSchemaVersion,
  serializeSkillBatchResolutionReport,
  validateSkillBatchResolutionReport,
} from "./SkillBatchResolutionExecutor.js";
import {
  createSkillMechanicsResolutionPlan,
} from "./SkillMechanicsResolutionPlan.js";

function skill(id, overrides = {}) {
  return createSkill({
    id,
    name: id,
    attribute: "DX",
    difficulty: "A",
    points: 1,
    ...overrides,
  });
}

function candidate(input) {
  return createSkillDefaultCandidate(input);
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

function findReport(report, skillId) {
  return report.skillReports.find(item => item.skillId === skillId);
}

test("resolves all trained Skills before evaluating ordered defaults", () => {
  const resolutionPlan = plan({
    skills: [
      skill("skill-stealth"),
      skill("skill-shadowing", {
        attribute: "IQ",
        points: 8,
      }),
    ],
    defaultCandidates: [
      candidate({
        id: "default-stealth-from-dx",
        targetSkillId: "skill-stealth",
        sourceType: "attribute",
        sourceId: null,
        attribute: "DX",
        modifier: -5,
      }),
      candidate({
        id: "default-stealth-from-shadowing",
        targetSkillId: "skill-stealth",
        sourceType: "skill",
        sourceId: "skill-shadowing",
        attribute: null,
        modifier: -4,
      }),
    ],
  });

  const report = executeSkillBatchResolution(resolutionPlan);
  const stealth = findReport(report, "skill-stealth");
  const shadowing = findReport(report, "skill-shadowing");

  assert.equal(
    report.schemaVersion,
    getSkillBatchResolutionReportSchemaVersion(),
  );
  assert.deepEqual(
    report.skillReports.map(item => item.skillId),
    ["skill-stealth", "skill-shadowing"],
  );
  assert.equal(shadowing.trainedResult.level, 16);
  assert.equal(stealth.trainedResult.level, 11);
  assert.deepEqual(
    stealth.defaultEvaluations.map(item => item.candidateId),
    [
      "default-stealth-from-dx",
      "default-stealth-from-shadowing",
    ],
  );
  assert.equal(stealth.defaultEvaluations[0].result.level, 7);
  assert.equal(stealth.defaultEvaluations[1].result.level, 12);
  assert.equal(stealth.finalResult.level, 12);
  assert.equal(stealth.finalResult.basis.kind, "default");
  assert.equal(stealth.finalResult.basis.sourceId, "skill-shadowing");
});

test("never feeds a final default result into another Skill default", () => {
  const resolutionPlan = plan({
    skills: [
      skill("skill-shadowing", {
        attribute: "IQ",
        points: 0,
      }),
      skill("skill-stealth", { points: 0 }),
    ],
    defaultCandidates: [
      candidate({
        id: "default-shadowing-from-iq",
        targetSkillId: "skill-shadowing",
        sourceType: "attribute",
        sourceId: null,
        attribute: "IQ",
        modifier: -2,
      }),
      candidate({
        id: "default-stealth-from-shadowing",
        targetSkillId: "skill-stealth",
        sourceType: "skill",
        sourceId: "skill-shadowing",
        attribute: null,
        modifier: -1,
      }),
    ],
  });

  const report = executeSkillBatchResolution(resolutionPlan);
  const shadowing = findReport(report, "skill-shadowing");
  const stealth = findReport(report, "skill-stealth");

  assert.equal(shadowing.trainedResult.status, "blocked");
  assert.equal(shadowing.finalResult.status, "resolved");
  assert.equal(shadowing.finalResult.level, 12);

  assert.equal(stealth.trainedResult.status, "blocked");
  assert.equal(stealth.defaultEvaluations[0].result.status, "blocked");
  assert.equal(
    stealth.defaultEvaluations[0].result.diagnostics[0].code,
    "SKILL_DEFAULT_SOURCE_BLOCKED",
  );
  assert.equal(stealth.finalResult.status, "blocked");
});

test("preserves trained priority when trained and default levels tie", () => {
  const resolutionPlan = plan({
    skills: [skill("skill-stealth")],
    defaultCandidates: [candidate({
      id: "default-stealth-from-dx",
      targetSkillId: "skill-stealth",
      sourceType: "attribute",
      sourceId: null,
      attribute: "DX",
      modifier: -1,
    })],
  });

  const report = executeSkillBatchResolution(resolutionPlan);
  const stealth = report.skillReports[0];

  assert.equal(stealth.trainedResult.level, 11);
  assert.equal(stealth.defaultEvaluations[0].result.level, 11);
  assert.equal(stealth.finalResult.basis.kind, "trained");
});

test("keeps independent Skill results when one attribute is blocked", () => {
  const resolutionPlan = plan({
    attributeLevels: resolveAttributeLevels(createAttributes({
      DX: { base: 12, override: Number.NaN },
      IQ: 14,
    })),
    skills: [
      skill("skill-stealth", { points: 4 }),
      skill("skill-research", {
        attribute: "IQ",
        points: 4,
      }),
    ],
  });

  const report = executeSkillBatchResolution(resolutionPlan);
  const stealth = findReport(report, "skill-stealth");
  const research = findReport(report, "skill-research");

  assert.equal(report.attributeLevels.results.DX.status, "blocked");
  assert.equal(stealth.finalResult.status, "blocked");
  assert.equal(
    stealth.trainedResult.diagnostics[0].code,
    "SKILL_ATTRIBUTE_LEVEL_INVALID",
  );
  assert.equal(research.finalResult.status, "resolved");
  assert.equal(research.finalResult.level, 15);
});

test("blocks an attribute default whose source attribute is unavailable", () => {
  const resolutionPlan = plan({
    attributeLevels: resolveAttributeLevels(createAttributes({
      DX: { base: 12, override: Number.NaN },
      IQ: 14,
    })),
    skills: [skill("skill-research", {
      attribute: "IQ",
      points: 0,
    })],
    defaultCandidates: [candidate({
      id: "default-research-from-dx",
      targetSkillId: "skill-research",
      sourceType: "attribute",
      sourceId: null,
      attribute: "DX",
      modifier: -4,
    })],
  });

  const report = executeSkillBatchResolution(resolutionPlan);
  const research = report.skillReports[0];

  assert.equal(research.defaultEvaluations[0].result.status, "blocked");
  assert.equal(
    research.defaultEvaluations[0].result.diagnostics[0].code,
    "SKILL_DEFAULT_SOURCE_LEVEL_INVALID",
  );
  assert.equal(research.finalResult.status, "blocked");
});

test("returns an empty valid report for an empty plan", () => {
  const report = executeSkillBatchResolution(plan());

  assert.equal(report.characterId, "character-one");
  assert.deepEqual(report.skillReports, []);
  assert.deepEqual(report.diagnostics, []);
  assert.equal(validateSkillBatchResolutionReport(report), true);
});

test("leaves Techniques untouched for the next executor stage", () => {
  const resolutionPlan = plan({
    skills: [skill("skill-judo", { points: 4 })],
    techniques: [createTechnique({
      id: "technique-arm-lock",
      name: "Arm Lock",
      skillId: "skill-judo",
      difficulty: "A",
      points: 1,
      defaultPenalty: -4,
      maximumRelativeLevel: 0,
    })],
  });

  const report = executeSkillBatchResolution(resolutionPlan);

  assert.deepEqual(Object.keys(report), [
    "schemaVersion",
    "characterId",
    "attributeLevels",
    "skillReports",
    "diagnostics",
  ]);
  assert.equal(report.skillReports.length, 1);
  assert.equal("techniqueResults" in report, false);
});

test("does not mutate the plan and deeply freezes the report", () => {
  const resolutionPlan = plan({
    skills: [skill("skill-stealth")],
  });
  const before = structuredClone(resolutionPlan);

  const report = executeSkillBatchResolution(resolutionPlan);

  assert.deepEqual(resolutionPlan, before);
  assert.equal(Object.isFrozen(report), true);
  assert.equal(Object.isFrozen(report.attributeLevels), true);
  assert.equal(Object.isFrozen(report.skillReports), true);
  assert.equal(Object.isFrozen(report.skillReports[0]), true);
  assert.equal(Object.isFrozen(report.skillReports[0].finalResult), true);
});

test("serializes a detached report", () => {
  const report = executeSkillBatchResolution(plan({
    skills: [skill("skill-stealth")],
  }));

  const serialized = serializeSkillBatchResolutionReport(report);

  assert.deepEqual(serialized, report);
  assert.notEqual(serialized, report);
  assert.notEqual(serialized.attributeLevels, report.attributeLevels);
  assert.notEqual(serialized.skillReports, report.skillReports);
  assert.equal(Object.isFrozen(serialized), false);
});

test("rejects tampered local results and duplicate report identities", () => {
  const report = serializeSkillBatchResolutionReport(
    executeSkillBatchResolution(plan({
      skills: [
        skill("skill-stealth"),
        skill("skill-research", { attribute: "IQ" }),
      ],
    })),
  );
  report.skillReports[0].finalResult.level = 99;

  assert.throws(
    () => validateSkillBatchResolutionReport(report),
    /finalResult is inconsistent/,
  );

  const duplicate = serializeSkillBatchResolutionReport(
    executeSkillBatchResolution(plan({
      skills: [
        skill("skill-stealth"),
        skill("skill-research", { attribute: "IQ" }),
      ],
    })),
  );
  duplicate.skillReports[1].skillId = "skill-stealth";
  duplicate.skillReports[1].trainedResult.entityId = "skill-stealth";
  duplicate.skillReports[1].finalResult.entityId = "skill-stealth";

  assert.throws(
    () => validateSkillBatchResolutionReport(duplicate),
    /must not repeat skillId/,
  );
});

test("rejects invalid report schema, properties and diagnostics", () => {
  const original = serializeSkillBatchResolutionReport(
    executeSkillBatchResolution(plan()),
  );

  const wrongSchema = structuredClone(original);
  wrongSchema.schemaVersion = 2;
  assert.throws(
    () => validateSkillBatchResolutionReport(wrongSchema),
    /schemaVersion is invalid/,
  );

  const extra = structuredClone(original);
  extra.cache = {};
  assert.throws(
    () => validateSkillBatchResolutionReport(extra),
    /contains unsupported properties/,
  );

  const invalidDiagnostic = structuredClone(original);
  invalidDiagnostic.diagnostics.push({
    code: "GLOBAL_WARNING",
    severity: "unknown",
  });
  assert.throws(
    () => validateSkillBatchResolutionReport(invalidDiagnostic),
    /severity is invalid/,
  );
});

test("validates reconstructed reports independently of key order", () => {
  const original = serializeSkillBatchResolutionReport(
    executeSkillBatchResolution(plan({
      skills: [skill("skill-stealth")],
    })),
  );
  const reconstructed = {
    diagnostics: original.diagnostics,
    skillReports: original.skillReports,
    attributeLevels: original.attributeLevels,
    characterId: original.characterId,
    schemaVersion: original.schemaVersion,
  };

  assert.equal(validateSkillBatchResolutionReport(reconstructed), true);
});
