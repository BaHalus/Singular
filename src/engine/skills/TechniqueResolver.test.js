import test from "node:test";
import assert from "node:assert/strict";

import { createTechnique } from "../../domain/character/Techniques.js";
import {
  createSkillMechanicsResult,
} from "./SkillMechanicsResult.js";
import {
  getTechniqueDifficulties,
  resolveTechnique,
} from "./TechniqueResolver.js";

function technique(overrides = {}) {
  return createTechnique({
    id: "technique-arm-lock",
    name: "Arm Lock",
    skillId: "skill-judo",
    skillName: "Judo",
    difficulty: "A",
    points: 0,
    defaultPenalty: -4,
    maximumRelativeLevel: 0,
    ...overrides,
  });
}

function trainedSkill(overrides = {}) {
  return createSkillMechanicsResult({
    entityId: "skill-judo",
    entityType: "skill",
    status: "resolved",
    level: 14,
    relativeLevel: 2,
    basis: {
      kind: "trained",
      sourceId: null,
      attribute: "DX",
    },
    ...overrides,
  });
}

test("resolves Average Technique progression from default", () => {
  const cases = [
    [0, -4, 10],
    [1, -3, 11],
    [4, 0, 14],
  ];

  for (const [points, relativeLevel, level] of cases) {
    const result = resolveTechnique({
      technique: technique({ points }),
      trainedSkillResult: trainedSkill(),
    });

    assert.equal(result.status, "resolved");
    assert.equal(result.entityId, "technique-arm-lock");
    assert.equal(result.entityType, "technique");
    assert.equal(result.relativeLevel, relativeLevel);
    assert.equal(result.level, level);
    assert.deepEqual(result.basis, {
      kind: "technique",
      sourceId: "skill-judo",
      attribute: null,
    });
  }
});

test("resolves Hard Technique progression with a two-point first level", () => {
  const cases = [
    [0, -4, 10],
    [2, -3, 11],
    [5, 0, 14],
  ];

  for (const [points, relativeLevel, level] of cases) {
    const result = resolveTechnique({
      technique: technique({ difficulty: "H", points }),
      trainedSkillResult: trainedSkill(),
    });

    assert.equal(result.status, "resolved");
    assert.equal(result.relativeLevel, relativeLevel);
    assert.equal(result.level, level);
  }
});

test("applies the declared maximum relative level", () => {
  const result = resolveTechnique({
    technique: technique({
      points: 8,
      maximumRelativeLevel: 0,
    }),
    trainedSkillResult: trainedSkill(),
  });

  assert.equal(result.level, 14);
  assert.equal(result.relativeLevel, 0);
  assert.deepEqual(result.diagnostics, [{
    code: "TECHNIQUE_MAXIMUM_APPLIED",
    severity: "info",
    uncappedRelativeLevel: 4,
    maximumRelativeLevel: 0,
  }]);
});

test("allows uncapped progression when no maximum is declared", () => {
  const result = resolveTechnique({
    technique: technique({
      points: 8,
      maximumRelativeLevel: null,
    }),
    trainedSkillResult: trainedSkill(),
  });

  assert.equal(result.relativeLevel, 4);
  assert.equal(result.level, 18);
  assert.deepEqual(result.diagnostics, []);
});

