import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import {
  evaluateCharacterPointLedger,
} from "../../domain/points/CharacterPointLedger.js";
import {
  serializePointLedger,
  validatePointLedger,
} from "../../domain/points/PointLedger.js";
import {
  validateApplicationSession,
} from "../session/ApplicationSession.js";

const SCHEMA_VERSION = 1;

export function createApplicationReadModel(session) {
  validateApplicationSession(session);

  const pointLedger = evaluateCharacterPointLedger(session.character);
  const model = {
    schemaVersion: SCHEMA_VERSION,
    session: {
      id: session.id,
      revision: session.revision,
      dirty: session.dirty,
      canUndo: session.history.length > 0,
      canRedo: session.future.length > 0,
      historyDepth: session.history.length,
      futureDepth: session.future.length,
      lastReceipt: cloneValue(session.lastReceipt),
    },
    character: cloneValue(serializeCharacter(session.character)),
    pointLedger: serializePointLedger(pointLedger),
  };

  validateApplicationReadModel(model);
  return deepFreeze(model);
}

export function validateApplicationReadModel(model) {
  requirePlainObject(model, "Application read model");
  if (model.schemaVersion !== SCHEMA_VERSION) {
    throw new Error("Application read model schemaVersion is invalid");
  }

  requirePlainObject(model.session, "Application read model session");
  requiredString(model.session.id, "Application read model session id");
  revision(model.session.revision);
  if (typeof model.session.dirty !== "boolean") {
    throw new Error("Application read model dirty must be boolean");
  }
  for (const field of ["canUndo", "canRedo"]) {
    if (typeof model.session[field] !== "boolean") {
      throw new Error(`Application read model ${field} must be boolean`);
    }
  }
  for (const field of ["historyDepth", "futureDepth"]) {
    depth(model.session[field], field);
  }
  if (model.session.canUndo !== (model.session.historyDepth > 0)) {
    throw new Error("Application read model canUndo is inconsistent");
  }
  if (model.session.canRedo !== (model.session.futureDepth > 0)) {
    throw new Error("Application read model canRedo is inconsistent");
  }
  if (model.session.lastReceipt !== null) {
    requirePlainObject(
      model.session.lastReceipt,
      "Application read model lastReceipt",
    );
  }

  const character = createCharacter(cloneValue(model.character));
  validatePointLedger(model.pointLedger);
  if (model.pointLedger.characterId !== character.identity.id) {
    throw new Error("Application read model Point Ledger belongs to another Character");
  }
  return true;
}

export function serializeApplicationReadModel(model) {
  validateApplicationReadModel(model);
  return cloneValue(model);
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function revision(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      "Application read model revision must be a non-negative safe integer",
    );
  }
}

function depth(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Application read model ${field} must be non-negative integer`);
  }
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
    );
  }
  return value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
