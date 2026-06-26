import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import {
  adjustAttributeBase,
} from "../../domain/character/AttributesOperations.js";

export const ATTRIBUTE_COMMAND_TYPES = Object.freeze({
  ADJUST_BASE: "attribute.base.adjust",
});

export function createAttributeCommandHandlerEntries() {
  return Object.freeze([
    Object.freeze({
      type: ATTRIBUTE_COMMAND_TYPES.ADJUST_BASE,
      handler: handleAdjustAttributeBaseCommand,
    }),
  ]);
}

export function handleAdjustAttributeBaseCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    ATTRIBUTE_COMMAND_TYPES.ADJUST_BASE,
  );
  validateExactPayloadKeys(command.payload, ["attributeKey", "delta"]);

  const attributeKey = command.payload.attributeKey;
  const previousBase = session.character.attributes?.[attributeKey]?.base;
  const attributes = adjustAttributeBase(
    session.character.attributes,
    attributeKey,
    command.payload.delta,
  );
  const base = attributes[attributeKey].base;

  if (Object.is(previousBase, base)) {
    return {
      status: "no-op",
      receipt: {
        operation: "attribute-base-no-op",
        attributeKey,
        reason: "zero-adjustment",
      },
      diagnostics: [],
    };
  }

  const snapshot = serializeCharacter(session.character);
  return {
    status: "applied",
    character: createCharacter({
      ...snapshot,
      attributes,
    }),
    receipt: {
      operation: "adjust-attribute-base",
      attributeKey,
      previousBase,
      delta: command.payload.delta,
      base,
    },
    diagnostics: [],
  };
}

function validateCommandContext(context, expectedType) {
  requirePlainObject(context, "Attribute command context");
  requirePlainObject(context.session, "Attribute command session");
  requirePlainObject(context.command, "Attribute command");
  if (context.command.type !== expectedType) {
    throw new Error(`Attribute command type must be ${expectedType}`);
  }
  requirePlainObject(context.command.payload, "Attribute command payload");
  return context;
}

function validateExactPayloadKeys(payload, expectedKeys) {
  const keys = Reflect.ownKeys(payload);
  if (
    keys.length !== expectedKeys.length ||
    keys.some(key => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    throw new Error("Attribute command payload contains unsupported properties");
  }
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
