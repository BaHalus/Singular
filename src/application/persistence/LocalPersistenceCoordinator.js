import {
  serializeApplicationSession,
  validateApplicationSession,
} from "../session/ApplicationSession.js";
import {
  validateCharacterRepository,
  validateSessionRepository,
} from "../ports/RepositoryPorts.js";

const RESULT_SEVERITIES = Object.freeze(["info", "warning", "blocking"]);

/**
 * Orquestra os casos de uso mínimos de persistência local sem conhecer
 * localStorage, DOM ou detalhes do formato persistido.
 */
export function createLocalPersistenceCoordinator(options = {}) {
  requirePlainObject(options, "Local persistence coordinator options");
  validateApplicationSession(options.initialSession);
  validateCharacterRepository(options.characterRepository);
  validateSessionRepository(options.sessionRepository);
  requireFunction(
    options.sessionRepository.loadLastSession,
    "Session repository loadLastSession",
  );
  requireFunction(options.inspectPersistence, "Persistence inspector");
  requireFunction(options.createCharacterExport, "Character export creator");
  requireFunction(options.parseCharacterExport, "Character export parser");
  requireFunction(options.createImportedSession, "Imported session factory");

  const characterRepository = options.characterRepository;
  const sessionRepository = options.sessionRepository;
  const inspectPersistence = options.inspectPersistence;
  const createCharacterExport = options.createCharacterExport;
  const parseCharacterExport = options.parseCharacterExport;
  const createImportedSession = options.createImportedSession;

  let activeSession = options.initialSession;

  const coordinator = {
    getActiveSession() {
      return activeSession;
    },

    getRepositories() {
      return Object.freeze({ characterRepository, sessionRepository });
    },

    async initialize() {
      const previousSession = activeSession;
      try {
        const restored = await sessionRepository.loadLastSession();
        const inspection = safeInspection(inspectPersistence);

        if (restored === null) {
          return freezeResult({
            status: "started",
            changed: false,
            activeSessionId: activeSession.id,
            diagnostics: inspection.diagnostics,
            data: {
              restoredSessionId: null,
              inspection: inspection.value,
            },
          });
        }

        validateApplicationSession(restored);
        activeSession = restored;
        return freezeResult({
          status: "restored",
          changed: true,
          activeSessionId: activeSession.id,
          diagnostics: inspection.diagnostics,
          data: {
            restoredSessionId: activeSession.id,
            inspection: inspection.value,
          },
        });
      } catch (error) {
        activeSession = previousSession;
        const inspection = safeInspection(inspectPersistence);
        return freezeResult({
          status: "failed",
          changed: false,
          activeSessionId: activeSession.id,
          diagnostics: [
            diagnostic(
              "local-persistence-restore-failed",
              errorMessage(error),
            ),
            ...inspection.diagnostics,
          ],
          data: {
            restoredSessionId: null,
            inspection: inspection.value,
          },
        });
      }
    },

    async saveActiveSession() {
      const sessionBeforeSave = activeSession;
      try {
        const saved = await sessionRepository.save(sessionBeforeSave);
        validateApplicationSession(saved);
        assertSameSessionSnapshot(
          sessionBeforeSave,
          saved,
          "Saved ApplicationSession snapshot",
        );
        return freezeResult({
          status: "saved",
          changed: false,
          activeSessionId: activeSession.id,
          diagnostics: [],
          data: { savedSessionId: activeSession.id },
        });
      } catch (error) {
        activeSession = sessionBeforeSave;
        return freezeResult({
          status: "failed",
          changed: false,
          activeSessionId: activeSession.id,
          diagnostics: [diagnostic(
            "local-persistence-save-failed",
            errorMessage(error),
          )],
          data: { savedSessionId: null },
        });
      }
    },

    async listSavedSessions() {
      try {
        const ids = normalizeIdList(await sessionRepository.listIds());
        const entries = [];
        const diagnostics = [];

        for (const id of ids) {
          try {
            const session = await sessionRepository.load(id);
            if (session === null) {
              entries.push(unreadableEntry(id));
              diagnostics.push(diagnostic(
                "local-persistence-session-unreadable",
                `Saved session cannot be loaded: ${id}`,
              ));
              continue;
            }
            validateApplicationSession(session);
            entries.push(Object.freeze({
              id: session.id,
              status: "available",
              revision: session.revision,
              characterId: session.character.identity.id,
              characterName: session.character.identity.name,
            }));
          } catch (error) {
            entries.push(unreadableEntry(id));
            diagnostics.push(diagnostic(
              "local-persistence-session-unreadable",
              `Saved session cannot be loaded: ${id}. ${errorMessage(error)}`,
            ));
          }
        }

        const inspection = safeInspection(inspectPersistence);
        return freezeResult({
          status: "listed",
          changed: false,
          activeSessionId: activeSession.id,
          diagnostics: [...diagnostics, ...inspection.diagnostics],
          data: {
            sessions: entries,
            inspection: inspection.value,
          },
        });
      } catch (error) {
        const inspection = safeInspection(inspectPersistence);
        return freezeResult({
          status: "failed",
          changed: false,
          activeSessionId: activeSession.id,
          diagnostics: [
            diagnostic("local-persistence-list-failed", errorMessage(error)),
            ...inspection.diagnostics,
          ],
          data: { sessions: [], inspection: inspection.value },
        });
      }
    },

    async openSession(id) {
      const normalizedId = normalizeId(id, "Saved session id");
      const previousSession = activeSession;
      try {
        const loaded = await sessionRepository.load(normalizedId);
        if (loaded === null) {
          const inspection = safeInspection(inspectPersistence);
          return freezeResult({
            status: "rejected",
            changed: false,
            activeSessionId: activeSession.id,
            diagnostics: [
              diagnostic(
                "local-persistence-session-unavailable",
                `Saved session is missing or unreadable: ${normalizedId}`,
              ),
              ...inspection.diagnostics,
            ],
            data: { openedSessionId: null },
          });
        }

        validateApplicationSession(loaded);
        activeSession = loaded;
        return freezeResult({
          status: "opened",
          changed: true,
          activeSessionId: activeSession.id,
          diagnostics: [],
          data: { openedSessionId: activeSession.id },
        });
      } catch (error) {
        activeSession = previousSession;
        const inspection = safeInspection(inspectPersistence);
        return freezeResult({
          status: "failed",
          changed: false,
          activeSessionId: activeSession.id,
          diagnostics: [
            diagnostic("local-persistence-open-failed", errorMessage(error)),
            ...inspection.diagnostics,
          ],
          data: { openedSessionId: null },
        });
      }
    },

    async removeSession(id) {
      const normalizedId = normalizeId(id, "Saved session id");
      try {
        const removed = await sessionRepository.remove(normalizedId);
        return freezeResult({
          status: removed ? "removed" : "missing",
          changed: false,
          activeSessionId: activeSession.id,
          diagnostics: [],
          data: { removedSessionId: removed ? normalizedId : null },
        });
      } catch (error) {
        return freezeResult({
          status: "failed",
          changed: false,
          activeSessionId: activeSession.id,
          diagnostics: [diagnostic(
            "local-persistence-remove-failed",
            errorMessage(error),
          )],
          data: { removedSessionId: null },
        });
      }
    },

    exportActiveCharacter() {
      try {
        const document = createCharacterExport(activeSession.character);
        const json = JSON.stringify(document, null, 2);
        return freezeResult({
          status: "exported",
          changed: false,
          activeSessionId: activeSession.id,
          diagnostics: [],
          data: {
            filename: `${safeFilename(activeSession.character.identity.name)}.singular.json`,
            document,
            json,
          },
        });
      } catch (error) {
        return freezeResult({
          status: "failed",
          changed: false,
          activeSessionId: activeSession.id,
          diagnostics: [diagnostic(
            "singular-character-export-failed",
            errorMessage(error),
          )],
          data: { filename: null, document: null, json: null },
        });
      }
    },

    importCharacter(input) {
      const previousSession = activeSession;
      try {
        const parsed = parseCharacterExport(input);
        validateImportResult(parsed);
        if (parsed.status !== "accepted") {
          return freezeResult({
            status: "rejected",
            changed: false,
            activeSessionId: activeSession.id,
            diagnostics: parsed.diagnostics,
            data: { importedSessionId: null },
          });
        }

        const importedSession = createImportedSession({
          character: parsed.character,
          currentSession: activeSession,
        });
        validateApplicationSession(importedSession);
        activeSession = importedSession;
        return freezeResult({
          status: "imported",
          changed: true,
          activeSessionId: activeSession.id,
          diagnostics: parsed.diagnostics,
          data: { importedSessionId: activeSession.id },
        });
      } catch (error) {
        activeSession = previousSession;
        return freezeResult({
          status: "failed",
          changed: false,
          activeSessionId: activeSession.id,
          diagnostics: [diagnostic(
            "singular-character-import-failed",
            errorMessage(error),
          )],
          data: { importedSessionId: null },
        });
      }
    },

    inspect() {
      const inspection = safeInspection(inspectPersistence);
      return freezeResult({
        status: inspection.failed ? "failed" : "inspected",
        changed: false,
        activeSessionId: activeSession.id,
        diagnostics: inspection.diagnostics,
        data: { inspection: inspection.value },
      });
    },
  };

  return Object.freeze(coordinator);
}

