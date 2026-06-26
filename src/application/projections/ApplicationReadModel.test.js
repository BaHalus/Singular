import test from "node:test";
import assert from "node:assert/strict";

import { createAttributes } from "../../domain/character/Attributes.js";
import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import { createSkill } from "../../domain/character/Skills.js";
import {
  evaluateCharacterPointLedger,
} from "../../domain/points/CharacterPointLedger.js";
import {
  serializePointLedger,
} from "../../domain/points/PointLedger.js";
import {
  resolveAttributeLevels,
} from "../../engine/attributes/AttributeLevelResolver.js";
import {
  createApplicationHistoryEntry,
} from "../history/ApplicationHistory.js";
import {
  createApplicationSession,
} from "../session/ApplicationSession.js";
import {
  executeSkillMechanicsResolutionPlan,
} from "../skills/SkillMechanicsGlobalExecutor.js";
import {
  createSkillMechanicsResolutionPlan,
} from "../skills/SkillMechanicsResolutionPlan.js";
import {
  createApplicationReadModel,
  getApplicationReadModelSchemaVersion,
  serializeApplicationReadModel,
  validateApplicationReadModel,
} from "./ApplicationReadModel.js";
import {
  createSkillMechanicsReadProjection,
} from "./SkillMechanicsReadProjection.js";

function character(name = "Leitura", id = "character-read-model") {
  return createCharacter({
    identity: {
      id,
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

function skillMechanicsProjection(
  characterId = "character-read-model",
) {
  const plan = createSkillMechanicsResolutionPlan({
    characterId,
    attributeLevels: resolveAttributeLevels(createAttributes({
      DX: 12,
    })),
    skills: [createSkill({
      id: "skill-stealth",
      name: "Stealth",
      attribute: "DX",
      difficulty: "A",
      points: 4,
    })],
    techniques: [],
    defaultCandidates: [],
  });

  return createSkillMechanicsReadProjection(
    executeSkillMechanicsResolutionPlan(plan),
  );
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

  assert.equal(model.schemaVersion, getApplicationReadModelSchemaVersion());
  assert.equal(model.schemaVersion, 2);
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
  assert.equal(model.skillMechanics, null);
  assert.equal(validateApplicationReadModel(model), true);
});

test("attaches an explicitly supplied Skill mechanics projection", () => {
  const session = createApplicationSession({
    id: "session-with-mechanics",
    character: character(),
  });
  const projection = skillMechanicsProjection();

  const model = createApplicationReadModel(session, {
    skillMechanics: projection,
  });

  assert.deepEqual(model.skillMechanics, projection);
  assert.notEqual(model.skillMechanics, projection);
  assert.equal(model.skillMechanics.characterId, model.character.identity.id);
  assert.equal(model.skillMechanics.skills[0].id, "skill-stealth");
  assert.equal(model.skillMechanics.skills[0].final.level, 13);
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
  const projection = skillMechanicsProjection();
  const model = createApplicationReadModel(createApplicationSession({
    id: "session-frozen-model",
    character: character(),
  }), {
    skillMechanics: projection,
  });
  const serialized = serializeApplicationReadModel(model);

  assert.equal(Object.isFrozen(model), true);
  assert.equal(Object.isFrozen(model.session), true);
  assert.equal(Object.isFrozen(model.character), true);
  assert.equal(Object.isFrozen(model.pointLedger), true);
  assert.equal(Object.isFrozen(model.skillMechanics), true);
  assert.equal(Object.isFrozen(model.skillMechanics.skills), true);

  serialized.character.identity.name = "Somente cópia";
  serialized.pointLedger.diagnostics.push({ code: "copy-only" });
  serialized.skillMechanics.skills[0].id = "copy-only";

  assert.equal(model.character.identity.name, "Leitura");
  assert.equal(model.skillMechanics.skills[0].id, "skill-stealth");
  assert.notDeepEqual(serialized, model);
});

test("rejects Skill mechanics from another Character", () => {
  const session = createApplicationSession({
    id: "session-foreign-mechanics",
    character: character(),
  });
  const foreign = skillMechanicsProjection("another-character");

  assert.throws(
    () => createApplicationReadModel(session, {
      skillMechanics: foreign,
    }),
    /Skill mechanics belongs to another Character/,
  );

  const model = serializeApplicationReadModel(
    createApplicationReadModel(session),
  );
  model.skillMechanics = serializeApplicationReadModel(
    createApplicationReadModel(createApplicationSession({
      id: "foreign-session",
      character: character("Foreign", "another-character"),
    }), {
      skillMechanics: foreign,
    }),
  ).skillMechanics;

  assert.throws(
    () => validateApplicationReadModel(model),
    /Skill mechanics belongs to another Character/,
  );
});

test("rejects unsupported options instead of creating hidden fallbacks", () => {
  const session = createApplicationSession({
    id: "session-options",
    character: character(),
  });

  assert.throws(
    () => createApplicationReadModel(session, {
      skillMechanics: null,
      calculateSkills: true,
    }),
    /options contains unsupported properties/,
  );

  assert.throws(
    () => createApplicationReadModel(session, null),
    /options must be a plain object/,
  );
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

test("rejects v1 or incomplete read model snapshots", () => {
  const model = serializeApplicationReadModel(
    createApplicationReadModel(createApplicationSession({
      id: "session-schema-model",
      character: character(),
    })),
  );

  const v1 = structuredClone(model);
  v1.schemaVersion = 1;
  assert.throws(
    () => validateApplicationReadModel(v1),
    /schemaVersion is invalid/,
  );

  const missingMechanics = structuredClone(model);
  delete missingMechanics.skillMechanics;
  assert.throws(
    () => validateApplicationReadModel(missingMechanics),
    /contains unsupported properties/,
  );
});
