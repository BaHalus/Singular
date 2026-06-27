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
    id: "session-equipment-no-op",
    character: createCharacter({
      identity: { id: "character-equipment-no-op", name: "No-op" },
      equipment: [
        {
          id: "pack",
          name: "Mochila",
          kind: "container",
          containerKind: "physical",
          state: "carried",
          children: [
            { id: "rope", name: "Corda", quantity: 1, state: "carried" },
            { id: "ration", name: "Ração", quantity: 1, state: "carried" },
          ],
        },
        { id: "sword", name: "Espada", quantity: 1, state: "equipped" },
      ],
    }),
  });
}

function run(initial, type, payload, id) {
  return executeCommand(
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
}

test("preserves revision and history for redundant equipment commands", () => {
  const initial = session();
  const results = [
    run(initial, EQUIPMENT_COMMAND_TYPES.UPDATE, { itemId: "rope", patch: { name: "Corda" } }, "same-update"),
    run(initial, EQUIPMENT_COMMAND_TYPES.RENAME, { itemId: "rope", name: "Corda" }, "same-name"),
    run(initial, EQUIPMENT_COMMAND_TYPES.SET_QUANTITY, { itemId: "rope", quantity: 1 }, "same-quantity"),
    run(initial, EQUIPMENT_COMMAND_TYPES.SET_STATE, { itemId: "rope", state: "carried" }, "same-state"),
    run(initial, EQUIPMENT_COMMAND_TYPES.MOVE, { itemId: "sword", targetContainerId: null }, "same-root-move"),
    run(initial, EQUIPMENT_COMMAND_TYPES.MOVE, { itemId: "ration", targetContainerId: "pack" }, "same-container-move"),
    run(initial, EQUIPMENT_COMMAND_TYPES.REORDER, { itemId: "rope", targetIndex: 0 }, "same-reorder"),
  ];

  for (const result of results) {
    assert.equal(result.status, "no-op");
    assert.equal(result.session, initial);
    assert.equal(result.session.revision, 0);
    assert.equal(result.session.history.length, 0);
    assert.deepEqual(
      result.session.character.equipment[0].children.map(entry => entry.id),
      ["rope", "ration"],
    );
  }
});
