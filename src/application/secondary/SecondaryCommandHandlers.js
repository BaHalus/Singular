import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import { serializePools } from "../../domain/character/Pools.js";
import { serializeSecondaryCharacteristics } from "../../domain/character/SecondaryCharacteristics.js";
import { setPoolMaximum } from "../../domain/character/PoolsOperations.js";
import {
  clearSecondaryCharacteristicOverride,
  findSecondaryCharacteristic,
  setSecondaryCharacteristicBase,
  setSecondaryCharacteristicOverride,
} from "../../domain/character/SecondaryCharacteristicsOperations.js";

export const SECONDARY_COMMAND_TYPES = Object.freeze({
  SET_SECONDARY_BASE: "secondary.base.set",
  SET_SECONDARY_OVERRIDE: "secondary.override.set",
  CLEAR_SECONDARY_OVERRIDE: "secondary.override.clear",
  SET_POOL_MAXIMUM: "pool.maximum.set",
});

const STRUCTURAL_POOL_KEYS = Object.freeze(["HP", "FP"]);
const APP_SECONDARY_REHYDRATABLE_POOL_KEYS = Object.freeze(["HP", "FP", "EnergyReserve"]);

export function createSecondaryCommandHandlerEntries() {
  return Object.freeze([
    Object.freeze({ type: SECONDARY_COMMAND_TYPES.SET_SECONDARY_BASE, handler: handleSetSecondaryBaseCommand }),
    Object.freeze({ type: SECONDARY_COMMAND_TYPES.SET_SECONDARY_OVERRIDE, handler: handleSetSecondaryOverrideCommand }),
    Object.freeze({ type: SECONDARY_COMMAND_TYPES.CLEAR_SECONDARY_OVERRIDE, handler: handleClearSecondaryOverrideCommand }),
    Object.freeze({ type: SECONDARY_COMMAND_TYPES.SET_POOL_MAXIMUM, handler: handleSetPoolMaximumCommand }),
  ]);
}

export function handleSetSecondaryBaseCommand(context) {
  const { session, command } = validateCommandContext(context, SECONDARY_COMMAND_TYPES.SET_SECONDARY_BASE);
  validateExactPayloadKeys(command.payload, ["characteristicKey", "base"]);
  const characteristicKey = normalizeSecondaryKey(command.payload.characteristicKey);
  const previousBase = findSecondaryCharacteristic(session.character.secondaryCharacteristics, characteristicKey).base;
  const secondaryCharacteristics = setSecondaryCharacteristicBase(
    session.character.secondaryCharacteristics,
    characteristicKey,
    command.payload.base,
  );
  const base = secondaryCharacteristics[characteristicKey].base;

  if (Object.is(previousBase, base)) {
    return noOpResult("secondary-base-no-op", { characteristicKey }, "already-base");
  }

  return appliedResult(session.character, { secondaryCharacteristics }, {
    operation: "set-secondary-base",
    characteristicKey,
    previousBase,
    base,
  });
}

export function handleSetSecondaryOverrideCommand(context) {
  const { session, command } = validateCommandContext(context, SECONDARY_COMMAND_TYPES.SET_SECONDARY_OVERRIDE);
  validateExactPayloadKeys(command.payload, ["characteristicKey", "override"]);
  const characteristicKey = normalizeSecondaryKey(command.payload.characteristicKey);
  const previousOverride = findSecondaryCharacteristic(session.character.secondaryCharacteristics, characteristicKey).override;
  const secondaryCharacteristics = setSecondaryCharacteristicOverride(
    session.character.secondaryCharacteristics,
    characteristicKey,
    command.payload.override,
  );
  const override = secondaryCharacteristics[characteristicKey].override;

  if (Object.is(previousOverride, override)) {
    return noOpResult("secondary-override-no-op", { characteristicKey }, "already-override");
  }

  return appliedResult(session.character, { secondaryCharacteristics }, {
    operation: "set-secondary-override",
    characteristicKey,
    previousOverride,
    override,
  });
}