test("blocks one point in a Hard Technique", () => {
  const result = resolveTechnique({
    technique: technique({ difficulty: "H", points: 1 }),
    trainedSkillResult: trainedSkill(),
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.diagnostics, [{
    code: "TECHNIQUE_HARD_POINTS_INSUFFICIENT",
    severity: "blocked",
    points: 1,
    minimumPointsForImprovement: 2,
  }]);
});

test("blocks missing or unsupported structural mechanics", () => {
  const cases = [
    [
      technique({ skillId: null }),
      "TECHNIQUE_SKILL_ID_MISSING",
    ],
    [
      technique({ difficulty: null }),
      "TECHNIQUE_DIFFICULTY_MISSING",
    ],
    [
      technique({ difficulty: "VH" }),
      "TECHNIQUE_DIFFICULTY_UNSUPPORTED",
    ],
    [
      technique({ points: 1.5 }),
      "TECHNIQUE_POINTS_INVALID",
    ],
    [
      technique({ points: Number.POSITIVE_INFINITY }),
      "TECHNIQUE_POINTS_INVALID",
    ],
    [
      technique({ defaultPenalty: null }),
      "TECHNIQUE_DEFAULT_PENALTY_INVALID",
    ],
    [
      technique({ maximumRelativeLevel: Number.POSITIVE_INFINITY }),
      "TECHNIQUE_MAXIMUM_RELATIVE_LEVEL_INVALID",
    ],
    [
      technique({ defaultPenalty: -4, maximumRelativeLevel: -5 }),
      "TECHNIQUE_MAXIMUM_BELOW_DEFAULT",
    ],
  ];

  for (const [inputTechnique, code] of cases) {
    const result = resolveTechnique({
      technique: inputTechnique,
      trainedSkillResult: trainedSkill(),
    });
    assert.equal(result.status, "blocked");
    assert.equal(result.diagnostics[0].code, code);
  }
});

test("keeps negative points under structural validation", () => {
  assert.throws(
    () => resolveTechnique({
      technique: {
        ...technique(),
        points: -1,
      },
      trainedSkillResult: trainedSkill(),
    }),
    /Technique points must be non-negative number/,
  );
});

test("blocks a missing trained Skill source", () => {
  const result = resolveTechnique({
    technique: technique(),
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.diagnostics, [{
    code: "TECHNIQUE_TRAINED_SKILL_SOURCE_MISSING",
    severity: "blocked",
    skillId: "skill-judo",
  }]);
});

test("blocks and preserves context from a blocked Skill source", () => {
  const source = createSkillMechanicsResult({
    entityId: "skill-judo",
    entityType: "skill",
    status: "blocked",
    diagnostics: [{
      code: "SKILL_UNTRAINED",
      severity: "blocked",
      points: 0,
    }],
  });

  const result = resolveTechnique({
    technique: technique(),
    trainedSkillResult: source,
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.diagnostics, [{
    code: "TECHNIQUE_SKILL_SOURCE_BLOCKED",
    severity: "blocked",
    skillId: "skill-judo",
    sourceDiagnostics: [{
      code: "SKILL_UNTRAINED",
      severity: "blocked",
      points: 0,
    }],
  }]);
});

test("blocks a Skill source known only by default", () => {
  const source = createSkillMechanicsResult({
    entityId: "skill-judo",
    entityType: "skill",
    status: "resolved",
    level: 14,
    relativeLevel: 2,
    basis: {
      kind: "default",
      sourceId: "skill-wrestling",
      attribute: null,
    },
  });

  const result = resolveTechnique({
    technique: technique(),
    trainedSkillResult: source,
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.diagnostics, [{
    code: "TECHNIQUE_SKILL_SOURCE_NOT_TRAINED",
    severity: "blocked",
    skillId: "skill-judo",
    sourceBasisKind: "default",
  }]);
});

test("rejects a source result for another entity or type", () => {
  assert.throws(
    () => resolveTechnique({
      technique: technique(),
      trainedSkillResult: trainedSkill({ entityId: "skill-karate" }),
    }),
    /must match technique skillId/,
  );

  const techniqueSource = createSkillMechanicsResult({
    entityId: "skill-judo",
    entityType: "technique",
    status: "resolved",
    level: 14,
    relativeLevel: 0,
    basis: {
      kind: "technique",
      sourceId: "skill-karate",
      attribute: null,
    },
  });
  assert.throws(
    () => resolveTechnique({
      technique: technique(),
      trainedSkillResult: techniqueSource,
    }),
    /must be a Skill mechanics result/,
  );
});

test("reports imported level divergences without replacing calculation", () => {
  const result = resolveTechnique({
    technique: technique({
      points: 2,
      importedLevel: 13,
      importedRelativeLevel: -1,
    }),
    trainedSkillResult: trainedSkill(),
  });

  assert.equal(result.level, 12);
  assert.equal(result.relativeLevel, -2);
  assert.deepEqual(result.diagnostics, [
    {
      code: "TECHNIQUE_IMPORTED_LEVEL_DIFFERS",
      severity: "warning",
      importedLevel: 13,
      calculatedLevel: 12,
    },
    {
      code: "TECHNIQUE_IMPORTED_RELATIVE_LEVEL_DIFFERS",
      severity: "warning",
      importedRelativeLevel: -1,
      calculatedRelativeLevel: -2,
    },
  ]);
});

test("reports non-finite imported evidence portably", () => {
  const result = resolveTechnique({
    technique: technique({
      importedLevel: Number.POSITIVE_INFINITY,
      importedRelativeLevel: Number.NEGATIVE_INFINITY,
    }),
    trainedSkillResult: trainedSkill(),
  });

  assert.equal(result.status, "resolved");
  assert.deepEqual(result.diagnostics, [
    {
      code: "TECHNIQUE_IMPORTED_LEVEL_INVALID",
      severity: "warning",
      importedLevel: "Infinity",
    },
    {
      code: "TECHNIQUE_IMPORTED_RELATIVE_LEVEL_INVALID",
      severity: "warning",
      importedRelativeLevel: "-Infinity",
    },
  ]);
});

test("does not mutate its inputs and returns an immutable result", () => {
  const input = {
    technique: technique({
      features: [{ type: "bonus", amount: 1 }],
    }),
    trainedSkillResult: trainedSkill(),
  };
  const before = structuredClone(input);

  const result = resolveTechnique(input);

  assert.deepEqual(input, before);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.basis), true);
});

test("exposes detached canonical difficulties", () => {
  const difficulties = getTechniqueDifficulties();
  assert.deepEqual(difficulties, ["A", "H"]);
  difficulties.push("VH");
  assert.deepEqual(getTechniqueDifficulties(), ["A", "H"]);
});

test("rejects invalid resolver input and Technique structures", () => {
  assert.throws(
    () => resolveTechnique(null),
    /must be an object/,
  );

  assert.throws(
    () => resolveTechnique({
      technique: { id: "invalid" },
      trainedSkillResult: trainedSkill(),
    }),
  );
});
