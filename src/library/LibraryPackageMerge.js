import {
  serializeLibraryDefinition,
} from "./LibraryDefinition.js";
import { importLibraryPackage } from "./LibraryPackage.js";
import {
  createLibraryRegistry,
  findLibraryDefinition,
  registerLibraryDefinition,
  serializeLibraryRegistry,
  validateLibraryRegistry,
} from "./LibraryRegistry.js";

const LIBRARY_PACKAGE_MERGE_SCHEMA_VERSION = 1;
const MERGE_STATUSES = ["merged", "no-op"];

export function mergeLibraryPackageIntoRegistry(registry, packageInput) {
  validateLibraryRegistry(registry);
  const incomingRegistry = importLibraryPackage(packageInput);

  let mergedRegistry = createLibraryRegistry(serializeLibraryRegistry(registry));
  const addedDefinitionIds = [];
  const unchangedDefinitionIds = [];

  for (const definition of incomingRegistry.definitions) {
    const existing = findLibraryDefinition(mergedRegistry, definition.id);
    const nextRegistry = registerLibraryDefinition(
      mergedRegistry,
      serializeLibraryDefinition(definition),
    );

    if (existing !== null && nextRegistry === mergedRegistry) {
      unchangedDefinitionIds.push(definition.id);
      continue;
    }

    addedDefinitionIds.push(definition.id);
    mergedRegistry = nextRegistry;
  }

  const result = {
    schemaVersion: LIBRARY_PACKAGE_MERGE_SCHEMA_VERSION,
    status: addedDefinitionIds.length === 0 ? "no-op" : "merged",
    registry: mergedRegistry,
    addedDefinitionIds,
    unchangedDefinitionIds,
  };

  validateLibraryPackageMergeResult(result);
  return deepFreeze(result);
}

export function validateLibraryPackageMergeResult(result) {
  requirePlainObject(result, "Library package merge result");

  if (result.schemaVersion !== LIBRARY_PACKAGE_MERGE_SCHEMA_VERSION) {
    throw new Error("Library package merge result schemaVersion is unsupported");
  }
  if (!MERGE_STATUSES.includes(result.status)) {
    throw new Error("Library package merge result status is invalid");
  }

  validateLibraryRegistry(result.registry);
  validateUniqueStringArray(
    result.addedDefinitionIds,
    "Library package merge added definition ids",
  );
  validateUniqueStringArray(
    result.unchangedDefinitionIds,
    "Library package merge unchanged definition ids",
  );
  validateDisjointIds(
    result.addedDefinitionIds,
    result.unchangedDefinitionIds,
  );
  validateResultDefinitionIds(result);

  const expectedStatus = result.addedDefinitionIds.length === 0
    ? "no-op"
    : "merged";
  if (result.status !== expectedStatus) {
    throw new Error("Library package merge result status is inconsistent");
  }

  return true;
}

export function getLibraryPackageMergeSchemaVersion() {
  return LIBRARY_PACKAGE_MERGE_SCHEMA_VERSION;
}

function validateResultDefinitionIds(result) {
  for (const definitionId of [
    ...result.addedDefinitionIds,
    ...result.unchangedDefinitionIds,
  ]) {
    if (findLibraryDefinition(result.registry, definitionId) === null) {
      throw new Error(
        `Library package merge result references missing definition: ${definitionId}`,
      );
    }
  }
}

function validateDisjointIds(addedDefinitionIds, unchangedDefinitionIds) {
  const added = new Set(addedDefinitionIds);
  for (const definitionId of unchangedDefinitionIds) {
    if (added.has(definitionId)) {
      throw new Error(
        `Library package merge definition cannot be added and unchanged: ${definitionId}`,
      );
    }
  }
}

function validateUniqueStringArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  value.forEach((item, index) => {
    if (typeof item !== "string" || item.trim() === "") {
      throw new Error(`${label}[${index}] must be a non-empty string`);
    }
  });

  if (new Set(value).size !== value.length) {
    throw new Error(`${label} must not contain duplicates`);
  }
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
