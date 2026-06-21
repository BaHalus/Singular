import {
  serializeTemplateEntry,
  validateTemplate,
  validateTemplates,
} from "./Templates.js";

const TEMPLATE_REFERENCE_TYPE = "templateReference";
const REFERENCE_SCOPES = ["internal", "external"];

export function resolveTemplateComposition(templates, options = {}) {
  validateTemplates(templates);
  if (!isPlainObject(options)) {
    throw new Error("Template composition options must be object");
  }

  const catalog = createCatalog(templates);
  const roots = normalizeRoots(options.rootTemplateIds, templates);
  const dependencies = [];
  const dependencyBySource = new Map();
  const visited = new Set();

  for (const root of roots) {
    collectDependencies(
      root,
      catalog,
      dependencies,
      dependencyBySource,
      visited,
    );
  }

  const { orderedTemplateIds, cycles } = createDeterministicOrder(
    roots,
    catalog,
    dependencyBySource,
  );
  const pathsByTemplate = createOriginPaths(
    roots,
    catalog,
    dependencyBySource,
  );
  const contributions = createResolvedContributions(
    orderedTemplateIds,
    catalog,
    pathsByTemplate,
  );
  const conflicts = detectCompositionConflicts(contributions, dependencies);
  const diagnostics = createDiagnostics({
    roots,
    catalog,
    dependencies,
    cycles,
    conflicts,
  });
  const status = determineResolutionStatus(diagnostics);
  const result = {
    status,
    complete: status === "ready",
    rootTemplateIds: [...roots],
    reachableTemplateIds: [...new Set(orderedTemplateIds)],
    orderedTemplateIds,
    dependencies,
    cycles,
    conflicts,
    contributions,
    diagnostics,
  };

  validateResolvedTemplateComposition(result);
  return deepFreeze(result);
}

export function validateResolvedTemplateComposition(result) {
  if (!isPlainObject(result)) {
    throw new Error("Resolved template composition must be object");
  }
  if (!["ready", "pending", "blocked"].includes(result.status)) {
    throw new Error("Resolved template composition status is invalid");
  }
  if (result.complete !== (result.status === "ready")) {
    throw new Error("Resolved template composition complete flag is inconsistent");
  }

  for (const key of [
    "rootTemplateIds",
    "reachableTemplateIds",
    "orderedTemplateIds",
  ]) {
    validateUniqueStringArray(
      result[key],
      `Resolved template composition ${key} must be unique string array`,
    );
  }

  requireArray(result.dependencies, "Resolved dependencies must be array");
  result.dependencies.forEach(validateDependency);
  requireArray(result.cycles, "Resolved cycles must be array");
  result.cycles.forEach(validateCycle);
  requireArray(result.conflicts, "Resolved conflicts must be array");
  result.conflicts.forEach(validateConflict);
  requireArray(result.contributions, "Resolved contributions must be array");
  result.contributions.forEach(validateResolvedContribution);
  requireArray(result.diagnostics, "Resolved diagnostics must be array");

  for (const diagnostic of result.diagnostics) {
    if (!isPlainObject(diagnostic)) {
      throw new Error("Resolved template diagnostic must be object");
    }
    requiredString(diagnostic.code, "Resolved diagnostic code is required");
    if (!["info", "pending", "blocked"].includes(diagnostic.severity)) {
      throw new Error("Resolved diagnostic severity is invalid");
    }
  }

  return true;
}

export function serializeResolvedTemplateComposition(result) {
  validateResolvedTemplateComposition(result);
  return cloneValue(result);
}

export function getTemplateDependencyEntries(template) {
  validateTemplate(template);
  return deepFreeze(template.entries
    .filter(isTemplateReference)
    .map(entry => serializeTemplateEntry(entry)));
}

function createCatalog(templates) {
  const byId = new Map(templates.map(template => [template.id, template]));
  const byExternal = new Map();

  for (const template of templates) {
    for (const [key, value] of Object.entries(template.externalIds)) {
      if (!isExternalScalar(value)) continue;
      const index = externalIndexKey(key, value);
      const matches = byExternal.get(index) ?? [];
      matches.push(template.id);
      byExternal.set(index, matches);
    }
  }

  return { byId, byExternal };
}

