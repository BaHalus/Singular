import test from "node:test";
import assert from "node:assert/strict";

import { createSkill } from "../../domain/character/Skills.js";
import {
  createSkillDefaultCandidate,
} from "../../engine/skills/SkillDefaultCandidate.js";
import {
  createSkillMechanicsResult,
} from "../../engine/skills/SkillMechanicsResult.js";
import {
  getSkillResolutionReportSchemaVersion,
  orchestrateSkillResolution,
  serializeSkillResolutionReport,
  validateSkillResolutionReport,
} from "./SkillResolutionOrchestrator.js";

function skill(overrides = {}) {
  return createSkill({
    id: "skill-stealth",
    name: "Stealth",
    attribute: "DX",
    difficulty: "A",
    points: 4,
    ...overrides,
  });
}

function skillDefault(overrides = {}) {
  return createSkillDefaultCandidate({
    id: "default-stealth-from-shadowing",
    targetSkillId: "skill-stealth",
    sourceType: "skill",
    sourceId: "skill-shadowing",
    attribute: null,
    modifier: -4,
    ...overrides,
  });
}

function attributeDefault(overrides = {}) {
  return createSkillDefaultCandidate({
    id: "default-stealth-from-dx",
    targetSkillId: "skill-stealth",
    sourceType: "attribute",
    sourceId: null,
    attribute: "DX",
    modifier: -5,
    ...overrides,
  });
}

test("orchestrates a trained-only resolution", () => {
  const report = orchestrateSkillResolution({
    skill: skill(),
    attributeLevel: 10,
  });

  assert.equal(
    report.schemaVersion,
    getSkillResolutionReportSchemaVersion(),
  );
  assert.equal(report.skillId, "skill-stealth");
  assert.equal(report.trainedResult.level, 11);
  assert.equal(report.finalResult.level, 11);
  assert.equal(report.finalResult.basis.kind, "trained");
  assert.deepEqual(report.defaultEvaluations, []);
  assert.equal(validateSkillResolutionReport(report), true);
});

test("selects a stronger default and trained wins a tie", () => {
  const stronger = orchestrateSkillResolution({
    skill: skill({ points: 1 }),
    attributeLevel: 10,
    defaultInputs: [{ candidate: skillDefault(), sourceLevel: 16 }],
  });
  assert.equal(stronger.trainedResult.level, 9);
  assert.equal(stronger.defaultEvaluations[0].result.level, 12);
  assert.equal(stronger.finalResult.basis.kind, "default");

  const tie = orchestrateSkillResolution({
    skill: skill({ points: 1 }),
    attributeLevel: 10,
    defaultInputs: [{ candidate: skillDefault(), sourceLevel: 13 }],
  });
  assert.equal(tie.defaultEvaluations[0].result.level, 9);
  assert.equal(tie.finalResult.basis.kind, "trained");
});

test("preserves default order for deterministic ties", () => {
  const first = skillDefault({
    id: "default-first",
    sourceId: "skill-first",
    modifier: -2,
  });
  const second = skillDefault({
    id: "default-second",
    sourceId: "skill-second",
    modifier: -3,
  });

  const report = orchestrateSkillResolution({
    skill: skill({ points: 0 }),
    attributeLevel: 10,
    defaultInputs: [
      { candidate: first, sourceLevel: 12 },
      { candidate: second, sourceLevel: 13 },
    ],
  });

  assert.deepEqual(
    report.defaultEvaluations.map(item => item.candidateId),
    ["default-first", "default-second"],
  );
  assert.equal(report.finalResult.level, 10);
  assert.equal(report.finalResult.basis.sourceId, "skill-first");
});

test("resolves an untrained Skill from an attribute default", () => {
  const report = orchestrateSkillResolution({
    skill: skill({ points: 0 }),
    attributeLevel: 11,
    defaultInputs: [{ candidate: attributeDefault(), sourceLevel: 11 }],
  });

  assert.equal(report.trainedResult.status, "blocked");
  assert.equal(report.trainedResult.diagnostics[0].code, "SKILL_UNTRAINED");
  assert.equal(report.finalResult.status, "resolved");
  assert.equal(report.finalResult.level, 6);
  assert.equal(report.finalResult.relativeLevel, -5);
  assert.equal(report.finalResult.basis.attribute, "DX");
});

