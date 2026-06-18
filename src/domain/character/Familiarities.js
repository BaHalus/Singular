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
    importedCost: input.importedCost ?? null,
    notes: input.notes ?? "",
    tags: normalizeTags(input.tags),
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

  if (familiarity.importedCost !== null && typeof familiarity.importedCost !== "number") {
    throw new Error("Familiarity importedCost must be number or null");
  }

  if (typeof familiarity.notes !== "string") {
    throw new Error("Familiarity notes must be string");
  }

  if (!Array.isArray(familiarity.tags)) {
    throw new Error("Familiarity tags must be array");
  }

  return true;
}

export function serializeFamiliarities(familiarities) {
  validateFamiliarities(familiarities);

  return familiarities.map(familiarity => ({
    id: familiarity.id,
    externalIds: { ...familiarity.externalIds },
    name: familiarity.name,
    importedCost: familiarity.importedCost,
    notes: familiarity.notes,
    tags: [...familiarity.tags],
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

function normalizeTags(tags) {
  if (tags === undefined || tags === null) {
    return [];
  }

  if (!Array.isArray(tags)) {
    throw new Error("Familiarity tags must be array");
  }

  return [...tags];
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
