import {
  createTrait,
  serializeTrait,
  validateTrait,
} from "./Traits.js";

const COMMAND_TYPES = new Set([
  "set-mode",
  "set-base-points",
  "set-points-per-level",
  "set-levels",
]);

const SUPPORTED_MODES = new Set([
  "total",
  "per-level",
  "base-plus-levels",
]);

export function applyTraitCostBasisCommands(trait, commands = []) {
  validateTrait(trait);
  if (!Array.isArray(commands)) {
    throw new Error("Trait cost basis commands must be array");
  }

  let working = serializeTrait(trait);
  for (const [index, command] of commands.entries()) {
    validateCommand(command, index);
    working = applyCommand(working, command);
  }

  return createTrait(working);
}

export function setTraitCostBasisMode(trait, mode) {
  return applyTraitCostBasisCommands(trait, [{
    type: "set-mode",
    mode,
  }]);
}

export function setTraitBasePoints(trait, value) {
  return applyTraitCostBasisCommands(trait, [{
    type: "set-base-points",
    value,
  }]);
}

export function setTraitPointsPerLevel(trait, value) {
  return applyTraitCostBasisCommands(trait, [{
    type: "set-points-per-level",
    value,
  }]);
}

export function setTraitCostBasisLevels(trait, value) {
  return applyTraitCostBasisCommands(trait, [{
    type: "set-levels",
    value,
  }]);
}

export function getTraitCostBasisCommandTypes() {
  return [...COMMAND_TYPES];
}

function applyCommand(trait, command) {
  const pointValue = {
    ...trait.pointValue,
    calculatedPoints: null,
  };

  switch (command.type) {
    case "set-mode":
      pointValue.mode = command.mode;
      break;
    case "set-base-points":
      pointValue.basePoints = command.value;
      break;
    case "set-points-per-level":
      pointValue.pointsPerLevel = command.value;
      break;
    case "set-levels":
      pointValue.levels = command.value;
      break;
    default:
      throw new Error("Trait cost basis command type is invalid");
  }

  return serializeTrait(createTrait({
    ...trait,
    pointValue,
  }));
}

function validateCommand(command, index) {
  requirePlainObject(command, `Trait cost basis commands[${index}]`);
  if (!COMMAND_TYPES.has(command.type)) {
    throw new Error("Trait cost basis command type is invalid");
  }

  if (command.type === "set-mode") {
    if (!SUPPORTED_MODES.has(command.mode)) {
      throw new Error("Trait cost basis mode is invalid");
    }
    return;
  }

  validateNullableFiniteNumber(command.value);
}

function validateNullableFiniteNumber(value) {
  if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error("Trait cost basis value must be finite number or null");
  }
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    throw new Error(`${label} must be object`);
  }
}
