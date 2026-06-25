import {
  createLibraryDefinition,
  serializeLibraryDefinition,
  validateLibraryDefinition,
} from "./LibraryDefinition.js";

const INSTANTIATION_METHODS = [
  "analyzeInstantiation",
  "planInstantiation",
  "executeInstantiationPlan",
];

export function createLibraryAdapter(input = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Library adapter must be an object");
  }

  const adapter = {
    domain: normalizeRequiredString(
      input.domain,
      "Library adapter domain",
    ),
    supportedSchemaVersions: normalizeSchemaVersions(
      input.supportedSchemaVersions,
    ),
    validateDefinitionPayload: normalizeFunction(
      input.validateDefinitionPayload,
      "Library adapter validateDefinitionPayload",
    ),
    serializeDefinitionPayload: normalizeFunction(
      input.serializeDefinitionPayload,
      "Library adapter serializeDefinitionPayload",
    ),
    analyzeInstantiation: normalizeOptionalFunction(
      input.analyzeInstantiation,
      "Library adapter analyzeInstantiation",
    ),
    planInstantiation: normalizeOptionalFunction(
      input.planInstantiation,
      "Library adapter planInstantiation",
    ),
    executeInstantiationPlan: normalizeOptionalFunction(
      input.executeInstantiationPlan,
      "Library adapter executeInstantiationPlan",
    ),
  };

  validateInstantiationMethodSet(adapter);
  validateLibraryAdapter(adapter);
  return Object.freeze(adapter);
}

export function validateLibraryAdapter(adapter) {
  if (!isPlainObject(adapter)) {
    throw new Error("Library adapter must be an object");
  }

  normalizeRequiredString(adapter.domain, "Library adapter domain");
  validateSchemaVersions(adapter.supportedSchemaVersions);
  normalizeFunction(
    adapter.validateDefinitionPayload,
    "Library adapter validateDefinitionPayload",
  );
  normalizeFunction(
    adapter.serializeDefinitionPayload,
    "Library adapter serializeDefinitionPayload",
  );

  for (const method of INSTANTIATION_METHODS) {
    normalizeOptionalFunction(
      adapter[method],
      `Library adapter ${method}`,
    );
  }
  validateInstantiationMethodSet(adapter);

  return true;
}

export function createLibraryAdapterRegistry(input = []) {
  if (!Array.isArray(input)) {
    throw new Error("Library adapters must be an array");
  }

  const adapters = input.map(createLibraryAdapter);
  const domains = new Set();

  for (const adapter of adapters) {
    if (domains.has(adapter.domain)) {
      throw new Error(`Duplicate Library adapter domain: ${adapter.domain}`);
    }
    domains.add(adapter.domain);
  }

  return Object.freeze({
    adapters: Object.freeze(adapters),
  });
}

export function validateLibraryAdapterRegistry(registry) {
  if (!isPlainObject(registry) || !Array.isArray(registry.adapters)) {
    throw new Error("Library adapter registry must be an object");
  }

  const domains = new Set();
  for (const adapter of registry.adapters) {
    validateLibraryAdapter(adapter);
    if (domains.has(adapter.domain)) {
      throw new Error(`Duplicate Library adapter domain: ${adapter.domain}`);
    }
    domains.add(adapter.domain);
  }

  return true;
}

export function findLibraryAdapter(registry, domain) {
  validateLibraryAdapterRegistry(registry);
  const normalizedDomain = normalizeRequiredString(
    domain,
    "Library adapter domain",
  );

  return registry.adapters.find(
    adapter => adapter.domain === normalizedDomain,
  ) ?? null;
}

export function hasLibraryInstantiationCapability(adapter) {
  validateLibraryAdapter(adapter);
  return INSTANTIATION_METHODS.every(
    method => typeof adapter[method] === "function",
  );
}

export function validateLibraryDefinitionWithAdapter(
  definition,
  adapterRegistry,
) {
  validateLibraryDefinition(definition);
  const adapter = requireAdapter(adapterRegistry, definition.domain);
  requireSupportedSchemaVersion(adapter, definition.schemaVersion);

  const result = adapter.validateDefinitionPayload(definition.payload);
  if (result !== true) {
    throw new Error(
      `Library adapter ${adapter.domain} did not validate payload`,
    );
  }

  return true;
}

export function serializeLibraryDefinitionWithAdapter(
  definition,
  adapterRegistry,
) {
  validateLibraryDefinitionWithAdapter(definition, adapterRegistry);
  const adapter = requireAdapter(adapterRegistry, definition.domain);
  const payload = adapter.serializeDefinitionPayload(definition.payload);
  const canonical = createLibraryDefinition({
    ...serializeLibraryDefinition(definition),
    payload,
  });

  validateLibraryDefinitionWithAdapter(canonical, adapterRegistry);
  return serializeLibraryDefinition(canonical);
}

function requireAdapter(registry, domain) {
  const adapter = findLibraryAdapter(registry, domain);
  if (adapter === null) {
    throw new Error(`Library adapter not found for domain: ${domain}`);
  }
  return adapter;
}

function requireSupportedSchemaVersion(adapter, schemaVersion) {
  if (!adapter.supportedSchemaVersions.includes(schemaVersion)) {
    throw new Error(
      `Library adapter ${adapter.domain} does not support schemaVersion ${schemaVersion}`,
    );
  }
}

function normalizeSchemaVersions(value) {
  if (value === undefined || value === null) return [1];
  validateSchemaVersions(value);
  return [...value];
}

function validateSchemaVersions(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(
      "Library adapter supportedSchemaVersions must be a non-empty array",
    );
  }

  for (const version of value) {
    if (!Number.isInteger(version) || version < 1) {
      throw new Error(
        "Library adapter schema versions must be positive integers",
      );
    }
  }

  if (new Set(value).size !== value.length) {
    throw new Error(
      "Library adapter supportedSchemaVersions must not contain duplicates",
    );
  }
}

function validateInstantiationMethodSet(adapter) {
  const present = INSTANTIATION_METHODS.filter(
    method => adapter[method] !== null,
  );

  if (present.length !== 0 && present.length !== INSTANTIATION_METHODS.length) {
    throw new Error(
      "Library adapter instantiation methods must be provided together",
    );
  }
}

function normalizeFunction(value, label) {
  if (typeof value !== "function") {
    throw new Error(`${label} must be a function`);
  }
  return value;
}

function normalizeOptionalFunction(value, label) {
  if (value === undefined || value === null) return null;
  return normalizeFunction(value, label);
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
