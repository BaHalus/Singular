import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { createFixedClock } from "../../infrastructure/runtime/FixedClock.js";
import { createSequentialIdGenerator } from "../../infrastructure/runtime/SequentialIdGenerator.js";
import { executeCommand } from "../commands/CommandExecutor.js";
import { createCommandRegistry } from "../commands/CommandRegistry.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
import { EQUIPMENT_COMMAND_TYPES, createEquipmentCommandHandlerEntries } from "./EquipmentCommandHandlers.js";

function session() {
  return createApplicationSession({
    id: "session-equipment-identity",
    character: createCharacter({
      identity: { id: "character-equipment-identity", name: "Identidade" },
      equipment: [{ id: "rope", name: "Corda", state: "carried" }],
    }),
  });
}

function run(type, payload, id) {
  const initial = session();
  const result = executeCommand(
    initial,
    {
      id,
      type,
      expectedRevision: 0,
      issuedAt: "2026-06-26T23:05:00.000Z",
      payload,
    },
    createCommandRegistry(createEquipmentCommandHandlerEntries()),
    {
      clock: createFixedClock("2026-06-26T23:10:00.000Z"),
      idGenerator: createSequentialIdGenerator({ initialValue: 0, width: 3 }),
    },
  );
  return { initial, result };
}

test("rejects added items without explicit ids at any depth", () => {
  const missingRoot = run(
    EQUIPMENT_COMMAND_TYPES.ADD,
    { item: { name: "Sem identidade" } },
    "missing-root-id",
  );
  const missingChild = run(
    EQUIPMENT_COMMAND_TYPES.ADD,
    {
      item: {
        id: "container-explicit",
        name: "Recipiente",
        kind: "container",
        containerKind: "physical",
        children: [{ name: "Filho sem identidade" }],
      },
    },
    "missing-child-id",
  );

  for (const { initial, result } of [missingRoot, missingChild]) {
    assert.equal(result.status, "failed");
    assert.equal(result.session, initial);
    assert.equal(result.session.character.equipment.length, 1);
    assert.match(result.diagnostics[0].message, /non-empty string/);
  }
});

test("rejects non-textual names instead of coercing them", () => {
  const { initial, result } = run(
    EQUIPMENT_COMMAND_TYPES.RENAME,
    { itemId: "rope", name: { label: "Objeto" } },
    "object-name",
  );

  assert.equal(result.status, "failed");
  assert.equal(result.session, initial);
  assert.equal(result.session.character.equipment[0].name, "Corda");
  assert.match(result.diagnostics[0].message, /name must be a string/);
});
