import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { executeCommand } from "../commands/CommandExecutor.js";
import { createCommandRegistry } from "../commands/CommandRegistry.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
import {
  ATTACK_COMMAND_TYPES,
  createAttackCommandHandlerEntries,
} from "./AttackCommandHandlers.js";

test("exposes immutable command entries", () => {
  const entries = createAttackCommandHandlerEntries();
  assert.equal(Object.isFrozen(entries), true);
  assert.equal(entries.length, 4);
  assert.equal(entries.every(entry => Object.isFrozen(entry)), true);
});
