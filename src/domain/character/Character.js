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

/**
 * Character Aggregate Root
 * ------------------------
 * Estrutura funcional do Character.
 *
 * Conforme ADR-0001 e ADR-0002:
 * - sem class;
 * - sem métodos mutáveis;
 * - criação por factory;
 * - serialização direta;
 * - validação estrutural mínima.
 */

export function createCharacter(input = {}) {
  const character = {
    identity: input.identity ?? createDefaultIdentity(),

    attributes: createAttributes(input.attributes),

    secondaryCharacteristics:
      createSecondaryCharacteristics(input.secondaryCharacteristics),

    pools: createPools(input.pools),

    advantages: input.advantages ?? [],
    perks: input.perks ?? [],

    disadvantages: input.disadvantages ?? [],
    quirks: input.quirks ?? [],

    skills: input.skills ?? [],
    techniques: input.techniques ?? [],

    spells: input.spells ?? [],
    powers: input.powers ?? [],

    equipment: input.equipment ?? [],
    attacks: input.attacks ?? [],

    languages: input.languages ?? [],
    familiarities: input.familiarities ?? [],

    templates: input.templates ?? [],

    state: createState(input.state),

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

  if (!Array.isArray(character.advantages)) {
    throw new Error("Character advantages must be an array");
  }

  if (!Array.isArray(character.perks)) {
    throw new Error("Character perks must be an array");
  }

  if (!Array.isArray(character.disadvantages)) {
    throw new Error("Character disadvantages must be an array");
  }

  if (!Array.isArray(character.quirks)) {
    throw new Error("Character quirks must be an array");
  }

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
      serializeSecondaryCharacteristics(
        character.secondaryCharacteristics
      ),

    pools: serializePools(character.pools),

    advantages: character.advantages,
    perks: character.perks,

    disadvantages: character.disadvantages,
    quirks: character.quirks,

    skills: character.skills,
    techniques: character.techniques,

    spells: character.spells,
    powers: character.powers,

    equipment: character.equipment,
    attacks: character.attacks,

    languages: character.languages,
    familiarities: character.familiarities,

    templates: character.templates,

    state: serializeState(character.state),

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
