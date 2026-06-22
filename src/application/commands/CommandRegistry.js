export function createCommandRegistry(entries = []) {
  if (!Array.isArray(entries)) {
    throw new Error("Command registry entries must be an array");
  }

  const normalizedEntries = entries.map((entry, index) =>
    normalizeCommandHandlerEntry(entry, `Command registry entry[${index}]`),
  );

  assertUniqueCommandTypes(normalizedEntries);

  return Object.freeze({
    entries: Object.freeze(normalizedEntries),
  });
}

export function validateCommandRegistry(registry) {
  requirePlainObject(registry, "Command registry");

  if (!Array.isArray(registry.entries)) {
    throw new Error("Command registry entries must be an array");
  }

  const validatedEntries = registry.entries.map((entry, index) =>
    validateCommandHandlerEntry(entry, `Command registry entry[${index}]`),
  );

  assertUniqueCommandTypes(validatedEntries);
  return true;
}

export function registerCommandHandler(registry, entry) {
  validateCommandRegistry(registry);
  const normalizedEntry = normalizeCommandHandlerEntry(
    entry,
    "Command handler entry",
  );

  if (registry.entries.some(current => current.type === normalizedEntry.type)) {
    throw new Error(
      `Command handler already registered for type: ${normalizedEntry.type}`,
    );
  }

  return createCommandRegistry([...registry.entries, normalizedEntry]);
}

export function hasCommandHandler(registry, type) {
  validateCommandRegistry(registry);
  const normalizedType = normalizeCommandType(type);
  return registry.entries.some(entry => entry.type === normalizedType);
}

export function resolveCommandHandler(registry, type) {
  validateCommandRegistry(registry);
  const normalizedType = normalizeCommandType(type);
  return registry.entries.find(entry => entry.type === normalizedType)?.handler ?? null;
}

export function listCommandTypes(registry) {
  validateCommandRegistry(registry);
  return Object.freeze(registry.entries.map(entry => entry.type));
}

function normalizeCommandHandlerEntry(entry, label) {
  validateCommandHandlerEntry(entry, label);

  return Object.freeze({
    type: entry.type,
    handler: entry.handler,
  });
}

function validateCommandHandlerEntry(entry, label) {
  requirePlainObject(entry, label);
  normalizeCommandType(entry.type);

  if (typeof entry.handler !== "function") {
    throw new Error(`${label} handler must be a function`);
  }

  return entry;
}

function assertUniqueCommandTypes(entries) {
  const seen = new Set();

  for (const entry of entries) {
    if (seen.has(entry.type)) {
      throw new Error(`Duplicate command handler type: ${entry.type}`);
    }

    seen.add(entry.type);
  }
}

function normalizeCommandType(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Command type must be a non-empty string");
  }

  return value;
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
