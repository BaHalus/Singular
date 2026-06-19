export function createMorphTemplateFingerprint(template) {
  if (!template || typeof template !== "object" || Array.isArray(template)) {
    throw new Error("Morfose template fingerprint requires template object");
  }
  return canonicalStringify(template);
}

export function createMorphMaterialization(input = {}) {
  return {
    knownFormId: requiredString(
      input.knownFormId,
      "Morfose materialization knownFormId must be non-empty string",
    ),
    templateId: requiredString(
      input.templateId,
      "Morfose materialization templateId must be non-empty string",
    ),
    templateFingerprint: requiredString(
      input.templateFingerprint,
      "Morfose materialization templateFingerprint must be non-empty string",
    ),
    materializedAt: normalizeTimestamp(input.materializedAt),
    sourceName: typeof input.sourceName === "string" ? input.sourceName : "",
    acquisitionMethod: typeof input.acquisitionMethod === "string"
      ? input.acquisitionMethod
      : "unknown",
    externalIds: plain(input.externalIds) ? clone(input.externalIds) : {},
  };
}

export function validateMorphMaterialization(value) {
  if (!plain(value)) throw new Error("Morfose materialization must be object");
  createMorphMaterialization(value);
  return true;
}

export function serializeMorphMaterialization(value) {
  validateMorphMaterialization(value);
  return clone(value);
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || value === "" || Number.isNaN(Date.parse(value))) {
    throw new Error("Morfose materialization timestamp must be valid");
  }
  return value;
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
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clone(item)]),
    );
  }
  return value;
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
