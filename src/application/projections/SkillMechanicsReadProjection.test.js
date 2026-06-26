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
  executeSkillMechanicsResolutionPlan,
} from "../skills/SkillMechanicsGlobalExecutor.js";
import {
  createSkillMechanicsResolutionPlan,
} from "../skills/SkillMechanicsResolutionPlan.js";
import {
  createSkillMechanicsReadProjection,
  getSkillMechanicsReadProjectionSchemaVersion,
  serializeSkillMechanicsReadProjection,
  validateSkillMechanicsReadProjection,
} from "./SkillMechanicsReadProjection.js";

function skill(id, overrides = {}) {
  return createSkill({
    id,
    name: `Editorial ${id}`,
    specialization: "Editorial specialization",
    attribute: "DX",
    difficulty: "A",
    points: 1,
    ...overrides,
  });
}

function technique(id, overrides = {}) {
  return createTechnique({
    id,
    name: `Editorial ${id}`,
    specialization: "Editorial specialization",
    skillId: "skill-judo",
    skillName: "Editorial Judo",
    difficulty: "A",
    points: 2,
    defaultPenalty: -4,
    maximumRelativeLevel: 0,
    ...overrides,
  });
}

function plan(overrides = {}) {
  return createSkillMechanicsResolutionPlan({
    characterId: "character-one",
    attributeLevels: resolveAttributeLevels(createAttributes({
      ST: 10,
      DX: 12,
      IQ: 14,
      HT: 11,
    })),
    skills: [],
    techniques: [],
    defaultCandidates: [],
    ...overrides,
  });
}

function projectionFromPlan(overrides = {}) {
  return createSkillMechanicsReadProjection(
    executeSkillMechanicsResolutionPlan(plan(overrides)),
  );
}

test("projects resolved attributes, Skills, defaults and Techniques by id", () => {
  const projection = projectionFromPlan({
    skills: [
      skill("skill-stealth"),
      skill("skill-shadowing", {
        attribute: "IQ",
        points: 8,
      }),
      skill("skill-judo", { points: 4 }),
    ],
    techniques: [technique("technique-arm-lock")],
    defaultCandidates: [
      createSkillDefaultCandidate({
        id: "default-stealth-from-dx",
        targetSkillId: "skill-stealth",
        sourceType: "attribute",
        sourceId: null,
        attribute: "DX",
        modifier: -5,
      }),
      createSkillDefaultCandidate({
        id: "default-stealth-from-shadowing",
        targetSkillId: "skill-stealth",
        sourceType: "skill",
        sourceId: "skill-shadowing",
        attribute: null,
        modifier: -4,
      }),
    ],
  });

  assert.equal(
    projection.schemaVersion,
    getSkillMechanicsReadProjectionSchemaVersion(),
  );
  assert.equal(projection.characterId, "character-one");
  assert.equal(projection.attributes.DX.level, 12);
  assert.equal(projection.attributes.IQ.level, 14);
  assert.deepEqual(
    projection.skills.map(item => item.id),
    ["skill-stealth", "skill-shadowing", "skill-judo"],
  );

  const stealth = projection.skills[0];
  assert.equal(stealth.trained.level, 11);
  assert.equal(stealth.final.level, 12);
  assert.equal(stealth.final.basis.kind, "default");
  assert.equal(stealth.final.basis.sourceId, "skill-shadowing");
  assert.deepEqual(
    stealth.defaults.map(item => item.candidateId),
    [
      "default-stealth-from-dx",
      "default-stealth-from-shadowing",
    ],
  );
  assert.equal(stealth.defaults[0].result.level, 7);
  assert.equal(stealth.defaults[1].result.level, 12);

  assert.deepEqual(
    projection.techniques.map(item => item.id),
    ["technique-arm-lock"],
  );
  assert.equal(projection.techniques[0].result.level, 11);
  assert.equal(projection.techniques[0].result.relativeLevel, -2);
  assert.equal(projection.techniques[0].result.basis.kind, "technique");
  assert.equal(validateSkillMechanicsReadProjection(projection), true);
});

