import {
  createTraitChoices,
  serializeTraitChoices,
  validateTraitChoices,
} from "./TraitChoices.js";
import {
  createTraitFrequency,
  createTraitSelfControl,
  serializeTraitFrequency,
  serializeTraitSelfControl,
  validateTraitFrequency,
  validateTraitSelfControl,
} from "./TraitControl.js";

export function createTraitRecord(input = {}, generateId) {
  const selfControlInput = hasOwn(input, "selfControl")
    ? input.selfControl
    : input.cr ?? null;
  const selfControlAdjustment = hasOwn(input, "selfControlAdjustment")
    ? input.selfControlAdjustment
    : input.cr_adj ?? null;
  const frequencyInput = hasOwn(input, "frequency")
    ? input.frequency
    : null;
  const roundCostDownInput = hasOwn(input, "roundCostDown")
    ? input.roundCostDown
    : input.round_down;
  const choicesInput = hasOwn(input, "choices")
    ? input.choices
    : input.replacements ?? null;

  return {
    id: input.id ?? generateId(),
    externalIds: normalizeExternalIds(input.externalIds),
    name: input.name ?? "",
    notes: input.notes ?? "",
    tags: normalizeArray(input.tags, "Trait tags must be array"),

    points: normalizeNullableNumber(input.points),
    levels: normalizeNullableNumber(input.levels),

    selfControl: createTraitSelfControl(
      selfControlInput,
      selfControlAdjustment,
    ),
    frequency: createTraitFrequency(frequencyInput),
    roundCostDown: normalizeBoolean(roundCostDownInput, false),
    choices: createTraitChoices(choicesInput),

    modifiers: normalizeArray(input.modifiers, "Trait modifiers must be array"),
    features: normalizeArray(input.features, "Trait features must be array"),
    weapons: normalizeArray(input.weapons, "Trait weapons must be array"),
    prereqs: input.prereqs ?? null,

    importMeta: input.importMeta ?? null,
    power: input.power ?? null,
    alternateGroupId: input.alternateGroupId ?? null,
    isPrimaryAlternative: input.isPrimaryAlternative ?? null,

    raw: input.raw ?? null,
  };
}

export function validateTraitRecord(record, label) {
  if (!record || typeof record !== "object") {
    throw new Error(`${label} must be an object`);
  }

  if (!record.id) {
    throw new Error(`${label} must have id`);
  }

  if (!isPlainObject(record.externalIds)) {
    throw new Error(`${label} externalIds must be object`);
  }

  if (typeof record.name !== "string") {
    throw new Error(`${label} name must be string`);
  }

  if (typeof record.notes !== "string") {
    throw new Error(`${label} notes must be string`);
  }

  if (!Array.isArray(record.tags)) {
    throw new Error(`${label} tags must be array`);
  }

  validateNullableNumber(record.points, `${label} points must be number or null`);
  validateNullableNumber(record.levels, `${label} levels must be number or null`);
  validateControlFields(record, label);

  if (!Array.isArray(record.modifiers)) {
    throw new Error(`${label} modifiers must be array`);
  }

  if (!Array.isArray(record.features)) {
    throw new Error(`${label} features must be array`);
  }

  if (!Array.isArray(record.weapons)) {
    throw new Error(`${label} weapons must be array`);
  }

  if (record.prereqs !== null && !isPlainObject(record.prereqs)) {
    throw new Error(`${label} prereqs must be object or null`);
  }

  if (record.importMeta !== null && !isPlainObject(record.importMeta)) {
    throw new Error(`${label} importMeta must be object or null`);
  }

  if (record.power !== null && !isPlainObject(record.power)) {
    throw new Error(`${label} power must be object or null`);
  }

  if (
    record.alternateGroupId !== null &&
    typeof record.alternateGroupId !== "string"
  ) {
    throw new Error(`${label} alternateGroupId must be string or null`);
  }

  if (
    record.isPrimaryAlternative !== null &&
    typeof record.isPrimaryAlternative !== "boolean"
  ) {
    throw new Error(`${label} isPrimaryAlternative must be boolean or null`);
  }

  return true;
}

export function serializeTraitRecord(record, label) {
  validateTraitRecord(record, label);
  const canonical = label === "Trait";

  return {
    id: record.id,
    externalIds: { ...record.externalIds },
    name: record.name,
    notes: record.notes,
    tags: [...record.tags],

    points: record.points,
    levels: record.levels,

    ...(hasOwn(record, "selfControl") && (canonical || shouldSerializeSelfControl(record.selfControl))
      ? { selfControl: serializeTraitSelfControl(record.selfControl) }
      : {}),
    ...(hasOwn(record, "frequency") && (canonical || shouldSerializeFrequency(record.frequency))
      ? { frequency: serializeTraitFrequency(record.frequency) }
      : {}),
    ...(canonical || record.roundCostDown === true
      ? { roundCostDown: record.roundCostDown }
      : {}),
    ...(canonical || (Array.isArray(record.choices) && record.choices.length > 0)
      ? { choices: serializeTraitChoices(record.choices) }
      : {}),

    modifiers: [...record.modifiers],
    features: [...record.features],
    weapons: [...record.weapons],
    prereqs: record.prereqs,

    importMeta: record.importMeta,
    power: record.power,
    alternateGroupId: record.alternateGroupId,
    isPrimaryAlternative: record.isPrimaryAlternative,

    raw: record.raw,
  };
}

function validateControlFields(record, label) {
  const canonical = label === "Trait";

  if (hasOwn(record, "selfControl")) {
    validateTraitSelfControl(record.selfControl);
  } else if (canonical) {
    throw new Error("Trait selfControl must be present");
  }

  if (hasOwn(record, "frequency")) {
    validateTraitFrequency(record.frequency);
  } else if (canonical) {
    throw new Error("Trait frequency must be present");
  }

  if (hasOwn(record, "roundCostDown")) {
    if (typeof record.roundCostDown !== "boolean") {
      throw new Error(`${label} roundCostDown must be boolean`);
    }
  } else if (canonical) {
    throw new Error("Trait roundCostDown must be present");
  }

  if (hasOwn(record, "choices")) {
    validateTraitChoices(record.choices);
  } else if (canonical) {
    throw new Error("Trait choices must be present");
  }
}

function shouldSerializeSelfControl(value) {
  return (
    value.roll !== 0 ||
    value.adjustment.type !== "none" ||
    value.raw !== null
  );
}

function shouldSerializeFrequency(value) {
  return value.roll !== 0 || value.raw !== null;
}

function normalizeExternalIds(externalIds) {
  if (externalIds === undefined || externalIds === null) {
    return {};
  }

  if (!isPlainObject(externalIds)) {
    throw new Error("Trait externalIds must be object");
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

function normalizeNullableNumber(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());

    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function normalizeBoolean(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  throw new Error("Trait roundCostDown must be boolean");
}

function validateNullableNumber(value, errorMessage) {
  if (value !== null && (typeof value !== "number" || Number.isNaN(value))) {
    throw new Error(errorMessage);
  }
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}
