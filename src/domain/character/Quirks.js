export function createQuirks(input = []) {
  const quirks = input.map(createQuirk);

  validateQuirks(quirks);

  return quirks;
}

export function createQuirk(input = {}) {
  return {
    id: input.id ?? generateQuirkId(),
    externalIds: normalizeExternalIds(input.externalIds),
    name: input.name ?? "",
    notes: input.notes ?? "",
    tags: Array.isArray(input.tags) ? [...input.tags] : [],
  };
}

export function validateQuirks(quirks) {
  if (!Array.isArray(quirks)) {
    throw new Error("Quirks must be an array");
  }

  for (const quirk of quirks) {
    validateQuirk(quirk);
  }

  return true;
}

export function validateQuirk(quirk) {
  if (!quirk || typeof quirk !== "object") {
    throw new Error("Quirk must be an object");
  }

  if (!quirk.id) {
    throw new Error("Quirk must have id");
  }

  if (!isPlainObject(quirk.externalIds)) {
    throw new Error("Quirk externalIds must be object");
  }

  if (typeof quirk.name !== "string") {
    throw new Error("Quirk name must be string");
  }

  if (typeof quirk.notes !== "string") {
    throw new Error("Quirk notes must be string");
  }

  if (!Array.isArray(quirk.tags)) {
    throw new Error("Quirk tags must be array");
  }

  return true;
}

export function serializeQuirks(quirks) {
  validateQuirks(quirks);

  return quirks.map(quirk => ({
    id: quirk.id,
    externalIds: { ...quirk.externalIds },
    name: quirk.name,
    notes: quirk.notes,
    tags: [...quirk.tags],
  }));
}

function normalizeExternalIds(externalIds) {
  if (externalIds === undefined || externalIds === null) {
    return {};
  }

  if (!isPlainObject(externalIds)) {
    throw new Error("Quirk externalIds must be object");
  }

  return { ...externalIds };
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function generateQuirkId() {
  return `quirk_${Math.random().toString(36).slice(2, 10)}`;
}
