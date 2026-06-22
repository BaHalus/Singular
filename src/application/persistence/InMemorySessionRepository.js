import {
  createApplicationSession,
  serializeApplicationSession,
  validateApplicationSession,
} from "../session/ApplicationSession.js";
import { validateSessionRepository } from "../ports/RepositoryPorts.js";

export function createInMemorySessionRepository(initialSessions = []) {
  if (!Array.isArray(initialSessions)) {
    throw new Error("Session repository initial values must be an array");
  }

  const snapshots = new Map();
  for (const session of initialSessions) {
    storeSession(snapshots, session, true);
  }

  const repository = {
    async load(id) {
      const snapshot = snapshots.get(normalizeId(id));
      return snapshot === undefined
        ? null
        : createApplicationSession(cloneValue(snapshot));
    },

    async save(session) {
      const snapshot = storeSession(snapshots, session, false);
      return createApplicationSession(cloneValue(snapshot));
    },

    async remove(id) {
      return snapshots.delete(normalizeId(id));
    },

    async listIds() {
      return Object.freeze([...snapshots.keys()].sort());
    },
  };

  validateSessionRepository(repository);
  return Object.freeze(repository);
}

function storeSession(snapshots, session, rejectDuplicate) {
  validateApplicationSession(session);
  const id = normalizeId(session.id);
  if (rejectDuplicate && snapshots.has(id)) {
    throw new Error(`Duplicate initial Session id: ${id}`);
  }
  const snapshot = cloneValue(serializeApplicationSession(session));
  createApplicationSession(cloneValue(snapshot));
  snapshots.set(id, snapshot);
  return snapshot;
}

function normalizeId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Session repository id must be a non-empty string");
  }
  return value;
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
