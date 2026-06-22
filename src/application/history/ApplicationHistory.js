import {
  createCharacter,
  serializeCharacter,
  validateCharacter,
} from "../../domain/character/Character.js";

const SCHEMA_VERSION = 1;
const ENTRY_KIND = "character-transition";

export function createApplicationHistory(input = []) {
  if (!Array.isArray(input)) {
    throw new Error("Application history must be an array");
  }
  const entries = input.map((entry, index) =>
    createApplicationHistoryEntry(entry, `Application history[${index}]`),
  );
  validateApplicationHistory(entries);
  return deepFreeze(entries);
}

export function createApplicationHistoryEntry(input = {}, label = "History entry") {
  requirePlainObject(input, label);
  const beforeCharacter = normalizeCharacterSnapshot(
    input.beforeCharacter,
    `${label} beforeCharacter`,
  );
  const afterCharacter = normalizeCharacterSnapshot(
    input.afterCharacter,
    `${label} afterCharacter`,
  );
  const beforeFingerprint = fingerprint(beforeCharacter);
  const afterFingerprint = fingerprint(afterCharacter);

  if (
    input.beforeFingerprint !== undefined &&
    input.beforeFingerprint !== beforeFingerprint
  ) {
    throw new Error(`${label} beforeFingerprint is inconsistent`);
  }
  if (
    input.afterFingerprint !== undefined &&
    input.afterFingerprint !== afterFingerprint
  ) {
    throw new Error(`${label} afterFingerprint is inconsistent`);
  }

  const entry = {
    schemaVersion: SCHEMA_VERSION,
    kind: ENTRY_KIND,
    id: requiredString(input.id, `${label} id`),
    commandId: requiredString(input.commandId, `${label} commandId`),
    commandType: requiredString(input.commandType, `${label} commandType`),
    issuedAt: timestamp(input.issuedAt, `${label} issuedAt`),
    appliedAt: timestamp(input.appliedAt, `${label} appliedAt`),
    beforeRevision: revision(input.beforeRevision, `${label} beforeRevision`),
    afterRevision: revision(input.afterRevision, `${label} afterRevision`),
    beforeFingerprint,
    afterFingerprint,
    beforeCharacter,
    afterCharacter,
    commandPayload: clonePlainValue(input.commandPayload ?? {}),
    receipt: cloneOptionalRecord(input.receipt, `${label} receipt`),
  };

  validateApplicationHistoryEntry(entry, label);
  return deepFreeze(entry);
}

export function validateApplicationHistory(history) {
  if (!Array.isArray(history)) {
    throw new Error("Application history must be an array");
  }
  const ids = new Set();
  history.forEach((entry, index) => {
    validateApplicationHistoryEntry(entry, `Application history[${index}]`);
    if (ids.has(entry.id)) {
      throw new Error(`Duplicate application history entry id: ${entry.id}`);
    }
    ids.add(entry.id);
  });
  return true;
}

export function validateApplicationHistoryEntry(entry, label = "History entry") {
  requirePlainObject(entry, label);
  if (entry.schemaVersion !== SCHEMA_VERSION || entry.kind !== ENTRY_KIND) {
    throw new Error(`${label} schema is invalid`);
  }
  requiredString(entry.id, `${label} id`);
  requiredString(entry.commandId, `${label} commandId`);
  requiredString(entry.commandType, `${label} commandType`);
  timestamp(entry.issuedAt, `${label} issuedAt`);
  timestamp(entry.appliedAt, `${label} appliedAt`);
  revision(entry.beforeRevision, `${label} beforeRevision`);
  revision(entry.afterRevision, `${label} afterRevision`);
  if (entry.afterRevision !== entry.beforeRevision + 1) {
    throw new Error(`${label} revisions must describe one applied transition`);
  }
  validateCharacterSnapshot(entry.beforeCharacter, `${label} beforeCharacter`);
  validateCharacterSnapshot(entry.afterCharacter, `${label} afterCharacter`);
  if (entry.beforeFingerprint !== fingerprint(entry.beforeCharacter)) {
    throw new Error(`${label} beforeFingerprint is inconsistent`);
  }
  if (entry.afterFingerprint !== fingerprint(entry.afterCharacter)) {
    throw new Error(`${label} afterFingerprint is inconsistent`);
  }
  requirePlainObject(entry.commandPayload, `${label} commandPayload`);
  clonePlainValue(entry.commandPayload);
  if (entry.receipt !== null) {
    requirePlainObject(entry.receipt, `${label} receipt`);
    clonePlainValue(entry.receipt);
  }
  return true;
}

