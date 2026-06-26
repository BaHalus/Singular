import test from "node:test";
import assert from "node:assert/strict";

import { createSkillMechanicsResult } from "./SkillMechanicsResult.js";
import { selectSkillMechanicsResult } from "./SkillResultSelector.js";

function trainedResult(overrides = {}) {
  return createSkillMechanicsResult({
    entityId: "skill-stealth",
    entityType: "skill",
    status: "resolved",
    level: 12,
    relativeLevel: 0,
    basis: {
      kind: "trained",
      sourceId: null,
      attribute: "DX",
    },
    appliedModifierIds: [],
    diagnostics: [],
    ...overrides,
  });
}

function defaultResult(overrides = {}) {
  return createSkillMechanicsResult({
    entityId: "skill-stealth",
    entityType: "skill",
    status: "resolved",
    level: 10,
    relativeLevel: -2,
    basis: {
      kind: "default",
      sourceId: null,
      attribute: "DX",
    },
    appliedModifierIds: [],
    diagnostics: [],
    ...overrides,
  });
}

function blockedDefault(overrides = {}) {
  return createSkillMechanicsResult({
    entityId: "skill-stealth",
    entityType: "skill",
    status: "blocked",
    diagnostics: [{
      code: "SKILL_DEFAULT_SOURCE_LEVEL_INVALID",
      severity: "blocked",
      sourceLevel: "undefined",
    }],
    ...overrides,
  });
}

test("selects the highest resolved Skill mechanics level", () => {
  const result = selectSkillMechanicsResult({
    trainedResult: trainedResult({ level: 11, relativeLevel: -1 }),
    defaultResults: [
      defaultResult({ level: 9, relativeLevel: -3 }),
      defaultResult({
        level: 13,
        relativeLevel: 1,
        basis: {
          kind: "default",
          sourceId: "skill-shadowing",
          attribute: null,
        },
      }),
    ],
  });

  assert.equal(result.status, "resolved");
  assert.equal(result.level, 13);
  assert.equal(result.relativeLevel, 1);
  assert.deepEqual(result.basis, {
    kind: "default",
    sourceId: "skill-shadowing",
    attribute: null,
  });
});

test("prefers trained result over default on equal level", () => {
  const result = selectSkillMechanicsResult({
    trainedResult: trainedResult({ level: 12, relativeLevel: 0 }),
    defaultResults: [defaultResult({ level: 12, relativeLevel: 0 })],
  });

  assert.equal(result.status, "resolved");
  assert.deepEqual(result.basis, {
    kind: "trained",
    sourceId: null,
    attribute: "DX",
  });
});

test("keeps default input order as deterministic tie-breaker", () => {
  const first = defaultResult({
    level: 10,
    relativeLevel: -2,
    basis: {
      kind: "default",
      sourceId: "skill-shadowing",
      attribute: null,
    },
  });
  const second = defaultResult({
    level: 10,
    relativeLevel: -2,
    basis: {
      kind: "default",
      sourceId: "skill-urban-survival",
      attribute: null,
    },
  });

  const result = selectSkillMechanicsResult({
    defaultResults: [first, second],
  });

  assert.equal(result.status, "resolved");
  assert.deepEqual(result.basis, first.basis);
});

test("ignores blocked defaults when a resolved result exists", () => {
  const result = selectSkillMechanicsResult({
    trainedResult: trainedResult(),
    defaultResults: [blockedDefault()],
  });

  assert.equal(result.status, "resolved");
  assert.equal(result.level, 12);
  assert.deepEqual(result.diagnostics, []);
});

test("aggregates diagnostics when every result is blocked", () => {
  const result = selectSkillMechanicsResult({
    defaultResults: [
      blockedDefault(),
      blockedDefault({
        diagnostics: [{
          code: "SKILL_DEFAULT_TARGET_ATTRIBUTE_LEVEL_INVALID",
          severity: "blocked",
          targetAttributeLevel: "NaN",
        }],
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.level, null);
  assert.equal(result.relativeLevel, null);
  assert.deepEqual(result.diagnostics.map(diagnostic => diagnostic.code), [
    "SKILL_DEFAULT_SOURCE_LEVEL_INVALID",
    "SKILL_DEFAULT_TARGET_ATTRIBUTE_LEVEL_INVALID",
  ]);
});

test("preserves winner warnings and returns an immutable result", () => {
  const warning = {
    code: "SKILL_IMPORTED_LEVEL_DIFFERS",
    severity: "warning",
    importedLevel: 11,
    calculatedLevel: 12,
  };

  const result = selectSkillMechanicsResult({
    trainedResult: trainedResult({ diagnostics: [warning] }),
    defaultResults: [],
  });

  assert.deepEqual(result.diagnostics, [warning]);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.basis), true);
  assert.equal(Object.isFrozen(result.diagnostics), true);
});

test("rejects empty input and mixed target Skills", () => {
  assert.throws(
    () => selectSkillMechanicsResult({}),
    /requires at least one result/,
  );

  assert.throws(
    () => selectSkillMechanicsResult({
      trainedResult: trainedResult(),
      defaultResults: [defaultResult({ entityId: "skill-shadowing" })],
    }),
    /must target the same Skill/,
  );
});

test("rejects wrong result kinds", () => {
  assert.throws(
    () => selectSkillMechanicsResult({
      trainedResult: defaultResult(),
    }),
    /trainedResult must have basis.kind trained/,
  );

  assert.throws(
    () => selectSkillMechanicsResult({
      defaultResults: [trainedResult()],
    }),
    /defaultResults\[0\] must have basis.kind default/,
  );
});
