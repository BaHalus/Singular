import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import {
  adjustPoolCurrent,
  resetPoolCurrentToMaximum,
  setPoolCurrent,
} from "../../domain/character/PoolsOperations.js";

export const POOL_COMMAND_TYPES = Object.freeze({
  SET_CURRENT: "pool.current.set",
  ADJUST_CURRENT: "pool.current.adjust",
  RESET_CURRENT_TO_MAXIMUM: "pool.current.reset-to-maximum",
});

const APP_POOL_SUPPORTED_KEYS = Object.freeze([
  "HP",
  "FP",
  "EnergyReserve",
]);

export function createPoolCommandHandlerEntries() {
  return Object.freeze([
    Object.freeze({
      type: POOL_COMMAND_TYPES.SET_CURRENT,
      handler: handleSetPoolCurrentCommand,
    }),
    Object.freeze({
      type: POOL_COMMAND_TYPES.ADJUST_CURRENT,
      handler: handleAdjustPoolCurrentCommand,
    }),
    Object.freeze({
      type: POOL_COMMAND_TYPES.RESET_CURRENT_TO_MAXIMUM,
      handler: handleResetPoolCurrentToMaximumCommand,
    }),
  ]);
}

export function handleSetPoolCurrentCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    POOL_COMMAND_TYPES.SET_CURRENT,
  );
  validateExactPayloadKeys(command.payload, ["poolKey", "current"]);
  const poolKey = normalizePoolKey(command.payload.poolKey);
  const previousCurrent = readPoolCurrent(session.character, poolKey);
  const nextPools = setPoolCurrent(
    session.character.pools,
    poolKey,
    command.payload.current,
  );
  const current = nextPools[poolKey].current;

  if (Object.is(previousCurrent, current)) {
    return noOpReceipt(poolKey, "already-current");
  }

  return appliedResult(session.character, nextPools, {
    operation: "set-current",
    poolKey,
    previousCurrent,
    current,
  });
}

export function handleAdjustPoolCurrentCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    POOL_COMMAND_TYPES.ADJUST_CURRENT,
  );
  validateExactPayloadKeys(command.payload, ["poolKey", "delta"]);
  const poolKey = normalizePoolKey(command.payload.poolKey);
  const previousCurrent = readPoolCurrent(session.character, poolKey);
  const nextPools = adjustPoolCurrent(
    session.character.pools,
    poolKey,
    command.payload.delta,
  );
  const current = nextPools[poolKey].current;

  if (Object.is(previousCurrent, current)) {
    return noOpReceipt(poolKey, "zero-adjustment");
  }

  return appliedResult(session.character, nextPools, {
    operation: "adjust-current",
    poolKey,
    previousCurrent,
    delta: command.payload.delta,
    current,
  });
}

export function handleResetPoolCurrentToMaximumCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    POOL_COMMAND_TYPES.RESET_CURRENT_TO_MAXIMUM,
  );
  validateExactPayloadKeys(command.payload, ["poolKey"]);
  const poolKey = normalizePoolKey(command.payload.poolKey);
  const previousCurrent = readPoolCurrent(session.character, poolKey);
  const nextPools = resetPoolCurrentToMaximum(
    session.character.pools,
    poolKey,
  );
  const current = nextPools[poolKey].current;

  if (Object.is(previousCurrent, current)) {
    return noOpReceipt(poolKey, "already-at-maximum");
  }

  return appliedResult(session.character, nextPools, {
    operation: "reset-current-to-maximum",
    poolKey,
    previousCurrent,
    current,
    maximum: nextPools[poolKey].maximum,
  });
}

function appliedResult(character, pools, receipt) {
  const snapshot = serializeCharacter(character);
  return {
    status: "applied",
    character: createCharacter({
      ...snapshot,
      pools,
    }),
    receipt,
    diagnostics: [],
  };
}

function noOpReceipt(poolKey, reason) {
  return {
    status: "no-op",
    receipt: {
      operation: "pool-current-no-op",
      poolKey,
      reason,
    },
    diagnostics: [],
  };
}

function validateCommandContext(context, expectedType) {
  requirePlainObject(context, "Pool command context");
  requirePlainObject(context.session, "Pool command session");
  requirePlainObject(context.command, "Pool command");

  if (context.command.type !== expectedType) {
    throw new Error(`Pool command type must be ${expectedType}`);
  }
  requirePlainObject(context.command.payload, "Pool command payload");
  assertCharacterPoolsAreRehydratable(context.session.character);

  return context;
}

function assertCharacterPoolsAreRehydratable(character) {
  requirePlainObject(character, "Pool command Character");
  requirePlainObject(character.pools, "Pool command Character pools");

  const unsupportedKeys = Object.keys(character.pools).filter(
    key => !APP_POOL_SUPPORTED_KEYS.includes(key),
  );
  if (unsupportedKeys.length > 0) {
    throw new Error(
      `APP-POOL cannot safely rehydrate unsupported pool keys: ${unsupportedKeys.join(", ")}`,
    );
  }
}

function validateExactPayloadKeys(payload, expectedKeys) {
  const keys = Reflect.ownKeys(payload);
  if (
    keys.length !== expectedKeys.length ||
    keys.some(key => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    throw new Error("Pool command payload contains unsupported properties");
  }
}

function normalizePoolKey(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Pool command poolKey must be a non-empty string");
  }
  return value;
}

function readPoolCurrent(character, poolKey) {
  requirePlainObject(character, "Pool command Character");
  requirePlainObject(character.pools, "Pool command Character pools");
  const pool = character.pools[poolKey];
  if (!pool || typeof pool !== "object" || Array.isArray(pool)) {
    throw new Error(`Missing pool: ${poolKey}`);
  }
  return pool.current;
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
