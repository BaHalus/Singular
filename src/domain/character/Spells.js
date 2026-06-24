const SPELL_TYPES = ["standard", "ritualMagic"];

export function createSpells(input = []) {
  if (!Array.isArray(input)) {
    throw new Error("Spells must be an array");
  }

  const spells = input.map(createSpell);

  validateSpells(spells);

  return spells;
}

export function createSpell(input = {}) {
  return {
    id: input.id ?? generateSpellId(),
    externalIds: normalizeExternalIds(input.externalIds),

    spellType: input.spellType ?? "standard",
    name: input.name ?? "",
    techLevel: input.techLevel ?? null,

    attribute: input.attribute ?? null,
    difficulty: input.difficulty ?? null,
    points: input.points ?? 0,

    importedLevel: input.importedLevel ?? null,
    importedRelativeLevel: input.importedRelativeLevel ?? null,
    importedRelativeLevelText: input.importedRelativeLevelText ?? null,

    colleges: normalizeArray(input.colleges, "Spell colleges must be array"),
    powerSource: input.powerSource ?? "",
    spellClass: input.spellClass ?? "",
    resistance: input.resistance ?? "",

    castingCost: input.castingCost ?? "",
    maintenanceCost: input.maintenanceCost ?? "",
    castingTime: input.castingTime ?? "",
    duration: input.duration ?? "",

    item: input.item ?? "",
    baseSkill: input.baseSkill ?? "",
    prereqCount: input.prereqCount ?? null,

    reference: input.reference ?? null,
    notes: input.notes ?? "",
    tags: normalizeArray(input.tags, "Spell tags must be array"),
    categories: normalizeArray(input.categories, "Spell categories must be array"),

    weapons: normalizeArray(input.weapons, "Spell weapons must be array"),
    features: normalizeArray(input.features, "Spell features must be array"),
    modifiers: normalizeArray(input.modifiers, "Spell modifiers must be array"),
    prereqs: input.prereqs ?? null,
    study: normalizeArray(input.study, "Spell study must be array"),
    thirdParty: normalizePlainObject(input.thirdParty, "Spell thirdParty must be object"),
    calc: normalizePlainObject(input.calc, "Spell calc must be object"),

    importMeta: normalizePlainObject(input.importMeta, "Spell importMeta must be object"),
    raw: input.raw ?? null,
  };
}

export function validateSpells(spells) {
  if (!Array.isArray(spells)) {
    throw new Error("Spells must be an array");
  }

  for (const spell of spells) {
    validateSpell(spell);
  }

  return true;
}

export function validateSpell(spell) {
  if (!spell || typeof spell !== "object" || Array.isArray(spell)) {
    throw new Error("Spell must be an object");
  }

  if (!spell.id) {
    throw new Error("Spell must have id");
  }

  if (!isPlainObject(spell.externalIds)) {
    throw new Error("Spell externalIds must be object");
  }

  if (!SPELL_TYPES.includes(spell.spellType)) {
    throw new Error("Spell spellType is invalid");
  }

  validateString(spell.name, "Spell name must be string");
  validateNullableString(spell.techLevel, "Spell techLevel must be string or null");
  validateNullableString(spell.attribute, "Spell attribute must be string or null");
  validateNullableString(spell.difficulty, "Spell difficulty must be string or null");

  if (typeof spell.points !== "number" || Number.isNaN(spell.points) || spell.points < 0) {
    throw new Error("Spell points must be non-negative number");
  }

  validateNullableNumber(spell.importedLevel, "Spell importedLevel must be number or null");
  validateNullableNumber(
    spell.importedRelativeLevel,
    "Spell importedRelativeLevel must be number or null",
  );
  validateNullableString(
    spell.importedRelativeLevelText,
    "Spell importedRelativeLevelText must be string or null",
  );

  validateArray(spell.colleges, "Spell colleges must be array");
  validateString(spell.powerSource, "Spell powerSource must be string");
  validateString(spell.spellClass, "Spell spellClass must be string");
  validateString(spell.resistance, "Spell resistance must be string");
  validateString(spell.castingCost, "Spell castingCost must be string");
  validateString(spell.maintenanceCost, "Spell maintenanceCost must be string");
  validateString(spell.castingTime, "Spell castingTime must be string");
  validateString(spell.duration, "Spell duration must be string");
  validateString(spell.item, "Spell item must be string");
  validateString(spell.baseSkill, "Spell baseSkill must be string");

  if (
    spell.prereqCount !== null &&
    (!Number.isInteger(spell.prereqCount) || spell.prereqCount < 0)
  ) {
    throw new Error("Spell prereqCount must be non-negative integer or null");
  }

  validateNullableString(spell.reference, "Spell reference must be string or null");
  validateString(spell.notes, "Spell notes must be string");
  validateArray(spell.tags, "Spell tags must be array");
  validateArray(spell.categories, "Spell categories must be array");
  validateArray(spell.weapons, "Spell weapons must be array");
  validateArray(spell.features, "Spell features must be array");
  validateArray(spell.modifiers, "Spell modifiers must be array");
  validateArray(spell.study, "Spell study must be array");

  if (spell.prereqs !== null && !isPlainObject(spell.prereqs)) {
    throw new Error("Spell prereqs must be object or null");
  }

  validateNullablePlainObject(spell.thirdParty, "Spell thirdParty must be object or null");
  validateNullablePlainObject(spell.calc, "Spell calc must be object or null");
  validateNullablePlainObject(spell.importMeta, "Spell importMeta must be object or null");

  return true;
}