function normalizeRoots(value, templates) {
  if (value === undefined || value === null) {
    return templates.map(template => template.id);
  }
  validateUniqueStringArray(
    value,
    "Template rootTemplateIds must be unique string array",
  );
  return [...value];
}

function collectDependencies(
  templateId,
  catalog,
  dependencies,
  dependencyBySource,
  visited,
) {
  if (visited.has(templateId)) return;
  visited.add(templateId);

  const template = catalog.byId.get(templateId);
  if (!template) return;

  const resolved = template.entries
    .filter(isTemplateReference)
    .map(entry => resolveDependency(template, entry, catalog));
  dependencyBySource.set(templateId, resolved);
  dependencies.push(...resolved);

  for (const dependency of resolved) {
    if (dependency.status === "resolved") {
      collectDependencies(
        dependency.resolvedTemplateId,
        catalog,
        dependencies,
        dependencyBySource,
        visited,
      );
    }
  }
}

function resolveDependency(sourceTemplate, entry, catalog) {
  const scope = normalizeReferenceScope(entry.payload?.referenceScope);
  const relation = normalizeRelation(entry.payload?.relation);
  const externalKey = scope === "external"
    ? normalizeExternalKey(entry.payload?.externalKey)
    : null;
  let candidateTemplateIds = [];
  let resolvedTemplateId = null;
  let status;

  if (scope === "internal") {
    if (catalog.byId.has(entry.referenceId)) {
      status = "resolved";
      resolvedTemplateId = entry.referenceId;
      candidateTemplateIds = [entry.referenceId];
    } else {
      status = "missing";
    }
  } else {
    candidateTemplateIds = externalKey === null
      ? []
      : [...(catalog.byExternal.get(
        externalIndexKey(externalKey, entry.referenceId),
      ) ?? [])];

    if (candidateTemplateIds.length === 0) {
      status = "unresolved-external";
    } else if (candidateTemplateIds.length === 1) {
      status = "resolved";
      [resolvedTemplateId] = candidateTemplateIds;
    } else {
      status = "ambiguous-external";
    }
  }

  return {
    sourceTemplateId: sourceTemplate.id,
    entryId: entry.id,
    relation,
    scope,
    referenceId: entry.referenceId,
    externalKey,
    status,
    resolvedTemplateId,
    candidateTemplateIds,
    declaration: cloneValue(entry.payload),
  };
}

function createDeterministicOrder(roots, catalog, dependencyBySource) {
  const state = new Map();
  const stack = [];
  const orderedTemplateIds = [];
  const cycles = [];
  const cycleKeys = new Set();

  function visit(templateId) {
    if (!catalog.byId.has(templateId)) return;
    if (state.get(templateId) === "visited") return;
    if (state.get(templateId) === "visiting") {
      const index = stack.indexOf(templateId);
      const path = [...stack.slice(index), templateId];
      const key = canonicalCycleKey(path);
      if (!cycleKeys.has(key)) {
        cycleKeys.add(key);
        cycles.push({ templateIds: path });
      }
      return;
    }

    state.set(templateId, "visiting");
    stack.push(templateId);
    for (const dependency of dependencyBySource.get(templateId) ?? []) {
      if (dependency.status === "resolved") {
        visit(dependency.resolvedTemplateId);
      }
    }
    stack.pop();
    state.set(templateId, "visited");
    if (!orderedTemplateIds.includes(templateId)) {
      orderedTemplateIds.push(templateId);
    }
  }

  roots.forEach(visit);
  return { orderedTemplateIds, cycles };
}

function createOriginPaths(roots, catalog, dependencyBySource) {
  const paths = new Map();

  function walk(templateId, path) {
    if (!catalog.byId.has(templateId)) return;
    const nextPath = [...path, templateId];
    addUniquePath(paths, templateId, nextPath);

    for (const dependency of dependencyBySource.get(templateId) ?? []) {
      if (
        dependency.status !== "resolved" ||
        nextPath.includes(dependency.resolvedTemplateId)
      ) {
        continue;
      }
      walk(dependency.resolvedTemplateId, nextPath);
    }
  }

  roots.forEach(root => walk(root, []));
  return paths;
}

