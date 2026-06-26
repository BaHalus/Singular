import {
  createCharacter,
  serializeCharacter,
  validateCharacter,
} from "../../../domain/character/Character.js";
import {
  createApplicationSession,
  serializeApplicationSession,
  validateApplicationSession,
} from "../../../application/session/ApplicationSession.js";
import {
  validateCharacterRepository,
  validateSessionRepository,
} from "../../../application/ports/RepositoryPorts.js";

const DEFAULT_NAMESPACE = "singular.alpha.local";
const STORAGE_FORMAT = "singular-local-persistence";
const STORAGE_VERSION = 1;
const CHARACTER_EXPORT_FORMAT = "singular-character-export";
const CHARACTER_EXPORT_VERSION = 1;
const CHARACTER_KIND = "character";
const SESSION_KIND = "session";
const LAST_SESSION_KIND = "last-session";

export function createBrowserLocalCharacterRepository(options = {}) {
  const adapter = createBrowserLocalPersistenceAdapter(options);

  const repository = {
    async load(id) {
      const result = adapter.load(CHARACTER_KIND, normalizeId(id, "Character repository id"));
      return result.status === "loaded"
        ? createCharacter(cloneJsonValue(result.snapshot))
        : null;
    },

    async save(character) {
      validateCharacter(character);
      const snapshot = cloneJsonValue(serializeCharacter(character));
      const normalized = createCharacter(cloneJsonValue(snapshot));
      adapter.save(CHARACTER_KIND, normalized.identity.id, snapshot);
      return createCharacter(cloneJsonValue(snapshot));
    },

    async remove(id) {
      return adapter.remove(CHARACTER_KIND, normalizeId(id, "Character repository id"));
    },

    async listIds() {
      return Object.freeze(adapter.listIds(CHARACTER_KIND));
    },
  };

  validateCharacterRepository(repository);
  return Object.freeze(repository);
}

export function createBrowserLocalSessionRepository(options = {}) {
  const adapter = createBrowserLocalPersistenceAdapter(options);

  const repository = {
    async load(id) {
      const result = adapter.load(SESSION_KIND, normalizeId(id, "Session repository id"));
      return result.status === "loaded"
        ? createApplicationSession(cloneJsonValue(result.snapshot))
        : null;
    },

    async save(session) {
      validateApplicationSession(session);
      const snapshot = cloneJsonValue(serializeApplicationSession(session));
      const normalized = createApplicationSession(cloneJsonValue(snapshot));
      adapter.save(SESSION_KIND, normalized.id, snapshot);
      adapter.savePointer(LAST_SESSION_KIND, normalized.id);
      return createApplicationSession(cloneJsonValue(snapshot));
    },

    async remove(id) {
      const normalizedId = normalizeId(id, "Session repository id");
      const removed = adapter.remove(SESSION_KIND, normalizedId);
      if (adapter.loadPointer(LAST_SESSION_KIND) === normalizedId) {
        adapter.removePointer(LAST_SESSION_KIND);
      }
      return removed;
    },

    async listIds() {
      return Object.freeze(adapter.listIds(SESSION_KIND));
    },

    async loadLastSession() {
      const id = adapter.loadPointer(LAST_SESSION_KIND);
      if (id === null) return null;
      const result = adapter.load(SESSION_KIND, id);
      return result.status === "loaded"
        ? createApplicationSession(cloneJsonValue(result.snapshot))
        : null;
    },
  };

  validateSessionRepository(repository);
  return Object.freeze(repository);
}

export function createSingularCharacterExport(character, options = {}) {
  validateCharacter(character);
  const exportedAt = normalizeOptionalIsoDate(
    options.exportedAt,
    "Character export exportedAt",
  ) ?? new Date().toISOString();

  return deepFreeze({
    format: CHARACTER_EXPORT_FORMAT,
    version: CHARACTER_EXPORT_VERSION,
    exportedAt,
    character: cloneJsonValue(serializeCharacter(character)),
  });
}

export function parseSingularCharacterExport(input) {
  const diagnostics = [];
  const parsed = parseJsonDocument(input, diagnostics, "character-export");
  if (parsed === null) {
    return freezeImportResult({ status: "rejected", character: null, diagnostics });
  }

  if (!isPlainObject(parsed)) {
    diagnostics.push(createDiagnostic("invalid-document", "Export document must be an object"));
    return freezeImportResult({ status: "rejected", character: null, diagnostics });
  }

  if (parsed.format !== CHARACTER_EXPORT_FORMAT) {
    diagnostics.push(createDiagnostic("invalid-format", "Export format must be singular-character-export"));
  }
  if (parsed.version !== CHARACTER_EXPORT_VERSION) {
    diagnostics.push(createDiagnostic("unsupported-version", "Character export version must be 1"));
  }
  if (!isPlainObject(parsed.character)) {
    diagnostics.push(createDiagnostic("missing-character", "Export must contain a character object"));
  }
  if (diagnostics.some(diagnostic => diagnostic.severity === "blocking")) {
    return freezeImportResult({ status: "rejected", character: null, diagnostics });
  }

  try {
    const character = createCharacter(cloneJsonValue(parsed.character));
    return freezeImportResult({
      status: "accepted",
      character,
      diagnostics,
    });
  } catch (error) {
    diagnostics.push(createDiagnostic(
      "invalid-character",
      error instanceof Error ? error.message : "Character could not be validated",
    ));
    return freezeImportResult({ status: "rejected", character: null, diagnostics });
  }
}

