import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import {
  setCharacterSummary,
} from "../../domain/character/CharacterSummaryOperations.js";

export const CHARACTER_SUMMARY_COMMAND_TYPES = Object.freeze({
  SET: "character.summary.set",
});

export function createCharacterSummaryCommandHandlerEntries() {
  return Object.freeze([
    Object.freeze({
      type: CHARACTER_SUMMARY_COMMAND_TYPES.SET,
      handler: handleSetCharacterSummaryCommand,
    }),
  ]);
}

export function handleSetCharacterSummaryCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    CHARACTER_SUMMARY_COMMAND_TYPES.SET,
  );
  validateExactPayloadKeys(command.payload, ["name", "concept"]);

  const previous = session.character.identity;
  const next = setCharacterSummary(previous, command.payload);

  if (
    next.name === previous.name &&
    next.concept === (previous.concept ?? "")
  ) {
    return {
      status: "no-op",
      receipt: {
        operation: "character-summary-no-op",
        reason: "already-current",
      },
      diagnostics: [],
    };
  }

  const snapshot = serializeCharacter(session.character);
  return {
    status: "applied",
    character: createCharacter({
      ...snapshot,
      identity: next,
    }),
    receipt: {
      operation: "set-character-summary",
      previousName: previous.name,
      name: next.name,
      previousConcept: previous.concept ?? "",
      concept: next.concept,
    },
    diagnostics: [],
  };
}

function validateCommandContext(context, expectedType) {
  requirePlainObject(context, "Character summary command context");
  requirePlainObject(context.session, "Character summary command session");
  requirePlainObject(context.command, "Character summary command");
  if (context.command.type !== expectedType) {
    throw new Error(`Character summary command type must be ${expectedType}`);
  }
  requirePlainObject(context.command.payload, "Character summary command payload");
  return context;
}

function validateExactPayloadKeys(payload, expectedKeys) {
  const keys = Reflect.ownKeys(payload);
  if (
    keys.length !== expectedKeys.length ||
    keys.some(key => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    throw new Error("Character summary command payload contains unsupported properties");
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