export function handleClearSecondaryOverrideCommand(context) {
  const { session, command } = validateCommandContext(context, SECONDARY_COMMAND_TYPES.CLEAR_SECONDARY_OVERRIDE);
  validateExactPayloadKeys(command.payload, ["characteristicKey"]);
  const characteristicKey = normalizeSecondaryKey(command.payload.characteristicKey);
  const previousOverride = findSecondaryCharacteristic(session.character.secondaryCharacteristics, characteristicKey).override;
  const secondaryCharacteristics = clearSecondaryCharacteristicOverride(
    session.character.secondaryCharacteristics,
    characteristicKey,
  );

  if (previousOverride === null) {
    return noOpResult("secondary-override-clear-no-op", { characteristicKey }, "already-clear");
  }

  return appliedResult(session.character, { secondaryCharacteristics }, {
    operation: "clear-secondary-override",
    characteristicKey,
    previousOverride,
  });
}

export function handleSetPoolMaximumCommand(context) {
  const { session, command } = validateCommandContext(context, SECONDARY_COMMAND_TYPES.SET_POOL_MAXIMUM);
  validateExactPayloadKeys(command.payload, ["poolKey", "maximum"]);
  const poolKey = normalizeStructuralPoolKey(command.payload.poolKey);
  const previousMaximum = readPoolMaximum(session.character, poolKey);
  const pools = setPoolMaximum(session.character.pools, poolKey, command.payload.maximum);
  const maximum = pools[poolKey].maximum;

  if (Object.is(previousMaximum, maximum)) {
    return noOpResult("pool-maximum-no-op", { poolKey }, "already-maximum");
  }

  return appliedResult(session.character, { pools }, {
    operation: "set-pool-maximum",
    poolKey,
    previousMaximum,
    maximum,
  });
}

function appliedResult(character, updates, receipt) {
  const snapshot = serializeCharacter(character);
  return {
    status: "applied",
    character: createCharacter({
      ...snapshot,
      secondaryCharacteristics: updates.secondaryCharacteristics === undefined
        ? snapshot.secondaryCharacteristics
        : serializeSecondaryCharacteristics(updates.secondaryCharacteristics),
      pools: updates.pools === undefined ? snapshot.pools : serializePools(updates.pools),
    }),
    receipt,
    diagnostics: [],
  };
}

function noOpResult(operation, ids, reason) {
  return { status: "no-op", receipt: { operation, ...ids, reason }, diagnostics: [] };
}

function validateCommandContext(context, expectedType) {
  requirePlainObject(context, "Secondary command context");
  requirePlainObject(context.session, "Secondary command session");
  requirePlainObject(context.command, "Secondary command");
  if (context.command.type !== expectedType) {
    throw new Error(`Secondary command type must be ${expectedType}`);
  }
  requirePlainObject(context.command.payload, "Secondary command payload");
  assertCharacterPoolsAreRehydratable(context.session.character);
  return context;
}

function assertCharacterPoolsAreRehydratable(character) {
  requirePlainObject(character, "Secondary command Character");
  requirePlainObject(character.pools, "Secondary command Character pools");

  const unsupportedKeys = Object.keys(character.pools).filter(
    key => !APP_SECONDARY_REHYDRATABLE_POOL_KEYS.includes(key),
  );
  if (unsupportedKeys.length > 0) {
    throw new Error(
      `APP-SECONDARY cannot safely rehydrate unsupported pool keys: ${unsupportedKeys.join(", ")}`,
    );
  }
}

function validateExactPayloadKeys(payload, expectedKeys) {
  const keys = Reflect.ownKeys(payload);
  if (
    keys.length !== expectedKeys.length ||
    keys.some(key => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    throw new Error("Secondary command payload contains unsupported properties");
  }
}

function normalizeSecondaryKey(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Secondary command characteristicKey must be a non-empty string");
  }
  return value;
}

function normalizeStructuralPoolKey(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Secondary command poolKey must be a non-empty string");
  }
  if (!STRUCTURAL_POOL_KEYS.includes(value)) {
    throw new Error(`Unsupported structural pool maximum: ${value}`);
  }
  return value;
}

function readPoolMaximum(character, poolKey) {
  requirePlainObject(character, "Secondary command Character");
  requirePlainObject(character.pools, "Secondary command Character pools");
  const pool = character.pools[poolKey];
  if (!pool || typeof pool !== "object" || Array.isArray(pool)) {
    throw new Error(`Missing pool: ${poolKey}`);
  }
  return pool.maximum;
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
}
