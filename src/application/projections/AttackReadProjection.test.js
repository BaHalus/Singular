import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { createFixedClock } from "../../infrastructure/runtime/FixedClock.js";
import {
  createSequentialIdGenerator,
} from "../../infrastructure/runtime/SequentialIdGenerator.js";
import {
  ATTACK_COMMAND_TYPES,
  createAttackCommandHandlerEntries,
} from "../attacks/AttackCommandHandlers.js";
import { executeCommand } from "../commands/CommandExecutor.js";
import { createCommandRegistry } from "../commands/CommandRegistry.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
import {
  createAttackReadProjection,
  getAttackReadProjectionSchemaVersion,
  serializeAttackReadProjection,
  validateAttackReadProjection,
} from "./AttackReadProjection.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-attack-read",
      name: "Ayla",
      concept: "Batedora",
    },
    attacks: [
      {
        id: "attack-blade",
        externalIds: { gcs: "blade-001" },
        name: "Golpe de lâmina",
        category: "melee",
        skillId: "skill-broadsword",
        source: { kind: "equipment", id: "equipment-blade" },
        damage: { value: "sw+1", type: "cut" },
        reach: "1",
        notes: "Declarado pelo item.",
        importMeta: { source: "fixture", version: 1 },
        raw: { negativeZero: -0, tags: ["one", "two"] },
      },
      {
        id: "attack-bow",
        name: "Disparo de arco",
        category: "ranged",
        skillId: "skill-bow",
        source: { kind: "equipment", id: "equipment-bow" },
        damage: { value: "thr+1", type: "imp" },
        range: "x15/x20",
        notes: "Sem cálculo de distância.",
      },
    ],
  });
}

function runtime() {
  return {
    clock: createFixedClock("2026-06-26T22:10:00.000Z"),
    idGenerator: createSequentialIdGenerator({ initialValue: 0, width: 3 }),
  };
}

test("creates a frozen portable projection preserving canonical order and declarations", () => {
  const source = character();
  const projection = createAttackReadProjection(source);

  assert.equal(projection.schemaVersion, 1);
  assert.equal(projection.characterId, "character-attack-read");
  assert.deepEqual(projection.attacks.map(item => item.id), [
    "attack-blade",
    "attack-bow",
  ]);
  assert.equal(projection.attacks[0].damage.value, "sw+1");
  assert.equal(projection.attacks[0].damage.type, "cut");
  assert.equal(projection.attacks[0].damage.authority, "declared");
  assert.equal(projection.attacks[1].range, "x15/x20");
  assert.equal(Object.is(projection.attacks[0].raw.negativeZero, -0), true);
  assert.equal("skillLevel" in projection.attacks[0], false);
  assert.equal("calculatedDamage" in projection.attacks[0], false);
  assert.notEqual(projection.attacks, source.attacks);
  assert.notEqual(projection.attacks[0], source.attacks[0]);
  assert.equal(Object.isFrozen(projection), true);
  assert.equal(Object.isFrozen(projection.attacks), true);
  assert.equal(Object.isFrozen(projection.attacks[0].raw), true);
  assert.equal(validateAttackReadProjection(projection), true);
});

test("serializes to a detached portable snapshot", () => {
  const projection = createAttackReadProjection(character());
  const serialized = serializeAttackReadProjection(projection);

  assert.deepEqual(serialized, projection);
  assert.notEqual(serialized, projection);
  assert.notEqual(serialized.attacks, projection.attacks);
  assert.notEqual(serialized.attacks[0].damage, projection.attacks[0].damage);
  serialized.attacks[0].name = "Mutação externa";
  serialized.attacks[0].raw.tags.push("three");

  assert.equal(projection.attacks[0].name, "Golpe de lâmina");
  assert.deepEqual(projection.attacks[0].raw.tags, ["one", "two"]);
});

test("projects the Character produced by APP-ATTACK commands", () => {
  const initial = createApplicationSession({
    id: "session-attack-read",
    character: character(),
  });
  const result = executeCommand(
    initial,
    {
      id: "command-update-attack-read",
      type: ATTACK_COMMAND_TYPES.UPDATE,
      expectedRevision: 0,
      issuedAt: "2026-06-26T22:05:00.000Z",
      payload: {
        attackId: "attack-bow",
        patch: {
          name: "Disparo preparado",
          notes: "Declaração atualizada pela aplicação.",
        },
      },
    },
    createCommandRegistry(createAttackCommandHandlerEntries()),
    runtime(),
  );
  const projection = createAttackReadProjection(result.session.character);

  assert.equal(result.status, "applied");
  assert.equal(projection.attacks[1].id, "attack-bow");
  assert.equal(projection.attacks[1].name, "Disparo preparado");
  assert.equal(
    projection.attacks[1].notes,
    "Declaração atualizada pela aplicação.",
  );
  assert.equal(projection.attacks[1].damage.authority, "declared");
});

test("rejects invalid schema shape and invalid canonical attacks", () => {
  const valid = serializeAttackReadProjection(
    createAttackReadProjection(character()),
  );

  assert.throws(
    () => validateAttackReadProjection({ ...valid, schemaVersion: 2 }),
    /schemaVersion is invalid/,
  );
  assert.throws(
    () => validateAttackReadProjection({ ...valid, extra: true }),
    /unsupported properties/,
  );
  assert.throws(
    () => validateAttackReadProjection({ ...valid, characterId: " " }),
    /non-empty string/,
  );

  const duplicate = serializeAttackReadProjection(
    createAttackReadProjection(character()),
  );
  duplicate.attacks[1].id = duplicate.attacks[0].id;
  assert.throws(
    () => validateAttackReadProjection(duplicate),
    /ids must be unique/,
  );

  const calculated = serializeAttackReadProjection(
    createAttackReadProjection(character()),
  );
  calculated.attacks[0].damage.authority = "calculated";
  assert.throws(
    () => validateAttackReadProjection(calculated),
    /authority must be declared/,
  );

  const sparse = serializeAttackReadProjection(
    createAttackReadProjection(character()),
  );
  delete sparse.attacks[0];
  assert.throws(
    () => validateAttackReadProjection(sparse),
    /dense array/,
  );
});

test("rejects non-portable values and reports schema version", () => {
  const projection = serializeAttackReadProjection(
    createAttackReadProjection(character()),
  );
  projection.attacks[0].raw = { invalid: Number.POSITIVE_INFINITY };

  assert.throws(
    () => validateAttackReadProjection(projection),
    /JSON portable/,
  );
  assert.equal(getAttackReadProjectionSchemaVersion(), 1);
});
