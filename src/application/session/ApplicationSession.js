import {
  createCharacter,
  serializeCharacter,
  validateCharacter,
} from "../../domain/character/Character.js";
import {
  createApplicationHistory,
  serializeApplicationHistory,
  validateApplicationHistory,
  validateApplicationHistoryPosition,
} from "../history/ApplicationHistory.js";

export function createApplicationSession(input = {}) {
  requirePlainObject(input, "Application session input");

  if (!input.character) {
    throw new Error("Application session requires a character");
  }

  const session = {
    id: normalizeSessionId(input.id),
    revision: normalizeRevision(input.revision ?? 0),
    character: cloneCharacter(input.character),
    history: createApplicationHistory(input.history ?? []),
    future: createApplicationHistory(input.future ?? []),
    dirty: normalizeDirty(input.dirty ?? false),
    lastReceipt: cloneOptionalRecord(
      input.lastReceipt,
      "Application session last receipt",
    ),
    metadata: cloneRecord(
      input.metadata ?? {},
      "Application session metadata",
    ),
  };

  validateApplicationSession(session);
  return deepFreeze(session);
}

export function validateApplicationSession(session) {
  requirePlainObject(session, "Application session");
  normalizeSessionId(session.id);
  normalizeRevision(session.revision);
  validateCharacter(session.character);
  validateApplicationHistory(session.history);
  validateApplicationHistory(session.future);
  validateDistinctHistoryStacks(session.history, session.future);
  validateApplicationHistoryPosition(
    session.history,
    session.future,
    session.character,
  );
  normalizeDirty(session.dirty);

  if (session.lastReceipt !== null) {
    requirePlainObject(
      session.lastReceipt,
      "Application session last receipt",
    );
  }

  requirePlainObject(session.metadata, "Application session metadata");
  return true;
}

export function serializeApplicationSession(session) {
  validateApplicationSession(session);

  return {
    id: session.id,
    revision: session.revision,
    character: cloneApplicationValue(serializeCharacter(session.character)),
    history: serializeApplicationHistory(session.history),
    future: serializeApplicationHistory(session.future),
    dirty: session.dirty,
    lastReceipt: cloneApplicationValue(session.lastReceipt),
    metadata: cloneApplicationValue(session.metadata),
  };
}

export function nextApplicationSessionRevision(session) {
  validateApplicationSession(session);

  if (session.revision === Number.MAX_SAFE_INTEGER) {
    throw new Error("Application session revision exhausted");
  }

  return session.revision + 1;
}

function cloneCharacter(character) {
  validateCharacter(character);
  const serialized = cloneApplicationValue(serializeCharacter(character));
  return createCharacter(serialized);
}

function validateDistinctHistoryStacks(history, future) {
  const historyIds = new Set(history.map(entry => entry.id));
  for (const entry of future) {
    if (historyIds.has(entry.id)) {
      throw new Error(
        `Application history entry cannot exist in history and future: ${entry.id}`,
      );
    }
  }
}

function normalizeSessionId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Application session id must be a non-empty string");
  }

  return value;
}

function normalizeRevision(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      "Application session revision must be a non-negative safe integer",
    );
  }

  return value;
}

function normalizeDirty(value) {
  if (typeof value !== "boolean") {
    throw new Error("Application session dirty must be boolean");
  }

  return value;
}

function cloneOptionalRecord(value, label) {
  if (value === undefined || value === null) return null;
  return cloneRecord(value, label);
}

function cloneRecord(value, label) {
  requirePlainObject(value, label);
  return cloneApplicationValue(value);
}

function requirePlainObject(value, label) {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be a plain object`);
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneApplicationValue(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") return value;

  if (seen.has(value)) {
    throw new Error("Application session values must not contain cycles");
  }

  if (Array.isArray(value)) {
    const clone = [];
    seen.set(value, clone);
    value.forEach(item => clone.push(cloneApplicationValue(item, seen)));
    seen.delete(value);
    return clone;
  }

  requirePlainObject(value, "Application session value");
  const clone = {};
  seen.set(value, clone);
  Object.entries(value).forEach(([key, item]) => {
    clone[key] = cloneApplicationValue(item, seen);
  });
  seen.delete(value);
  return clone;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
