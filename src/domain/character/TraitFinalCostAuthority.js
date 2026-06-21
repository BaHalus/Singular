import { validateTraitChoicesEvaluation } from "./TraitChoices.js";
import { validateTraitFinalCost } from "./TraitFinalCost.js";

const SCHEMA_VERSION = 1;
const GROUP_ROLES = new Set(["standalone", "primary", "alternative"]);

export function createTraitFinalCostAuthority(input = {}) {
  const authority = cloneValue(input);
  authority.schemaVersion = SCHEMA_VERSION;
  validateTraitFinalCostAuthority(authority);
  return deepFreeze(authority);
}

export function validateTraitFinalCostAuthority(value) {
  if (!plain(value)) throw new Error("Trait final cost authority must be object");
  if (value.schemaVersion !== SCHEMA_VERSION) {
    throw new Error("Trait final cost authority schemaVersion is invalid");
  }
  for (const field of [
    "operationId",
    "appliedAt",
    "characterId",
    "traitId",
    "sourceFingerprint",
    "analysisFingerprint",
    "planFingerprint",
  ]) {
    if (typeof value[field] !== "string" || value[field] === "") {
      throw new Error(`Trait final cost authority ${field} is required`);
    }
  }
  if (Number.isNaN(Date.parse(value.appliedAt))) {
    throw new Error("Trait final cost authority appliedAt must be timestamp");
  }
  if (!GROUP_ROLES.has(value.groupRole)) {
    throw new Error("Trait final cost authority groupRole is invalid");
  }
  if (value.groupId !== null && typeof value.groupId !== "string") {
    throw new Error("Trait final cost authority groupId must be string or null");
  }
  for (const field of ["individualPoints", "contributionPoints"]) {
    if (typeof value[field] !== "number" || !Number.isFinite(value[field])) {
      throw new Error(`Trait final cost authority ${field} must be finite number`);
    }
  }

  validateTraitFinalCost(value.finalCost);
  validateTraitChoicesEvaluation(value.choices);
  if (value.finalCost.status !== "ready") {
    throw new Error("Trait final cost authority requires ready finalCost");
  }
  if (value.choices.status !== "ready") {
    throw new Error("Trait final cost authority requires ready choices");
  }
  if (value.finalCost.traitId !== value.traitId) {
    throw new Error("Trait final cost authority traitId mismatch");
  }
  if (!Object.is(value.individualPoints, value.finalCost.calculatedPoints)) {
    throw new Error("Trait final cost authority individualPoints is inconsistent");
  }

  if (value.groupRole === "standalone") {
    if (value.groupId !== null || value.groupPolicy !== null) {
      throw new Error("Standalone Trait final cost authority cannot have group data");
    }
    if (!Object.is(value.contributionPoints, value.individualPoints)) {
      throw new Error("Standalone Trait contribution is inconsistent");
    }
  } else {
    if (value.groupId === null) {
      throw new Error("Grouped Trait final cost authority requires groupId");
    }
    validatePolicy(value.groupPolicy);
    if (value.groupRole === "primary" && !Object.is(
      value.contributionPoints,
      value.individualPoints,
    )) {
      throw new Error("Primary Trait contribution is inconsistent");
    }
    if (value.groupRole === "alternative") {
      const expected = roundAlternative(
        value.individualPoints * value.groupPolicy.alternativeFactor,
        value.groupPolicy.roundCostDown,
      );
      if (!Object.is(value.contributionPoints, expected)) {
        throw new Error("Alternative Trait contribution is inconsistent");
      }
    }
  }
  return true;
}

export function serializeTraitFinalCostAuthority(value) {
  validateTraitFinalCostAuthority(value);
  return cloneValue(value);
}

function validatePolicy(value) {
  if (!plain(value)) throw new Error("Trait final cost groupPolicy is invalid");
  if (
    typeof value.alternativeFactor !== "number" ||
    !Number.isFinite(value.alternativeFactor) ||
    value.alternativeFactor < 0 ||
    value.alternativeFactor > 1 ||
    typeof value.roundCostDown !== "boolean"
  ) {
    throw new Error("Trait final cost groupPolicy is invalid");
  }
}

function roundAlternative(value, roundCostDown) {
  const normalized = Number(value.toFixed(12));
  const rounded = roundCostDown ? Math.floor(normalized) : Math.ceil(normalized);
  return Object.is(rounded, -0) ? 0 : rounded;
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
    );
  }
  return value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
