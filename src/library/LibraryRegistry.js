import {
  createLibraryDefinition,
  createLibraryDefinitions,
  serializeLibraryDefinition,
  serializeLibraryDefinitions,
  validateLibraryDefinitions,
} from "./LibraryDefinition.js";

const LIBRARY_REGISTRY_SCHEMA_VERSION = 1;

export function createLibraryRegistry(input = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Library registry must be an object");
  }

  const schemaVersion = input.schemaVersion ?? LIBRARY_REGISTRY_SCHEMA_VERSION;
  validateSchemaVersion(schemaVersion);

  const registry = {
    schemaVersion,
    definitions: createLibraryDefinitions(input.definitions),
  };

  validateLibraryRegistry(registry);
  return deepFreeze(registry);
}

export function validateLibraryRegistry(registry) {
  if (!isPlainObject(registry)) {
    throw new Error("Library registry must be an object");
  }

  validateSchemaVersion(registry.schemaVersion);
  validateLibraryDefinitions(registry.definitions);
  assertNoExternalIdentityConflicts(registry.definitions);

  return true;
}

export function serializeLibraryRegistry(registry) {
  validateLibraryRegistry(registry);
  return {
    schemaVersion: registry.schemaVersion,
    definitions: serializeLibraryDefinitions(registry.definitions),
  };
}

export function registerLibraryDefinition(registry, input) {
  validateLibraryRegistry(registry);
  const candidate = createLibraryDefinition(input);
  const current = findLibraryDefinition(registry, candidate.id);

  if (current !== null) {
    if (definitionFingerprint(current) === definitionFingerprint(candidate)) {
      return registry;
    }

    throw new Error(
      `Library definition id conflict: ${candidate.id}`,
    );
  }

  return createLibraryRegistry({
    schemaVersion: registry.schemaVersion,
    definitions: [
      ...serializeLibraryDefinitions(registry.definitions),
      serializeLibraryDefinition(candidate),
    ],
  });
}

export function removeLibraryDefinition(registry, definitionId) {
  validateLibraryRegistry(registry);
  const id = normalizeRequiredString(
    definitionId,
    "Library definition id",
  );

  if (!registry.definitions.some(definition => definition.id === id)) {
    return registry;
  }

  return createLibraryRegistry({
    schemaVersion: registry.schemaVersion,
    definitions: serializeLibraryDefinitions(
      registry.definitions.filter(definition => definition.id !== id),
    ),
  });
}

export function findLibraryDefinition(registry, definitionId) {
  validateLibraryRegistry(registry);
  const id = normalizeRequiredString(
    definitionId,
    "Library definition id",
  );

  return registry.definitions.find(definition => definition.id === id) ?? null;
}

export function hasLibraryDefinition(registry, definitionId) {
  return findLibraryDefinition(registry, definitionId) !== null;
}

export function listLibraryDefinitions(registry) {
  validateLibraryRegistry(registry);
  return Object.freeze([...registry.definitions]);
}

export function listLibraryDefinitionsByDomain(registry, domain) {
  validateLibraryRegistry(registry);
  const normalizedDomain = normalizeRequiredString(
    domain,
    "Library definition domain",
  );

  return Object.freeze(
    registry.definitions.filter(
      definition => definition.domain === normalizedDomain,
    ),
  );
}

export function listLibraryDefinitionsByTag(registry, tag) {
  validateLibraryRegistry(registry);
  const normalizedTag = normalizeRequiredString(
    tag,
    "Library definition tag",
  );

  return Object.freeze(
    registry.definitions.filter(
      definition => definition.tags.includes(normalizedTag),
    ),
  );
}

function assertNoExternalIdentityConflicts(definitions) {
  const owners = new Map();

  for (const definition of definitions) {
    for (const [provider, value] of Object.entries(definition.externalIds)) {
      const key = [
        definition.domain,
        provider,
        stableStringify(value),
      ].join("\u0000");
      const owner = owners.get(key) ?? null;

      if (owner !== null && owner !== definition.id) {
        throw new Error(
          `Library external identity conflict: ${definition.domain}:${provider}`,
        );
      }

      owners.set(key, definition.id);
    }
  }
}

function definitionFingerprint(definition) {
  return stableStringify(serializeLibraryDefinition(definition));
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

function validateSchemaVersion(value) {
  if (value !== LIBRARY_REGISTRY_SCHEMA_VERSION) {
    throw new Error("Library registry schemaVersion is unsupported");
  }
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
