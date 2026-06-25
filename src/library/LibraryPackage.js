import {
  createLibraryRegistry,
  serializeLibraryRegistry,
  validateLibraryRegistry,
} from "./LibraryRegistry.js";

const LIBRARY_PACKAGE_SCHEMA_VERSION = 1;
const LIBRARY_PACKAGE_KIND = "singular-library-package";

export function createLibraryPackage(input = {}) {
  requirePlainObject(input, "Library package");

  const registry = createLibraryRegistry(input.registry ?? {});
  const libraryPackage = {
    kind: normalizePackageKind(input.kind ?? LIBRARY_PACKAGE_KIND),
    schemaVersion: normalizeSchemaVersion(
      input.schemaVersion ?? LIBRARY_PACKAGE_SCHEMA_VERSION,
    ),
    metadata: normalizePackageMetadata(input.metadata),
    registry,
  };

  validateLibraryPackage(libraryPackage);
  return deepFreeze(libraryPackage);
}

export function validateLibraryPackage(libraryPackage) {
  requirePlainObject(libraryPackage, "Library package");
  normalizePackageKind(libraryPackage.kind);
  normalizeSchemaVersion(libraryPackage.schemaVersion);
  validatePackageMetadata(libraryPackage.metadata);
  validateLibraryRegistry(libraryPackage.registry);
  return true;
}

export function serializeLibraryPackage(libraryPackage) {
  validateLibraryPackage(libraryPackage);
  return clonePortableValue({
    kind: libraryPackage.kind,
    schemaVersion: libraryPackage.schemaVersion,
    metadata: libraryPackage.metadata,
    registry: serializeLibraryRegistry(libraryPackage.registry),
  }, "Library package");
}

export function exportLibraryPackage(registry, input = {}) {
  validateLibraryRegistry(registry);
  requirePlainObject(input, "Library package export options");

  return createLibraryPackage({
    kind: input.kind ?? LIBRARY_PACKAGE_KIND,
    schemaVersion: input.schemaVersion ?? LIBRARY_PACKAGE_SCHEMA_VERSION,
    metadata: input.metadata,
    registry: serializeLibraryRegistry(registry),
  });
}

export function importLibraryPackage(input) {
  return createLibraryPackage(input).registry;
}

export function getLibraryPackageKind() {
  return LIBRARY_PACKAGE_KIND;
}

export function getLibraryPackageSchemaVersion() {
  return LIBRARY_PACKAGE_SCHEMA_VERSION;
}

function normalizePackageKind(value) {
  if (value !== LIBRARY_PACKAGE_KIND) {
    throw new Error("Library package kind is unsupported");
  }
  return value;
}

function normalizeSchemaVersion(value) {
  if (value !== LIBRARY_PACKAGE_SCHEMA_VERSION) {
    throw new Error("Library package schemaVersion is unsupported");
  }
  return value;
}

function normalizePackageMetadata(value) {
  const metadata = clonePortableObject(
    value ?? {},
    "Library package metadata",
  );
  validatePackageMetadata(metadata);
  return metadata;
}

function validatePackageMetadata(metadata) {
  validatePortableObject(metadata, "Library package metadata");
  return true;
}

function clonePortableObject(value, label) {
  requirePlainObject(value, label);
  return clonePortableValue(value, label);
}

function validatePortableObject(value, label) {
  requirePlainObject(value, label);
  clonePortableValue(value, label);
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

function clonePortableValue(value, label, seen = new WeakMap()) {
  if (value === undefined || value === null) return value ?? null;
  if (typeof value === "string" || typeof value === "boolean") return value;
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
  requirePlainObject(value, label);
  const clone = {};
  seen.set(value, clone);
  for (const [key, item] of Object.entries(value)) {
    clone[key] = clonePortableValue(item, `${label}.${key}`, seen);
  }
  seen.delete(value);
  return clone;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
