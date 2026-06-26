import test from "node:test";
import assert from "node:assert/strict";

import { createSkillDefaultCandidate } from "./SkillDefaultCandidate.js";
import { resolveSkillDefaultCandidate } from "./SkillDefaultResolver.js";

function skillCandidate(overrides = {}) {
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

function attributeCandidate(overrides = {}) {
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

test("resolves a Skill-source default candidate", () => {
  const result = resolveSkillDefaultCandidate({
    candidate: skillCandidate(),
    sourceLevel: 14,
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
  assert.deepEqual(result.diagnostics, [{
    code: "SKILL_DEFAULT_CANDIDATE_APPLIED",
    severity: "info",
    candidateId: "default-stealth-from-shadowing",
    sourceType: "skill",
    sourceLevel: 14,
    modifier: -4,
    targetAttributeLevel: 11,
  }]);
});

test("resolves an attribute default candidate", () => {
  const result = resolveSkillDefaultCandidate({
    candidate: attributeCandidate(),
    sourceLevel: 12,
    targetAttributeLevel: 10,
  });

  assert.equal(result.level, 7);
  assert.equal(result.relativeLevel, -3);
  assert.deepEqual(result.basis, {
    kind: "default",
    sourceId: null,
    attribute: "DX",
  });
});

test("supports positive modifiers without interpreting their origin", () => {
  const result = resolveSkillDefaultCandidate({
    candidate: skillCandidate({ modifier: 2 }),
    sourceLevel: 10,
    targetAttributeLevel: 10,
  });

  assert.equal(result.level, 12);
  assert.equal(result.relativeLevel, 2);
});

test("preserves the candidate and returns an immutable result", () => {
  const candidate = skillCandidate({
    metadata: { source: "manual" },
  });
  const before = structuredClone(candidate);

  const result = resolveSkillDefaultCandidate({
    candidate,
    sourceLevel: 14,
    targetAttributeLevel: 11,
  });

  assert.deepEqual(candidate, before);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.basis), true);
  assert.equal(Object.isFrozen(result.diagnostics), true);
});

test("blocks invalid source levels with portable diagnostics", () => {
  const cases = [
    [undefined, "undefined"],
    [null, null],
    ["14", "14"],
    [Number.NaN, "NaN"],
    [Number.POSITIVE_INFINITY, "Infinity"],
    [Number.NEGATIVE_INFINITY, "-Infinity"],
    [10n, "bigint"],
  ];

  for (const [sourceLevel, expected] of cases) {
    const result = resolveSkillDefaultCandidate({
      candidate: skillCandidate(),
      sourceLevel,
      targetAttributeLevel: 11,
    });

    assert.equal(result.status, "blocked");
    assert.equal(result.level, null);
    assert.deepEqual(result.diagnostics, [{
      code: "SKILL_DEFAULT_SOURCE_LEVEL_INVALID",
      severity: "blocked",
      candidateId: "default-stealth-from-shadowing",
      sourceLevel: expected,
    }]);
  }
});

test("blocks invalid target attribute levels", () => {
  const result = resolveSkillDefaultCandidate({
    candidate: skillCandidate(),
    sourceLevel: 14,
    targetAttributeLevel: Number.NaN,
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.diagnostics, [{
    code: "SKILL_DEFAULT_TARGET_ATTRIBUTE_LEVEL_INVALID",
    severity: "blocked",
    candidateId: "default-stealth-from-shadowing",
    targetAttributeLevel: "NaN",
  }]);
});

test("blocks non-finite calculated levels", () => {
  const result = resolveSkillDefaultCandidate({
    candidate: skillCandidate({ modifier: Number.MAX_SAFE_INTEGER }),
    sourceLevel: Number.MAX_VALUE,
    targetAttributeLevel: 10,
  });

  assert.equal(result.status, "blocked");
  assert.equal(
    result.diagnostics[0].code,
    "SKILL_DEFAULT_LEVEL_NON_FINITE",
  );
});

test("blocks non-finite relative levels", () => {
  const result = resolveSkillDefaultCandidate({
    candidate: skillCandidate({ modifier: 0 }),
    sourceLevel: Number.MAX_VALUE,
    targetAttributeLevel: -Number.MAX_VALUE,
  });

  assert.equal(result.status, "blocked");
  assert.equal(
    result.diagnostics[0].code,
    "SKILL_DEFAULT_RELATIVE_LEVEL_NON_FINITE",
  );
});

test("normalizes negative zero results", () => {
  const result = resolveSkillDefaultCandidate({
    candidate: skillCandidate({ modifier: 0 }),
    sourceLevel: -0,
    targetAttributeLevel: -0,
  });

  assert.equal(Object.is(result.level, -0), false);
  assert.equal(Object.is(result.relativeLevel, -0), false);
  assert.equal(result.level, 0);
  assert.equal(result.relativeLevel, 0);
});

test("rejects invalid resolver input and candidate structures", () => {
  assert.throws(
    () => resolveSkillDefaultCandidate(null),
    /resolution input must be an object/,
  );

  assert.throws(
    () => resolveSkillDefaultCandidate({
      candidate: {
        id: "invalid",
      },
      sourceLevel: 10,
      targetAttributeLevel: 10,
    }),
  );
});