test("does not project editorial Character fields", () => {
  const projection = projectionFromPlan({
    skills: [skill("skill-stealth")],
    techniques: [technique("technique-arm-lock", {
      skillId: "skill-stealth",
    })],
  });
  const serialized = JSON.stringify(projection);

  assert.equal("name" in projection.skills[0], false);
  assert.equal("specialization" in projection.skills[0], false);
  assert.equal("skillName" in projection.techniques[0], false);
  assert.equal(serialized.includes("Editorial"), false);
  assert.equal(serialized.includes("points"), false);
  assert.equal(serialized.includes("difficulty"), false);
});

test("preserves blocked attributes and independent resolved mechanics", () => {
  const projection = projectionFromPlan({
    attributeLevels: resolveAttributeLevels(createAttributes({
      DX: { base: 12, override: Number.NaN },
      IQ: 14,
    })),
    skills: [
      skill("skill-stealth", { points: 4 }),
      skill("skill-research", {
        attribute: "IQ",
        points: 4,
      }),
    ],
  });

  assert.equal(projection.attributes.DX.status, "blocked");
  assert.equal(projection.attributes.DX.level, null);
  assert.equal(
    projection.attributes.DX.diagnostics[0].code,
    "ATTRIBUTE_EFFECTIVE_LEVEL_INVALID",
  );
  assert.equal(projection.skills[0].final.status, "blocked");
  assert.equal(
    projection.skills[0].final.diagnostics[0].code,
    "SKILL_ATTRIBUTE_LEVEL_INVALID",
  );
  assert.equal(projection.skills[1].final.status, "resolved");
  assert.equal(projection.skills[1].final.level, 15);
});

test("preserves blocked defaults and Techniques with their provenance", () => {
  const projection = projectionFromPlan({
    skills: [
      skill("skill-shadowing", {
        attribute: "IQ",
        points: 0,
      }),
      skill("skill-stealth", { points: 0 }),
    ],
    techniques: [technique("technique-arm-lock", {
      skillId: "skill-shadowing",
    })],
    defaultCandidates: [
      createSkillDefaultCandidate({
        id: "default-shadowing-from-iq",
        targetSkillId: "skill-shadowing",
        sourceType: "attribute",
        sourceId: null,
        attribute: "IQ",
        modifier: -2,
      }),
      createSkillDefaultCandidate({
        id: "default-stealth-from-shadowing",
        targetSkillId: "skill-stealth",
        sourceType: "skill",
        sourceId: "skill-shadowing",
        attribute: null,
        modifier: -1,
      }),
    ],
  });

  const shadowing = projection.skills[0];
  const stealth = projection.skills[1];
  const armLock = projection.techniques[0];

  assert.equal(shadowing.trained.status, "blocked");
  assert.equal(shadowing.final.status, "resolved");
  assert.equal(shadowing.final.level, 12);
  assert.equal(stealth.defaults[0].result.status, "blocked");
  assert.equal(
    stealth.defaults[0].result.diagnostics[0].code,
    "SKILL_DEFAULT_SOURCE_BLOCKED",
  );
  assert.equal(armLock.result.status, "blocked");
  assert.equal(
    armLock.result.diagnostics[0].code,
    "TECHNIQUE_SKILL_SOURCE_BLOCKED",
  );
});

