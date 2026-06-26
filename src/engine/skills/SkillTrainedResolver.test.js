import test from "node:test";
import assert from "node:assert/strict";

import { createSkill } from "../../domain/character/Skills.js";
import {
  getSkillDifficultyOffsets,
  resolveTrainedSkill,
} from "./SkillTrainedResolver.js";

function skillInput(overrides = {}) {
  return createSkill({
    id: "skill-stealth",
    name: "Stealth",
    attribute: "DX",
    difficulty: "A",
    points: 1,
    ...overrides,
  });
}

const progressionCases = [
  ["E", 1, 0], ["E", 2, 1], ["E", 4, 2], ["E", 8, 3],
  ["A", 1, -1], ["A", 2, 0], ["A", 4, 1], ["A", 8, 2],
  ["H", 1, -2], ["H", 2, -1], ["H", 4, 0], ["H", 8, 1],
  ["VH", 1, -3], ["VH", 2, -2], ["VH", 4, -1], ["VH", 8, 0],
];

for (const [difficulty, points, expectedRelativeLevel] of progressionCases) {
  test(`resolves ${difficulty} at ${points} points`, () => {
    const result = resolveTrainedSkill({
      skill: skillInput({ difficulty, points }),
      attributeLevel: 10,
    });

    assert.equal(result.status, "resolved");
    assert.equal(result.entityId, "skill-stealth");
    assert.equal(result.entityType, "skill");
    assert.equal(result.relativeLevel, expectedRelativeLevel);
    assert.equal(result.level, 10 + expectedRelativeLevel);
    assert.deepEqual(result.basis, {
      kind: "trained",
      sourceId: null,
      attribute: "DX",
    });
    assert.deepEqual(result.appliedModifierIds, []);
    assert.deepEqual(result.diagnostics, []);
  });
}

test("keeps intermediate point investments at the current threshold", () => {
  const cases = [
    [3, 0], [5, 1], [7, 1], [9, 2],
    [11, 2], [12, 3], [15, 3], [16, 4],
  ];

  for (const [points, expectedRelativeLevel] of cases) {
    const result = resolveTrainedSkill({
      skill: skillInput({ points }),
      attributeLevel: 10,
    });
    assert.equal(result.relativeLevel, expectedRelativeLevel);
    assert.equal(result.level, 10 + expectedRelativeLevel);
  }
});

test("supports high point investments without a table ceiling", () => {
  const result = resolveTrainedSkill({
    skill: skillInput({ difficulty: "VH", points: 100 }),
    attributeLevel: 14,
  });

  assert.equal(result.relativeLevel, 23);
  assert.equal(result.level, 37);
});

test("preserves the input Skill and returns an immutable result", () => {
  const skill = skillInput({
    importedLevel: 12,
    importedRelativeLevel: 1,
  });
  const before = structuredClone(skill);

  const result = resolveTrainedSkill({ skill, attributeLevel: 11 });

  assert.deepEqual(skill, before);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.basis), true);
  assert.equal(Object.isFrozen(result.diagnostics), true);
});

test("does not warn when imported levels match the calculation", () => {
  const result = resolveTrainedSkill({
    skill: skillInput({
      points: 4,
      importedLevel: 11,
      importedRelativeLevel: 1,
    }),
    attributeLevel: 10,
  });

  assert.deepEqual(result.diagnostics, []);
});

test("reports imported absolute and relative level divergences", () => {
  const result = resolveTrainedSkill({
    skill: skillInput({
      points: 4,
      importedLevel: 12,
      importedRelativeLevel: 2,
    }),
    attributeLevel: 10,
  });

  assert.deepEqual(result.diagnostics, [
    {
      code: "SKILL_IMPORTED_LEVEL_DIFFERS",
      severity: "warning",
      importedLevel: 12,
      calculatedLevel: 11,
    },
    {
      code: "SKILL_IMPORTED_RELATIVE_LEVEL_DIFFERS",
      severity: "warning",
      importedRelativeLevel: 2,
      calculatedRelativeLevel: 1,
    },
  ]);
});

test("blocks a Skill without a declared attribute", () => {
  const result = resolveTrainedSkill({
    skill: skillInput({ attribute: null }),
    attributeLevel: 10,
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.level, null);
  assert.equal(result.relativeLevel, null);
  assert.deepEqual(result.diagnostics, [{
    code: "SKILL_ATTRIBUTE_MISSING",
    severity: "blocked",
  }]);
});

test("blocks missing and unsupported difficulties", () => {
  const missing = resolveTrainedSkill({
    skill: skillInput({ difficulty: null }),
    attributeLevel: 10,
  });
  assert.equal(missing.diagnostics[0].code, "SKILL_DIFFICULTY_MISSING");

  const unsupported = resolveTrainedSkill({
    skill: skillInput({ difficulty: "MD" }),
    attributeLevel: 10,
  });
  assert.deepEqual(unsupported.diagnostics, [{
    code: "SKILL_DIFFICULTY_UNSUPPORTED",
    severity: "blocked",
    difficulty: "MD",
    supportedDifficulties: ["E", "A", "H", "VH"],
  }]);
});

test("blocks zero points because no trained level exists", () => {
  const result = resolveTrainedSkill({
    skill: skillInput({ points: 0 }),
    attributeLevel: 10,
  });

  assert.deepEqual(result.diagnostics, [{
    code: "SKILL_UNTRAINED",
    severity: "blocked",
    points: 0,
  }]);
});

test("blocks fractional and non-finite point values", () => {
  for (const points of [1.5, Number.POSITIVE_INFINITY]) {
    const result = resolveTrainedSkill({
      skill: skillInput({ points }),
      attributeLevel: 10,
    });
    assert.equal(result.status, "blocked");
    assert.equal(result.diagnostics[0].code, "SKILL_POINTS_INVALID");
  }
});

test("keeps structural validation sovereign for negative points", () => {
  assert.throws(
    () => resolveTrainedSkill({
      skill: { ...skillInput(), points: -1 },
      attributeLevel: 10,
    }),
    /Skill points must be non-negative number/,
  );
});

test("blocks absent, non-numeric and non-finite attribute levels", () => {
  const cases = [
    [undefined, "undefined"],
    [null, null],
    ["10", "10"],
    [Number.NaN, "NaN"],
    [Number.POSITIVE_INFINITY, "Infinity"],
  ];

  for (const [attributeLevel, expectedDiagnosticValue] of cases) {
    const result = resolveTrainedSkill({
      skill: skillInput(),
      attributeLevel,
    });
    assert.equal(result.status, "blocked");
    assert.equal(result.diagnostics[0].code, "SKILL_ATTRIBUTE_LEVEL_INVALID");
    assert.equal(result.diagnostics[0].attributeLevel, expectedDiagnosticValue);
  }
});

test("rejects non-object resolver input and invalid Skill structures", () => {
  assert.throws(
    () => resolveTrainedSkill(null),
    /resolution input must be an object/,
  );
  assert.throws(
    () => resolveTrainedSkill({
      skill: { id: "skill-invalid" },
      attributeLevel: 10,
    }),
  );
});

test("exposes detached canonical difficulty offsets", () => {
  const first = getSkillDifficultyOffsets();
  assert.deepEqual(first, { E: 0, A: -1, H: -2, VH: -3 });
  first.E = 99;
  assert.equal(getSkillDifficultyOffsets().E, 0);
});
