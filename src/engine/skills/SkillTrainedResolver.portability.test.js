import test from "node:test";
import assert from "node:assert/strict";

import { createSkill } from "../../domain/character/Skills.js";
import { resolveTrainedSkill } from "./SkillTrainedResolver.js";

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

test("keeps invalid point diagnostics portable", () => {
  for (const [points, expected] of [
    [Number.NaN, "NaN"],
    [Number.POSITIVE_INFINITY, "Infinity"],
    [Number.NEGATIVE_INFINITY, "-Infinity"],
  ]) {
    const result = resolveTrainedSkill({
      skill: skillInput({ points }),
      attributeLevel: 10,
    });

    assert.equal(result.status, "blocked");
    assert.deepEqual(result.diagnostics, [{
      code: "SKILL_POINTS_INVALID",
      severity: "blocked",
      points: expected,
    }]);
  }
});

test("keeps unusual invalid attribute inputs portable", () => {
  for (const [attributeLevel, expected] of [
    [() => 10, "function"],
    [10n, "bigint"],
    [Symbol("10"), "symbol"],
    [{ value: 10 }, "object"],
  ]) {
    const result = resolveTrainedSkill({
      skill: skillInput(),
      attributeLevel,
    });

    assert.equal(result.status, "blocked");
    assert.equal(result.diagnostics[0].attributeLevel, expected);
  }
});

test("reports non-finite imported evidence without blocking calculation", () => {
  const result = resolveTrainedSkill({
    skill: skillInput({
      points: 4,
      importedLevel: Number.POSITIVE_INFINITY,
      importedRelativeLevel: Number.NEGATIVE_INFINITY,
    }),
    attributeLevel: 10,
  });

  assert.equal(result.status, "resolved");
  assert.equal(result.level, 11);
  assert.equal(result.relativeLevel, 1);
  assert.deepEqual(result.diagnostics, [
    {
      code: "SKILL_IMPORTED_LEVEL_INVALID",
      severity: "warning",
      importedLevel: "Infinity",
    },
    {
      code: "SKILL_IMPORTED_RELATIVE_LEVEL_INVALID",
      severity: "warning",
      importedRelativeLevel: "-Infinity",
    },
  ]);
});
