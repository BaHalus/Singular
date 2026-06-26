import test from "node:test";
import assert from "node:assert/strict";

import { createSkillDefaultCandidate } from "./SkillDefaultCandidate.js";
import { resolveSkillDefaultCandidate } from "./SkillDefaultResolver.js";

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

test("resolves an attribute-source default candidate", () => {
  const result = resolveSkillDefaultCandidate({
    candidate: attributeCandidate(),
    sourceLevel: 12,
    targetAttributeLevel: 12,
  });

  assert.equal(result.status, "resolved");
  assert.equal(result.entityId, "skill-stealth");
  assert.equal(result.entityType, "skill");
  assert.equal(result.level, 7);
  assert.equal(result.relativeLevel, -5);
  assert.deepEqual(result.basis, {
    kind: "default",
    sourceId: null,
    attribute: "DX",
  });
  assert.deepEqual(result.appliedModifierIds, []);
  assert.deepEqual(result.diagnostics, []);
});

test("resolves a Skill-source default candidate relative to the target attribute", () => {
  const result = resolveSkillDefaultCandidate({
    candidate: skillCandidate(),
    sourceLevel: 13,
    targetAttributeLevel: 11,
  });

  assert.equal(result.status, "resolved");
  assert.equal(result.level, 9);
  assert.equal(result.relativeLevel, -2);
  assert.deepEqual(result.basis, {
    kind: "default",
    sourceId: "skill-shadowing",
    attribute: null,
  });
});

test("preserves the candidate and returns an immutable result", () => {
  const candidate = skillCandidate({ metadata: { source: "test" } });
  const before = structuredClone(candidate);

  const result = resolveSkillDefaultCandidate({
    candidate,
    sourceLevel: 13,
    targetAttributeLevel: 11,
  });

  assert.deepEqual(candidate, before);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.basis), true);
  assert.equal(Object.isFrozen(result.diagnostics), true);
});

test("normalizes negative zero before emitting resolved values", () => {
  const result = resolveSkillDefaultCandidate({
    candidate: attributeCandidate({ modifier: -0 }),
    sourceLevel: -0,
    targetAttributeLevel: -0,
  });

  assert.equal(Object.is(result.level, -0), false);
  assert.equal(result.level, 0);
  assert.equal(Object.is(result.relativeLevel, -0), false);
  assert.equal(result.relativeLevel, 0);
});

test("blocks absent, non-numeric and non-finite source levels", () => {
  const cases = [
    [undefined, "undefined"],
    [null, null],
    ["12", "12"],
    [Number.NaN, "NaN"],
    [Number.POSITIVE_INFINITY, "Infinity"],
    [Number.NEGATIVE_INFINITY, "-Infinity"],
  ];

  for (const [sourceLevel, expectedDiagnosticValue] of cases) {
    const result = resolveSkillDefaultCandidate({
      candidate: skillCandidate(),
      sourceLevel,
      targetAttributeLevel: 10,
    });

    assert.equal(result.status, "blocked");
    assert.equal(result.level, null);
    assert.equal(result.relativeLevel, null);
    assert.equal(result.diagnostics[0].code, "SKILL_DEFAULT_SOURCE_LEVEL_INVALID");
    assert.equal(result.diagnostics[0].sourceLevel, expectedDiagnosticValue);
  }
});

test("blocks absent, non-numeric and non-finite target attribute levels", () => {
  const cases = [
    [undefined, "undefined"],
    [null, null],
    ["10", "10"],
    [Number.NaN, "NaN"],
    [Number.POSITIVE_INFINITY, "Infinity"],
    [Number.NEGATIVE_INFINITY, "-Infinity"],
  ];

  for (const [targetAttributeLevel, expectedDiagnosticValue] of cases) {
    const result = resolveSkillDefaultCandidate({
      candidate: skillCandidate(),
      sourceLevel: 12,
      targetAttributeLevel,
    });

    assert.equal(result.status, "blocked");
    assert.equal(
      result.diagnostics[0].code,
      "SKILL_DEFAULT_TARGET_ATTRIBUTE_LEVEL_INVALID",
    );
    assert.equal(
      result.diagnostics[0].targetAttributeLevel,
      expectedDiagnosticValue,
    );
  }
});

test("blocks arithmetic overflow before producing a non-portable level", () => {
  const result = resolveSkillDefaultCandidate({
    candidate: skillCandidate({ modifier: Number.MAX_VALUE }),
    sourceLevel: Number.MAX_VALUE,
    targetAttributeLevel: 10,
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.diagnostics, [{
    code: "SKILL_DEFAULT_LEVEL_INVALID",
    severity: "blocked",
    sourceLevel: Number.MAX_VALUE,
    modifier: Number.MAX_VALUE,
    calculatedLevel: "Infinity",
  }]);
});

test("rejects non-object resolver input and invalid candidates", () => {
  assert.throws(
    () => resolveSkillDefaultCandidate(null),
    /Skill default resolution input must be an object/,
  );

  assert.throws(
    () => resolveSkillDefaultCandidate({
      candidate: { id: "invalid" },
      sourceLevel: 10,
      targetAttributeLevel: 10,
    }),
  );
});
