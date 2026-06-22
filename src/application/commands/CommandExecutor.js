import { validateCharacter } from "../../domain/character/Character.js";
import {
  createApplicationHistoryEntry,
} from "../history/ApplicationHistory.js";
import {
  createApplicationSession,
  nextApplicationSessionRevision,
  validateApplicationSession,
} from "../session/ApplicationSession.js";
import { createCommandEnvelope } from "./CommandEnvelope.js";
import {
  resolveCommandHandler,
  validateCommandRegistry,
} from "./CommandRegistry.js";

const EXECUTION_STATUSES = ["applied", "no-op", "rejected", "failed"];

export function executeCommand(session, commandInput, registry) {
  validateApplicationSession(session);
  validateCommandRegistry(registry);

  let command;
  try {
    command = createCommandEnvelope(commandInput);
  } catch (error) {
    return createExecutionResult({
      status: "rejected",
      session,
      receipt: null,
      diagnostics: [diagnostic(
        "application-command-invalid",
        errorMessage(error),
      )],
    });
  }

  if (command.expectedRevision !== session.revision) {
    return createExecutionResult({
      status: "rejected",
      session,
      receipt: null,
      diagnostics: [{
        code: "application-command-stale-revision",
        severity: "blocked",
        expectedRevision: command.expectedRevision,
        actualRevision: session.revision,
      }],
    });
  }

  const handler = resolveCommandHandler(registry, command.type);
  if (handler === null) {
    return createExecutionResult({
      status: "rejected",
      session,
      receipt: null,
      diagnostics: [{
        code: "application-command-handler-missing",
        severity: "blocked",
        commandType: command.type,
      }],
    });
  }

  try {
    const handlerResult = normalizeHandlerResult(handler({ session, command }));
    const processedAt = new Date().toISOString();

    if (handlerResult.status === "no-op") {
      const receipt = createReceipt(
        command,
        session,
        handlerResult,
        processedAt,
        session.revision,
      );
      return createExecutionResult({
        status: "no-op",
        session,
        receipt,
        diagnostics: handlerResult.diagnostics,
      });
    }

    const nextRevision = nextApplicationSessionRevision(session);
    const receipt = createReceipt(
      command,
      session,
      handlerResult,
      processedAt,
      nextRevision,
    );
    const historyEntry = createApplicationHistoryEntry({
      id: `${session.id}:transition:${nextRevision}:${command.id}`,
      commandId: command.id,
      commandType: command.type,
      issuedAt: command.issuedAt,
      appliedAt: processedAt,
      beforeRevision: session.revision,
      afterRevision: nextRevision,
      beforeCharacter: session.character,
      afterCharacter: handlerResult.character,
      commandPayload: command.payload,
      receipt,
    });
    const nextSession = createApplicationSession({
      id: session.id,
      revision: nextRevision,
      character: handlerResult.character,
      history: [...session.history, historyEntry],
      future: [],
      dirty: true,
      lastReceipt: receipt,
      metadata: session.metadata,
    });

    return createExecutionResult({
      status: "applied",
      session: nextSession,
      receipt,
      diagnostics: handlerResult.diagnostics,
    });
  } catch (error) {
    return createExecutionResult({
      status: "failed",
      session,
      receipt: null,
      diagnostics: [diagnostic(
        "application-command-execution-failed",
        errorMessage(error),
      )],
    });
  }
}

export function validateCommandExecutionResult(result) {
  requirePlainObject(result, "Command execution result");
  if (!EXECUTION_STATUSES.includes(result.status)) {
    throw new Error("Command execution result status is invalid");
  }
  validateApplicationSession(result.session);
  if (result.receipt !== null) {
    requirePlainObject(result.receipt, "Command execution receipt");
  }
  validateDiagnostics(result.diagnostics);
  if (["rejected", "failed"].includes(result.status) && result.receipt !== null) {
    throw new Error(`${result.status} command execution cannot have receipt`);
  }
  return true;
}

export function getCommandExecutionStatuses() {
  return [...EXECUTION_STATUSES];
}

function normalizeHandlerResult(value) {
  requirePlainObject(value, "Command handler result");
  if (!["applied", "no-op"].includes(value.status)) {
    throw new Error("Command handler result status must be applied or no-op");
  }

  const diagnostics = cloneDiagnostics(value.diagnostics ?? []);
  const domainReceipt = cloneOptionalRecord(
    value.receipt,
    "Command handler receipt",
  );

  if (value.status === "no-op") {
    if (value.character !== undefined && value.character !== null) {
      throw new Error("No-op command handler cannot return character");
    }
    return {
      status: "no-op",
      character: null,
      receipt: domainReceipt,
      diagnostics,
    };
  }

  if (!value.character) {
    throw new Error("Applied command handler must return character");
  }
  validateCharacter(value.character);
  return {
    status: "applied",
    character: value.character,
    receipt: domainReceipt,
    diagnostics,
  };
}

function createReceipt(
  command,
  session,
  handlerResult,
  processedAt,
  nextRevision,
) {
  return deepFreeze({
    commandId: command.id,
    commandType: command.type,
    issuedAt: command.issuedAt,
    processedAt,
    status: handlerResult.status,
    previousRevision: session.revision,
    revision: nextRevision,
    domainReceipt: cloneApplicationValue(handlerResult.receipt),
  });
}

function createExecutionResult(input) {
  const result = {
    status: input.status,
    session: input.session,
    receipt: cloneApplicationValue(input.receipt),
    diagnostics: cloneDiagnostics(input.diagnostics),
  };
  validateCommandExecutionResult(result);
  return deepFreeze(result);
}

function diagnostic(code, message) {
  return { code, severity: "blocked", message };
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function cloneOptionalRecord(value, label) {
  if (value === undefined || value === null) return null;
  requirePlainObject(value, label);
  return cloneApplicationValue(value);
}

function cloneDiagnostics(value) {
  validateDiagnostics(value);
  return value.map(item => cloneApplicationValue(item));
}

function validateDiagnostics(value) {
  if (!Array.isArray(value)) {
    throw new Error("Command execution diagnostics must be an array");
  }
  value.forEach((item, index) => {
    requirePlainObject(item, `Command execution diagnostic[${index}]`);
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

function cloneApplicationValue(value, seen = new WeakMap()) {
  if (value === undefined || value === null || typeof value !== "object") {
    return value ?? null;
  }
  if (seen.has(value)) {
    throw new Error("Command execution values must not contain cycles");
  }
  if (Array.isArray(value)) {
    const clone = [];
    seen.set(value, clone);
    value.forEach(item => clone.push(cloneApplicationValue(item, seen)));
    seen.delete(value);
    return clone;
  }
  requirePlainObject(value, "Command execution value");
  const clone = {};
  seen.set(value, clone);
  Object.entries(value).forEach(([key, item]) => {
    clone[key] = cloneApplicationValue(item, seen);
  });
  seen.delete(value);
  return clone;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
