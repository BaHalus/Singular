import {
  serializeCharacter,
  validateCharacter,
} from "../../domain/character/Character.js";
import { validateLibraryAdapterRegistry } from "../../library/LibraryAdapter.js";
import { orchestrateLibraryInstantiation } from "../../library/LibraryInstantiationOrchestrator.js";
import {
  serializeCommandEnvelope,
  validateCommandEnvelope,
} from "../commands/CommandEnvelope.js";
import { validateApplicationSession } from "../session/ApplicationSession.js";

export const LIBRARY_INSTANTIATION_COMMAND_TYPE = "library.instantiate";

export function createLibraryInstantiationCommandHandler(input = {}) {
  requirePlainObject(input, "Library instantiation command handler options");
  validateLibraryAdapterRegistry(input.adapterRegistry);

  if (typeof input.applyInstantiation !== "function") {
    throw new Error("Library instantiation command applyInstantiation must be a function");
  }

  const adapterRegistry = input.adapterRegistry;
  const applyInstantiation = input.applyInstantiation;

  return Object.freeze(function handleLibraryInstantiationCommand(handlerInput) {
    requirePlainObject(handlerInput, "Library instantiation command handler input");
    validateApplicationSession(handlerInput.session);
    validateCommandEnvelope(handlerInput.command);

    const { session, command } = handlerInput;
    if (command.type !== LIBRARY_INSTANTIATION_COMMAND_TYPE) {
      throw new Error(
        `Library instantiation command type must be ${LIBRARY_INSTANTIATION_COMMAND_TYPE}`,
      );
    }

    const payload = normalizeCommandPayload(command.payload);
    const orchestration = orchestrateLibraryInstantiation({
      adapterRegistry,
      definitions: payload.definitions,
      rootDefinitionIds: payload.rootDefinitionIds,
      context: {
        request: payload.context,
        applicationSession: {
          id: session.id,
          revision: session.revision,
          character: serializeCharacter(session.character),
        },
      },
    });

    if (orchestration.status === "blocked") {
      return deepFreeze({
        status: "no-op",
        receipt: createReceipt(orchestration, null, "blocked"),
        diagnostics: cloneDiagnostics(orchestration.diagnostics),
      });
    }

    const applicationResult = normalizeApplicationResult(
      applyInstantiation({
        character: session.character,
        orchestration,
        command: serializeCommandEnvelope(command),
      }),
    );
    const diagnostics = [
      ...cloneDiagnostics(orchestration.diagnostics),
      ...applicationResult.diagnostics,
    ];
    const receipt = createReceipt(
      orchestration,
      applicationResult.receipt,
      applicationResult.status,
    );

    if (applicationResult.status === "no-op") {
      return deepFreeze({
        status: "no-op",
        receipt,
        diagnostics,
      });
    }

    return deepFreeze({
      status: "applied",
      character: applicationResult.character,
      receipt,
      diagnostics,
    });
  });
}

function normalizeCommandPayload(payload) {
  requirePlainObject(payload, "Library instantiation command payload");

  if (!Array.isArray(payload.definitions)) {
    throw new Error("Library instantiation command definitions must be an array");
  }
  if (!Array.isArray(payload.rootDefinitionIds)) {
    throw new Error("Library instantiation command roots must be an array");
  }

  const context = payload.context ?? {};
  requirePlainObject(context, "Library instantiation command context");

  return {
    definitions: clonePortableValue(
      payload.definitions,
      "Library instantiation command definitions",
    ),
    rootDefinitionIds: clonePortableValue(
      payload.rootDefinitionIds,
      "Library instantiation command roots",
    ),
    context: clonePortableValue(context, "Library instantiation command context"),
  };
}

function normalizeApplicationResult(result) {
  requirePlainObject(result, "Library instantiation application result");

  if (!["applied", "no-op"].includes(result.status)) {
    throw new Error(
      "Library instantiation application result status must be applied or no-op",
    );
  }

  const receipt = cloneOptionalRecord(
    result.receipt,
    "Library instantiation application receipt",
  );
  const diagnostics = cloneDiagnostics(result.diagnostics ?? []);

  if (result.status === "no-op") {
    if (result.character !== undefined && result.character !== null) {
      throw new Error(
        "No-op Library instantiation application result cannot return character",
      );
    }
    return {
      status: "no-op",
      character: null,
      receipt,
      diagnostics,
    };
  }

  if (!result.character) {
    throw new Error(
      "Applied Library instantiation application result must return character",
    );
  }
  validateCharacter(result.character);

  return {
    status: "applied",
    character: result.character,
    receipt,
    diagnostics,
  };
}

function createReceipt(orchestration, applicationReceipt, status) {
  return deepFreeze({
    schemaVersion: 1,
    kind: "library-instantiation",
    status,
    rootDefinitionIds: clonePortableValue(
      orchestration.rootDefinitionIds,
      "Library instantiation receipt roots",
    ),
    planId: orchestration.plan?.id ?? null,
    orchestration: clonePortableValue(
      orchestration,
      "Library instantiation orchestration receipt",
    ),
    application: clonePortableValue(
      applicationReceipt,
      "Library instantiation application receipt",
    ),
  });
}

function cloneOptionalRecord(value, label) {
  if (value === undefined || value === null) return null;
  requirePlainObject(value, label);
  return clonePortableValue(value, label);
}

function cloneDiagnostics(value) {
  if (!Array.isArray(value)) {
    throw new Error("Library instantiation diagnostics must be an array");
  }

  return value.map((diagnostic, index) => {
    requirePlainObject(
      diagnostic,
      `Library instantiation diagnostic[${index}]`,
    );
    return clonePortableValue(
      diagnostic,
      `Library instantiation diagnostic[${index}]`,
    );
  });
}

function requirePlainObject(value, label) {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be a plain object`);
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function clonePortableValue(value, label, seen = new WeakMap()) {
  if (value === undefined || value === null) return value ?? null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${label} must contain only finite numbers`);
    }
    return value;
  }
  if (typeof value !== "object") {
    throw new Error(`${label} must contain only portable JSON values`);
  }
  if (seen.has(value)) {
    throw new Error(`${label} must not contain cycles`);
  }
  if (Array.isArray(value)) {
    const clone = [];
    seen.set(value, clone);
    value.forEach((item, index) => {
      clone.push(clonePortableValue(item, `${label}[${index}]`, seen));
    });
    seen.delete(value);
    return clone;
  }
  requirePlainObject(value, label);
  const clone = {};
  seen.set(value, clone);
  for (const [key, item] of Object.entries(value)) {
    clone[key] = clonePortableValue(item, `${label}.${key}`, seen);
  }
  seen.delete(value);
  return clone;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
