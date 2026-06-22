import {
  restoreCharacterFromHistorySnapshot,
} from "./ApplicationHistory.js";
import {
  generateId,
  readClock,
  validateApplicationRuntime,
} from "../ports/RuntimePorts.js";
import {
  createApplicationSession,
  nextApplicationSessionRevision,
  validateApplicationSession,
} from "../session/ApplicationSession.js";

const OPERATION_STATUSES = ["undone", "redone", "no-op", "rejected", "failed"];

export function undoApplicationSession(session, options = {}, runtime) {
  return executeHistoryOperation("undo", session, options, runtime);
}

export function redoApplicationSession(session, options = {}, runtime) {
  return executeHistoryOperation("redo", session, options, runtime);
}

export function validateApplicationHistoryOperationResult(result) {
  requirePlainObject(result, "Application history operation result");
  if (!OPERATION_STATUSES.includes(result.status)) {
    throw new Error("Application history operation status is invalid");
  }
  validateApplicationSession(result.session);
  if (result.receipt !== null) {
    requirePlainObject(result.receipt, "Application history operation receipt");
  }
  if (!Array.isArray(result.diagnostics)) {
    throw new Error("Application history operation diagnostics must be array");
  }
  result.diagnostics.forEach((item, index) => {
    requirePlainObject(item, `Application history diagnostic[${index}]`);
  });
  if (["rejected", "failed"].includes(result.status) && result.receipt !== null) {
    throw new Error(`${result.status} history operation cannot have receipt`);
  }
  return true;
}

export function getApplicationHistoryOperationStatuses() {
  return [...OPERATION_STATUSES];
}

function executeHistoryOperation(type, session, options, runtime) {
  validateApplicationSession(session);
  requirePlainObject(options, "Application history operation options");
  validateApplicationRuntime(runtime);

  const expectedRevision = normalizeExpectedRevision(
    options.expectedRevision ?? session.revision,
  );
  if (expectedRevision !== session.revision) {
    return createResult({
      status: "rejected",
      session,
      receipt: null,
      diagnostics: [{
        code: "application-history-stale-revision",
        severity: "blocked",
        expectedRevision,
        actualRevision: session.revision,
        operationType: type,
      }],
    });
  }

  const source = type === "undo" ? session.history : session.future;
  try {
    if (source.length === 0) {
      return createResult({
        status: "no-op",
        session,
        receipt: createNoOpReceipt(type, session, runtime),
        diagnostics: [{
          code: `application-history-${type}-empty`,
          severity: "info",
        }],
      });
    }

    const entry = source.at(-1);
    const revision = nextApplicationSessionRevision(session);
    const processedAt = readClock(runtime.clock);
    const operationId = generateId(runtime.idGenerator, type);
    const receipt = createAppliedReceipt(
      type,
      session,
      entry,
      revision,
      processedAt,
      operationId,
    );
    const undo = type === "undo";
    const nextSession = createApplicationSession({
      id: session.id,
      revision,
      character: restoreCharacterFromHistorySnapshot(
        undo ? entry.beforeCharacter : entry.afterCharacter,
      ),
      history: undo
        ? session.history.slice(0, -1)
        : [...session.history, entry],
      future: undo
        ? [...session.future, entry]
        : session.future.slice(0, -1),
      dirty: true,
      lastReceipt: receipt,
      metadata: session.metadata,
    });

    return createResult({
      status: undo ? "undone" : "redone",
      session: nextSession,
      receipt,
      diagnostics: [],
    });
  } catch (error) {
    return createResult({
      status: "failed",
      session,
      receipt: null,
      diagnostics: [{
        code: `application-history-${type}-failed`,
        severity: "blocked",
        message: error instanceof Error ? error.message : String(error),
      }],
    });
  }
}

function createAppliedReceipt(
  type,
  session,
  entry,
  revision,
  processedAt,
  operationId,
) {
  return deepFreeze({
    operationId,
    operationType: type,
    status: type === "undo" ? "undone" : "redone",
    processedAt,
    transitionId: entry.id,
    commandId: entry.commandId,
    commandType: entry.commandType,
    previousRevision: session.revision,
    revision,
    restoredFingerprint: type === "undo"
      ? entry.beforeFingerprint
      : entry.afterFingerprint,
  });
}

function createNoOpReceipt(type, session, runtime) {
  return deepFreeze({
    operationId: generateId(runtime.idGenerator, type),
    operationType: type,
    status: "no-op",
    processedAt: readClock(runtime.clock),
    transitionId: null,
    commandId: null,
    commandType: null,
    previousRevision: session.revision,
    revision: session.revision,
    restoredFingerprint: null,
  });
}

function createResult(input) {
  const result = {
    status: input.status,
    session: input.session,
    receipt: clonePlainValue(input.receipt),
    diagnostics: clonePlainValue(input.diagnostics),
  };
  validateApplicationHistoryOperationResult(result);
  return deepFreeze(result);
}

function normalizeExpectedRevision(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      "Application history expectedRevision must be a non-negative safe integer",
    );
  }
  return value;
}

function clonePlainValue(value) {
  if (Array.isArray(value)) return value.map(clonePlainValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clonePlainValue(item)]),
    );
  }
  return value;
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} must be plain object`);
  }
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