test("retains blocked evaluations and aggregates them when none resolve", () => {
  const trainedWins = orchestrateSkillResolution({
    skill: skill(),
    attributeLevel: 10,
    defaultInputs: [{
      candidate: skillDefault(),
      sourceLevel: Number.NaN,
    }],
  });
  assert.equal(trainedWins.finalResult.basis.kind, "trained");
  assert.equal(trainedWins.defaultEvaluations[0].result.status, "blocked");

  const blocked = orchestrateSkillResolution({
    skill: skill({ points: 0 }),
    attributeLevel: Number.NaN,
    defaultInputs: [{
      candidate: skillDefault(),
      sourceLevel: Number.NaN,
    }],
  });
  assert.equal(blocked.finalResult.status, "blocked");
  assert.deepEqual(
    blocked.finalResult.diagnostics.map(item => item.code),
    ["SKILL_UNTRAINED", "SKILL_DEFAULT_SOURCE_LEVEL_INVALID"],
  );
});

test("rejects wrong target, duplicate ids and sparse inputs", () => {
  assert.throws(
    () => orchestrateSkillResolution({
      skill: skill(),
      attributeLevel: 10,
      defaultInputs: [{
        candidate: skillDefault({ targetSkillId: "skill-climbing" }),
        sourceLevel: 12,
      }],
    }),
    /candidate must target the resolved Skill/,
  );

  const candidate = skillDefault();
  assert.throws(
    () => orchestrateSkillResolution({
      skill: skill(),
      attributeLevel: 10,
      defaultInputs: [
        { candidate, sourceLevel: 12 },
        { candidate, sourceLevel: 13 },
      ],
    }),
    /must not repeat candidate id/,
  );

  const sparse = [];
  sparse.length = 1;
  assert.throws(
    () => orchestrateSkillResolution({
      skill: skill(),
      attributeLevel: 10,
      defaultInputs: sparse,
    }),
    /must not contain sparse entries/,
  );
});

test("does not mutate inputs and returns an immutable report", () => {
  const input = {
    skill: skill(),
    attributeLevel: 10,
    defaultInputs: [{
      candidate: skillDefault({ metadata: { source: "manual" } }),
      sourceLevel: 12,
    }],
  };
  const before = structuredClone(input);

  const report = orchestrateSkillResolution(input);

  assert.deepEqual(input, before);
  assert.equal(Object.isFrozen(report), true);
  assert.equal(Object.isFrozen(report.finalResult), true);
  assert.equal(Object.isFrozen(report.defaultEvaluations), true);
  assert.equal(Object.isFrozen(report.defaultEvaluations[0]), true);
});

test("serializes a detached report", () => {
  const report = orchestrateSkillResolution({
    skill: skill(),
    attributeLevel: 10,
  });
  const serialized = serializeSkillResolutionReport(report);

  assert.deepEqual(serialized, report);
  assert.notEqual(serialized, report);
  assert.notEqual(serialized.finalResult, report.finalResult);
  assert.equal(Object.isFrozen(serialized), false);
});

test("accepts a semantically equal finalResult with reordered keys", () => {
  const report = serializeSkillResolutionReport(
    orchestrateSkillResolution({
      skill: skill(),
      attributeLevel: 10,
    }),
  );
  const result = report.finalResult;

  report.finalResult = {
    status: result.status,
    basis: {
      attribute: result.basis.attribute,
      sourceId: result.basis.sourceId,
      kind: result.basis.kind,
    },
    diagnostics: result.diagnostics,
    relativeLevel: result.relativeLevel,
    appliedModifierIds: result.appliedModifierIds,
    level: result.level,
    entityType: result.entityType,
    entityId: result.entityId,
    schemaVersion: result.schemaVersion,
  };

  assert.equal(validateSkillResolutionReport(report), true);
  assert.deepEqual(serializeSkillResolutionReport(report), report);
});

test("rejects an inconsistent final result", () => {
  const report = serializeSkillResolutionReport(
    orchestrateSkillResolution({
      skill: skill(),
      attributeLevel: 10,
    }),
  );
  report.finalResult = createSkillMechanicsResult({
    entityId: "skill-stealth",
    entityType: "skill",
    status: "resolved",
    level: 99,
    relativeLevel: 89,
    basis: {
      kind: "trained",
      sourceId: null,
      attribute: "DX",
    },
  });

  assert.throws(
    () => validateSkillResolutionReport(report),
    /finalResult is inconsistent/,
  );
});

test("rejects invalid input and report schema", () => {
  assert.throws(
    () => orchestrateSkillResolution(null),
    /must be an object/,
  );

  const report = serializeSkillResolutionReport(
    orchestrateSkillResolution({
      skill: skill(),
      attributeLevel: 10,
    }),
  );
  report.schemaVersion = 2;
  assert.throws(
    () => validateSkillResolutionReport(report),
    /schemaVersion is invalid/,
  );
});