function createResolvedContributions(orderedTemplateIds, catalog, pathsByTemplate) {
  const contributions = [];

  for (const templateId of orderedTemplateIds) {
    const template = catalog.byId.get(templateId);
    if (!template) continue;

    for (const entry of template.entries) {
      if (isTemplateReference(entry)) continue;
      contributions.push({
        key: `${templateId}::${entry.id}`,
        templateId,
        entryId: entry.id,
        domain: entry.domain,
        entryType: entry.entryType,
        referenceId: entry.referenceId,
        conflictKey: normalizeConflictKey(entry.payload?.conflictKey),
        declaration: cloneValue(entry.payload),
        originPaths: cloneValue(pathsByTemplate.get(templateId) ?? []),
      });
    }
  }

  return contributions;
}

function detectCompositionConflicts(contributions, dependencies) {
  const conflicts = [];
  const groups = new Map();

  for (const contribution of contributions) {
    if (contribution.conflictKey === null) continue;
    const index = `${contribution.domain}::${contribution.conflictKey}`;
    const list = groups.get(index) ?? [];
    list.push(contribution);
    groups.set(index, list);
  }

  for (const [index, entries] of groups.entries()) {
    if (entries.length < 2) continue;
    const declarations = new Set(
      entries.map(entry => canonicalStringify(entry.declaration)),
    );
    if (declarations.size < 2) continue;
    const separator = index.indexOf("::");
    conflicts.push({
      type: "explicit-contribution-conflict",
      domain: index.slice(0, separator),
      conflictKey: index.slice(separator + 2),
      contributionKeys: entries.map(entry => entry.key),
      templateIds: [...new Set(entries.map(entry => entry.templateId))],
    });
  }

  for (const dependency of dependencies) {
    if (dependency.status !== "ambiguous-external") continue;
    conflicts.push({
      type: "ambiguous-external-reference",
      domain: "template",
      conflictKey: `${dependency.externalKey}:${String(dependency.referenceId)}`,
      contributionKeys: [
        `${dependency.sourceTemplateId}::${dependency.entryId}`,
      ],
      templateIds: [...dependency.candidateTemplateIds],
    });
  }

  return conflicts;
}

function createDiagnostics(input) {
  const diagnostics = [];

  for (const root of input.roots) {
    if (!input.catalog.byId.has(root)) {
      diagnostics.push({
        code: "template-root-missing",
        severity: "blocked",
        templateId: root,
      });
    }
  }

  for (const dependency of input.dependencies) {
    if (dependency.status === "resolved") continue;
    const pending = dependency.status === "unresolved-external";
    diagnostics.push({
      code: dependency.status === "missing"
        ? "template-dependency-missing"
        : pending
          ? "template-external-reference-unresolved"
          : "template-external-reference-ambiguous",
      severity: pending ? "pending" : "blocked",
      sourceTemplateId: dependency.sourceTemplateId,
      entryId: dependency.entryId,
      referenceId: dependency.referenceId,
      externalKey: dependency.externalKey,
      candidateTemplateIds: [...dependency.candidateTemplateIds],
    });
  }

  for (const cycle of input.cycles) {
    diagnostics.push({
      code: "template-dependency-cycle",
      severity: "blocked",
      templateIds: [...cycle.templateIds],
    });
  }

  for (const conflict of input.conflicts) {
    diagnostics.push({
      code: conflict.type === "ambiguous-external-reference"
        ? "template-external-id-conflict"
        : "template-contribution-conflict",
      severity: "blocked",
      conflictKey: conflict.conflictKey,
      templateIds: [...conflict.templateIds],
      contributionKeys: [...conflict.contributionKeys],
    });
  }

  return diagnostics;
}

function determineResolutionStatus(diagnostics) {
  if (diagnostics.some(item => item.severity === "blocked")) return "blocked";
  if (diagnostics.some(item => item.severity === "pending")) return "pending";
  return "ready";
}