export function inspectBrowserLocalPersistence(options = {}) {
  const adapter = createBrowserLocalPersistenceAdapter(options);
  return deepFreeze({
    format: STORAGE_FORMAT,
    version: STORAGE_VERSION,
    characterIds: adapter.listIds(CHARACTER_KIND),
    sessionIds: adapter.listIds(SESSION_KIND),
    lastSessionId: adapter.loadPointer(LAST_SESSION_KIND),
    diagnostics: adapter.inspectDiagnostics(),
  });
}

export function createBrowserLocalPersistenceAdapter(options = {}) {
  const storage = options.storage ?? globalThis.localStorage;
  const namespace = normalizeNamespace(options.namespace ?? DEFAULT_NAMESPACE);
  validateStorage(storage);

  const adapter = {
    save(kind, id, snapshot) {
      const normalizedKind = normalizeKind(kind);
      const normalizedId = normalizeId(id, `${normalizedKind} id`);
      const record = createStorageRecord(normalizedKind, normalizedId, snapshot);
      const recordKey = keyForRecord(namespace, normalizedKind, normalizedId);
      const indexKey = keyForIndex(namespace, normalizedKind);
      const previousRecord = storage.getItem(recordKey);
      const previousIndex = storage.getItem(indexKey);

      try {
        storage.setItem(recordKey, JSON.stringify(record));
        storage.setItem(indexKey, JSON.stringify(addId(readIndex(storage, indexKey), normalizedId)));
      } catch (error) {
        restoreKey(storage, recordKey, previousRecord);
        restoreKey(storage, indexKey, previousIndex);
        throw error;
      }
    },

    load(kind, id) {
      const normalizedKind = normalizeKind(kind);
      const normalizedId = normalizeId(id, `${normalizedKind} id`);
      const key = keyForRecord(namespace, normalizedKind, normalizedId);
      const raw = storage.getItem(key);
      if (raw === null) {
        return deepFreeze({
          status: "missing",
          snapshot: null,
          diagnostics: [],
        });
      }

      const diagnostics = [];
      const record = parseJsonDocument(raw, diagnostics, `${normalizedKind}:${normalizedId}`);
      if (record === null || !isValidStorageRecord(record, normalizedKind, normalizedId)) {
        diagnostics.push(createDiagnostic(
          "invalid-storage-record",
          `Stored ${normalizedKind} record is invalid: ${normalizedId}`,
        ));
        return deepFreeze({ status: "invalid", snapshot: null, diagnostics });
      }

      return deepFreeze({
        status: "loaded",
        snapshot: cloneJsonValue(record.snapshot),
        diagnostics,
      });
    },

    remove(kind, id) {
      const normalizedKind = normalizeKind(kind);
      const normalizedId = normalizeId(id, `${normalizedKind} id`);
      const recordKey = keyForRecord(namespace, normalizedKind, normalizedId);
      const indexKey = keyForIndex(namespace, normalizedKind);
      const existed = storage.getItem(recordKey) !== null;
      const nextIndex = removeId(readIndex(storage, indexKey), normalizedId);
      storage.removeItem(recordKey);
      storage.setItem(indexKey, JSON.stringify(nextIndex));
      return existed;
    },

    listIds(kind) {
      const normalizedKind = normalizeKind(kind);
      return readIndex(storage, keyForIndex(namespace, normalizedKind));
    },

    savePointer(kind, id) {
      const normalizedKind = normalizePointerKind(kind);
      const normalizedId = normalizeId(id, `${normalizedKind} id`);
      storage.setItem(keyForPointer(namespace, normalizedKind), JSON.stringify({
        format: STORAGE_FORMAT,
        version: STORAGE_VERSION,
        kind: normalizedKind,
        id: normalizedId,
      }));
    },

    loadPointer(kind) {
      const normalizedKind = normalizePointerKind(kind);
      const raw = storage.getItem(keyForPointer(namespace, normalizedKind));
      if (raw === null) return null;
      const diagnostics = [];
      const record = parseJsonDocument(raw, diagnostics, normalizedKind);
      if (!isPlainObject(record) || record.kind !== normalizedKind) return null;
      try {
        return normalizeId(record.id, `${normalizedKind} id`);
      } catch {
        return null;
      }
    },

    removePointer(kind) {
      storage.removeItem(keyForPointer(namespace, normalizePointerKind(kind)));
    },

    inspectDiagnostics() {
      const diagnostics = [];
      for (const kind of [CHARACTER_KIND, SESSION_KIND]) {
        for (const id of readIndex(storage, keyForIndex(namespace, kind))) {
          const result = this.load(kind, id);
          diagnostics.push(...result.diagnostics);
          if (result.status !== "loaded") {
            diagnostics.push(createDiagnostic(
              "unreadable-indexed-record",
              `Indexed ${kind} cannot be loaded: ${id}`,
            ));
          }
        }
      }
      const lastSessionId = this.loadPointer(LAST_SESSION_KIND);
      if (lastSessionId !== null && this.load(SESSION_KIND, lastSessionId).status !== "loaded") {
        diagnostics.push(createDiagnostic(
          "invalid-last-session-pointer",
          `Last session pointer cannot be loaded: ${lastSessionId}`,
        ));
      }
      return diagnostics;
    },
  };

  return Object.freeze(adapter);
}

