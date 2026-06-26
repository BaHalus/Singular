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
