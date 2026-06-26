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

function createStealth(overrides = {}) {
  return createSkill({
    id: "skill-stealth",
    name: "Stealth",
    attribute: "DX",
    difficulty: "A",
    points: 4,
    ...overrides,
  });
}

function createSkillDefault(overrides = {}) {
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

function createAttributeDefault(overrides = {}) {
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

test("orchestrates a trained-only Skill resolution", () => {
  const report = orchestrateSkillResolution({
    skill: createStealth(),
    attributeLevel: 10,
  });

  assert.equal(
    report.schemaVersion,
    getSkillResolutionReportSchemaVersion(),
  );
  assert.equal(report.skillId, "skill-stealth");
  assert.equal(report.trainedResult.status, "resolved");
  assert.equal(report.trainedResult.level, 11);
  assert.equal(report.finalResult.level, 11);
  assert.equal(report.finalResult.basis.kind, "trained");
  assert.deepEqual(report.defaultEvaluations, []);
  assert.equal(validateSkillResolutionReport(report), true);
});

test("selects a stronger explicit default", () => {
  const report = orchestrateSkillResolution({
    skill: createStealth({ points: 1 }),
    attributeLevel: 10,
    defaultInputs: [
      {
        candidate: createSkillDefault(),
        sourceLevel: 16,
      },
    ],
  });

  assert.equal(report.trainedResult.level, 9);
  assert.equal(report.defaultEvaluations[0].result.level, 12);
  assert.equal(report.finalResult.level, 12);
  assert.equal(report.finalResult.basis.kind, "default");
  assert.equal(report.finalResult.basis.sourceId, "skill-shadowing");
});

test("keeps the trained result when levels tie", () => {
  const report = orchestrateSkillResolution({
    skill: createStealth({ points: 1 }),
    attributeLevel: 10,
    defaultInputs: [
      {
        candidate: createSkillDefault(),
        sourceLevel: 13,
      },
    ],
  });

  assert.equal(report.trainedResult.level, 9);
  assert.equal(report.defaultEvaluations[0].result.level, 9);
  assert.equal(report.finalResult.basis.kind, "trained");
});

test("preserves default input order for deterministic ties", () => {
  const first = createSkillDefault({
    id: "default-first",
    sourceId: "skill-first",
    modifier: -2,
  });
  const second = createSkillDefault({
    id: "default-second",
    sourceId: "skill-second",
    modifier: -3,
  });

  const report = orchestrateSkillResolution({
    skill: createStealth({ points: 0 }),
    attributeLevel: 10,
    defaultInputs: [
      { candidate: first, sourceLevel: 12 },
      { candidate: second, sourceLevel: 13 },
    ],
  });

  assert.deepEqual(
    report.defaultEvaluations.map(evaluation => evaluation.candidateId),
    ["default-first", "default-second"],
  );
  assert.equal(report.defaultEvaluations[0].result.level, 10);
  assert.equal(report.defaultEvaluations[1].result.level, 10);
  assert.equal(report.finalResult.basis.sourceId, "skill-first");
});

test("resolves an untrained Skill from an attribute default", () => {
  const report = orchestrateSkillResolution({
    skill: createStealth({ points: 0 }),
    attributeLevel: 11,
    defaultInputs: [
      {
        candidate: createAttributeDefault(),
        sourceLevel: 11,
      },
    ],
  });

  assert.equal(report.trainedResult.status, "blocked");
  assert.equal(report.trainedResult.diagnostics[0].code, "SKILL_UNTRAINED");
  assert.equal(report.finalResult.status, "resolved");
  assert.equal(report.finalResult.level, 6);
  assert.equal(report.finalResult.relativeLevel, -5);
  assert.equal(report.finalResult.basis.attribute, "DX");
});

test("retains a blocked default evaluation when trained wins", () => {
  const report = orchestrateSkillResolution({
    skill: createStealth(),
    attributeLevel: 10,
    defaultInputs: [
      {
        candidate: createSkillDefault(),
        sourceLevel: Number.NaN,
      },
    ],
  });

  assert.equal(report.finalResult.status, "resolved");
  assert.equal(report.finalResult.basis.kind, "trained");
  assert.equal(report.defaultEvaluations[0].result.status, "blocked");
  assert.equal(
    report.defaultEvaluations[0].result.diagnostics[0].code,
    "SKILL_DEFAULT_SOURCE_LEVEL_INVALID",
  );
});

test("aggregates blocking diagnostics when no result resolves", () => {
  const report = orchestrateSkillResolution({
    skill: createStealth({ points: 0 }),
    attributeLevel: Number.NaN,
    defaultInputs: [
      {
        candidate: createSkillDefault(),
        sourceLevel: Number.NaN,
      },
    ],
  });

  assert.equal(report.finalResult.status, "blocked");
  assert.deepEqual(
    report.finalResult.diagnostics.map(diagnostic => diagnostic.code),
    ["SKILL_UNTRAINED", "SKILL_DEFAULT_SOURCE_LEVEL_INVALID"],
  );
});

test("rejects a default candidate for another Skill", () => {
  assert.throws(
    () => orchestrateSkillResolution({
      skill: createStealth(),
      attributeLevel: 10,
      defaultInputs: [
        {
          candidate: createSkillDefault({
            targetSkillId: "skill-climbing",
          }),
          sourceLevel: 12,
        },
      ],
    }),
    /candidate must target the resolved Skill/,
  );
});

test("rejects repeated candidate identities", () => {
  const candidate = createSkillDefault();

  assert.throws(
    () => orchestrateSkillResolution({
      skill: createStealth(),
      attributeLevel: 10,
      defaultInputs: [
        { candidate, sourceLevel: 12 },
        { candidate, sourceLevel: 13 },
      ],
    }),
    /must not repeat candidate id/,
  );
});

test("rejects sparse default input arrays", () => {
  const defaultInputs = [];
  defaultInputs.length = 1;

  assert.throws(
    () => orchestrateSkillResolution({
      skill: createStealth(),
      attributeLevel: 10,
      defaultInputs,
    }),
    /must not contain sparse entries/,
  );
});

test("does not mutate inputs and returns an immutable report", () => {
  const skill = createStealth();
  const candidate = createSkillDefault({
    metadata: { source: "manual" },
  });
  const input = {
    skill,
    attributeLevel: 10,
    defaultInputs: [{ candidate, sourceLevel: 12 }],
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
    skill: createStealth(),
    attributeLevel: 10,
  });

  const serialized = serializeSkillResolutionReport(report);

  assert.deepEqual(serialized, report);
  assert.notEqual(serialized, report);
  assert.notEqual(serialized.finalResult, report.finalResult);
  assert.equal(Object.isFrozen(serialized), false);
});

test("accepts semantically equal final results with different key order", () => {
  const report = serializeSkillResolutionReport(
    orchestrateSkillResolution({
      skill: createStealth(),
      attributeLevel: 10,
    }),
  );
  report.finalResult = {
    status: report.finalResult.status,
    basis: {
      attribute: report.finalResult.basis.attribute,
      sourceId: report.finalResult.basis.sourceId,
      kind: report.finalResult.basis.kind,
    },
    relativeLevel: report.finalResult.relativeLevel,
    level: report.finalResult.level,
    entityType: report.finalResult.entityType,
    entityId: report.finalResult.entityId,
    diagnostics: report.finalResult.diagnostics,
  };

  assert.equal(validateSkillResolutionReport(report), true);
});

test("rejects an inconsistent final result", () => {
  const report = serializeSkillResolutionReport(
    orchestrateSkillResolution({
      skill: createStealth(),
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

test("rejects invalid report schema and non-object input", () => {
  assert.throws(
    () => orchestrateSkillResolution(null),
    /must be an object/,
  );

  const report = serializeSkillResolutionReport(
    orchestrateSkillResolution({
      skill: createStealth(),
      attributeLevel: 10,
    }),
  );
  report.schemaVersion = 2;

  assert.throws(
    () => validateSkillResolutionReport(report),
    /schemaVersion is invalid/,
  );
});
