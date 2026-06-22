import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import {
  createInMemoryCharacterRepository,
} from "./InMemoryCharacterRepository.js";
import { validateCharacterRepository } from "../ports/RepositoryPorts.js";

function character(id, name = id) {
  return createCharacter({
    identity: { id, name },
    metadata: {
      createdAt: "2026-06-22T14:00:00.000Z",
      updatedAt: "2026-06-22T14:00:00.000Z",
      source: "test",
    },
  });
}

test("saves and loads detached validated Characters", async () => {
  const repository = createInMemoryCharacterRepository();
  const original = character("character-b", "Original");
  const saved = await repository.save(original);
  const firstLoad = await repository.load("character-b");
  const secondLoad = await repository.load("character-b");

  assert.equal(validateCharacterRepository(repository), true);
  assert.equal(Object.isFrozen(repository), true);
  assert.notEqual(saved, original);
  assert.notEqual(firstLoad, saved);
  assert.notEqual(firstLoad, secondLoad);
  assert.deepEqual(serializeCharacter(firstLoad), serializeCharacter(original));
});

test("overwrites by sovereign Character id and lists ids deterministically", async () => {
  const repository = createInMemoryCharacterRepository([
    character("character-z"),
    character("character-a"),
  ]);
  await repository.save(character("character-z", "Atualizado"));

  assert.deepEqual(await repository.listIds(), [
    "character-a",
    "character-z",
  ]);
  assert.equal((await repository.load("character-z")).identity.name, "Atualizado");
  assert.equal(Object.isFrozen(await repository.listIds()), true);
});

test("removes records and returns null for missing ids", async () => {
  const repository = createInMemoryCharacterRepository([
    character("character-remove"),
  ]);

  assert.equal(await repository.remove("character-remove"), true);
  assert.equal(await repository.remove("character-remove"), false);
  assert.equal(await repository.load("character-remove"), null);
  assert.deepEqual(await repository.listIds(), []);
});

test("rejects invalid input and duplicate initial ids", async () => {
  assert.throws(
    () => createInMemoryCharacterRepository({}),
    /initial values must be an array/,
  );
  assert.throws(
    () => createInMemoryCharacterRepository([
      character("duplicate"),
      character("duplicate"),
    ]),
    /Duplicate initial Character id/,
  );

  const repository = createInMemoryCharacterRepository();
  await assert.rejects(() => repository.load(""), /id must be a non-empty string/);
  await assert.rejects(() => repository.remove(null), /id must be a non-empty string/);
  await assert.rejects(() => repository.save({}), /Character must/);
});
