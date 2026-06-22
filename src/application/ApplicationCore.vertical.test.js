import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "../domain/character/Character.js";
import {
  createCommandRegistry,
} from "./commands/CommandRegistry.js";
import { executeCommand } from "./commands/CommandExecutor.js";
import {
  redoApplicationSession,
  undoApplicationSession,
} from "./history/ApplicationHistoryOperations.js";
import {
  createInMemoryCharacterRepository,
} from "./persistence/InMemoryCharacterRepository.js";
import {
  createInMemorySessionRepository,
} from "./persistence/InMemorySessionRepository.js";
import {
  createApplicationReadModel,
} from "./projections/ApplicationReadModel.js";
import {
  createApplicationSession,
} from "./session/ApplicationSession.js";
import { createFixedClock } from "../infrastructure/runtime/FixedClock.js";
import {
  createSequentialIdGenerator,
} from "../infrastructure/runtime/SequentialIdGenerator.js";

function character(name = "Inicial") {
  return createCharacter({
    identity: {
      id: "character-app-core-vertical",
      name,
    },
    pointBudget: {
      declaredPoints: 150,
    },
    metadata: {
      createdAt: "2026-06-22T18:00:00.000Z",
      updatedAt: "2026-06-22T18:00:00.000Z",
      source: "test",
    },
  });
}

function runtime() {
  return {
    clock: createFixedClock("2026-06-22T18:30:00.000Z"),
    idGenerator: createSequentialIdGenerator({
      initialValue: 0,
      width: 3,
    }),
  };
}

function registry() {
  return createCommandRegistry([{
    type: "character.rename",
    handler: ({ session, command }) => {
      const snapshot = serializeCharacter(session.character);
      if (snapshot.identity.name === command.payload.name) {
        return {
          status: "no-op",
          receipt: { reason: "already-current" },
        };
      }
      return {
        status: "applied",
        character: createCharacter({
          ...snapshot,
          identity: {
            ...snapshot.identity,
            name: command.payload.name,
          },
        }),
        receipt: {
          previousName: snapshot.identity.name,
          name: command.payload.name,
        },
      };
    },
  }]);
}

test("runs command persistence projection undo and redo vertically", async () => {
  const appRuntime = runtime();
  const sessionRepository = createInMemorySessionRepository();
  const characterRepository = createInMemoryCharacterRepository();
  const initial = createApplicationSession({
    id: "session-app-core-vertical",
    character: character(),
  });

  await sessionRepository.save(initial);
  const opened = await sessionRepository.load(initial.id);
  const applied = executeCommand(opened, {
    id: "command-rename-vertical",
    type: "character.rename",
    expectedRevision: 0,
    issuedAt: "2026-06-22T18:20:00.000Z",
    payload: { name: "Renomeado" },
  }, registry(), appRuntime);

  assert.equal(applied.status, "applied");
  assert.equal(applied.session.revision, 1);
  assert.equal(applied.session.history[0].id, "transition:001");
  assert.equal(applied.session.character.identity.name, "Renomeado");

  await sessionRepository.save(applied.session);
  const reopened = await sessionRepository.load(initial.id);
  const readAfterApply = createApplicationReadModel(reopened);

  assert.equal(readAfterApply.session.revision, 1);
  assert.equal(readAfterApply.session.canUndo, true);
  assert.equal(readAfterApply.session.canRedo, false);
  assert.equal(readAfterApply.character.identity.name, "Renomeado");
  assert.equal(
    readAfterApply.pointLedger.characterId,
    "character-app-core-vertical",
  );
  assert.equal(
    readAfterApply.pointLedger.pointBudget.declaredPoints,
    150,
  );

  const stale = executeCommand(reopened, {
    id: "command-stale-vertical",
    type: "character.rename",
    expectedRevision: 0,
    issuedAt: "2026-06-22T18:21:00.000Z",
    payload: { name: "Não aplicado" },
  }, registry(), appRuntime);

  assert.equal(stale.status, "rejected");
  assert.equal(stale.session, reopened);
  assert.equal(stale.session.character.identity.name, "Renomeado");

  const undone = undoApplicationSession(reopened, {
    expectedRevision: 1,
  }, appRuntime);

  assert.equal(undone.status, "undone");
  assert.equal(undone.receipt.operationId, "undo:002");
  assert.equal(undone.session.revision, 2);
  assert.equal(undone.session.character.identity.name, "Inicial");
  assert.equal(undone.session.history.length, 0);
  assert.equal(undone.session.future.length, 1);

  await sessionRepository.save(undone.session);
  const reopenedUndone = await sessionRepository.load(initial.id);
  const readAfterUndo = createApplicationReadModel(reopenedUndone);

  assert.equal(readAfterUndo.session.canUndo, false);
  assert.equal(readAfterUndo.session.canRedo, true);
  assert.equal(readAfterUndo.character.identity.name, "Inicial");

  const redone = redoApplicationSession(reopenedUndone, {
    expectedRevision: 2,
  }, appRuntime);

  assert.equal(redone.status, "redone");
  assert.equal(redone.receipt.operationId, "redo:003");
  assert.equal(redone.session.revision, 3);
  assert.equal(redone.session.character.identity.name, "Renomeado");
  assert.equal(redone.session.history.length, 1);
  assert.equal(redone.session.future.length, 0);

  await characterRepository.save(redone.session.character);
  const savedCharacter = await characterRepository.load(
    "character-app-core-vertical",
  );
  assert.deepEqual(
    serializeCharacter(savedCharacter),
    serializeCharacter(redone.session.character),
  );

  assert.equal(initial.revision, 0);
  assert.equal(initial.character.identity.name, "Inicial");
});
