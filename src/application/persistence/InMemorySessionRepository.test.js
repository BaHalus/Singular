import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  createApplicationSession,
  serializeApplicationSession,
} from "../session/ApplicationSession.js";
import {
  createInMemorySessionRepository,
} from "./InMemorySessionRepository.js";
import { validateSessionRepository } from "../ports/RepositoryPorts.js";

function session(id, revision = 0) {
  const character = createCharacter({
    identity: {
      id: `character-${id}`,
      name: id,
    },
    metadata: {
      createdAt: "2026-06-22T14:30:00.000Z",
      updatedAt: "2026-06-22T14:30:00.000Z",
      source: "test",
    },
  });
  return createApplicationSession({
    id,
    revision,
    character,
    dirty: revision > 0,
  });
}

test("saves and loads detached validated sessions", async () => {
  const repository = createInMemorySessionRepository();
  const original = session("session-b", 2);
  const saved = await repository.save(original);
  const firstLoad = await repository.load("session-b");
  const secondLoad = await repository.load("session-b");

  assert.equal(validateSessionRepository(repository), true);
  assert.equal(Object.isFrozen(repository), true);
  assert.notEqual(saved, original);
  assert.notEqual(firstLoad, saved);
  assert.notEqual(firstLoad, secondLoad);
  assert.deepEqual(
    serializeApplicationSession(firstLoad),
    serializeApplicationSession(original),
  );
});

test("overwrites by session id and preserves the latest revision", async () => {
  const repository = createInMemorySessionRepository([
    session("session-z", 1),
    session("session-a", 0),
  ]);
  await repository.save(session("session-z", 4));

  assert.deepEqual(await repository.listIds(), ["session-a", "session-z"]);
  assert.equal((await repository.load("session-z")).revision, 4);
  assert.equal(Object.isFrozen(await repository.listIds()), true);
});

test("removes sessions and returns null for absent ids", async () => {
  const repository = createInMemorySessionRepository([
    session("session-remove"),
  ]);

  assert.equal(await repository.remove("session-remove"), true);
  assert.equal(await repository.remove("session-remove"), false);
  assert.equal(await repository.load("session-remove"), null);
});

test("rejects invalid inputs and duplicate initial ids", async () => {
  assert.throws(
    () => createInMemorySessionRepository({}),
    /initial values must be an array/,
  );
  assert.throws(
    () => createInMemorySessionRepository([
      session("duplicate"),
      session("duplicate"),
    ]),
    /Duplicate initial Session id/,
  );

  const repository = createInMemorySessionRepository();
  await assert.rejects(() => repository.load(" "), /id must be a non-empty string/);
  await assert.rejects(() => repository.remove(undefined), /id must be a non-empty string/);
  await assert.rejects(() => repository.save({}), /Application session/);
});
