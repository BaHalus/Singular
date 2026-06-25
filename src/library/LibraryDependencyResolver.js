import {
  validateLibraryRegistry,
} from "./LibraryRegistry.js";

const ANALYSIS_STATUSES = [
  "ready",
  "ready-with-warnings",
  "blocked",
];

export function analyzeLibraryDependencies(
  registry,
  rootDefinitionIds = null,
) {
  validateLibraryRegistry(registry);
  const roots = normalizeRootDefinitionIds(rootDefinitionIds, registry);
  const definitionsById = new Map(
    registry.definitions.map(definition => [definition.id, definition]),
  );
  const stateById = new Map();
  const traversalPath = [];
  const resolvedDefinitionIds = [];
  const missingRequired = [];
  const missingOptional = [];
  const cycles = [];
  const diagnostics = [];
  const diagnosticKeys = new Set();

  function addDiagnostic(diagnostic) {
    const key = stableStringify(diagnostic);
    if (diagnosticKeys.has(key)) return;
    diagnosticKeys.add(key);
    diagnostics.push(diagnostic);
  }

  function recordMissing(definitionId, dependency) {
    const entry = {
      definitionId,
      dependencyId: dependency.libraryItemId,
      versionRange: dependency.versionRange,
    };

    if (dependency.required) {
      if (!containsMissing(missingRequired, entry)) {
        missingRequired.push(entry);
      }
      addDiagnostic({
        code: "library-required-dependency-missing",
        severity: "blocked",
        ...entry,
      });
      return;
    }

    if (!containsMissing(missingOptional, entry)) {
      missingOptional.push(entry);
    }
    addDiagnostic({
      code: "library-optional-dependency-missing",
      severity: "warning",
      ...entry,
    });
  }

  function visit(definitionId) {
    const state = stateById.get(definitionId) ?? "unvisited";

    if (state === "visited") return;
    if (state === "visiting") {
      const cycleStart = traversalPath.indexOf(definitionId);
      const cycle = [
        ...traversalPath.slice(cycleStart),
        definitionId,
      ];
      const cycleKey = cycle.join("\u0000");
      if (!cycles.some(existing => existing.join("\u0000") === cycleKey)) {
        cycles.push(cycle);
        addDiagnostic({
          code: "library-dependency-cycle",
          severity: "blocked",
          cycle,
        });
      }
      return;
    }

    const definition = definitionsById.get(definitionId) ?? null;
    if (definition === null) {
      const entry = {
        definitionId: null,
        dependencyId: definitionId,
        versionRange: null,
      };
      if (!containsMissing(missingRequired, entry)) {
        missingRequired.push(entry);
      }
      addDiagnostic({
        code: "library-root-definition-missing",
        severity: "blocked",
        rootDefinitionId: definitionId,
      });
      return;
    }

    stateById.set(definitionId, "visiting");
    traversalPath.push(definitionId);

    for (const dependency of definition.dependencies) {
      if (dependency.versionRange !== null) {
        addDiagnostic({
          code: "library-dependency-version-range-declared",
          severity: "info",
          definitionId,
          dependencyId: dependency.libraryItemId,
          versionRange: dependency.versionRange,
        });
      }

      if (!definitionsById.has(dependency.libraryItemId)) {
        recordMissing(definitionId, dependency);
        continue;
      }

      visit(dependency.libraryItemId);
    }

    traversalPath.pop();
    stateById.set(definitionId, "visited");
    if (!resolvedDefinitionIds.includes(definitionId)) {
      resolvedDefinitionIds.push(definitionId);
    }
  }

  roots.forEach(visit);

  const status = determineStatus(diagnostics);
  const analysis = {
    status,
    resolvable: status !== "blocked",
    rootDefinitionIds: roots,
    resolvedDefinitionIds,
    missingRequired,
    missingOptional,
    cycles,
    diagnostics,
  };

  validateLibraryDependencyAnalysis(analysis);
  return deepFreeze(analysis);
}

