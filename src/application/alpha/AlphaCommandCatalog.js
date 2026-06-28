import { createAttackCommandHandlerEntries } from "../attacks/AttackCommandHandlers.js";
import { createAttributeCommandHandlerEntries } from "../attributes/AttributeCommandHandlers.js";
import { createCharacterSummaryCommandHandlerEntries } from "../character/CharacterSummaryCommandHandlers.js";
import { createEquipmentCommandHandlerEntries } from "../equipment/EquipmentCommandHandlers.js";
import { createLanguageCultureCommandHandlerEntries } from "../languages/LanguageCultureCommandHandlers.js";
import { createNotesCommandHandlerEntries } from "../notes/NotesCommandHandlers.js";
import { createPoolCommandHandlerEntries } from "../pools/PoolCommandHandlers.js";
import { createPowerCommandHandlerEntries } from "../powers/PowerCommandHandlers.js";
import { createSecondaryCommandHandlerEntries } from "../secondary/SecondaryCommandHandlers.js";
import { createSkillCommandHandlerEntries } from "../skills/SkillCommandHandlers.js";
import { createSpellCommandHandlerEntries } from "../spells/SpellCommandHandlers.js";
import { createTraitCommandHandlerEntries } from "../traits/TraitCommandHandlers.js";

export const ALPHA_COMMAND_CATALOG_VERSION = "APP-ALPHA-COMMAND-CATALOG-1.0";

export function createAlphaCommandCatalogEntries() {
  const entries = [
    ...createPoolCommandHandlerEntries(),
    ...createCharacterSummaryCommandHandlerEntries(),
    ...createAttributeCommandHandlerEntries(),
    ...createAttackCommandHandlerEntries(),
    ...createEquipmentCommandHandlerEntries(),
    ...createSpellCommandHandlerEntries(),
    ...createPowerCommandHandlerEntries(),
    ...createTraitCommandHandlerEntries(),
    ...createSkillCommandHandlerEntries(),
    ...createLanguageCultureCommandHandlerEntries(),
    ...createSecondaryCommandHandlerEntries(),
    ...createNotesCommandHandlerEntries(),
  ];

  validateAlphaCommandCatalogEntries(entries);
  return Object.freeze(entries.map(entry => Object.freeze({ ...entry })));
}

export function listAlphaCommandCatalogTypes() {
  return Object.freeze(createAlphaCommandCatalogEntries().map(entry => entry.type));
}

export function validateAlphaCommandCatalogEntries(entries) {
  if (!Array.isArray(entries)) {
    throw new Error("Alpha command catalog entries must be an array");
  }

  const seen = new Set();
  for (const [index, entry] of entries.entries()) {
    validateCatalogEntry(entry, index);
    if (seen.has(entry.type)) {
      throw new Error(`Duplicate Alpha command type: ${entry.type}`);
    }
    seen.add(entry.type);
  }

  return true;
}

function validateCatalogEntry(entry, index) {
  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error(`Alpha command catalog entry[${index}] must be an object`);
  }
  if (typeof entry.type !== "string" || entry.type.trim() === "") {
    throw new Error(`Alpha command catalog entry[${index}] type must be a non-empty string`);
  }
  if (typeof entry.handler !== "function") {
    throw new Error(`Alpha command catalog entry[${index}] handler must be a function`);
  }

  const keys = Reflect.ownKeys(entry);
  if (keys.length !== 2 || !keys.includes("type") || !keys.includes("handler")) {
    throw new Error(`Alpha command catalog entry[${index}] must contain only type and handler`);
  }
}
