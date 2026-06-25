const SOURCE_KINDS = [
  "singular",
  "imported",
  "embedded",
  "external",
  "unknown",
];

export function createLibraryDefinitions(input = []) {
  if (!Array.isArray(input)) {
    throw new Error("Library definitions must be an array");
  }

  const definitions = input.map(createLibraryDefinition);
  validateLibraryDefinitions(definitions);
  return deepFreeze(definitions);
}

export function createLibraryDefinition(input = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Library definition must be an object");
  }

  const definition = {
    id: normalizeRequiredString(
      input.id ?? generateLibraryDefinitionId(),
      "Library definition id",
    ),
    externalIds: normalizePortableObject(
      input.externalIds,
      "Library definition externalIds",
      {},
    ),
    domain: normalizeRequiredString(
      input.domain,
      "Library definition domain",
    ),
    schemaVersion: normalizePositiveInteger(
      input.schemaVersion ?? 1,
      "Library definition schemaVersion",
    ),
    name: normalizeRequiredString(
      input.name,
      "Library definition name",
    ),
    version: normalizeNullableString(
      input.version,
      "Library definition version",
    ),
    source: normalizeSource(input.source),
    payload: normalizePortableObject(
      input.payload,
      "Library definition payload",
      {},
    ),
    tags: normalizeUniqueStringArray(
      input.tags,
      "Library definition tags",
    ),
    dependencies: normalizeDependencies(input.dependencies),
    importMeta: normalizeNullablePortableObject(
      input.importMeta,
      "Library definition importMeta",
    ),
    raw: clonePortableValue(input.raw ?? null, "Library definition raw"),
  };

  validateLibraryDefinition(definition);
  return deepFreeze(definition);
}

export function validateLibraryDefinitions(definitions) {
  if (!Array.isArray(definitions)) {
    throw new Error("Library definitions must be an array");
  }

  const ids = new Set();
  for (const definition of definitions) {
    validateLibraryDefinition(definition);
    if (ids.has(definition.id)) {
      throw new Error(`Duplicate Library definition id: ${definition.id}`);
    }
    ids.add(definition.id);
  }

  return true;
}

export function validateLibraryDefinition(definition) {
  if (!isPlainObject(definition)) {
    throw new Error("Library definition must be an object");
  }

  normalizeRequiredString(definition.id, "Library definition id");
  validatePortableObject(
    definition.externalIds,
    "Library definition externalIds",
  );
  normalizeRequiredString(definition.domain, "Library definition domain");
  normalizePositiveInteger(
    definition.schemaVersion,
    "Library definition schemaVersion",
  );
  normalizeRequiredString(definition.name, "Library definition name");
  validateNullableString(definition.version, "Library definition version");
  validateSource(definition.source);
  validatePortableObject(definition.payload, "Library definition payload");
  validateUniqueStringArray(definition.tags, "Library definition tags");
  validateDependencies(definition.dependencies, definition.id);
  validateNullablePortableObject(
    definition.importMeta,
    "Library definition importMeta",
  );
  clonePortableValue(definition.raw, "Library definition raw");

  return true;
}

export function serializeLibraryDefinitions(definitions) {
  validateLibraryDefinitions(definitions);
  return definitions.map(serializeLibraryDefinition);
}

export function serializeLibraryDefinition(definition) {
  validateLibraryDefinition(definition);
  return clonePortableValue(definition, "Library definition");
}

function normalizeSource(value) {
  if (value === undefined || value === null) {
    return {
      kind: "singular",
      provider: null,
      format: "singular-json",
      reference: null,
    };
  }

  if (!isPlainObject(value)) {
    throw new Error("Library definition source must be an object");
  }

  const source = {
    kind: normalizeSourceKind(value.kind ?? "unknown"),
    provider: normalizeNullableString(
      value.provider,
      "Library definition source provider",
    ),
    format: normalizeNullableString(
      value.format,
      "Library definition source format",
    ),
    reference: normalizeNullableString(
      value.reference,
      "Library definition source reference",
    ),
  };

  validateSource(source);
  return source;
}

function validateSource(source) {
  if (!isPlainObject(source)) {
    throw new Error("Library definition source must be an object");
  }

  normalizeSourceKind(source.kind);
  validateNullableString(
    source.provider,
    "Library definition source provider",
  );
  validateNullableString(
    source.format,
    "Library definition source format",
  );
  validateNullableString(
    source.reference,
    "Library definition source reference",
  );

  return true;
}

