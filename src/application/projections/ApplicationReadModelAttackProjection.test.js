import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
import {
  createApplicationReadModel,
  serializeApplicationReadModel,
  validateApplicationReadModel,
} from "./ApplicationReadModel.js";
import {
  createAttackReadProjection,
} from "./AttackReadProjection.js";

function character(id = "character-read-attacks") {
  return createCharacter({
    identity: {
      id,
      name: "Leitura de Ataques",
    },
    attacks: [
      {
        id: `attack-${id}`,
        name: "Golpe declarado",
        category: "melee",
        skillId: "skill-broadsword",
        source: { kind: "manual", id: null },
        damage: { value: "sw+1", type: "cut" },
        reach: "1",
        notes: "Sem cálculo no read model.",
        raw: { negativeZero: -0 },
      },
    ],
  });
}

function session(id = "character-read-attacks") {
  return createApplicationSession({
    id: `session-${id}`,
    character: character(id),
  });
}

test("emits null when no Attack projection is supplied", () => {
  const model = createApplicationReadModel(session());

  assert.equal(model.schemaVersion, 2);
  assert.equal(model.attackProjection, null);
  assert.equal(validateApplicationReadModel(model), true);
});

test("attaches a detached frozen Attack projection", () => {
  const current = session();
  const projection = createAttackReadProjection(current.character);
  const model = createApplicationReadModel(current, {
    attackProjection: projection,
  });

  assert.deepEqual(model.attackProjection, projection);
  assert.notEqual(model.attackProjection, projection);
  assert.notEqual(model.attackProjection.attacks, projection.attacks);
  assert.equal(model.attackProjection.characterId, current.character.identity.id);
  assert.equal(model.attackProjection.attacks[0].id, "attack-character-read-attacks");
  assert.equal(model.attackProjection.attacks[0].damage.authority, "declared");
  assert.equal(
    Object.is(model.attackProjection.attacks[0].raw.negativeZero, -0),
    true,
  );
  assert.equal(Object.isFrozen(model.attackProjection), true);
  assert.equal(Object.isFrozen(model.attackProjection.attacks), true);
  assert.equal(model.skillMechanics, null);
});

test("serializes Attack projection without sharing references", () => {
  const current = session();
  const model = createApplicationReadModel(current, {
    attackProjection: createAttackReadProjection(current.character),
  });
  const serialized = serializeApplicationReadModel(model);

  assert.notEqual(serialized, model);
  assert.notEqual(serialized.attackProjection, model.attackProjection);
  assert.notEqual(
    serialized.attackProjection.attacks,
    model.attackProjection.attacks,
  );
  serialized.attackProjection.attacks[0].name = "Somente cópia";
  assert.equal(
    model.attackProjection.attacks[0].name,
    "Golpe declarado",
  );
});

test("rejects an Attack projection belonging to another Character", () => {
  const local = session();
  const foreign = createAttackReadProjection(character("foreign-character"));

  assert.throws(
    () => createApplicationReadModel(local, {
      attackProjection: foreign,
    }),
    /Attack projection belongs to another Character/,
  );

  const localModel = serializeApplicationReadModel(
    createApplicationReadModel(local),
  );
  localModel.attackProjection = serializeApplicationReadModel(
    createApplicationReadModel(session("foreign-character"), {
      attackProjection: foreign,
    }),
  ).attackProjection;

  assert.throws(
    () => validateApplicationReadModel(localModel),
    /Attack projection belongs to another Character/,
  );
});

test("accepts legacy v2 snapshots without Attack projection", () => {
  const model = serializeApplicationReadModel(
    createApplicationReadModel(session()),
  );
  delete model.attackProjection;

  assert.equal(model.schemaVersion, 2);
  assert.equal(validateApplicationReadModel(model), true);
  assert.equal("attackProjection" in model, false);
});

test("rejects invalid Attack projection and unrelated options", () => {
  const current = session();
  const projection = serializeApplicationReadModel(
    createApplicationReadModel(current, {
      attackProjection: createAttackReadProjection(current.character),
    }),
  ).attackProjection;
  projection.attacks[0].damage.authority = "calculated";

  assert.throws(
    () => createApplicationReadModel(current, {
      attackProjection: projection,
    }),
    /authority must be declared/,
  );
  assert.throws(
    () => createApplicationReadModel(current, {
      attackProjection: null,
      calculateAttacks: true,
    }),
    /options contains unsupported properties/,
  );
});
