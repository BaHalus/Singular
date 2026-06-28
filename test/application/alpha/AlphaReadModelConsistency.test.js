import test from "node:test";
import assert from "node:assert/strict";

import {
  createAlphaCommandCatalogEntries,
} from "../../../src/application/alpha/AlphaCommandCatalog.js";
import {
  createCommandRegistry,
} from "../../../src/application/commands/CommandRegistry.js";
import {
  executeCommand,
} from "../../../src/application/commands/CommandExecutor.js";
import {
  createApplicationSession,
  serializeApplicationSession,
} from "../../../src/application/session/ApplicationSession.js";
import {
  createCharacter,
  serializeCharacter,
} from "../../../src/domain/character/Character.js";
import {
  projectCharacterForMobileSheet,
  serializeCharacterMobileProjection,
  validateCharacterMobileProjection,
} from "../../../src/ui/mobile/CharacterMobileProjection.js";
import {
  createCharacterMobileSheetRenderModelForCharacter,
} from "../../../src/ui/mobile/CharacterMobileSheetComposition.js";

const ISSUED_AT = "2026-06-28T20:00:00.000Z";
const PROCESSED_AT = "2026-06-28T20:00:01.000Z";

function createRuntime() {
  let next = 1;
  return {
    clock: {
      now() {
        return PROCESSED_AT;
      },
    },
    idGenerator: {
      next(prefix) {
        return `${prefix}_${next++}`;
      },
    },
  };
}

function command(type, payload, expectedRevision = 0) {
  return {
    id: `command-alpha-readmodel-${type.replaceAll(".", "-")}`,
    type,
    expectedRevision,
    issuedAt: ISSUED_AT,
    payload,
  };
}

function createSeedCharacter() {
  return createCharacter({
    identity: {
      id: "character-alpha-readmodel",
      name: "Alpha Readmodel",
      concept: "Projection consistency",
      playerId: "player-alpha",
      campaignId: "campaign-alpha",
    },
    attributes: {
      ST: 11,
      DX: 12,
      IQ: 10,
      HT: 10,
    },
    secondaryCharacteristics: {
      HP: { base: 11, override: null },
      FP: { base: 10, override: null },
      Will: { base: 10, override: 1 },
      Per: { base: 10, override: null },
      BasicSpeed: { base: 5.5, override: null },
      BasicMove: { base: 5, override: null },
    },
    pools: {
      HP: { current: 9, maximum: 11 },
      FP: { current: 8, maximum: 10 },
    },
    traits: [{
      id: "trait-alpha-readmodel",
      name: "Alpha Trait",
      role: "advantage",
      points: 5,
      levels: null,
      notes: "declared trait",
    }],
    skills: [{
      id: "skill-alpha-readmodel",
      name: "Alpha Skill",
      specialization: "Projection",
      attribute: "IQ",
      difficulty: "hard",
      points: 2,
      importedLevel: 12,
      importedRelativeLevel: 2,
      notes: "declared skill",
    }],
    techniques: [{
      id: "technique-alpha-readmodel",
      name: "Alpha Technique",
      skillId: "skill-alpha-readmodel",
      skillName: "Alpha Skill",
      difficulty: "hard",
      points: 1,
      defaultPenalty: -2,
      maximumRelativeLevel: 0,
      notes: "declared technique",
    }],
    languages: [{
      id: "language-alpha-readmodel",
      name: "Alpha Language",
      spokenLevel: "accented",
      writtenLevel: "broken",
      isNative: false,
      importedCost: 3,
      reference: "B24",
      notes: "declared language",
    }],
    familiarities: [{
      id: "familiarity-alpha-readmodel",
      name: "Alpha Culture",
      isNative: false,
      importedCost: 1,
      reference: "B23",
      notes: "declared familiarity",
    }],
    attacks: [{
      id: "attack-alpha-readmodel",
      name: "Alpha Attack",
      category: "melee",
      skillId: "skill-alpha-readmodel",
      source: { kind: "manual", id: null },
      damage: { value: "1d", type: "cr", authority: "declared" },
      reach: "1",
      notes: "declared attack",
    }],
    equipment: [{
      id: "equipment-alpha-readmodel",
      kind: "item",
      name: "Alpha Equipment",
      quantity: 2,
      weightKg: 1.5,
      cost: 10,
      state: "carried",
      notes: "declared equipment",
    }],
    spells: [{
      id: "spell-alpha-readmodel",
      spellType: "standard",
      name: "Alpha Spell",
      attribute: "IQ",
      difficulty: "hard",
      points: 1,
      colleges: ["Meta"],
      notes: "declared spell",
    }],
    powers: [{
      id: "power-alpha-readmodel",
      name: "Alpha Power",
      source: "manual",
      memberTraitIds: [],
      notes: "declared power",
      tags: ["alpha-readmodel"],
    }],
    notes: {
      general: "Alpha readmodel notes",
    },
  });
}