function assertSameSessionSnapshot(expected, actual, label) {
  const expectedSnapshot = serializeApplicationSession(expected);
  const actualSnapshot = serializeApplicationSession(actual);
  if (JSON.stringify(expectedSnapshot) !== JSON.stringify(actualSnapshot)) {
    throw new Error(`${label} does not match the active session`);
  }
}

function safeInspection(inspectPersistence) {
  try {
    const value = inspectPersistence();
    requirePlainObject(value, "Persistence inspection");
    const diagnostics = normalizeDiagnostics(value.diagnostics ?? []);
    return {
      failed: false,
      value: clonePortable(value),
      diagnostics,
    };
  } catch (error) {
    return {
      failed: true,
      value: null,
      diagnostics: [diagnostic(
        "local-persistence-inspection-failed",
        errorMessage(error),
      )],
    };
  }
}

function validateImportResult(result) {
  requirePlainObject(result, "Character import result");
  if (!["accepted", "rejected"].includes(result.status)) {
    throw new Error("Character import result status is invalid");
  }
  normalizeDiagnostics(result.diagnostics);
  if (result.status === "accepted" && !result.character) {
    throw new Error("Accepted Character import must contain a character");
  }
  if (result.status === "rejected" && result.character !== null) {
    throw new Error("Rejected Character import cannot contain a character");
  }
}

