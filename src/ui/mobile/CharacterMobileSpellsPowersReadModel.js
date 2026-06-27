import {
  createPowerReadProjection,
} from "../../application/projections/PowerReadProjection.js";
import {
  createSpellReadProjection,
} from "../../application/projections/SpellReadProjection.js";

const SPELLS_POWERS_READ_MODEL_SCHEMA_VERSION = 1;

export function createCharacterMobileSpellsPowersReadModel(character) {
  const spellProjection = createSpellReadProjection(character);
  const powerProjection = createPowerReadProjection(character);
  const model = {
    schemaVersion: SPELLS_POWERS_READ_MODEL_SCHEMA_VERSION,
    characterId: spellProjection.characterId,
    cards: [
      createSpellsCard(spellProjection.spells),
      createPowersCard(powerProjection),
    ],
  };

  validateCharacterMobileSpellsPowersReadModel(model);
  return deepFreeze(model);
}

export function validateCharacterMobileSpellsPowersReadModel(model) {
  requirePlainObject(model, "Character mobile Spells/Powers read model");
  if (model.schemaVersion !== SPELLS_POWERS_READ_MODEL_SCHEMA_VERSION) {
    throw new Error("Character mobile Spells/Powers read model schemaVersion is invalid");
  }
  requireNonEmptyString(model.characterId, "Character mobile Spells/Powers characterId");
  requireArray(model.cards, "Character mobile Spells/Powers cards");
  if (model.cards.length !== 2) {
    throw new Error("Character mobile Spells/Powers cards are invalid");
  }
  validateCard(model.cards[0], "spells");
  validateCard(model.cards[1], "powers");
  return true;
}

export function serializeCharacterMobileSpellsPowersReadModel(model) {
  validateCharacterMobileSpellsPowersReadModel(model);
  return JSON.parse(JSON.stringify(model));
}

export function getCharacterMobileSpellsPowersReadModelSchemaVersion() {
  return SPELLS_POWERS_READ_MODEL_SCHEMA_VERSION;
}

function createSpellsCard(spells) {
  return {
    id: "spells",
    title: "Magias",
    status: spells.length === 0 ? "empty" : "declared-only",
    authority: "application.spell-read-projection",
    items: spells.map(spell => ({
      id: spell.id,
      label: spell.spellType === "ritualMagic" ? "Magia ritualística" : "Magia",
      value: spell.name || "Magia sem nome",
      spellType: spell.spellType,
      techLevel: spell.techLevel,
      attribute: spell.attribute,
      difficulty: spell.difficulty,
      points: spell.points,
      importedLevel: spell.importedLevel,
      importedRelativeLevel: spell.importedRelativeLevel,
      importedRelativeLevelText: spell.importedRelativeLevelText,
      colleges: [...spell.colleges],
      powerSource: spell.powerSource,
      spellClass: spell.spellClass,
      resistance: spell.resistance,
      castingCost: spell.castingCost,
      maintenanceCost: spell.maintenanceCost,
      castingTime: spell.castingTime,
      duration: spell.duration,
      item: spell.item,
      baseSkill: spell.baseSkill,
      prereqCount: spell.prereqCount,
      reference: spell.reference,
      notes: spell.notes,
      tags: [...spell.tags],
      categories: [...spell.categories],
      weaponCount: spell.weapons.length,
      featureCount: spell.features.length,
      modifierCount: spell.modifiers.length,
      studyCount: spell.study.length,
      status: "declared",
    })),
  };
}

function createPowersCard(powerProjection) {
  return {
    id: "powers",
    title: "Poderes",
    status: powerProjection.powers.length === 0 ? "empty" : "declared-only",
    authority: "application.power-read-projection",
    diagnostics: powerProjection.diagnostics.map(diagnostic => ({ ...diagnostic })),
    items: powerProjection.powers.map(power => ({
      id: power.id,
      label: "Poder",
      value: power.name || "Poder sem nome",
      source: power.source,
      powerModifier: clonePlainValue(power.powerModifier),
      talentTraitId: power.talentTraitId,
      memberTraitIds: [...power.memberTraitIds],
      notes: power.notes,
      tags: [...power.tags],
      diagnosticCodes: powerProjection.diagnostics
        .filter(diagnostic => diagnostic.powerId === power.id)
        .map(diagnostic => diagnostic.code),
      status: "declared",
    })),
  };
}

function validateCard(card, expectedId) {
  requirePlainObject(card, `Character mobile ${expectedId} card`);
  if (card.id !== expectedId) {
    throw new Error(`Character mobile ${expectedId} card id is invalid`);
  }
  requireNonEmptyString(card.title, `Character mobile ${expectedId} card title`);
  if (!["empty", "declared-only"].includes(card.status)) {
    throw new Error(`Character mobile ${expectedId} card status is invalid`);
  }
  requireNonEmptyString(card.authority, `Character mobile ${expectedId} card authority`);
  requireArray(card.items, `Character mobile ${expectedId} card items`);
  const ids = new Set();
  for (const item of card.items) {
    requirePlainObject(item, `Character mobile ${expectedId} item`);
    requireNonEmptyString(item.id, `Character mobile ${expectedId} item id`);
    if (ids.has(item.id)) {
      throw new Error(`Character mobile ${expectedId} item ids must be unique`);
    }
    ids.add(item.id);
    requireNonEmptyString(item.label, `Character mobile ${expectedId} item label`);
    requireString(item.value, `Character mobile ${expectedId} item value`);
    if (item.status !== "declared") {
      throw new Error(`Character mobile ${expectedId} item status is invalid`);
    }
  }
}

function clonePlainValue(value) {
  if (value === null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value));
}

function requirePlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
}

function requireString(value, label) {
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
}

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object") return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}