function normalizeSourceKind(value) {
  if (typeof value !== "string" || !SOURCE_KINDS.includes(value)) {
    throw new Error("Library definition source kind is invalid");
  }
  return value;
}

function normalizeDependencies(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("Library definition dependencies must be an array");
  }

  const dependencies = value.map((dependency, index) => {
    if (!isPlainObject(dependency)) {
      throw new Error(`Library definition dependency[${index}] must be an object`);
    }

    return {
      libraryItemId: normalizeRequiredString(
        dependency.libraryItemId,
        `Library definition dependency[${index}] libraryItemId`,
      ),
      versionRange: normalizeNullableString(
        dependency.versionRange,
        `Library definition dependency[${index}] versionRange`,
      ),
      required: normalizeBoolean(
        dependency.required ?? true,
        `Library definition dependency[${index}] required`,
      ),
    };
  });

  validateDependencyUniqueness(dependencies);
  return dependencies;
}

function validateDependencies(dependencies, definitionId) {
  if (!Array.isArray(dependencies)) {
    throw new Error("Library definition dependencies must be an array");
  }

  dependencies.forEach((dependency, index) => {
    if (!isPlainObject(dependency)) {
      throw new Error(`Library definition dependency[${index}] must be an object`);
    }

    const libraryItemId = normalizeRequiredString(
      dependency.libraryItemId,
      `Library definition dependency[${index}] libraryItemId`,
    );
    validateNullableString(
      dependency.versionRange,
      `Library definition dependency[${index}] versionRange`,
    );
    normalizeBoolean(
      dependency.required,
      `Library definition dependency[${index}] required`,
    );

    if (libraryItemId === definitionId) {
      throw new Error("Library definition must not depend on itself");
    }
  });

  validateDependencyUniqueness(dependencies);
}

function validateDependencyUniqueness(dependencies) {
  const ids = new Set();
  for (const dependency of dependencies) {
    if (ids.has(dependency.libraryItemId)) {
      throw new Error(
        `Duplicate Library dependency: ${dependency.libraryItemId}`,
      );
    }
    ids.add(dependency.libraryItemId);
  }
}

function normalizePortableObject(value, label, fallback) {
  if (value === undefined || value === null) {
    return clonePortableValue(fallback, label);
  }
  validatePortableObject(value, label);
  return clonePortableValue(value, label);
}

function normalizeNullablePortableObject(value, label) {
  if (value === undefined || value === null) return null;
  validatePortableObject(value, label);
  return clonePortableValue(value, label);
}

function validatePortableObject(value, label) {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be an object`);
  }
  clonePortableValue(value, label);
}

function validateNullablePortableObject(value, label) {
  if (value === null) return true;
  validatePortableObject(value, label);
  return true;
}

function normalizeUniqueStringArray(value, label) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  const strings = value.map((item, index) =>
    normalizeRequiredString(item, `${label}[${index}]`),
  );
  validateUniqueValues(strings, `${label} must not contain duplicates`);
  return strings;
}

function validateUniqueStringArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  value.forEach((item, index) => {
    normalizeRequiredString(item, `${label}[${index}]`);
  });
  validateUniqueValues(value, `${label} must not contain duplicates`);
}

function validateUniqueValues(values, message) {
  if (new Set(values).size !== values.length) {
    throw new Error(message);
  }
}

function normalizeRequiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function normalizeNullableString(value, label) {
  if (value === undefined || value === null) return null;
  return normalizeRequiredString(value, label);
}

function validateNullableString(value, label) {
  if (value === null) return true;
  normalizeRequiredString(value, label);
  return true;
}

function normalizePositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

function normalizeBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be boolean`);
  }
  return value;
}

function clonePortableValue(value, label, seen = new WeakMap()) {
  if (value === null) return null;

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

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

  if (!isPlainObject(value)) {
    throw new Error(`${label} must contain only plain objects and arrays`);
  }

  const clone = {};
  seen.set(value, clone);
  for (const [key, item] of Object.entries(value)) {
    clone[key] = clonePortableValue(item, `${label}.${key}`, seen);
  }
  seen.delete(value);
  return clone;
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

function generateLibraryDefinitionId() {
  return `library_item_${Math.random().toString(36).slice(2, 10)}`;
}
