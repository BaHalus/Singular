import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import { serializeAttacks } from "../../domain/character/Attacks.js";
import {
  addAttack,
  findAttackById,
  removeAttack,
  reorderAttack,
  updateAttack,
} from "../../domain/character/AttacksOperations.js";

export const ATTACK_COMMAND_TYPES = Object.freeze({
  ADD: "attack.add",
  UPDATE: "attack.update",
  REMOVE: "attack.remove",
  REORDER: "attack.reorder",
});

export function createAttackCommandHandlerEntries() {
  return Object.freeze([
    Object.freeze({ type: ATTACK_COMMAND_TYPES.ADD, handler: handleAddAttackCommand }),
    Object.freeze({ type: ATTACK_COMMAND_TYPES.UPDATE, handler: handleUpdateAttackCommand }),
    Object.freeze({ type: ATTACK_COMMAND_TYPES.REMOVE, handler: handleRemoveAttackCommand }),
    Object.freeze({ type: ATTACK_COMMAND_TYPES.REORDER, handler: handleReorderAttackCommand }),
  ]);
}