function assertProjectionMatchesCharacter(projection, character) {
  const snapshot = serializeCharacter(character);

  assert.equal(projection.identity.id, snapshot.identity.id);
  assert.equal(projection.identity.name, snapshot.identity.name);
  assert.equal(projection.identity.concept, snapshot.identity.concept);
  assert.equal(projection.attributes.ST.level, 11);
  assert.equal(projection.secondaryCharacteristics.Will.override, 1);
  assert.equal(projection.pools.HP.current, snapshot.pools.HP.current);
  assert.equal(projection.traits[0].id, snapshot.traits[0].id);
  assert.equal(projection.skills[0].id, snapshot.skills[0].id);
  assert.equal(projection.skills[0].points, snapshot.skills[0].points);
  assert.equal(projection.techniques[0].id, snapshot.techniques[0].id);
  assert.equal(projection.languages[0].id, snapshot.languages[0].id);
  assert.equal(projection.familiarities[0].id, snapshot.familiarities[0].id);
  assert.equal(projection.attacks.characterId, snapshot.identity.id);
  assert.equal(projection.attacks.authority, "application.attack-read-projection");
  assert.equal(projection.attacks.items[0].id, snapshot.attacks[0].id);
  assert.equal(projection.attacks.items[0].damage.authority, "declared");
  assert.equal(projection.equipment.items[0].id, snapshot.equipment[0].id);
  assert.equal(projection.equipment.items[0].quantity, snapshot.equipment[0].quantity);
  assert.equal(projection.equipment.totals.authority, "engine.equipment");
  assert.equal(projection.equipment.totals.quantity, 2);
  assert.equal(projection.equipment.totals.weightKg, 3);
  assert.equal(projection.equipment.totals.cost, 20);
}

test("Alpha mobile-consumable projection matches authoritative Character snapshot", () => {
  const character = createSeedCharacter();
  const projection = projectCharacterForMobileSheet(character);

  validateCharacterMobileProjection(projection);
  assert.deepEqual(
    serializeCharacterMobileProjection(projection),
    JSON.parse(JSON.stringify(projection)),
  );
  assertProjectionMatchesCharacter(projection, character);

  assert.ok(Object.isFrozen(projection));
  assert.ok(projection.sections.some(section => section.id === "skills-techniques" && section.status === "declared-only"));
  assert.ok(projection.sections.some(section => section.id === "equipment" && section.status === "declared-only"));
});

test("Alpha projection follows the active ApplicationSession after canonical command execution", () => {
  const registry = createCommandRegistry(createAlphaCommandCatalogEntries());
  const runtime = createRuntime();
  const session = createApplicationSession({
    id: "session-alpha-readmodel",
    character: createSeedCharacter(),
  });

  const result = executeCommand(
    session,
    command("skill.update", {
      skillId: "skill-alpha-readmodel",
      patch: {
        points: 4,
        notes: "projection updated through command executor",
      },
    }),
    registry,
    runtime,
  );

  assert.equal(result.status, "applied");
  assert.equal(result.session.revision, 1);
  assert.equal(result.session.history.length, 1);

  const projection = projectCharacterForMobileSheet(result.session.character);
  validateCharacterMobileProjection(projection);
  assert.equal(projection.skills[0].points, 4);
  assert.equal(projection.skills[0].notes, "projection updated through command executor");
  assert.equal(
    projection.skills[0].points,
    serializeApplicationSession(result.session).character.skills[0].points,
  );
});

test("Alpha composed mobile render model remains a frozen read model, not a live Character", () => {
  const character = createSeedCharacter();
  const renderModel = createCharacterMobileSheetRenderModelForCharacter(character);

  assert.ok(Object.isFrozen(renderModel));
  assert.ok(Array.isArray(renderModel.cards));
  assert.ok(Array.isArray(renderModel.sections));
  assert.ok(renderModel.cards.some(card => card.id === "skills-techniques"));
  assert.ok(renderModel.cards.some(card => card.id === "spells"));
  assert.ok(renderModel.cards.some(card => card.id === "powers"));
  assert.equal(renderModel.identity.name, character.identity.name);
  assert.notStrictEqual(renderModel, character);
});