export function serializeSpells(spells) {
  validateSpells(spells);

  return spells.map(spell => ({
    id: spell.id,
    externalIds: { ...spell.externalIds },

    spellType: spell.spellType,
    name: spell.name,
    techLevel: spell.techLevel,

    attribute: spell.attribute,
    difficulty: spell.difficulty,
    points: spell.points,

    importedLevel: spell.importedLevel,
    importedRelativeLevel: spell.importedRelativeLevel,
    importedRelativeLevelText: spell.importedRelativeLevelText,

    colleges: [...spell.colleges],
    powerSource: spell.powerSource,
    spellClass: spell.spellClass,
    resistance: spell.resistance,

    castingCost: spell.castingCost,
    maintenanceCost: spell.maintenanceCost,
    castingTime: spell.castingTime,
    duration: spell.duration,

    item: spell.item,
    baseSkill: spell.baseSkill,
    prereqCount: spell.prereqCount,

    reference: spell.reference,
    notes: spell.notes,
    tags: [...spell.tags],
    categories: [...spell.categories],

    weapons: [...spell.weapons],
    features: [...spell.features],
    modifiers: [...spell.modifiers],
    prereqs: spell.prereqs,
    study: [...spell.study],
    thirdParty: spell.thirdParty,
    calc: spell.calc,

    importMeta: spell.importMeta,
    raw: spell.raw,
  }));
}

function normalizeExternalIds(value) {
  if (value === undefined || value === null) return {};

  if (!isPlainObject(value)) {
    throw new Error("Spell externalIds must be object");
  }

  return { ...value };
}

function normalizeArray(value, errorMessage) {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
  }

  return [...value];
}

function normalizePlainObject(value, errorMessage) {
  if (value === undefined || value === null) return null;

  if (!isPlainObject(value)) {
    throw new Error(errorMessage);
  }

  return value;
}

function validateString(value, errorMessage) {
  if (typeof value !== "string") {
    throw new Error(errorMessage);
  }
}

function validateNullableString(value, errorMessage) {
  if (value !== null && typeof value !== "string") {
    throw new Error(errorMessage);
  }
}

function validateNullableNumber(value, errorMessage) {
  if (value !== null && (typeof value !== "number" || Number.isNaN(value))) {
    throw new Error(errorMessage);
  }
}

function validateArray(value, errorMessage) {
  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
  }
}

function validateNullablePlainObject(value, errorMessage) {
  if (value !== null && !isPlainObject(value)) {
    throw new Error(errorMessage);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function generateSpellId() {
  return `spell_${Math.random().toString(36).slice(2, 10)}`;
}