function normalizeIdList(value) {
  if (!Array.isArray(value)) {
    throw new Error("Saved session ids must be an array");
  }
  const ids = value.map((id, index) => normalizeId(id, `Saved session id[${index}]`));
  if (new Set(ids).size !== ids.length) {
    throw new Error("Saved session ids must be unique");
  }
  return ids;
}

function unreadableEntry(id) {
  return Object.freeze({
    id,
    status: "unreadable",
    revision: null,
    characterId: null,
    characterName: null,
  });
}

function freezeResult(input) {
  const result = {
    status: normalizeId(input.status, "Persistence result status"),
    changed: Boolean(input.changed),
    activeSessionId: normalizeId(
      input.activeSessionId,
      "Persistence result activeSessionId",
    ),
    diagnostics: normalizeDiagnostics(input.diagnostics ?? []),
    data: clonePortable(input.data ?? {}),
  };
  return deepFreeze(result);
}

function normalizeDiagnostics(value) {
  if (!Array.isArray(value)) {
    throw new Error("Persistence diagnostics must be an array");
  }
  return value.map((item, index) => {
    requirePlainObject(item, `Persistence diagnostic[${index}]`);
    const severity = item.severity ?? "blocking";
    if (!RESULT_SEVERITIES.includes(severity)) {
      throw new Error(`Persistence diagnostic[${index}] severity is invalid`);
    }
    return clonePortable({ ...item, severity });
  });
}

function diagnostic(code, message) {
  return Object.freeze({
    severity: "blocking",
    code: normalizeId(code, "Persistence diagnostic code"),
    message: normalizeId(message, "Persistence diagnostic message"),
  });
}

function safeFilename(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  const safe = normalized
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return safe || "personagem";
}

function normalizeId(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requireFunction(value, label) {
  if (typeof value !== "function") {
    throw new Error(`${label} must be a function`);
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

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function clonePortable(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error("Portable values must contain finite numbers");
    }
    if (["undefined", "function", "symbol", "bigint"].includes(typeof value)) {
      throw new Error("Portable values must contain only JSON values");
    }
    return value;
  }
  if (seen.has(value)) {
    throw new Error("Portable values must not contain cycles");
  }
  if (Array.isArray(value)) {
    const clone = [];
    seen.set(value, clone);
    value.forEach(item => clone.push(clonePortable(item, seen)));
    seen.delete(value);
    return clone;
  }
  requirePlainObject(value, "Portable value");
  const clone = {};
  seen.set(value, clone);
  Object.entries(value).forEach(([key, item]) => {
    clone[key] = clonePortable(item, seen);
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
