import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import { serializeEquipment } from "../../domain/character/Equipment.js";
import {
  addChildEquipment,
  addEquipment,
  findEquipmentItem,
  moveEquipment,
  removeEquipment,
  renameEquipment,
  setEquipmentQuantity,
  setEquipmentState,
} from "../../domain/character/EquipmentOperations.js";

export const EQUIPMENT_COMMAND_TYPES = Object.freeze({
  ADD: "equipment.add",
  ADD_CHILD: "equipment.add-child",
  RENAME: "equipment.rename",
  SET_QUANTITY: "equipment.quantity.set",
  SET_STATE: "equipment.state.set",
  REMOVE: "equipment.remove",
  MOVE: "equipment.move",
});