export function serializeApplicationHistory(history) {
  validateApplicationHistory(history);
  return history.map(entry => clonePlainValue(entry));
}

export function restoreCharacterFromHistorySnapshot(snapshot) {
  validateCharacterSnapshot(snapshot, "History character snapshot");
  return createCharacter(clonePlainValue(snapshot));
}

export function fingerprintApplicationCharacter(character) {
  validateCharacter(character);
  return fingerprint(serializeCharacter(character));
}

export function validateApplicationHistoryPosition(history, future, character) {
  validateApplicationHistory(history);
  validateApplicationHistory(future);
  validateHistoryContinuity(history);
  validateFutureContinuity(future);
  validateCharacter(character);
  const current = fingerprintApplicationCharacter(character);
  const historyTop = history.at(-1) ?? null;
  const futureTop = future.at(-1) ?? null;

  if (historyTop !== null && historyTop.afterFingerprint !== current) {
    throw new Error("Application history does not match current character");
  }
  if (futureTop !== null && futureTop.beforeFingerprint !== current) {
    throw new Error("Application future does not match current character");
  }
  return true;
}

function validateHistoryContinuity(history) {
  for (let index = 0; index < history.length - 1; index += 1) {
    const current = history[index];
    const next = history[index + 1];
    if (current.afterFingerprint !== next.beforeFingerprint) {
      throw new Error(
        `Application history transitions at indexes ${index} and ${index + 1} are disconnected`,
      );
    }
  }
}

function validateFutureContinuity(future) {
  for (let index = 0; index < future.length - 1; index += 1) {
    const current = future[index];
    const next = future[index + 1];
    if (current.beforeFingerprint !== next.afterFingerprint) {
      throw new Error(
        `Application future transitions at indexes ${index} and ${index + 1} are disconnected`,
      );
    }
  }
}

function normalizeCharacterSnapshot(value, label) {
  if (!value) throw new Error(`${label} is required`);
  const character = createCharacter(clonePlainValue(value));
  return clonePlainValue(serializeCharacter(character));
}

function validateCharacterSnapshot(value, label) {
  requirePlainObject(value, label);
  validateCharacter(createCharacter(clonePlainValue(value)));
}

function fingerprint(value) {
  const text = JSON.stringify(canonicalize(value));
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function cloneOptionalRecord(value, label) {
  if (value === undefined || value === null) return null;
  requirePlainObject(value, label);
  return clonePlainValue(value);
}

function clonePlainValue(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) {
    throw new Error("Application history values must not contain cycles");
  }
  if (Array.isArray(value)) {
    const result = [];
    seen.set(value, result);
    value.forEach(item => result.push(clonePlainValue(item, seen)));
    seen.delete(value);
    return result;
  }
  requirePlainObject(value, "Application history value");
  const result = {};
  seen.set(value, result);
  Object.entries(value).forEach(([key, item]) => {
    result[key] = clonePlainValue(item, seen);
  });
  seen.delete(value);
  return result;
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function revision(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer`);
  }
  return value;
}

function timestamp(value, label) {
  const normalized = value instanceof Date ? value.toISOString() : value;
  if (
    typeof normalized !== "string" ||
    normalized === "" ||
    Number.isNaN(Date.parse(normalized))
  ) {
    throw new Error(`${label} must be a valid timestamp`);
  }
  return normalized;
}

function requirePlainObject(value, label) {
  if (!isPlainObject(value)) throw new Error(`${label} must be a plain object`);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
