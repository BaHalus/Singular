import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter, serializeCharacter } from "../../domain/character/Character.js";
import {
  addSkill,
  addTechnique,
  findSkillById,
  findTechniqueById,
  removeSkill,
  removeTechnique,
  reorderSkill,
  reorderTechnique,
  updateSkill,
  updateTechnique,
} from "../../domain/character/SkillsOperations.js";
import { createCommandRegistry } from "../commands/CommandRegistry.js";
import { executeCommand } from "../commands/CommandExecutor.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
import {
  createSkillCommandHandlerEntries,
  SKILL_COMMAND_TYPES,
} from "./SkillCommandHandlers.js";

function runtime() {
  let sequence = 0;
  return {
    clock: { now: () => "2026-06-27T11:00:00.000Z" },
    idGenerator: { next: prefix => `${prefix}:skill-edit-${++sequence}` },
  };
}

function character() {
  return createCharacter({
    identity: { id: "character-skill-edit", name: "Bento", concept: "Batedor" },
    skills: [
      {
        id: "skill-stealth",
        name: "Furtividade",
        attribute: "DX",
        difficulty: "A",
        points: 4,
        importedLevel: 13,
        importedRelativeLevel: 1,
        defaults: [{ type: "attribute", attribute: "DX", modifier: -5 }],
        tags: ["movimento"],
        importMeta: { provider: "manual", reference: "B222" },
      },
      { id: "skill-first-aid", name: "Primeiros Socorros", attribute: "IQ", difficulty: "E", points: 1 },
    ],
    techniques: [
      {
        id: "tech-neck-attack",
        name: "Ataque ao Pescoço",
        skillId: "skill-stealth",
        skillName: "Furtividade",
        difficulty: "H",
        points: 2,
        importedRelativeLevel: -2,
        defaultPenalty: -5,
        maximumRelativeLevel: 0,
      },
      { id: "tech-disarm", name: "Desarme", skillName: "Espada Curta", difficulty: "H", points: 1 },
    ],
    attacks: [
      { id: "attack-knife", name: "Faca", category: "melee", damage: { value: "thr-1", type: "cut" } },
    ],
  });
}

function session() {
  return createApplicationSession({ id: "session-skill-edit", character: character() });
}

function registry() {
  return createCommandRegistry(createSkillCommandHandlerEntries());
}

function command(type, payload, expectedRevision = 0) {
  return {
    id: `command:${type}`,
    type,
    expectedRevision,
    issuedAt: "2026-06-27T11:00:00.000Z",
    payload,
  };
}

test("edits Skills and Techniques immutably without calculating levels", () => {
  const beforeSkills = character().skills;
  const beforeTechniques = character().techniques;

  const addedSkills = addSkill(beforeSkills, {
    id: "skill-traps",
    name: "Armadilhas",
    attribute: "IQ",
    difficulty: "A",
    points: 2,
    defaults: [{ type: "skill", name: "Engenharia", modifier: -4 }],
    importedLevel: 12,
  });
  const updatedSkills = updateSkill(addedSkills, "skill-traps", {
    points: 4,
    importedRelativeLevel: 0,
    externalIds: { gcs: "skill-traps" },
  });
  const reorderedSkills = reorderSkill(updatedSkills, "skill-traps", 0);
  const removedSkills = removeSkill(reorderedSkills, "skill-first-aid");

  const addedTechniques = addTechnique(beforeTechniques, {
    id: "tech-feint",
    name: "Finta",
    skillId: "skill-traps",
    skillName: "Armadilhas",
    difficulty: "H",
    points: 1,
    defaultPenalty: -4,
    maximumRelativeLevel: 0,
  });
  const updatedTechniques = updateTechnique(addedTechniques, "tech-feint", {
    points: 2,
    importedRelativeLevel: -1,
  });
  const reorderedTechniques = reorderTechnique(updatedTechniques, "tech-feint", 0);
  const removedTechniques = removeTechnique(reorderedTechniques, "tech-disarm");

  assert.equal(beforeSkills.length, 2);
  assert.equal(addedSkills.length, 3);
  assert.equal(findSkillById(updatedSkills, "skill-traps").points, 4);
  assert.equal(findSkillById(updatedSkills, "skill-traps").importedLevel, 12);
  assert.equal(findSkillById(updatedSkills, "skill-traps").importedRelativeLevel, 0);
  assert.equal(reorderedSkills[0].id, "skill-traps");
  assert.equal(findSkillById(removedSkills, "skill-first-aid"), null);

  assert.equal(beforeTechniques.length, 2);
  assert.equal(findTechniqueById(updatedTechniques, "tech-feint").defaultPenalty, -4);
  assert.equal(findTechniqueById(updatedTechniques, "tech-feint").points, 2);
  assert.equal(reorderedTechniques[0].id, "tech-feint");
  assert.equal(findTechniqueById(removedTechniques, "tech-disarm"), null);
});

test("rejects unsupported patches, invalid reorder targets and non-portable payloads", () => {
  const skills = character().skills;
  const techniques = character().techniques;

  assert.throws(() => updateSkill(skills, "skill-stealth", { levelFormula: "DX+1" }), /unsupported fields/);
  assert.throws(() => reorderSkill(skills, "skill-stealth", 9), /target index is invalid/);
  assert.throws(() => removeTechnique(techniques, "missing"), /Technique not found/);

  assert.throws(() => addSkill(skills, {
    id: "skill-bad",
    name: "Inválida",
    raw: { callback: () => null },
  }), /JSON portable/);

  assert.throws(() => updateTechnique(techniques, "tech-disarm", {
    importMeta: { marker: Symbol("not-json") },
  }), /JSON portable/);

  assert.throws(() => updateSkill(skills, "skill-stealth", {
    defaults: [{ modifier: Number.NaN }],
  }), /JSON portable/);

  const cyclic = { id: "tech-cyclic", name: "Cíclica" };
  cyclic.raw = { self: cyclic };
  assert.throws(() => addTechnique(techniques, cyclic), /cycles/);
});

