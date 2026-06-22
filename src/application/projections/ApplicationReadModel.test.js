import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import {
  evaluateCharacterPointLedger,
} from "../../domain/points/CharacterPointLedger.js";
import {
  serializePointLedger,
} from "../../domain/points/PointLedger.js";
import {
  createApplicationHistoryEntry,
} from "../history/ApplicationHistory.js";
import {
  createApplicationSession,
} from "../session/ApplicationSession.js";
import {
  createApplicationReadModel,
  serializeApplicationReadModel,
  validateApplicationReadModel,
} from "./ApplicationReadModel.js";

function character(name = "Leitura") {
  return createCharacter({
    identity: {
      id: "character-read-model",
      name,
    },
    pointBudget: {
      declaredPoints: 150,
    },
    metadata: {
      createdAt: "2026-06-22T17:00:00.000Z",
      updatedAt: "2026-06-22T17:00:00.000Z",
      source: "test",
    },
  });
}

function transition() {
  return createApplicationHistoryEntry({
    id: "transition-read-model",
    commandId: "command-read-model",
    commandType: "character.rename",
    issuedAt: "2026-06-22T17:00:00.000Z",
    appliedAt: "2026-06-22T17:00:01.000Z",
    beforeRevision: 0,
    afterRevision: 1,
    beforeCharacter: character("Antes"),
    afterCharacter: character("Depois"),
    commandPayload: { name: "Depois" },
    receipt: { status: "applied" },
  });
}

test("composes session Character and the sovereign Point Ledger", () => {
  const session = createApplicationSession({
    id: "session-read-model",
    character: character(),
  });
  const model = createApplicationReadModel(session);
  const expectedLedger = serializePointLedger(
    evaluateCharacterPointLedger(session.character),
  );

  assert.equal(model.schemaVersion, 1);
  assert.equal(model.session.id, "session-read-model");
  assert.equal(model.session.revision, 0);
  assert.equal(model.session.dirty, false);
  assert.equal(model.session.canUndo, false);
  assert.equal(model.session.canRedo, false);
  assert.equal(model.session.historyDepth, 0);
  assert.equal(model.session.futureDepth, 0);
  assert.deepEqual(model.character, serializeCharacter(session.character));
  assert.deepEqual(model.pointLedger, expectedLedger);
  assert.equal(model.pointLedger.characterId, model.character.identity.id);
  assert.equal(validateApplicationReadModel(model), true);
});

test("projects undo and redo capabilities from the canonical stacks", () => {
  const entry = transition();
  const withHistory = createApplicationSession({
    id: "session-with-history",
    revision: 1,
    character: character("Depois"),
    history: [entry],
    dirty: true,
    lastReceipt: {
      commandId: "command-read-model",
      status: "applied",
    },
  });
  const withFuture = createApplicationSession({
    id: "session-with-future",
    revision: 2,
    character: character("Antes"),
    future: [entry],
    dirty: true,
  });

  const undoModel = createApplicationReadModel(withHistory);
  const redoModel = createApplicationReadModel(withFuture);

  assert.equal(undoModel.session.canUndo, true);
  assert.equal(undoModel.session.canRedo, false);
  assert.equal(undoModel.session.historyDepth, 1);
  assert.equal(undoModel.session.futureDepth, 0);
  assert.deepEqual(undoModel.session.lastReceipt, withHistory.lastReceipt);

  assert.equal(redoModel.session.canUndo, false);
  assert.equal(redoModel.session.canRedo, true);
  assert.equal(redoModel.session.historyDepth, 0);
  assert.equal(redoModel.session.futureDepth, 1);
});

test("returns a deeply frozen model and detached serialization", () => {
  const model = createApplicationReadModel(createApplicationSession({
    id: "session-frozen-model",
    character: character(),
  }));
  const serialized = serializeApplicationReadModel(model);

  assert.equal(Object.isFrozen(model), true);
  assert.equal(Object.isFrozen(model.session), true);
  assert.equal(Object.isFrozen(model.character), true);
  assert.equal(Object.isFrozen(model.pointLedger), true);

  serialized.character.identity.name = "Somente cópia";
  serialized.pointLedger.diagnostics.push({ code: "copy-only" });

  assert.equal(model.character.identity.name, "Leitura");
  assert.notDeepEqual(serialized, model);
});

test("rejects inconsistent capabilities and foreign ledgers", () => {
  const model = serializeApplicationReadModel(
    createApplicationReadModel(createApplicationSession({
      id: "session-invalid-model",
      character: character(),
    })),
  );

  assert.throws(
    () => validateApplicationReadModel({
      ...model,
      session: {
        ...model.session,
        canUndo: true,
      },
    }),
    /canUndo is inconsistent/,
  );
  assert.throws(
    () => validateApplicationReadModel({
      ...model,
      pointLedger: {
        ...model.pointLedger,
        characterId: "another-character",
      },
    }),
    /belongs to another character/i,
  );
});
