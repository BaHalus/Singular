import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import {
  setIdentitySummary,
} from "../../domain/character/IdentityOperations.js";

export const IDENTITY_COMMAND_TYPES = Object.freeze({
  SET_SUMMARY: "identity.summary.set",
});

export function createIdentityCommandHandlerEntries() {
  return Object.freeze([
    Object.freeze({
      type: IDENTITY_COMMAND_TYPES.SET_SUMMARY,
      handler: handleSetIdentitySummaryCommand,
    }),
  ]);
}

export function handleSetIdentitySummaryCommand(context) {
  const { session, command } = validateCommandContext(
    context,
    IDENTITY_COMMAND_TYPES.SET_SUMMARY,
  );
  validateExactPayloadKeys(command.payload, ["name", "concept"]);

  const previousIdentity = session.character.identity;
  const identity = setIdentitySummary(previousIdentity, command.payload);

  if (
    identity.name === previousIdentity.name &&
    identity.concept === (previousIdentity.concept ?? "")
  ) {
    return {
      status: "no-op",
      receipt: {
        operation: "identity-summary-no-op",
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
      identity,
    }),
    receipt: {
      operation: "set-identity-summary",
      previousName: previousIdentity.name,
      name: identity.name,
      previousConcept: previousIdentity.concept ?? "",
      concept: identity.concept,
    },
    diagnostics: [],
  };
}

function validateCommandContext(context, expectedType) {
  requirePlainObject(context, "Identity command context");
  requirePlainObject(context.session, "Identity command session");
  requirePlainObject(context.command, "Identity command");
  if (context.command.type !== expectedType) {
    throw new Error(`Identity command type must be ${expectedType}`);
  }
  requirePlainObject(context.command.payload, "Identity command payload");
  return context;
}

function validateExactPayloadKeys(payload, expectedKeys) {
  const keys = Reflect.ownKeys(payload);
  if (
    keys.length !== expectedKeys.length ||
    keys.some(key => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    throw new Error("Identity command payload contains unsupported properties");
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
