import test from "node:test";
import assert from "node:assert/strict";

import {
  createSkillDefaultCandidate,
} from "./SkillDefaultCandidate.js";
import {
  createSkillMechanicsResult,
} from "./SkillMechanicsResult.js";
import {
  resolveSkillDefaultFromTrainedSource,
} from "./SkillDefaultTrainedSourceResolver.js";

function candidate(overrides = {}) {
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

function trainedSource(overrides = {}) {
  return createSkillMechanicsResult({
    entityId: "skill-shadowing",
    entityType: "skill",
    status: "resolved",
    level: 14,
    relativeLevel: 2,
    basis: {
      kind: "trained",
      sourceId: null,
      attribute: "IQ",
    },
    ...overrides,
  });
}

test("evaluates a default from an explicitly trained Skill source", () => {
  const result = resolveSkillDefaultFromTrainedSource({
    candidate: candidate(),
    trainedSourceResult: trainedSource(),
    targetAttributeLevel: 11,
  });

  assert.equal(result.status, "resolved");
  assert.equal(result.entityId, "skill-stealth");
  assert.equal(result.level, 10);
  assert.equal(result.relativeLevel, -1);
  assert.deepEqual(result.basis, {
    kind: "default",
    sourceId: "skill-shadowing",
    attribute: null,
  });
});

test("blocks when no trained source result is supplied", () => {
  const result = resolveSkillDefaultFromTrainedSource({
    candidate: candidate(),
    targetAttributeLevel: 11,
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.diagnostics, [{
    code: "SKILL_DEFAULT_TRAINED_SOURCE_MISSING",
    severity: "blocked",
    sourceId: "skill-shadowing",
  }]);
});

test("blocks and preserves context when the source result is blocked", () => {
  const source = createSkillMechanicsResult({
    entityId: "skill-shadowing",
    entityType: "skill",
    status: "blocked",
    diagnostics: [{
      code: "SKILL_UNTRAINED",
      severity: "blocked",
      points: 0,
    }],
  });

  const result = resolveSkillDefaultFromTrainedSource({
    candidate: candidate(),
    trainedSourceResult: source,
    targetAttributeLevel: 11,
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.diagnostics, [{
    code: "SKILL_DEFAULT_SOURCE_BLOCKED",
    severity: "blocked",
    sourceId: "skill-shadowing",
    sourceDiagnostics: [{
      code: "SKILL_UNTRAINED",
      severity: "blocked",
      points: 0,
    }],
  }]);
});

test("blocks a source that was resolved only by default", () => {
  const source = createSkillMechanicsResult({
    entityId: "skill-shadowing",
    entityType: "skill",
    status: "resolved",
    level: 14,
    relativeLevel: 2,
    basis: {
      kind: "default",
      sourceId: "skill-acting",
      attribute: null,
    },
  });

  const result = resolveSkillDefaultFromTrainedSource({
    candidate: candidate(),
    trainedSourceResult: source,
    targetAttributeLevel: 11,
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.diagnostics, [{
    code: "SKILL_DEFAULT_SOURCE_NOT_TRAINED",
    severity: "blocked",
    sourceId: "skill-shadowing",
    sourceBasisKind: "default",
  }]);
});

test("rejects attribute candidates in the trained-source resolver", () => {
  const attributeCandidate = createSkillDefaultCandidate({
    id: "default-stealth-from-dx",
    targetSkillId: "skill-stealth",
    sourceType: "attribute",
    sourceId: null,
    attribute: "DX",
    modifier: -5,
  });

  assert.throws(
    () => resolveSkillDefaultFromTrainedSource({
      candidate: attributeCandidate,
      trainedSourceResult: trainedSource(),
      targetAttributeLevel: 11,
    }),
    /must use a Skill source/,
  );
});

test("rejects a source result for another Skill", () => {
  assert.throws(
    () => resolveSkillDefaultFromTrainedSource({
      candidate: candidate(),
      trainedSourceResult: trainedSource({
        entityId: "skill-acting",
      }),
      targetAttributeLevel: 11,
    }),
    /must match candidate sourceId/,
  );
});

test("rejects a Technique result as a Skill source", () => {
  const source = createSkillMechanicsResult({
    entityId: "skill-shadowing",
    entityType: "technique",
    status: "resolved",
    level: 14,
    relativeLevel: 2,
    basis: {
      kind: "technique",
      sourceId: "skill-acting",
      attribute: null,
    },
  });

  assert.throws(
    () => resolveSkillDefaultFromTrainedSource({
      candidate: candidate(),
      trainedSourceResult: source,
      targetAttributeLevel: 11,
    }),
    /must be a Skill mechanics result/,
  );
});

test("does not mutate its inputs", () => {
  const input = {
    candidate: candidate({ metadata: { source: "manual" } }),
    trainedSourceResult: trainedSource({
      diagnostics: [{
        code: "SOURCE_WARNING",
        severity: "warning",
      }],
    }),
    targetAttributeLevel: 11,
  };
  const before = structuredClone(input);

  const result = resolveSkillDefaultFromTrainedSource(input);

  assert.deepEqual(input, before);
  assert.equal(Object.isFrozen(result), true);
});

test("keeps target attribute validation delegated to the unit resolver", () => {
  const result = resolveSkillDefaultFromTrainedSource({
    candidate: candidate(),
    trainedSourceResult: trainedSource(),
    targetAttributeLevel: Number.NaN,
  });

  assert.equal(result.status, "blocked");
  assert.equal(
    result.diagnostics[0].code,
    "SKILL_DEFAULT_TARGET_ATTRIBUTE_LEVEL_INVALID",
  );
});

test("rejects invalid input and invalid candidate structures", () => {
  assert.throws(
    () => resolveSkillDefaultFromTrainedSource(null),
    /must be an object/,
  );

  assert.throws(
    () => resolveSkillDefaultFromTrainedSource({
      candidate: { id: "invalid" },
      trainedSourceResult: trainedSource(),
      targetAttributeLevel: 11,
    }),
  );
});
