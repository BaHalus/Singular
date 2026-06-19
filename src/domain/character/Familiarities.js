export function createFamiliarities(input = []) {
  const familiarities = input.map(createFamiliarity);

  validateFamiliarities(familiarities);

  return familiarities;
}

export function createFamiliarity(input = {}) {
  return {
    id: input.id ?? generateFamiliarityId(),
    externalIds: normalizeExternalIds(input.externalIds),
    name: input.name ?? "",
    isNative: input.isNative ?? false,
    importedCost: input.importedCost ?? null,
    reference: input.reference ?? null,
    modifiers: normalizeArray(input.modifiers, "Familiarity modifiers must be array"),
    prereqs: input.prereqs ?? null,
    notes: input.notes ?? "",
    tags: normalizeArray(input.tags, "Familiarity tags must be array"),
    importMeta: input.importMeta ?? null,
    raw: input.raw ?? null,
  };
}

export function validateFamiliarities(familiarities) {
  if (!Array.isArray(familiarities)) {
    throw new Error("Familiarities must be an array");
  }

  for (const familiarity of familiarities) {
    validateFamiliarity(familiarity);
  }

  return true;
}

export function validateFamiliarity(familiarity) {
  if (!familiarity || typeof familiarity !== "object") {
    throw new Error("Familiarity must be an object");
  }

  if (!familiarity.id) {
    throw new Error("Familiarity must have id");
  }

  if (!isPlainObject(familiarity.externalIds)) {
    throw new Error("Familiarity externalIds must be object");
  }

  if (typeof familiarity.name !== "string") {
    throw new Error("Familiarity name must be string");
  }

  if (typeof familiarity.isNative !== "boolean") {
    throw new Error("Familiarity isNative must be boolean");
  }

  if (
    familiarity.importedCost !== null &&
    (typeof familiarity.importedCost !== "number" || Number.isNaN(familiarity.importedCost))
  ) {
    throw new Error("Familiarity importedCost must be number or null");
  }

  if (familiarity.reference !== null && typeof familiarity.reference !== "string") {
    throw new Error("Familiarity reference must be string or null");
  }

  if (!Array.isArray(familiarity.modifiers)) {
    throw new Error("Familiarity modifiers must be array");
  }

  if (familiarity.prereqs !== null && !isPlainObject(familiarity.prereqs)) {
    throw new Error("Familiarity prereqs must be object or null");
  }

  if (typeof familiarity.notes !== "string") {
    throw new Error("Familiarity notes must be string");
  }

  if (!Array.isArray(familiarity.tags)) {
    throw new Error("Familiarity tags must be array");
  }

  if (familiarity.importMeta !== null && !isPlainObject(familiarity.importMeta)) {
    throw new Error("Familiarity importMeta must be object or null");
  }

  return true;
}

export function serializeFamiliarities(familiarities) {
  validateFamiliarities(familiarities);

  return familiarities.map(familiarity => ({
    id: familiarity.id,
    externalIds: { ...familiarity.externalIds },
    name: familiarity.name,
    isNative: familiarity.isNative,
    importedCost: familiarity.importedCost,
    reference: familiarity.reference,
    modifiers: [...familiarity.modifiers],
    prereqs: familiarity.prereqs,
    notes: familiarity.notes,
    tags: [...familiarity.tags],
    importMeta: familiarity.importMeta,
    raw: familiarity.raw,
  }));
}

function normalizeExternalIds(externalIds) {
  if (externalIds === undefined || externalIds === null) {
    return {};
  }

  if (!isPlainObject(externalIds)) {
    throw new Error("Familiarity externalIds must be object");
  }

  return { ...externalIds };
}

function normalizeArray(value, errorMessage) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
  }

  return [...value];
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function generateFamiliarityId() {
  return `fam_${Math.random().toString(36).slice(2, 10)}`;
}