test("applies Skill commands through CommandExecutor with revision and history", () => {
  const beforeSession = session();
  const beforeCharacter = serializeCharacter(beforeSession.character);
  const result = executeCommand(
    beforeSession,
    command(SKILL_COMMAND_TYPES.ADD_SKILL, {
      skill: {
        id: "skill-bow",
        name: "Arco",
        attribute: "DX",
        difficulty: "A",
        points: 2,
        importedLevel: 12,
        importedRelativeLevel: 0,
        defaults: [{ type: "attribute", attribute: "DX", modifier: -5 }],
        weapons: [{ name: "Arco curto", damage: "thr imp" }],
      },
    }),
    registry(),
    runtime(),
  );

  assert.equal(result.status, "applied");
  assert.equal(result.session.revision, 1);
  assert.equal(result.session.history[0].commandType, "skill.add");
  assert.equal(result.session.character.skills.at(-1).id, "skill-bow");
  assert.equal(result.session.character.skills.at(-1).importedLevel, 12);
  assert.deepEqual(serializeCharacter(result.session.character).identity, beforeCharacter.identity);
  assert.deepEqual(serializeCharacter(result.session.character).attacks, beforeCharacter.attacks);
});

test("updates, removes and reorders Skills by id", () => {
  const appRuntime = runtime();
  const commandRegistry = registry();
  const first = executeCommand(
    session(),
    command(SKILL_COMMAND_TYPES.UPDATE_SKILL, {
      skillId: "skill-stealth",
      patch: { name: "Furtividade revisada", points: 8, externalIds: { singular: "stealth" } },
    }),
    commandRegistry,
    appRuntime,
  );
  const second = executeCommand(first.session, command(SKILL_COMMAND_TYPES.REORDER_SKILL, {
    skillId: "skill-first-aid",
    targetIndex: 0,
  }, 1), commandRegistry, appRuntime);
  const third = executeCommand(second.session, command(SKILL_COMMAND_TYPES.REMOVE_SKILL, {
    skillId: "skill-stealth",
  }, 2), commandRegistry, appRuntime);

  assert.equal(first.status, "applied");
  assert.equal(first.session.character.skills[0].name, "Furtividade revisada");
  assert.equal(first.session.character.skills[0].externalIds.singular, "stealth");
  assert.equal(second.session.character.skills[0].id, "skill-first-aid");
  assert.equal(third.session.character.skills.length, 1);
  assert.equal(third.session.revision, 3);
});

test("updates, removes and reorders Techniques by id", () => {
  const appRuntime = runtime();
  const commandRegistry = registry();
  const first = executeCommand(
    session(),
    command(SKILL_COMMAND_TYPES.UPDATE_TECHNIQUE, {
      techniqueId: "tech-neck-attack",
      patch: { skillName: "Furtividade revisada", importedRelativeLevel: -1 },
    }),
    commandRegistry,
    appRuntime,
  );
  const second = executeCommand(first.session, command(SKILL_COMMAND_TYPES.REORDER_TECHNIQUE, {
    techniqueId: "tech-disarm",
    targetIndex: 0,
  }, 1), commandRegistry, appRuntime);
  const third = executeCommand(second.session, command(SKILL_COMMAND_TYPES.REMOVE_TECHNIQUE, {
    techniqueId: "tech-neck-attack",
  }, 2), commandRegistry, appRuntime);

  assert.equal(first.status, "applied");
  assert.equal(first.session.character.techniques[0].importedRelativeLevel, -1);
  assert.equal(second.session.character.techniques[0].id, "tech-disarm");
  assert.equal(third.session.character.techniques.length, 1);
  assert.equal(third.session.revision, 3);
});

test("returns no-op for unchanged Skill and Technique updates and same-position reorders", () => {
  const noSkillChange = executeCommand(session(), command(SKILL_COMMAND_TYPES.UPDATE_SKILL, {
    skillId: "skill-stealth",
    patch: { name: "Furtividade" },
  }), registry(), runtime());
  const sameSkillPosition = executeCommand(session(), command(SKILL_COMMAND_TYPES.REORDER_SKILL, {
    skillId: "skill-first-aid",
    targetIndex: 1,
  }), registry(), runtime());
  const noTechniqueChange = executeCommand(session(), command(SKILL_COMMAND_TYPES.UPDATE_TECHNIQUE, {
    techniqueId: "tech-disarm",
    patch: { name: "Desarme" },
  }), registry(), runtime());
  const sameTechniquePosition = executeCommand(session(), command(SKILL_COMMAND_TYPES.REORDER_TECHNIQUE, {
    techniqueId: "tech-disarm",
    targetIndex: 1,
  }), registry(), runtime());

  assert.equal(noSkillChange.status, "no-op");
  assert.equal(noSkillChange.session.revision, 0);
  assert.equal(sameSkillPosition.status, "no-op");
  assert.equal(sameSkillPosition.session.revision, 0);
  assert.equal(noTechniqueChange.status, "no-op");
  assert.equal(noTechniqueChange.session.revision, 0);
  assert.equal(sameTechniquePosition.status, "no-op");
  assert.equal(sameTechniquePosition.session.revision, 0);
});