test("preserves declared order at every collection boundary", () => {
  const projection = projectionFromPlan({
    skills: [
      skill("skill-second"),
      skill("skill-first"),
    ],
    techniques: [
      technique("technique-second", { skillId: "skill-second" }),
      technique("technique-first", { skillId: "skill-first" }),
    ],
    defaultCandidates: [
      createSkillDefaultCandidate({
        id: "default-second-a",
        targetSkillId: "skill-second",
        sourceType: "attribute",
        sourceId: null,
        attribute: "DX",
        modifier: -4,
      }),
      createSkillDefaultCandidate({
        id: "default-second-b",
        targetSkillId: "skill-second",
        sourceType: "attribute",
        sourceId: null,
        attribute: "IQ",
        modifier: -6,
      }),
    ],
  });

  assert.deepEqual(
    projection.skills.map(item => item.id),
    ["skill-second", "skill-first"],
  );
  assert.deepEqual(
    projection.skills[0].defaults.map(item => item.candidateId),
    ["default-second-a", "default-second-b"],
  );
  assert.deepEqual(
    projection.techniques.map(item => item.id),
    ["technique-second", "technique-first"],
  );
});

test("returns a valid empty projection", () => {
  const projection = projectionFromPlan();

  assert.deepEqual(projection.skills, []);
  assert.deepEqual(projection.techniques, []);
  assert.deepEqual(projection.diagnostics, []);
  assert.equal(validateSkillMechanicsReadProjection(projection), true);
});

test("does not mutate the global report and deeply freezes the projection", () => {
  const globalReport = executeSkillMechanicsResolutionPlan(plan({
    skills: [skill("skill-stealth")],
  }));
  const before = structuredClone(globalReport);

  const projection = createSkillMechanicsReadProjection(globalReport);

  assert.deepEqual(globalReport, before);
  assert.equal(Object.isFrozen(projection), true);
  assert.equal(Object.isFrozen(projection.attributes), true);
  assert.equal(Object.isFrozen(projection.attributes.DX), true);
  assert.equal(Object.isFrozen(projection.skills), true);
  assert.equal(Object.isFrozen(projection.skills[0]), true);
  assert.equal(Object.isFrozen(projection.skills[0].final), true);
});

test("serializes a detached mutable projection", () => {
  const projection = projectionFromPlan({
    skills: [skill("skill-stealth")],
  });

  const serialized = serializeSkillMechanicsReadProjection(projection);

  assert.deepEqual(serialized, projection);
  assert.notEqual(serialized, projection);
  assert.notEqual(serialized.attributes, projection.attributes);
  assert.notEqual(serialized.skills, projection.skills);
  assert.notEqual(serialized.skills[0].final, projection.skills[0].final);
  assert.equal(Object.isFrozen(serialized), false);
});

test("rejects duplicate Skill, default and Technique identities", () => {
  const duplicateSkill = serializeSkillMechanicsReadProjection(
    projectionFromPlan({
      skills: [
        skill("skill-stealth"),
        skill("skill-research", { attribute: "IQ" }),
      ],
    }),
  );
  duplicateSkill.skills[1].id = "skill-stealth";
  assert.throws(
    () => validateSkillMechanicsReadProjection(duplicateSkill),
    /skills must not repeat id/,
  );

  const duplicateDefault = serializeSkillMechanicsReadProjection(
    projectionFromPlan({
      skills: [skill("skill-stealth")],
      defaultCandidates: [
        createSkillDefaultCandidate({
          id: "default-a",
          targetSkillId: "skill-stealth",
          sourceType: "attribute",
          sourceId: null,
          attribute: "DX",
          modifier: -4,
        }),
        createSkillDefaultCandidate({
          id: "default-b",
          targetSkillId: "skill-stealth",
          sourceType: "attribute",
          sourceId: null,
          attribute: "IQ",
          modifier: -5,
        }),
      ],
    }),
  );
  duplicateDefault.skills[0].defaults[1].candidateId = "default-a";
  assert.throws(
    () => validateSkillMechanicsReadProjection(duplicateDefault),
    /defaults must not repeat candidateId/,
  );

  const duplicateTechnique = serializeSkillMechanicsReadProjection(
    projectionFromPlan({
      skills: [skill("skill-judo", { points: 4 })],
      techniques: [
        technique("technique-arm-lock"),
        technique("technique-throw"),
      ],
    }),
  );
  duplicateTechnique.techniques[1].id = "technique-arm-lock";
  assert.throws(
    () => validateSkillMechanicsReadProjection(duplicateTechnique),
    /techniques must not repeat id/,
  );
});

