import {
  createCharacter,
  serializeCharacter,
  validateCharacter,
} from "../../domain/character/Character.js";
import { validateCharacterRepository } from "../ports/RepositoryPorts.js";

export function createInMemoryCharacterRepository(initialCharacters = []) {
  if (!Array.isArray(initialCharacters)) {
    throw new Error("Character repository initial values must be an array");
  }

  const snapshots = new Map();
  for (const character of initialCharacters) {
    storeCharacter(snapshots, character, true);
  }

  const repository = {
    async load(id) {
      const snapshot = snapshots.get(normalizeId(id));
      return snapshot === undefined
        ? null
        : createCharacter(cloneValue(snapshot));
    },

    async save(character) {
      const snapshot = storeCharacter(snapshots, character, false);
      return createCharacter(cloneValue(snapshot));
    },

    async remove(id) {
      return snapshots.delete(normalizeId(id));
    },

    async listIds() {
      return Object.freeze([...snapshots.keys()].sort());
    },
  };

  validateCharacterRepository(repository);
  return Object.freeze(repository);
}

function storeCharacter(snapshots, character, rejectDuplicate) {
  validateCharacter(character);
  const id = normalizeId(character.identity.id);
  if (rejectDuplicate && snapshots.has(id)) {
    throw new Error(`Duplicate initial Character id: ${id}`);
  }
  const snapshot = cloneValue(serializeCharacter(character));
  createCharacter(cloneValue(snapshot));
  snapshots.set(id, snapshot);
  return snapshot;
}

function normalizeId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Character repository id must be a non-empty string");
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