function createStorageRecord(kind, id, snapshot) {
  assertJsonValue(snapshot, "Storage snapshot");
  return {
    format: STORAGE_FORMAT,
    version: STORAGE_VERSION,
    kind,
    id,
    snapshot: cloneJsonValue(snapshot),
  };
}

function isValidStorageRecord(record, kind, id) {
  return isPlainObject(record)
    && record.format === STORAGE_FORMAT
    && record.version === STORAGE_VERSION
    && record.kind === kind
    && record.id === id
    && isPlainObject(record.snapshot);
}

function readIndex(storage, key) {
  const raw = storage.getItem(key);
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Object.freeze([...new Set(parsed.filter(item => typeof item === "string" && item.trim() !== ""))].sort());
  } catch {
    return [];
  }
}

function addId(index, id) {
  return [...new Set([...index, id])].sort();
}

function removeId(index, id) {
  return index.filter(item => item !== id).sort();
}

function parseJsonDocument(input, diagnostics, context) {
  if (typeof input !== "string") return cloneJsonValue(input);
  try {
    return JSON.parse(input);
  } catch {
    diagnostics.push(createDiagnostic(
      "invalid-json",
      `Invalid JSON document: ${context}`,
    ));
    return null;
  }
}

function createDiagnostic(code, message) {
  return Object.freeze({
    severity: "blocking",
    code,
    message,
  });
}

function freezeImportResult(result) {
  return deepFreeze({
    status: result.status,
    character: result.character,
    diagnostics: result.diagnostics,
  });
}

function normalizeKind(value) {
  if (value === CHARACTER_KIND || value === SESSION_KIND) return value;
  throw new Error("Persistence kind must be character or session");
}

function normalizePointerKind(value) {
  if (value === LAST_SESSION_KIND) return value;
  throw new Error("Persistence pointer kind must be last-session");
}

function normalizeId(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function normalizeNamespace(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Persistence namespace must be a non-empty string");
  }
  return value;
}

function normalizeOptionalIsoDate(value, label) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be an ISO date string`);
  }
  return value;
}

function validateStorage(storage) {
  if (!storage || typeof storage !== "object") {
    throw new Error("Browser local persistence requires a storage object");
  }
  for (const method of ["getItem", "setItem", "removeItem"]) {
    if (typeof storage[method] !== "function") {
      throw new Error(`Browser local persistence storage ${method} must be a function`);
    }
  }
}

function keyForRecord(namespace, kind, id) {
  return `${namespace}:v${STORAGE_VERSION}:${kind}:${encodeURIComponent(id)}`;
}

function keyForIndex(namespace, kind) {
  return `${namespace}:v${STORAGE_VERSION}:${kind}:index`;
}

function keyForPointer(namespace, kind) {
  return `${namespace}:v${STORAGE_VERSION}:${kind}`;
}

function restoreKey(storage, key, previousValue) {
  if (previousValue === null) {
    storage.removeItem(key);
  } else {
    storage.setItem(key, previousValue);
  }
}

function assertJsonValue(value, label, seen = new WeakSet()) {
  if (value === null) return;
  if (["string", "boolean"].includes(typeof value)) return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${label} must contain only finite numbers`);
    return;
  }
  if (typeof value !== "object") {
    throw new Error(`${label} must contain only JSON values`);
  }
  if (seen.has(value)) throw new Error(`${label} must not contain cycles`);
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertJsonValue(item, `${label}[${index}]`, seen));
  } else {
    if (!isPlainObject(value)) throw new Error(`${label} must contain only plain objects`);
    Object.entries(value).forEach(([key, item]) => assertJsonValue(item, `${label}.${key}`, seen));
  }
  seen.delete(value);
}

function cloneJsonValue(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error("JSON value numbers must be finite");
    }
    if (["undefined", "function", "symbol", "bigint"].includes(typeof value)) {
      throw new Error("Value must be JSON portable");
    }
    return value;
  }
  if (seen.has(value)) throw new Error("JSON value must not contain cycles");
  if (Array.isArray(value)) {
    const clone = [];
    seen.set(value, clone);
    value.forEach(item => clone.push(cloneJsonValue(item, seen)));
    seen.delete(value);
    return clone;
  }
  if (!isPlainObject(value)) throw new Error("JSON value must contain only plain objects");
  const clone = {};
  seen.set(value, clone);
  Object.entries(value).forEach(([key, item]) => {
    clone[key] = cloneJsonValue(item, seen);
  });
  seen.delete(value);
  return clone;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