export function validateLibraryDependencyAnalysis(analysis) {
  if (!isPlainObject(analysis)) {
    throw new Error("Library dependency analysis must be an object");
  }

  if (!ANALYSIS_STATUSES.includes(analysis.status)) {
    throw new Error("Library dependency analysis status is invalid");
  }

  if (analysis.resolvable !== (analysis.status !== "blocked")) {
    throw new Error("Library dependency analysis resolvable flag is inconsistent");
  }

  validateUniqueStringArray(
    analysis.rootDefinitionIds,
    "Library dependency roots",
  );
  validateUniqueStringArray(
    analysis.resolvedDefinitionIds,
    "Library dependency resolution order",
  );
  validateMissingEntries(
    analysis.missingRequired,
    "Library required dependency diagnostics",
  );
  validateMissingEntries(
    analysis.missingOptional,
    "Library optional dependency diagnostics",
  );

  if (!Array.isArray(analysis.cycles)) {
    throw new Error("Library dependency cycles must be an array");
  }
  analysis.cycles.forEach((cycle, index) => {
    if (!Array.isArray(cycle) || cycle.length < 2) {
      throw new Error(`Library dependency cycle[${index}] is invalid`);
    }
    cycle.forEach((id, idIndex) => {
      normalizeRequiredString(
        id,
        `Library dependency cycle[${index}][${idIndex}]`,
      );
    });
    if (cycle[0] !== cycle.at(-1)) {
      throw new Error(`Library dependency cycle[${index}] must be closed`);
    }
  });

  if (!Array.isArray(analysis.diagnostics)) {
    throw new Error("Library dependency diagnostics must be an array");
  }
  analysis.diagnostics.forEach((diagnostic, index) => {
    if (!isPlainObject(diagnostic)) {
      throw new Error(`Library dependency diagnostic[${index}] must be an object`);
    }
    normalizeRequiredString(
      diagnostic.code,
      `Library dependency diagnostic[${index}] code`,
    );
    if (!["info", "warning", "blocked"].includes(diagnostic.severity)) {
      throw new Error(
        `Library dependency diagnostic[${index}] severity is invalid`,
      );
    }
  });

  return true;
}

function normalizeRootDefinitionIds(value, registry) {
  if (value === undefined || value === null) {
    return registry.definitions.map(definition => definition.id);
  }

  if (!Array.isArray(value)) {
    throw new Error("Library dependency roots must be an array");
  }

  const roots = value.map((id, index) =>
    normalizeRequiredString(id, `Library dependency root[${index}]`),
  );
  if (new Set(roots).size !== roots.length) {
    throw new Error("Library dependency roots must not contain duplicates");
  }
  return roots;
}

function determineStatus(diagnostics) {
  if (diagnostics.some(diagnostic => diagnostic.severity === "blocked")) {
    return "blocked";
  }
  if (diagnostics.some(diagnostic => diagnostic.severity === "warning")) {
    return "ready-with-warnings";
  }
  return "ready";
}

function containsMissing(entries, candidate) {
  return entries.some(entry => (
    entry.definitionId === candidate.definitionId &&
    entry.dependencyId === candidate.dependencyId &&
    entry.versionRange === candidate.versionRange
  ));
}

function validateMissingEntries(entries, label) {
  if (!Array.isArray(entries)) {
    throw new Error(`${label} must be an array`);
  }

  entries.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      throw new Error(`${label}[${index}] must be an object`);
    }
    if (entry.definitionId !== null) {
      normalizeRequiredString(
        entry.definitionId,
        `${label}[${index}] definitionId`,
      );
    }
    normalizeRequiredString(
      entry.dependencyId,
      `${label}[${index}] dependencyId`,
    );
    if (
      entry.versionRange !== null &&
      (typeof entry.versionRange !== "string" || entry.versionRange.trim() === "")
    ) {
      throw new Error(`${label}[${index}] versionRange is invalid`);
    }
  });
}

function validateUniqueStringArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  value.forEach((item, index) => {
    normalizeRequiredString(item, `${label}[${index}]`);
  });
  if (new Set(value).size !== value.length) {
    throw new Error(`${label} must not contain duplicates`);
  }
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function normalizeRequiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
