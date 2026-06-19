import {
  createAttributes,
  validateAttributes,
  serializeAttributes,
} from "./Attributes.js";

import {
  createSecondaryCharacteristics,
  validateSecondaryCharacteristics,
  serializeSecondaryCharacteristics,
} from "./SecondaryCharacteristics.js";

import {
  createPools,
  validatePools,
  serializePools,
} from "./Pools.js";

import {
  createState,
  validateState,
  serializeState,
} from "./State.js";

import {
  createAdvantages,
  validateAdvantages,
  serializeAdvantages,
} from "./Advantages.js";

import {
  createPerks,
  validatePerks,
  serializePerks,
} from "./Perks.js";

import {
  createDisadvantages,
  validateDisadvantages,
  serializeDisadvantages,
} from "./Disadvantages.js";

import {
  createQuirks,
  validateQuirks,
  serializeQuirks,
} from "./Quirks.js";

import {
  createSkills,
  validateSkills,
  serializeSkills,
} from "./Skills.js";

import {
  createTechniques,
  validateTechniques,
  serializeTechniques,
} from "./Techniques.js";

import {
  createSpells,
  validateSpells,
  serializeSpells,
} from "./Spells.js";

import {
  createLanguages,
  validateLanguages,
  serializeLanguages,
} from "./Languages.js";

import {
  createFamiliarities,
  validateFamiliarities,
  serializeFamiliarities,
} from "./Familiarities.js";

import {
  createEquipment,
  validateEquipment,
  serializeEquipment,
} from "./Equipment.js";

import {
  createTemplates,
  validateTemplates,
  serializeTemplates,
} from "./Templates.js";

export function createCharacter(input = {}) {
  const character = {
    identity: input.identity ?? createDefaultIdentity(),

    attributes: createAttributes(input.attributes),
    secondaryCharacteristics:
      createSecondaryCharacteristics(input.secondaryCharacteristics),
    pools: createPools(input.pools),
    state: createState(input.state),

    advantages: createAdvantages(input.advantages),
    perks: createPerks(input.perks),
    disadvantages: createDisadvantages(input.disadvantages),
    quirks: createQuirks(input.quirks),

    skills: createSkills(input.skills),
    techniques: createTechniques(input.techniques),
    spells: createSpells(input.spells),
    powers: input.powers ?? [],
    equipment: createEquipment(input.equipment),
    attacks: input.attacks ?? [],
    languages: createLanguages(input.languages),
    familiarities: createFamiliarities(input.familiarities),
    templates: createTemplates(input.templates),

    metadata: input.metadata ?? createDefaultMetadata(),
  };

  validateCharacter(character);

  return character;
}

export function validateCharacter(character) {
  if (!character || typeof character !== "object") {
    throw new Error("Character must be an object");
  }

  if (!character.identity?.id) {
    throw new Error("Character must have a valid identity.id");
  }

  if (!character.identity?.name) {
    throw new Error("Character must have a valid identity.name");
  }

  validateAttributes(character.attributes);
  validateSecondaryCharacteristics(character.secondaryCharacteristics);
  validatePools(character.pools);
  validateState(character.state);

  validateAdvantages(character.advantages);
  validatePerks(character.perks);
  validateDisadvantages(character.disadvantages);
  validateQuirks(character.quirks);

  validateSkills(character.skills);
  validateTechniques(character.techniques);
  validateSpells(character.spells);
  validateLanguages(character.languages);
  validateFamiliarities(character.familiarities);
  validateEquipment(character.equipment);
  validateTemplates(character.templates);

  if (!character.metadata) {
    throw new Error("Character must have metadata");
  }

  return true;
}

export function serializeCharacter(character) {
  validateCharacter(character);

  return {
    identity: character.identity,

    attributes: serializeAttributes(character.attributes),
    secondaryCharacteristics:
      serializeSecondaryCharacteristics(character.secondaryCharacteristics),
    pools: serializePools(character.pools),
    state: serializeState(character.state),

    advantages: serializeAdvantages(character.advantages),
    perks: serializePerks(character.perks),
    disadvantages: serializeDisadvantages(character.disadvantages),
    quirks: serializeQuirks(character.quirks),

    skills: serializeSkills(character.skills),
    techniques: serializeTechniques(character.techniques),
    spells: serializeSpells(character.spells),
    powers: character.powers,
    equipment: serializeEquipment(character.equipment),
    attacks: character.attacks,
    languages: serializeLanguages(character.languages),
    familiarities: serializeFamiliarities(character.familiarities),
    templates: serializeTemplates(character.templates),

    metadata: character.metadata,
  };
}

function createDefaultIdentity() {
  return {
    id: cryptoRandomId(),
    name: "Unnamed",
    concept: "",
    playerId: null,
    campaignId: null,
  };
}

function createDefaultMetadata() {
  const now = new Date().toISOString();

  return {
    createdAt: now,
    updatedAt: now,
    source: "singular",
  };
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `char_${Math.random().toString(36).slice(2, 10)}`;
}
