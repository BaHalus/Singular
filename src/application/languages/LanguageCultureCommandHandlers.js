import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import { serializeLanguages } from "../../domain/character/Languages.js";
import { serializeFamiliarities } from "../../domain/character/Familiarities.js";
import {
  addLanguage,
  findLanguageById,
  removeLanguage,
  reorderLanguage,
  updateLanguage,
} from "../../domain/character/LanguagesOperations.js";
import {
  addFamiliarity,
  findFamiliarityById,
  removeFamiliarity,
  reorderFamiliarity,
  updateFamiliarity,
} from "../../domain/character/FamiliaritiesOperations.js";

export const LANGUAGE_CULTURE_COMMAND_TYPES = Object.freeze({
  ADD_LANGUAGE: "language.add",
  UPDATE_LANGUAGE: "language.update",
  REMOVE_LANGUAGE: "language.remove",
  REORDER_LANGUAGE: "language.reorder",
  ADD_FAMILIARITY: "familiarity.add",
  UPDATE_FAMILIARITY: "familiarity.update",
  REMOVE_FAMILIARITY: "familiarity.remove",
  REORDER_FAMILIARITY: "familiarity.reorder",
});

export function createLanguageCultureCommandHandlerEntries() {
  return Object.freeze([
    Object.freeze({ type: LANGUAGE_CULTURE_COMMAND_TYPES.ADD_LANGUAGE, handler: handleAddLanguageCommand }),
    Object.freeze({ type: LANGUAGE_CULTURE_COMMAND_TYPES.UPDATE_LANGUAGE, handler: handleUpdateLanguageCommand }),
    Object.freeze({ type: LANGUAGE_CULTURE_COMMAND_TYPES.REMOVE_LANGUAGE, handler: handleRemoveLanguageCommand }),
    Object.freeze({ type: LANGUAGE_CULTURE_COMMAND_TYPES.REORDER_LANGUAGE, handler: handleReorderLanguageCommand }),
    Object.freeze({ type: LANGUAGE_CULTURE_COMMAND_TYPES.ADD_FAMILIARITY, handler: handleAddFamiliarityCommand }),
    Object.freeze({ type: LANGUAGE_CULTURE_COMMAND_TYPES.UPDATE_FAMILIARITY, handler: handleUpdateFamiliarityCommand }),
    Object.freeze({ type: LANGUAGE_CULTURE_COMMAND_TYPES.REMOVE_FAMILIARITY, handler: handleRemoveFamiliarityCommand }),
    Object.freeze({ type: LANGUAGE_CULTURE_COMMAND_TYPES.REORDER_FAMILIARITY, handler: handleReorderFamiliarityCommand }),
  ]);
}

export function handleAddLanguageCommand(context) {
  const { session, command } = validateCommandContext(context, LANGUAGE_CULTURE_COMMAND_TYPES.ADD_LANGUAGE);
  validateExactPayloadKeys(command.payload, ["language"]);
  const nextLanguages = addLanguage(session.character.languages, command.payload.language);
  const added = nextLanguages.at(-1);
  return appliedResult(session.character, { languages: nextLanguages }, { operation: "add-language", languageId: added.id, index: nextLanguages.length - 1 });
}

export function handleUpdateLanguageCommand(context) {
  const { session, command } = validateCommandContext(context, LANGUAGE_CULTURE_COMMAND_TYPES.UPDATE_LANGUAGE);
  validateExactPayloadKeys(command.payload, ["languageId", "patch"]);
  const languageId = normalizeEntityId(command.payload.languageId, "Language command languageId must be a non-empty string");
  const previous = findLanguageById(session.character.languages, languageId);
  const nextLanguages = updateLanguage(session.character.languages, languageId, command.payload.patch);
  const current = findLanguageById(nextLanguages, languageId);
  if (portableEqual(previous, current)) return noOpResult("update-language-no-op", { languageId }, "unchanged-language");
  return appliedResult(session.character, { languages: nextLanguages }, { operation: "update-language", languageId, index: nextLanguages.findIndex(language => language.id === languageId) });
}

export function handleRemoveLanguageCommand(context) {
  const { session, command } = validateCommandContext(context, LANGUAGE_CULTURE_COMMAND_TYPES.REMOVE_LANGUAGE);
  validateExactPayloadKeys(command.payload, ["languageId"]);
  const languageId = normalizeEntityId(command.payload.languageId, "Language command languageId must be a non-empty string");
  const previous = findLanguageById(session.character.languages, languageId);
  const previousIndex = session.character.languages.findIndex(language => language.id === languageId);
  const nextLanguages = removeLanguage(session.character.languages, languageId);
  return appliedResult(session.character, { languages: nextLanguages }, { operation: "remove-language", languageId, name: previous.name, previousIndex });
}

export function handleReorderLanguageCommand(context) {
  const { session, command } = validateCommandContext(context, LANGUAGE_CULTURE_COMMAND_TYPES.REORDER_LANGUAGE);
  validateExactPayloadKeys(command.payload, ["languageId", "targetIndex"]);
  const languageId = normalizeEntityId(command.payload.languageId, "Language command languageId must be a non-empty string");
  const previousIndex = session.character.languages.findIndex(language => language.id === languageId);
  const nextLanguages = reorderLanguage(session.character.languages, languageId, command.payload.targetIndex);
  if (nextLanguages === session.character.languages) return noOpResult("reorder-language-no-op", { languageId }, "already-at-index");
  return appliedResult(session.character, { languages: nextLanguages }, { operation: "reorder-language", languageId, previousIndex, targetIndex: command.payload.targetIndex });
}