function validateDependency(dependency) {
  if (!isPlainObject(dependency)) throw new Error("Template dependency must be object");
  requiredString(dependency.sourceTemplateId, "Dependency sourceTemplateId is required");
  requiredString(dependency.entryId, "Dependency entryId is required");
  if (!REFERENCE_SCOPES.includes(dependency.scope)) {
    throw new Error("Template dependency scope is invalid");
  }
  requiredString(dependency.referenceId, "Dependency referenceId is required");
  if (![
    "resolved",
    "missing",
    "unresolved-external",
    "ambiguous-external",
  ].includes(dependency.status)) {
    throw new Error("Template dependency status is invalid");
  }
  validateUniqueStringArray(
    dependency.candidateTemplateIds,
    "Dependency candidates must be unique string array",
  );
  if (dependency.status === "resolved") {
    requiredString(dependency.resolvedTemplateId, "Resolved dependency needs target");
  } else if (dependency.resolvedTemplateId !== null) {
    throw new Error("Unresolved dependency cannot have resolved target");
  }
}

function validateCycle(cycle) {
  if (
    !isPlainObject(cycle) ||
    !Array.isArray(cycle.templateIds) ||
    cycle.templateIds.length < 2 ||
    cycle.templateIds[0] !== cycle.templateIds.at(-1)
  ) {
    throw new Error("Template cycle must be a closed path");
  }
}

function validateConflict(conflict) {
  if (!isPlainObject(conflict)) throw new Error("Template conflict must be object");
  requiredString(conflict.type, "Template conflict type is required");
  requiredString(conflict.domain, "Template conflict domain is required");
  requiredString(conflict.conflictKey, "Template conflict key is required");
  validateUniqueStringArray(conflict.contributionKeys, "Conflict keys are invalid");
  validateUniqueStringArray(conflict.templateIds, "Conflict template ids are invalid");
}

function validateResolvedContribution(contribution) {
  if (!isPlainObject(contribution)) {
    throw new Error("Resolved contribution must be object");
  }
  for (const key of ["key", "templateId", "entryId", "domain", "entryType"]) {
    requiredString(contribution[key], `Resolved contribution ${key} is required`);
  }
  requireArray(contribution.originPaths, "Contribution originPaths must be array");
  for (const path of contribution.originPaths) {
    if (!Array.isArray(path) || path.length === 0 || path.at(-1) !== contribution.templateId) {
      throw new Error("Contribution origin path is invalid");
    }
  }
}

function isTemplateReference(entry) {
  return entry.domain === "template" && entry.entryType === TEMPLATE_REFERENCE_TYPE;
}

function normalizeReferenceScope(value) {
  const scope = value ?? "internal";
  if (!REFERENCE_SCOPES.includes(scope)) {
    throw new Error("Template reference scope is invalid");
  }
  return scope;
}

function normalizeRelation(value) {
  if (value === undefined || value === null || value === "") return "include";
  return requiredString(value, "Template dependency relation must be string");
}

function normalizeExternalKey(value) {
  if (value === undefined || value === null || value === "") return null;
  return requiredString(value, "External template reference key must be string");
}

function normalizeConflictKey(value) {
  if (value === undefined || value === null || value === "") return null;
  return requiredString(value, "Template contribution conflictKey must be string");
}

function externalIndexKey(key, value) {
  return `${key}::${canonicalStringify(value)}`;
}

function canonicalCycleKey(path) {
  const open = path.slice(0, -1);
  const rotations = open.map((_, index) => (
    [...open.slice(index), ...open.slice(0, index)].join("->")
  ));
  return rotations.sort()[0] ?? "";
}

function addUniquePath(paths, templateId, path) {
  const list = paths.get(templateId) ?? [];
  const key = path.join("->");
  if (!list.some(item => item.join("->") === key)) {
    list.push(path);
    paths.set(templateId, list);
  }
}

function isExternalScalar(value) {
  return ["string", "number"].includes(typeof value) && value !== "";
}

function requireArray(value, message) {
  if (!Array.isArray(value)) throw new Error(message);
}

function validateUniqueStringArray(value, message) {
  if (
    !Array.isArray(value) ||
    value.some(item => typeof item !== "string" || item === "") ||
    new Set(value).size !== value.length
  ) {
    throw new Error(message);
  }
}

function requiredString(value, message) {
  if (typeof value !== "string" || value === "") throw new Error(message);
  return value;
}

function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
    );
  }
  return value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