test("rejects inconsistent resolved and blocked projected results", () => {
  const missingLevel = serializeSkillMechanicsReadProjection(
    projectionFromPlan({ skills: [skill("skill-stealth")] }),
  );
  missingLevel.skills[0].final.level = null;
  assert.throws(
    () => validateSkillMechanicsReadProjection(missingLevel),
    /resolved value must contain level/,
  );

  const invalidBlocked = serializeSkillMechanicsReadProjection(
    projectionFromPlan({
      skills: [skill("skill-stealth", { points: 0 })],
    }),
  );
  invalidBlocked.skills[0].final.diagnostics = [];
  assert.throws(
    () => validateSkillMechanicsReadProjection(invalidBlocked),
    /blocked value must contain a blocked diagnostic/,
  );
});

test("rejects invalid basis kinds for trained, default and Technique projections", () => {
  const trained = serializeSkillMechanicsReadProjection(
    projectionFromPlan({ skills: [skill("skill-stealth")] }),
  );
  trained.skills[0].trained.basis.kind = "default";
  assert.throws(
    () => validateSkillMechanicsReadProjection(trained),
    /trained basis kind is invalid/,
  );

  const defaultProjection = serializeSkillMechanicsReadProjection(
    projectionFromPlan({
      skills: [skill("skill-stealth")],
      defaultCandidates: [createSkillDefaultCandidate({
        id: "default-stealth-from-dx",
        targetSkillId: "skill-stealth",
        sourceType: "attribute",
        sourceId: null,
        attribute: "DX",
        modifier: -4,
      })],
    }),
  );
  defaultProjection.skills[0].defaults[0].result.basis.kind = "trained";
  assert.throws(
    () => validateSkillMechanicsReadProjection(defaultProjection),
    /result basis kind is invalid/,
  );

  const techniqueProjection = serializeSkillMechanicsReadProjection(
    projectionFromPlan({
      skills: [skill("skill-judo", { points: 4 })],
      techniques: [technique("technique-arm-lock")],
    }),
  );
  techniqueProjection.techniques[0].result.basis.kind = "trained";
  assert.throws(
    () => validateSkillMechanicsReadProjection(techniqueProjection),
    /result basis kind is invalid/,
  );
});

test("rejects extra properties, invalid diagnostics and duplicate modifiers", () => {
  const extra = serializeSkillMechanicsReadProjection(
    projectionFromPlan({ skills: [skill("skill-stealth")] }),
  );
  extra.skills[0].name = "Stealth";
  assert.throws(
    () => validateSkillMechanicsReadProjection(extra),
    /contains unsupported properties/,
  );

  const diagnostic = serializeSkillMechanicsReadProjection(
    projectionFromPlan({ skills: [skill("skill-stealth")] }),
  );
  diagnostic.diagnostics.push({
    code: "GLOBAL_WARNING",
    severity: "unknown",
  });
  assert.throws(
    () => validateSkillMechanicsReadProjection(diagnostic),
    /severity is invalid/,
  );

  const modifiers = serializeSkillMechanicsReadProjection(
    projectionFromPlan({ skills: [skill("skill-stealth")] }),
  );
  modifiers.skills[0].final.appliedModifierIds = ["modifier-one", "modifier-one"];
  assert.throws(
    () => validateSkillMechanicsReadProjection(modifiers),
    /must not contain duplicates/,
  );
});

test("validates a reconstructed projection independently of key order", () => {
  const original = serializeSkillMechanicsReadProjection(
    projectionFromPlan({
      skills: [skill("skill-stealth")],
    }),
  );
  const reconstructed = {
    diagnostics: original.diagnostics,
    techniques: original.techniques,
    skills: original.skills,
    attributes: original.attributes,
    characterId: original.characterId,
    schemaVersion: original.schemaVersion,
  };

  assert.equal(validateSkillMechanicsReadProjection(reconstructed), true);
});