export function handleAddFamiliarityCommand(context) {
  const { session, command } = validateCommandContext(context, LANGUAGE_CULTURE_COMMAND_TYPES.ADD_FAMILIARITY);
  validateExactPayloadKeys(command.payload, ["familiarity"]);
  const nextFamiliarities = addFamiliarity(session.character.familiarities, command.payload.familiarity);
  const added = nextFamiliarities.at(-1);
  return appliedResult(session.character, { familiarities: nextFamiliarities }, { operation: "add-familiarity", familiarityId: added.id, index: nextFamiliarities.length - 1 });
}

export function handleUpdateFamiliarityCommand(context) {
  const { session, command } = validateCommandContext(context, LANGUAGE_CULTURE_COMMAND_TYPES.UPDATE_FAMILIARITY);
  validateExactPayloadKeys(command.payload, ["familiarityId", "patch"]);
  const familiarityId = normalizeEntityId(command.payload.familiarityId, "Familiarity command familiarityId must be a non-empty string");
  const previous = findFamiliarityById(session.character.familiarities, familiarityId);
  const nextFamiliarities = updateFamiliarity(session.character.familiarities, familiarityId, command.payload.patch);
  const current = findFamiliarityById(nextFamiliarities, familiarityId);
  if (portableEqual(previous, current)) return noOpResult("update-familiarity-no-op", { familiarityId }, "unchanged-familiarity");
  return appliedResult(session.character, { familiarities: nextFamiliarities }, { operation: "update-familiarity", familiarityId, index: nextFamiliarities.findIndex(item => item.id === familiarityId) });
}

export function handleRemoveFamiliarityCommand(context) {
  const { session, command } = validateCommandContext(context, LANGUAGE_CULTURE_COMMAND_TYPES.REMOVE_FAMILIARITY);
  validateExactPayloadKeys(command.payload, ["familiarityId"]);
  const familiarityId = normalizeEntityId(command.payload.familiarityId, "Familiarity command familiarityId must be a non-empty string");
  const previous = findFamiliarityById(session.character.familiarities, familiarityId);
  const previousIndex = session.character.familiarities.findIndex(item => item.id === familiarityId);
  const nextFamiliarities = removeFamiliarity(session.character.familiarities, familiarityId);
  return appliedResult(session.character, { familiarities: nextFamiliarities }, { operation: "remove-familiarity", familiarityId, name: previous.name, previousIndex });
}

export function handleReorderFamiliarityCommand(context) {
  const { session, command } = validateCommandContext(context, LANGUAGE_CULTURE_COMMAND_TYPES.REORDER_FAMILIARITY);
  validateExactPayloadKeys(command.payload, ["familiarityId", "targetIndex"]);
  const familiarityId = normalizeEntityId(command.payload.familiarityId, "Familiarity command familiarityId must be a non-empty string");
  const previousIndex = session.character.familiarities.findIndex(item => item.id === familiarityId);
  const nextFamiliarities = reorderFamiliarity(session.character.familiarities, familiarityId, command.payload.targetIndex);
  if (nextFamiliarities === session.character.familiarities) return noOpResult("reorder-familiarity-no-op", { familiarityId }, "already-at-index");
  return appliedResult(session.character, { familiarities: nextFamiliarities }, { operation: "reorder-familiarity", familiarityId, previousIndex, targetIndex: command.payload.targetIndex });
}

function appliedResult(character, updates, receipt) {
  const snapshot = serializeCharacter(character);
  return {
    status: "applied",
    character: createCharacter({
      ...snapshot,
      languages: updates.languages === undefined ? snapshot.languages : serializeLanguages(updates.languages),
      familiarities: updates.familiarities === undefined ? snapshot.familiarities : serializeFamiliarities(updates.familiarities),
    }),
    receipt,
    diagnostics: [],
  };
}

function noOpResult(operation, ids, reason) {
  return { status: "no-op", receipt: { operation, ...ids, reason }, diagnostics: [] };
}

function validateCommandContext(context, expectedType) {
  requirePlainObject(context, "Language/Culture command context");
  requirePlainObject(context.session, "Language/Culture command session");
  requirePlainObject(context.command, "Language/Culture command");
  if (context.command.type !== expectedType) throw new Error(`Language/Culture command type must be ${expectedType}`);
  requirePlainObject(context.command.payload, "Language/Culture command payload");
  requirePlainObject(context.session.character, "Language/Culture command Character");
  if (!Array.isArray(context.session.character.languages)) throw new Error("Language/Culture command Character languages must be an array");
  if (!Array.isArray(context.session.character.familiarities)) throw new Error("Language/Culture command Character familiarities must be an array");
  return context;
}

function validateExactPayloadKeys(payload, expectedKeys) {
  const keys = Reflect.ownKeys(payload);
  if (keys.length !== expectedKeys.length || keys.some(key => typeof key !== "string" || !expectedKeys.includes(key))) {
    throw new Error("Language/Culture command payload contains unsupported properties");
  }
}

function normalizeEntityId(value, message) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(message);
  return value;
}

function portableEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (left === null || right === null) return false;
  if (typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    return left.length === right.length && left.every((item, index) => portableEqual(item, right[index]));
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index] && portableEqual(left[key], right[key]));
}

function requirePlainObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new Error(`${label} must be a plain object`);
  }
}
