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
  createSkillMechanicsResolutionPlan,
  getSkillMechanicsResolutionPlanSchemaVersion,
  serializeSkillMechanicsResolutionPlan,
  validateSkillMechanicsResolutionPlan,
} from "./SkillMechanicsResolutionPlan.js";

function skill(id, overrides = {}) {
  return createSkill({
    id,
    name: id,
    attribute: "DX",
    difficulty: "A",
    points: 2,
    ...overrides,
  });
}

function technique(id, overrides = {}) {
  return createTechnique({
    id,
    name: id,
    skillId: "skill-judo",
    difficulty: "A",
    points: 1,
    defaultPenalty: -4,
    maximumRelativeLevel: 0,
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

function validInput(overrides = {}) {
  return {
    characterId: "character-one",
    attributeLevels: resolveAttributeLevels(createAttributes({
      ST: 10,
      DX: 12,
      IQ: 11,
      HT: 10,
    })),
    skills: [
      skill("skill-stealth"),
      skill("skill-shadowing", { attribute: "IQ" }),
      skill("skill-judo"),
    ],
    techniques: [technique("technique-arm-lock")],
    defaultCandidates: [
      attributeDefault(),
      skillDefault(),
    ],
    ...overrides,
  };
}

test("creates a portable global resolution plan in declared order", () => {
  const plan = createSkillMechanicsResolutionPlan(validInput());

  assert.equal(
    plan.schemaVersion,
    getSkillMechanicsResolutionPlanSchemaVersion(),
  );
  assert.equal(plan.characterId, "character-one");
  assert.deepEqual(
    plan.skills.map(item => item.id),
    ["skill-stealth", "skill-shadowing", "skill-judo"],
  );
  assert.deepEqual(
    plan.techniques.map(item => item.id),
    ["technique-arm-lock"],
  );
  assert.deepEqual(
    plan.defaultCandidates.map(item => item.id),
    [
      "default-stealth-from-dx",
      "default-stealth-from-shadowing",
    ],
  );
  assert.equal(validateSkillMechanicsResolutionPlan(plan), true);
});

test("accepts an empty character mechanics plan", () => {
  const plan = createSkillMechanicsResolutionPlan({
    characterId: "character-empty",
    attributeLevels: resolveAttributeLevels(createAttributes()),
  });

  assert.deepEqual(plan.skills, []);
  assert.deepEqual(plan.techniques, []);
  assert.deepEqual(plan.defaultCandidates, []);
});

test("does not mutate inputs and deeply freezes its own snapshots", () => {
  const input = validInput();
  const before = structuredClone(input);

  const plan = createSkillMechanicsResolutionPlan(input);

  assert.deepEqual(input, before);
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(Object.isFrozen(plan.attributeLevels), true);
  assert.equal(Object.isFrozen(plan.skills), true);
  assert.equal(Object.isFrozen(plan.skills[0]), true);
  assert.equal(Object.isFrozen(plan.techniques), true);
  assert.equal(Object.isFrozen(plan.defaultCandidates), true);
});

test("serializes a detached mutable snapshot", () => {
  const plan = createSkillMechanicsResolutionPlan(validInput());

  const serialized = serializeSkillMechanicsResolutionPlan(plan);

  assert.deepEqual(serialized, plan);
  assert.notEqual(serialized, plan);
  assert.notEqual(serialized.attributeLevels, plan.attributeLevels);
  assert.notEqual(serialized.skills, plan.skills);
  assert.notEqual(serialized.skills[0], plan.skills[0]);
  assert.equal(Object.isFrozen(serialized), false);
});

test("accepts blocked attribute levels for later partial resolution", () => {
  const attributeLevels = resolveAttributeLevels(createAttributes({
    DX: { base: 10, override: Number.NaN },
  }));

  const plan = createSkillMechanicsResolutionPlan(validInput({
    attributeLevels,
  }));

  assert.equal(plan.attributeLevels.results.DX.status, "blocked");
  assert.equal(validateSkillMechanicsResolutionPlan(plan), true);
});

test("accepts unresolved Technique references for local executor diagnostics", () => {
  const plan = createSkillMechanicsResolutionPlan(validInput({
    techniques: [technique("technique-unknown", {
      skillId: "skill-missing",
    })],
  }));

  assert.equal(plan.techniques[0].skillId, "skill-missing");
});

test("rejects duplicate Skill, Technique and candidate identities", () => {
  assert.throws(
    () => createSkillMechanicsResolutionPlan(validInput({
      skills: [
        skill("skill-stealth"),
        skill("skill-stealth"),
      ],
      techniques: [],
      defaultCandidates: [],
    })),
    /skills must not repeat id: skill-stealth/,
  );

  assert.throws(
    () => createSkillMechanicsResolutionPlan(validInput({
      techniques: [
        technique("technique-arm-lock"),
        technique("technique-arm-lock"),
      ],
    })),
    /techniques must not repeat id: technique-arm-lock/,
  );

  const candidate = attributeDefault();
  assert.throws(
    () => createSkillMechanicsResolutionPlan(validInput({
      defaultCandidates: [candidate, candidate],
    })),
    /defaultCandidates must not repeat id/,
  );
});

test("rejects candidates whose target Skill does not exist", () => {
  assert.throws(
    () => createSkillMechanicsResolutionPlan(validInput({
      defaultCandidates: [attributeDefault({
        targetSkillId: "skill-missing",
      })],
    })),
    /targetSkillId must reference an existing Skill/,
  );
});

test("rejects Skill-source candidates whose source does not exist", () => {
  assert.throws(
    () => createSkillMechanicsResolutionPlan(validInput({
      defaultCandidates: [skillDefault({
        sourceId: "skill-missing",
      })],
    })),
    /sourceId must reference an existing Skill/,
  );
});

test("rejects unsupported attribute-default sources", () => {
  assert.throws(
    () => createSkillMechanicsResolutionPlan(validInput({
      defaultCandidates: [attributeDefault({ attribute: "PER" })],
    })),
    /attribute must reference ST, DX, IQ or HT/,
  );
});

test("rejects non-string and duplicate entity ids even when domain validation is permissive", () => {
  const numericIdSkill = skill("skill-stealth");
  numericIdSkill.id = 10;

  assert.throws(
    () => createSkillMechanicsResolutionPlan(validInput({
      skills: [numericIdSkill],
      techniques: [],
      defaultCandidates: [],
    })),
    /id must be a non-empty string/,
  );

  const emptyIdTechnique = technique("technique-arm-lock");
  emptyIdTechnique.id = "";
  assert.throws(
    () => createSkillMechanicsResolutionPlan(validInput({
      techniques: [emptyIdTechnique],
    })),
    /Technique must have id/,
  );
});

test("rejects sparse arrays before domain iteration can skip holes", () => {
  const sparseSkills = [];
  sparseSkills.length = 1;

  assert.throws(
    () => createSkillMechanicsResolutionPlan(validInput({
      skills: sparseSkills,
      techniques: [],
      defaultCandidates: [],
    })),
    /must not contain sparse entries/,
  );

  const sparseCandidates = [];
  sparseCandidates.length = 1;
  assert.throws(
    () => createSkillMechanicsResolutionPlan(validInput({
      defaultCandidates: sparseCandidates,
    })),
    /must not contain sparse entries/,
  );
});

test("rejects non-portable nested canonical evidence", () => {
  const nonPortable = skill("skill-stealth", {
    raw: {
      calculate: () => 12,
    },
  });

  assert.throws(
    () => createSkillMechanicsResolutionPlan(validInput({
      skills: [nonPortable],
      techniques: [],
      defaultCandidates: [],
    })),
    /must be JSON portable/,
  );
});

test("rejects invalid schema, unsupported properties and character identity", () => {
  assert.throws(
    () => createSkillMechanicsResolutionPlan(validInput({
      schemaVersion: 2,
    })),
    /schemaVersion is unsupported/,
  );

  assert.throws(
    () => createSkillMechanicsResolutionPlan(validInput({
      characterId: "",
    })),
    /characterId must be a non-empty string/,
  );

  const plan = serializeSkillMechanicsResolutionPlan(
    createSkillMechanicsResolutionPlan(validInput()),
  );
  plan.cache = {};
  assert.throws(
    () => validateSkillMechanicsResolutionPlan(plan),
    /contains unsupported properties/,
  );
});

test("validates a reconstructed portable plan independently of key order", () => {
  const original = serializeSkillMechanicsResolutionPlan(
    createSkillMechanicsResolutionPlan(validInput()),
  );
  const reconstructed = {
    defaultCandidates: original.defaultCandidates,
    techniques: original.techniques,
    skills: original.skills,
    attributeLevels: original.attributeLevels,
    characterId: original.characterId,
    schemaVersion: original.schemaVersion,
  };

  assert.equal(validateSkillMechanicsResolutionPlan(reconstructed), true);
});
